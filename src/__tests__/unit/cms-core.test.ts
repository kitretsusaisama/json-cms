import { describe, expect, it } from "vitest";
import { detectFramework } from "@/adapters";
import {
  blockToRuntime,
  normalizeContentSlug,
  pageToRuntime,
} from "@/core/content/service";
import type { CmsBlockDocument, CmsPageDocument } from "@/core/content/schemas";

describe("cms core runtime", () => {
  it("normalizes slugs consistently", () => {
    expect(normalizeContentSlug("  Hello CMS World  ")).toBe("hello-cms-world");
    expect(normalizeContentSlug("Docs/Getting Started")).toBe("docs/getting-started");
  });

  it("preserves slot payloads when converting pages to PageV2", () => {
    const page: CmsPageDocument = {
      id: "home",
      slug: "home",
      title: "Home",
      description: "Homepage",
      blocks: ["hero-default"],
      prepend: [
        {
          id: "hero-shell",
          key: "Hero",
          props: { headline: "Welcome" },
          slots: [
            {
              name: "actions",
              accepts: ["Button"],
              items: [
                {
                  id: "cta-primary",
                  key: "Button",
                  props: { label: "Get Started" },
                },
              ],
            },
          ],
        },
      ],
      append: [],
      constraints: [],
      context: {},
      metadata: {},
      permissions: [],
      workflow: { status: "draft", version: 1 },
      contentType: "page",
    };

    const runtime = pageToRuntime(page);
    const hero = runtime.prepend?.[0] as Record<string, unknown>;

    expect(hero.slotIds).toEqual(["actions"]);
    expect(hero.slots).toEqual([
      {
        name: "actions",
        accepts: ["Button"],
        items: [
          expect.objectContaining({
            id: "cta-primary",
            key: "Button",
          }),
        ],
      },
    ]);
    expect(hero.actionsItems).toEqual([
      expect.objectContaining({
        id: "cta-primary",
        key: "Button",
      }),
    ]);
  });

  it("preserves slot payloads when converting blocks to runtime blocks", () => {
    const block: CmsBlockDocument = {
      id: "hero-default",
      name: "Hero Default",
      description: "Hero block",
      category: "marketing",
      tags: ["hero"],
      tree: [
        {
          id: "hero-content",
          key: "Hero",
          props: { title: "Hello" },
          slots: [
            {
              name: "actions",
              accepts: ["Button"],
              items: [
                {
                  id: "hero-button",
                  key: "Button",
                  props: { label: "Explore" },
                },
              ],
            },
          ],
        },
      ],
      constraints: [],
      metadata: {},
      workflow: { status: "draft", version: 1 },
    };

    const runtime = blockToRuntime(block);
    const hero = runtime.tree[0] as Record<string, unknown>;

    expect(hero.slotIds).toEqual(["actions"]);
    expect(hero.actionsItems).toEqual([
      expect.objectContaining({
        id: "hero-button",
        key: "Button",
      }),
    ]);
  });

  it("detects the current workspace as Next.js", async () => {
    const detection = await detectFramework(process.cwd());
    expect(detection.framework).toBe("nextjs");
    expect(detection.adapter.productionReady).toBe(true);
  });
});
