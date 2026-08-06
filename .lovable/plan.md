# Next.js migration: not possible — equivalent hardening instead

Next.js is not supported on this platform. Only Vite-based stacks run here, and this project is already on TanStack Start, the supported full-stack React framework. Rather than a migration, the plan below delivers the outcomes the request was after on the current stack.

## What you already have (no work needed)
- File-based routing in `src/routes/` — same convention as the App Router's file mapping.
- SSR with a root shell (`src/routes/__root.tsx`) — the equivalent of `app/layout.tsx`.
- Per-route metadata via `head()` — the equivalent of `export const metadata`.
- Tailwind, shadcn/ui, Zustand, react-hook-form + zod all working.
- Server/client split: route modules render on the server; only components touching browser APIs are client-side.

## What this plan does

1. Server-side API layer for future AI integration
   - Add `src/lib/ai.functions.ts` with a typed server function (`createServerFn`) as the single entry point for AI extraction calls — the equivalent of a Next.js route handler / server action.
   - Keep the existing `src/services/aiService.ts` placeholder as the client-facing interface, wired to call the server function instead of running in the browser.
   - Secrets stay server-side; nothing sensitive reaches the client bundle.

2. Server/client boundary audit
   - Confirm browser-only work (pdf.js parsing, theme application, localStorage-backed Zustand stores) stays out of server evaluation, so pages render on the server cleanly.

3. Verification
   - Run the production build and the linter, and fix anything they surface, so dev, build and lint are all clean.

## Technical notes
- `createServerFn` from `@tanstack/react-start` is the RPC mechanism; `src/routes/api/*` is reserved for raw HTTP endpoints (webhooks, external callers) if you later need them.
- No folder reorganisation: `src/routes`, `src/components`, `src/features`, `src/store`, `src/services`, `src/lib` all stay as they are.
- No UI, styling or state-management changes.
