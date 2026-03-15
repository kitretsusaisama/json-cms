export default function HomePage(): JSX.Element {
  return (
    <main className="shell">
      <section className="hero">
        <span className="pill">Preset: __PRESET__</span>
        <div>
          <h1>__PROJECT_TITLE__</h1>
          <p>
            Your Upflame CMS project is ready. Edit <code>cms.config.ts</code>, add plugins,
            and start shaping your content model.
          </p>
        </div>
      </section>
    </main>
  );
}
