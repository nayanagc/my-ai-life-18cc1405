-- Add AI avatar customization to profiles
ALTER TABLE public.profiles ADD COLUMN ai_avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400';

-- Add prediction capability to insights
ALTER TABLE public.insights ADD COLUMN prediction_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.insights ADD COLUMN confidence_score NUMERIC;