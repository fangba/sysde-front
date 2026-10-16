/** Élément affiché dans la barre de pagination : un numéro de page (base 0) ou des points de suspension. */
export type PageItem =
  | { readonly kind: 'page'; readonly index: number }
  | { readonly kind: 'gap'; readonly key: string };

/**
 * Pages à afficher : toujours la première et la dernière, la page courante et ses voisines,
 * le reste est remplacé par des points de suspension. Au plus 7 éléments.
 */
export function pageItems(current: number, count: number): readonly PageItem[] {
  if (count <= 7) {
    return Array.from({ length: count }, (_, index) => ({ kind: 'page', index }) as const);
  }
  const last = count - 1;
  let start = Math.max(1, current - 1);
  let end = Math.min(last - 1, current + 1);
  // Garde une largeur constante près des bords.
  if (current <= 2) {
    start = 1;
    end = 3;
  } else if (current >= last - 2) {
    start = last - 3;
    end = last - 1;
  }
  const items: PageItem[] = [{ kind: 'page', index: 0 }];
  if (start > 1) {
    items.push({ kind: 'gap', key: 'start' });
  }
  for (let index = start; index <= end; index += 1) {
    items.push({ kind: 'page', index });
  }
  if (end < last - 1) {
    items.push({ kind: 'gap', key: 'end' });
  }
  items.push({ kind: 'page', index: last });
  return items;
}
