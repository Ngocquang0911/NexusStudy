# NEXUS STUDY Backend

The API backend for NEXUS STUDY. Feature code is organized into modules containing routes, controllers, services, and Mongoose models.

## Stack

- Node.js and Express.js
- MongoDB and Mongoose
- dotenv and cors
- JWT authentication, Socket.IO, document extraction, email delivery, and AI-provider integration

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
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=noreply@example.com
```

`.env` is ignored by Git. Never commit database credentials, JWT secrets, or AI keys.
SMTP must be configured before new account registration: the user receives a 6-digit email verification code that expires after 15 minutes. Verification allows five code attempts, and new codes can be requested after a 60-second cooldown. Deadline reminder emails also use SMTP; in-app notifications do not require it.
For Gmail, configure `smtp.gmail.com`, port `587`, and `SMTP_SECURE=false`; if the STARTTLS connection times out, the server automatically retries once using port `465` with TLS.
`SMTP_PASSWORD` must be a Google App Password created after enabling 2-Step Verification; a normal Google account password is rejected by Gmail.

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

## Test and build

From the repository root, run `npm test` to execute the backend and frontend test suites, or `npm run build` to build/check both workspaces. To run only backend tests or the backend syntax check, use `npm test --workspace backend` or `npm run build --workspace backend`.

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
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
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

Registration returns an email verification requirement instead of an access token. The user must submit `{ "email": "...", "code": "123456" }` to `/api/auth/verify-email`; successful verification returns the usual access and refresh tokens. Unverified accounts cannot log in.

Protected requests use:

```http
Authorization: Bearer <accessToken>
```

Feature modules after authentication will be implemented one phase at a time.

## Workspace invitations

- `POST /api/workspaces/:id/invite` (workspace owner or leader)
- `GET /api/workspaces/:id/invitations` (workspace member)
- `DELETE /api/workspaces/:id/invitations/:invitationId` (workspace owner or leader)
- `GET /api/workspaces/invitations` (current invitee)
- `POST /api/workspaces/invitations/:invitationId/accept` (current invitee)
- `POST /api/workspaces/invitations/:invitationId/decline` (current invitee)

Sending an invitation creates a `PENDING` invitation and an in-app notification with accept/decline actions; it does not add the recipient as a member. Pending invitations expire exactly three days after creation and cannot be accepted afterward. Expiration is persisted by the scheduled job and when invitation lists are retrieved. Acceptance adds the invitee as a `MEMBER` in that workspace only, subject to their existing plan workspace limit. Free accounts can create or join up to three workspaces. Mongoose manages the invitation collection indexes; no separate migration is required.
Direct membership by invite code is disabled. Legacy `POST /api/workspaces/join` and `POST /api/workspaces/:id/join` requests return `410 INVITATION_REQUIRED`; existing join-code fields are retained internally for database compatibility but are not returned by workspace APIs.

## Workspace deletion

- `DELETE /api/workspaces/:id` (workspace owner only)

Deletion first snapshots every official workspace member, then records `status: DELETED`, `deletedAt`, `deletedBy`, and `purgeAt` five days later. The owner must confirm the exact workspace name in the frontend; the backend independently verifies the active workspace and its owner. Ordinary resource APIs and Socket.IO membership checks deny further access. Pending invitations are cancelled, old workspace notifications are removed, an idempotent offline notification is stored for each snapshotted member, realtime rooms are revoked, and an admin audit entry is recorded. If any secondary cleanup fails after access has been revoked, the API marks `cleanupPending` in its response, logs the failed operation, and the scheduled job retries notification delivery.

`GET /api/workspaces/deleted-spaces` lists only archives for users in the deletion-time member snapshot. `GET /api/workspaces/deleted-spaces/:id/documents` lists documents still within their normal retention period; `GET /api/workspaces/deleted-spaces/:id/documents/:documentId/download` rechecks the snapshot, workspace/document relationship, retention window, and archive deadline for each download. External links and task/chat URL attachments are not stored files and are not offered as archive downloads. After `purgeAt`, a scheduled job permanently removes workspace-scoped tasks, messages, channels, polls, evaluations, invitations, notifications, memberships, documents, and workspace records. Stored document files are removed only when no document or attachment in another workspace references them. Accounts, audit history, and files shared with other spaces are preserved. Purge failures are logged and retried on the next scheduler run. Mongoose manages these fields and indexes; no separate schema migration is required.

## Phase 4 task endpoints

- `POST /api/tasks`
- `GET /api/workspaces/:workspaceId/tasks`
- `GET /api/tasks/:id`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `PUT /api/tasks/:id/status`
- `PUT /api/tasks/:id/assign`
- `GET /api/workspaces/:workspaceId/progress`

Task statuses are `TODO`, `IN_PROGRESS`, `CANCELLED`, `REVIEW`, and `DONE`; `OVERDUE` is derived from an unfinished task's deadline. Priorities are `LOW`, `MEDIUM`, `HIGH`, and `URGENT`. A `DONE` task always has `progress: 100`, while a `TODO` task always has `progress: 0`. Tasks can also store difficulty, estimated hours, and completion time.

Tasks with a deadline receive three automatic reminders. Premium workspace leaders can replace that schedule with up to 50 custom reminder times using `PUT /api/tasks/:id/reminders`. Reminders create in-app notifications; email delivery requires the SMTP settings described above.

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

Free users can use the default channel in each of up to three workspaces and pin up to four messages per workspace. Premium users can create additional public or private channels, join unlimited workspaces, and pin up to 50 messages per workspace. Private channel membership is checked by both REST and Socket.IO.

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

Files expire after 90 days for Free users and 365 days for Premium users. A scheduled backend job deletes expired records and uploaded files.

## Phase 8 evaluation endpoints

- `POST /api/workspaces/:workspaceId/evaluations`
- `GET /api/workspaces/:workspaceId/evaluations`
- `GET /api/workspaces/:workspaceId/evaluations/me`
- `GET /api/workspaces/:workspaceId/evaluations/report`
- `GET /api/evaluations/:id`

Evaluation submissions include `evaluatedUserId`, `criteria`, and an optional `comment`. The server assigns each submission to the current UTC calendar month; a user can evaluate each other workspace member once per month. Criteria scores are from 1 to 5, and self-evaluations are rejected. Evaluation reports are available to Premium workspace leaders for the most recently completed month and include average score, evaluation count, contribution percentage, criterion scores, and assigned-task outcomes. The report page can export a CSV file.

## Plans

New accounts use the Free plan. Administrators assign or remove Premium access through the admin user-management page; billing is not integrated. Free accounts can create or join up to three workspaces, pin four messages per workspace, and retain files for 90 days. Premium accounts can join unlimited workspaces, create channels, pin up to 50 messages per workspace, retain files for 365 days, configure reminder schedules, and access contribution reports.

## System administration

System administration is restricted by `requireAuth` and a fresh database lookup of the requesting user's `systemRole` on every `/api/admin/*` request; workspace owners and leaders do not receive system-admin access. `GET /api/admin/overview?range=7d|30d|90d` returns database counts and daily account/workspace creation aggregates. AI usage, active-user counts, and moderation reports are explicitly marked as not tracked because the application does not yet store those records. `GET /api/admin/users` is paginated and supports search and role filtering. Role and plan changes require a reason and append an `AdminAuditLog` record; these records are not exposed for modification by the admin API. No external migration is required: Mongoose creates the audit-log collection and indexes on startup. Payments, subscription expiry, account suspension, and additional admin permission tiers are not implemented.

## Phase 9 AI endpoints

- `POST /api/ai/chat`
- `POST /api/ai/summarize`
- `POST /api/ai/generate-quiz`
- `POST /api/ai/generate-flashcards`
- `POST /api/ai/task-suggestion`

Workspace AI requests require `workspaceId` and membership. Document-based requests accept up to 10 `documentIds`; every ID is verified against the same workspace and retention period before any provider call. AI reads text from selected TXT, PDF, DOC, and DOCX files and sends at most 40,000 extracted characters to the configured provider. External links and image-only or unreadable files cannot be summarized. Configure `AI_API_KEY`, optional `AI_BASE_URL`, and `AI_MODEL` in `backend/.env` to use an OpenAI-compatible provider. Keep provider credentials out of `frontend/.env`; the frontend example only configures `VITE_API_URL`. If the provider is not configured or fails, the API returns an explicit error instead of a mock success.
