# Coding Agent 关键点草稿

这个文档先不追求完整，只记录我当前对 `coding agent` 实现关键点的理解，方便后面继续补充。

## 1. Agent Loop / Turn State Machine

1. agent 的外层通常都是一个多轮 loop。
2. 但核心不只是 `while (true)`，而是每一轮的状态推进规则。
3. 需要明确：
4. 这一轮的输入是什么。
5. 什么时候继续下一轮。
6. 什么时候终止。
7. 什么时候重试 / fallback。
8. 什么时候进入工具执行分支。

## 2. 内部消息协议

1. 不能直接把 SDK 原生 message 到处传。
2. 通常需要自己封装一层内部 message domain。
3. 至少要区分：
4. `UserMessage`
5. `AssistantMessage`
6. `SystemMessage`
7. `AttachmentMessage`
8. `StreamEvent`
9. 这层的作用是隔离：
10. 模型协议
11. 内部会话协议
12. UI / transcript 协议
13. tool / system control 协议

## 3. 流式消息组装

1. 模型返回的往往不是完整消息，而是 stream event。
2. 所以需要有一层把碎片组装成内部 message。
3. 这层通常要处理：
4. `message_start`
5. `content_block_start`
6. `content_block_delta`
7. `content_block_stop`
8. `message_delta`
9. `message_stop`
10. 这层很容易被低估，但其实非常关键。

## 4. Tool Calling 闭环

1. 难点不只是 tool 自己怎么实现。
2. 更复杂的是整个 tool 协议闭环。
3. 需要考虑：
4. tool schema 如何暴露给模型。
5. tool_use 如何流式解析。
6. permission 如何判断。
7. tool 如何执行。
8. tool_result 如何写回上下文。
9. 写回后如何驱动下一轮 agent loop。

## 5. Prompt Construction

1. system prompt 很关键。
2. 但真正重要的是完整 prompt 组装。
3. 往往包括：
4. base system prompt
5. tools prompt
6. system context
7. user context
8. memory / attachment 注入
9. meta message 注入
10. agent persona / mode prompt

## 6. 输入编排层

1. 用户输入不一定直接变成普通 user message。
2. 还可能有很多前处理和调度。
3. 比如：
4. slash command
5. skill
6. pasted context
7. IDE selection
8. 本地命令
9. 队列化输入
10. meta input

## 7. Session State

1. 多轮 agent 的核心之一是 session state。
2. 不只是 `messages`。
3. 还可能包括：
4. permission context
5. app state
6. tool execution context
7. pending summary
8. stop hook state
9. compact / budget state

## 8. 持久化 / Resume / Recovery

1. 一个实用型 coding agent 不能只处理当前回合。
2. 还需要考虑：
3. transcript 持久化
4. session resume
5. metadata restore
6. 异常中断恢复
7. tool 相关状态恢复
8. todo / fileHistory / attribution 等附加状态恢复

## 9. Context Management / Compaction

1. 多轮一长，问题就不只是“能跑”。
2. 还要考虑上下文怎么长期维持。
3. 需要回答：
4. 什么该保留。
5. 什么该摘要。
6. 什么该丢弃。
7. 大 tool result 怎么处理。
8. memory 什么时候注入。
9. compact boundary 怎么设计。

## 10. 权限与安全模型

1. coding agent 只要能读写文件、跑命令、连网络，就必须有权限模型。
2. 常见问题包括：
3. allow / deny / ask
4. sandbox
5. 危险操作 gating
6. tool scope control
7. 用户确认点设计

## 11. 可观察性 / 调试能力

1. agent 很容易变成黑箱。
2. 所以调试能力本身就是核心能力。
3. 至少要考虑：
4. stream event 可视化
5. message dump
6. tool lifecycle trace
7. checkpoint
8. transcript replay
9. debug harness

## 12. Provider / Model Abstraction

1. 不能把某一个 provider 的细节直接污染整个系统。
2. 常见差异包括：
3. streaming 行为
4. tool schema 支持差异
5. usage / cost 字段差异
6. stop_reason 差异
7. strict structured output 支持差异
8. fallback model 策略差异

## 13. 我当前的粗判断

1. 最容易被低估的不是 loop 本身。
2. 而是：
3. 内部消息协议
4. 流式消息组装
5. tool calling 闭环
6. session / context 管理
7. 很多 agent demo 能跑，但一到多轮、长上下文、权限、恢复，就开始变脆。

## 14. 后面可以继续补的方向

1. 哪些属于最小可用版本必须做。
2. 哪些可以第二阶段再做。
3. Claude Code 在这些点上的具体对应实现。
4. `ys-code` 后面哪些应该先跟，哪些可以简化。
