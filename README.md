# BroArr

A local events aggregator for Brønnøysund, Norway. A LangChain + Mistral AI collector gathers upcoming events from local websites and publishes them as a React frontend on GitHub Pages.

---

## Tech stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, TypeScript, Vite, Digdir Designsystemet |
| Collector | LangChain, LangGraph, Mistral AI, Puppeteer, Cheerio |
| Testing | Vitest, React Testing Library |
| CI/CD | GitHub Actions, GitHub Pages |

---

## Repo structure

```
broarr/
├── types/
│   └── Event.ts              # Shared Event + EventsData TypeScript interfaces
├── web/                      # React + Vite frontend (deployed to GitHub Pages)
│   ├── public/data/
│   │   └── events.json       # Generated event data consumed by the frontend
│   └── src/
│       ├── App.tsx
│       └── components/
│           ├── EventList.tsx
│           ├── EventCard.tsx
│           ├── Header.tsx
│           ├── Footer.tsx
│           ├── Search.tsx
│           ├── CategoryBadge.tsx
│           └── CategoryFilter.tsx
├── collector/                # Node.js collection script
│   ├── src/
│   │   ├── script.ts         # Entry point — orchestrates the collection pipeline
│   │   ├── sources.ts        # Target URLs with optional CSS selectors
│   │   ├── prompts/          # Markdown prompts for LLM calls
│   │   └── tools/
│   │       ├── extractEvents.ts
│   │       ├── formatEvents.ts
│   │       ├── writeEvents.ts
│   │       ├── sortEvents.ts
│   │       ├── deleteExpiredEvents.ts
│   │       ├── deleteSavedEvents.ts
│   │       └── editorAgent.ts
└── .github/workflows/
    └── deploy.yml            # GitHub Actions: build + deploy on push to main
```

---

## Running the frontend locally

```bash
cd web
npm install
npm run dev
```

The site is served at `http://localhost:5173`.

---

## Running the collector

```bash
cd collector
cp .env.example .env   # add your MISTRAL_API_KEY
npx tsx src/script.ts  # collect all sources and update events.json
```

---

## Deployment

Push to `main` — GitHub Actions builds the Vite app and deploys it to GitHub Pages automatically. The live site URL is shown in the repository's **Environments** tab.
