# Queryloop Spy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-file non-TTY script at `debug/queryloop-spy.ts` that reuses the real `processUserInput()` and `query()` flow to drive `queryLoop()` without modifying existing core code.

**Architecture:** The spike is an external driver, not a replacement REPL. It builds a minimal `ToolUseContext` and app-state shim, feeds a fixed input string into `processUserInput()`, then, if `shouldQuery` is true, constructs `QueryParams` and streams real `query()` events to stdout. Per current preference, do not include git commit steps in execution.

**Tech Stack:** Bun, TypeScript, existing `src/utils/processUserInput/processUserInput.ts`, `src/query.ts`, `src/Tool.ts`, `src/tools.ts`, `src/constants/prompts.ts`, and `src/context.ts`

---

## File Structure

**Create:**
- `debug/queryloop-spy.ts` - Single-file feasibility spike. Holds fixed input, minimal state shim, minimal `ToolUseContext`, `processUserInput()` call, `query()` call, and stdout event dumping.

**Reference only:**
- `docs/superpowers/specs/2026-04-03-queryloop-spy-design.md` - Approved design spec
- `src/utils/processUserInput/processUserInput.ts` - Real input-to-message bridge
- `src/query.ts` - Real `query()` / `queryLoop()` path
- `src/entrypoints/mcp.ts` - Minimal non-REPL `ToolUseContext` precedent
- `src/screens/REPL.tsx` - Real REPL reference for `getToolUseContext()` and `onQuery()`
- `src/Tool.ts` - `ToolUseContext` and empty permission context primitives
- `src/tools.ts` - Tool assembly
- `src/constants/prompts.ts` - `getSystemPrompt()`
- `src/context.ts` - `getUserContext()` and `getSystemContext()`

## Task 1: Build the stage-1 spy that reaches `processUserInput()`

**Files:**
- Create: `debug/queryloop-spy.ts`
- Reference: `src/utils/processUserInput/processUserInput.ts`
- Reference: `src/entrypoints/mcp.ts`
- Reference: `src/Tool.ts`
- Reference: `src/tools.ts`
- Reference: `src/state/AppStateStore.ts`

- [ ] **Step 1: Create the initial single-file spy skeleton**

Write `debug/queryloop-spy.ts` with this content:

```ts
import { inspect } from 'node:util'

import { getEmptyToolPermissionContext, type ToolUseContext } from '../src/Tool.js'
import { query } from '../src/query.js'
import { getDefaultAppState } from '../src/state/AppStateStore.js'
import { getSystemPrompt } from '../src/constants/prompts.js'
import { getUserContext, getSystemContext } from '../src/context.js'
import { getTools } from '../src/tools.js'
import { createAbortController } from '../src/utils/abortController.js'
import {
  READ_FILE_STATE_CACHE_SIZE,
  createFileStateCacheWithSizeLimit,
} from '../src/utils/fileStateCache.js'
import { processUserInput } from '../src/utils/processUserInput/processUserInput.js'
import { getQuerySourceForREPL } from '../src/utils/promptCategory.js'

const INPUT =
  'Explain how the queryLoop in this repository processes a single user turn.'

const MODEL =
  process.env.ANTHROPIC_MODEL ??
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ??
  'sonnet'

let appState = getDefaultAppState()

const setAppState = (updater: (prev: typeof appState) => typeof appState) => {
  appState = updater(appState)
}

const readFileState = createFileStateCacheWithSizeLimit(READ_FILE_STATE_CACHE_SIZE)
const abortController = createAbortController()
const toolPermissionContext = getEmptyToolPermissionContext()
const tools = getTools(toolPermissionContext)
const querySource = getQuerySourceForREPL()

const canUseTool = async <Input extends Record<string, unknown>>(
  _tool: unknown,
  input: Input,
) => ({
  behavior: 'allow' as const,
  updatedInput: input,
})

const print = (label: string, value: unknown) => {
  console.log(`\n=== ${label} ===`)
  console.log(inspect(value, { depth: 4, colors: true }))
}

async function main(): Promise<void> {
  const toolUseContext: ToolUseContext = {
    abortController,
    options: {
      commands: [],
      debug: true,
      mainLoopModel: MODEL,
      tools,
      verbose: false,
      thinkingConfig: { type: 'disabled' },
      mcpClients: [],
      mcpResources: {},
      isNonInteractiveSession: true,
      agentDefinitions: { activeAgents: [], allAgents: [] },
    },
    readFileState,
    getAppState: () => appState,
    setAppState,
    messages: [],
    setInProgressToolUseIDs: () => {},
    setResponseLength: () => {},
    updateFileHistoryState: () => {},
    updateAttributionState: () => {},
  }

  const processed = await processUserInput({
    input: INPUT,
    preExpansionInput: INPUT,
    mode: 'prompt',
    setToolJSX: () => {},
    context: toolUseContext,
    messages: [],
    querySource,
    canUseTool,
  })

  print('processed.messages', processed.messages)
  print('processed.shouldQuery', processed.shouldQuery)
  print('processed.allowedTools', processed.allowedTools)
}

void main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
```

- [ ] **Step 2: Run the stage-1 spy**

Run:

```bash
bun --env-file=.env debug/queryloop-spy.ts
```

Expected:
- the script starts without TTY errors
- `processed.messages` prints at least one message object
- `processed.shouldQuery` prints a boolean

- [ ] **Step 3: Fix any missing required context fields by copying only the minimal shape from existing non-REPL entrypoints**

If step 2 fails because `processUserInput()` reads additional `ToolUseContext` fields, patch `debug/queryloop-spy.ts` by adding only the missing no-op fields already used in non-REPL code paths. Use `src/entrypoints/mcp.ts` as the baseline pattern.

For example, extend the context object like this if required:

```ts
  const toolUseContext: ToolUseContext = {
    abortController,
    options: {
      commands: [],
      debug: true,
      mainLoopModel: MODEL,
      tools,
      verbose: false,
      thinkingConfig: { type: 'disabled' },
      mcpClients: [],
      mcpResources: {},
      isNonInteractiveSession: true,
      agentDefinitions: { activeAgents: [], allAgents: [] },
    },
    readFileState,
    getAppState: () => appState,
    setAppState,
    messages: [],
    setInProgressToolUseIDs: () => {},
    setResponseLength: () => {},
    updateFileHistoryState: () => {},
    updateAttributionState: () => {},
    setToolJSX: () => {},
    addNotification: () => {},
    appendSystemMessage: () => {},
  }
```

- [ ] **Step 4: Re-run the stage-1 spy and verify `processUserInput()` is stable**

Run:

```bash
bun --env-file=.env debug/queryloop-spy.ts
```

Expected:
- no crash during `processUserInput()`
- `processed.messages` is visible
- this confirms the non-TTY user-input bridge works

## Task 2: Extend the same file to enter the real `query()` path

**Files:**
- Modify: `debug/queryloop-spy.ts`
- Reference: `src/query.ts`
- Reference: `src/constants/prompts.ts`
- Reference: `src/context.ts`
- Reference: `src/utils/promptCategory.ts`

- [ ] **Step 1: Add a simple event dumper and guard on `shouldQuery`**

Update `debug/queryloop-spy.ts` so it stops cleanly when `shouldQuery` is false and prints streamed query events when it is true.

Replace the `main()` body with:

```ts
async function main(): Promise<void> {
  const toolUseContext: ToolUseContext = {
    abortController,
    options: {
      commands: [],
      debug: true,
      mainLoopModel: MODEL,
      tools,
      verbose: false,
      thinkingConfig: { type: 'disabled' },
      mcpClients: [],
      mcpResources: {},
      isNonInteractiveSession: true,
      agentDefinitions: { activeAgents: [], allAgents: [] },
    },
    readFileState,
    getAppState: () => appState,
    setAppState,
    messages: [],
    setInProgressToolUseIDs: () => {},
    setResponseLength: () => {},
    updateFileHistoryState: () => {},
    updateAttributionState: () => {},
    setToolJSX: () => {},
    addNotification: () => {},
    appendSystemMessage: () => {},
  }

  const processed = await processUserInput({
    input: INPUT,
    preExpansionInput: INPUT,
    mode: 'prompt',
    setToolJSX: () => {},
    context: toolUseContext,
    messages: [],
    querySource,
    canUseTool,
  })

  print('processed.messages', processed.messages)
  print('processed.shouldQuery', processed.shouldQuery)
  print('processed.allowedTools', processed.allowedTools)

  if (!processed.shouldQuery) {
    console.log('\n=== query skipped ===')
    return
  }

  const queryMessages = processed.messages
  toolUseContext.messages = queryMessages

  const systemPrompt = await getSystemPrompt(tools, MODEL, [], [])
  const userContext = await getUserContext()
  const systemContext = await getSystemContext()

  print('systemPrompt.length', systemPrompt.length)
  print('queryMessages.length', queryMessages.length)

  for await (const event of query({
    messages: queryMessages,
    systemPrompt,
    userContext,
    systemContext,
    canUseTool,
    toolUseContext: {
      ...toolUseContext,
      renderedSystemPrompt: systemPrompt,
      messages: queryMessages,
    },
    querySource,
  })) {
    print('query.event', event)
  }
}
```

- [ ] **Step 2: Run the stage-2 spy**

Run:

```bash
bun --env-file=.env debug/queryloop-spy.ts
```

Expected:
- either `query skipped` if preprocessing blocks the turn
- or at least one printed `query.event`

- [ ] **Step 3: Verify that the event stream comes from the real `query()` generator**

Set the input to a plain prompt that should not be treated as a slash command:

```ts
const INPUT =
  'Summarize the role of processUserInput and queryLoop in this repository.'
```

Run:

```bash
bun --env-file=.env debug/queryloop-spy.ts
```

Expected:
- `processed.shouldQuery` is `true`
- at least one of the printed events has a `type` field from `src/query.ts`, such as a stream-start or message event

## Task 3: Make the spike useful for repeat debugging sessions

**Files:**
- Modify: `debug/queryloop-spy.ts`

- [ ] **Step 1: Add top-of-file knobs instead of building a CLI**

Keep the script non-CLI and easy to edit by adding a few constants near the top:

```ts
const INPUT =
  'Summarize the role of processUserInput and queryLoop in this repository.'

const STOP_AFTER_PREPROCESS = false
const MAX_EVENTS = 20
```

- [ ] **Step 2: Honor the debug knobs in the query loop**

Update the query section like this:

```ts
  if (!processed.shouldQuery || STOP_AFTER_PREPROCESS) {
    console.log('\n=== query skipped ===')
    return
  }

  let eventCount = 0

  for await (const event of query({
    messages: queryMessages,
    systemPrompt,
    userContext,
    systemContext,
    canUseTool,
    toolUseContext: {
      ...toolUseContext,
      renderedSystemPrompt: systemPrompt,
      messages: queryMessages,
    },
    querySource,
  })) {
    print(`query.event.${eventCount}`, event)
    eventCount += 1

    if (eventCount >= MAX_EVENTS) {
      console.log('\n=== stopping after MAX_EVENTS ===')
      break
    }
  }
```

- [ ] **Step 3: Run a preprocess-only smoke check**

Set:

```ts
const STOP_AFTER_PREPROCESS = true
```

Run:

```bash
bun --env-file=.env debug/queryloop-spy.ts
```

Expected:
- prints processed message data
- exits before entering `query()`

- [ ] **Step 4: Run a full query smoke check**

Set:

```ts
const STOP_AFTER_PREPROCESS = false
const MAX_EVENTS = 20
```

Run:

```bash
bun --env-file=.env debug/queryloop-spy.ts
```

Expected:
- prints preprocess output
- prints real query events
- exits after hitting `MAX_EVENTS` or normal completion

## Self-Review

### Spec coverage
- The plan creates a new standalone file outside the existing entrypoints.
- It does not modify existing core TTY, REPL, or agent files.
- It drives the real `processUserInput()` and `query()` path.
- It keeps the first version as a single-file spike instead of a broader CLI or directory structure.

### Placeholder scan
- No `TBD`, `TODO`, or deferred implementation language remains in the execution steps.
- Every run step includes an exact command and expected outcome.

### Type consistency
- The plan consistently uses `ToolUseContext`, `processUserInput()`, `query()`, `getSystemPrompt()`, `getUserContext()`, and `getSystemContext()` from the existing codebase.
- The permissive tool gate is consistently modeled as an `allow` decision with `updatedInput`.
