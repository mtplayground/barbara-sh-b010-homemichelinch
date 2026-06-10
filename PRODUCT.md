# Product Contract

## What This Project Is

`barbara-sh-b010-homemichelinch` is a full-stack TypeScript app that turns a Chinese dish name into an English cooking guide with Michelin-style presentation. The user enters a dish name and optional notes; the app returns a structured guide with recipe details, pronunciation support, media blocks, and graceful fallbacks.

## Current User-Facing Features

- Dish input flow with loading skeletons, form validation, API error messaging, and closest-match handling.
- Full guide rendering for a Chinese dish, including English title, original Chinese name, pinyin/IPA pronunciation, grouped ingredients, cooking times, servings, difficulty, steps, chef tips, common mistakes, plating notes, and a polished Michelin-style rewrite section.
- Web Speech integration for pronunciation and full-recipe read-aloud; speech controls are hidden when the browser does not support `SpeechSynthesis`.
- Inline YouTube embed when a cooking video is available, with a fallback panel when video media is missing.
- Dish photo block with signed object-storage URLs when available, and non-blocking fallback presentation when media is pending or unavailable.

## Backend Behavior

- `POST /api/guide` normalizes and validates input, checks the PostgreSQL guide cache, generates a guide with Claude on cache miss, persists the result, and returns a shared `GuideResponse` contract.
- Guide generation is schema-validated and retried for transient failures.
- YouTube search service ranks English cooking videos and returns embeddable video data.
- Dish photo service supports image search with AI-image fallback and caches generated/downloaded media in S3-compatible object storage.
- Object storage uses the vendor-neutral `OBJECT_STORAGE_*` environment variables; every object key must be prefixed with `OBJECT_STORAGE_PREFIX`, and read URLs are presigned because the bucket is private.
- API failures flow through centralized Express error middleware that logs method, path, error name, message, stack, and cause before returning a JSON error envelope.

## Architecture And Conventions

- Monorepo layout:
  - `apps/web`: Vite + React frontend using TanStack Query, Tailwind CSS, shadcn-style UI primitives, and Playwright E2E tests.
  - `apps/api`: Express 5 API server, PostgreSQL migrations, generation/cache/media services, and Node test-runner unit tests.
  - `packages/shared`: shared TypeScript request/response contracts and helpers.
- The built API serves both `/api/*` routes and the compiled React app. The SPA fallback excludes `/api/*`.
- Persistent state is PostgreSQL only. The guide cache is stored in `dish_guides`.
- Runtime configuration is environment-driven and validated at startup; missing database, Claude, YouTube, image API, or object storage configuration fails fast with logged details.
- Default production listen address is `0.0.0.0:8080`.

## Verification Commands

- `npm run build`
- `npm test`
- `npm run test:e2e`
- `npm run lint`
- `npm run typecheck`
- `npm run format:check`
