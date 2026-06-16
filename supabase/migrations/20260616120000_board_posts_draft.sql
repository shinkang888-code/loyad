-- 게시글 임시저장·발행 (Phase 5-F)

ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE public.board_posts
SET published_at = COALESCE(published_at, created_at)
WHERE is_draft = false AND published_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_board_posts_draft
  ON public.board_posts (board_id, is_draft)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.board_posts.is_draft IS 'true=임시저장, false=게시됨';
COMMENT ON COLUMN public.board_posts.published_at IS '게시(발행) 시각';
