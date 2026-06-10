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

## Environment

Copy `.env.example` to `.env` for local development and fill in the required values. The API validates configuration at startup and fails fast when required values are missing or malformed.

Required runtime groups:

- Server: `HOST`, `PORT`
- PostgreSQL: `DATABASE_URL`
- APIs: `CLAUDE_API_KEY`, `YOUTUBE_API_KEY`, `IMAGE_API_KEY`
- Object storage: `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_PREFIX`, `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_FORCE_PATH_STYLE`

Object storage uses the vendor-neutral Tigris/S3-compatible names above. `OBJECT_STORAGE_PREFIX` must be prepended to every object key by storage code added in later issues.
