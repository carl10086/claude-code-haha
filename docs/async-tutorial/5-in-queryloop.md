# 在 queryLoop 场景中的应用

## queryLoop 的结构回顾

```typescript
async function* queryLoop(params: QueryParams): AsyncGenerator<Event, Terminal> {
    while (true) {
        // 1. 准备请求
        yield { type: 'stream_request_start' }  // ← 暂停点

        // 2. 调用模型
        for await (const message of deps.callModel(...)) {
            yield message  // ← 每个消息都是暂停点
        }

        // 3. 执行工具
        for await (const update of runTools(...)) {
            yield update.message  // ← 每个工具结果都是暂停点
        }

        // 4. 继续下一轮
        state = nextState
    }
}
```

## 为什么用 AsyncGenerator

### 传统方案：回调

```typescript
function query(params, onEvent, onComplete) {
    callModel(params, (msg) => {
        onEvent(msg)
    }, (err) => {
        onComplete(err)
    })
}
```

问题：
- `onEvent` 被调用多次（流式数据陆续到达）
- 难以组合（多个流式操作串联）
- 状态管理复杂

### AsyncGenerator 方案

```typescript
async function* query() {
    for await (const message of callModel()) {
        yield message  // 调用者决定何时取下一个
    }
}

// 使用
for await (const msg of query()) {
    console.log(msg)
}
```

好处：
- 代码是**线性**的，像同步代码
- 调用者完全控制消费节奏
- 没有回调，没有嵌套

## 调用者如何消费

```typescript
// 在 src/query.ts 中
async function* query(params): AsyncGenerator<Event, Terminal> {
    const terminal = yield* queryLoop(params, consumedCommandUuids)
    return terminal
}
```

`yield*` 是**委托**：
- 把 queryLoop 产生的每个值直接传给调用者
- queryLoop 的返回值赋给 `terminal`

## 调用者（实际消费者）

```typescript
// 消费者代码大概是：
const gen = query(params)

async function consume() {
    for await (const event of gen) {
        // event 是 StreamEvent | Message | TombstoneMessage | ...
        switch (event.type) {
            case 'stream_request_start':
                ui.showLoading()
                break
            case 'assistant':
                ui.appendMessage(event)
                break
            case 'tombstone':
                ui.removeMessage(event.message)
                break
            // ...
        }
    }
    // gen 返回了 Terminal 对象
    const result = gen.return  // { reason: 'completed' | 'aborted' | ... }
}
```

## 关键：调用者驱动消费

```
消费者                         queryLoop (生产者)
   │                                │
   │  for await (const e of gen)   │
   │         ↓                      │
   │  gen.next() ─────────────────►│ 执行到 yield，暂停
   │                                │
   │  ◄─────────────────────────── │ 返回 { value: event, done: false }
   │                                │
   │  处理 event...                 │ (暂停，等待)
   │                                │
   │  gen.next() ─────────────────► │ 恢复执行，到下一个 yield，暂停
   │                                │
   │  ◄─────────────────────────── │ 返回下一个 event
```

**消费者通过 `.next()` 驱动生产者执行。**

## 为什么 SSE 不受影响

```
┌────────────────────────────────────────────┐
│              JavaScript 执行                │
│                                            │
│   queryLoop 正在执行                        │
│        │                                   │
│        ▼                                   │
│   yield message  ──暂停──► 等待 .next()     │
│                                            │
└────────────────────────────────────────────┘
                    │
                    │  (不阻塞)
                    ▼
┌────────────────────────────────────────────┐
│              浏览器网络层                   │
│                                            │
│   SSE 连接接收数据 → 存入缓冲区              │
│   (与 JS 执行无关)                          │
└────────────────────────────────────────────┘
```

JS 暂停时，浏览器**继续接收** SSE 数据到缓冲区。下次 `.next()` 时从缓冲区取。

## 总结

| 概念 | 在 queryLoop 中的体现 |
|------|---------------------|
| AsyncGenerator | `async function* queryLoop()` |
| yield | `yield message` 暂停，传递事件 |
| for await...of | 消费者遍历事件流 |
| yield* | 委托给外层 generator |
| Terminal | `return { reason: 'completed' }` 退出原因 |

## 验证理解

```typescript
// 以下代码的输出顺序是什么？

async function* gen() {
    console.log('A')
    yield 1
    console.log('B')
    yield 2
    console.log('C')
}

async function test() {
    const it = gen()
    console.log('1')
    const r1 = await it.next()
    console.log('2', r1)
    const r2 = await it.next()
    console.log('3', r2)
    console.log('4')
}

test()
```

答案：
```
1
A
2 { value: 1, done: false }
B
3 { value: 2, done: false }
C
4
```

解析：
1. `test()` 开始
2. `gen()` 执行到 `console.log('A')`，yield 1，暂停
3. 返回 `{value: 1}`
4. `test()` 打印 `2`
5. `.next()` 恢复执行，打印 `B`，yield 2，暂停
6. 返回 `{value: 2}`
7. `test()` 打印 `3`，`gen()` 继续执行到 `console.log('C')`
8. `gen()` 结束（done: true）
9. `test()` 打印 `4`
