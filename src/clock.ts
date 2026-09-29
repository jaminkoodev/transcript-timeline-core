/** Convert human-readable time strings and millisecond offsets. */

/** ms → `mm:ss` (한 시간이 넘으면 `h:mm:ss`) */
export function formatClock(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '';
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * `mm:ss` · `h:mm:ss` · 순수 숫자(분) → ms. 빈 문자열은 `null`.
 *
 * ★ 순수 숫자를 **분**으로 읽는다. 옛 입력칸이 «시작(분)» 이었으므로 그 손버릇을
 *   깨지 않는다. `90` 은 90분이지 90초가 아니다.
 *
 * 형식이 틀리면 `undefined` 를 준다 — `null`(비움)과 **다른 사실**이다.
 * 둘을 합치면 오타가 «비움» 으로 조용히 저장된다.
 */
export function parseClock(raw: string): number | null | undefined {
  const t = raw.trim();
  if (t === '') return null;

  if (/^\d+(\.\d+)?$/.test(t)) {
    const min = Number(t);
    return Number.isFinite(min) ? Math.round(min * 60_000) : undefined;
  }

  const m = t.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
  if (!m) return undefined;
  const h = m[1] ? Number(m[1]) : 0;
  const min = Number(m[2]);
  const sec = Number(m[3]);
  // 60분·60초를 받아주지 않는다. «75:00» 을 75분으로 읽고 싶으면 숫자로 적으면 된다.
  if (min > 59 || sec >= 60) return undefined;
  return Math.round(((h * 60 + min) * 60 + sec) * 1000);
}
