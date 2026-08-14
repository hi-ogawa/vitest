# UI Config Bootstrap and Strictness Contract

- Source: [hi-ogawa/vitest@21220422](https://github.com/hi-ogawa/vitest/tree/2122042209a12f1d029f665ad10e16b01aa4c85c) (`ui-explorer-reconcile`)

Companion to [REVIEW.md](./REVIEW.md) and [DATAFLOW-AND-SCHEDULING.md](./DATAFLOW-AND-SCHEDULING.md). This is a separate cleanup topic from explorer reconciliation: the UI currently models asynchronous config initialization by weakening the config type for the entire application.

## 1. Current smell

The client exports config as an empty object asserted to be a partial serialized root config:

```ts
export const config = shallowRef<Partial<SerializedRootConfig>>({} as any)
```

See [client/index.ts:81](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/client/index.ts#L81).

This representation combines three problems:

- “Not loaded yet” is represented by a value that looks present but violates the runtime contract.
- `Partial` leaks bootstrap uncertainty into every consumer, including code that only runs after initialization.
- `as any` suppresses the exact mismatch the type system should expose.

The resulting optional chains and defaults are not all domain semantics. Many merely compensate for the fake initial value, for example `config.value.projects?.find(...)`, `config.value.browser?.traceView`, and `config.value.tags || []`.

## 2. Bootstrap ordering is the source

On WebSocket open, the client currently sets connection status to `OPEN` before fetching files/config/errors, initializes projects and the explorer, and assigns `config.value` last ([client/index.ts:175-200](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/client/index.ts#L175)).

```text
socket open
  -> status = OPEN
  -> fetch files/config/errors
  -> initialize explorer and state
  -> assign config
```

This makes “socket connected” and “application ready” indistinguishable. The connection overlay can disappear while config-dependent components still observe the fake empty object.

The desired order is:

```text
socket open
  -> status = bootstrapping
  -> fetch files/config/errors
  -> validate config boundary
  -> install strict config
  -> initialize config-dependent state and explorer
  -> status = ready
```

Static HTML reports should pass through the same installation contract. Their metadata already declares `config: SerializedRootConfig` ([client/static.ts:12-15](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/client/static.ts#L12)).

## 3. Serialized config is already a strict contract

`SerializedRootConfig` extends the resolved serialized config and requires `projects: SerializedConfig[]` ([runtime/config.ts:187-189](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/vitest/src/runtime/config.ts#L187)). Most serialized fields are deliberately concrete, including `browser`, `coverage`, `experimental`, and `api`; optionality remains only where the resolved domain permits it.

The server constructs the root payload from the resolved root project plus every runtime project’s serialized config ([node/core.ts:596-600](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/vitest/src/node/core.ts#L596)). The UI should preserve this contract rather than weakening it after deserialization.

## 4. Project lookup is a relational invariant

The trace-view helper currently returns an optional project because it combines partial config with `Array.find`:

```ts
function getProjectConfigByTest(test: RunnerTestFile) {
  const projectName = test.file.projectName || ''
  return config.value.projects?.find(project => project.name === projectName)
}
```

See [trace-view.ts:224-235](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/trace-view.ts#L224).

The producer establishes a stronger relationship: serialized project configs come from `Vitest.projects`, and test files are produced by those projects. A test that names no serialized project indicates inconsistent client/server or report data. It is not a normal fallback case.

TypeScript cannot infer this relationship from `Array.find`, so one boundary must enforce it:

```ts
function getProjectConfigByTest(test: RunnerTestFile): SerializedConfig {
  const projectName = test.file.projectName || ''
  const project = projectsByName.get(projectName)
  if (!project)
    throw new Error(`Missing config for project "${projectName}"`)
  return project
}
```

Consumers should receive `SerializedConfig`, not propagate `SerializedConfig | undefined`. Falling back to root config masks a broken invariant and makes downstream behavior silently depend on unrelated defaults.

## 5. Target API

Keep absence private to bootstrap and expose strict config only after readiness:

```ts
const configRef = shallowRef<SerializedRootConfig>()

export const config = computed(() => {
  if (!configRef.value)
    throw new Error('UI config accessed before client initialization')
  return configRef.value
})
```

An assertion getter over the ref is also viable and remains reactive when called inside a computed/watch effect. The important properties are:

- The internal ref alone represents `undefined` during bootstrap.
- Config-dependent UI is not mounted or evaluated before readiness.
- Public consumers see `SerializedRootConfig`, not `Partial` or `undefined`.
- Reconnect installs a complete replacement through the same boundary.
- Runtime contract failures report one precise initialization error.

Do not initialize a fabricated “default config.” Defaults belong to server-side config resolution; reproducing them in the UI creates a second source of truth.

## 6. Strict does not mean globally implicit

Fixing bootstrap optionality would make `config.value` trustworthy, but it would not by itself fix utilities that pretend to depend only on their arguments while importing application-global config. This is a separate dependency-transparency problem.

Examples include:

- `isSlowTestTask(task)` reads `config.value.slowTestThreshold` ([explorer/utils.ts:31-42](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/explorer/utils.ts#L31)).
- Explorer filtering reads the same threshold inside `matchState` ([explorer/filter.ts:222-229](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/explorer/filter.ts#L222)).
- `getModuleGraph(data, rootPath)` changes its output based on global `experimental.viteModuleRunner` despite not declaring that input ([module-graph.ts:57-73](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/module-graph.ts#L57)).
- `getLocationString(location)` reads the global root path ([location.ts:10-14](https://github.com/hi-ogawa/vitest/blob/2122042209a12f1d029f665ad10e16b01aa4c85c/packages/ui/client/composables/location.ts#L10)).

These functions are harder to reason about and test because their signatures omit behavior-changing inputs. Strict global config would make the hidden dependency safe to dereference, but it would remain hidden.

The desired boundary is:

- Application composition, Vue components, and stateful controllers may read the config store.
- Domain operations and reusable utilities receive the narrow config-derived value or policy they actually need.
- The caller that owns an operation/flush reads config once and passes a consistent snapshot through that operation.

Examples:

```ts
isSlowTestTask(task, slowTestThreshold)
matchState(task, filter, slowTestThreshold)
getModuleGraph(data, rootPath, viteModuleRunner)
getLocationString(location, root)
```

Do not mechanically pass the entire `SerializedRootConfig` into every helper. That merely turns a hidden broad dependency into an explicit broad dependency. Prefer the smallest behaviorally relevant value, or a focused policy object when several values form one concept.

Project lookup is slightly different because it is a stateful application service over the installed project map. It should still be explicit at use boundaries, for example an injected `getProjectConfig(name)` dependency or a controller-level lookup performed before calling a pure operation.

This angle aligns with the explorer ownership cleanup in [DATAFLOW-AND-SCHEDULING.md](./DATAFLOW-AND-SCHEDULING.md): removing singleton access is not only about `explorerTree` and `client.state`; global config is another hidden input crossing those operation modules.

## 7. Runtime validation scope

The RPC and static-report payloads are runtime boundaries despite their TypeScript declarations. Validation should be centralized at config installation, but it does not need to duplicate the full config schema immediately.

The minimum useful guard should verify the shape needed to establish strictness:

- The payload is an object.
- `projects` is an array.
- Every project has the identity needed for lookup.
- Project names are unique if uniqueness is an application invariant.
- Initial files reference known project names.

The typed same-version RPC path should normally satisfy these checks. They primarily turn version skew, malformed report metadata, and server/client drift into explicit bootstrap failures.

## 8. Incremental cleanup plan

### Stage 0: document and test current invariants

- Add tests for delayed config loading so config-dependent UI remains behind the loading state.
- Add tests for live RPC and static-report initialization.
- Add a failing fixture for a file referencing a missing project config and assert one explicit bootstrap/invariant error.

### Stage 1: separate connected from ready

- Introduce an explicit bootstrap/ready state rather than setting `OPEN` before initialization finishes.
- Keep the connection shell available while config-dependent components are not mounted.
- Assign and validate config before initializing available projects, explorer state, navigation, or filters.
- Define reconnect behavior explicitly: retain the old ready view until replacement succeeds, or return to bootstrapping, but do not expose a partial replacement.

### Stage 2: expose strict config

- Replace `Partial<SerializedRootConfig>` and the empty-object assertion with a private optional ref plus a strict computed/accessor.
- Remove optional chaining and fallback defaults that existed only for bootstrap.
- Preserve optionality declared by `SerializedRootConfig`; do not mechanically remove valid domain-level `undefined` fields.

### Stage 3: centralize project lookup

- Build `projectsByName` when installing config.
- Expose a strict lookup that reports an invariant violation for an unknown project.
- Replace ad hoc `.projects.find(...)` calls and remove root-config fallback where a concrete test project is required.
- Validate newly collected files on reconnect/watch additions as well as initial files.

### Stage 4: make utility config dependencies explicit

- Inventory config imports outside components/controllers and classify each use as application state or a hidden function input.
- Pass narrow values such as `slowTestThreshold`, `root`, and `viteModuleRunner` into domain operations.
- Read one config snapshot at the owning command/flush boundary so one operation cannot observe mixed config versions during reconnect.
- Remove global config imports from migrated utility modules.
- Add direct unit tests that vary explicit policy inputs without mutating application singletons.

### Stage 5: simplify consumers

- Remove defensive defaults such as `tags || []` when serialized config guarantees the collection.
- Simplify computed values and function return types that became optional only through `Partial`.
- Review each remaining `?.` or `??` against the serialized type and retain it only when it expresses real behavior.

## 9. Guardrails

- Do not conflate transport connection with application readiness.
- Do not use non-null assertions as a substitute for the runtime boundary check.
- Do not make every consumer handle bootstrap state.
- Do not duplicate server config defaults in the browser.
- Do not treat a strict global config store as permission for utilities to gain hidden config dependencies.
- Do not pass the full root config when a helper depends on one value.
- Fail loudly on relational invariant violations instead of silently selecting root config.
- Preserve deliberate serialized optionality such as fields whose resolved value can genuinely be `undefined`.

The guiding rule is: represent initialization uncertainty once, validate the complete runtime value once, and let the rest of the ready application program against the strict resolved contract.
