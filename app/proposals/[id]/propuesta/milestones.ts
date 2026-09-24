export interface Milestone {
  id: string;
  label: string;
  pct: number;
  sort_order: number;
}

/**
 * Ajusta el % de un hito y redistribuye la diferencia entre los hitos
 * SIGUIENTES (proporcional a su peso actual), para que la suma nunca pase
 * de 100 — así el comercial "va bajando" los que siguen a medida que sube
 * uno, en vez de tener que cuadrar todo a mano.
 */
export function updateMilestonePct(milestones: Milestone[], index: number, newPct: number): Milestone[] {
  const clamped = Math.max(0, Math.min(100, newPct));
  const next = milestones.map((m) => ({ ...m }));
  const delta = clamped - next[index].pct;
  next[index].pct = clamped;

  const after = next.slice(index + 1);
  if (after.length === 0) {
    const sumOthers = next.reduce((s, m, i) => (i === index ? s : s + m.pct), 0);
    if (sumOthers + clamped > 100) {
      next[index].pct = Math.max(0, 100 - sumOthers);
    }
    return next;
  }

  const afterSum = after.reduce((s, m) => s + m.pct, 0);
  const remaining = -delta;
  for (let i = index + 1; i < next.length; i++) {
    const share = afterSum > 0 ? next[i].pct / afterSum : 1 / after.length;
    next[i].pct = Math.max(0, next[i].pct + remaining * share);
  }

  const total = next.reduce((s, m) => s + m.pct, 0);
  const diff = 100 - total;
  next[next.length - 1].pct = Math.max(0, next[next.length - 1].pct + diff);
  return next;
}

export function addMilestone(milestones: Milestone[], tempId: () => string): Milestone[] {
  const list = [
    ...milestones,
    { id: tempId(), label: `Hito ${milestones.length + 1}`, pct: 0, sort_order: milestones.length },
  ];
  const equal = 100 / list.length;
  return list.map((m, i) => ({ ...m, pct: equal, sort_order: i }));
}

export function removeMilestone(milestones: Milestone[], id: string): Milestone[] {
  const remaining = milestones.filter((m) => m.id !== id).map((m, i) => ({ ...m, sort_order: i }));
  if (remaining.length === 0) return remaining;
  const sum = remaining.reduce((s, m) => s + m.pct, 0);
  if (sum === 0) {
    const equal = 100 / remaining.length;
    return remaining.map((m) => ({ ...m, pct: equal }));
  }
  return remaining.map((m) => ({ ...m, pct: (m.pct / sum) * 100 }));
}
