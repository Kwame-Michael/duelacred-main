import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "https://localhost:3000", "https://localhost:5173", "https://localhost:8080"];

const corsHeaders = (origin?: string) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  "Access-Control-Max-Age": "86400",
});

serve(async (req) => {
  const origin = req.headers.get("origin") || undefined;

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const body = await req.json();
    const { bucket, path, fileBase64, contentType = "application/octet-stream", upsert = true } = body;

    if (!bucket || !path || !fileBase64) {
      return new Response(JSON.stringify({ error: "Missing bucket, path, or file data" }), {
        status: 400,
        headers: { "content-type": "application/json", ...corsHeaders(origin) },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || "https://nbubybenjjuertkxzpcn.supabase.co";
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEYS");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { "content-type": "application/json", ...corsHeaders(origin) },
      });
    }

    const normalizedBase64 = fileBase64.includes("base64,") ? fileBase64.split("base64,")[1] : fileBase64;
    const binary = Uint8Array.from(atob(normalizedBase64), (char) => char.charCodeAt(0));

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, binary, {
      contentType,
      upsert,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message || error }), {
        status: 500,
        headers: { "content-type": "application/json", ...corsHeaders(origin) },
      });
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "content-type": "application/json", ...corsHeaders(origin) },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
