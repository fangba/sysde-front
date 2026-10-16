import { describe, expect, it } from 'vitest';

import { pageItems } from './pagination';

const render = (current: number, count: number) =>
  pageItems(current, count).map((item) => (item.kind === 'gap' ? '…' : String(item.index + 1)));

describe('pageItems', () => {
  it('affiche toutes les pages quand elles sont peu nombreuses', () => {
    expect(render(0, 1)).toEqual(['1']);
    expect(render(3, 7)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });

  it('abrège avec des points de suspension', () => {
    expect(render(0, 20)).toEqual(['1', '2', '3', '4', '…', '20']);
    expect(render(9, 20)).toEqual(['1', '…', '9', '10', '11', '…', '20']);
    expect(render(19, 20)).toEqual(['1', '…', '17', '18', '19', '20']);
  });
});
