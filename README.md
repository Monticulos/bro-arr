# BroArr

A local events aggregator for Brønnøysund, Norway. A LangChain + Mistral AI collector gathers upcoming events from local websites and publishes them as a React frontend on GitHub Pages.

---

## Tech stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, TypeScript, Vite, Digdir Designsystemet |
| Collector | LangChain, Mistral AI, Puppeteer, Cheerio |
| Testing | Vitest, React Testing Library |
| CI/CD | GitHub Actions, GitHub Pages |

---

## Repo structure

```
broarr/
├── types/                    # Shared TypeScript interfaces
├── web/                      # React + Vite frontend (deployed to GitHub Pages)
│   ├── public/data/
│   │   └── events.json       # Generated event data consumed by the frontend
│   └── src/
│       ├── components/
│       ├── hooks/
│       └── utils/
├── collector/                # Node.js collection script
│   └── src/
│       ├── script.ts         # Entry point — orchestrates the collection pipeline
│       ├── sources.ts        # Target URLs with optional CSS selectors
│       ├── prompts/          # Markdown prompts for LLM calls
│       ├── api/              # Apify API integration
│       ├── llm/              # LLM formatting and categorization
│       └── tools/            # File I/O and event utilities
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

## Collector error handling

Individual source failures (collecting or LLM formatting) are logged as warnings and skipped — collection continues with remaining sources. The run throws at the end if either the manual collecting or Apify pipeline produced zero events, preventing an empty `events.json` from being published.

---
