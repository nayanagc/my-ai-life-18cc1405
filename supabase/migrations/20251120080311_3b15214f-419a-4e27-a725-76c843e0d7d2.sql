-- Create music recommendations table
CREATE TABLE public.music_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mood TEXT NOT NULL,
  song_title TEXT NOT NULL,
  artist TEXT NOT NULL,
  genre TEXT,
  spotify_url TEXT,
  youtube_url TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create songs generated table
CREATE TABLE public.songs_generated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mood TEXT NOT NULL,
  lyrics TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.music_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs_generated ENABLE ROW LEVEL SECURITY;

-- RLS policies for music_recommendations
CREATE POLICY "Users can view own music recommendations"
  ON public.music_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own music recommendations"
  ON public.music_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for songs_generated
CREATE POLICY "Users can view own songs"
  ON public.songs_generated FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own songs"
  ON public.songs_generated FOR INSERT
  WITH CHECK (auth.uid() = user_id);