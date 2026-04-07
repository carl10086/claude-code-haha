# 跳过 TUI 的 REPL 编排调试计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 新增一个最外层 `debug/` 脚本，跳过 Ink/TUI 渲染，但尽量原样复用 `REPL.tsx` 里的非渲染主链路，用固定的两轮输入来调试真实的 REPL 编排逻辑。

**架构：** 不修改 [`src/query.ts`](/Users/carlyu/soft/projects/claude-code-haha/src/query.ts)、[`src/screens/REPL.tsx`](/Users/carlyu/soft/projects/claude-code-haha/src/screens/REPL.tsx) 等业务代码；只在 `debug/` 下写一个“驱动器”脚本。该脚本允许直接抄用 `REPL.tsx` 中的非渲染逻辑，包括 `onQueryEvent`、`onQueryImpl`、`onQuery` 所依赖的消息推进和 query 调用流程，但不自己重新设计一套新逻辑。

**技术栈：** Bun、TypeScript、[`src/screens/REPL.tsx`](/Users/carlyu/soft/projects/claude-code-haha/src/screens/REPL.tsx)、[`src/utils/handlePromptSubmit.ts`](/Users/carlyu/soft/projects/claude-code-haha/src/utils/handlePromptSubmit.ts)、[`src/utils/messages.ts`](/Users/carlyu/soft/projects/claude-code-haha/src/utils/messages.ts)、[`debug/queryloop-spy.ts`](/Users/carlyu/soft/projects/claude-code-haha/debug/queryloop-spy.ts)。

---

## 背景

当前的 [`debug/queryloop-spy.ts`](/Users/carlyu/soft/projects/claude-code-haha/debug/queryloop-spy.ts) 已经证明 `query()` / `queryLoop()` 这一层可以单独跑通，但它切入点仍然偏低，更像“直接调内核”。

原始 IDE 需求是：**因为 TUI 不好 debug，所以想跳过渲染层，但继续观察真实的 REPL 编排链路。**

现在已经明确两点：

1. 不能改 `src` 里的代码。
2. 不能自己重写一套 session / REPL 逻辑，否则 debug 的将是我们自己的 harness，而不是 Claude Code 现有逻辑。

所以这次计划的核心原则是：

- `src` 不动
- 只新增 `debug/` 脚本
- 可以“抄” `REPL.tsx` 里的非渲染逻辑
- 不能自己发明新的编排流程

## 目标链路

这次要模拟的不是完整 TUI，而是 TUI 里最关键的非渲染主链路：

```text
固定两轮输入
  -> handlePromptSubmit
  -> processUserInput
  -> onQuery
  -> onQueryImpl
  -> query()
  -> onQueryEvent
  -> handleMessageFromStream
  -> 打印输出
```

真正跳过的部分只有：

- Ink root
- PromptInput 渲染
- Messages 渲染
- Spinner 渲染
- keybinding / terminal focus / viewport 之类的终端交互细节

## 可直接抄用的源码位置

- [`src/screens/REPL.tsx`](/Users/carlyu/soft/projects/claude-code-haha/src/screens/REPL.tsx)
  - `onQueryEvent`
  - `onQueryImpl`
  - `onQuery`
- [`src/utils/handlePromptSubmit.ts`](/Users/carlyu/soft/projects/claude-code-haha/src/utils/handlePromptSubmit.ts)
  - `handlePromptSubmit`
  - 内部 `executeUserInput` 路径
- [`src/utils/messages.ts`](/Users/carlyu/soft/projects/claude-code-haha/src/utils/messages.ts)
  - `handleMessageFromStream`
- [`debug/queryloop-spy.ts`](/Users/carlyu/soft/projects/claude-code-haha/debug/queryloop-spy.ts)
  - 初始化 appState / tools / toolUseContext 的方式

## 任务 1：确定“抄”的边界

**涉及文件：**
- 参考：[`src/screens/REPL.tsx`](/Users/carlyu/soft/projects/claude-code-haha/src/screens/REPL.tsx)
- 参考：[`src/utils/handlePromptSubmit.ts`](/Users/carlyu/soft/projects/claude-code-haha/src/utils/handlePromptSubmit.ts)

- [ ] **Step 1：只保留 REPL 中和单轮执行直接相关的逻辑**

保留范围：

```ts
onQueryEvent
onQueryImpl
onQuery
handlePromptSubmit
```

不保留范围：

```ts
PromptInput
Messages
Spinner
Ink hooks
terminal focus
viewport / scroll
keybindings
remote mode
teammate mode
通知/UI 对话框
```

- [ ] **Step 2：明确脚本只模拟固定两轮输入**

```ts
const INPUTS = [
  '第一轮输入',
  '第二轮输入',
]
```

这样第一版先验证“跳过 TUI 后，REPL 编排链路是否仍然可 debug”，而不是先做完整 CLI。

- [ ] **Step 3：确认不改 `src`**

本计划只允许新增：

```text
debug/headless-repl-driver.ts
```

不允许修改：

```text
src/screens/REPL.tsx
src/utils/handlePromptSubmit.ts
src/query.ts
.vscode/launch.json
```

## 任务 2：实现最小驱动脚本

**涉及文件：**
- Create: `debug/headless-repl-driver.ts`

- [ ] **Step 1：在脚本里初始化最小运行环境，但不重新设计业务逻辑**

```ts
enableConfigs()

const appState = getDefaultAppState()
const toolPermissionContext = getEmptyToolPermissionContext()
const tools = getTools(toolPermissionContext)
const readFileState = createFileStateCacheWithSizeLimit(READ_FILE_STATE_CACHE_SIZE)
const queryGuard = new QueryGuard()
```

这里可以参考 [`debug/queryloop-spy.ts`](/Users/carlyu/soft/projects/claude-code-haha/debug/queryloop-spy.ts) 的初始化方式。

- [ ] **Step 2：在脚本中“抄” REPL 的消息推进逻辑**

核心要求：

```ts
// 直接参考 REPL.tsx 的 onQueryEvent
handleMessageFromStream(...)
```

消息新增、tombstone 删除、streaming text、streaming tool uses 的处理顺序，尽量照着 [`src/screens/REPL.tsx`](/Users/carlyu/soft/projects/claude-code-haha/src/screens/REPL.tsx) 来，不要自行改写成新结构。

- [ ] **Step 3：在脚本中“抄” REPL 的 query 编排逻辑**

核心要求：

```ts
// 直接参考 REPL.tsx 的 onQuery / onQueryImpl
setMessages(...)
getSystemPrompt(...)
getUserContext()
getSystemContext()
buildEffectiveSystemPrompt(...)
for await (const event of query(...)) {
  onQueryEvent(event)
}
```

这一步的重点不是“抽象出最优代码”，而是保证你看到的断点位置和 REPL 真逻辑尽量一致。

- [ ] **Step 4：使用 `handlePromptSubmit` 驱动每一轮输入**

```ts
for (const input of INPUTS) {
  await handlePromptSubmit({
    input,
    helpers,
    queryGuard,
    commands,
    onInputChange,
    setPastedContents,
    setToolJSX,
    getToolUseContext,
    messages,
    mainLoopModel,
    ideSelection: undefined,
    setUserInputOnProcessing,
    setAbortController,
    onQuery,
    setAppState,
    querySource: getQuerySourceForREPL(),
    onBeforeQuery: undefined,
    canUseTool,
  })
}
```

这里要保留 `handlePromptSubmit -> processUserInput -> onQuery` 这条真实链路。

- [ ] **Step 5：输出每轮关键结果，方便断点和比对**

脚本至少打印：

```ts
=== input ===
=== processed / appended messages ===
=== stream events ===
=== final messages ===
```

打印的目的是辅助 debug，不是另起一套展示系统。

## 任务 3：验证这真的是“REPL 非渲染调试器”

**涉及文件：**
- Verify: `debug/headless-repl-driver.ts`

- [ ] **Step 1：运行脚本并确认两轮都能进入真实 query 链路**

运行：

```bash
bun --preload ./preload.ts --env-file=.env debug/headless-repl-driver.ts
```

预期：

```text
第一轮输入进入 handlePromptSubmit
第一轮进入 query()
第一轮输出 assistant / tool / system 相关消息
第二轮继续使用同一套 REPL 编排逻辑
第二轮能看到前一轮留下的上下文效果
```

- [ ] **Step 2：确认断点打在“抄来的 REPL 非渲染逻辑”上是有意义的**

推荐断点位置：

```ts
handlePromptSubmit
onQuery
onQueryImpl
onQueryEvent
handleMessageFromStream
```

预期：这些断点对应的都是 Claude Code 现有逻辑，而不是我们自己新发明的流程。

- [ ] **Step 3：确认第一版不引入额外范围**

本次不做：

```text
完整 CLI
无限输入循环
launch.json
src 抽象重构
测试补齐
TUI 渲染模拟
```

## 自查

**需求覆盖：** 这份计划回到了原始需求：因为 TUI 不好 debug，所以只跳过渲染层，保留 REPL 的非渲染主链路。

**复杂度控制：** 相比前一版，这一版只做一个 `debug/` 脚本，不改 `src`，不做抽象层，不补 launch 配置，不写额外测试。

**真实性保证：** 这份计划明确要求“抄现有逻辑，不自己写新逻辑”，避免把调试对象变成我们自己发明的 harness。
