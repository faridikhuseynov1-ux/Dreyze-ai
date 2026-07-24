"use client";

import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { usePreferencesStore } from "@/lib/store";
import type { ModelId } from "@/lib/types";

export const MODEL_OPTIONS: DropdownOption<ModelId>[] = [
  { value: "claude", label: "Claude", description: "Anthropic" },
];

export function ModelSelector() {
  const model = usePreferencesStore((s) => s.model);
  const setModel = usePreferencesStore((s) => s.setModel);
  return <Dropdown value={model} options={MODEL_OPTIONS} onChange={setModel} />;
}
