import React from "react";
import Link from "next/link";
import AnnouncementBar from "@/components/blocks/AnnouncementBar";
import CTA from "@/components/blocks/CTA";
import FAQ from "@/components/blocks/FAQ";
import FeatureCard from "@/components/blocks/FeatureCard";
import Grid from "@/components/blocks/Grid";
import Hero from "@/components/blocks/Hero";
import Newsletter from "@/components/blocks/Newsletter";
import ProductGrid from "@/components/blocks/ProductGrid";
import RichText from "@/components/blocks/RichText";
import TagList from "@/components/blocks/TagList";
import { componentCatalog } from "@/core/components/catalog";

const TextBlock = ({ content, ...rest }: { content: string; [key: string]: unknown }) => (
  <RichText markdown={content} {...rest} />
);

const SEO = (_props: Record<string, unknown>) => null;

const Button = ({
  href = "#",
  variant = "primary",
  children,
}: {
  href?: string;
  variant?: "primary" | "secondary" | "outline";
  children?: React.ReactNode;
}) => (
  <Link
    href={href}
    className={`inline-block rounded px-6 py-2 transition-colors ${
      variant === "primary"
        ? "bg-blue-600 text-white hover:bg-blue-700"
        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
    }`}
  >
    {children}
  </Link>
);

export const registry = {
  Hero,
  SEO,
  Grid,
  FeatureCard,
  CTA,
  TextBlock,
  AnnouncementBar,
  FAQ,
  Newsletter,
  ProductGrid,
  RichText,
  TagList,
  Card: FeatureCard,
  Button,
} as const;

const coreMetadata: Record<keyof typeof registry, { description: string; category: string }> = {
  Hero: { description: "Large hero section with heading, subheading, image, and CTA.", category: "marketing" },
  SEO: { description: "Metadata-only SEO component.", category: "meta" },
  Grid: { description: "Responsive grid layout container.", category: "layout" },
  FeatureCard: { description: "Feature card component for reusable highlights.", category: "content" },
  CTA: { description: "Call-to-action section with one or more buttons.", category: "marketing" },
  TextBlock: { description: "Markdown-backed text content.", category: "content" },
  AnnouncementBar: { description: "Top-of-page announcement banner.", category: "notification" },
  FAQ: { description: "Frequently asked questions component.", category: "content" },
  Newsletter: { description: "Newsletter sign-up form.", category: "marketing" },
  ProductGrid: { description: "Product collection grid.", category: "commerce" },
  RichText: { description: "Rich text / markdown renderer.", category: "content" },
  TagList: { description: "Tag or label list.", category: "navigation" },
  Card: { description: "Alias for FeatureCard.", category: "content" },
  Button: { description: "Link-like button wrapper.", category: "interactive" },
};

for (const [key, component] of Object.entries(registry) as Array<[
  keyof typeof registry,
  (typeof registry)[keyof typeof registry]
]>) {
  if (!componentCatalog.has(key)) {
    componentCatalog.registerCoreComponent(key, component as React.ComponentType<Record<string, unknown>>, {
      metadata: {
        name: key,
        description: coreMetadata[key].description,
        category: coreMetadata[key].category,
        version: "1.0.0",
        author: "core",
        tags: ["core"],
      },
    });
  }
}

export type ComponentKey = keyof typeof registry;

export const getRegisteredComponent = (key: string) => componentCatalog.getComponent(key);
export const getComponent = (key: string) => componentCatalog.get(key);
export const validateProps = (key: string, props: Record<string, unknown>) =>
  componentCatalog.validateProps(key, props);
export const searchComponents = (query: string) => componentCatalog.search(query);
export const getComponentsByCategory = (category: string) => componentCatalog.listByCategory(category);
export const getComponentMetadata = (key: string) => componentCatalog.get(key)?.metadata ?? null;
export const getRegistryStats = () => {
  const entries = componentCatalog.list();
  return {
    totalComponents: entries.length,
    categories: [...new Set(entries.map((entry) => entry.metadata.category))].sort(),
    pluginComponents: entries.filter((entry) => entry.runtime === "plugin").length,
  };
};
export const registerManifestComponent = componentCatalog.registerManifestEntry.bind(componentCatalog);
export const updateManifestComponent = componentCatalog.updateEntry.bind(componentCatalog);
export const unregisterComponent = componentCatalog.unregister.bind(componentCatalog);


