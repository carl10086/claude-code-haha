# 迭代器协议：next() 的契约

## 什么是迭代器协议

JavaScript 的迭代器是一个**有标准接口的对象**：

```javascript
const iterator = {
    next() {
        return { value: any, done: boolean }
    }
}
```

就这么简单。任何对象只要有 `.next()` 方法，且返回 `{value, done}`，就是迭代器。

## 普通迭代器

```javascript
// 手写迭代器
const counter = {
    current: 0,
    next() {
        this.current++
        if (this.current <= 3) {
            return { value: this.current, done: false }
        }
        return { value: undefined, done: true }
    }
}

console.log(counter.next())  // { value: 1, done: false }
console.log(counter.next())  // { value: 2, done: false }
console.log(counter.next())  // { value: 3, done: false }
console.log(counter.next())  // { value: undefined, done: true }
```

## 生成器是迭代器的语法糖

```javascript
function* gen() {
    yield 1
    yield 2
    yield 3
}

const iterator = gen()

console.log(iterator.next())  // { value: 1, done: false }
console.log(iterator.next())  // { value: 2, done: false }
console.log(iterator.next())  // { value: 3, done: false }
console.log(iterator.next())  // { value: undefined, done: true }
```

`function*` 生成的**就是迭代器**。编译器帮你实现了 `.next()` 方法。

## Async 迭代器

```javascript
const asyncIterator = {
    async next() {
        await new Promise(r => setTimeout(r, 1000))
        return { value: Math.random(), done: false }
    }
}
```

唯一的区别：`.next()` 返回 Promise。

## AsyncGenerator = Generator + Async

```javascript
async function* gen() {
    yield 1
    await new Promise(r => setTimeout(r, 1000))
    yield 2
}

const iterator = gen()

// iterator 既是 Generator 又是 AsyncIterator
// .next() 返回 Promise
iterator.next().then(result => console.log(result))
// 1秒后打印 { value: 2, done: false }
```

## 可迭代对象（Iterable）

可以被 `for...of` 遍历的对象：

```javascript
// 普通可迭代对象
const arr = [1, 2, 3]
for (const x of arr) console.log(x)

// 任何有 Symbol.iterator 的对象
const obj = {
    [Symbol.iterator]() {
        let i = 0
        return {
            next() {
                i++
                return i <= 3
                    ? { value: i, done: false }
                    : { value: undefined, done: true }
            }
        }
    }
}

for (const x of obj) console.log(x)  // 1, 2, 3
```

## for await...of 原理

```javascript
const asyncGen = async function* () {
    yield 1
    yield 2
}

// 手写遍历（等价于 for await）
const iterator = asyncGen[Symbol.asyncIterator]()
const iter = iterator.next()

if (!iter.done) {
    console.log(iter.value)  // 1
    // 处理完，继续...
}
```

`for await...of` 就是帮你写这个循环的语法糖。

## 关键：yield 不创建队列

```javascript
function* gen() {
    yield 1
    yield 2
}

const it = gen()
const first = it.next()
console.log(first)  // { value: 1, done: false }

// 此时值 2 还没有被计算！
// 只有下次调用 .next() 时，才会计算 yield 2
```

**yield 是延迟计算**，不是往队列里放值。

## 练习

```javascript
// 1. 手写一个迭代器，yield 数组 [10, 20, 30] 的元素
// 2. 用生成器语法实现相同功能

// 答案：
// 1. 手写
const manual = {
    data: [10, 20, 30],
    index: 0,
    next() {
        if (this.index < this.data.length) {
            return { value: this.data[this.index++], done: false }
        }
        return { value: undefined, done: true }
    }
}

// 2. 生成器
function* auto() {
    for (const x of [10, 20, 30]) yield x
}
```

## 下一步

[5-in-queryloop.md](./5-in-queryloop.md) - 在 queryLoop 场景中的应用
