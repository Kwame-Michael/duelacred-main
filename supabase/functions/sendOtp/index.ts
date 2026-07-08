import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "https://localhost:3000", "https://localhost:5173", "https://localhost:8080"];

const corsHeaders = (origin?: string) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
});

serve(async (req) => {
  const origin = req.headers.get("origin") || undefined;

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const { email, otp, senderEmail = "onboarding@resend.dev" } = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "Missing email or OTP" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderEmail,
        to: email,
        subject: "Your Duelacred OTP",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Verify Your Email</h2>
            <p>Your one-time password is:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h1 style="letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p>This code expires in 10 minutes.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: data }),
        { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
      );
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
    );
  }
});
