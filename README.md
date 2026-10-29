# NEXUS STUDY

NEXUS STUDY is a collaboration platform for student workspaces, group projects, tasks, chat, documents, polls, peer evaluation, and AI-assisted study.

## Project structure

```text
frontend/src/
  components/  Reusable UI
  context/     Authentication context
  hooks/       Shared React hooks
  layouts/     Application shell
  pages/       Route-level screens
  routes/      Route and access guards
  services/    API clients
  utils/       Shared helpers

backend/src/
  config/      Environment and database setup
  jobs/        Scheduled reminders and retention work
  middleware/  Authentication, authorization, and request processing
  modules/     Feature routes, controllers, services, and models

docs/
  nexus-study-product-spec.md
  technology-tools-description.md
  use-cases.md
```

The frontend follows a single page → component → service flow. The backend groups related routes, controllers, services, and models by feature under `modules/`.

## Run locally

Install dependencies from the repository root:

```bash
npm install
```

Configure MongoDB and backend environment variables using [backend/.env.example](backend/.env.example). Then start the frontend and backend:

```bash
npm run dev
```

- Web app: `http://localhost:5173`
- Backend API: `http://localhost:5000`

To start one workspace only, run `npm run dev --workspace frontend` or `npm run dev --workspace backend`. `npm start` starts the backend and requires a valid `JWT_SECRET` and a reachable MongoDB database.

## Verify changes

```bash
npm test
npm run build
```

`npm test` runs the backend Node.js test suite followed by the frontend Vitest suite. Product behavior and role-based use cases are documented in [docs/use-cases.md](docs/use-cases.md).
