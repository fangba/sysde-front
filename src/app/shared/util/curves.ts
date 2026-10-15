export type Point = readonly [x: number, y: number];

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * Courbe lissée passant par tous les points, sans dépassement entre deux valeurs
 * (interpolation cubique monotone, méthode de Fritsch-Carlson).
 * Retourne les données d'un attribut SVG `d`.
 */
export function monotonePath(points: readonly Point[]): string {
  const count = points.length;
  if (count === 0) {
    return '';
  }
  const first = points[0]!;
  if (count === 1) {
    return `M${round(first[0])},${round(first[1])}`;
  }

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    dx.push(b[0] - a[0]);
    slope.push((b[1] - a[1]) / (b[0] - a[0]));
  }

  const tangent: number[] = new Array<number>(count);
  tangent[0] = slope[0]!;
  tangent[count - 1] = slope[count - 2]!;
  for (let i = 1; i < count - 1; i++) {
    const before = slope[i - 1]!;
    const after = slope[i]!;
    tangent[i] = before * after <= 0 ? 0 : (before + after) / 2;
  }

  for (let i = 0; i < count - 1; i++) {
    const s = slope[i]!;
    if (s === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i]! / s;
    const b = tangent[i + 1]! / s;
    const norm = a * a + b * b;
    if (norm > 9) {
      const factor = 3 / Math.sqrt(norm);
      tangent[i] = factor * a * s;
      tangent[i + 1] = factor * b * s;
    }
  }

  let path = `M${round(first[0])},${round(first[1])}`;
  for (let i = 0; i < count - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const h = dx[i]! / 3;
    path +=
      ` C${round(a[0] + h)},${round(a[1] + tangent[i]! * h)}` +
      ` ${round(b[0] - h)},${round(b[1] - tangent[i + 1]! * h)}` +
      ` ${round(b[0])},${round(b[1])}`;
  }
  return path;
}

/** Ferme une courbe sur une ligne de base pour dessiner une aire. */
export function areaPath(curve: string, points: readonly Point[], baseline: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!curve || !first || !last) {
    return '';
  }
  return `${curve} L${round(last[0])},${round(baseline)} L${round(first[0])},${round(baseline)} Z`;
}
