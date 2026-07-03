// One-shot migration: move base64-encoded render_results.result_image_url into
// the `render-results` storage bucket to shrink the DB (~530 MB reclaimable).
//
// Idempotent: only touches rows whose result_image_url still starts with `data:`.
// Batched to keep each invocation under the Edge Function timeout.
//
// Invocation:
//   POST /functions/v1/migrate-render-results  { "batchSize": 20 }
//
// Auth: requires the caller to be an authenticated admin (has_role check).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

function parseDataUrl(dataUrl: string): { mime: string; ext: string; bytes: Uint8Array } | null {
  const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const ext = MIME_TO_EXT[mime] ?? "png";
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime, ext, bytes };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Shared-secret gate (one-shot maintenance function).
  const provided = req.headers.get("x-migration-secret") ?? "";
  const expected = Deno.env.get("MIGRATION_SECRET") ?? "";
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const batchSize = Math.min(Math.max(Number(body.batchSize) || 20, 1), 50);

  // Fetch batch of base64 rows joined to photo -> project -> user_id
  const { data: rows, error } = await admin
    .from("render_results")
    .select("id, project_photo_id, result_image_url, project_photos!inner(project_id, projects!inner(user_id))")
    .like("result_image_url", "data:%")
    .limit(batchSize);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const settled = await Promise.all((rows ?? []).map(async (row) => {
    try {
      const parsed = parseDataUrl(row.result_image_url as string);
      if (!parsed) return { id: row.id, status: "skip_invalid", bytes: 0 };
      // deno-lint-ignore no-explicit-any
      const uid = (row as any).project_photos?.projects?.user_id as string | undefined;
      if (!uid) return { id: row.id, status: "skip_no_user", bytes: 0 };

      const path = `${uid}/${row.project_photo_id}/${row.id}.${parsed.ext}`;
      const { error: upErr } = await admin.storage
        .from("render-results")
        .upload(path, parsed.bytes, { contentType: parsed.mime, upsert: true, cacheControl: "31536000" });
      if (upErr) return { id: row.id, status: "upload_error", error: upErr.message, bytes: 0 };

      const newUrl = `${SUPABASE_URL}/storage/v1/object/public/render-results/${path}`;
      const { error: updErr } = await admin
        .from("render_results")
        .update({ result_image_url: newUrl })
        .eq("id", row.id);
      if (updErr) return { id: row.id, status: "update_error", error: updErr.message, bytes: 0 };

      return { id: row.id, status: "ok", bytes: (row.result_image_url as string).length };
    } catch (e) {
      return { id: row.id, status: "exception", error: (e as Error).message, bytes: 0 };
    }
  }));

  const results = settled.map(({ bytes: _b, ...r }) => r);
  const migrated = settled.filter((r) => r.status === "ok").length;
  const bytesFreed = settled.reduce((s, r) => s + r.bytes, 0);

  const { count: remaining } = await admin
    .from("render_results")
    .select("id", { count: "exact", head: true })
    .like("result_image_url", "data:%");

  return new Response(JSON.stringify({
    processed: rows?.length ?? 0,
    migrated,
    bytesFreedApprox: bytesFreed,
    remaining,
    results,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
