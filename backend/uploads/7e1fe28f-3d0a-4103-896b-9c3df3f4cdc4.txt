# NEXUS STUDY

NEXUS STUDY is a student learning and collaboration platform for group projects, thesis work, study groups, deadlines, tasks, polls, peer evaluation, and document-grounded AI assistance.

## Project structure

```text
NEXUS-STUDY/
├── frontend/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── pages/
│       ├── layouts/
│       ├── services/
│       ├── hooks/
│       ├── context/
│       ├── utils/
│       ├── routes/
│       ├── App.jsx
│       └── main.jsx
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── db.js
│   │   └── server.js
│   ├── .env
│   ├── .gitignore
│   └── package.json
├── docs/
└── package.json
```

## Run locally

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and the API runs at `http://localhost:4000`.

## Current slice

The first vertical slice includes the responsive workspace dashboard, task filtering, quick task creation, deadline summary, recent messages, and the study assistant entry point. The API currently exposes `/api/health` and a demo workspace endpoint.

MongoDB, authentication, workspace persistence, and domain modules will be added incrementally according to the MVP roadmap in `docs/nexus-study-product-spec.md`.
