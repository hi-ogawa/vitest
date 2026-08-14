# UI Explorer Data Flow, Ownership, and Scheduling Debt

- Source: [hi-ogawa/vitest@21220422](https://github.com/hi-ogawa/vitest/tree/2122042209a12f1d029f665ad10e16b01aa4c85c) (`ui-explorer-reconcile`)

Companion to [REVIEW.md](./REVIEW.md), [VSCODE-ANALOGY.md](./VSCODE-ANALOGY.md), and [MIGRATION-PROSPECT.md](./MIGRATION-PROSPECT.md). This follow-up grew out of reviewing the implementation for [issue #10670](https://github.com/vitest-dev/vitest/issues/10670) and [PR #10941](https://github.com/vitest-dev/vitest/pull/10941).

## 1. Why this note is separate

`REVIEW.md` records the original three-layer model, confirmed stale-node bugs, and the immediate reconciliation fix. This note keeps the follow-up architecture discussion separate so the original diagnosis remains readable and pinned to its original checkout.

The questions here are broader than the bug:

- Why do `StateManager` and `ExplorerTree` both react to collection and removal events?
- Where is the actual boundary between the source model and its UI projection?
- How does a plain tree mutation reach Vue-rendered state?
- What purpose do the many `queueMicrotask` boundaries serve, and who should own scheduling?
- How can these concerns be improved incrementally without turning a correctness fix into a rewrite?

## 2. Concrete data flow

The current explorer is three mutable stores connected by procedural synchronization:

```text
server / birpc event
  |
  v
StateManager: filesMap + idMap                         Layer 1
  |                         \
  | task lookup              \ same event payload
  v                           v
collector/filter/utils <-> ExplorerTree: root + nodes  Layer 2
  |
  | explicit collect/filter call
  v
module-level Vue refs: uiEntries/uiFiles/etc.           Layer 3
  |
  | shallowRef assignment
  v
Explorer.vue / RecycleScroller
```

### 2.1 Collection

The WebSocket callback first writes the authoritative runner objects to `StateManager`, then forwards the same files through a generic handler ([client/ws.ts:69-72](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/client/ws.ts#L69)). The UI handler then asks `ExplorerTree` to reconcile its structural mirror ([client/index.ts:43-46](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/client/index.ts#L43)).

These are not two equivalent `collectFiles` operations:

- `StateManager.collectFiles` ingests canonical `File`/`Suite`/`Test` objects into `filesMap` and `idMap` ([client/state.ts:53-71](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/client/state.ts#L53)).
- `ExplorerTree.collectFiles` reconciles the structural UI projection in `root` and `nodes` ([explorer/tree.ts:111-138](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/explorer/tree.ts#L111)). A better name is `reconcileFiles`.

The ordering is essential because later explorer work reads tasks back from Layer 1. However, the generic callback shape presents the two writes as peer event consumers rather than one source-update → projection-update transaction.

### 2.2 Result updates

`onTaskUpdate` first mutates Layer 1, then gives the explorer result packs containing changed ids ([client/ws.ts:73-75](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/client/ws.ts#L73)). The explorer records pending ids and its RAF loop reads the current tasks from `client.state.idMap`; it does not independently own result state.

Examples of this cross-layer read are `createOrUpdateSuiteTask` and `createOrUpdateNodeTask` ([explorer/utils.ts:128-162](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/explorer/utils.ts#L128)), filtering ([explorer/filter.ts:307-309](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/explorer/filter.ts#L307)), and summary collection throughout `collector.ts`.

### 2.3 Layer 3 refresh

Layer 2 consists mostly of plain maps, arrays, sets, and node objects. Mutating it is not itself a Vue signal. `ExplorerTree.collect()` calls `runCollect`, which eventually calls `runFilter`; `runFilter` creates a new flat array and assigns `uiEntries.value` ([explorer/filter.ts:22-31](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/explorer/filter.ts#L22)). That shallow-ref assignment is what notifies `Explorer.vue`.

Filtering is not a pure Layer 2 → Layer 3 derivation: it traverses Layer 2 nodes but looks each node up in Layer 1 to evaluate the matcher. The effective derivation is `(Layer 1 + Layer 2) → Layer 3`.

### 2.4 Removal is the exceptional path

A normal run reaches Layer 3 through `onTaskUpdate`/RAF collection and a final `onFinished` collection. Deleting a file emits `onTestRemoved` without a run, so no later event naturally refreshes summary or flat view state. The removal command must clean Layer 1, clean Layer 2, and explicitly request a Layer 3 refresh. This is why deletion exposed both the stale-model bug and the hidden scheduling contract.

## 3. Ownership findings

### 3.1 The two models are defensible, but peer event consumption is not

`StateManager` is the semantic source of truth. `ExplorerTree` is a materialized structural view optimized for expansion, filtering, flattening, and virtual scrolling. Keeping both can be justified by performance and UI-state requirements.

The fragile part is allowing both to appear as independent consumers of transport events. The intended transaction should be explicit:

```ts
const changes = state.applyCollection(files)
explorer.reconcile(changes)
```

The transport should have one orchestration path: update the source of truth, then update projections from the canonical mutation result.

### 3.2 `ExplorerTree` is only a partial facade

The class owns `root`, `nodes`, pending ids, timing, and summary, but much of its behavior lives in free functions that import both `client.state` and the exported `explorerTree` singleton. `collector.ts`, `filter.ts`, and `utils.ts` therefore act as hidden joins between Layers 1 and 2.

The resulting dependency shape is approximately:

```text
ExplorerTree
  -> collector/filter/utils
       -> client.state singleton
       -> explorerTree singleton
       -> Layer 3 module refs
```

The class boundary does not enforce ownership, and the free functions cannot be reasoned about or tested as operations over explicit inputs.

### 3.3 Layer 3 is another application singleton

`uiEntries`, `uiFiles`, `filteredFiles`, search/filter state, and related refs are module-level globals in `explorer/state.ts`. They are synchronized manually with `ExplorerTree`; they are not a declarative reactive projection of it. `ExplorerTree.summary` is instance-owned and reactive, but production still exports only one tree instance.

### 3.4 Naming hides direction

Names such as `StateManager.collectFiles`, `ExplorerTree.collectFiles`, and collector `runCollect` conflate ingestion, projection reconciliation, and view refresh. Directional names would expose the intended pipeline:

- `StateManager.applyCollection`
- `ExplorerTree.reconcileFiles`
- `ExplorerTree.flushView` or `refreshProjection`

Renaming alone does not fix ownership, but it prevents new code from treating these operations as equivalent peers.

## 4. Scheduling findings

The package overview says every explorer operation uses `queueMicrotask` to avoid blocking the main thread ([packages/ui/explorer.md:17](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/explorer.md#L17)). This explanation is technically inaccurate: a microtask runs to completion, and the browser drains the microtask queue before rendering. Splitting a traversal into multiple microtasks does not yield to paint and can starve rendering if microtasks keep enqueueing more work.

The real performance mechanism is the throttled RAF loop, which coalesces result updates and refreshes at roughly 10 FPS. The microtasks mainly provide deferred execution, reentrancy avoidance, and FIFO ordering after preceding state writes. However, the RAF loop is resumed as polling for the duration of a run, so it can invoke collection when no new task is pending. `requestAnimationFrame` is not inherently the problem; the smell is using a continuously active frame loop to implement an event-driven throttle.

Scheduling is currently distributed across layers:

```text
ExplorerTree command
  -> queueMicrotask
     -> runCollect
        -> several queueMicrotask phases
           -> doRunFilter
              -> more queueMicrotask phases
```

This has four costs:

- Correctness depends on implicit microtask ordering rather than an explicit transaction.
- Callers cannot tell when a command has fully reached Layer 3.
- Cheap commands such as expand/collapse become asynchronous without a performance benefit.
- The `collect(..., task = true)` flag exposes scheduling mechanics in the command API.
- The active RAF loop imposes a fixed refresh cadence and can run full summary/filter work on clean ticks.

Scheduling should be owned at one boundary. `ExplorerTree` already owns the RAF loop and projection state, so it is the smallest viable owner; a dedicated scheduler injected into the tree is useful only if the scheduling policy becomes independently substantial.

The target shape is:

```text
event/command
  -> synchronously update source or record projection changes
  -> mark dirty + request one throttled flush
  -> one scheduled flush performs ordered phases
  -> commit Vue refs once
```

Within a flush, reconciliation, result projection, summary calculation, filtering/flattening, and Vue-ref commits should be ordinary synchronous calls in explicit order. New events should only mark the projection dirty; they should not keep a polling loop alive when it is clean. The throttle may use a one-shot RAF to align the eventual commit with paint, but scheduling should remain event-driven and `onFinished` should force a final flush. If a traversal truly exceeds a frame budget, use frame/task chunking with a measurable budget; replacing one microtask with several microtasks is not yielding.

## 5. Incremental plan

### Stage 0: keep PR #10941 narrow and avoid new debt

Goal: land the correctness fix without redesigning pre-existing explorer internals.

- Keep the WebSocket event addition and Layer 1 cleanup required for stale-task and deleted-file correctness.
- Name the new Layer 2 command `reconcileFiles`, not `collectFiles`.
- Keep reconciliation and removal workflows on `ExplorerTree`; do not add them to `collector.ts`.
- Keep shared node mutation explicit, for example `removeNodeSubtree(nodes, node)`, rather than adding another hidden singleton dependency.
- Do not add new `queueMicrotask` boundaries around reconciliation/removal. Perform their model mutations synchronously and use the existing refresh path.
- Preserve the focused watch-mode regression test for removed tests and deleted files.

This stage intentionally leaves existing singleton joins, Layer 3 globals, and collector scheduling untouched.

### Stage 1: establish one projection flush owner

Goal: make ordering explicit without changing data structures.

- Inventory each `queueMicrotask` and classify it as ordering, coalescing, DOM timing, or attempted yielding.
- Add one dirty-aware `requestFlush`/`flush` path owned by `ExplorerTree`; preserve bounded live-update frequency without retaining continuously active RAF polling.
- Make collector/filter/expand/collapse operations synchronous; only the owner schedules them.
- Express flush phases directly: reconcile pending structure, apply changed-task projection, recompute summary, rebuild flat entries, commit refs.
- Remove the `collect(..., task)` scheduling flag.
- Add tests for event ordering, one flush per burst, removal without `onFinished`, and commands issued while a run is active.

Before/after traces should confirm that a burst of `onTaskUpdate` messages still produces bounded view refreshes, clean periods produce no collector passes, `onFinished` forces the final projection, and large-suite responsiveness does not regress.

### Stage 2: make source → projection a transaction

Goal: stop treating Layer 1 and Layer 2 as peer transport subscribers.

- Give `StateManager` mutation methods explicit results describing affected canonical files/tasks and removals.
- Have one client/controller path apply each server event to `StateManager`, then pass that result to `ExplorerTree`.
- Keep transport types out of projection commands where practical.
- Make ordering structural rather than dependent on callback registration and microtask timing.

This stage retains both models; it only clarifies direction and synchronization.

### Stage 3: remove hidden singleton backreferences incrementally

Goal: make dependencies visible without creating a giant class.

- Keep invariant-bearing commands as instance methods.
- Extract only genuinely shared algorithms, and pass narrow explicit inputs such as `nodes`, `root`, canonical task lookup, and view criteria.
- Stop importing `explorerTree` from collector/filter/utils modules one operation at a time.
- Replace direct `client.state` reads with an explicit lookup dependency or canonical inputs supplied by the orchestrator.
- Break the `tree.ts -> operation module -> index.ts -> tree.ts` cycle.

Do not create abstraction interfaces speculatively; introduce a parameter when a migrated operation actually needs it.

### Stage 4: make the Layer 3 commit boundary explicit

Goal: replace scattered Vue-ref writes with one observable projection commit.

- Compute a view snapshot from the canonical task lookup, tree model, and current query/filter state.
- Commit `uiEntries`, `uiFiles`, `filteredFiles`, and summary-related outputs together at the end of a flush.
- Expose refs read-only to components where feasible.
- Decide whether refs belong on an explorer store instance or in a small Vue adapter; either is preferable to operation modules mutating globals directly.

This preserves shallow refs and virtual scrolling. It does not require deep Vue reactivity for the tree.

### Stage 5: improve the structural wire contract

Goal: retire position-based reconciliation hazards at their source.

Follow the partial contract-level migration in [MIGRATION-PROSPECT.md](./MIGRATION-PROSPECT.md): send a serialized structural projection with stable reported ids and explicit children while retaining incremental result updates. This is independent of the ownership cleanup above and should come later because it crosses server/browser contracts.

## 6. Guardrails and success criteria

- Correctness first: deleting tests, suites, and files must remove all Layer 1, Layer 2, summary, and Layer 3 traces in the same logical update.
- Preserve view state for surviving stable ids, including expansion and selection behavior.
- Preserve bounded live-update frequency; do not replace the RAF batching mechanism with synchronous rendering per server event.
- Measure large-suite filtering and watch-update behavior before changing traversal scheduling.
- Avoid a full entity-model rewrite inside scheduler or ownership work.
- Keep each stage independently reviewable and releasable.

The practical sequence is therefore: land reconciliation correctness, consolidate scheduling, make source-to-projection transactions explicit, remove global backreferences, centralize Vue commits, then consider a better wire-level entity contract.
