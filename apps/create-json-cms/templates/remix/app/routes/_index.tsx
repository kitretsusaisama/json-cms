import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [{ title: "__PROJECT_TITLE__" }];

export default function IndexRoute(): JSX.Element {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>__PROJECT_TITLE__</h1>
      <p>Remix + UpFlame JSON CMS scaffold is ready.</p>
      <p>Visit <a href="/cms">/cms</a> for CMS bootstrap route.</p>
    </main>
  );
}
