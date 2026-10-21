import type { SelectHTMLAttributes } from "react";
import { TEAMS } from "@/lib/teams";
import type { Conference } from "@/lib/types";

export function TeamSelect({
  conf,
  placeholder = "— pick —",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { conf?: Conference; placeholder?: string }) {
  return (
    <select {...props}>
      <option value="">{placeholder}</option>
      {TEAMS.filter((t) => !conf || t.conf === conf).map((t) => (
        <option key={t.ab} value={t.ab}>
          {t.city} {t.name}
        </option>
      ))}
    </select>
  );
}
