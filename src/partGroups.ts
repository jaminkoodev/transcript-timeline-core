/** Group adjacent transcript parts with the same label and contiguous sequence range. */
export interface PartLike {
  ordinal: number;
  label: string;
  startSeq: number;
  endSeq: number;
  startMs: number | null;
  endMs: number | null;
}

export interface PartGroup {
  label: string;
  /** 이 묶음에 들어간 파트의 ordinal (오름차순) */
  ordinals: number[];
  startSeq: number;
  endSeq: number;
  /** 어느 한쪽이라도 없으면 `null` — 반쪽짜리 구간을 만들지 않는다 */
  startMs: number | null;
  endMs: number | null;
}

export function groupParts(parts: readonly PartLike[]): PartGroup[] {
  const sorted = [...parts].sort((a, b) => a.ordinal - b.ordinal);
  const out: PartGroup[] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    // 라벨이 같고 seq 가 **실제로 이어질 때만** 묶는다. 틈이 있으면 다른 구간이다.
    if (last && last.label === p.label && last.endSeq + 1 === p.startSeq) {
      last.ordinals.push(p.ordinal);
      last.endSeq = p.endSeq;
      last.endMs = p.endMs;
      continue;
    }
    out.push({
      label: p.label, ordinals: [p.ordinal],
      startSeq: p.startSeq, endSeq: p.endSeq,
      startMs: p.startMs, endMs: p.endMs,
    });
  }
  // ms 가 한쪽만 있는 묶음은 시간으로 쓸 수 없다 — 0 으로 채우지 않고 없다고 말한다
  for (const g of out) {
    if (g.startMs == null || g.endMs == null) { g.startMs = null; g.endMs = null; }
  }
  return out;
}
