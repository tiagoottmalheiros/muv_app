"use client";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

export function RichResult({ content, compact = false }: { content: string; compact?: boolean }) {
  const sections = splitSections(normalizeResultMarkdown(content));

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {sections.map((section, index) => (
        <div
          className={`overflow-hidden rounded-2xl border border-white/8 bg-white/[.025] ${compact ? "p-4" : "p-5 sm:p-6"}`}
          key={`${index}-${section.slice(0, 40)}`}
        >
          <ReactMarkdown
            disallowedElements={["img"]}
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              h1: ({ children }) => <h2 className="mb-4 text-xl font-bold leading-tight text-white sm:text-2xl">{children}</h2>,
              h2: ({ children }) => <h2 className="mb-4 text-lg font-bold leading-tight text-white sm:text-xl">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-2 mt-5 text-sm font-bold uppercase tracking-[.1em] text-primary first:mt-0">{children}</h3>,
              h4: ({ children }) => <h4 className="mb-2 mt-4 text-sm font-semibold text-gold">{children}</h4>,
              p: ({ children }) => <p className="mb-4 text-sm leading-7 text-[#dbeafe] last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
              em: ({ children }) => <em className="text-[#bfdbfe]">{children}</em>,
              ul: ({ children }) => <ul className="mb-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#dbeafe] marker:text-primary last:mb-0">{children}</ul>,
              ol: ({ children }) => <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#dbeafe] marker:font-bold marker:text-gold last:mb-0">{children}</ol>,
              li: ({ children }) => <li className="pl-1">{children}</li>,
              blockquote: ({ children }) => <blockquote className="my-5 rounded-r-xl border-l-2 border-gold bg-gold/[.06] px-4 py-3 text-sm leading-6 text-[#fef3c7]">{children}</blockquote>,
              hr: () => <hr className="my-6 border-white/10" />,
              table: ({ children }) => <div className="my-5 overflow-x-auto rounded-xl border border-white/10"><table className="w-full min-w-[520px] border-collapse text-left text-xs">{children}</table></div>,
              thead: ({ children }) => <thead className="bg-primary/10 text-primary">{children}</thead>,
              tbody: ({ children }) => <tbody className="divide-y divide-white/8">{children}</tbody>,
              tr: ({ children }) => <tr className="divide-x divide-white/8">{children}</tr>,
              th: ({ children }) => <th className="px-4 py-3 font-bold uppercase tracking-wider">{children}</th>,
              td: ({ children }) => <td className="px-4 py-3 align-top leading-5 text-[#dbeafe]">{children}</td>,
              a: ({ children, href }) => <a className="font-semibold text-primary underline decoration-primary/40 underline-offset-4" href={href} rel="noreferrer" target="_blank">{children}</a>,
              pre: ({ children }) => <pre className="my-4 overflow-x-auto rounded-xl border border-white/8 bg-[#020617] p-4 font-mono text-xs leading-6 text-[#bfdbfe]">{children}</pre>,
              code: ({ children }) => <code className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-xs text-gold">{children}</code>,
            }}
          >
            {section}
          </ReactMarkdown>
        </div>
      ))}
    </div>
  );
}

function normalizeResultMarkdown(content: string) {
  let inCodeBlock = false;
  return content
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      if (line.trim().startsWith("```")) inCodeBlock = !inCodeBlock;
      if (inCodeBlock || line.trim().startsWith("```")) return line;
      const trimmed = line.trim();
      if (/^[\s._=*·•—–-]{3,}$/.test(trimmed)) return "";
      if (/^[•·▪◦]\s+/.test(trimmed)) return trimmed.replace(/^[•·▪◦]\s+/, "- ");
      if (isLegacyHeading(trimmed)) return `## ${trimmed}`;
      return line;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isLegacyHeading(line: string) {
  if (!line || line.startsWith("#") || line.length > 90 || /[.!?]$/.test(line)) return false;
  const letters = line.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g);
  return Boolean(letters?.length && line === line.toUpperCase() && /^(RESUMO|PROBLEMA|PRIORIDADE|CAUSA|PONTO DO FUNIL|IMPACTO|AÇÃO|INDICADOR|O QUE NÃO|MAPA|COMPRADOR REAL|CURIOSO|ANTI-ICP|AS 5 PORTAS|ANÚNCIO-FILTRO|HEADLINE RECOMENDADA|TEXTO PRINCIPAL|FRASE ANTI-CURIOSO|CTA DE COMPROMISSO|SCRIPT|PRIMEIRA MENSAGEM|PERGUNTAS|CLASSIFICAÇÃO|PRÓXIMO PASSO)/.test(line));
}

function splitSections(content: string) {
  if (!content) return [];
  const sections: string[] = [];
  let current: string[] = [];
  let inCodeBlock = false;
  for (const line of content.split("\n")) {
    const fence = line.trim().startsWith("```");
    if (!inCodeBlock && !fence && /^#{1,2}\s/.test(line) && current.some((item) => item.trim())) {
      sections.push(current.join("\n").trim());
      current = [];
    }
    current.push(line);
    if (fence) inCodeBlock = !inCodeBlock;
  }
  if (current.some((line) => line.trim())) sections.push(current.join("\n").trim());
  return sections;
}
