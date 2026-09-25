# NEXUS STUDY Frontend

Phase 1 React/Vite foundation for the NEXUS STUDY student collaboration platform.

## Stack

- React and Vite
- JavaScript
- Tailwind CSS through `@tailwindcss/vite`
- React Router DOM
- Axios
- React Hook Form
- Socket.IO Client
- Lucide React

## Installation and run

From the repository root:

```bash
npm install
npm run dev --workspace frontend
```

Open `http://localhost:5173/`.

## Environment

Copy `.env.example` to `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

The Axios proxy also forwards `/api` to the backend at port `5000` during local development.

## Phase 1 routes

Public:

- `/login`
- `/register`

Protected placeholder screens:

- `/dashboard`
- `/workspaces`
- `/tasks`
- `/calendar`
- `/chat`
- `/polls`
- `/evaluations`
- `/ai`
- `/profile`
- `/workspaces/:workspaceId`

Phase 2 authentication is connected to the backend. `AuthContext` loads `/api/auth/me`, login/register store the access and refresh tokens, protected routes wait for auth initialization, and a `401` response clears the local session and returns the user to the public auth flow.

Phase 3 dashboard data is connected to `GET /api/workspaces` and `GET /api/workspaces/:workspaceId/tasks`. It computes open tasks, completed progress, and upcoming deadlines with loading, error, and empty states. Other feature screens remain route placeholders until their respective frontend phases.

Phase 4 adds real workspace list/create/detail screens and member management. Workspace pages use the existing workspace APIs for detail, members, invitations, role changes, and member removal. Backend authorization remains authoritative for owner/leader actions.
