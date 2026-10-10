import { slideMarker } from './motion.js';

interface Group {
  el: HTMLElement;
  marker: HTMLElement;
  /** Selector of the currently selected segment inside the group. */
  active: string;
}

const groups: Group[] = [];

/** Gives a segmented control (connected segments) a sliding active fill. Separate buttons do not use this. */
export function addSlidingMarker(el: HTMLElement, active: string) {
  const marker = document.createElement('span');
  marker.className = 'sel-marker';
  marker.setAttribute('aria-hidden', 'true');
  el.prepend(marker);
  groups.push({ el, marker, active });
}

/**
 * Moves every marker to its selected segment. animate=true: slide from the old to the new segment (only for
 * groups that are on screen and already placed); false: set directly (first display, resize, view change).
 * bleed 1: the marker's edge replaces the group's 1px outline where they touch (one line only).
 */
export function syncMarkers(animate: boolean) {
  for (const g of groups) slideMarker(g.el, g.marker, g.el.querySelector<HTMLElement>(g.active), { animate, bleed: 1 });
}
