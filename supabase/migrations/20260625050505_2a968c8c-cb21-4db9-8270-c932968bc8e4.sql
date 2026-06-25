CREATE POLICY "Users can update own mood logs"
  ON public.mood_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mood logs"
  ON public.mood_logs FOR DELETE
  USING (auth.uid() = user_id);