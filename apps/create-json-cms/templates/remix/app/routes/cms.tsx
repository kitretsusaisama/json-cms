import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [{ title: "UpFlame CMS" }];

export default function CmsRoute(): JSX.Element {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>UpFlame CMS</h1>
      <p>CMS bootstrap is active. Configure content in <code>cms/</code> and <code>cms.config.ts</code>.</p>
    </main>
  );
}
