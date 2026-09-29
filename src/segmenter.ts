/**
 * Deterministic, dependency-free segmentation of timestamped transcript tokens.
 * Every segment preserves the source-text invariant:
 * rawText.slice(charStart, charEnd) === text.
 * Default thresholds are examples; tune them for the source data.
 */

export interface SegmentToken {
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
  speaker?: string;
}

export interface Segment {
  seq: number;
  startMs: number;
  endMs: number;
  text: string;
  charStart: number;
  charEnd: number;
  tokenStart: number;
  tokenEnd: number;   // exclusive
  tokenCount: number;
  avgConfidence: number | null;
  minConfidence: number | null;
  speaker: string | null;
}

export interface SegmentOptions {
  /** 문장 경계에서 끊기 전 최소 길이 */
  minDurationMs: number;
  minChars: number;
  /** 문장 경계가 없어도 강제로 끊는 상한 */
  maxDurationMs: number;
  maxChars: number;
  /** 이보다 긴 침묵이면 무조건 끊는다 */
  gapBreakMs: number;
}

export const DEFAULT_SEGMENT_OPTIONS: SegmentOptions = {
  minDurationMs: 6_000,
  minChars: 60,
  maxDurationMs: 30_000,
  maxChars: 400,
  gapBreakMs: 2_000,
};

/** Detect sentence-ending punctuation, including a trailing quote. */
const SENTENCE_END = /[.?!。！？]["')\]」』]?\s*$/;

export function endsSentence(tokenText: string): boolean {
  return SENTENCE_END.test(tokenText);
}

/**
 * 세그먼트로 나눈다.
 *
 * `rawText` 는 검증용이자 offset 의 기준이다. 넘기지 않으면 토큰을 이어붙여 쓴다.
 * 넘겼는데 `join(tokens.text)` 와 다르면 **던진다** — 그 상태에서 만든 offset 은
 * 원문의 엉뚱한 자리를 가리키므로, 조용히 진행하는 것이 가장 나쁘다.
 */
export function segmentTokens(
  tokens: SegmentToken[],
  rawText?: string,
  options: Partial<SegmentOptions> = {},
): Segment[] {
  const opt = { ...DEFAULT_SEGMENT_OPTIONS, ...options };
  if (!Array.isArray(tokens) || tokens.length === 0) return [];

  const joined = tokens.map(t => t.text ?? '').join('');
  if (rawText !== undefined && rawText !== joined) {
    throw new Error(
      `rawText 가 토큰 이어붙임과 다릅니다 (raw ${rawText.length}자 / tokens ${joined.length}자). ` +
      'offset 이 원문의 다른 자리를 가리키게 되므로 세그먼트를 만들지 않습니다.',
    );
  }
  const source = rawText ?? joined;

  // 토큰 i 의 시작 char offset
  const charAt: number[] = new Array(tokens.length + 1);
  let acc = 0;
  for (let i = 0; i < tokens.length; i++) {
    charAt[i] = acc;
    acc += (tokens[i]!.text ?? '').length;
  }
  charAt[tokens.length] = acc;

  const segments: Segment[] = [];
  let start = 0; // 현재 세그먼트의 첫 토큰 인덱스

  const flush = (endExclusive: number) => {
    if (endExclusive <= start) return;
    const seg = buildSegment(tokens, source, charAt, start, endExclusive, segments.length);
    // 공백만 있는 구간은 세그먼트로 만들지 않는다 (텍스트가 없으면 앵커로 쓸 수 없다)
    if (seg !== null) segments.push(seg);
    start = endExclusive;
  };

  for (let i = 1; i < tokens.length; i++) {
    const prev = tokens[i - 1]!;
    const cur = tokens[i]!;
    const curStartMs = tokens[start]!.startMs;
    const elapsed = prev.endMs - curStartMs;
    const chars = charAt[i]! - charAt[start]!;

    // 1) 화자가 바뀌면 무조건
    if (normSpeaker(cur.speaker) !== normSpeaker(prev.speaker)) { flush(i); continue; }
    // 2) 긴 침묵 — 실제로 말이 끊긴 자리다
    if (cur.startMs - prev.endMs >= opt.gapBreakMs) { flush(i); continue; }
    // 3) 문장이 끝났고 최소 길이를 채웠다
    if (endsSentence(prev.text) && (elapsed >= opt.minDurationMs || chars >= opt.minChars)) { flush(i); continue; }
    // 4) 상한 — 문장부호가 없는 구간이 무한히 길어지지 않게 한다
    if (elapsed >= opt.maxDurationMs || chars >= opt.maxChars) { flush(i); continue; }
  }
  flush(tokens.length);

  return segments;
}

function normSpeaker(s: string | undefined): string | null {
  if (s === undefined || s === null) return null;
  const t = String(s).trim();
  return t === '' ? null : t;
}

function buildSegment(
  tokens: SegmentToken[],
  source: string,
  charAt: number[],
  from: number,
  to: number,
  seq: number,
): Segment | null {
  let charStart = charAt[from]!;
  let charEnd = charAt[to]!;

  // 앞뒤 공백을 offset 자체에서 걷어낸다.
  // 텍스트만 trim 하면 `source.slice(charStart, charEnd) === text` 항등식이 깨진다.
  while (charStart < charEnd && /\s/.test(source[charStart]!)) charStart++;
  while (charEnd > charStart && /\s/.test(source[charEnd - 1]!)) charEnd--;
  if (charEnd <= charStart) return null;

  const slice = tokens.slice(from, to);
  const confs = slice
    .map(t => t.confidence)
    .filter((c): c is number => typeof c === 'number' && Number.isFinite(c));

  return {
    seq,
    startMs: slice[0]!.startMs,
    endMs: slice[slice.length - 1]!.endMs,
    text: source.slice(charStart, charEnd),
    charStart,
    charEnd,
    tokenStart: from,
    tokenEnd: to,
    tokenCount: to - from,
    avgConfidence: confs.length ? round4(confs.reduce((a, b) => a + b, 0) / confs.length) : null,
    minConfidence: confs.length ? round4(Math.min(...confs)) : null,
    speaker: normSpeaker(slice[0]!.speaker),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** `[MM:SS]` / `[H:MM:SS]` — 문서·노트에 박는 표기 */
export function formatTimestamp(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
