import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Music, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface MusicRecommendation {
  id: string;
  song_title: string;
  artist: string;
  genre: string;
  reason: string;
  spotify_url?: string;
  youtube_url?: string;
  mood: string;
}

interface MusicRecommendationsProps {
  userId: string;
}

const MusicRecommendations = ({ userId }: MusicRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<MusicRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [userId]);

  const loadRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from('music_recommendations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const generateRecommendations = async () => {
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

      // Get recommendations from edge function
      const { data: funcData, error: funcError } = await supabase.functions.invoke('get-music-recommendations', {
        body: { mood }
      });

      if (funcError) throw funcError;

      // Save recommendations to database
      const recsToInsert = funcData.recommendations.map((rec: any) => ({
        user_id: userId,
        mood,
        song_title: rec.title,
        artist: rec.artist,
        genre: rec.genre,
        reason: rec.reason,
        spotify_url: rec.spotify,
        youtube_url: rec.youtube,
      }));

      await supabase.from('music_recommendations').insert(recsToInsert);
      
      toast.success('🎵 New music recommendations generated!');
      loadRecommendations();
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const moodColors: Record<string, string> = {
    'Happy': 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
    'Calm': 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    'Stressed': 'from-red-500/20 to-pink-500/20 border-red-500/30',
    'Tired': 'from-purple-500/20 to-indigo-500/20 border-purple-500/30',
    'Energetic': 'from-green-500/20 to-lime-500/20 border-green-500/30',
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Music className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Music for You</h2>
        </div>
        <Button onClick={generateRecommendations} disabled={loading} size="sm">
          {loading ? 'Generating...' : 'Refresh'}
        </Button>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No recommendations yet. Click "Refresh" to generate music based on your mood!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <Card 
              key={rec.id} 
              className={`p-4 bg-gradient-to-br ${moodColors[rec.mood] || 'from-gray-500/20 to-gray-600/20 border-gray-500/30'} border-2`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{rec.song_title}</h3>
                  <p className="text-sm text-muted-foreground">{rec.artist}</p>
                  <p className="text-sm mt-2">{rec.reason}</p>
                  <span className="inline-block mt-2 text-xs px-2 py-1 bg-background/50 rounded-full">
                    {rec.genre}
                  </span>
                </div>
                <div className="flex gap-2">
                  {rec.spotify_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(rec.spotify_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  {rec.youtube_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(rec.youtube_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
};

export default MusicRecommendations;
