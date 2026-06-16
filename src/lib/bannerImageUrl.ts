/**
 * 배너 이미지 URL — Drive 직링크는 img 태그에서 표시되지 않을 수 있어 프록시로 변환
 */

export function extractDriveFileId(url: string): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  const idParam = trimmed.match(/[?&]id=([^&]+)/)?.[1];
  if (idParam) return idParam;
  const pathMatch = trimmed.match(/\/file\/d\/([^/]+)/)?.[1];
  if (pathMatch) return pathMatch;
  const openMatch = trimmed.match(/\/open\?id=([^&]+)/)?.[1];
  if (openMatch) return openMatch;
  return null;
}

/** img src에 사용할 표시용 URL */
export function resolveBannerImageSrc(url: string): string {
  if (!url?.trim()) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  const fileId = extractDriveFileId(url);
  if (fileId) return `/api/banners/image/${encodeURIComponent(fileId)}`;
  if (url.startsWith("/api/banners/image/")) return url;
  return url;
}
