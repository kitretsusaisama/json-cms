import React from "react";
import DOMPurify from "dompurify";
import { SeoRecord } from "@/types/seo";

interface SeoHeadProps {
  seo: SeoRecord;
}

interface JsonLdData {
  "@type"?: string;
  [key: string]: unknown;
}

interface JsonLdScriptProps {
  data: JsonLdData;
  scriptKey: string;
}

const sanitizeText = (text: string): string => {
  if (typeof window === "undefined") {
    return text;
  }
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

// Helper: create stable key from string
const createKey = (prefix: string, str: string): string => {
  return `${prefix}-${str.substring(0, 20).replace(/\W/g, "")}`;
};

// JSON-LD component using a React-friendly approach
const JsonLdMeta: React.FC<JsonLdScriptProps> = ({ data, scriptKey }) => {
  const [validJsonString, setValidJsonString] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const jsonString = JSON.stringify(data);
      const sanitizedJson = DOMPurify.sanitize(jsonString);
      setValidJsonString(sanitizedJson);
    } catch {
      setValidJsonString(null);
    }
  }, [data]);

  if (!validJsonString) {
    return null;
  }

  // Use a custom data attribute approach instead of dangerouslySetInnerHTML
  return (
    <script
      key={scriptKey}
      type="application/ld+json"
      data-json={validJsonString}
      ref={(el) => {
        if (el && validJsonString) {
          el.textContent = validJsonString;
        }
      }}
      suppressHydrationWarning
    />
  );
};

export default function SeoHead({ seo }: SeoHeadProps): JSX.Element {
  return (
    <>
      {/* Basic Meta Tags */}
      <title>{sanitizeText(seo.title)}</title>
      <meta name="description" content={sanitizeText(seo.description)} />
      {seo.robots && <meta name="robots" content={sanitizeText(seo.robots)} />}

      {/* Canonical URL */}
      {seo.canonical && <link rel="canonical" href={sanitizeText(seo.canonical)} />}

      {/* Alternate Languages */}
      {seo.alternates &&
        Object.entries(seo.alternates).map(([locale, url]) => (
          <link
            key={createKey("alt", locale)}
            rel="alternate"
            hrefLang={locale}
            href={sanitizeText(url)}
          />
        ))}

      {/* Custom Meta Tags */}
      {seo.meta.map((tag) => {
        const uniqueKey = createKey(
          tag.name || tag.property || "meta",
          tag.content
        );
        return (
          <meta
            key={uniqueKey}
            {...(tag.name && { name: sanitizeText(tag.name) })}
            {...(tag.property && { property: sanitizeText(tag.property) })}
            content={sanitizeText(tag.content)}
          />
        );
      })}

      {/* Open Graph */}
      {seo.openGraph && (
        <>
          <meta property="og:type" content={sanitizeText(seo.openGraph.type)} />
          {seo.openGraph.title && (
            <meta property="og:title" content={sanitizeText(seo.openGraph.title)} />
          )}
          {seo.openGraph.description && (
            <meta
              property="og:description"
              content={sanitizeText(seo.openGraph.description)}
            />
          )}
          {seo.openGraph.url && (
            <meta property="og:url" content={sanitizeText(seo.openGraph.url)} />
          )}
          {seo.openGraph.images?.map((image) => (
            <React.Fragment key={createKey("og-image", image.url)}>
              <meta property="og:image" content={sanitizeText(image.url)} />
              {image.alt && (
                <meta property="og:image:alt" content={sanitizeText(image.alt)} />
              )}
            </React.Fragment>
          ))}
        </>
      )}

      {/* Twitter Card */}
      {seo.twitter && (
        <>
          <meta name="twitter:card" content={sanitizeText(seo.twitter.card)} />
          {seo.twitter.site && (
            <meta name="twitter:site" content={sanitizeText(seo.twitter.site)} />
          )}
          {seo.twitter.creator && (
            <meta
              name="twitter:creator"
              content={sanitizeText(seo.twitter.creator)}
            />
          )}
          {seo.twitter.title && (
            <meta name="twitter:title" content={sanitizeText(seo.twitter.title)} />
          )}
          {seo.twitter.description && (
            <meta
              name="twitter:description"
              content={sanitizeText(seo.twitter.description)}
            />
          )}
          {seo.twitter.image && (
            <meta name="twitter:image" content={sanitizeText(seo.twitter.image)} />
          )}
        </>
      )}

      {/* Structured Data (JSON-LD) - Using the ref-based approach */}
      {seo.structuredData.map((data) => {
        const contentHash = createKey(data["@type"] || "unknown", JSON.stringify(data));
        const scriptKey = `structured-data-${contentHash}`;
        return (
          <JsonLdMeta
            key={scriptKey}
            data={data}
            scriptKey={scriptKey}
          />
        );
      })}
    </>
  );
}