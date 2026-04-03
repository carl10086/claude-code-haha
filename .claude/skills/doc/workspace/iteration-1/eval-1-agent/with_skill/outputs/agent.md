# Agent 模块文档

## 概述

`src/agent/agent.ts` 是 Agent 管理模块，负责管理系统中的 Agent（智能体）和工具注册表。

**参考**: opencode/packages/opencode/src/agent/agent.ts

**核心功能**:
1. 内置默认 Agent (build)
2. Agent 列表管理和获取
3. 工具注册表管理

---

## 类图

```mermaid
classDiagram
    class AgentService {
        -agents: Map~string, AgentInfo~
        -defaultAgentName: string
        +constructor()
        +register(info: AgentInfo): void
        +get(name: string): AgentInfo | undefined
        +list(): AgentInfo[]
        +defaultAgent(): AgentInfo
        +setDefaultAgent(name: string): void
    }

    class ToolRegistry {
        -tools: Map~string, ToolInfo~
        -initializedTools: Map~string, any~
        +register(tool: ToolInfo): void
        +ids(): string[]
        +getTools(agent?: object): Promise~any[]
        +getInitializedTool(id: string): any
    }

    class AgentInfo {
        +name: string
        +mode: string
        +prompt?: string
        +temperature?: number
        +topP?: number
        +options: Record~string, unknown~
        +permission?: string[]
    }

    class ToolInfo~Parameters, M~ {
        +id: string
        +init(ctx?: ToolInitContext): Promise~{ description, parameters, execute, formatValidationError? }~
    }

    AgentService ..> AgentInfo : manages
    ToolRegistry ..> ToolInfo : manages
```

---

## 模块结构

```
agent/
├── agent.ts          # Agent 服务和默认配置
├── types.ts          # 核心类型定义（AgentInfo, ToolInfo, Message, Part 等）
└── tool-registry.ts  # 工具注册表
```

---

## 核心类型

### AgentInfo

```typescript
interface AgentInfo {
  name: string           // Agent 名称
  mode: string          // 运行模式 (primary/agent 等)
  prompt?: string       // 系统提示词
  temperature?: number   // 温度参数
  topP?: number         // Top-P 参数
  options: Record<string, unknown>  // 其他选项
  permission?: string[] // 权限列表
}
```

### ToolInfo

```typescript
interface ToolInfo<Parameters extends z.ZodType = z.ZodType, M extends ToolMetadata = ToolMetadata> {
  id: string
  init: (ctx?: ToolInitContext) => Promise<{
    description: string
    parameters: Parameters
    execute(args: z.infer<Parameters>, ctx: ToolContext): Promise<{
      title: string
      metadata: M
      output: string
      attachments?: FilePart[]
    }>
    formatValidationError?(error: z.ZodError): string
  }>
}
```

---

## AgentService API

| 方法 | 说明 |
|------|------|
| `register(info: AgentInfo)` | 注册 Agent |
| `get(name: string)` | 根据名称获取 Agent |
| `list()` | 获取所有 Agent 列表 |
| `defaultAgent()` | 获取默认 Agent |
| `setDefaultAgent(name: string)` | 设置默认 Agent |

---

## 使用示例

```typescript
import { agentService } from "./agent"

// 获取默认 Agent
const defaultAgent = agentService.defaultAgent()

// 获取所有 Agent
const allAgents = agentService.list()

// 注册新 Agent
agentService.register({
  name: "custom",
  mode: "agent",
  prompt: "你是一个代码助手",
  options: {},
  permission: []
})

// 获取指定 Agent
const agent = agentService.get("custom")
```

---

## 内置默认 Agent

```typescript
const DEFAULT_BUILD_AGENT: AgentInfo = {
  name: "build",
  mode: "primary",
  permission: [],
  options: {},
  prompt: "",
}
```

---

## 导出

```typescript
export const agentService = new AgentService()
export { toolRegistry }
export type { ToolRegistry }
```
