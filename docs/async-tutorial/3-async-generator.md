# AsyncGenerator：yield 与状态机

## 普通 Generator 回顾

Generator 是**可暂停**的函数：

```javascript
function* count() {
    console.log('生成 1')
    yield 1
    console.log('生成 2')
    yield 2
    console.log('生成 3')
    yield 3
}

const gen = count()
console.log(gen.next())  // { value: 1, done: false }
console.log(gen.next())  // { value: 2, done: false }
console.log(gen.next())  // { value: 3, done: false }
console.log(gen.next())  // { value: undefined, done: true }
```

关键：`yield` 是**暂停点**。调用 `.next()` 从上次暂停处继续。

## async Generator：带异步的暂停

```javascript
async function* fetchPages(url) {
    const page1 = await fetch(url + '/1')
    yield page1

    const page2 = await fetch(url + '/2')
    yield page2
}

async function main() {
    for await (const page of fetchPages('/api')) {
        console.log(page)
    }
}
```

`yield` 暂停函数，**等待 await 完成后才继续**。

## 核心对比

| | 普通 Generator | Async Generator |
|---|---|---|
| `yield` 值 | 同步返回 | 返回 Promise resolve 的值 |
| `.next()` 返回 | `{value, done}` | Promise → `{value, done}` |
| 循环方式 | `for (const x of gen)` | `for await (const x of gen)` |

## for await...of 的执行顺序

```javascript
async function* gen() {
    console.log('A')
    yield 1
    console.log('B')
    await new Promise(r => setTimeout(r, 1000))
    console.log('C')
    yield 2
}

async function main() {
    console.log('开始')
    for await (const value of gen()) {
        console.log('收到:', value)
    }
    console.log('结束')
}

main()
```

执行顺序：
1. `开始`
2. `A`（gen 开始执行到第一个 yield）
3. `收到: 1`（暂停等待消费者处理）
4. `B`（.next() 被调用，gen 恢复）
5. (等 1 秒)
6. `C`
7. `收到: 2`
8. `结束`（gen 执行完毕）

## yield 的本质：不是事件，是暂停

很多同学会把 `yield` 理解成"发布-订阅"的事件发射器：

```javascript
// 误解：yield 像事件发射器
async function* events() {
    yield 'event1'  // "发射" event1
    yield 'event2'  // "发射" event2
}

// 正确理解：yield 是暂停点
async function* events() {
    const data1 = await fetchEvent()  // 等待数据
    yield data1                        // 暂停，通知调用者"有数据了"

    const data2 = await fetchEvent()
    yield data2
}
```

`yield` 的语义是：**"我准备好了一个值，拿去吧"**。

- 不是广播给多个听众
- 是一次性传递，调用者必须主动来取

## 关键：调用者驱动

```javascript
async function* numbers() {
    yield 1
    yield 2
    yield 3
}

const gen = numbers()

// 调用者控制节奏
gen.next().then(console.log)  // 1
gen.next().then(console.log)  // 2  (即使第一个 .next() 还没 resolve 也无所谓，值已经准备好了)
```

**没有调用 `.next()`，generator 不会执行到下一个 yield。**

## 练习

```javascript
// 创建一个 async generator，每秒 yield 一个数字 1, 2, 3
// 使用 for await 打印它们

// 答案：
async function* counter() {
    for (let i = 1; i <= 3; i++) {
        await new Promise(r => setTimeout(r, 1000))
        yield i
    }
}

for await (const num of counter()) {
    console.log(num)  // 1, 2, 3（每秒一个）
}
```

## 下一步

[4-iterator-protocol.md](./4-iterator-protocol.md) - 迭代器协议的底层机制
