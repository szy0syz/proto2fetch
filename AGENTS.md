# Repository Guidelines

## Project Structure & Module Organization
- `src/` TypeScript source.
  - `src/generator/` protobuf parser, type and client code generators.
  - `src/runtime/` HTTP client, auth, and error helpers.
  - `src/cli.ts` CLI entry; `src/index.ts` public API surface.
- `tests/` Vitest specs and fixtures (see `tests/fixtures/proto/`).
- `examples/` Usage samples and `proto2fetch.config.js`.
- `docs/` VitePress site; `docs/.vitepress/` config.
- `dist/` Build output (generated). Do not edit by hand.

## Build, Test, and Development Commands
- `pnpm i` Install (pnpm is required; see `preinstall`).
- `pnpm dev` Rollup watch build for local development.
- `pnpm build` Clean and build to `dist/`.
- `pnpm type-check` TypeScript project checks.
- `pnpm lint` / `pnpm lint:fix` Lint code, optionally auto-fix.
- `pnpm test` Run Vitest; `pnpm test:coverage` with coverage; `pnpm test:ui` UI runner.
- Docs: `pnpm docs:dev`, `pnpm docs:build`, `pnpm docs:preview`.
- CLI (local): `pnpm build && node dist/cli.cjs --help` (e.g., `node dist/cli.cjs -c examples/proto2fetch.config.js`).

## Coding Style & Naming Conventions
- Language: TypeScript (ESM, strict mode). Indent 2 spaces.
- Filenames: kebab-case (`client-generator.ts`); Types/Interfaces: PascalCase; functions/vars: camelCase.
- Prefer `const`, avoid `var`; keep functions small and typed.
- Unused params/vars must be prefixed with `_` to satisfy ESLint.

## Testing Guidelines
- Framework: Vitest (Node env). Place tests under `tests/` as `*.test.ts` (or `*.spec.ts`).
- Use clear `describe/it` blocks; keep fixtures in `tests/fixtures/`.
- Run `pnpm test:coverage` before PRs; avoid coverage regressions for touched areas.

## Commit & Pull Request Guidelines
- Commit style: Prefer Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`). Keep subject imperative and concise.
- PRs must include: problem/solution summary, linked issues, tests for new behavior, and docs updates if CLI/runtime changes.
- Before opening a PR: `pnpm type-check && pnpm lint && pnpm test` should pass.

## Environment & Notes
- Engines: Node >= 16, pnpm >= 8. Do not commit `dist/` or coverage artifacts.
- Architecture: generator parses `.proto` files to produce a ky-based client; runtime hosts shared HTTP/auth utilities.
