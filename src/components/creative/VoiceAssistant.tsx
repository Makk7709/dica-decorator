import { useEffect, useRef, useState } from "react";
import { Mic, PhoneOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useDecors, type Decor } from "@/hooks/use-decors";

const MAX_SESSION_MS = 10 * 60 * 1000;
const MAX_COMPOSITION_DECORS = 4;

export interface ComposeResult { ok: boolean; error?: string }

interface Props {
  onTranscript: (role: "user" | "assistant", text: string) => void;
  onCompose: (brief: string, references: string[]) => Promise<ComposeResult>;
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function searchDecors(decors: Decor[], args: { query?: string; category?: string; usage?: string }) {
  const words = norm(args.query ?? "").split(/\s+/).filter((w) => w.length > 1);
  const cat = args.category ? norm(args.category) : "";
  const usage = args.usage ? norm(args.usage) : "";
  const scored = decors
    .map((d) => {
      const hay = norm(`${d.name} ${d.reference_code} ${d.category} ${(d.usage_contexts ?? []).join(" ")}`);
      let score = words.filter((w) => hay.includes(w)).length;
      if (cat && norm(d.category ?? "").includes(cat)) score += 2;
      if (usage && hay.includes(usage)) score += 1;
      return { d, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  return scored.map(({ d }) => ({ nom: d.name, reference: d.reference_code, categorie: d.category }));
}

const compact = (s: string) => norm(s).replace(/[^a-z0-9]/g, "");

export function resolveReferences(decors: Decor[], refs: unknown): { found: Decor[]; unknown: string[] } {
  const requested = Array.isArray(refs) ? refs.filter((r): r is string => typeof r === "string" && r.trim() !== "") : [];
  const byCode = new Map(decors.map((d) => [compact(d.reference_code), d] as const));
  const found: Decor[] = [];
  const unknown: string[] = [];
  for (const ref of requested) {
    const decor = byCode.get(compact(ref));
    if (!decor) unknown.push(ref);
    else if (!found.includes(decor)) found.push(decor);
  }
  return { found: found.slice(0, MAX_COMPOSITION_DECORS), unknown };
}

export function VoiceAssistant({ onTranscript, onCompose }: Props) {
  const { data: decors = [] } = useDecors();
  const decorsRef = useRef<Decor[]>([]);
  decorsRef.current = decors;
  const transcriptRef = useRef(onTranscript);
  transcriptRef.current = onTranscript;
  const composeRef = useRef(onCompose);
  composeRef.current = onCompose;

  const [state, setState] = useState<"idle" | "connecting" | "live">("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const liveRef = useRef(false);

  const stop = (reason?: string) => {
    const wasLive = liveRef.current;
    liveRef.current = false;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    timerRef.current = null;
    reconnectTimerRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    setState("idle");
    if (reason && wasLive) toast.error(reason);
  };

  useEffect(() => () => stop(), []);

  const start = async () => {
    setConfirmOpen(false);
    setState("connecting");
    try {
      // Micro d'abord : un refus ne doit pas consommer un appel du quota quotidien.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const { data, error } = await supabase.functions.invoke("realtime-session");
      if (error || !data?.value) {
        let serverMessage: string | undefined = data?.error;
        const context = (error as { context?: Response } | null)?.context;
        if (!serverMessage && context && typeof context.json === "function") {
          serverMessage = await context.json().then((b: { error?: string }) => b?.error).catch(() => undefined);
        }
        throw new Error(serverMessage ?? "Impossible de démarrer la session vocale");
      }
      if (!streamRef.current) return; // annulé pendant la connexion

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      if (!audioRef.current) {
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.setAttribute("playsinline", "");
        audioRef.current = audio;
      }
      pc.ontrack = (e) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.srcObject = e.streams[0];
        void audio.play().catch(() => undefined);
      };
      pc.addTrack(stream.getAudioTracks()[0], stream);

      const dc = pc.createDataChannel("oai-events");
      const send = (event: unknown) => {
        if (dc.readyState === "open") dc.send(JSON.stringify(event));
      };

      // Une seule réponse à la fois : relancer pendant une réponse active est rejeté par l'API.
      let responseActive = false;
      let responseRequested = false;
      const requestResponse = () => {
        if (responseActive) responseRequested = true;
        else send({ type: "response.create" });
      };
      const notifyAssistant = (text: string) => {
        send({
          type: "conversation.item.create",
          item: { type: "message", role: "system", content: [{ type: "input_text", text }] },
        });
        requestResponse();
      };

      // La transcription de l'utilisateur arrive souvent après la réponse : on garde l'ordre de la conversation.
      const pendingUser = new Map<string, string | null>();
      const heldAssistant: string[] = [];
      const flushTranscripts = () => {
        for (const [id, text] of pendingUser) {
          if (text === null) break;
          if (text) transcriptRef.current("user", `🎤 ${text}`);
          pendingUser.delete(id);
        }
        if (pendingUser.size === 0) {
          heldAssistant.splice(0).forEach((text) => transcriptRef.current("assistant", text));
        }
      };
      const settleUser = (itemId: string, text: string) => {
        if (!pendingUser.has(itemId)) {
          if (text) transcriptRef.current("user", `🎤 ${text}`);
          return;
        }
        pendingUser.set(itemId, text);
        flushTranscripts();
      };

      let composing = false;
      const handledCalls = new Set<string>();
      const runTool = (call: { call_id: string; name: string; arguments?: string }): unknown => {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(call.arguments || "{}"); } catch { /* arguments invalides : objet vide */ }

        if (call.name === "search_decors") {
          return { decors: searchDecors(decorsRef.current, args as { query?: string; category?: string; usage?: string }) };
        }
        if (call.name !== "create_composition") return { statut: "refuse", raison: "Outil inconnu." };

        const brief = typeof args.description === "string" ? args.description.trim().slice(0, 1000) : "";
        const { found, unknown } = resolveReferences(decorsRef.current, args.references);
        if (composing) return { statut: "refuse", raison: "Une composition est déjà en cours, attends qu'elle soit affichée." };
        if (!brief || found.length === 0) {
          return {
            statut: "refuse",
            raison: !brief ? "Brief manquant." : "Aucune référence reconnue dans le catalogue. Utilise search_decors.",
            references_inconnues: unknown,
          };
        }
        const references = found.map((d) => d.reference_code);
        composing = true;
        void composeRef.current(brief, references)
          .catch((e: unknown): ComposeResult => ({ ok: false, error: e instanceof Error ? e.message : "erreur inconnue" }))
          .then((result) => {
            composing = false;
            if (!liveRef.current) return;
            notifyAssistant(result.ok
              ? "La composition est maintenant affichée dans le chat. Annonce-le en une phrase et propose un ajustement."
              : `La composition n'a pas pu être créée : ${result.error}. Explique-le brièvement au client.`);
          });
        return { statut: "en_cours", references, references_inconnues: unknown };
      };

      dc.onmessage = (ev) => {
        let msg: any;
        try { msg = JSON.parse(ev.data); } catch { return; }
        switch (msg.type) {
          case "input_audio_buffer.committed":
            if (msg.item_id) {
              const itemId: string = msg.item_id;
              pendingUser.set(itemId, null);
              window.setTimeout(() => {
                if (pendingUser.get(itemId) === null) settleUser(itemId, "");
              }, 5000);
            }
            break;
          case "conversation.item.input_audio_transcription.completed":
            settleUser(msg.item_id, (msg.transcript ?? "").trim());
            break;
          case "conversation.item.input_audio_transcription.failed":
            settleUser(msg.item_id, "");
            break;
          case "response.output_audio_transcript.done":
            if (msg.transcript?.trim()) {
              heldAssistant.push(msg.transcript.trim());
              flushTranscripts();
            }
            break;
          case "response.created":
            responseActive = true;
            break;
          case "response.done": {
            responseActive = false;
            const calls = (msg.response?.output ?? []).filter(
              (item: { type?: string; call_id?: string }) =>
                item.type === "function_call" && item.call_id && !handledCalls.has(item.call_id),
            );
            for (const call of calls) {
              handledCalls.add(call.call_id);
              send({
                type: "conversation.item.create",
                item: { type: "function_call_output", call_id: call.call_id, output: JSON.stringify(runTool(call)) },
              });
            }
            if (calls.length > 0 || responseRequested) {
              responseRequested = false;
              send({ type: "response.create" });
            }
            break;
          }
          case "error":
            if (msg.error?.code === "conversation_already_has_active_response") {
              responseRequested = true;
            } else {
              console.error("Realtime error", msg.error?.code, msg.error?.message);
              if (msg.error?.code === "session_expired") stop("La session vocale a expiré.");
            }
            break;
        }
      };
      dc.onclose = () => {
        if (liveRef.current) stop("L'appel vocal a été interrompu.");
      };

      pc.onconnectionstatechange = () => {
        if (pcRef.current !== pc) return;
        const cs = pc.connectionState;
        if (cs === "connected" && reconnectTimerRef.current) {
          window.clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        } else if (cs === "disconnected" && !reconnectTimerRef.current) {
          // Coupure réseau passagère (changement de Wi-Fi, 4G) : on laisse le temps à la connexion de revenir.
          reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;
            if (pcRef.current === pc && pc.connectionState !== "connected") stop("Connexion perdue, l'appel a été coupé.");
          }, 8000);
        } else if (cs === "failed") {
          stop("Connexion perdue, l'appel a été coupé.");
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${data.value}`, "Content-Type": "application/sdp" },
      });
      if (!sdpRes.ok) throw new Error("Connexion vocale refusée, réessayez dans un instant.");
      if (pcRef.current !== pc) return;
      await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });

      timerRef.current = window.setTimeout(() => {
        toast.info("Durée maximale de l'appel atteinte (10 min).");
        stop();
      }, MAX_SESSION_MS);
      liveRef.current = true;
      setState("live");
    } catch (e) {
      stop();
      const name = e instanceof DOMException ? e.name : "";
      const m = e instanceof Error ? e.message : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        toast.error("Accès au micro refusé. Autorisez-le dans votre navigateur.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        toast.error("Aucun micro détecté sur cet appareil.");
      } else if (name === "NotReadableError") {
        toast.error("Le micro est déjà utilisé par une autre application.");
      } else {
        toast.error(m || "Impossible de démarrer la commande vocale");
      }
    }
  };

  return (
    <>
      {state === "live" ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => stop()}
          title="Raccrocher"
          aria-label="Raccrocher"
          className="h-9 gap-2 px-3"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
          <PhoneOff className="h-4 w-4" />
          <span className="hidden sm:inline">Raccrocher</span>
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => setConfirmOpen(true)}
          disabled={state === "connecting"}
          title="Parler à l'assistant"
          aria-label="Parler à l'assistant"
        >
          {state === "connecting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
        </Button>
      )}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Parler à l'assistant DICA</AlertDialogTitle>
            <AlertDialogDescription>
              Nous allons demander l'accès à votre micro pour que vous puissiez discuter à voix haute avec
              l'assistant : combinaisons de décors, conseils d'aménagement, informations produits DICA France et
              Compactop. L'appel dure au maximum 10 minutes et vous pouvez raccrocher à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={start}>Démarrer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
