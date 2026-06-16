import { redirect } from "next/navigation";

/** 레거시 localStorage 공지 페이지 → 네이티브 게시판 공지로 리다이렉트 */
export default function NoticesLegacyRedirect() {
  redirect("/board/notice");
}
