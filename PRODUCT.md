# Product Contract

## What This Project Is

`barbara-sh-b010-homemichelinch` is a full-stack TypeScript app that turns a Chinese dish name into an English cooking guide with a polished Michelin-style presentation. A user enters a dish name and optional notes; the app returns a structured guide with recipe details, pronunciation support, media enrichment when configured, and clear fallback/error states when dependencies are unavailable.

## Current User-Facing Features

- Dish input flow with validation, loading skeletons, API error messaging, and closest-match handling for unclear dishes.
- Full guide rendering with English title, original Chinese name, pinyin/IPA pronunciation, grouped ingredients, cooking times, servings, difficulty, steps, chef tips, common mistakes, plating notes, and a Michelin-style rewrite.
- Browser speech controls for pronunciation and full-recipe read-aloud, hidden when `SpeechSynthesis` is unsupported.
- Inline YouTube video block when a ranked English cooking video is available, with fallback UI when video enrichment is skipped or unavailable.
- Dish photo block with presigned object-storage URLs when available, and non-blocking fallback UI when photo enrichment is skipped or unavailable.

## Backend Behavior

- `POST /api/guide` normalizes and validates input, checks the PostgreSQL `dish_guides` cache, generates a schema-validated guide with Claude on cache miss, enriches media opportunistically, persists the result, and returns the shared `GuideResponse` contract.
- `GET /api/health` performs readiness checks for database connectivity, the `dish_guides` schema, and Claude configuration, returning dependency-level pass/fail details.
- Startup runs pending SQL migrations idempotently before accepting requests so `dish_guides` exists before the first guide request.
- Only `DATABASE_URL` and `CLAUDE_API_KEY` are required to boot. YouTube, image search, and object storage configuration are optional and validated lazily by the services that need them.
- Runtime failures are mapped to structured JSON errors for the frontend, including missing `dish_guides`, database connectivity failures, Claude authentication failures, and invalid Claude generation responses.

## Architecture And Conventions

- Monorepo layout:
  - `apps/web`: Vite + React frontend using TanStack Query, Tailwind CSS, shadcn-style UI primitives, Web Speech hooks, and Playwright E2E tests.
  - `apps/api`: Express 5 API server, PostgreSQL migrations, guide generation/cache/media services, health checks, and Node test-runner unit tests.
  - `packages/shared`: shared TypeScript request/response contracts and health/guide DTOs.
- The API serves `/api/*` routes and the compiled React app from one Express process; the SPA fallback excludes `/api/*`.
- PostgreSQL is the only persistent datastore. Cached guide payloads and media metadata live in `dish_guides`.
- Object storage uses the vendor-neutral `OBJECT_STORAGE_*` environment variables. Every stored object key must be prefixed with `OBJECT_STORAGE_PREFIX`, and browser-visible media URLs must be presigned because the bucket is private.
- Production listens on `0.0.0.0:8080` by default.

## Verification Commands

- `npm run build`
- `npm test`
- `npm run test:e2e`
- `npm run lint`
- `npm run typecheck`
- `npm run format:check`
