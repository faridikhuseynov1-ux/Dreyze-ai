"use client";

import { Brain, Eye, Globe, Sparkles, Zap, Video } from "lucide-react";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { usePreferencesStore } from "@/lib/store";
import type { ModeId } from "@/lib/types";

export const MODE_OPTIONS: DropdownOption<ModeId>[] = [
  { value: "fast", label: "Быстрый", description: "Короткие, мгновенные ответы", icon: <Zap className="h-3.5 w-3.5" /> },
  { value: "smart", label: "Умный", description: "Сбалансированное качество", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { value: "reasoning", label: "Рассуждение", description: "Глубокий пошаговый анализ", icon: <Brain className="h-3.5 w-3.5" /> },
  { value: "research", label: "Research", description: "Поиск в интернете", icon: <Globe className="h-3.5 w-3.5" /> },
  { value: "vision", label: "Vision", description: "Анализ изображений", icon: <Eye className="h-3.5 w-3.5" /> },
  { value: "video", label: "Видео", description: "Генерация видео по тексту", icon: <Video className="h-3.5 w-3.5" /> },
];

export function ModeSelector() {
  const mode = usePreferencesStore((s) => s.mode);
  const setMode = usePreferencesStore((s) => s.setMode);
  return <Dropdown value={mode} options={MODE_OPTIONS} onChange={setMode} />;
}
