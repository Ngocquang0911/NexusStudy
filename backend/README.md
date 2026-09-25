# NEXUS STUDY Backend

Phase 2 authentication foundation for the NEXUS STUDY modular monolith backend.

## Stack

- Node.js and Express.js
- MongoDB and Mongoose
- dotenv and cors
- Phase 1 dependency baseline includes JWT, bcryptjs, express-validator, Socket.IO, Multer, OpenAI-compatible client, Jest, and Supertest for later phases.

## Installation

From the repository root:

```bash
npm install
```

Or from this directory:

```bash
npm install
```

## Environment variables

Copy `.env.example` to `.env` and set values for your machine:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/nexus_study
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
AI_API_KEY=your_api_key_here
CLIENT_URL=http://localhost:5173
```

`.env` is ignored by Git. Never commit database credentials, JWT secrets, or AI keys.

## Run MongoDB

Start a local MongoDB instance or configure `MONGODB_URI` for a reachable MongoDB deployment. The backend connects to MongoDB before it starts listening.

## Run the backend

Development mode:

```bash
npm run dev --workspace backend
```

Production-style start:

```bash
npm run start --workspace backend
```

The server listens on `http://localhost:5000` after MongoDB connects.

## Phase 1 endpoint

### Health check

```http
GET /api/health
```

Expected response:

```json
{
  "success": true,
  "message": "NEXUS STUDY API is healthy",
  "data": {
    "service": "nexus-study-api",
    "status": "ok",
    "timestamp": "2026-09-24T00:00:00.000Z"
  }
}
```

Test with curl:

```bash
curl http://localhost:5000/api/health
```

Test with Postman by creating a `GET` request to `http://localhost:5000/api/health`, then select **Send**. No authentication header is required in Phase 1.

## Error response format

```json
{
  "success": false,
  "message": "Route not found: GET /api/unknown",
  "errors": []
}
```

## Phase 2 authentication endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer access token required)
- `POST /api/auth/refresh`

Registration body:

```json
{
  "name": "Minh Tran",
  "email": "minh@example.com",
  "password": "secret123"
}
```

Protected requests use:

```http
Authorization: Bearer <accessToken>
```

Feature modules after authentication will be implemented one phase at a time.

## Phase 4 task endpoints

- `POST /api/tasks`
- `GET /api/workspaces/:workspaceId/tasks`
- `GET /api/tasks/:id`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `PUT /api/tasks/:id/status`
- `PUT /api/tasks/:id/assign`
- `GET /api/workspaces/:workspaceId/progress`

Task statuses are `TODO`, `IN_PROGRESS`, and `DONE`. Priorities are `LOW`, `MEDIUM`, `HIGH`, and `URGENT`. A `DONE` task always has `progress: 100`, while a `TODO` task always has `progress: 0`.

## Phase 5 chat endpoints

- `GET /api/workspaces/:workspaceId/channels`
- `POST /api/workspaces/:workspaceId/channels`
- `PUT /api/channels/:id`
- `DELETE /api/channels/:id`
- `GET /api/channels/:channelId/messages`
- `POST /api/channels/:channelId/messages`
- `PUT /api/messages/:id`
- `DELETE /api/messages/:id`
- `PUT /api/messages/:id/pin`
- `GET /api/channels/:channelId/messages/search?q=keyword`

Socket.IO clients authenticate with `{ auth: { token: accessToken } }` and can use `joinWorkspace`, `joinChannel`, `sendMessage`, `typing`, `stopTyping`, and `pinMessage`. The server emits `receiveMessage`, `typing`, `stopTyping`, and `messagePinned`.

## Phase 6 poll endpoints

- `POST /api/workspaces/:workspaceId/polls`
- `GET /api/workspaces/:workspaceId/polls`
- `GET /api/polls/:id`
- `POST /api/polls/:id/vote`
- `PUT /api/polls/:id/close`
- `DELETE /api/polls/:id`

Polls require at least two unique options and a future `expiresAt`. Each member can vote once. Results expose option counts and the current user's vote, but do not expose voter IDs. Poll creators and workspace leaders can close or delete polls.

## Phase 7 document endpoints

- `POST /api/workspaces/:workspaceId/documents` (`multipart/form-data`, field: `file`)
- `GET /api/workspaces/:workspaceId/documents`
- `GET /api/documents/:id`
- `DELETE /api/documents/:id`

Uploads are stored locally in `backend/uploads`, limited to 10 MB. Supported types are PDF, DOC, DOCX, and plain text. Every document endpoint verifies workspace membership; deletion is limited to the uploader or workspace leader.

## Phase 8 evaluation endpoints

- `POST /api/workspaces/:workspaceId/evaluations`
- `GET /api/workspaces/:workspaceId/evaluations`
- `GET /api/workspaces/:workspaceId/evaluations/me`
- `GET /api/workspaces/:workspaceId/evaluations/report`
- `GET /api/evaluations/:id`

Evaluation submissions use a `period`, `periodEndsAt`, `evaluatedUserId`, `criteria`, and optional `comment`. Criteria scores are from 1 to 5. Users cannot evaluate themselves or submit twice for the same evaluator, evaluated member, and period. Evaluation data and reports remain private until `periodEndsAt`; reports include average score, evaluation count, contribution percentage, and score by criterion.

## Phase 9 AI endpoints

- `POST /api/ai/chat`
- `POST /api/ai/summarize`
- `POST /api/ai/generate-quiz`
- `POST /api/ai/generate-flashcards`
- `POST /api/ai/task-suggestion`

Workspace AI requests require `workspaceId` and membership. Document-based requests accept `documentIds`; every ID is verified against the same workspace before any provider call. Configure `AI_API_KEY`, optional `AI_BASE_URL`, and `AI_MODEL` to use an OpenAI-compatible provider. Without a key, the API returns a clearly marked `mock` response so local development remains usable.
