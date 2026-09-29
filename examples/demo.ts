import { formatClock, groupParts, segmentTokens } from '../src/index.ts';

const tokens = [
  { text: 'Welcome.', startMs: 0, endMs: 900, speaker: 'A', confidence: 0.98 },
  { text: ' Today', startMs: 1_000, endMs: 1_450, speaker: 'A', confidence: 0.95 },
  { text: ' we begin.', startMs: 1_500, endMs: 2_200, speaker: 'A', confidence: 0.93 },
  { text: ' Thanks.', startMs: 4_500, endMs: 5_000, speaker: 'B', confidence: 0.97 },
];

const rawText = tokens.map(token => token.text).join('');
const segments = segmentTokens(tokens, rawText);
const parts = groupParts(segments.map(segment => ({
  ordinal: segment.seq,
  label: segment.speaker ?? 'unknown',
  startSeq: segment.seq,
  endSeq: segment.seq,
  startMs: segment.startMs,
  endMs: segment.endMs,
})));

console.log(JSON.stringify({
  segments: segments.map(segment => ({
    text: segment.text,
    at: formatClock(segment.startMs),
    sourceMatches: rawText.slice(segment.charStart, segment.charEnd) === segment.text,
  })),
  parts,
}, null, 2));
