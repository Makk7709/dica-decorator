import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface DecorReference {
  reference: string;
  label: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  sourceImageUrls?: string[];
  sourceImageUrl?: string;
  decorReferences?: DecorReference[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  updated_at: string;
}

export type SyncState = "idle" | "saving" | "saved" | "offline";

interface LocalSnapshot {
  id: string | null;
  messages: ChatMessage[];
  savedAt: number;
  synced: boolean;
}

const MAX_PERSISTED_MESSAGES = 200;
const MAX_CONTENT_CHARS = 20_000;
const SAVE_DEBOUNCE_MS = 800;
const LIST_LIMIT = 30;

const localKey = (userId: string) => `dica-creative:${userId}`;
const isPersistableUrl = (url: unknown): url is string =>
  typeof url === "string" && url.length > 0 && url.length <= 2048 && !url.startsWith("data:");

/** Keeps only serialisable fields; base64 images are dropped until they have been uploaded to storage. */
export function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-MAX_PERSISTED_MESSAGES).map((m) => {
    const clean: ChatMessage = { role: m.role, content: (m.content ?? "").slice(0, MAX_CONTENT_CHARS) };
    if (isPersistableUrl(m.imageUrl)) clean.imageUrl = m.imageUrl;
    const sources = (m.sourceImageUrls ?? []).filter(isPersistableUrl);
    if (sources.length > 0) clean.sourceImageUrls = sources;
    if (isPersistableUrl(m.sourceImageUrl)) clean.sourceImageUrl = m.sourceImageUrl;
    if (m.decorReferences?.length) {
      clean.decorReferences = m.decorReferences.map(({ reference, label }) => ({ reference, label }));
    }
    return clean;
  });
}

export function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user")?.content ?? "";
  const cleaned = first
    .replace(/^🎤\s*/u, "")
    .replace(/^Composition\s*:\s*/i, "")
    .split("\n")[0]
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Nouvelle conversation";
  return cleaned.length > 60 ? `${cleaned.slice(0, 57).trimEnd()}…` : cleaned;
}

function readLocal(userId: string): LocalSnapshot | null {
  try {
    const raw = localStorage.getItem(localKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalSnapshot;
    return Array.isArray(parsed?.messages) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocal(userId: string, snapshot: LocalSnapshot) {
  try {
    localStorage.setItem(localKey(userId), JSON.stringify(snapshot));
  } catch {
    /* quota dépassé ou stockage désactivé : la sauvegarde serveur reste active */
  }
}

function clearLocal(userId: string) {
  try {
    localStorage.removeItem(localKey(userId));
  } catch {
    /* ignore */
  }
}

const asMessages = (value: Json | null | undefined): ChatMessage[] =>
  Array.isArray(value) ? sanitizeMessages(value as unknown as ChatMessage[]) : [];

export function useCreativeConversation(userId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isRestoring, setIsRestoring] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  const idRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const timerRef = useRef<number | null>(null);
  const savingRef = useRef<Promise<void> | null>(null);
  const skipNextPersistRef = useRef(false);

  const refreshList = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("creative_conversations")
      .select("id, title, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(LIST_LIMIT);
    if (data) setConversations(data);
  }, [userId]);

  const flush = useCallback(async () => {
    if (!userId) return;
    if (savingRef.current) await savingRef.current;
    const snapshot = sanitizeMessages(messagesRef.current);
    if (snapshot.length === 0) return;

    const run = async () => {
      setSyncState("saving");
      const title = deriveTitle(snapshot);
      const payload = snapshot as unknown as Json;
      let error: { message: string } | null = null;
      if (idRef.current) {
        ({ error } = await supabase
          .from("creative_conversations")
          .update({ title, messages: payload })
          .eq("id", idRef.current));
      } else {
        const res = await supabase
          .from("creative_conversations")
          .insert({ user_id: userId, title, messages: payload })
          .select("id")
          .single();
        error = res.error;
        if (res.data) {
          idRef.current = res.data.id;
          setConversationId(res.data.id);
        }
      }
      if (error) {
        console.warn("[creative] conversation save failed:", error.message);
        setSyncState("offline");
        return;
      }
      writeLocal(userId, { id: idRef.current, messages: snapshot, savedAt: Date.now(), synced: true });
      setSyncState("saved");
      void refreshList();
    };

    savingRef.current = run().finally(() => {
      savingRef.current = null;
    });
    await savingRef.current;
  }, [userId, refreshList]);

  // Restauration : copie locale immédiate, puis réconciliation avec le serveur.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const restore = async () => {
      setIsRestoring(true);
      const local = readLocal(userId);
      if (local && local.messages.length > 0) {
        skipNextPersistRef.current = true;
        idRef.current = local.id;
        setConversationId(local.id);
        setMessages(local.messages);
      }
      if (local?.id && local.synced) {
        const { data } = await supabase
          .from("creative_conversations")
          .select("messages, updated_at")
          .eq("id", local.id)
          .maybeSingle();
        if (cancelled) return;
        if (!data) {
          idRef.current = null;
          setConversationId(null);
        } else if (new Date(data.updated_at).getTime() > local.savedAt) {
          skipNextPersistRef.current = true;
          setMessages(asMessages(data.messages));
        }
      }
      await refreshList();
      if (cancelled) return;
      setIsRestoring(false);
      if (local && !local.synced && local.messages.length > 0) void flush();
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshList, flush]);

  // Sauvegarde : locale à chaque changement, serveur après un court délai.
  useEffect(() => {
    messagesRef.current = messages;
    if (!userId || isRestoring) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    if (messages.length === 0) return;
    writeLocal(userId, { id: idRef.current, messages: sanitizeMessages(messages), savedAt: Date.now(), synced: false });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
  }, [messages, userId, isRestoring, flush]);

  useEffect(() => {
    const retry = () => {
      if (messagesRef.current.length > 0) void flush();
    };
    const flushOnHide = () => {
      if (document.visibilityState === "hidden" && timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        void flush();
      }
    };
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", flushOnHide);
    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", flushOnHide);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [flush]);

  const startNew = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    idRef.current = null;
    setConversationId(null);
    skipNextPersistRef.current = true;
    setMessages([]);
    setSyncState("idle");
    if (userId) clearLocal(userId);
  }, [userId]);

  const openConversation = useCallback(
    async (id: string) => {
      if (!userId) return false;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        await flush();
      }
      const { data, error } = await supabase
        .from("creative_conversations")
        .select("id, messages")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) return false;
      const restored = asMessages(data.messages);
      idRef.current = data.id;
      setConversationId(data.id);
      skipNextPersistRef.current = true;
      setMessages(restored);
      setSyncState("saved");
      writeLocal(userId, { id: data.id, messages: restored, savedAt: Date.now(), synced: true });
      return true;
    },
    [userId, flush],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("creative_conversations").delete().eq("id", id);
      if (error) return false;
      if (id === idRef.current) startNew();
      await refreshList();
      return true;
    },
    [refreshList, startNew],
  );

  return {
    messages,
    setMessages,
    conversationId,
    conversations,
    isRestoring,
    syncState,
    startNew,
    openConversation,
    deleteConversation,
  };
}
