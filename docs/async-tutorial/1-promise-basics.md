# Promise 基础：为什么需要它

## 回调地狱

假设我们需要按顺序执行三个异步操作：

```javascript
// 假设 getData(url, callback) 是老式 API
getData('/users', (err, users) => {
    if (err) {
        console.error(err)
        return
    }
    getData('/posts', (err, posts) => {
        if (err) {
            console.error(err)
            return
        }
        getData('/comments', (err, comments) => {
            if (err) {
                console.error(err)
                return
            }
            // 终于拿到了所有数据
            console.log(users, posts, comments)
        })
    })
})
```

问题：
- 缩进越来越深
- 错误处理重复
- 很难阅读和维护

## Promise 解决第一步：链式调用

```javascript
// 假设 getData(url) 返回 Promise
getData('/users')
    .then(users => getData('/posts'))
    .then(posts => getData('/comments'))
    .then(comments => {
        console.log(comments)
    })
    .catch(err => {
        console.error(err)  // 统一的错误处理
    })
```

Promise 的核心：
- `.then()` 返回一个新的 Promise
- 链式调用是**线性**的，不是嵌套的
- `.catch()` 捕获链中**任何**一个错误

## Promise 的三种状态

```
┌──────────────┐
│   pending    │  ← 初始状态，正在执行
└──────┬───────┘
       │
   ┌───┴───┐
   ▼       ▼
┌──────┐ ┌────────┐
│fulfilled│ │rejected│
└──────┘ └────────┘
```

```javascript
const promise = new Promise((resolve, reject) => {
    // pending
    setTimeout(() => {
        if (Math.random() > 0.5) {
            resolve('成功！')  // → fulfilled
        } else {
            reject(new Error('失败！'))  // → rejected
        }
    }, 1000)
})

promise
    .then(result => console.log(result))      // fulfilled 时调用
    .catch(error => console.error(error))     // rejected 时调用
    .finally(() => console.log('完成'))        // 无论成功失败都调用
```

## Promise 的本质

Promise 是一个**占位符**，代表一个尚未完成但将来会完成的异步操作。

```
Promise.resolve(1)  // 立即 resolved，值为 1
Promise.reject(new Error('err'))  // 立即 rejected
```

## 关键理解：Promise 不"运行"异步代码

```javascript
const p = new Promise(resolve => {
    console.log('A')  // 这行**立即**执行
    setTimeout(() => resolve('B'), 1000)
})

console.log('C')
p.then(result => console.log(result))
console.log('D')

// 输出顺序：A → C → D → (1秒后) B
```

原因：Promise 构造函数是**同步执行**的，只有 `.then()` 是异步排队。

## 练习

```javascript
// 1. 创建一个 Promise，1秒后 resolve 为数字 42
// 2. 打印结果


// 答案：
new Promise(resolve => {
    setTimeout(() => resolve(42), 1000)
}).then(num => console.log(num))
```

## 下一步

[2-async-await.md](./2-async-await.md) - 如何用同步语法写异步代码
