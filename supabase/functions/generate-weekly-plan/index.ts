import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { profile, roadmap, recentMood } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const system = `You are Twinova, a productivity coach. Output ONLY valid JSON, no prose, no markdown fences.
Schema:
{
  "nudge": string (1 short proactive tip with 1 emoji, addresses procrastination/focus),
  "days": [
    { "day": "Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat"|"Sun", "focus": string, "tasks": [string] }
  ]
}
Always include all 7 days. 2-4 short concrete tasks per day. Tailor to the user's target role and available weekly hours.`;

    const userMsg = `Profile: ${JSON.stringify(profile)}\nRoadmap summary: ${roadmap?.summary ?? "n/a"}\nNext milestones: ${JSON.stringify(roadmap?.milestones?.slice(0, 2) ?? [])}\nRecent mood signals: ${JSON.stringify(recentMood ?? [])}\nBuild this week's plan.`;

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
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let plan;
    try { plan = JSON.parse(content); } catch { plan = { nudge: "Stay consistent ✨", days: [] }; }
    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});