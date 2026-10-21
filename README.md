# Inventory Management System

A production-oriented, TypeScript-first Inventory Management System backed by **Lark / Feishu Bitable** as its primary persistent data store.

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | `>= 18.0.0` |
| npm | `>= 9.0.0` |
| Lark / Feishu account | Required for production integration |

## Installation

Run the following commands from the `Inventory/` project root:

```powershell
npm install
```

This installs dependencies for the root, backend, and frontend workspaces in a single command.

## Environment Setup

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

Configure `.env` with your Lark / Feishu application credentials and Bitable details:

```env
# Lark / Feishu provider
LARK_PROVIDER=lark
LARK_APP_ID=cli_xxxxxx
LARK_APP_SECRET=xxxxxxxx
LARK_BITABLE_APP_TOKEN=your_bitable_app_token

# Bitable table IDs (configure as tables are created)
LARK_TABLE_INVENTORY=
LARK_TABLE_EMPLOYEES=
LARK_TABLE_DEPARTMENTS=
LARK_TABLE_ASSIGNMENTS=
LARK_TABLE_REQUESTS=

# Application configuration
NODE_ENV=development
PORT=3001
CORS_ORIGINS=http://localhost:5173
```

**Configuration notes:**

- Set `LARK_PROVIDER` to `lark` for the international platform or `feishu` for the China platform.
- Obtain the application ID and secret from the appropriate developer console.
- Obtain the Bitable app token from your Bitable Base URL.
- Configure table IDs as the corresponding tables become available.
- Never commit `.env` or real credentials to version control.

> **Credential-free startup:** The application can run without Lark credentials. The frontend shell and health endpoint remain available in an unconfigured state, and the integration status endpoint reports `not_configured`.

## Development

Start both the frontend and backend with hot reload:

```powershell
npm run dev
```

Or run each workspace independently.

**Backend** — `http://localhost:3001`

```powershell
npm run dev -w backend
```

**Frontend** — `http://localhost:5173`

```powershell
npm run dev -w frontend
```

## Quality Checks

Run the following commands from the project root.

### Type Checking

```powershell
npm run typecheck
```

### Linting

```powershell
npm run lint
```

### Tests

```powershell
npm run test
```

These commands run the configured checks across the workspaces.

## Production Build

Build the backend and frontend:

```powershell
npm run build
```

Build output:

| Workspace | Output directory |
|---|---|
| Backend | `backend/dist/` |
| Frontend | `frontend/dist/` |

## API Reference

The backend exposes the following REST API endpoints.

Base URL: `http://localhost:3001`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness probe |
| `GET` | `/api/integration-status` | Check Lark / Feishu connectivity status |
| `GET` | `/api/config-info` | Retrieve a safe configuration summary without credentials |
| `GET` | `/api/inventory` | Retrieve a paginated inventory list with search and filters |
| `GET` | `/api/inventory/:id` | Retrieve a single device |
| `POST` | `/api/inventory` | Create a device |
| `PATCH` | `/api/inventory/:id` | Update a device |
| `DELETE` | `/api/inventory/:id` | Deactivate a device using a soft delete |

### Verify the API

After starting the backend, check its health and integration status:

```powershell
Invoke-RestMethod http://localhost:3001/api/health
Invoke-RestMethod http://localhost:3001/api/integration-status
Invoke-RestMethod http://localhost:3001/api/inventory
```

The inventory API requires a configured `LARK_TABLE_INVENTORY` table and appropriate Bitable access.

## Lark / Feishu Integration

For complete integration instructions, see [`docs/lark-integration.md`](docs/lark-integration.md).

The guide covers:

- Application registration in the Lark / Feishu developer console
- Required API permission scopes
- Bitable Base and table configuration
- Sharing the Base with the application bot
- Environment variable configuration
- Connectivity verification and troubleshooting

### Access and Permissions

If `/api/integration-status` reports an authorization or resource error:

1. Verify that the application credentials and Bitable app token are correct.
2. Confirm that the required API scopes have been granted.
3. Open the Bitable Base's sharing dialog and share the Base with the application bot.
4. Confirm that the application is installed in the workspace and added as a collaborator where required.
5. Verify that the configured table IDs refer to existing tables.

> **Important:** Granting API scopes alone does not grant access to a particular Bitable Base. Do not create duplicate tables to work around an access error.

## Inventory Data Model

The inventory API expects `LARK_TABLE_INVENTORY` to reference an existing Bitable table.

### Business Fields

| Field | Description |
|---|---|
| `Brand` | Device brand; restricted to documented dropdown options |
| `Device Model` | Device model |
| `Sample/HW` | Sample or hardware type; restricted to documented dropdown options |
| `IMEI1` | Primary IMEI; stored as text and validated as 15 digits |
| `IMEI2` | Secondary IMEI; stored as text and validated as 15 digits |
| `Serial Number` | Device serial number |
| `VC ID` | VC identifier |
| `Color` | Device color |
| `Storage / RAM` | Storage and memory configuration |
| `Assigned Date` | Assignment date |
| `Warehouse/Location` | Device warehouse or location |
| `Inventory Holder` | Current inventory holder |
| `Remarks` | Additional notes |
| `Status` | Device status |

The application also uses the technical field `item_id` to preserve the public application identifier separately from Lark's internal Bitable `record_id`.

### Identifier Handling

The public API uses `item_id` to identify inventory devices.

Before retrieving, updating, or deactivating a device, the backend resolves `item_id` to the corresponding internal Bitable `record_id`. These identifiers are distinct and must not be treated as interchangeable.

### Validation and Deactivation

- **IMEI validation:** IMEI values are stored as text and must contain exactly 15 digits.
- **Duplicate IMEI checks:** The backend paginates through all records and compares IMEI values.
- **Dropdown validation:** `Brand` and `Sample/HW` are restricted to documented options.
- **Allocation state:** `Status` is `Inactive` for available inventory and `Active` for assigned inventory. Assignment and return operations keep the inventory and assignment tables synchronized. Every `Active` inventory device must have one `Active` assignment; returned assignments remain as history and their inventory device is set back to `Inactive`.
- **Frontend labels:** `Sample/HW` is displayed as **Sample / HW Type**, and `Warehouse/Location` as **Warehouse / Location**.

> **Concurrency note:** Duplicate IMEI checks are read-before-write operations, not transactional database constraints. Concurrent requests may still create duplicates unless writes are serialized or uniqueness is enforced upstream.

## Project Structure

```text
Inventory/
├── package.json
├── .env.example
├── docs/
│   ├── architecture.md
│   ├── implementation-roadmap.md
│   └── lark-integration.md
├── backend/
│   └── src/
│       ├── config/             # Environment validation and Lark SDK factory
│       ├── middleware/         # Error handling and request validation
│       ├── modules/
│       │   └── health/         # Health and integration status endpoints
│       ├── repositories/       # Bitable repository interfaces and implementation
│       ├── services/
│       │   └── lark/           # Lark connectivity services
│       ├── schemas/            # Zod request schemas
│       ├── types/              # Shared backend TypeScript types
│       ├── app.ts              # Express application factory
│       └── server.ts           # Backend entry point
└── frontend/
    └── src/
        ├── components/         # Reusable UI and layout components
        ├── features/           # Page-level feature modules
        ├── hooks/              # TanStack Query hooks
        ├── lib/                # API client and utilities
        ├── routes/             # React Router configuration
        └── types/              # Frontend TypeScript types
```

## Current Limitations

The following items should be addressed before production deployment.

- **Authentication and authorization:** Authentication is not implemented. All API routes are currently unprotected. Complete Phase 3, including Lark OAuth and role-based access control (RBAC), before exposing the application to users.
- **Live inventory data:** Real inventory data is unavailable until the Bitable tables are created, configured, and shared with the application.
- **Organization synchronization:** Employee and department synchronization through the Lark Contacts API is planned for Phase 3.
- **End-to-end integration testing:** Live Bitable connectivity has not yet been verified end to end. Valid credentials, table configuration, and access permissions are required.
- **Filtering and aggregation:** List filtering and device aggregates currently read Bitable pages in the service layer.
- **Atomicity and uniqueness:** The current implementation does not guarantee atomic device updates or transactional uniqueness constraints.

## Recommended Next Steps

Once the Lark credentials are configured and `/api/integration-status` reports `connected`, proceed with Phase 2 of the implementation roadmap.

1. **Configure the Inventory Bitable table.** Create the table with the required fields, configure `LARK_TABLE_INVENTORY`, and verify connectivity.
2. **Validate inventory CRUD operations.** Test device creation, listing, detail retrieval, updates, IMEI validation, and soft deletion.
3. **Implement the assignment workflow.** Extend the system to manage device assignments and related inventory operations.
4. **Complete production security.** Implement authentication, authorization, and RBAC before deployment.

See [`docs/implementation-roadmap.md`](docs/implementation-roadmap.md) for the planned implementation phases.

---
