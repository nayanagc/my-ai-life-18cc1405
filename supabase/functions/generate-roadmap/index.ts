import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { profile } = await req.json();
    if (!profile || typeof profile !== "object") {
      return new Response(JSON.stringify({ error: "Missing profile" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const system = `You are Twinova, a career mentor AI. Output ONLY valid JSON, no prose, no markdown fences.
Schema:
{
  "title": string,
  "summary": string (1-2 sentences, friendly, with 1 emoji),
  "skill_gaps": [{ "skill": string, "level": "beginner"|"intermediate"|"advanced", "why": string (1 sentence) }],
  "milestones": [{ "title": string, "duration_weeks": number, "resources": [string], "outcomes": [string] }]
}
Make 3-5 skill_gaps and 4-6 milestones, ordered from foundational to advanced.`;

    const userMsg = `Build a personalized learning roadmap for this user:\n${JSON.stringify(profile, null, 2)}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      return new Response(JSON.stringify({ error: `AI error: ${r.status} ${txt}` }), {
        status: r.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let roadmap;
    try { roadmap = JSON.parse(content); } catch { roadmap = { title: "Your Roadmap", summary: content, skill_gaps: [], milestones: [] }; }
    return new Response(JSON.stringify({ roadmap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});