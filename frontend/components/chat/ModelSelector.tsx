"use client";

import React from "react";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { usePreferencesStore } from "@/lib/store";
import type { ModelId } from "@/lib/types";

export const MODEL_OPTIONS: DropdownOption<ModelId>[] = [
  { value: "claude", label: "Claude", description: "Anthropic" },
  { value: "qwen", label: "Qwen", description: "Alibaba Cloud" },
  { value: "deepseek", label: "DeepSeek", description: "DeepSeek" },
  { value: "glm", label: "GLM", description: "Zhipu AI" },
  { value: "grok", label: "Grok", description: "xAI" },
  { value: "gemini", label: "Gemini", description: "Google" },
  { value: "gpt", label: "GPT", description: "OpenAI" },
  { value: "kmc/kimi-for-coding", label: "Dreyze Ai", badge: <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider bg-yellow-500/10 px-1.5 py-0.5 rounded">Beta</span>, description: "Kimi" },
];

export function ModelSelector() {
  const model = usePreferencesStore((s) => s.model);
  const setModel = usePreferencesStore((s) => s.setModel);
  return <Dropdown value={model} options={MODEL_OPTIONS} onChange={setModel} />;
}
