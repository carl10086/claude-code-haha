/** Minimal globals for Bun + Node-compat in this repo's tsconfig (bun-types only). */
declare const Bun: { inspect: (value: unknown, options?: object) => string }
declare const process: { exit: (code?: number) => void }

import {
  getEmptyToolPermissionContext,
  type ToolUseContext,
} from '../src/Tool.js'
import { getSystemPrompt } from '../src/constants/prompts.js'
import { getSystemContext, getUserContext } from '../src/context.js'
import { query } from '../src/query.js'
import { getDefaultAppState } from '../src/state/AppStateStore.js'
import { getTools } from '../src/tools.js'
import { createAbortController } from '../src/utils/abortController.js'
import { enableConfigs } from '../src/utils/config.js'
import {
  READ_FILE_STATE_CACHE_SIZE,
  createFileStateCacheWithSizeLimit,
} from '../src/utils/fileStateCache.js'
import { getMainLoopModel } from '../src/utils/model/model.js'
import {
  processUserInput,
  type ProcessUserInputBaseResult,
  type ProcessUserInputContext,
} from '../src/utils/processUserInput/processUserInput.js'
import { getQuerySourceForREPL } from '../src/utils/promptCategory.js'
import { buildEffectiveSystemPrompt } from '../src/utils/systemPrompt.js'

type Message = ProcessUserInputBaseResult['messages'][number]

/** Edit these knobs between debug sessions (no CLI). */
const INPUT =
  '/Users/carlyu/soft/projects/claude-code-haha/README.md 总结一下'
/** When true, skip `query()` after preprocessing (fast, no API stream). */
const STOP_AFTER_PREPROCESS = false
/** Stop after this many `query` stream events; `0` or `Infinity` = no cap. */
const MAX_EVENTS = 100000

const inspect = (value: unknown, options?: { depth?: number; colors?: boolean }) =>
  Bun.inspect(value, options)

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

function buildProcessUserInputContext(priorMessages: Message[]): ProcessUserInputContext {
  const base: ToolUseContext = {
    abortController,
    options: {
      commands: [],
      debug: true,
      mainLoopModel: getMainLoopModel(),
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
    messages: priorMessages,
    setInProgressToolUseIDs: () => {},
    setResponseLength: () => {},
    updateFileHistoryState: () => {},
    updateAttributionState: () => {},
  }

  return {
    ...base,
    options: {
      ...base.options,
      ideInstallationStatus: null,
      theme: 'dark',
    },
    setMessages: (updater: (prev: Message[]) => Message[]) => {
      const next = updater(priorMessages)
      priorMessages.length = 0
      priorMessages.push(...next)
    },
    onChangeAPIKey: () => {},
  } as ProcessUserInputContext
}

function buildQueryToolUseContext(
  base: ProcessUserInputContext,
  messagesForQuery: Message[],
): ToolUseContext {
  return {
    ...base,
    messages: messagesForQuery,
  }
}

async function main(): Promise<void> {
  enableConfigs()

  const priorMessages: Message[] = []
  const toolUseContext = buildProcessUserInputContext(priorMessages)

  const processed = await processUserInput({
    input: INPUT,
    preExpansionInput: INPUT,
    mode: 'prompt',
    setToolJSX: () => {},
    context: toolUseContext,
    messages: priorMessages,
    querySource,
    canUseTool,
  })

  print('processed.messages', processed.messages)
  print('processed.shouldQuery', processed.shouldQuery)
  print('processed.allowedTools', processed.allowedTools)

  if (!processed.shouldQuery) {
    console.log('\nquery skipped (processed.shouldQuery is false)')
    return
  }
  if (STOP_AFTER_PREPROCESS) {
    console.log('\nquery skipped (STOP_AFTER_PREPROCESS is true)')
    return
  }

  const messagesForQuery: Message[] = [...priorMessages, ...processed.messages]
  const mainLoopModel = getMainLoopModel()

  const [defaultSystemPrompt, baseUserContext, systemContext] = await Promise.all([
    getSystemPrompt(
      tools,
      mainLoopModel,
      Array.from(appState.toolPermissionContext.additionalWorkingDirectories.keys()),
      [],
    ),
    getUserContext(),
    getSystemContext(),
  ])

  const userContext = {
    ...baseUserContext,
  }

  const queryToolUseContext = buildQueryToolUseContext(toolUseContext, messagesForQuery)

  const systemPrompt = buildEffectiveSystemPrompt({
    mainThreadAgentDefinition: undefined,
    toolUseContext: queryToolUseContext,
    customSystemPrompt: undefined,
    defaultSystemPrompt,
    appendSystemPrompt: undefined,
  })

  queryToolUseContext.renderedSystemPrompt = systemPrompt

  console.log('\n=== query stream ===')
  let eventCount = 0
  for await (const event of query({
    messages: messagesForQuery,
    systemPrompt,
    userContext,
    systemContext,
    canUseTool,
    toolUseContext: queryToolUseContext,
    querySource,
  })) {
    eventCount += 1
    console.log('query.event', inspect(event, { depth: 6, colors: true }))
    if (MAX_EVENTS > 0 && Number.isFinite(MAX_EVENTS) && eventCount >= MAX_EVENTS) {
      abortController.abort(`Reached MAX_EVENTS (${MAX_EVENTS})`)
      console.log(
        `\n=== query stream stopped: reached MAX_EVENTS (${MAX_EVENTS}) ===`,
      )
      process.exit(0)
    }
  }
}

void main().catch(error => {
  console.error(error)
  process.exit(1)
})
