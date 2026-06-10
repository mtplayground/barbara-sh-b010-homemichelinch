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
