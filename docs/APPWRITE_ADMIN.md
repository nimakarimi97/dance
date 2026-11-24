# Trusted administration

These are deployment instructions, not a provisioning script. No production resource
is created or modified by the tests or build.

## Trust boundary

`dance-library` accepts personal practice requests and, under `service:"figures"`,
figure saves, imports, and figure-audit reads. It has no role-management route.
`dance-user-management` retains user listing and role changes and adds role-audit reads.
Each invocation reads `x-appwrite-user-id` supplied by the Appwrite execution gateway,
then calls `Users.get` to obtain **current** labels. Browser-supplied actor IDs, labels,
creator IDs, and user preferences are not trusted. Figure operations require `admin`
or `superadmin`; all user-management operations require `superadmin`. Self role
changes are forbidden and unrelated labels are preserved.

Use authenticated SDK executions only. Disable public execution, custom public
function domains, schedules, and event triggers for these administration handlers;
do not place them behind a proxy that accepts client-controlled Appwrite headers.
Set execute permissions to `users` for the shared library and `label:superadmin`
for user-management. The library's figure handler independently requires fresh
admin/superadmin labels; signed-in execution does not grant figure administration.
Execution permissions supplement, not replace, fresh server authorization.

## Schema and permissions

Before enabling the new client, provision these columns in the existing `dance`
database (or configured database ID):

* `figures`: retain `nome` (string 255), `danza` (string 36), `stili` (string array),
  `youtubeId`, `videoFileId`, `imageFileId` (optional strings), and `createdBy`
  (optional string 36). Add optional `aliases` (string array, each item size 100),
  `description` (text, validated to 4000 characters), and nullable optional
  `difficulty` (enum `beginner`, `intermediate`, `advanced`; default null).
  Wait until columns are available before using metadata writes.
* `figure_audit` and `role_audit`: identical columns, all required:
  `kind` (string 16), `actorId` and `targetId` (string 36),
  `operationId` (string 36), `action` (string 32), `status` (string 16),
  `before` and `after` (text, **at least 65536 characters each**).
  `before`/`after` contain JSON strings, not Appwrite relationship columns.
  Use mediumtext for snapshots because Appwrite text columns cap at 16383.
  `$id`, `$createdAt`, and `$sequence` are built-in. Audit listing sorts by the
  built-in `$sequence` descending and uses cursor pagination.

Remove **all client create/update/delete/write permissions** from the figures
table, including label-admin and label-superadmin grants. Also remove write grants
from **existing rows** if row security is enabled. Table grants and row grants are
additive; removing only one does not close the bypass. Keep the existing intended
read permissions (normally signed-in users). New/updated figure rows receive no
row-level permissions and inherit table read access. Do not remove admin media
bucket upload/update/delete permissions: media uploads still happen in the browser,
with existing file limits. Files uploaded before an upload-stage failure can be
cleaned up. Once the trusted save is invoked, do not delete uploaded files merely
because the browser receives an error: the transaction may already have committed.
Retain files on uncertain outcomes and reconcile orphan files against current
figure references before deleting them, using an age grace period and checking for
in-flight saves. This favors a recoverable orphan over a broken committed reference.

Audit tables and rows must have **no client read or write permissions**, including
admin labels. Both history APIs enforce authorization. The handlers only append
audit entries; there is no audit edit/delete endpoint. They are immutable to clients
and application APIs, not cryptographically immutable against project owners or
compromised server credentials. Protect server keys and use separate archival
controls if stronger retention guarantees are required.

## Runtime and packaging

Both function packages use Node.js 22+ and `node-appwrite` 32.0.0 (the existing
user-management lockfile resolves 32.0.0). The installed SDK types were checked:
`createTransaction({ttl})`, row methods with `transactionId`, and
`updateTransaction({transactionId,commit|rollback})` are supported.
The target Appwrite server must also support TablesDB transactions. Unsupported
servers fail closed: there is **no** sequential-write fallback.

Deploy **exactly two Functions**, compatible with the project's Free-plan limit.
Do not deploy the figure/practice handler directories as separate Functions.
For the shared library archive, copy `functions/library/package.json` and
`package-lock.json` to the **archive root**. Include these allowlisted files,
retaining their repository paths:

```text
functions/library/main.js
functions/library/dispatch.js
functions/figure-management/main.js
functions/figure-management/figure-management.js
functions/practice/main.js
functions/practice/practice.js
functions/practice/store.js
shared/figure-schema.js
```

Installing at the archive root lets both sibling handlers resolve `node-appwrite`.
Exclude `.env`, `.git`, local `node_modules`, and private files.
Shared library settings:

```text
Function ID: dance-library
Entrypoint: functions/library/main.js
Build command: npm ci --omit=dev
Runtime: node-22
Execute: users
Timeout: 120 seconds
```

User-management remains independently packageable with source root
`functions/user-management`, entrypoint `main.js`, build `npm ci --omit=dev`.
It needs no shared-file import.

Use the gateway-injected `x-appwrite-key` dynamic runtime key. A server-only
`APPWRITE_FUNCTION_API_KEY` environment secret is supported as fallback for
controlled runtimes. Required injected variables are
`APPWRITE_FUNCTION_API_ENDPOINT` and `APPWRITE_FUNCTION_PROJECT_ID`.
Optional server configuration:

```text
APPWRITE_DATABASE_ID=dance
APPWRITE_FIGURES_TABLE_ID=figures
APPWRITE_FIGURE_AUDIT_TABLE_ID=figure_audit
APPWRITE_ROLE_AUDIT_TABLE_ID=role_audit
```

Grant runtime scopes `users.read`, `rows.read`, `rows.write`; add `users.write`
only to user-management. The connected Cloud project exposes no separate
transaction scopes; its TablesDB transaction API is available. Verify runtime
transaction authorization and a complete commit in staging. No schema-management or
storage scope is needed by these functions. Never expose a server key in `VITE_*`.

Public frontend configuration:

```text
VITE_APPWRITE_LIBRARY_FUNCTION_ID=dance-library
VITE_APPWRITE_USER_MANAGEMENT_FUNCTION_ID=dance-user-management
```

Deploy the backend, provision schema, and verify in staging first; deploy the client
that routes single saves through `saveAdminFigure`, then remove direct figure
writes. Until direct grants are removed, the trust boundary is not complete.

### Connected-project rollout

The MCP rollout for `dance-salsa-bachata` provisioned all four private tables,
their columns and owner indexes, and the optional figure metadata columns.
Both Functions above are built, active, and enabled; the verified project total
is **2**, matching the Free-plan allowance. No static API key was added.
`figures` now has only `read("users")`, with Row Security disabled. The media
bucket is also signed-in-only and retains admin/superadmin media writes.

**The frontend is not published by provisioning Appwrite.** Publish this branch's
frontend with the configuration above. Older frontend builds that write figure
rows directly can still read the catalog but cannot save admin edits after this
permission cutover. Do not restore direct writes to work around that restriction.

Live verification used temporary accounts with real sessions, not forged caller
headers: personal saves/readback, owner-only row permissions, cross-user denials,
list deduplication/deletion, rejected direct writes, regular-user admin denials,
and guest denials passed. Temporary accounts, sessions, and rows were removed.
For Row Security tables an unauthorized list request may return an empty 200
response; a known foreign row remains inaccessible.

A synthetic figure and audit were staged in one transaction through MCP, rolled
back, and confirmed absent. This checks live schema and transaction availability,
**not** the Function key's commit authorization. No production figure or real
role was changed to test administration. Before real bulk edits, verify an
authenticated admin save/import and its audit, plus an audited role change using
an authorized superadmin in staging. Local tests cover those paths but do not
replace this authenticated deployment check.

## Contracts

All actions are POST JSON via synchronous authenticated Function executions.
`src/lib/admin-api.js` exposes:

* `saveAdminFigure({id?, data, expectedUpdatedAt?})` → figure row.
  Function request `{service:"figures",action:"save",id?,data,expectedUpdatedAt?}` → `{figure}`.
* `applyFigureRows(rows)` → `{figures}`.
  Function request `{service:"figures",action:"apply",rows:[{id?,data,expectedUpdatedAt?}]}`.
* `listFigureAudit({cursor?,limit?})` and `listRoleAudit(...)`
  → `{entries,nextCursor}`. Function action `audit`; default limit 25, max 50.
  Figure audit requests also require `service:"figures"`; role requests use
  the separate user-management Function without a service field.
  Pass the returned opaque `nextCursor` unchanged; null means end of history.

Administrative API errors include `.outcome`: `rejected` means a definitive
pre-commit rejection or transaction conflict; `unknown` means the execution may
have committed, including lost responses, malformed successful responses, failed
executions, and commit timeouts. Do not retry unknown create outcomes or remove
their media without reconciliation. Backend 409 responses include row-indexed
`expectedUpdatedAt` errors; a commit conflict with no identifiable row uses index
`-1` for the whole batch. `.errors` is preserved on frontend errors for preview UI.

`shared/figure-schema.js` is pure and can be imported by Node or Vite.
`normalizeFigureData(data,{partial=false}={})` returns normalized data or throws
`FigureValidationError` with `.errors: [{field,message}]`.
`validateFigureRows(rows)` returns `{rows,errors:[{index,field,message}]}`;
indices are zero-based, `-1` denotes the whole batch. Never apply `rows` if errors
exist. Other exports: `FIGURE_FIELDS`, `DANCE_STYLES`, `DIFFICULTIES`,
`validFigureId`.

Create data requires `nome`, `danza`, and nonempty `stili`. Salsa styles are
`cubana`/`portoricana`; bachata styles are `dominicana`/`sensuale`/`moderna`.
YouTube values are bare 11-character IDs. Media fields are existing file IDs,
not URLs. Optional aliases: at most 20 nonempty strings of 100 characters;
description: at most 4000 characters; difficulty: one enum value or null.
Unknown fields are rejected, including system fields and private notes.
Patches preserve absent fields, including absent legacy metadata. The server
validates the resulting figure as well as each patch.

Imports support a JSON **array of rows**, not CSV. Missing IDs create figures
with server-generated IDs; supplied IDs update existing figures, never upsert.
Duplicate IDs and batches outside 1–50 rows are rejected. The UI previews each
row and requires explicit confirmation. Bulk difficulty edits capture
`$updatedAt` when available. External JSON updates should also provide
`expectedUpdatedAt` to detect stale previews.

## Atomicity and honest failure handling

For figure writes all request and merged-row validation completes before writes
are staged. Figure rows and allowlisted before/after audit snapshots are staged
in **one TablesDB transaction** and committed together. A 50-row batch stages
100 writes (50 figures + 50 audits), matching the documented Free-plan limit.
Reads take place in the transaction; existing rows are also checked immediately
after staging against their initial `$updatedAt`, closing the read-to-stage
version gap. Appwrite detects subsequent external changes at commit. A conflict
returns 409; reload and review rather than silently overwriting. Without
`expectedUpdatedAt`, an already-stale browser preview cannot be detected before
the server request. A timeout during commit can leave an unknown response outcome:
check history and reload before retrying to avoid duplicate creates.

Role label updates use a **nontransactional Users API**. The function first
persists an immutable `pending` record; if that fails, it never calls
`updateLabels`. It then appends `completed`, or an `error` record with
`outcome:"unknown"` if the label API throws (including network timeouts).
If completion auditing fails after a successful label change, the response is
500 with `auditPending:true` and the updated user; it explicitly says not to
retry. Pending records remain pending permanently; correlate appended outcomes
by `operationId`. Operators must reconcile unmatched pending operations against
current user labels. Concurrent external role changes cannot be made atomic or
CAS-protected by the Users API. There is no automatic replay or rollback.

Only figure allowlisted fields and role transitions are audited. User emails,
preferences, private notes, secrets, and upstream exception messages are not
written to audit or runtime logs by these handlers.

## Local checks

```sh
node --test tests/figure-management-function.test.js tests/user-management-function.test.js
npm run build
```

These tests use injected fake APIs, not production resources. They cover
authorization, shared import validation, transaction staging/rollback, conflicts,
allowlisted snapshots, durable role-audit ordering, and ambiguous failure outcomes.
They do not substitute for staging verification of server scopes, permissions,
schema limits, transaction conflicts, or deployment packaging.

References: [TablesDB transactions](https://appwrite.io/docs/products/databases/tablesdb/transactions),
[Appwrite permissions](https://appwrite.io/docs/advanced/platform/permissions).
