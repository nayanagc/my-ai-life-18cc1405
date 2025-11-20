import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const moodToMusic: Record<string, Array<{ title: string; artist: string; genre: string; reason: string; spotify: string; youtube: string }>> = {
  'Happy': [
    { title: 'Happy', artist: 'Pharrell Williams', genre: 'Pop', reason: 'Perfect upbeat energy to match your joyful mood! 🎉', spotify: 'https://open.spotify.com/track/60nZcImufyMA1MKQY3dcCH', youtube: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs' },
    { title: 'Walking on Sunshine', artist: 'Katrina and the Waves', genre: 'Pop', reason: 'Pure sunshine vibes for your happy day! ☀️', spotify: 'https://open.spotify.com/track/05wIrZSwuaVWhcv5FfqeH0', youtube: 'https://www.youtube.com/watch?v=iPUmE-tne5U' },
    { title: 'Good Vibrations', artist: 'The Beach Boys', genre: 'Rock', reason: 'Classic good vibes that amplify your happiness! 🌊', spotify: 'https://open.spotify.com/track/54AW58lgslEfKNiHFt4WvC', youtube: 'https://www.youtube.com/watch?v=Eab_beh07HU' },
  ],
  'Calm': [
    { title: 'Weightless', artist: 'Marconi Union', genre: 'Ambient', reason: 'Scientifically proven to reduce anxiety and stress 🧘', spotify: 'https://open.spotify.com/track/0FWxd6tUDKsw2YXD3QZwBu', youtube: 'https://www.youtube.com/watch?v=UfcAVejslrU' },
    { title: 'Clair de Lune', artist: 'Claude Debussy', genre: 'Classical', reason: 'Peaceful piano that soothes the soul 🌙', spotify: 'https://open.spotify.com/track/1VCWR5158FvXxQFNB9O0z0', youtube: 'https://www.youtube.com/watch?v=CvFH_6DNRCY' },
    { title: 'River Flows in You', artist: 'Yiruma', genre: 'Classical', reason: 'Gentle melodies for your calm state of mind 💙', spotify: 'https://open.spotify.com/track/3Iq6wPt0lLzRrITYuCfL2t', youtube: 'https://www.youtube.com/watch?v=7maJOI3QMu0' },
  ],
  'Stressed': [
    { title: 'Breathe', artist: 'Télépopmusik', genre: 'Electronic', reason: 'Calming beats to help you unwind 🌿', spotify: 'https://open.spotify.com/track/3Vr3zh0r7ALn8VLqCx2b1R', youtube: 'https://www.youtube.com/watch?v=JGft9MbjBjI' },
    { title: 'Meditation', artist: 'Thais', genre: 'Classical', reason: 'Peaceful strings to release tension 💆', spotify: 'https://open.spotify.com/track/3iF4gYLJWqgvZbHqzHIcjz', youtube: 'https://www.youtube.com/watch?v=1Z27h6lQuT4' },
    { title: 'Spa Music', artist: 'Nature Sounds', genre: 'Ambient', reason: 'Natural sounds to melt stress away 🕊️', spotify: 'https://open.spotify.com/track/3DbLsZGRdpbFU1EXjSCeOT', youtube: 'https://www.youtube.com/watch?v=eKFTSSKCzWA' },
  ],
  'Tired': [
    { title: 'Sleep', artist: 'Max Richter', genre: 'Classical', reason: 'Designed for deep rest and relaxation 😴', spotify: 'https://open.spotify.com/album/31V4PN0CfDkVjWn8Rr91LD', youtube: 'https://www.youtube.com/watch?v=2Bb0k9HgQxc' },
    { title: 'Nocturne Op.9 No.2', artist: 'Frédéric Chopin', genre: 'Classical', reason: 'Dreamy piano perfect for winding down 🌙', spotify: 'https://open.spotify.com/track/1jnCpYSA6rPpDaGRlvMFVy', youtube: 'https://www.youtube.com/watch?v=9E6b3swbnWg' },
    { title: 'Lofi Hip Hop Radio', artist: 'Various', genre: 'Lo-fi', reason: 'Chill beats to rest and recharge ☕', spotify: 'https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM', youtube: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
  ],
  'Energetic': [
    { title: "Don't Stop Me Now", artist: 'Queen', genre: 'Rock', reason: 'High-energy anthem for your powerful mood! ⚡', spotify: 'https://open.spotify.com/track/7hQJA50XrCWABAu5v6QZ4i', youtube: 'https://www.youtube.com/watch?v=HgzGwKwLmgM' },
    { title: 'Eye of the Tiger', artist: 'Survivor', genre: 'Rock', reason: 'Motivational power to fuel your energy 💪', spotify: 'https://open.spotify.com/track/2KH16WveTQWT6KOG9Rg6e2', youtube: 'https://www.youtube.com/watch?v=btPJPFnesV4' },
    { title: 'Levels', artist: 'Avicii', genre: 'Electronic', reason: 'Electrifying beats that match your vibe 🔥', spotify: 'https://open.spotify.com/track/3h2bfnUJT7LzHaQIqJw4Rp', youtube: 'https://www.youtube.com/watch?v=_ovdm2yX4MA' },
  ],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mood } = await req.json();

    const recommendations = moodToMusic[mood] || moodToMusic['Calm'];

    return new Response(JSON.stringify({ recommendations }), {
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
