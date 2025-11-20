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
    const { mood, userName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const userNamePart = userName ? `, ${userName}` : '';
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `You are a musical AI twin. Create a short, personalized 4-8 line song with rhyming structure based on the user's mood. Make it encouraging, lovely, and emotionally resonant. Include emojis naturally (1-2 per line). Keep it simple and heartfelt. Output ONLY the song lyrics, no other text.` 
          },
          { 
            role: 'user', 
            content: `Create a personalized song for someone${userNamePart} who is feeling ${mood}. Make it uplifting and supportive.` 
          }
        ],
      }),
    });

    const data = await response.json();
    const lyrics = data.choices[0].message.content;

    return new Response(JSON.stringify({ lyrics }), {
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
