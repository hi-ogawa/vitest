# Critical Review: packages/ui Explorer Model Architecture

- Source: [hi-ogawa/vitest@334edef9](https://github.com/hi-ogawa/vitest/tree/334edef920b35cbb222019090b8abde788a68bff)

Scope: the "model" layer of the UI test explorer, i.e. everything under
`packages/ui/client/composables/explorer/` plus its wiring into the ws-client
(`composables/client/index.ts`) and its consumer `components/explorer/Explorer.vue`.
Part II additionally traces the ground-truth model on the server (`packages/vitest`)
to explain the staleness bugs end to end. The project already ships an author-friendly
overview at
[packages/ui/explorer.md](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/explorer.md);
this note is the critical counterpart to that doc.

Companion notes:
- [VSCODE-ANALOGY.md](./VSCODE-ANALOGY.md) compares reconciliation with the Vitest VSCode extension.
- [MIGRATION-PROSPECT.md](./MIGRATION-PROSPECT.md) evaluates a future serialized reported-entity contract.
- [DATAFLOW-AND-SCHEDULING.md](./DATAFLOW-AND-SCHEDULING.md) follows the fix through source-model ownership, the Vue projection boundary, singleton coupling, and microtask scheduling, then proposes an incremental cleanup plan.
- [CONFIG-BOOTSTRAP-CONTRACT.md](./CONFIG-BOOTSTRAP-CONTRACT.md) tracks the separate cleanup of partial config, readiness ordering, and strict project-config lookup.

This note has two parts:
- **Part I (§1–5)** critiques the architecture as it stands.
- **Part II (§6–8)**, after the divider, documents confirmed model-manipulation bugs
  found by tracing the server → client model.

## 1. What the architecture is

The explorer is a **three-layer entity model**, not a single tree. The relationship
between the layers is the key to the rest of this note.

**Layer 1 — ground-truth task tree** (`client.state`, a `StateManager`):
`idMap: Map<id, Task>` and `filesMap: Map<path, File[]>` hold the runner's own
`File`/`Suite`/`Test` objects streamed from the server. This is the source of record,
mutated **in place** during a run — results, logs, artifacts, and annotations all
accumulate here (see §6.2 / §6.4).

**Layer 2 — mirror tree** (`explorerTree`, a single global `ExplorerTree` created in
[explorer/index.ts:3](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/index.ts#L3)):
`nodes: Map<id, UITaskTreeNode>` plus a `root: RootTreeNode` whose
`tasks: FileTreeNode[]` are the file roots. There is one `UITaskTreeNode` per task,
**keyed by the same id** as Layer 1 (§6.1). A node holds view-only state
(`expanded`, `indent`, `expandable`, `type`) plus a scalar *copy* of a few display
fields (`name/mode/state/duration/slow`). It is a projection/index over Layer 1, not an
independent store — even filtering re-reads the real `Task` from `idMap` (§2.1).

**Layer 3 — flat view** (module-level `shallowRef`s in
[state.ts](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/state.ts)):
`uiEntries: UITaskTreeNode[]` is the filtered, ordered, flattened slice of Layer 2 that
the virtual scroller renders; `uiFiles`/`filteredFiles` are sibling slices. The
filter/search/project/sort singletons also live here.

In one line: **Layer 1 →(sync by id)→ Layer 2 →(filter + flatten each tick)→ Layer 3.**
Live per-test data (results/logs/artifacts/annotations) never leaves Layer 1; Layers 2
and 3 only ever hold the projection.

`ExplorerTree` also owns the run machinery: `pendingTasks: Map<fileId, Set<taskId>>`
(task ids changed since the last tick), a `reactive` `summary` (`CollectorInfo` counts),
and a RAF loop (`useRafFn`, `fpsLimit: 10` ≈ every 100 ms) that drives `runCollect`
([tree.ts:61](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/tree.ts#L61)).

Data flow:

1. ws handlers in
   [client/index.ts:37-58](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/client/index.ts#L37)
   push updates: `onTaskUpdate → resumeRun(packs)` fills `pendingTasks` and resumes
   the RAF loop; `onFinished → endRun`; annotations/artifacts → `recordTestArtifact`.
2. Every ~100 ms `runCollect`
   ([collector.ts:94](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/collector.ts#L94))
   walks the pending files, mirrors them into `nodes`, recomputes `summary`, then
   calls `runFilter` to rebuild `uiEntries`.
3. `Explorer.vue` renders `uiEntries` through `RecycleScroller`.

### What is genuinely good

- Flat list + virtual scroller (`vue-virtual-scroller`) keyed by `id` is the right
  call and is the core win over the old recursive-reactive tree.
- `shallowRef` for `uiEntries`/`uiFiles` deliberately avoids deep Vue reactivity.
- Batching server updates on a RAF tick instead of re-rendering per `onTaskUpdate`.
- Incremental node collection via `pendingTasks` avoids re-reading the whole `idMap`
  during a run.

Sections 2–5 are the critique.

## 2. High-severity concerns

### 2.1 Two parallel trees / dual source of truth

The `UITaskTreeNode` tree in `nodes` is a near-complete mirror of the runner task
tree already living in `client.state.idMap`. `createOrUpdateNode`
([utils.ts:168](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/utils.ts#L168))
copies `name`, `mode`, `duration`, `state`, `slow` from the `Task` onto the node on
every update. Yet the mirror does **not** even carry enough data to filter itself:
`matcher` in
[filter.ts:307](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/filter.ts#L307)
reaches back into `client.state.idMap.get(node.id)` to get the real `Task` for
matching search/status/tags.

So we maintain a full second tree whose only unique payload is a handful of
view-only fields (`expanded`, `indent`, `expandable`, `type`, `projectNameColor`),
while still doing `idMap` lookups per node during filtering. The duplication is the
root cause of most of the complexity below (sync code, cast-heavy narrowing, two
places to keep consistent). A lighter design would attach view state as a side-map
keyed by id (`Map<id, {expanded, indent}>`) over the existing task tree, or compute
`indent`/`type` on the fly, and drop the mirror entirely.

### 2.2 The "incremental" claim is only half true — filtering and summary are full-tree every tick

`explorer.md` sells the design on "traverse only the received files". That holds for
node *collection* (`traverseReceivedFiles`), but two full-tree passes still run on
**every** RAF tick:

- `collectData`
  ([collector.ts:303](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/collector.ts#L303))
  walks *all* files and recurses *all* tests via `testsCollector` to rebuild
  `summary` from scratch — O(total tests) at 10 Hz.
- `runFilter → filterAll`
  ([filter.ts:34](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/filter.ts#L34))
  rebuilds `uiEntries` from **all** root files, not just the changed ones, allocating
  several `Set`s/arrays and doing multiple passes per file (`visitNode`,
  `filterParents`, a `.reverse()`, a `parents` set, a final `.filter`).

Then `testsTotal`
([state.ts:131](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/state.ts#L131))
is a Vue `computed` that re-runs `collectTestsTotalData` (another test walk in
`onlyTests` mode) whenever `summary` mutates. So a single tick can trigger three
independent full traversals of the tree. For very large suites the per-tick
allocation/GC cost, not the DOM, becomes the bottleneck — the opposite of what the
doc implies.

### 2.3 Filtering mutates persistent expansion state as a side effect

`visitNode`/`filterNode` set `treeNode.expanded = true` while computing the visible
list ([filter.ts:117-122](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/filter.ts#L117)).
"Compute what is visible" and "mutate which nodes are open" are fused into one
generator. Consequences:

- Filtering is not idempotent with respect to tree state: running a search
  permanently expands parents, so clearing the search leaves a different tree than
  before.
- Reasoning about `expanded` requires reading the filter code, not just the
  expand/collapse modules.

Expansion state should be derived (search-visible ⇒ render children) rather than
written back into the persistent node during a read-only filter pass.

### 2.4 Expansion state is stored in three overlapping places

1. `node.expanded` per node
2. `openedTreeItems` (localStorage array/Set)
3. `treeFilter.expandAll` tri-state (`true` / `false` / `undefined`)

`doRunFilter`
([collector.ts:222](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/collector.ts#L222))
derives `applyExpandNodes` from all three, and there are cross-module implicit
contracts documented only in comments (e.g. expand.ts:61-63 and collapse.ts:31-33
both say "there is a watcher on search.ts to reset expandAll"). This tri-source state
machine is fragile and is a prime candidate for drift bugs (the three can disagree).
A single normalized representation (e.g. only `openedTreeItems` + a derived
`expandAll`) would remove a whole class of edge cases.

## 3. Medium-severity concerns

### 3.1 `queueMicrotask` used as an ad-hoc scheduler with no coalescing

`runCollect` fans work across ~5 sequential microtasks
([collector.ts:107-131](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/collector.ts#L107)),
and every tree method wraps its body in `queueMicrotask`
([tree.ts:171-217](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/tree.ts#L171)).
There is no cancellation or coalescing: rapid user actions (typing, repeated
expand/collapse) enqueue independent microtask chains that each rebuild `uiEntries`
and race. Correctness relies on microtask FIFO ordering being exactly
traverse → collectData → snapshot → filter, which is implicit and brittle. A single
scheduled "recompute" with debouncing would be clearer and cheaper.

### 3.2 `ExplorerTree.collect` duplicates its whole body

`collect(start, end, task=true)`
([tree.ts:119-154](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/tree.ts#L119))
has two branches that call `runCollect` with identical arguments; the only difference
is whether it is wrapped in `queueMicrotask`. That is ~30 duplicated lines that should
collapse to one call plus an optional wrapper.

### 3.3 `filterNode` is overloaded for two unrelated jobs

The same generator serves both "filter an entire file subtree" and "expand a single
suite" (reused from
[expand.ts:53](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/expand.ts#L53)).
This forces special-case branches like the `!fileId && !isFileNode(node) && 'fileId'
in node` fix-up (filter.ts:93) and the `nodeId && treeNodes.has(nodeId) &&
child.fileId === nodeId` path in `filterParents` (filter.ts:184). Combined with the
`collapseParents` (== `onlyTests`) branching and the `filesToShow` set threaded
through `expandCollapseNode`, this is the least readable and least documented code in
the module and the most likely home for subtle filter bugs. It deserves either
splitting into two functions or a thorough comment + test matrix.

### 3.4 Global singleton module state hurts testability and creates import cycles

`state.ts` is a grab-bag of module-level singletons mixed with pure helpers
(`escapeHtml`, `createSafeFilter`). Because everything is module-global, there can be
only one explorer, and tests must reset many globals. There is also a dense circular
import graph: `state.ts` imports `explorerTree` from `./index`, while
`index → tree → {state, filter, collector, expand, collapse}` and
`filter/collector/utils → state` and `collector → index`. This works only because of
lazy access at call time; it is easy to break and hard to reason about.

### 3.5 `ExplorerTree` exposes mutable internals via positional constructor params

The constructor takes 8 positional params (6 of them `public`), including the live
`nodes`, `pendingTasks`, `root`, `summary`, `colors`, `projects`
([tree.ts:24-58](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/tree.ts#L24)).
Making these `public` and constructor-injected blurs the intended API surface and
lets any caller mutate core state directly (and several modules do reach into
`explorerTree.nodes`/`explorerTree.root.tasks`). Encapsulating them as private fields
with narrow methods would make invariants enforceable.

## 4. Low-severity / correctness nits

- **Sentinel mismatch.** File nodes are created with `parentId: 'root'`
  ([utils.ts:99](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/utils.ts#L99))
  but the root node's id is `'vitest-root-node'`
  ([tree.ts:31](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/tree.ts#L31)).
  `nodes.get('root')` is always `undefined`, so parent-walk loops stop at files "by
  accident". It works, but the two constants should agree or the intent
  ("files have no in-map parent") should be explicit.
- **Cast-heavy narrowing.** Despite `UITaskTreeNode` being a discriminated union on
  `type`, the code frequently casts (`as FileTreeNode | undefined`, `as TestTreeNode`,
  `as SuiteTreeNode`, `child.fileId as string`) and does `'fileId' in node` runtime
  probes instead of using the type guards already defined in `utils.ts`.
  `RootTreeNode` is also outside the union (`<RootTreeNode>{...}`), so it cannot be
  narrowed alongside the others.
- **`recordTestArtifact` mixes concerns.** It both mutates the `Task` in `idMap`
  (pushing annotations/artifacts) and piggybacks on `pendingTasks` to force a
  re-render ([collector.ts:70](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/collector.ts#L70)).
  Fine, but the render-trigger coupling is non-obvious.
- **`resumeEndTimeout` heuristic.** `startRun` arms a 500 ms `setTimeout(endRun)` as a
  fallback for "no updates arrived"
  ([tree.ts:82-85](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/tree.ts#L82)).
  This is a workaround for the lack of an explicit "run produced zero tasks" signal
  and can misfire on a slow first tick.
- **Fixed 100 ms latency floor + idle re-renders.** RAF polling means the tree never
  updates faster than ~100 ms and keeps ticking while a run is active even when
  nothing changed in a given window (the pending set can be empty but `collectData`
  still runs).

## 5. Suggested direction (if this is ever refactored)

Roughly in priority order:

1. Collapse the dual tree: keep the runner task tree as the single source of truth and
   store only view state (`expanded`, precomputed `indent`) in a side map keyed by id.
   This directly removes §2.1, most of §3.4, and the casts in §4.
2. Make filtering pure: return the visible-id list and the set of "should be expanded
   because of search" ids without mutating `node.expanded` (fixes §2.3).
3. Make `summary` and `testsTotal` incremental (accumulate deltas from pending packs)
   instead of full walks each tick (fixes §2.2).
4. Replace the microtask fan-out and RAF polling with one debounced/coalesced
   "recompute" scheduler (fixes §3.1).
5. Normalize expansion state to one representation (fixes §2.4).

None of these are required for correctness today; the current design demonstrably
works and is far better than the old reactive tree. But the mirror-tree + full-tree
recompute + tri-source expansion state are the three structural weaknesses that make
the module hard to modify safely and cap its scalability on very large suites.

---

**Part II — Bug hunt: server → client model, staleness across re-runs.**
This second pass traces the ground-truth model on the server (`packages/vitest`)
through to the client's mirror, focusing on **model-manipulation** bugs (stale/ghost
entities after watch re-runs) rather than UI display glitches.

## 6. End-to-end model of record

### 6.1 Server-side identity scheme (the crux)

Task ids are **position-based**, not content-based:

- File id = `generateFileHash(filepath, projectName, meta)` — stable across runs
  ([tasks.ts:205](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/utils/tasks.ts#L205)).
- Every child id = `` `${parent.id}_${idx}` `` via `calculateSuiteHash`
  ([tasks.ts:235](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/utils/tasks.ts#L235)).

So a test's identity is *its position in the tree*, not its name or body. Renaming a
test keeps its id; **adding/removing/reordering/restructuring** siblings shifts ids
and, more importantly, can leave ids that no longer exist in the new collection.

### 6.2 Client ground-truth store (`StateManager`)

[client/state.ts](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/client/state.ts):

- `idMap: Map<id, Task>` is updated by `updateId` (recursive `set`, **never deletes**)
  and `updateTasks` (mutates `result`/`meta` in place).
- `filesMap: Map<path, File[]>` is replaced per file by `collectFiles`.
- On ws `open`, only `filesMap.clear()` is called
  ([client/index.ts:173](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/client/index.ts#L173)); `idMap` is **never** cleared.

So even the "ground truth" `idMap` is append-only: ids from a previous collection that
disappear in a re-run remain resolvable, pointing at stale `Task` objects.

### 6.3 Re-run event flow into the explorer

`onSpecsCollected → onCollected → onTaskUpdate* → onFinished`
([ws.ts:63-83](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/client/ws.ts#L63)).
Critically, the explorer's UI handlers
([client/index.ts:36-66](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/client/index.ts#L36))
implement **no `onCollected` handler**. The mirror therefore never receives the fresh
full structure; it only learns of changes additively via `resumeRun(packs)` (pending
tasks that produced results) and the `endRun` sweep.

### 6.4 Live, progressive data lives on the ground-truth `Task`, not the mirror

During a run the model is mutated **continuously in place** on the idMap `Task`
objects as tests progress:

- results / meta via `updateTasks`
  ([state.ts:117](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/client/state.ts#L117)),
- console logs via `updateUserLog` → `task.logs.push`
  ([state.ts:131](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/client/state.ts#L131)),
- annotations / artifacts via `recordTestArtifact` → `test.annotations` /
  `test.artifacts.push`
  ([collector.ts:70](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/collector.ts#L70)).

The mirror `UITaskTreeNode` carries **none** of these — no `logs`/`artifacts`/
`annotations`, only a scalar projection (`name/mode/state/duration/slow`) refreshed
each RAF tick by `createOrUpdateNode`. Components read the live data straight from
idMap via `findById`/`current` (e.g. `currentLogs`,
[client/index.ts:79](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/client/index.ts#L79)). So the mirror is purely a
filter/order/expansion index; the source of record for progressive updates is idMap,
and the reactivity that streams logs/artifacts into the UI as they arrive is idMap's,
not the mirror's. This separation is what makes rebuilding the mirror safe (§8.2).

## 7. Confirmed model-manipulation bugs

### BUG-1 (High): the mirror tree is append-only → ghost nodes survive watch re-runs

`explorerTree.nodes`, `explorerTree.root.tasks`, and every parent's `.tasks`/`.children`
are only ever written with `set`/`push`/`add`
([utils.ts:122-123](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/utils.ts#L122),
[utils.ts:228-230](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/utils.ts#L228)).
There is no `delete`, no reconciliation, and no reset anywhere in the module
(verified: the only `nodes = ` / `root = ` occurrences are the constructor defaults).

**Repro (reasoning-confirmed):** in watch mode, a file with tests `f_0, f_1, f_2`.
Edit the file to delete the third test → server re-collects with `f_0, f_1` only.

- The runner never sends a result for the removed `f_2`, so it never enters
  `pendingTasks`, so neither `traverseReceivedFiles` nor the `endRun` `traverseFiles`
  sweep touches it. Nothing prunes it.
- `filterAll → filterNode → visitNode` walks `fileNode.tasks`, which still contains the
  ghost `f_2` node ([filter.ts:300-304](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/filter.ts#L300)).
- `matcher` looks up `client.state.idMap.get('f_2')`
  ([filter.ts:307-309](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/filter.ts#L307)). Because `idMap`
  is append-only (6.2), it returns the **stale** `f_2` task, so the ghost matches an
  empty search and **is rendered** with its last-known name/state.

Same mechanism produces **ghost suites** (delete a `describe`, inside a file that still
re-runs — fixed by §8). Deleting a whole test *file* is a related but distinct case with
a different root cause and fix: the file never re-runs, so §8 cannot see it — see §8.3.

**Observable divergence:** the summary/header counts are computed from the *current*
`idMap` tree, not the mirror (the same full walks flagged for cost in §2.2, here the
point is correctness). `collectData` iterates
`root.tasks.filter(f => idMap.has(f.id))` then recurses `findById(file.id)` tasks
([collector.ts:303-373](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/collector.ts#L303)), and `testsTotal` likewise walks `idMap` files
([state.ts:131](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/state.ts#L131)). So after removing a test the **header will say
"2 tests" while the tree still lists 3 rows**: the counts and the visible tree
disagree. The summary is right; the tree is stale.

Renames/reorders happen to survive because position ids are reused and
`createOrUpdateNode` relabels the existing node in place — which is exactly why this
bug is easy to miss in casual testing and only bites on *removal/restructuring*.

### BUG-2 (High, likely crash): structural type change at a reused position id

`createOrUpdateNode` updates an existing node's `name/mode/duration/slow/state` but
**never updates `type`**, and never converts between test/suite shapes
([utils.ts:178-191](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/utils.ts#L178)). Because ids are positional, an
edit that turns a leaf test into a `describe` (or vice-versa) reuses the same id with a
different kind:

- **suite → test** at the same index: the old node keeps `type: 'suite'`,
  `expandable: true`, and its **old children** (now ghosts). It renders as an
  expandable suite carrying a test's name.
- **test → suite** at the same index (probable `TypeError`): during the collect sweep,
  `createOrUpdateNode` recurses to attach the new suite's children using the reused id
  as parent ([utils.ts:233-236](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/utils.ts#L233)). The parent lookup returns the stale
  **test** node, which has no `children` set, so line
  [utils.ts:181](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/utils.ts#L181) `node.children.has(task.id)` dereferences
  `undefined.has` and throws inside the `queueMicrotask`, breaking that collect tick.
  (Reasoning-derived; not yet reproduced in a running UI, so treat the crash as
  "very likely" pending a repro. Even without the throw, `createOrUpdateSuiteTask`
  early-returns on the non-parent node, so the new suite's children never attach.)

### BUG-3 (Low): `filesSnapshotFailed` is write-dead

`CollectorInfo.filesSnapshotFailed` is declared, initialized to `0`, and read by the
dashboard ([TestFilesEntry.vue:53](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/components/dashboard/TestFilesEntry.vue#L53)) but is **never incremented and never
copied to `summary`** in `collectData`
([collector.ts:303-390](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/explorer/collector.ts#L303)). It is permanently `0`, so the
dashboard "Snapshot Fail" row never renders. (Independent of the staleness bugs; the
`summary.failedSnapshot` boolean used elsewhere is computed correctly at `endRun`.)

## 8. Root cause and fix direction

All of BUG-1/BUG-2 share one root cause: **the mirror is synced additively from
partial `onTaskUpdate` deltas and never reconciled against the freshly collected task
tree.** The missing `onCollected` handler is the structural gap — collection is the
only event that authoritatively describes "these are the tasks that now exist for this
file," and the explorer ignores it.

**Canonical fix:** make **Layer 2's structure a derivation of Layer 1 at the collection
boundary, per file** — rebuild a file's mirror subtree from its fresh `Task` tree when
the file is (re)collected, instead of patching it from partial deltas. This restores the
§1 invariant ("Layer 2 is a projection of Layer 1"), which today holds only on first load,
not across re-runs. Concretely, three edits:

1. **Wire the missing `onCollected(files)` handler**
   ([client/index.ts:36-66](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/ui/client/composables/client/index.ts#L36)) → call a new
   `explorerTree.collectFile(file)` per file. This is the structural trigger that is
   absent today; it is inherently per-file because the server only sends the re-run
   modules (§8.1).
2. **`collectFile` reconciles that one subtree** against the fresh Layer-1 `Task` tree
   (Layer 2): remove ids no longer present from `nodes` and the parent's
   `.tasks`/`.children`; **drop-and-recreate** any node whose `type` changed
   (test↔suite) rather than mutate in place (fixes BUG-2, incl. the `node.children`
   crash); **preserve `expanded`/opened state for surviving ids**; then the existing
   `createOrUpdateNode` fills the current structure (fixes BUG-1).
3. **Layer-1 hygiene:** on `collectFiles`/`updateId`, `StateManager` prunes the file's
   `${fileId}_*` idMap entries absent from the new tree (scoped to that file), so
   `matcher` (the Layer-2 filter that re-reads Layer 1) cannot resolve a ghost and mask
   the pruning.

**Which layer each edit tackles / responsibilities afterward:**

- **Layer 1** — still the source of record; gains per-file id pruning (edit 3). The
  on-the-fly update channel is untouched (§8.2).
- **Layer 2** — stops being append-only (edits 1–2); becomes a pure structural
  derivation of Layer 1 refreshed at each collection, plus a thin view-state overlay
  (`expanded`) and ordering index.
- **Layer 3** — unchanged: a corrected `uiEntries` falls out of the corrected Layer 2
  via the existing filter/flatten.

**The one alternative worth naming:** the deepest form of the same idea is to **delete
Layer 2 entirely** (§2.1, §5 item 1) and derive the view directly from Layer 1 with a
side-map for `expanded`. That removes the bug class by construction but is a large
rewrite. The per-file reconcile above is the canonical *mergeable* fix; dropping the
mirror is the canonical *end state*.

### 8.1 The fix must be per-file scoped (partial re-run semantics)

A natural worry: "if we reconcile on collection, won't a single-file re-run wipe the
other files' results from the previous run?" No — because the server's collection and
finish events are **already scoped to the re-run subset**, so a per-file reconciliation
is inherently safe. Verified end-to-end:

- `onCollected` is emitted **per module**:
  `onTestModuleCollected(testModule) → client.onCollected([testModule.task])`
  ([api/setup.ts:226-234](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/api/setup.ts#L226)).
  A single-file/single-test re-run collects only the re-run module(s), so `onCollected`
  fires only for that file. Even `rerunTask` re-runs the whole containing file module
  (`specifications = [reportedTask.toTestSpecification()]`,
  [core.ts:1260](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/node/core.ts#L1260)), so the event always carries the file's
  **complete new structure**.
- `onFinished` is likewise subset-scoped: `onTestRunEnd`'s modules are
  `specifications.map(spec => spec.testModule)`
  ([test-run.ts:124](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/node/test-run.ts#L124)) — only the re-run specs.
- **Why other files' results survive today:** re-run events only touch the re-run
  file's `idMap` entries; untouched files keep their `Task` objects (with results), and
  the append-only mirror keeps their nodes. The client's `endRun` re-syncs the whole
  tree from `idMap` (`traverseFiles` over all `root.tasks`), but since `idMap` for other
  files is unchanged, they render correctly.

Implications for the fix:

- Key reconciliation off the **files present in `onCollected`** and rebuild only those
  files' subtrees. This rebuilds exactly the re-run file and leaves every other file —
  and its results — untouched, matching current preservation semantics.
- Timing is favorable: `onCollected` arrives *during* collection, before results, with
  the authoritative new structure — the right moment to drop stale positions and fix
  test↔suite type changes. `onTaskUpdate` then fills results into the reconciled nodes.
- The anti-pattern to avoid is a **global** "clear the whole mirror on collection",
  which *would* wipe other files' results. The current bug is not that a rebuild is
  unsafe; it is that there is **no per-file rebuild at all** (§6.3), so the mirror only
  ever grows.

### 8.2 The fix must preserve the on-the-fly update channel

`onTaskUpdate` and the artifact/annotation/log events are *supposed* to keep mutating
model entities continuously as a test progresses (§6.4). The proposed reconciliation
does not disturb that channel, because live data lives on the idMap `Task`, not the
mirror:

- Reconciliation runs at `onCollected`, i.e. **before** any result/log/artifact for the
  new run exists — so there is no accumulated live data to lose for the re-run file (it
  was just freshly collected). Other files' idMap `Task`s are never passed to the event,
  so their streamed data persists (§8.1).
- After reconciliation, the existing per-tick sync
  (`traverseReceivedFiles → createOrUpdateNode`) keeps projecting progress into the
  mirror exactly as today, and `updateTasks`/`updateUserLog`/`recordTestArtifact`
  continue to mutate idMap unchanged. The fix only changes *structure* (which nodes
  exist), never the live-update flow.

Two constraints the implementation must respect:

1. idMap pruning (from §8) must be **scoped to the re-collected file's id-subtree**
   (`${fileId}_*`), never global, otherwise it would wipe other files' streamed
   logs/artifacts/results.
2. The subtree rebuild should **carry over `expanded`/opened view-state for surviving
   ids**, so reconciliation repairs structure without collapsing the user's tree or
   discarding the projection that a later tick would otherwise re-fill.

### 8.3 File-level structure (add / remove / rename) is a SECOND channel that §8 does not fix

§8 handles structure changes *within a file that re-runs*. File-level structure — a test
file being added, removed, or renamed on disk — is a separate channel, and the §8
`onCollected` reconcile cannot cover removal/rename because a deleted file never
produces a run to reconcile against.

What the server does on each FS event
([watcher.ts](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/node/watcher.ts)):

- **Add** — `onFileCreate → scheduleRerun`: the new file runs, so the UI picks it up via
  `onCollected`/`onTaskUpdate` and self-heals (BUG-1 only bites removal, not addition).
- **Change** — re-run of that file, covered by the §8 per-file reconcile.
- **Remove** — `onFileDelete`
  ([watcher.ts:100-113](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/node/watcher.ts#L100)): deletes the file from `filesMap` and calls
  `report('onTestRemoved', path)` — but there is **no re-run**.
- **Rename** = remove + add: the new file runs (added), the old path only emits
  `onTestRemoved`.

The removal gap has three compounding causes:

1. A deleted file produces **no run**, so no collection/update/finish event ever mentions
   it — nothing for §8 to key off.
2. The browser UI **cannot watch the filesystem** (unlike the VSCode extension, which
   uses its own `vscode.createFileSystemWatcher`; see VSCODE-ANALOGY.md §File watching).
3. The server *does* know and emits the `onTestRemoved(path)` reporter hook
   ([reporter.ts:20](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/node/types/reporter.ts#L20),
   base impl [base.ts:538](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/node/reporters/base.ts#L538)), but that event is **not in
   `WebSocketEvents`** ([api/types.ts:68-83](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/api/types.ts#L68)) and **not forwarded by
   `WebSocketReporter`** ([api/setup.ts:217](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/api/setup.ts#L217)). It never reaches the UI.

Net effect: **removing or renaming a test file leaves a ghost file node in the explorer
for the rest of the session** (the file-level counterpart of BUG-1, but not fixable by
§8).

**Action — forward `onTestRemoved` to WS clients** (event-driven, mirrors the VSCode
extension's `removeFile`). Concretely:

1. Add `onTestRemoved?: (path?: string) => void` to `WebSocketEvents`
   ([api/types.ts:68](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/api/types.ts#L68)).
2. Implement it in `WebSocketReporter` (forward `client.onTestRemoved(path)`) and add
   `'onTestRemoved'` to the birpc `eventNames`
   ([api/setup.ts:193-199](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/api/setup.ts#L193)).
3. Handle it in the ws-client (`ws.ts` `functions`): `client.state.filesMap.delete(path)`
   plus idMap cleanup for that file's subtree, then forward to `handlers.onTestRemoved`.
4. Handle it in the UI (`client/index.ts`) → new `explorerTree.removeFile(path)` that
   prunes matching `root.tasks`/`nodes` entries (there can be several file nodes per path,
   one per project — key by `filepath`) and rebuilds `uiEntries`.

Note the argument is a **file path**, not a task id (watcher passes the slashed
filepath), so the UI must map path → file node(s), not `nodes.get(id)`. This item is
independent of and complementary to §8: §8 fixes intra-file ghosts; §8.3 fixes
whole-file ghosts.
