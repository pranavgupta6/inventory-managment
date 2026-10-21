# Lark / Feishu Integration Guide

## Overview

This system integrates with the **Lark Open Platform** (international) or **Feishu Open Platform** (China mainland) using the official `@larksuiteoapi/node-sdk`.

All API calls are made from the **backend only**. The frontend never communicates with Lark APIs directly.

---

## Platform Selection

| Platform | Domain | Use case |
|---|---|---|
| Lark | `https://open.larksuite.com` | Organizations outside China mainland |
| Feishu | `https://open.feishu.cn` | China mainland organizations |

Set `LARK_PROVIDER=lark` or `LARK_PROVIDER=feishu` in `.env`. The SDK maps this to the correct base URL automatically via `lark.Domain.Lark` or `lark.Domain.Feishu`.

---

## App Registration

### Step 1 — Create a self-built app

1. Open the developer console:
   - Lark: https://open.larksuite.com/app
   - Feishu: https://open.feishu.cn/app
2. Click **Create App** → **Custom App** (self-built, not marketplace).
3. Enter a name and description.
4. On the **Credentials & Basic Info** page, copy:
   - **App ID** → `LARK_APP_ID`
   - **App Secret** → `LARK_APP_SECRET`

### Step 2 — Configure permissions

On the **Permissions & Scopes** page, add the following permissions:

**Bitable (required)**
- `bitable:app` — Read and write Bitable app data
- `bitable:app:readonly` — (optional, for read-only access)

**Contacts (required for Phase 3)**
- `contact:user.base:readonly` — Read user basic information
- `contact:department.base:readonly` — Read department structure

> ⚠ After adding permissions, click **Publish** or **Apply** to request approval from your organization administrator if required.

### Step 3 — Install to workspace

On the **Bot** or **App Management** page:
1. Click **Install to Workspace** (or request admin installation).
2. Copy the **Tenant Access Token** — the SDK manages this automatically using your App ID and Secret.

---

## Bitable Base Setup

### Step 4 — Create a Bitable Base

1. In Lark/Feishu, create a new **Bitable (Base)** document.
2. Open the Base. The URL will contain:
   ```
   https://[domain]/base/<APP_TOKEN>/...
   ```
3. Copy `<APP_TOKEN>` → `LARK_BITABLE_APP_TOKEN`.

### Step 5 — Share the Base with the app

The self-built app must have access to the Base:
1. In the Base, click **Share**.
2. Add your app's bot as a **collaborator** with editor access.
   - Search for the bot by the app name you registered.
   - If the app is not listed, API scopes do not provide Base access by
     themselves. Confirm the app is enabled, published, installed in the
     workspace, and that the Base owner/admin allows custom apps. Ask the
     workspace administrator to add the bot or install the app before testing.

### Step 6 — Create tables and copy table IDs

Create the following tables inside the Base:

| Table | Purpose | Env var |
|---|---|---|
| Inventory | Equipment items | `LARK_TABLE_INVENTORY` |
| Employees | Synced employee records | `LARK_TABLE_EMPLOYEES` |
| Departments | Synced department records | `LARK_TABLE_DEPARTMENTS` |
| Assignments | Equipment assignments | `LARK_TABLE_ASSIGNMENTS` |
| Requests | Equipment requests | `LARK_TABLE_REQUESTS` |

To get a Table ID: open the table and look at the URL:
```
…/base/<APP_TOKEN>?table=<TABLE_ID>&view=…
```

---

## Environment Variables

```bash
LARK_PROVIDER=lark              # "lark" or "feishu"
LARK_APP_ID=cli_xxxxxxxx        # From developer console
LARK_APP_SECRET=xxxxxxxxxx      # From developer console
LARK_BITABLE_APP_TOKEN=...      # From Bitable URL
LARK_TABLE_INVENTORY=tbl...     # Table ID (optional at startup)
LARK_TABLE_EMPLOYEES=tbl...
LARK_TABLE_DEPARTMENTS=tbl...
LARK_TABLE_ASSIGNMENTS=tbl...
LARK_TABLE_REQUESTS=tbl...
```

---

## SDK Initialization

```typescript
import * as lark from '@larksuiteoapi/node-sdk';

const client = new lark.Client({
  appId: env.LARK_APP_ID,
  appSecret: env.LARK_APP_SECRET,
  appType: lark.AppType.SelfBuild,   // Not an ISV/marketplace app
  domain: lark.Domain.Lark,          // or lark.Domain.Feishu
});
```

The SDK automatically:
- Fetches and caches `app_access_token` / `tenant_access_token`.
- Refreshes tokens before expiry.
- Handles retries for transient token errors.

> **Do not log `appSecret` or any access tokens.** The SDK's internal token management is sufficient.

---

## Authentication Flow

```
App starts
  └─ SDK reads appId + appSecret from env
  └─ First API call triggers tenant token acquisition
  └─ SDK caches token, refreshes automatically
  └─ All subsequent calls include Bearer token in Authorization header
```

This application uses the SDK's **tenant access token** flow for Bitable
operations (service-to-service). It is acquired from
`POST /open-apis/auth/v3/tenant_access_token/internal` and cached by the SDK.
User identity (OAuth) is planned for Phase 3.

---

## Bitable API Patterns

### List records with pagination

```typescript
// Always use page_size and page_token — never omit them
const response = await client.bitable.appTableRecord.list({
  path: { app_token: 'BASE_TOKEN', table_id: 'TABLE_ID' },
  params: {
    page_size: 50,           // max 500
    page_token: previousToken, // undefined for first page
  },
});

const { items, has_more, page_token, total } = response.data ?? {};
```

## Device inventory field schema

The device inventory feature uses an existing table and never creates or renames
fields automatically. Configure these business fields before setting
`LARK_TABLE_INVENTORY`:

| Field | Suggested Bitable type |
|---|---|
| `Brand` | Single select: `Itel`, `Tecno`, `Infinix`, `Oraimo`, `Villaon`, `Other` |
| `Device Model`, `IMEI1`, `IMEI2`, `Serial Number`, `VC ID`, `Color`, `Storage / RAM`, `Warehouse/Location`, `Inventory Holder`, `Remarks` | Text |
| `Status` | Text: `Inactive` for available inventory, `Active` for assigned inventory |
| `Sample/HW` | Single select: `PRO`, `PRO-1`, `PR1`, `PR1-1`, `PR2`, `PIR`, `MPR` |
| `Assigned Date` | Date |
| `item_id` | Technical text field used for the public application identifier |

The user-facing labels `Sample / HW Type` and `Warehouse / Location` map to the
literal Lark column names `Sample/HW` and `Warehouse/Location`. The device
inventory API reads and maps only these configured fields. Missing fields
are surfaced by Lark as a safe API error and must be added manually by a Base
owner; the application does not modify live schemas. Verify the table and its
fields in the Base UI before enabling CRUD.

Lark Date fields are returned as Unix timestamps in milliseconds. The backend
converts them to `YYYY-MM-DD` for the API/frontend and converts that format back
to a millisecond timestamp when creating or updating a record. Brand, Sample/HW,
and Status are sent as their configured single-select option text values.

### Assignment synchronization

The application treats assignment records as the source of allocation history and
keeps the current allocation state mirrored in inventory:

- Creating an assignment requires an `Inactive` inventory device, changes that
  device to `Active`, and creates one `Active` assignment.
- Returning an assignment changes it to `Returned` and changes the linked
  inventory device back to `Inactive`.
- Direct status changes that would leave an `Active` inventory device without an
  active assignment, or would hide an active assignment, are rejected.
- Returned assignment records are never reactivated; a reassignment creates a
  new assignment record.

The API resolves the public `item_id` to Lark's internal `record_id` before
detail, update, and deactivate operations. IMEI uniqueness scans all Bitable
pages and compares values. These checks are read-before-
write operations; Bitable does not provide a transaction or uniqueness
constraint here, so concurrent creates with the same IMEI must be serialized by
an upstream workflow if strict uniqueness is required.

List filtering and aggregate statistics currently require reading the table
pages in the service. The repository supports page tokens and field-limited
lookups, but the current Bitable SDK integration does not claim server-side
transactional filtering or atomic stock updates.

## Windows PowerShell workflow

From the repository root:

```powershell
Copy-Item .env.example .env
npm install
npm run dev -w backend
# In a second PowerShell window:
npm run dev -w frontend
```

Run checks with:

```powershell
npm run test
npm run build
```

The backend loads the root `.env` whether it is started from the repository
root or from `backend`. Never put credentials in frontend environment files.

### Search records (server-side filtering)

```typescript
const response = await client.bitable.appTableRecord.search({
  path: { app_token: 'BASE_TOKEN', table_id: 'TABLE_ID' },
  params: { page_size: 50 },
  data: {
    filter: {
      conjunction: 'and',
      conditions: [
        { field_name: 'Status', operator: 'is', value: ['Active'] },
      ],
    },
  },
});
```

### Create record — do NOT retry

```typescript
// A failed create request may have partially succeeded server-side.
// Never automatically retry create operations.
const response = await client.bitable.appTableRecord.create({
  path: { app_token: 'BASE_TOKEN', table_id: 'TABLE_ID' },
  data: { fields: { Name: 'MacBook Pro', Status: 'Available' } },
});
```

---

## Rate Limits

The Lark Open Platform imposes API rate limits. As of the SDK version used:

- Standard apps: ~100 requests/second per API endpoint (verify in official docs).
- Bitable list endpoints: additional read QPS limits apply per Base.
- Implement exponential backoff only for `429` / `5xx` responses.
- Never retry `4xx` errors (including `400`, `401`, `403`, `404`).

The `LarkBitableRepository` does not currently implement automatic retries. Add bounded retries for idempotent `GET` operations in Phase 2 if needed.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `integration-status` shows `not_configured` | `.env` missing `LARK_APP_ID`, `LARK_APP_SECRET`, or `LARK_BITABLE_APP_TOKEN` |
| `integration-status` shows `error` with code `99991663` | Token expired or invalid — verify App ID / Secret |
| `error` with code `1254040` | Record not found (normal — repository returns `null`) |
| `error` with code `99991400` | App not installed to workspace or insufficient permissions |
| CORS errors in browser | `CORS_ORIGINS` in `.env` does not match your frontend origin |

---

## Verified Behavior vs. Awaiting Configuration

| Item | Status |
|---|---|
| SDK initialization code | ✅ Verified compiles |
| `IBitableRepository` interface | ✅ Defined |
| `LarkBitableRepository` implementation | ✅ Compiles — awaiting live credentials to test |
| Connectivity check (`bitable.app.get`) | ⏳ Awaiting Bitable access setup |
| Record CRUD operations | ⏳ Awaiting table creation |
| Lark OAuth (user login) | 🗓 Planned Phase 3 |
| Contacts API sync | 🗓 Planned Phase 3 |
