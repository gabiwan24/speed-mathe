import { slideMarker } from './motion.js';

interface Group {
  el: HTMLElement;
  marker: HTMLElement;
  /** Selector of the currently selected option inside the group. */
  active: string;
}

const groups: Group[] = [];

/** Gives a group of side-by-side options a sliding selection marker (the yellow fill / frame). */
export function addSlidingMarker(el: HTMLElement, active: string) {
  const marker = document.createElement('span');
  marker.className = 'sel-marker';
  marker.setAttribute('aria-hidden', 'true');
  el.prepend(marker);
  groups.push({ el, marker, active });
}

/**
 * Moves every marker to its selected option. animate=true: slide from the old to the new option (only for
 * groups that are on screen and already placed); false: set directly (first display, resize, view change).
 */
export function syncMarkers(animate: boolean) {
  for (const g of groups) slideMarker(g.el, g.marker, g.el.querySelector<HTMLElement>(g.active), { animate });
}
