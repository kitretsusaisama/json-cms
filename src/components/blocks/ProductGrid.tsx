import React from "react";
// Define ProductGrid props type
export type ProductGridProps = {
  limit: number;
  collection?: string;
  category?: string;
  sortBy?: string;
};

export default function ProductGrid({ limit, collection, category, sortBy }: ProductGridProps): JSX.Element {
  return (
    <section className="product-grid container mx-auto py-8">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Product Grid: {limit} items from {collection || category || 'all'} sorted by {sortBy}
      </p>
      {/* TODO: Replace with real data source */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: limit }, (_, i) => (
          <div key={`product-${collection || 'all'}-${category || 'none'}-item-${i}`} className="h-24 rounded bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    </section>
  );
}
