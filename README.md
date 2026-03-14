# BroArr

A local events aggregator for Brønnøysund, Norway. A LangChain + Mistral AI collector gathers upcoming events from local websites and publishes them as a React frontend on GitHub Pages.

## Tech stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, TypeScript, Vite, Digdir Designsystemet |
| Collector | LangChain, Mistral AI, Puppeteer, Cheerio |
| Testing | Vitest, React Testing Library |
| CI/CD | GitHub Actions, GitHub Pages |

## Repo structure

```
broarr/
├── types/                    # Shared TypeScript interfaces
├── web/                      # React + Vite frontend (deployed to GitHub Pages)
│   ├── public/data/
│   │   └── events.json       # Generated event data consumed by the frontend
│   └── src/
│       ├── components/
│       ├── constants/
│       ├── hooks/
│       └── utils/
├── collector/                # Node.js collection script
│   └── src/
│       ├── script.ts         # Entry point — orchestrates the collection pipeline
│       ├── sources.ts        # Target URLs with optional CSS selectors
│       ├── prompts/          # Markdown prompts for LLM calls
│       ├── api/              # Apify API integration
│       ├── io/               # File I/O (events.json, sitemap)
│       ├── llm/              # LLM formatting and categorization
│       ├── test/             # Shared test helpers
│       └── utils/            # Pure functions
└── .github/workflows/
    ├── collect.yml           # GitHub Actions: run collector nightly and on demand
    ├── deploy.yml            # GitHub Actions: build + deploy after lint-test passes on main
    └── lint-test.yml         # GitHub Actions: lint, typecheck and test on push and pull requests
```

## Running the frontend locally

```bash
npm run setup
npm run web
```

The site is served at `http://localhost:5173`.

## Running the collector

```bash
cp collector/.env.example collector/.env   # add your api keys
npm run setup
npm run collector
```
