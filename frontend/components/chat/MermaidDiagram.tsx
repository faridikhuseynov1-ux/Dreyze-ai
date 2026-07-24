"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    async function renderDiagram() {
      try {
        setError(null);
        // Dynamic import to support client-side rendering safely
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default || mermaidModule;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
        });
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Ошибка отрисовки Mermaid диаграммы");
        }
      }
    }
    if (chart) {
      renderDiagram();
    }
    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="my-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-mono overflow-x-auto">
        <p className="font-semibold mb-1">Mermaid Syntax Error:</p>
        <pre className="whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 flex items-center justify-center rounded-2xl border border-border bg-bg p-4 text-xs text-text-secondary">
        Загрузка диаграммы...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-3 flex justify-center overflow-x-auto rounded-2xl border border-border bg-bg p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
