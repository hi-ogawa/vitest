# Analogy: how the Vitest VSCode extension syncs test entities

Companion to [REVIEW.md](./REVIEW.md). The VSCode extension solves the *same* problem
as the UI explorer — keep a client-side test tree in sync with the runner's ground-truth
task tree across watch re-runs — and it does so with exactly the reconciliation the
review proposes as the canonical fix (REVIEW §8). This note records the comparison and
the transferable learnings.

Source: [vitest-dev/vscode@78c0a13c](https://github.com/vitest-dev/vscode/tree/78c0a13cde25b32e8a17fb5cb43d424011c852a4). See [REVIEW.md](./REVIEW.md) for the pinned UI explorer source.

## 1. Same shape of problem

Both consume the same server events over birpc — `onTestModuleCollected → onCollected`,
`onTaskUpdate`, `onTestRunEnd/onFinished`, console logs — and both maintain a
client-side tree keyed by the runner's position-based task ids (`${parent.id}_${idx}`).

> Note: the extension consumes the *new* reported entity API only as an event source
> in its worker (`onTestModuleCollected`, `getReportedEntity`), but it unwraps back to
> raw `RunnerTestFile`/`RunnerTask` before RPC (`worker/src/reporter.ts:269`) and its
> model stays `RunnerTestFile`-based. It did **not** migrate its model to
> `TestModule`/`TestCase`. See [MIGRATION-PROSPECT.md](./MIGRATION-PROSPECT.md) for why
> the same boundary applies to `packages/ui`.

| | UI explorer (`packages/ui`) | VSCode extension (`packages/extension`) |
|---|---|---|
| Ground-truth store | `client.state.idMap` / `filesMap` (`StateManager`) | `RunnerTestFile`/`RunnerTask` passed per event (no long-lived mirror of tasks) |
| Client tree | `explorerTree.nodes` + `root.tasks` (`UITaskTreeNode`) | `vscode.TestItem` tree + `flatTestItems: Map<id, TestItem>` |
| View/expansion state | stored on the mirror node (`expanded`) + `openedTreeItems` | owned by VSCode's TestController (item identity ⇒ expansion) |
| Structure sync trigger | **none** (no `onCollected` handler) | **`onCollected` → `collectFile`** |
| Result/live updates | `onTaskUpdate` → `createOrUpdateNode` (per RAF tick) | `onTaskUpdate` → `markResult` on the existing item |

## 2. What the extension does that the explorer does not: reconcile on collection

The extension **does** wire the collection event and reconciles per file:

- `onCollected((file, collecting) => this.tree.collectFile(this.api, file))`
  ([runner.ts:71](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/runner.ts#L71)).
- `collectFile`
  ([testTree.ts:302](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/testTree.ts#L302))
  looks up the file item and calls `collectTasks(tag, data, file.tasks, fileItem)`.
- `collectTasks`
  ([testTree.ts:336](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/testTree.ts#L336))
  is the reconciliation loop. It is a textbook implementation of REVIEW §8's canonical
  fix:

  1. **Collect the current id set:** `const ids = new Set()`, `ids.add(task.id)` per task
     ([testTree.ts:344-347](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/testTree.ts#L344)).
  2. **Fix type changes by drop-and-recreate:** if a cached item exists but its kind
     flipped (suite↔test), delete it from the parent and the flat map, then recreate
     ([testTree.ts:349-361](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/testTree.ts#L349)) —
     precisely REVIEW **BUG-2**'s fix, and it cannot hit the explorer's
     `node.children` crash because it recreates a correctly-shaped item.
  3. **Reuse-by-id otherwise:** `this.flatTestItems.get(task.id) || createTestItem(...)`,
     then update `label`/`range`/`tags` in place, and recurse into children
     ([testTree.ts:359-451](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/testTree.ts#L359)).
  4. **Prune what disappeared:** after the loop,
     `parent.children.forEach(child => if (!ids.has(child.id)) parent.children.delete(child.id))`
     ([testTree.ts:459-462](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/testTree.ts#L459)) —
     precisely REVIEW **BUG-1**'s fix (ghost removal).

- File/folder deletions (watcher-driven) are pruned too via
  `removeFile`/`recursiveDelete`/`cleanupChildren`
  ([testTree.ts:211-253](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/testTree.ts#L211)),
  which also clean the flat maps — the explorer never prunes ghost *files* at all.

So the extension confirms, in shipping code, that the explorer's bugs are not
intrinsic: the same event stream, reconciled per-file at collection, produces a correct
tree.

## 3. Clean separation of structure vs live data (matches REVIEW §6.4 / §8.2)

The extension keeps the two channels strictly separate, which is exactly the property
REVIEW argues the explorer fix must preserve:

- **Structure** is mutated only in `collectFile`/`collectTasks` at `onCollected`.
- **Live results** flow through `onTaskUpdate → markResult` on the *existing* item
  ([runner.ts:54-69](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/runner.ts#L54)),
  looked up by id via `getTestItemByTaskId`.
- **Console logs** flow through `onConsoleLog` into the test run output, keyed by taskId
  ([runner.ts:123](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/runner.ts#L123)).

Because reconciliation reuses items by id, a test that survives a re-run keeps its
`vscode.TestItem` identity, so **VSCode's own expansion/selection state is preserved for
free**. That is the extension's equivalent of REVIEW §8.2's constraint "carry over
`expanded` for surviving ids" — the explorer has to do this manually because it stores
expansion on its own node instead of delegating to a platform tree.

## 4. Per-file scoping is the same, and for the same reason (matches REVIEW §8.1)

`onCollected` carries one file at a time (`onTestModuleCollected → rpc.onCollected(file)`,
[worker/reporter.ts:195-197](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/worker/src/reporter.ts#L195)),
and `collectFile` reconciles only that file's subtree. Other files' items are never
touched, so their prior results survive a single-file re-run — the identical argument
REVIEW §8.1 makes for the explorer. Neither side ever does a global "clear the whole
tree on collection".

## 5. Extra learning the explorer does not handle: dynamic / `test.each`

The extension carries machinery the explorer has no equivalent for: dynamic and
`.each` tests whose names/ids are only known at runtime. `collectTasks` keeps a
`cacheDynamic` per file
([testTree.ts:326-437](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/testTree.ts#L326))
and, crucially, **exempts runtime-collected children from pruning**:

```
cachedDynamicTest.children.forEach((fileId) => {
  // don't remove tests that were collected during runtime
  ids.add(fileId)
})
```
([testTree.ts:392-395](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/testTree.ts#L392)).

Transferable lesson: a "prune everything not in the freshly collected static tree"
reconciler will wrongly delete runtime-generated entities (dynamic/`each`, and by
extension tests added by `test()` calls inside loops that AST collection cannot see).
Any explorer-side reconciliation (REVIEW §8) must decide how to treat runtime-only
tasks — either reconcile against the *runtime* task tree (which the explorer already has
in `idMap`, so this is less of a problem than for the extension's AST path) or exempt
ids seen via `onTaskUpdate` from structural pruning. The explorer's advantage: it
reconciles against the runtime `idMap`, not a static AST pass, so it does not need the
`cacheDynamic` gymnastics — but it must still avoid pruning a task that has streamed
results but was not in the (stale) collected `file.tasks` snapshot.

## 5b. File watching: the extension has a channel the UI structurally cannot have

This is the sharpest divergence, and it is not a code-quality difference but a platform
one (see REVIEW §8.3).

The extension keeps a **direct filesystem watcher**, `ExtensionWatcher`
(`vscode.workspace.createFileSystemWatcher`,
[watcher.ts:49](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/watcher.ts#L49)),
independent of any test run:

- `onDidCreate → getOrCreateFileTestItem` (+ collect if the file is open)
  ([watcher.ts:197](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/watcher.ts#L197)),
- `onDidChange → api.onFileChanged` + re-collect
  ([watcher.ts:149](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/watcher.ts#L149)),
- `onDidDelete → testTree.removeFile / removeFolder`
  ([watcher.ts:140,133](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/watcher.ts#L140)).

It even batches and orders **creates before deletes** so a rename (delete + create)
doesn't transiently orphan parent folders
([watcher.ts:56-66](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/watcher.ts#L56)).
So file add/remove/rename is handled by the extension itself, with no dependence on the
runner emitting anything.

The **browser UI cannot do this** — it has no filesystem access. Its only structural
inputs are the runner's WebSocket events. Adds self-heal (a new file triggers a re-run),
but removals/renames do not (a deleted file never re-runs), and the one server signal
that *would* help — the `onTestRemoved(path)` reporter hook, which vitest core already
emits on unlink
([watcher.ts:100-113](https://github.com/hi-ogawa/vitest/blob/334edef920b35cbb222019090b8abde788a68bff/packages/vitest/src/node/watcher.ts#L100)) —
is **not forwarded over the WebSocket** (REVIEW §8.3). Hence the UI's ghost-file bug has
no in-client fix; it needs the server to forward `onTestRemoved`. The extension never
needed that forward because it watches the disk directly.

Learning: when the client can watch the filesystem, file-level structure is best handled
by the client's own watcher (independent of runs); when it cannot (a remote/browser
client), the *server must push* file lifecycle events, and today it pushes collection and
results but not removal.

## 6. Nuance / possible gap even in the reference impl

The in-place prune loop
([testTree.ts:459-462](https://github.com/vitest-dev/vscode/blob/78c0a13cde25b32e8a17fb5cb43d424011c852a4/packages/extension/src/testTree.ts#L459))
removes the child from `parent.children` but does **not** delete the pruned id (or its
descendants) from `flatTestItems`; only the type-change branch and the file-removal path
(`cleanupChildren`) clean that map. So `flatTestItems` can retain orphaned entries for
tests pruned by a re-collection, which `getTestItemByTaskId` could then resolve to a
detached item. Not confirmed as a live bug (VSCode may tolerate it because the detached
item is no longer in the tree), but it is the same *class* of "flat index vs tree drift"
the explorer review flags — worth remembering that keeping a flat id-map consistent with
a reconciled tree is the recurring hazard in both codebases.

## 7. Takeaways for the explorer fix

1. The canonical fix (REVIEW §8) is validated by shipping code: **handle `onCollected`,
   reconcile per file** with (a) reuse-by-id, (b) drop-and-recreate on type change,
   (c) prune ids absent from the new tree.
2. Keep structure updates (collection) and live updates (`onTaskUpdate`/logs) on
   separate paths, as both codebases do — the explorer already has this split, it just
   lacks the collection path.
3. Preserve view state by preserving node identity for surviving ids (the extension gets
   this from VSCode; the explorer must do it explicitly).
4. Beware runtime-only tasks (dynamic/`each`): do not prune tasks that exist at runtime
   just because they are absent from a stale static snapshot. The explorer reconciling
   against `idMap` (runtime) rather than an AST snapshot sidesteps most of this.
5. Keeping the flat id-map (`nodes` / `flatTestItems`) consistent with the tree on prune
   is the shared failure mode — clean the map on every removal.
