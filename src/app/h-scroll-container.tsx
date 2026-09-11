"use client";

import { useRef, WheelEvent } from "react";

// Wraps horizontally-scrollable content with the scrollbar visually hidden
// (see .scrollbar-hide in globals.css). Mouse-wheel users have no drag
// handle without a visible track, so this translates vertical wheel input
// into horizontal scrolling while the pointer is over the container —
// touch/trackpad swipes already scroll it natively.
export function HScrollContainer({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    el.scrollLeft += e.deltaY;
    e.preventDefault();
  };

  return (
    <div ref={ref} onWheel={onWheel} className={className}>
      {children}
    </div>
  );
}
