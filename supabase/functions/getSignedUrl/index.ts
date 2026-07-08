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
    const { bucket, path, expires = 60 } = body;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || "https://nbubybenjjuertkxzpcn.supabase.co";
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEYS");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { "content-type": "application/json", ...corsHeaders(origin) },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { "x-admin": "true" } },
    });

    if (!bucket || !path) {
      return new Response(JSON.stringify({ error: "Missing bucket or path in request body" }), { status: 400 });
    }

    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expires);

    if (error) {
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: { "content-type": "application/json", ...corsHeaders(origin) },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json", ...corsHeaders(origin) },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json", ...corsHeaders(origin) },
    });
  }
});
