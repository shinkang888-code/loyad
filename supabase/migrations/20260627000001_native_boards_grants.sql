GRANT ALL ON TABLE public.boards TO service_role, postgres;
GRANT ALL ON TABLE public.board_posts TO service_role, postgres;
GRANT ALL ON TABLE public.board_comments TO service_role, postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role, postgres;
NOTIFY pgrst, 'reload schema';
