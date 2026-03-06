import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Enhanced emoji guidelines with mood-based selection
    const emojiGuidelines = `Use emojis naturally in EVERY response (1-2 per response):
- Happy/Joyful: 😊 😄 ✨ 🎉 💫 🌟
- Calm/Peaceful: 😌 🕊️ 💙 ☮️ 🌸 💆
- Stressed/Anxious: 🫂 💚 🌿 🧘 💆 🌱
- Tired/Sleepy: 😴 💤 🛌 ☕ 🌙 ⭐
- Energetic/Excited: ⚡ 🔥 💪 🎯 🚀 ⚡
- Encouraging: 💪 👏 🌟 💯 🎯 🙌
- Empathetic/Caring: 🤗 💕 🫶 ❤️ 🥰 💝

Place emojis naturally to emphasize emotion and key points. Match emoji energy to message tone.`;

    // Build adaptive system prompt
    const basePrompt = `You are an AI twin that learns from the user. Be empathetic and insightful. Keep your responses SHORT and SMART - answer in 1-3 sentences maximum (20-60 words). Be conversational, not formal. ${emojiGuidelines} Help them understand their patterns quickly without lengthy explanations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: basePrompt },
          { role: 'user', content: message }
        ],
      }),
    });

    const data = await response.json();
    return new Response(JSON.stringify({ response: data.choices[0].message.content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
