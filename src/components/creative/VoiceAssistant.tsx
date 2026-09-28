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

interface Props {
  onTranscript: (role: "user" | "assistant", text: string) => void;
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

export function VoiceAssistant({ onTranscript }: Props) {
  const { data: decors = [] } = useDecors();
  const decorsRef = useRef<Decor[]>([]);
  decorsRef.current = decors;
  const transcriptRef = useRef(onTranscript);
  transcriptRef.current = onTranscript;

  const [state, setState] = useState<"idle" | "connecting" | "live">("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const stop = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    setState("idle");
  };

  useEffect(() => stop, []);

  const start = async () => {
    setConfirmOpen(false);
    setState("connecting");
    try {
      const { data, error } = await supabase.functions.invoke("realtime-session");
      if (error || !data?.value) throw new Error(data?.error ?? "Impossible de démarrer la session vocale");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      if (!audioRef.current) {
        audioRef.current = document.createElement("audio");
        audioRef.current.autoplay = true;
      }
      pc.ontrack = (e) => { if (audioRef.current) audioRef.current.srcObject = e.streams[0]; };
      pc.addTrack(stream.getTracks()[0], stream);

      const dc = pc.createDataChannel("oai-events");
      dc.onmessage = (ev) => {
        let msg: any;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.type === "conversation.item.input_audio_transcription.completed" && msg.transcript?.trim()) {
          transcriptRef.current("user", `🎤 ${msg.transcript.trim()}`);
        } else if (msg.type === "response.output_audio_transcript.done" && msg.transcript?.trim()) {
          transcriptRef.current("assistant", msg.transcript.trim());
        } else if (msg.type === "response.function_call_arguments.done" && msg.name === "search_decors") {
          let args = {};
          try { args = JSON.parse(msg.arguments || "{}"); } catch { /* ignore */ }
          const results = searchDecors(decorsRef.current, args);
          dc.send(JSON.stringify({
            type: "conversation.item.create",
            item: { type: "function_call_output", call_id: msg.call_id, output: JSON.stringify({ decors: results }) },
          }));
          dc.send(JSON.stringify({ type: "response.create" }));
        } else if (msg.type === "error") {
          console.error("Realtime error", msg.error?.message);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${data.value}`, "Content-Type": "application/sdp" },
      });
      if (!sdpRes.ok) throw new Error("Connexion vocale refusée");
      await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });

      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) stop();
      };
      timerRef.current = window.setTimeout(() => {
        toast.info("Durée maximale de l'appel atteinte (10 min).");
        stop();
      }, MAX_SESSION_MS);
      setState("live");
    } catch (e) {
      stop();
      const m = e instanceof Error ? e.message : "";
      toast.error(m.includes("Permission") || m.includes("NotAllowed")
        ? "Accès au micro refusé. Autorisez-le dans votre navigateur."
        : m || "Impossible de démarrer la commande vocale");
    }
  };

  return (
    <>
      {state === "live" ? (
        <Button type="button" variant="destructive" onClick={stop} title="Raccrocher">
          <PhoneOff className="h-4 w-4 mr-2" /> Raccrocher
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
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
