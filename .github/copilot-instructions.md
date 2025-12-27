<!-- Copilot instructions for OMS Admin repo -->
# Copilot Usage Guide — oms-admin

Purpose: short, actionable notes so AI coding agents are productive immediately in this repo.

1) Big picture
- This is a Next.js (app-router) admin dashboard + agent endpoint. Core flow:
  - Frontend UI (app + components) under `src/app` and `src/components`.
  - Server API / agent orchestrator: `src/app/api/agent/md/route.ts` — main AI orchestration entry.
  - AI tools and integrations: `src/lib/ai/tools.ts` (calls Supabase RPCs and saves memories).
  - Supabase client & helpers: `src/lib/supabase.ts`, `src/utils/supabase/server.ts`, `src/utils/supabase/client.ts`.
  - Long-term agent memory: database table created in `supabase/migrations/20251214_create_agent_rpcs.sql` (`agent_memory_bank`).

2) Developer workflows (commands)
- Run locally: `npm run dev` (runs `next dev --webpack`).
- Build: `npm run build` ; Start prod server: `npm run start`.
- Lint: `npm run lint`.
- Environment: set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and your OpenAI/AI provider key(s) (see `Using GPT-5.md` for examples using `$OPENAI_API_KEY`).

3) Project-specific conventions
- App router & app routes: use `src/app` (server components + API routes). Edit routing code with app-router patterns.
- Supabase usage:
  - Server-side helpers use `src/utils/supabase/server.ts` and call `createClient()` for RPCs.
  - Client code uses `src/utils/supabase/client.ts` and `NEXT_PUBLIC_*` env vars.
- Agent/tooling conventions:
  - Tools (business logic + data) live in `src/lib/ai/tools.ts`. Those tools call Supabase RPCs named like `op_sales_trend`, `op_inventory_check`, `op_promotion_history` and write to `agent_memory_bank`.
  - The orchestrator in `src/app/api/agent/md/route.ts` uses the `ai` / `@ai-sdk/*` libraries and must NOT return unverified facts — tools are used to verify external data.

4) Integration and deployment notes
- Uses Supabase (DB + Auth). Migrations live under `supabase/migrations`.
- Next.js version: 16 (check `package.json`); keep server code compatible with that runtime.
- AI SDKs: project uses `@ai-sdk/openai` / `ai` packages — prefer existing helpers in `src/lib/ai` when modifying models or providers.

5) Typical tasks & quick examples for Copilot
- Add a new agent tool: follow `src/lib/ai/tools.ts` pattern — expose a `tool({ description, parameters, execute })` that calls `createClient()` and uses an RPC or inserts into `agent_memory_bank`.
- Change the agent orchestration: modify `src/app/api/agent/md/route.ts`. Keep system prompt style and tool usage intact; preserve the workflow comments (Understand → Investigate → Synthesize).
- Fix Supabase auth/keys: check `src/lib/supabase.ts` and `src/utils/supabase/*` for env usage before changing variable names.

6) What not to change without human review
- Database schema/migrations in `supabase/migrations/*` (run migrations and coordinate with DB).
- Changing RPC function names used by tools (search for `supabase.rpc('op_` to find usages).

7) Helpful file pointers (examples)
- Orchestrator: `src/app/api/agent/md/route.ts`
- Tools: `src/lib/ai/tools.ts`
- Supabase client: `src/lib/supabase.ts`
- Server client helper: `src/utils/supabase/server.ts`
- Frontend chat using agent: `src/components/strategy/StrategyChat.tsx` (posts to `/api/agent/md`)

If anything above is unclear or you want more examples (prompts, tests, or a repair checklist for agent tool-call failures), tell me which section to expand.
