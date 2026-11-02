# Prospect: migrating `packages/ui` to the new reported test entity API

Companion to [REVIEW.md](./REVIEW.md) and [VSCODE-ANALOGY.md](./VSCODE-ANALOGY.md).

Question investigated: could the UI explorer stop operating on the raw
`RunnerTestFile` / `RunnerTask` tree and instead adopt the newer *reported entity*
model (`TestModule` / `TestCase` / `TestSuite` from
`node/reporters/reported-tasks.ts`) — entirely or partially?

Sources:

- UI: [hi-ogawa/vitest@334edef9](https://github.com/hi-ogawa/vitest/tree/334edef920b35cbb222019090b8abde788a68bff)
- VS Code extension: [vitest-dev/vscode@78c0a13c](https://github.com/vitest-dev/vscode/tree/78c0a13cde25b32e8a17fb5cb43d424011c852a4)

Short answer: **full migration is off the table; a partial, contract-level
migration (ship a *serialized projection* of the reported model) is feasible and
would obsolete the reconcile patch, but it is a large cross-cutting change.**

## 1. The hard constraint: reported entities are Node-live objects

`TestCase` / `TestModule` / `TestSuite` are in-process objects bound to the runtime,
not data:

- they hold a live reference to the raw task and the project:
  `public readonly task: RunnerTask`
  ([reported-tasks.ts:24](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/node/reporters/reported-tasks.ts#L24))
  and `public readonly project: TestProject`
  ([reported-tasks.ts:29](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/node/reporters/reported-tasks.ts#L29)).
- every accessor reads *through* to live state: `ok()` → `this.task.result`
  ([reported-tasks.ts:58](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/node/reporters/reported-tasks.ts#L58)),
  `meta()` → `this.task.meta`
  ([reported-tasks.ts:66](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/node/reporters/reported-tasks.ts#L66)),
  plus `children`, `diagnostic()`, `errors()`, `annotations()`.
- `TestProject` carries the vite server, resolved config, and methods.

`packages/ui` is a **pure browser client** talking to the Node server over ws + birpc
(flatted serialization). None of the above — vite refs, project methods, entity
accessor functions — can cross that boundary. Therefore the UI can never hold real
`TestModule` / `TestCase` instances.

This is not hypothetical: the server side *already* unwraps the entity back to the
raw task before shipping it. In
[api/setup.ts:232](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/api/setup.ts#L232)
the collection event is forwarded as `client.onCollected?.([testModule.task])` — i.e.
`TestModule` in, raw `RunnerTestFile` out.

**Cross-check — the VSCode extension does the exact same unwrap.** Its worker runs
in-process with vitest and *has* live entities, yet it still ships raw tasks:
`getEntityJSONTask(entity) => (entity as any).task as RunnerTestFile`
([worker/src/reporter.ts:269](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/worker/src/reporter.ts#L269))
called from `onTestModuleCollected → this.rpc.onCollected(...)`
([worker/src/reporter.ts:195](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/worker/src/reporter.ts#L195)),
and its RPC contract
is `onCollected: (file: RunnerTestFile, ...)`
([shared/index.ts:94](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/shared/src/index.ts#L94)).
Two independent clients, same conclusion: the reported entity is an event *source*,
never the transported model.

> Correction to earlier assumption: the VSCode extension did **not** migrate its model
> to `TestModule`/`TestCase`. Its tree model is still `RunnerTestFile`/`RunnerTask`
> based; the reported API is used only for lifecycle hooks in the worker. See
> [VSCODE-ANALOGY.md](./VSCODE-ANALOGY.md) §1.

## 2. Current UI wire contract (what a migration would replace)

Three channels, all raw-task-shaped:

| Channel | Wire signature | Purpose |
|---|---|---|
| Structural (pull) | `getFiles(): File[]` ([api/types.ts:39](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/api/types.ts#L39)) | initial tree on ws open |
| Structural (push) | `onCollected(files?: File[])` ([api/types.ts:69](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/api/types.ts#L69)) | per-module (re)collection |
| Result deltas | `onTaskUpdate(packs: TaskResultPack[], events)` ([api/types.ts:78](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/api/types.ts#L78)) | id-keyed live results |

The UI rebuilds its own mirror keyed by **position-based ids** (`${parent.id}_${idx}`),
which is the root cause of the bugs in REVIEW §6-8 (append-only mirror, ghost nodes,
type-change crashes).

## 3. What "partial migration" would actually mean

Not objects — a **serialized DTO projection** of the reported model on the wire.
Precedent already exists in the codebase: `SerializedTestSpecification`. The plan:

1. Define `SerializedTestModule` / `SerializedTestCase` / `SerializedTestSuite` DTOs
   carrying the fields the entity exposes: **stable id**, name, location, typed
   `children`, `diagnostic`, `errors`, `annotations`, `meta`.
2. In `api/setup.ts`, build them via `ctx.state.getReportedEntity(...)` (already used
   for other handlers, e.g. `getReportedEntityById` at
   [api/setup.ts:107](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/api/setup.ts#L107))
   before `stringify`.
3. Re-key the explorer mirror / idMap on the **stable reported id** instead of the
   positional id.

## 4. Cost / benefit

**Upside (directly relevant to the bugs we just patched):**
- Reported id is *deterministic and stable across runs*
  ([reported-tasks.ts:33](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/node/reporters/reported-tasks.ts#L33)),
  and children are explicit + typed. This eliminates the entire defect class behind
  BUG-1 / BUG-2 / §8.3 (positional ids, append-only mirror, type-change-at-reused-id).
  Reconcile collapses to a trivial stable-id diff — most of the code shipped in the
  `ui-explorer-reconcile` branch becomes unnecessary.
- First-class `diagnostic()` / `errors()` / `annotations()` surface instead of
  scraping the raw task tree.

**Cost:**
- No serialized wire form for the entities exists today — it must be built and kept in
  sync with the entity API (diagnostics, annotations, artifacts, errors, meta,
  per-project modules).
- The raw-task contract is woven through `StateManager` (filesMap / idMap), the
  explorer collector/tree, and many components reading `task.result` / `currentLogs` /
  artifacts directly. Swapping the structural channel touches all of them.
- birpc cannot cheaply expose entity *methods*; you either snapshot (DTO) or accept
  chatty per-accessor round-trips — a non-starter for a browser UI rendering thousands
  of nodes.

## 5. Recommendation

- **Do not attempt full migration** (UI operating on entity objects). The process
  boundary forbids it — same reason VSCode didn't.
- **Target an incremental, contract-level migration:**
  1. Keep `onTaskUpdate(packs)` for live result deltas (already id-keyed); keep idMap.
  2. Replace only the **structural** channel (`onCollected(File[])` / `getFiles`) with
     a serialized reported-module tree carrying stable ids + explicit children.
  3. Re-key mirror/idMap on the stable reported id.
- **Sequencing:** the `ui-explorer-reconcile` patch is the correct near-term fix; the
  serialized-entity migration is the structural follow-up that removes the root cause.
  They are not in conflict — the patch buys correctness now, the migration retires it
  later.
