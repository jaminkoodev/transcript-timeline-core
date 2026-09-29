import { describe, expect, test } from 'bun:test';
import { groupParts, type PartLike } from '../src/partGroups.ts';

const parts: PartLike[] = [
  { ordinal: 0, label: 'intro', startSeq: 0, endSeq: 1, startMs: 0, endMs: 2_000 },
  { ordinal: 1, label: 'intro', startSeq: 2, endSeq: 3, startMs: 2_100, endMs: 4_000 },
  { ordinal: 2, label: 'discussion', startSeq: 4, endSeq: 5, startMs: 4_100, endMs: 6_000 },
  { ordinal: 3, label: 'intro', startSeq: 6, endSeq: 7, startMs: 6_100, endMs: 8_000 },
];

describe('groupParts', () => {
  test('merges only adjacent labels with contiguous sequence ranges', () => {
    const groups = groupParts([...parts].reverse());
    expect(groups.map(group => group.label)).toEqual(['intro', 'discussion', 'intro']);
    expect(groups[0]?.ordinals).toEqual([0, 1]);
    expect(groups[0]?.endMs).toBe(4_000);
  });

  test('does not invent a partial time range', () => {
    const groups = groupParts([{ ...parts[0]!, endMs: null }]);
    expect(groups[0]?.startMs).toBeNull();
    expect(groups[0]?.endMs).toBeNull();
  });

  test('keeps a gap as a separate group', () => {
    const groups = groupParts([parts[0]!, { ...parts[1]!, startSeq: 3 }]);
    expect(groups).toHaveLength(2);
  });
});
