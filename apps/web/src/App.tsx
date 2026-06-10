import type { HealthResponse } from "@app/shared";

const staticHealthCheck: HealthResponse = {
  ok: true,
  service: "api",
  timestamp: new Date(0).toISOString(),
};

export function App() {
  return (
    <main className="shell">
      <section className="intro">
        <p className="eyebrow">Full-stack scaffold</p>
        <h1>Dish guide workspace</h1>
        <p>
          Vite, React, Express, TypeScript, shared contracts, and static frontend serving
          are ready for the next implementation issue.
        </p>
        <dl className="statusGrid" aria-label="Scaffold status">
          <div>
            <dt>Frontend</dt>
            <dd>Vite + React</dd>
          </div>
          <div>
            <dt>Backend</dt>
            <dd>Express on port 8080</dd>
          </div>
          <div>
            <dt>Shared DTO check</dt>
            <dd>{staticHealthCheck.ok ? "ok:api" : "unavailable"}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
