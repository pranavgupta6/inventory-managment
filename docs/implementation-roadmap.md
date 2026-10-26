# Implementation Roadmap

## Phase 1 — Foundation (Current)

**Goal**: Establish a sound, verifiable monorepo with working frontend shell and backend skeleton.

### Deliverables
- [x] npm workspaces monorepo with root scripts
- [x] Express backend with Helmet, CORS, rate limiting, structured logging
- [x] Zod-based environment validation (startup fails clearly on bad config)
- [x] Lark SDK client factory (singleton, provider-aware, lazy initialization)
- [x] `IBitableRepository` interface + `LarkBitableRepository` production implementation
- [x] `/api/health`, `/api/integration-status`, `/api/config-info` endpoints
- [x] React + Vite + Tailwind + shadcn/ui design-token CSS
- [x] Sidebar navigation + TopBar layout
- [x] Overview page with integration status panel (no fabricated data)
- [x] Placeholder pages for all planned routes
- [x] Unit and integration tests (env schema, health endpoints)
- [x] TypeScript strict mode — both workspaces
- [x] Documentation: architecture, roadmap, Lark integration, README

### Acceptance Criteria
- `npm run typecheck` passes
- `npm run test` passes
- `npm run build` produces artifacts
- Application shell loads without Lark credentials
- `/api/health` responds `{ status: "ok" }`
- `/api/integration-status` shows `not_configured` when `.env` is empty

---

## Phase 2 — Inventory Core (Next)

**Dependencies**: Phase 1 complete. Lark credentials configured. Bitable tables created.

### Deliverables
- [ ] Create Bitable tables: Inventory, Employees, Assignments, Requests
- [ ] Sync Lark employee data via Contacts API
- [ ] CRUD API for inventory items (`/api/inventory`)
- [ ] Inventory list page with server-side pagination and search
- [ ] Inventory detail page
- [ ] Add / edit / delete inventory item forms (React Hook Form + Zod)
- [ ] Assignment workflow (assign item to employee, record return)
- [ ] Equipment request submission

### Acceptance Criteria
- Inventory items stored and retrieved from Bitable
- Pagination uses `page_token` — no unlimited fetches
- CRUD operations are correctly authorized
- Forms validate with Zod before submission

---

## Phase 3 — Organization Sync & RBAC

**Dependencies**: Phase 2 complete.

### Deliverables
- [ ] Lark OAuth login flow (user_access_token)
- [ ] Role-based access control middleware (`admin`, `manager`, `employee`, `viewer`)
- [ ] Employee page (synced from Lark Contacts API)
- [ ] Manual sync trigger endpoint + UI
- [ ] Audit history table in Bitable

---

## Phase 4 — Requests, Approvals & Notifications

**Dependencies**: Phase 3 complete.

### Deliverables
- [ ] Equipment request approval workflow
- [ ] Manager approval / rejection interface
- [ ] Lark bot notification on status change (via Lark IM API)
- [ ] Request history and filtering

---

## Phase 5 — Reports & Analytics

**Dependencies**: Phase 4 complete.

### Deliverables
- [ ] Dashboard analytics (items by status, category, department)
- [ ] Assignment duration reporting
- [ ] CSV / Excel export
- [ ] Audit log viewer with filters

---

## Intentionally Deferred

| Feature | Reason |
|---|---|
| Real-time updates (WebSockets / SSE) | Complexity; polling sufficient for Phase 1-2 |
| Offline mode | Not required for enterprise SaaS |
| Multi-tenancy | Single-organization scope |
| Mobile native app | Web-responsive covers the requirement |
| External database (PostgreSQL etc.) | Bitable is the designated store |
