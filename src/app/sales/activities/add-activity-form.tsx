"use client";

import { useState, useTransition } from "react";
import { addGeneralActivity } from "../sales-actions";

export function AddActivityForm() {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        startTransition(async () => {
          await addGeneralActivity(text);
          setText("");
        });
      }}
      className="flex items-center gap-2"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Log an activity or note…"
        className="flex-1 text-sm rounded-md border border-[var(--border)] bg-transparent px-3 py-2 outline-none focus:border-[var(--border-60)]"
      />
      <button type="submit" disabled={isPending || !text.trim()} className="text-xs font-medium px-3 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] disabled:opacity-50">
        Add
      </button>
    </form>
  );
}
