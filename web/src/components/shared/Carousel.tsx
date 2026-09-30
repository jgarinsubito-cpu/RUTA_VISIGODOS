"use client";
/**
 * Horizontal card row that says it scrolls: edge fades and previous/next buttons appear only on
 * the side with more cards. Touch and trackpad scrolling keep working; the buttons are real,
 * labelled controls for mouse and keyboard users. Children are <li> items.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/shell/icons";
import { prefersReducedMotion } from "@/lib/motion";

const edgeButton =
  "absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-stone bg-surface text-ink shadow-md transition-colors hover:bg-surface-muted";

export function Carousel({ label, children }: { label: string; children: ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const start = el.scrollLeft > 4;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  function scroll(direction: 1 | -1) {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  return (
    <section aria-label={label} className="relative -mx-1">
      <ul ref={listRef} onScroll={measure} className="flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        {children}
      </ul>
      {edges.start && (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-ivory to-transparent" />
          <button type="button" onClick={() => scroll(-1)} aria-label={`${label}: ver anteriores`} className={`${edgeButton} left-1`}>
            <IconChevronLeft width={18} height={18} />
          </button>
        </>
      )}
      {edges.end && (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-ivory to-transparent" />
          <button type="button" onClick={() => scroll(1)} aria-label={`${label}: ver más`} className={`${edgeButton} right-1`}>
            <IconChevronRight width={18} height={18} />
          </button>
        </>
      )}
    </section>
  );
}
