---
name: typescript-best-practices
description: Use when writing TypeScript code, configuring tsconfig.json, or making decisions about type system usage. Covers modern TypeScript 5.8+ features, performance optimization, type safety patterns, and Google/MS style guide recommendations.
---

# TypeScript 最佳实践 (Modern TypeScript 5.8+)

## 核心原则

- **类型优先**: 类型是 TS 的核心价值，不要写成 anyScript
- **性能意识**: 编译速度和类型检查性能很重要
- **严格模式**: 启用最严格的类型检查
- **现代化**: 使用最新的语言特性和最佳实践

## 严格的 tsconfig.json 配置

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "useUnknownInCatchVariables": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

### 关键配置说明

| 配置项 | 推荐值 | 原因 |
|--------|--------|------|
| `strict` | `true` | 启用所有严格类型检查选项 |
| `noUncheckedIndexedAccess` | `true` | 数组/对象索引访问可能返回 undefined |
| `exactOptionalPropertyTypes` | `true` | 区分 `undefined` 和可选属性 |
| `verbatimModuleSyntax` | `true` | 显式使用 `import type` |
| `isolatedModules` | `true` | 确保每个文件可以独立编译 |

## 类型声明最佳实践

### 1. 优先使用 interface 而非 type

```typescript
// ✅ Good - 接口可以合并，性能更好
interface User {
  id: string;
  name: string;
}

// ❌ Avoid - 类型别名无法合并，性能稍差
type User = {
  id: string;
  name: string;
}
```

### 2. 显式函数返回类型

```typescript
// ✅ Good - 明确返回类型，提升编译性能
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Avoid - 依赖类型推断，编译器工作量大
function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### 3. 使用 const assertion 创建精确字面量类型

```typescript
// ✅ Good - 精确的字面量类型
const config = {
  env: 'production',
  port: 3000
} as const;

// 类型为 { readonly env: "production"; readonly port: 3000 }
```

### 4. 使用 satisfies 进行类型约束

```typescript
// ✅ Good - 使用 satisfies 约束同时保持类型推断
const config = {
  host: 'localhost',
  port: 3000
} satisfies ServerConfig;

// config.port 仍然是 number 类型，不是 ServerConfig['port']
```

### 5. 使用 import type 进行类型导入

```typescript
// ✅ Good - 明确标记类型导入
import type { User, Config } from './types';
import { createUser } from './user';

// ✅ Good - 混合导入时标记类型
import { type User, createUser } from './user';
```

## 命名导出 vs 默认导出

```typescript
// ✅ Good - 使用命名导出
export function formatDate(date: Date): string { }
export const MAX_RETRY = 3;

// ❌ Avoid - 避免默认导出（除了 React 组件等特殊情况）
export default function formatDate() { }
```

## 文件结构

```typescript
// 1. 类型导入
import type { User, Config } from './types';

// 2. 值导入
import { utils } from './utils';

// 3. 常量定义
const MAX_RETRY = 3;

// 4. 类型定义
interface Options {
  retry?: number;
}

// 5. 函数实现
export function processData(data: unknown, options: Options = {}) {
  // implementation
}
```

## 类型安全模式

### 1. 未知类型处理

```typescript
// ✅ Good - 使用 unknown 替代 any
function processData(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
  if (Array.isArray(data)) {
    return data.length;
  }
  throw new Error('Unsupported data type');
}
```

### 2. 区分 undefined 和 null

```typescript
// ✅ Good - 明确区分
interface Config {
  name: string;
  value?: number;      // 可选属性 - 可能是 undefined
  metadata: null | Record<string, unknown>;  // 明确可以是 null
}

// ❌ Avoid - 混用 undefined 和 null
interface Config {
  value: number | undefined | null;
}
```

### 3. 使用 branded types 创建领域类型

```typescript
// ✅ Good - 使用 branding 创建类型安全的 ID
type UserId = string & { __brand: 'UserId' };
type OrderId = string & { __brand: 'OrderId' };

function createUserId(id: string): UserId {
  return id as UserId;
}

// 现在不能混用 UserId 和 OrderId
const userId: UserId = createUserId('user-123');
const orderId: OrderId = createUserId('order-456');

// ❌ 编译错误 - 类型不兼容
processOrder(userId); 
```

### 4. 使用 discriminated unions

```typescript
// ✅ Good - 可辨识联合类型
interface LoadingState {
  status: 'loading';
}

interface SuccessState<T> {
  status: 'success';
  data: T;
}

interface ErrorState {
  status: 'error';
  error: Error;
}

type State<T> = LoadingState | SuccessState<T> | ErrorState;

function handleState<T>(state: State<T>) {
  switch (state.status) {
    case 'loading':
      return showLoading();
    case 'success':
      return showData(state.data);  // 类型收窄为 SuccessState
    case 'error':
      return showError(state.error); // 类型收窄为 ErrorState
  }
}
```

## 性能优化

### 1. 避免大型联合类型

```typescript
// ❌ Avoid - O(n²) 复杂度
interface BigInterface {
  prop: A | B | C | D | E | F | G | H | I | J;
}

// ✅ Good - 使用接口继承
interface BaseInterface {
  common: string;
}

interface A extends BaseInterface { kind: 'a'; }
interface B extends BaseInterface { kind: 'b'; }
```

### 2. 命名复杂类型

```typescript
// ❌ Avoid - 匿名复杂类型重复计算
type UserData = {
  profile: {
    name: {
      first: string;
      last: string;
    };
    settings: {
      theme: 'light' | 'dark';
      notifications: boolean;
    };
  };
};

// ✅ Good - 分解为命名类型
interface Name {
  first: string;
  last: string;
}

interface Settings {
  theme: 'light' | 'dark';
  notifications: boolean;
}

interface Profile {
  name: Name;
  settings: Settings;
}

interface UserData {
  profile: Profile;
}
```

### 3. 使用 skipLibCheck

```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

> 跳过 node_modules 中声明文件的类型检查，显著提升编译速度

## 现代 TypeScript 5.8+ 特性

### 1. NoInfer<T>

```typescript
// ✅ TypeScript 5.8+ - 防止类型推断扩散
function createConfig<T>(defaultConfig: NoInfer<T>, userConfig: T): T {
  return { ...defaultConfig, ...userConfig };
}

// T 只能从 userConfig 推断，不会从 defaultConfig 扩散
```

### 2. 更好的类型收窄

```typescript
// ✅ TypeScript 5.8+ 改进的类型收窄
function processValue(value: string | number | boolean) {
  if (typeof value === 'string') {
    // value 被收窄为 string
    return value.toUpperCase();
  }
  // value 被收窄为 number | boolean
}
```

### 3. JSDoc 增强

```typescript
// ✅ 使用 JSDoc 提供文档
/**
 * 处理用户数据
 * @param user - 用户对象
 * @param options - 处理选项
 * @returns 处理后的用户数据
 * @throws {ValidationError} 当用户数据无效时
 */
function processUser(user: User, options: ProcessOptions): ProcessedUser {
  // implementation
}
```

## 常用工具类型

```typescript
// ✅ 使用内置工具类型
// Required<T> - 所有属性变为必需
// DeepPartial<T> - 深层可选（需自定义实现）
// Readonly<T> - 所有属性变为只读
// Pick<T, K> - 选择部分属性
// Omit<T, K> - 省略部分属性
// Record<K, T> - 创建映射类型
// Exclude<T, U> - 排除联合类型中的类型
// Extract<T, U> - 提取联合类型中的类型
// NonNullable<T> - 排除 null 和 undefined
// ReturnType<T> - 函数返回类型
// Parameters<T> - 函数参数类型
```

## ESLint 配置建议

```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-type-checked",
    "@typescript-eslint/strict-type-checked",
    "@typescript-eslint/stylistic-type-checked"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/strict-boolean-expressions": "error"
  }
}
```

## 常见错误

| 错误 | 正确做法 |
|------|---------|
| 使用 `any` | 使用 `unknown` + 类型守卫 |
| 混用 `undefined` 和 `null` | 明确语义：`undefined` 表示未设置，`null` 表示空值 |
| 大型匿名类型 | 拆分为命名的子类型 |
| 隐式返回类型 | 显式声明函数返回类型 |
| 默认导出 | 使用命名导出 |
| `object` 类型 | 使用 `Record<string, unknown>` 或具体接口 |
| `{}` 空对象类型 | 使用 `Record<string, never>` 或具体类型 |

## 代码可读性与组织

基于 Clean Code 原则的 TypeScript 实践。

### 变量命名

#### 1. 使用有意义且可发音的变量名

```typescript
// ❌ Bad - 无法理解的缩写
const yyyymmdstr = moment().format("YYYY/MM/DD");
const fName = 'John';
const lName = 'Doe';

// ✅ Good - 清晰、可发音
const currentDate = moment().format("YYYY/MM/DD");
const firstName = 'John';
const lastName = 'Doe';
```

#### 2. 对同一类型的变量使用统一的词汇

```typescript
// ❌ Bad - 同一概念多个词汇
getUserInfo();
getClientData();
getCustomerRecord();

// ✅ Good - 统一词汇
getUser();
```

#### 3. 使用可搜索的名称

```typescript
// ❌ Bad - 魔法数字
setTimeout(blastOff, 86400000);

// ✅ Good - 命名常量
const MILLISECONDS_PER_DAY = 60 * 60 * 24 * 1000;
setTimeout(blastOff, MILLISECONDS_PER_DAY);
```

#### 4. 使用解释性变量

```typescript
// ❌ Bad - 嵌套调用难以理解
const address = "One Infinite Loop, Cupertino 95014";
const cityZipCodeRegex = /^[^,\\]+[,\\\s]+(.+?)\s*(\d{5})?$/;
saveCityZipCode(
  address.match(cityZipCodeRegex)[1],
  address.match(cityZipCodeRegex)[2]
);

// ✅ Good - 使用解构赋值
const [, city, zipCode] = address.match(cityZipCodeRegex) || [];
saveCityZipCode(city, zipCode);
```

#### 5. 避免心智负担（避免隐式）

```typescript
// ❌ Bad - l 是什么意思？
locations.forEach(l => {
  doStuff();
  doSomeOtherStuff();
  dispatch(l);  // 等等，l 是什么？
});

// ✅ Good - 明确的变量名
locations.forEach(location => {
  doStuff();
  doSomeOtherStuff();
  dispatch(location);
});
```

#### 6. 不要添加不必要的上下文

```typescript
// ❌ Bad - 重复上下文
const Car = {
  carMake: "Honda",
  carModel: "Accord",
  carColor: "Blue"
};

function paintCar(car: Car, color: string) {
  car.carColor = color;
}

// ✅ Good - 简洁明了
const Car = {
  make: "Honda",
  model: "Accord",
  color: "Blue"
};

function paintCar(car: Car, color: string) {
  car.color = color;
}
```

### 函数组织

#### 1. 函数参数限制（理想情况下 2 个或更少）

```typescript
// ❌ Bad - 参数过多
createMenu("Foo", "Bar", "Baz", true);

// ✅ Good - 使用对象参数 + 解构
interface MenuConfig {
  title: string;
  body: string;
  buttonText: string;
  cancellable: boolean;
}

function createMenu({ title, body, buttonText, cancellable }: MenuConfig) {
  // ...
}

createMenu({
  title: "Foo",
  body: "Bar",
  buttonText: "Baz",
  cancellable: true
});
```

#### 2. 函数应该只做一件事

**这是软件工程中最重要的规则。**

```typescript
// ❌ Bad - 做太多事情
function emailClients(clients: Client[]) {
  clients.forEach(client => {
    const clientRecord = database.lookup(client);
    if (clientRecord.isActive()) {
      email(client);
    }
  });
}

// ✅ Good - 单一职责
function emailActiveClients(clients: Client[]) {
  clients.filter(isActiveClient).forEach(email);
}

function isActiveClient(client: Client): boolean {
  const clientRecord = database.lookup(client);
  return clientRecord.isActive();
}
```

#### 3. 函数名应该说明它做什么

```typescript
// ❌ Bad - 不明确
function addToDate(date: Date, month: number): Date {
  // ...
}
addToDate(new Date(), 1);  // 添加什么？

// ✅ Good - 明确意图
function addMonthToDate(month: number, date: Date): Date {
  // ...
}
addMonthToDate(1, new Date());
```

#### 4. 函数应该只有一层抽象

```typescript
// ❌ Bad - 多层抽象
function parseBetterJSAlternative(code: string) {
  const REGEXES = [/* ... */];
  const statements = code.split(" ");
  const tokens: string[] = [];
  REGEXES.forEach(REGEX => {
    statements.forEach(statement => {
      tokens.push(/* ... */);
    });
  });
  
  const ast: ASTNode[] = [];
  tokens.forEach(token => {
    // lex...
  });
  
  ast.forEach(node => {
    // parse...
  });
}

// ✅ Good - 分层抽象
function parseBetterJSAlternative(code: string) {
  const tokens = tokenize(code);
  const syntaxTree = parse(tokens);
  syntaxTree.forEach(node => {
    // parse...
  });
}

function tokenize(code: string): Token[] {
  // 词法分析逻辑
}

function parse(tokens: Token[]): ASTNode[] {
  // 语法分析逻辑
}
```

#### 5. 不要使用标记参数

```typescript
// ❌ Bad - 标记参数意味着函数做多件事
function createFile(name: string, temp: boolean) {
  if (temp) {
    fs.create(`./temp/${name}`);
  } else {
    fs.create(name);
  }
}

// ✅ Good - 拆分为两个函数
function createFile(name: string) {
  fs.create(name);
}

function createTempFile(name: string) {
  createFile(`./temp/${name}`);
}
```

### 代码行数与文件大小

#### 1. 文件大小限制

```
推荐标准：
- 单个文件：不超过 300 行代码
- 单个函数：不超过 20-30 行
- 函数参数：不超过 3 个（使用对象替代）
- 类成员：不超过 10 个方法
```

#### 2. 代码行长度

```typescript
// ❌ Bad - 行太长
const result = someVeryLongFunctionName(thatTakesManyArguments, andReturnsSomething, thatNeedsToBeProcessed);

// ✅ Good - 适当换行
const result = someVeryLongFunctionName(
  thatTakesManyArguments,
  andReturnsSomething,
  thatNeedsToBeProcessed
);

// 或
const result = someVeryLongFunctionName(
  thatTakesManyArguments,
  andReturnsSomething,
  thatNeedsToBeProcessed
);
```

### 注释规范

#### 1. 注释应该解释"为什么"而不是"是什么"

```typescript
// ❌ Bad - 注释重复代码
// 递增 i
i++;

// ✅ Good - 解释意图
// 我们必须在索引处插入一个占位符，以便在后续遍历中使用
i++;
```

#### 2. 好的代码是自解释的

```typescript
// ❌ Bad - 需要注释解释
// 检查员工是否仍有资格享受全额福利
if (employee.flags & HOURLY_FLAG && employee.age > 65) {
  // ...
}

// ✅ Good - 清晰的命名
if (employee.isEligibleForFullBenefits()) {
  // ...
}
```

#### 3. 使用 TODO 注释标记临时方案

```typescript
// TODO: 需要重构这段代码，使用策略模式
function calculatePrice(product: Product) {
  if (product.type === 'book') {
    return product.price * 0.9;
  } else if (product.type === 'electronics') {
    return product.price * 0.95;
  }
  return product.price;
}
```

#### 4. 文档注释（JSDoc/TSDoc）

```typescript
/**
 * 计算两个日期之间的工作日数量
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @param options - 可选配置
 * @param options.excludeHolidays - 是否排除节假日
 * @returns 工作日数量
 * @throws {Error} 当开始日期晚于结束日期时抛出
 * @example
 * ```typescript
 * const days = getWorkingDays(
 *   new Date('2024-01-01'),
 *   new Date('2024-01-31'),
 *   { excludeHolidays: true }
 * );
 * ```
 */
function getWorkingDays(
  startDate: Date,
  endDate: Date,
  options?: { excludeHolidays?: boolean }
): number {
  // implementation
}
```

#### 5. 不要保留注释掉的代码

```typescript
// ❌ Bad
function calculateTotal(items: Item[]) {
  // const oldWay = items.reduce((sum, item) => sum + item.price, 0);
  // return oldWay * 0.9;
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// ✅ Good
function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

### 条件表达式

#### 1. 封装条件表达式

```typescript
// ❌ Bad - 复杂的条件
if (fsm.state === "fetching" && isEmpty(listNode)) {
  showSpinner();
}

// ✅ Good - 封装为函数
function shouldShowSpinner(fsm: FSM, listNode: ListNode): boolean {
  return fsm.state === "fetching" && isEmpty(listNode);
}

if (shouldShowSpinner(fsm, listNode)) {
  showSpinner();
}
```

#### 2. 避免否定条件

```typescript
// ❌ Bad - 双重否定
if (!isDOMNodeNotPresent(node)) {
  // ...
}

// ✅ Good - 正面表达
if (isDOMNodePresent(node)) {
  // ...
}
```

#### 3. 优先使用多态而非 switch/if-else

```typescript
// ❌ Bad - 复杂的 switch
class Airplane {
  getCruisingAltitude() {
    switch (this.type) {
      case "777":
        return this.getMaxAltitude() - this.getPassengerCount();
      case "Air Force One":
        return this.getMaxAltitude();
      case "Cessna":
        return this.getMaxAltitude() - this.getFuelExpenditure();
    }
  }
}

// ✅ Good - 多态
abstract class Airplane {
  abstract getCruisingAltitude(): number;
}

class Boeing777 extends Airplane {
  getCruisingAltitude() {
    return this.getMaxAltitude() - this.getPassengerCount();
  }
}

class AirForceOne extends Airplane {
  getCruisingAltitude() {
    return this.getMaxAltitude();
  }
}
```

### 错误处理

#### 1. 不要忽略捕获的错误

```typescript
// ❌ Bad - 空 catch
try {
  await fetchUserData();
} catch (error) {
  // 忽略错误
}

// ✅ Good - 处理或记录错误
try {
  await fetchUserData();
} catch (error) {
  logger.error('Failed to fetch user data', error);
  // 或重新抛出
  throw new UserDataFetchError('Unable to load user profile', { cause: error });
}
```

#### 2. 使用特定的错误类型

```typescript
// ✅ Good - 自定义错误类
class ValidationError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

// 使用
function validateUser(data: unknown): User {
  if (!isValidUserData(data)) {
    throw new ValidationError('Invalid user data', {
      email: ['Invalid email format'],
      age: ['Must be at least 18']
    });
  }
  return data;
}
```

### 代码组织原则

#### 1. 垂直顺序

```typescript
// ✅ 调用者在上，被调用者在下
function processUser(user: User) {
  validateUser(user);      // 第 1 步：验证
  const data = transformUserData(user);  // 第 2 步：转换
  return saveToDatabase(data);           // 第 3 步：保存
}

// 被调用函数在调用者下方
function validateUser(user: User) {
  if (!user.email) throw new Error('Email required');
}

function transformUserData(user: User) {
  return { ...user, processedAt: new Date() };
}

function saveToDatabase(data: UserData) {
  // 保存逻辑
}
```

#### 2. 相关代码应该放在一起

```typescript
// ✅ Good - 相关代码靠近
class UserService {
  // 构造函数和属性
  constructor(private db: Database) {}
  
  // 公共 API
  async createUser(data: CreateUserDTO) {
    const validated = this.validate(data);
    return this.db.users.create(validated);
  }
  
  async getUser(id: string) {
    return this.db.users.findById(id);
  }
  
  // 私有辅助方法紧跟在使用它们的方法后面
  private validate(data: CreateUserDTO) {
    // 验证逻辑
  }
}
```

#### 3. 单一职责原则（SRP）

```typescript
// ❌ Bad - 多个职责
class UserManager {
  async createUser(data: UserData) {
    // 验证
    // 保存到数据库
    // 发送欢迎邮件
    // 记录审计日志
  }
}

// ✅ Good - 分离职责
class UserService {
  constructor(
    private validator: UserValidator,
    private repository: UserRepository,
    private emailService: EmailService,
    private auditLogger: AuditLogger
  ) {}
  
  async createUser(data: UserData) {
    const validated = this.validator.validate(data);
    const user = await this.repository.save(validated);
    await this.emailService.sendWelcomeEmail(user);
    await this.auditLogger.log('USER_CREATED', user.id);
    return user;
  }
}
```

## 参考资源

- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [TypeScript Performance Wiki](https://github.com/microsoft/TypeScript/wiki/Performance)
- [TypeScript 5.8 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html)
- [Total TypeScript](https://www.totaltypescript.com/tips)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)

## 更新记录

- 2026-03: 基于 TypeScript 5.8+ 更新，添加 NoInfer、改进的类型收窄
- 添加 verbatimModuleSyntax、isolatedModules 推荐
- 更新文件结构和命名约定