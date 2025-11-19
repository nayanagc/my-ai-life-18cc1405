import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user data for analysis
    const [moodLogs, tasks, chatMessages] = await Promise.all([
      supabase.from('mood_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
      supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
    ]);

    // Prepare data summary for AI analysis
    const dataSummary = {
      mood_patterns: moodLogs.data?.map(m => ({
        mood: m.mood,
        energy: m.energy_level,
        stress: m.stress_level,
        date: m.created_at
      })) || [],
      task_patterns: tasks.data?.map(t => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        created: t.created_at,
        completed: t.actual_completion_time
      })) || [],
      recent_conversations: chatMessages.data?.filter(m => m.role === 'user').slice(0, 20).map(m => m.content) || []
    };

    // Use AI to analyze patterns and make predictions
    const prompt = `You are analyzing a user's behavioral data to identify patterns and make predictions.

Data Summary:
- Mood logs (last 30): ${JSON.stringify(dataSummary.mood_patterns)}
- Task history (last 50): ${JSON.stringify(dataSummary.task_patterns)}
- Recent conversations: ${JSON.stringify(dataSummary.recent_conversations)}

Analyze this data and provide:
1. 3-5 key behavior patterns you observe
2. 3 predictions about their future behavior, mood, or productivity
3. Confidence scores (0-1) for each prediction

Format your response as JSON with this structure:
{
  "patterns": [
    {"type": "mood|productivity|habit", "description": "...", "frequency": "daily|weekly|occasional"}
  ],
  "predictions": [
    {"type": "mood|productivity|decision", "description": "...", "timeframe": "today|this_week|this_month", "confidence": 0.8}
  ]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a behavioral analyst AI. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    let content = aiData.choices[0].message.content;
    
    // Remove markdown code fences if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    const analysis = JSON.parse(content);

    // Store behavior patterns
    const patternInserts = analysis.patterns.map((p: any) => ({
      user_id: userId,
      pattern_type: p.type,
      description: p.description,
      frequency: p.frequency,
      confidence_score: 0.75
    }));

    if (patternInserts.length > 0) {
      await supabase.from('behavior_patterns').insert(patternInserts);
    }

    // Store predictions as insights
    const predictionInserts = analysis.predictions.map((pred: any) => {
      const predDate = new Date();
      if (pred.timeframe === 'this_week') predDate.setDate(predDate.getDate() + 7);
      if (pred.timeframe === 'this_month') predDate.setDate(predDate.getDate() + 30);
      
      return {
        user_id: userId,
        insight_type: 'prediction',
        title: `${pred.type.charAt(0).toUpperCase() + pred.type.slice(1)} Prediction`,
        description: pred.description,
        prediction_date: predDate.toISOString(),
        confidence_score: pred.confidence,
        actionable: true
      };
    });

    if (predictionInserts.length > 0) {
      await supabase.from('insights').insert(predictionInserts);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      patterns: analysis.patterns,
      predictions: analysis.predictions 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
