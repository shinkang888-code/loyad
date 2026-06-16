/**
 * Voice·Marketing — Gemini 콘텐츠 생성 (voice / ah-my-marketing 패턴)
 */

import { generateGeminiContent } from "@/lib/geminiClient";

export async function polishVoiceScript(raw: string, style?: string): Promise<{ ok: boolean; script?: string; error?: string }> {
  const text = raw.trim();
  if (!text) return { ok: false, error: "텍스트를 입력하세요." };

  const result = await generateGeminiContent({
    parts: [{ text: `다음 법률·로펌 콘텐츠를 ${style ?? "전문적이고 따뜻한"} 나레이션 대본으로 다듬어 주세요. 숫자·조문은 읽기 쉽게 풀어 쓰고, 2~4분 분량으로 유지하세요.\n\n---\n\n${text}` }],
    systemHint: "당신은 법률 오디오북·팟캐스트 나레이션 작가입니다. 출력은 대본만, 마크다운 없이.",
    temperature: 0.4,
    maxOutputTokens: 4096,
  });

  if (!result.ok) return { ok: false, error: result.message };
  return { ok: true, script: result.text };
}

export type MarketingChannel = "blog" | "sns" | "ad" | "email";

export async function runMarketingHarness(input: {
  topic: string;
  channel: MarketingChannel;
  audience?: string;
  firmName?: string;
}): Promise<{ ok: boolean; pack?: Record<string, unknown>; error?: string }> {
  const topic = input.topic.trim();
  if (!topic) return { ok: false, error: "주제를 입력하세요." };

  const channelGuide: Record<MarketingChannel, string> = {
    blog: "800~1200자 블로그 글, H2 소제목 2~3개, SEO 키워드 포함",
    sns: "인스타/링크드인용 3개 포스트 (각 280자 이내), 해시태그 5개",
    ad: "검색광고 헤드라인 3개 + 설명 2개 + CTA",
    email: "뉴스레터 제목 + 본문 + CTA 버튼 문구",
  };

  const result = await generateGeminiContent({
    parts: [
      {
        text: `로펌/법률 사무소 마케팅 harness\n주제: ${topic}\n채널: ${input.channel}\n타깃: ${input.audience ?? "잠재 의뢰인"}\n사무소명: ${input.firmName ?? "로이ad"}\n\n${channelGuide[input.channel]}\n\nJSON만 출력: {"title":"","body":"","hashtags":[],"cta":"","variants":[]}`,
      },
    ],
    systemHint: "ah-my-marketing 스타일 AI-Native 마케팅 harness. 유효한 JSON만.",
    temperature: 0.7,
    maxOutputTokens: 4096,
  });

  if (!result.ok) return { ok: false, error: result.message };

  try {
    const cleaned = result.text.replace(/^```json?\s*|\s*```$/g, "").trim();
    const pack = JSON.parse(cleaned) as Record<string, unknown>;
    return { ok: true, pack: { ...pack, channel: input.channel, topic } };
  } catch {
    return {
      ok: true,
      pack: { channel: input.channel, topic, body: result.text, title: topic },
    };
  }
}
