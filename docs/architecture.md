# Architecture — Inventory Management System

## Overview

The Inventory Management System is a TypeScript-first monorepo consisting of a React frontend and an Express backend. Lark/Feishu Bitable serves as the sole persistent data store.

---

## Technology Choices

| Layer | Choice | Rationale |
|---|---|---|
| Frontend framework | React 18 + Vite | Fast HMR, broad ecosystem, TSX |
| Styling | Tailwind CSS + shadcn/ui | Design-token system, accessible Radix primitives |
| Server state | TanStack Query v5 | Declarative caching, optimistic updates, devtools |
| Routing | React Router v6 | Stable, data-router capable |
| Forms | React Hook Form + Zod | Performant validation without re-renders |
| Backend | Node.js + Express | Simple, well-documented, wide hosting support |
| Lark integration | @larksuiteoapi/node-sdk | Official SDK — avoids reinventing auth/token management |
| Validation | Zod | Single schema definition for types + runtime checks |
| Testing | Vitest | Fast, ESM-native, compatible with Vite |

---

## Monorepo Structure

```
Inventory/
  package.json          ← npm workspaces root
  .env.example          ← credential template (no real values)
  .gitignore
  docs/
  frontend/             ← @inventory/frontend
  backend/              ← @inventory/backend
```

---

## Frontend Architecture

### Boundaries

- **Presentation components** (`components/`) render UI; they receive data as props.
- **Feature modules** (`features/`) compose components and call hooks.
- **Hooks** (`hooks/`) wrap TanStack Query `useQuery` / `useMutation`.
- **API client** (`lib/api-client.ts`) is the only file that calls `fetch`.
- **Types** (`types/`) mirror backend response shapes.

No component calls `fetch` directly. No component knows about Lark APIs.

### State Management Strategy

- **Server state**: TanStack Query (caching, background refresh, pagination).
- **Local UI state**: React `useState` / `useReducer`.
- No global client-side state library is added — none is needed at this stage.

---

## Backend Architecture

```
src/
  config/         ← env.ts (Zod), lark-client.ts (singleton SDK)
  middleware/     ← error-handler.ts, validate.ts
  modules/
    health/       ← health.controller.ts, health.routes.ts
  repositories/
    bitable/      ← IBitableRepository, LarkBitableRepository
  services/
    lark/         ← connectivity.service.ts
  schemas/        ← common Zod schemas
  types/          ← shared TypeScript types
  app.ts          ← Express factory
  server.ts       ← entry point, graceful shutdown
```

### Layering Rules

| Layer | Responsibility |
|---|---|
| Routes | Map HTTP verbs/paths to controllers |
| Controllers | Parse request, call service, return ApiResponse |
| Services | Business rules; orchestrate repositories |
| Repositories | All Bitable SDK calls; map SDK types to domain types |
| Config | Env parsing, SDK client factory |
| Middleware | Cross-cutting: error handling, validation, logging |

Controllers must not import from repositories directly.
Repositories must not implement business logic.

---

## Bitable Data Access Strategy

1. **Single repository interface** (`IBitableRepository`) defines all allowed operations.
2. **`LarkBitableRepository`** is the production implementation — it wraps `@larksuiteoapi/node-sdk`.
3. Pagination is always handled server-side via the `page_token` parameter.
4. Records are never fetched in bulk to be filtered in memory.
5. Create operations are never retried automatically.
6. The `app_token` and `table_id` values live only in the backend environment — never sent to the browser.

---

## Organization and Permission Model

### Current State (Phase 1)

- No end-user authentication is implemented.
- No role-based access control is enforced.
- The backend health endpoints are publicly accessible (intended for monitoring).

### Planned Model (Phase 2+)

- End users authenticate via Lark OAuth (user_access_token).
- The backend maps Lark user identity to application roles.
- Roles: `admin`, `manager`, `employee`, `viewer`.
- Role-based middleware gates all resource endpoints.
- The Lark service account (app_access_token) is used only for Bitable operations.

---

## Security Boundaries

- `.env` is never committed; `.env.example` contains only placeholder strings.
- App ID, App Secret, Base token, and table IDs are server-side only.
- The frontend never receives raw Lark credentials.
- CORS is restricted to the configured `CORS_ORIGINS`.
- Helmet adds standard security headers.
- Rate limiting protects `/api/*` routes.
- Error responses in production strip internal stack traces.
