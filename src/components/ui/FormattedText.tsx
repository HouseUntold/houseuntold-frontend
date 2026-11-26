import { cn } from "@/lib/utils";
import React from "react";

interface FormattedTextProps {
  text: string;
  className?: string;
}

type Block = {
  type: "p" | "ul" | "ol" | "quote" | "pre" | "h";
  items: string[];
  level?: number;
};

const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]+\))/g;

const safeHref = (href: string) => (/^(https?:|mailto:)/i.test(href) ? href : null);

const inline = (text: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  INLINE.lastIndex = 0;

  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="px-1 py-0.5 rounded bg-[var(--color-canvas)] border border-[var(--color-hairline)] font-mono text-[0.9em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const href = link ? safeHref(link[2]) : null;
      nodes.push(
        href
          ? (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-[var(--color-brand)] underline-offset-2 hover:text-[var(--color-brand)]"
            >
              {link?.[1]}
            </a>
          )
          : <span key={key}>{link?.[1] || token}</span>,
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    last = match.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
};

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className }) => {
  const blocks: Block[] = [];
  const codeLines: string[] = [];
  let inCode = false;

  text.split(/\r?\n/).forEach((raw) => {
    if (raw.trim().startsWith("```")) {
      if (inCode) {
        blocks.push({ type: "pre", items: [...codeLines] });
        codeLines.length = 0;
      }
      inCode = !inCode;
      return;
    }
    if (inCode) {
      codeLines.push(raw);
      return;
    }

    const line = raw.trim();
    if (!line) return;

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: "h", items: [heading[2]], level: heading[1].length });
      return;
    }

    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    const quote = line.match(/^>\s?(.*)$/);
    const type: Block["type"] = bullet ? "ul" : numbered ? "ol" : quote ? "quote" : "p";
    const content = (bullet || numbered || quote)?.[1] || line;
    const last = blocks[blocks.length - 1];

    if (last?.type === type && type !== "p") last.items.push(content);
    else blocks.push({ type, items: [content] });
  });

  if (inCode && codeLines.length) blocks.push({ type: "pre", items: [...codeLines] });

  return (
    <div className={cn("space-y-2", className)}>
      {blocks.map((block, index) => {
        if (block.type === "h") {
          const Tag = (block.level || 3) <= 2 ? "h3" : "h4";
          return (
            <Tag key={index} className="font-bold text-[var(--color-ink)] text-base mt-3 first:mt-0">
              {inline(block.items[0])}
            </Tag>
          );
        }
        if (block.type === "pre") {
          return (
            <pre
              key={index}
              className="p-3 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] overflow-x-auto text-xs"
            >
              <code>{block.items.join("\n")}</code>
            </pre>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote
              key={index}
              className="pl-3 border-l-2 border-[var(--color-brand)] text-[var(--color-ink)] font-medium"
            >
              {block.items.map((item, itemIndex) => <p key={itemIndex}>{inline(item)}</p>)}
            </blockquote>
          );
        }
        if (block.type === "ul" || block.type === "ol") {
          const ListTag = block.type === "ul" ? "ul" : "ol";
          return (
            <ListTag key={index} className={cn("pl-5 space-y-1", block.type === "ul" ? "list-disc" : "list-decimal")}>
              {block.items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}
            </ListTag>
          );
        }
        return <p key={index}>{inline(block.items[0])}</p>;
      })}
    </div>
  );
};
