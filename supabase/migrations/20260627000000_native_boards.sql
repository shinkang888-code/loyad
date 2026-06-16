-- LawyGo 네이티브 게시판 (G6 대체)

CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  management_number TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  board_kind TEXT NOT NULL DEFAULT 'post' CHECK (board_kind IN ('post', 'data')),
  sort_order INT NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (slug, management_number)
);

CREATE INDEX IF NOT EXISTS idx_boards_mgmt ON public.boards (management_number, sort_order);
CREATE INDEX IF NOT EXISTS idx_boards_active ON public.boards (deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.boards IS 'LawyGo 네이티브 게시판 정의';

CREATE SEQUENCE IF NOT EXISTS public.board_post_num_id_seq;

CREATE TABLE IF NOT EXISTS public.board_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  num_id INT NOT NULL DEFAULT nextval('public.board_post_num_id_seq'),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '관리자',
  author_login_id TEXT,
  view_count INT NOT NULL DEFAULT 0,
  category TEXT,
  case_id TEXT,
  case_type TEXT,
  comment_count INT NOT NULL DEFAULT 0,
  management_number TEXT NOT NULL DEFAULT '',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (board_id, num_id)
);

CREATE INDEX IF NOT EXISTS idx_board_posts_board ON public.board_posts (board_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_board_posts_active ON public.board_posts (board_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.board_posts IS 'LawyGo 네이티브 게시물';

CREATE SEQUENCE IF NOT EXISTS public.board_comment_num_id_seq;

CREATE TABLE IF NOT EXISTS public.board_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.board_posts(id) ON DELETE CASCADE,
  num_id INT NOT NULL DEFAULT nextval('public.board_comment_num_id_seq'),
  content TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '관리자',
  author_login_id TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, num_id)
);

CREATE INDEX IF NOT EXISTS idx_board_comments_post ON public.board_comments (post_id, created_at);

COMMENT ON TABLE public.board_comments IS 'LawyGo 네이티브 게시물 댓글';

-- 기본 시스템 게시판
INSERT INTO public.boards (slug, management_number, name, description, board_kind, sort_order, is_system)
VALUES
  ('case_memo', '', '사건 메모', '사건별 메모·진행 기록', 'post', 0, true),
  ('notice', '', '공지사항', '사무소 공지', 'post', 1, true),
  ('general', '', '자유게시판', '업무·자료 공유', 'post', 2, true)
ON CONFLICT (slug, management_number) DO NOTHING;

-- notices 테이블 → notice 게시판 이관
INSERT INTO public.board_posts (
  board_id, num_id, title, content, author_name, view_count, deleted_at, created_at, updated_at
)
SELECT
  b.id,
  n.num_id,
  n.title,
  n.content,
  n.author_name,
  n.view_count,
  n.deleted_at,
  n.created_at,
  n.updated_at
FROM public.notices n
CROSS JOIN public.boards b
WHERE b.slug = 'notice' AND b.management_number = ''
ON CONFLICT (board_id, num_id) DO NOTHING;

-- 시퀀스를 기존 최대 num_id 이후로 맞춤
SELECT setval(
  'public.board_post_num_id_seq',
  GREATEST(
    COALESCE((SELECT MAX(num_id) FROM public.board_posts), 0),
    COALESCE((SELECT MAX(num_id) FROM public.notices), 0),
    1
  )
);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS boards_service ON public.boards;
CREATE POLICY boards_service ON public.boards FOR ALL USING (false);

DROP POLICY IF EXISTS board_posts_service ON public.board_posts;
CREATE POLICY board_posts_service ON public.board_posts FOR ALL USING (false);

DROP POLICY IF EXISTS board_comments_service ON public.board_comments;
CREATE POLICY board_comments_service ON public.board_comments FOR ALL USING (false);
