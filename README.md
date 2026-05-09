# BroArr

A local events aggregator for Brønnøysund, Norway.

## Tech stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, TypeScript, Vite, Digdir Designsystemet, Web3Forms |
| Collector | LangChain, Mistral, Puppeteer, Cheerio, Apify |
| Testing | Vitest, React Testing Library |
| CI/CD | GitHub Actions, GitHub Pages |

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
