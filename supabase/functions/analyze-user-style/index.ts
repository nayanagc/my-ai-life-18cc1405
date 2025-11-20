import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

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
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's recent messages
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('content, role')
      .eq('user_id', userId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ 
        style: 'balanced',
        avgLength: 50 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate average message length
    const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const avgLength = totalLength / messages.length;

    // Determine style
    let style = 'balanced';
    if (avgLength < 50) {
      style = 'super_brief';
    } else if (avgLength > 150) {
      style = 'detailed';
    }

    // Store in behavior_patterns
    await supabase
      .from('behavior_patterns')
      .insert({
        user_id: userId,
        pattern_type: 'conversation_style',
        description: `User prefers ${style} responses (avg message length: ${Math.round(avgLength)} chars)`,
        frequency: 'consistent',
        confidence_score: 0.85,
      });

    return new Response(JSON.stringify({ style, avgLength }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-user-style:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
