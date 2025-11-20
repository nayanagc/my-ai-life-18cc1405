import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface SongButtonProps {
  userId: string;
  onSongGenerated: (lyrics: string) => void;
}

const SongButton = ({ userId, onSongGenerated }: SongButtonProps) => {
  const [loading, setLoading] = useState(false);

  const generateSong = async () => {
    setLoading(true);
    try {
      // Get latest mood
      const { data: moodData, error: moodError } = await supabase
        .from('mood_logs')
        .select('mood')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (moodError) throw moodError;

      const mood = moodData?.mood || 'Calm';

      // Get user's name
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      const userName = profileData?.username;

      // Generate song
      const { data: songData, error: songError } = await supabase.functions.invoke('generate-song', {
        body: { mood, userName }
      });

      if (songError) throw songError;

      const lyrics = songData.lyrics;

      // Save song to database
      await supabase.from('songs_generated').insert({
        user_id: userId,
        mood,
        lyrics,
      });

      onSongGenerated(lyrics);
      toast.success('🎶 Song generated!');
    } catch (error) {
      console.error('Error generating song:', error);
      toast.error('Failed to generate song');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={generateSong}
      disabled={loading}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      <Music className="h-4 w-4" />
      {loading ? 'Creating...' : 'Sing for Me'}
    </Button>
  );
};

export default SongButton;
