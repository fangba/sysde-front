import type { ElementRef, Signal } from '@angular/core';
import { DestroyRef, afterNextRender, inject, signal } from '@angular/core';

export interface ElementSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Suit la taille d'un élément (en pixels CSS) dans un signal.
 * À appeler dans un contexte d'injection. La taille vaut 0 × 0 avant le premier rendu.
 */
export function observeSize(target: ElementRef<Element>): Signal<ElementSize> {
  const size = signal<ElementSize>({ width: 0, height: 0 });
  const destroyRef = inject(DestroyRef);

  afterNextRender(() => {
    const element = target.nativeElement;
    size.set({ width: element.clientWidth, height: element.clientHeight });

    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        size.set({
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height),
        });
      }
    });
    observer.observe(element);
    destroyRef.onDestroy(() => observer.disconnect());
  });

  return size.asReadonly();
}
