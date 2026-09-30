/**
 * Reduced motion: the system setting, or the visitor's own choice on the account screen
 * (html[data-motion="reduce"], set by the account store). CSS follows both in globals.css;
 * scripted animations (map pans, smooth scrolling) ask here.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return document.documentElement.dataset.motion === "reduce" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
