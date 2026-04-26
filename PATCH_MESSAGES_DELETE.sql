-- ════════════════════════════════════════════════════════════════════════════
-- PATCH : Fix suppression messages_internes
-- Copier-coller dans le SQL Editor de Supabase, puis cliquer sur "Run"
-- ════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "msg_update" ON public.messages_internes;

CREATE POLICY "msg_update" ON public.messages_internes
  FOR UPDATE USING (auth.uid() = to_user_id OR auth.uid() = from_user_id)
  WITH CHECK (auth.uid() = to_user_id OR auth.uid() = from_user_id);
