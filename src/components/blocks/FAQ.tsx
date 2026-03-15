import React from "react";

// Define FAQ item type
type FAQItem = {
  q: string;
  a: string;
};

export type FAQProps = {
  items: FAQItem[];
};

export default function FAQ({ items }: FAQProps): JSX.Element {
  return (
    <section className="faq container mx-auto py-8">
      <div className="space-y-4">
        {items.map((item: FAQItem, index: number) => (
          <details key={`faq-${item.q?.substring(0, 20).toLowerCase().replace(/\s+/g, '-') || index}`} className="rounded border border-gray-200 dark:border-gray-700 p-4">
            <summary className="cursor-pointer font-medium">{item.q}</summary>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
