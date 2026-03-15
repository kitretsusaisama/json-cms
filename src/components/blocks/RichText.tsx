import React, { useMemo } from "react";
import DOMPurify from "dompurify";

export type RichTextProps = {
  markdown: string;
  allowHtml?: boolean;
};

// Allowed tags mapping
const TAGS: Record<string, keyof JSX.IntrinsicElements> = {
  p: "p",
  strong: "strong",
  em: "em",
  a: "a",
  ul: "ul",
  ol: "ol",
  li: "li",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  br: "br",
  hr: "hr",
};

// Simple HTML parser to React elements
// Uses a monotonically-incrementing counter for stable, deterministic keys.
// Math.random() was removed — it causes SSR/hydration mismatches.
const parseHtmlToReact = (html: string): React.ReactNode[] => {
  const container = document.createElement("div");
  container.innerHTML = html;

  let nodeCounter = 0;

  const parseNode = (node: ChildNode): React.ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const Tag = TAGS[el.tagName.toLowerCase()];
      if (!Tag) {
        return null;
      }

      const nodeKey = `rt-node-${++nodeCounter}`;
      const props: Record<string, string> = {};
      if (el.tagName.toLowerCase() === "a") {
        props.href = el.getAttribute("href") || "#";
        props.target = "_blank";
        props.rel = "noopener noreferrer";
      }

      return (
        <Tag {...props} key={nodeKey}>
          {Array.from(el.childNodes).map(parseNode)}
        </Tag>
      );
    }
    return null;
  };

  return Array.from(container.childNodes).map(parseNode);
};

export default function RichText({ markdown, allowHtml = false }: RichTextProps): JSX.Element {
  const content = useMemo(() => {
    if (allowHtml) {
      const sanitized = DOMPurify.sanitize(markdown, {
        ALLOWED_TAGS: Object.keys(TAGS),
        ALLOWED_ATTR: ["href"],
      });
      return parseHtmlToReact(sanitized);
    }
    return markdown;
  }, [markdown, allowHtml]);

  return (
    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
      {allowHtml ? content : markdown}
    </div>
  );
}
