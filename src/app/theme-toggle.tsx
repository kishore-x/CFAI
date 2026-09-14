"use client";

// No React state here on purpose: the inline script in layout.tsx already
// sets data-theme on <html> synchronously before first paint, so that
// attribute is the single source of truth. Mirroring it into useState would
// mean either a hydration mismatch (server never knows the stored
// preference) or an effect that sets state right after mount — both worse
// than just toggling the DOM attribute directly and letting CSS pick the
// visible icon.
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const isLight = root.getAttribute("data-theme") === "light";
    if (isLight) {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", "light");
    }
    try {
      localStorage.setItem("theme", isLight ? "dark" : "light");
    } catch {
      // Nothing to persist to — theme still applies for this page view.
    }
  }

  return (
    <button
      onClick={toggle}
      title="Toggle color theme"
      aria-label="Toggle color theme"
      className="text-xs font-medium h-7 w-7 flex items-center justify-center rounded-md border border-[var(--border)] hover:bg-[var(--overlay-10)] shrink-0"
    >
      <span className="theme-icon-dark">☀</span>
      <span className="theme-icon-light">☾</span>
    </button>
  );
}
