# Repository Guidelines

## Project Structure & Module Organization
This Next.js 15 + TypeScript app follows the App Router in `src/app`, where pages, server actions, and API routes live (see `route.ts` for the PDF-to-description endpoint). Shared UI is under `src/components`, reusable hooks in `src/hooks`, domain utilities in `src/lib`, and data contracts in `src/types`. Static assets and marketing media sit in `public/` and `images/`, while Prisma models are defined in `prisma/schema.prisma` and synced to Postgres at deploy time.

## Build, Test, and Development Commands
Use `npm run dev` to start the local server with Turbopack, and `npm run build` for production builds. `npm run start` runs the compiled app, while `npm run lint` executes the Next.js ESLint bundle. Run `npm run generate` whenever Prisma schema changes so the TypeScript client stays in sync.

## Coding Style & Naming Conventions
Maintain strict TypeScript (`tsconfig.json` enables `strict`) and prefer functional React components. Indent with two spaces, keep JSX compact, and rely on Tailwind utility classes for styling. Import shared code via the `@/` alias root, and ensure API handlers and lib files export async functions with descriptive camelCase names. Run ESLint before opening a PR; add ad-hoc comments only where context is non-obvious.

## Testing Guidelines
Automated tests are not yet configured; document manual verification steps in PRs and consider Playwright or React Testing Library for new coverage. When introducing test suites, place them alongside the feature with a `.test.ts[x]` suffix and ensure they can be run through a single npm script.

## Commit & Pull Request Guidelines
Keep commits focused and present-tense, mirroring the existing mix of English/Japanese summaries (e.g., `動画機能を追加`, `Update: add video generation API`). Reference issue IDs in the subject when available and avoid bundling unrelated refactors. For PRs, include: 1) a concise problem/solution overview, 2) key screenshots or screen recordings for UI changes, 3) any environment or schema migrations, and 4) instructions to reproduce or test. Tag reviewers familiar with the impacted modules.

## Security & Configuration Tips
Store secrets (`GEMINI_API_KEY`, `DATABASE_URL`, `DIRECT_URL`) in local `.env` files and Vercel environment variables; never commit them. Validate Prisma migrations against a disposable database before promoting, and scrub uploaded PDFs in logs to prevent leaking customer data.
