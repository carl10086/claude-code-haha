# Prompt Spy

这个目录用于整理 prompt 相关源码分析。

建议按下面顺序阅读：

- `2-system-prompt-架构总览.md`
  - 从 TUI / 模式层往下看 `System Prompt` 的整体架构
  - 重点回答：哪些模式真的会改主 prompt，哪些只是运行时上下文或权限模式变化

- `1-queryloop-到-api-请求的-prompt-组装主线.md`
  - 只追 `system prompt` 从 `query.ts` 到 API `system` blocks 的底层组装链路
  - 更偏 request assembly，不是整体架构文档
