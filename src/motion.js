// Layout-change animation helpers (vanilla, no deps). Copy next to tokens.css.
// Rule: every size/position change must be traceable through motion – never snap.
// Durations/easing come from tokens.css. Policy: animations always play (prefers-reduced-motion is ignored on purpose).
const root = document.documentElement;
const token = (n) => parseFloat(getComputedStyle(root).getPropertyValue(n)) || 0;
const EASE = "cubic-bezier(0.9, 0, 0.2, 1)"; // --ease-fluid

/**
 * Highlight an element that just changed or appeared: soft accent tint + thin accent outline,
 * fading out over --dur-highlight. Color only (no glow, no movement).
 */
export function flash(el, { duration = token("--dur-highlight") || 1400 } = {}) {
  return el.animate(
    [
      { boxShadow: "inset 0 0 0 999px var(--accent-soft)", outline: "1px solid var(--accent-edge)", outlineOffset: "-1px" },
      { boxShadow: "inset 0 0 0 999px transparent", outline: "1px solid transparent", outlineOffset: "-1px" },
    ],
    { duration, easing: "ease-out" },
  );
}

/**
 * Run `mutate()` (changes DOM/classes/text inside `container`) and animate the result:
 * - resized children animate width/height (old → new)
 * - displaced siblings glide to their new position (FLIP)
 * - new children fade in (no tint/highlight on appearance – owner decision; pass flashNew:true to opt in)
 * Only direct children of `container` are tracked; wrap things that should move together.
 * Children being resized should use `white-space: nowrap` or fixed-flow content so text doesn't reflow mid-animation.
 */
export function animateLayout(container, mutate, { duration = token("--dur-view"), easing = EASE, flashNew = false } = {}) {
  const before = new Map([...container.children].map((k) => [k, k.getBoundingClientRect()]));
  mutate();
  for (const k of container.children) {
    const a = before.get(k);
    const b = k.getBoundingClientRect();
    if (!a || (a.width === 0 && a.height === 0 && b.width > 0)) {   // new, or was hidden: fades in (no slide); siblings glide to make room
      k.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing });
      if (flashNew) flash(k); // off by default: a new item is recognised by fading in at its place and the siblings making room
      continue;
    }
    const dx = a.left - b.left, dy = a.top - b.top;
    const resized = Math.abs(a.width - b.width) > 0.5 || Math.abs(a.height - b.height) > 0.5;
    if (!dx && !dy && !resized) continue;
    const from = { transform: `translate(${dx}px, ${dy}px)` };
    const to = { transform: "none" };
    if (resized) {
      for (const [p, av, bv] of [["width", a.width, b.width], ["height", a.height, b.height]]) if (Math.abs(av - bv) > 0.5) { from[p] = `${av}px`; to[p] = `${bv}px`; }   // only the dimensions that really changed
      const prev = k.style.overflow;
      k.style.overflow = "hidden"; // clip content while the box is smaller than its content
      k.animate([from, to], { duration, easing }).finished.finally(() => (k.style.overflow = prev));
    } else {
      k.animate([from, to], { duration, easing });
    }
  }
}

/** Lock page scroll while a modal/drawer is open. Counted, so nested overlays work. Layout stays put (scrollbar-gutter: stable in tokens.css). */
let locks = 0;
export const lockScroll = () => { if (locks++ === 0) root.classList.add("scroll-lock"); };
export const unlockScroll = () => { if (locks > 0 && --locks === 0) root.classList.remove("scroll-lock"); };

/** Fade the element out first, then remove it while siblings glide into the gap. */
export async function removeAnimated(el, { duration = token("--dur-base"), easing = EASE } = {}) {
  const container = el.parentElement;
  const out = el.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(-4px)" }], { duration, easing, fill: "forwards" });
  await out.finished;
  animateLayout(container, () => el.remove());
  out.cancel(); // so a re-inserted element (undo) is visible again
}

// Elements that exist only for some states (a row that appears for some options, a button that shows up after
// a condition is met) are toggled with `hidden`/display:none. That is a size change of the container too, so
// it must never snap: the element fades out first, then the siblings glide into the gap – and the reverse.
const pending = new WeakMap(); // el → sequence number, so quick toggling never leaves a stale animation behind

/** Hide `el` (sets `hidden`): fade out in place, then close the gap smoothly. Returns when finished. */
export async function hideAnimated(el, { duration = token("--dur-base"), easing = EASE } = {}) {
  if (el.hidden) return;
  const n = (pending.get(el) || 0) + 1;
  pending.set(el, n);
  const out = el.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(-4px)" }], { duration, easing, fill: "forwards" });
  await out.finished.catch(() => {});
  if (pending.get(el) !== n) return out.cancel(); // shown again meanwhile
  animateLayout(el.parentElement, () => { el.hidden = true; }, { duration, easing });
  out.cancel();
}

/** Show `el` (clears `hidden`): siblings glide to make room, the element fades in (no highlight tint). */
export function showAnimated(el, { duration = token("--dur-base"), easing = EASE, flashNew = false } = {}) {
  pending.set(el, (pending.get(el) || 0) + 1);
  el.getAnimations().forEach((a) => a.cancel()); // drop a half-finished fade-out
  if (!el.hidden) return;
  animateLayout(el.parentElement, () => { el.hidden = false; }, { duration, easing, flashNew });
}
