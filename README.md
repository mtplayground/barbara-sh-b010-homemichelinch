# barbara-sh-b010-homemichelinch

Full-stack TypeScript workspace with a Vite + React frontend, Express backend, and shared package for cross-app contracts.

## Project Structure

- `apps/web`: Vite React client.
- `apps/api`: Express API server that serves `/api/*` routes and the built frontend.
- `packages/shared`: Shared TypeScript types and helpers.

## Scripts

- `npm run dev`: run the API and Vite dev server.
- `npm run build`: build shared types, frontend assets, and backend output.
- `npm run start`: run the built Express server on `0.0.0.0:8080` by default.
- `npm run lint`: run ESLint.
- `npm run format`: format the workspace with Prettier.
- `npm test`: run backend unit tests.
- `npm run test:e2e`: run the Playwright smoke test against the Vite app.
- `npm run db:migrate --workspace @app/api`: apply PostgreSQL migrations.

## Environment

Copy `.env.example` to `.env` for local development and fill in the required values. The API validates configuration at startup and fails fast when required values are missing or malformed.

Required runtime groups:

- Server: `HOST`, `PORT`
- PostgreSQL: `DATABASE_URL`
- APIs: `CLAUDE_API_KEY`, `CLAUDE_MODEL`, `YOUTUBE_API_KEY`, `IMAGE_API_KEY`
- Object storage: `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_PREFIX`, `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_FORCE_PATH_STYLE`

Object storage uses the vendor-neutral Tigris/S3-compatible names above. `OBJECT_STORAGE_PREFIX` must be prepended to every object key. The bucket is private, so persisted media records store object keys and the API signs read URLs before returning them.

## Database

The API uses PostgreSQL for persistent state. Set `DATABASE_URL`, then run:

```bash
npm run db:migrate --workspace @app/api
```

The initial migration creates `dish_guides`, a cache table keyed by normalized dish name with English display name, generated guide JSON, media reference JSON, and timestamps.

## Self-Hosted Build and Run

This workspace builds into a single Express server that serves both `/api/*` routes and the compiled React app.

1. Install dependencies:

```bash
npm ci
```

2. Provide environment variables. For local development, copy `.env.example` to `.env`. For a bare host or container, export the same variables in the process environment. `HOST=0.0.0.0` and `PORT=8080` are the expected defaults.

3. Run PostgreSQL migrations:

```bash
npm run db:migrate --workspace @app/api
```

4. Build all packages:

```bash
npm run build
```

5. Start the built server:

```bash
npm run start
```

6. Check the health endpoint:

```bash
curl http://127.0.0.1:8080/api/health
```

## Failure-Path Notes

- API request failures go through centralized Express error middleware. The server logs method, path, error name, message, stack, and cause, then returns a JSON error envelope.
- Startup configuration failures are logged before the process exits. Missing PostgreSQL, Claude, YouTube, image API, or object storage variables fail fast.
- Missing or unavailable media does not block guide rendering. Photo and video panels show pending fallbacks until signed media URLs are available.
- Unsupported browser speech synthesis hides pronunciation and recipe read-aloud buttons rather than rendering inactive controls.
- The SPA fallback excludes `/api/*`, so API failures are returned as JSON instead of being swallowed by the frontend route.

## Verification

Recommended pre-deploy checks:

```bash
npm test
npm run test:e2e
npm run build
npm run lint
npm run typecheck
npm run format:check
```
