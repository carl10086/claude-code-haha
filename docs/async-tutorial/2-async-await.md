# async/await：同步语法写异步代码

## async 函数是什么

`async` 是 Promise 的**语法糖**。任何 `async` 函数都返回 Promise。

```javascript
// async 函数声明
async function getData() {
    return 'hello'
}

// 等价于
function getData() {
    return Promise.resolve('hello')
}

getData().then(console.log)  // 'hello'
```

## await：等待 Promise 完成

`await` 只能在 `async` 函数中使用，它**暂停**函数执行，等待 Promise resolve。

```javascript
async function main() {
    const result = await new Promise(resolve => {
        setTimeout(() => resolve('done'), 1000)
    })
    console.log(result)  // 1秒后打印 'done'
}

main()
console.log('这段代码在 await 之后执行')

// 输出顺序：
// '这段代码在 await 之后执行'
// (1秒后) 'done'
```

## await 的本质

```javascript
// await 写起来像同步代码
async function example() {
    const a = await fetchA()
    const b = await fetchB(a)
    const c = await fetchC(b)
    return c
}

// 但实际执行流程是：
// 1. fetchA() 开始
// 2. await 暂停函数，JS 引擎返回执行权给调用者
// 3. (1秒后) fetchA 完成，继续执行，fetchB 开始
// 4. await 暂停函数
// 5. (1秒后) fetchB 完成，继续执行...
```

## 对比：Promise 链 vs async/await

```javascript
// Promise 链
function getUserInfo() {
    return fetch('/user')
        .then(res => res.json())
        .then(user => fetch(`/posts/${user.id}`))
        .then(res => res.json())
}

// async/await
async function getUserInfo() {
    const userResponse = await fetch('/user')
    const user = await userResponse.json()
    const postsResponse = await fetch(`/posts/${user.id}`)
    const posts = await postsResponse.json()
    return posts
}
```

async/await 版本**更容易阅读**，错误处理也更自然。

## 错误处理

```javascript
// Promise 的 .catch
fetch('/data')
    .then(res => res.json())
    .catch(err => console.error(err))

// async/await 的 try/catch
async function loadData() {
    try {
        const res = await fetch('/data')
        const data = await res.json()
        return data
    } catch (err) {
        console.error(err)
    }
}
```

## 常见误解

### 误解1：await 阻塞线程

```javascript
async function slow() {
    console.log('开始')
    await new Promise(r => setTimeout(r, 3000))  // 等待3秒
    console.log('结束')
}

console.log('调用前')
slow()
console.log('调用后')

// 输出：
// '调用前'
// '开始'
// '调用后'      ← 这行在 await 期间执行！
// (3秒后)
// '结束'
```

`await` 只暂停**当前 async 函数**的执行，外部代码继续运行。

### 误解2：async 函数立即执行完

```javascript
async function getData() {
    console.log('async 函数内部')
    return 'result'
}

console.log('调用前')
const promise = getData()
console.log('调用后')
promise.then(console.log)

// 输出：
// '调用前'
// 'async 函数内部'   ← 函数体立即执行
// '调用后'
// 'result'
```

async 函数体是**立即执行**的，只是返回值是 Promise。

## 练习

```javascript
// 用 async/await 重写这个 Promise 链
function fetchUserAndPosts() {
    return fetch('/user')
        .then(res => res.json())
        .then(user => {
            return fetch(`/posts?userId=${user.id}`)
                .then(res => res.json())
                .then(posts => ({ user, posts }))
        })
}

// 答案：
async function fetchUserAndPosts() {
    const userRes = await fetch('/user')
    const user = await userRes.json()
    const postsRes = await fetch(`/posts?userId=${user.id}`)
    const posts = await postsRes.json()
    return { user, posts }
}
```

## 下一步

[3-async-generator.md](./3-async-generator.md) - Generator 与 yield 状态机
