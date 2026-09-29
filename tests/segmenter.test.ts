import { describe, expect, test } from 'bun:test';
import { segmentTokens, type SegmentToken } from '../src/segmenter.ts';

function token(text: string, startMs: number, endMs: number, speaker = 'A', confidence?: number): SegmentToken {
  return { text, startMs, endMs, speaker, confidence };
}

describe('segmentTokens', () => {
  const tokens = [
    token('Welcome.', 0, 900, 'A', 0.9),
    token(' We begin.', 1_000, 2_000, 'A', 0.7),
    token(' Thank you.', 5_000, 5_800, 'B', 0.8),
  ];
  const source = tokens.map(t => t.text).join('');

  test('preserves source offsets and token coverage', () => {
    const segments = segmentTokens(tokens, source, { minDurationMs: 0, minChars: 1 });
    expect(segments.length).toBeGreaterThan(1);
    expect(segments.reduce((sum, segment) => sum + segment.tokenCount, 0)).toBe(tokens.length);
    for (const segment of segments) {
      expect(source.slice(segment.charStart, segment.charEnd)).toBe(segment.text);
    }
  });

  test('speaker changes and long gaps create boundaries', () => {
    const segments = segmentTokens(tokens, source, { minDurationMs: 99_000, minChars: 999 });
    expect(segments).toHaveLength(2);
    expect(segments.map(segment => segment.speaker)).toEqual(['A', 'B']);
  });

  test('refuses mismatched source text instead of writing incorrect offsets', () => {
    expect(() => segmentTokens(tokens, 'different source')).toThrow();
  });

  test('is deterministic and reports confidence without inventing missing values', () => {
    const first = segmentTokens(tokens, source);
    expect(segmentTokens(tokens, source)).toEqual(first);
    const unknown = segmentTokens([token('Hello', 0, 500)]);
    expect(unknown[0]?.avgConfidence).toBeNull();
    expect(unknown[0]?.minConfidence).toBeNull();
  });

  test('discards whitespace-only segments', () => {
    const result = segmentTokens([
      token('Hello', 0, 100), token('   ', 3_000, 3_100), token(' again', 6_000, 6_100),
    ], undefined, { gapBreakMs: 1_000 });
    expect(result.map(segment => segment.text)).toEqual(['Hello', 'again']);
  });
});
