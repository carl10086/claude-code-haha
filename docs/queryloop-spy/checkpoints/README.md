# Checkpoints 解析

这份文档是附录，不属于 `queryLoop-spy` 的主线四章。

主线阅读顺序是：

1. `../1-queryloop-入口与状态.md`
2. `../2-queryloop-请求前上下文整理.md`
3. `../3-queryloop-流式阶段与消息组装.md`
4. `../4-queryloop-流后分叉与下一轮闭环.md`

如果你只是想理解 queryLoop 本身，先看主线；这里主要是把项目里各种不同含义的 “checkpoint” 术语拆开。

## 概述：什么是 Checkpoints

这个项目中 "checkpoint" 有**三种完全不同的含义**：

| 类型 | 作用 | 源码位置 |
|------|------|----------|
| **File Checkpoint** | 保存文件的备份，用于回滚到之前的版本 | `src/utils/fileHistory.ts` |
| **Query Profiler Checkpoint** | 性能分析，记录查询管道各阶段耗时 | `src/utils/queryProfiler.ts` |
| **Startup Profiler Checkpoint** | 启动性能分析，记录初始化各阶段耗时 | `src/utils/startupProfiler.ts` |

---

## 1. File Checkpoint（文件检查点）

### 解决的问题

"我想回到上一个版本看看文件长什么样"，或者"我点错了，能不能撤销"。

### 核心概念

```
Turn 1: 用户说"帮我改文件 A"
        → checkpoint 1 保存了文件 A 的备份

Turn 2: 用户说"再改一下文件 B"
        → checkpoint 2 保存了文件 A(新) 和文件 B 的备份

Turn 3: 用户点 /rewind，选择回到 Turn 1
        → 文件 A 被恢复成 Turn 1 时的版本
```

### 关键类型

```typescript
// 每次 checkpoint 保存的内容
type FileHistorySnapshot = {
  messageId: UUID           // 关联到哪个消息
  trackedFileBackups: Record<string, FileHistoryBackup>  // 文件路径 -> 备份
  timestamp: Date
}

// 一个文件备份
type FileHistoryBackup = {
  backupFileName: string | null  // null = 文件当时不存在
  version: number                 // 版本号
  backupTime: Date
}
```

### 备份存储位置

```
{configDir}/file-history/{sessionId}/{hash}@v{n}
```

例如：`~/.config/claude/file-history/sess-abc123/abc123def4@v1`

### 核心函数

| 函数 | 作用 |
|------|------|
| `fileHistoryTrackEdit()` | 在文件被修改前，保存当前内容 |
| `fileHistoryMakeSnapshot()` | 创建一个新的 checkpoint |
| `fileHistoryRewind()` | 回滚到指定消息时的状态 |
| `fileHistoryCanRestore()` | 检查某个消息是否有 checkpoint |

### 执行时机

1. 用户发送消息后 → `fileHistoryMakeSnapshot()`
2. 工具执行文件修改前 → `fileHistoryTrackEdit()`

---

## 2. Query Profiler Checkpoint（查询性能检查点）

### 解决的问题

"为什么这个查询这么慢？哪一步耗时最长？"

### 解决的问题

通过在查询管道的关键节点打点，测量每个阶段的耗时。

### Checkpoint 列表

```
query_user_input_received        ← 开始
query_context_loading_start
query_context_loading_end
query_microcompact_start
query_microcompact_end
query_autocompact_start
query_autocompact_end
query_setup_start
query_setup_end
query_tool_schema_build_start
query_tool_schema_build_end
query_message_normalization_start
query_message_normalization_end
query_client_creation_start
query_client_creation_end
query_api_request_sent           ← 请求发出
query_response_headers_received   ← 收到响应头
query_first_chunk_received        ← 收到第一个 chunk (TTFT)
query_api_streaming_end           ← 流式结束
query_tool_execution_start
query_tool_execution_end
query_recursive_call
query_profile_end
```

### 启用方式

```bash
CLAUDE_CODE_PROFILE_QUERY=1
```

### 输出示例

```
QUERY PROFILING REPORT - Query #1
================================================================================

checkpoint_name                              delta      cumulative
───────────────────────────────────────────────────────────────────────────────
query_user_input_received                        0ms          0ms
query_context_loading_start                    12ms         12ms
query_context_loading_end                      89ms         89ms
query_microcompact_start                       91ms         91ms
query_microcompact_end                         95ms         95ms
query_autocompact_start                        96ms         96ms
query_autocompact_end                          96ms         96ms
query_setup_start                             103ms        103ms
query_setup_end                               234ms        234ms
query_api_request_sent                        312ms        312ms
query_first_chunk_received                     489ms        489ms  ⚠️  SLOW
query_api_streaming_end                       1523ms       1523ms
query_tool_execution_start                   1524ms       1524ms
query_tool_execution_end                     3892ms       3892ms  ⚠️  SLOW
query_profile_end                            3893ms       3893ms

PHASE BREAKDOWN:
  Context loading              89.0ms ████████████████████
  Microcompact                 6.0ms ██
  Autocompact                  0.0ms
  Query setup                131.0ms ██████████████████████████████
  Tool schemas                45.0ms ██████████████████
  Message normalization       12.0ms ████
  Client creation             89.0ms ████████████████████
  Network TTFB               177.0ms ████████████████████████████████████████
  Tool execution            2368.0ms ████████████████████████████████████████████████████████████████████████████████████████████████████████████████
```

### 核心函数

```typescript
queryCheckpoint('checkpoint_name')  // 记录一个检查点
startQueryProfile()                  // 开始一个查询的性能追踪
endQueryProfile()                   // 结束追踪
logQueryProfileReport()              // 输出报告
```

---

## 3. Startup Profiler Checkpoint（启动性能检查点）

### 解决的问题

"Claude Code 启动为什么这么慢？加载了什么东西？"

### Checkpoint 列表

```
profiler_initialized
cli_entry                              ← 入口
main_tsx_imports_loaded
init_function_start
init_function_end
eagerLoadSettings_start
eagerLoadSettings_end
loadSettingsFromDisk_start
loadSettingsFromDisk_end
run_before_parse
run_after_parse
main_after_run
```

### 启用方式

```bash
CLAUDE_CODE_PROFILE_STARTUP=1
```

### 输出位置

```
~/.config/claude/startup-perf/{sessionId}.txt
```

### Phase 定义

```typescript
const PHASE_DEFINITIONS = {
  import_time: ['cli_entry', 'main_tsx_imports_loaded'],
  init_time: ['init_function_start', 'init_function_end'],
  settings_time: ['eagerLoadSettings_start', 'eagerLoadSettings_end'],
  total_time: ['cli_entry', 'main_after_run'],
}
```

---

## 4. Headless Profiler Checkpoint（无头模式性能检查点）

用于 `-p`（print）模式下的性能分析。

### Checkpoint 列表

```
turn_start
system_message_yielded
query_started
first_chunk
api_request_sent
```

### 启用方式

```bash
CLAUDE_CODE_PROFILE_STARTUP=1  # 与 startup profiler 共用
```

### 输出事件

发送到 Statsig 作为 `tengu_headless_latency` 事件。

---

## 5. SendUserMessage Checkpoints（与 BriefTool 相关）

在 `BriefTool` 的 prompt 中提到：

> "Call SendUserMessage at checkpoints to mark where things stand."

这是**模型在执行任务时的检查点**，用于：
- 标记"我做了一个决定"
- 标记"我遇到了意外"
- 标记"阶段边界"

是给**人类阅读的进度标记**，不是技术检查点。

---

## 总结对比

| Checkpoint 类型 | 开发者用它来 | 用户用它来 |
|----------------|-------------|-----------|
| File Checkpoint | 不直接使用 | `/rewind` 回到之前的版本 |
| Query Profiler | `CLAUDE_CODE_PROFILE_QUERY=1` 调试性能 | 不直接使用 |
| Startup Profiler | `CLAUDE_CODE_PROFILE_STARTUP=1` 调试启动 | 不直接使用 |
| SendUserMessage | 给模型指令 | 看模型在做什么 |
