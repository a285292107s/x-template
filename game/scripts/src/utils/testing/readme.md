# Dota 2 Custom Game Test Framework

Jest 风格的测试框架，为 Dota 2 VScript 运行时设计。

## 快速开始

### 1. 编写测试

```typescript
// game/scripts/src/utils/testing/my_test.ts
import { describe, it, expect, delay } from './test_framework';

describe('MyModule', () => {
    it('sync test', () => {
        expect(1 + 1).toBe(2);
    });

    it('async test', async () => {
        let flag = false;
        Timers.CreateTimer(0.1, () => { flag = true; return null; });
        await delay(0.2);
        expect(flag).toBeTruthy();
    });
});
```

### 2. 注册测试

在 `game/scripts/src/utils/testing/index.ts` 中添加导入：

```typescript
import './my_test';
```

### 3. 运行测试

在游戏内聊天框输入：
- `-tx` — 运行所有测试套件
- `-tx MyModule` — 运行名称包含 "MyModule" 的套件

也可通过代码调用：

```typescript
import { runAll, printResult } from '../utils/testing';

runAll().then(result => printResult(result));
runAll('MyModule').then(result => printResult(result));
```

---

## API 参考

### 注册 API

| API | 说明 |
|-----|------|
| `describe(name, fn)` | 定义测试套件 |
| `describe.only(name, fn)` | 只运行此套件 |
| `describe.skip(name, fn)` | 跳过此套件 |
| `describe.each(table)(name, fn)` | 数据驱动的套件 |
| `xdescribe(name, fn)` | `describe.skip` 的别名 |
| `fdescribe(name, fn)` | `describe.only` 的别名 |
| `it(name, fn)` | 定义测试用例 |
| `it.only(name, fn)` | 只运行此用例 |
| `it.skip(name, fn)` | 跳过此用例 |
| `it.failing(name, fn)` | 期望此用例失败（失败=通过） |
| `it.todo(name)` | 标记待实现 |
| `it.each(table)(name, fn)` | 数据驱动的用例 |
| `it.concurrent(name, fn)` | **STUB** — Dota 2 无线程，顺序执行 |
| `test(name, fn)` | `it` 的别名，支持 `test.*` |
| `xit(name, fn)` | `it.skip` 的别名 |
| `fit(name, fn)` | `it.only` 的别名 |

### 生命周期钩子

| API | 说明 |
|-----|------|
| `beforeAll(fn)` | 套件所有用例前执行一次 |
| `afterAll(fn)` | 套件所有用例后执行一次 |
| `beforeEach(fn)` | 每个用例前执行 |
| `afterEach(fn)` | 每个用例后执行 |

### 匹配器 (Matchers)

#### 引用相等
| 匹配器 | 说明 |
|--------|------|
| `toBe(expected)` | 严格相等 `===` |
| `toEqual(expected)` | 深度相等 |
| `toStrictEqual(expected)` | 严格深度相等（检查 undefined 属性） |

#### 真值判断
| 匹配器 | 说明 |
|--------|------|
| `toBeTruthy()` | 值为真 |
| `toBeFalsy()` | 值为假 |
| `toBeNull()` | 值为 null |
| `toBeUndefined()` | 值为 undefined |
| `toBeDefined()` | 值已定义（非 undefined） |
| `toBeNaN()` | 值为 NaN |

#### 数值比较
| 匹配器 | 说明 |
|--------|------|
| `toBeGreaterThan(n)` | > n |
| `toBeGreaterThanOrEqual(n)` | >= n |
| `toBeLessThan(n)` | < n |
| `toBeLessThanOrEqual(n)` | <= n |
| `toBeCloseTo(n, precision)` | 浮点近似相等（默认精度 2） |

#### 字符串
| 匹配器 | 说明 |
|--------|------|
| `toMatch(pattern)` | 包含子串 |

#### 集合
| 匹配器 | 说明 |
|--------|------|
| `toContain(item)` | 数组包含元素 / 字符串包含子串 |
| `toContainEqual(item)` | 数组包含深度相等的元素 |
| `toHaveLength(n)` | 长度为 n |

#### 对象
| 匹配器 | 说明 |
|--------|------|
| `toHaveProperty(path, value?)` | 拥有属性（支持 `a.b.c` 路径） |
| `toMatchObject(subset)` | 匹配对象子集 |
| `toBeInstanceOf(Class)` | 实例类型检查 |

#### 异常
| 匹配器 | 说明 |
|--------|------|
| `toThrow(msg?)` | 函数抛出异常（可匹配消息） |

#### Mock 函数
| 匹配器 | 说明 |
|--------|------|
| `toHaveBeenCalled()` | 被调用过 |
| `toHaveBeenCalledTimes(n)` | 被调用 n 次 |
| `toHaveBeenCalledWith(...args)` | 被特定参数调用 |
| `toHaveBeenLastCalledWith(...args)` | 最后一次调用的参数 |
| `toHaveBeenNthCalledWith(n, ...args)` | 第 n 次调用的参数 |
| `toHaveReturned()` | 有返回值 |
| `toHaveReturnedTimes(n)` | 返回了 n 次 |
| `toHaveReturnedWith(value)` | 返回特定值 |
| `toHaveLastReturnedWith(value)` | 最后一次返回的值 |
| `toHaveNthReturnedWith(n, value)` | 第 n 次返回的值 |

#### 快照 — STUBS
| 匹配器 | 说明 |
|--------|------|
| `toMatchSnapshot()` | **不支持** — Dota 2 无文件系统 |
| `toMatchInlineSnapshot()` | **不支持** — Dota 2 无文件系统 |
| `toThrowErrorMatchingSnapshot()` | **不支持** |

#### 修饰符
| 修饰符 | 说明 |
|--------|------|
| `.not` | 取反 |
| `.resolves` | 对 Promise resolve 值断言（需 `await`） |
| `.rejects` | 对 Promise reject 值断言（需 `await`） |

### 异步支持

| API | 说明 |
|-----|------|
| `delay(seconds)` | 基于 `Timers.CreateTimer` 的 Promise 延时 |
| `async/await` | 原生支持 |
| `expect(promise).resolves.toBe(...)` | 断言 Promise resolve 值 |
| `expect(promise).rejects.toBe(...)` | 断言 Promise reject 原因 |

### Mock 函数

```typescript
const fn = jest_fn();                          // 空实现
const fn = jest_fn((x) => x * 2);             // 带实现

fn.mockReturnValue(42);                        // 始终返回 42
fn.mockReturnValueOnce(1).mockReturnValueOnce(2); // 第一次返回1，第二次返回2
fn.mockImplementation((x) => x + 10);          // 替换实现
fn.mockImplementationOnce((x) => x + 100);     // 替换一次实现

fn.mockClear();   // 清除调用记录（保留实现）
fn.mockReset();   // 清除调用记录 + 实现

// mockRejectedValue / mockResolvedValue — STUB（Dota 2 同步环境下有限支持）
```

### Spy

```typescript
const spy = spyOn(obj, 'methodName');
// obj.methodName 被替换为 mock，同时调用原始实现

expect(spy).toHaveBeenCalledWith('arg');
restoreSpy(spy);  // 恢复原始方法
```

### 异步匹配器 (Asymmetric Matchers)

```typescript
expect.any(Number)            // 匹配任意 Number
expect.any(String)            // 匹配任意 String
expect.any(MyClass)           // 匹配 MyClass 实例
expect.anything()             // 匹配非 null/undefined

expect.objectContaining({ a: 1 })   // 包含指定属性
expect.arrayContaining([2, 3])      // 包含指定元素
expect.stringContaining('hello')    // 包含指定子串
expect.stringMatching('world')      // 匹配子串
expect.closeTo(0.3, 5)             // 浮点近似

expect.not.objectContaining(...)    // 不包含
expect.not.arrayContaining(...)     // 不包含
expect.not.stringContaining(...)    // 不包含
expect.not.stringMatching(...)      // 不匹配
```

### 断言计数

```typescript
expect.assertions(3);    // 确保此用例有 3 个断言
expect.hasAssertions();  // 确保至少有 1 个断言
```

### 数据驱动测试

```typescript
// 数组形式
it.each([[1, 2, 3], [2, 3, 5]])('add %p + %p = %p', (a, b, expected) => {
    expect(a + b).toBe(expected);
});

// 对象形式（$key 占位符）
it.each([{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }])(
    '$name is $age',
    (data) => {
        expect(data.age).toBeGreaterThan(0);
    },
);
```

### 不支持的 API (Stubs)

以下 API 提供了占位函数，调用时会打印提示信息：

| API | 原因 |
|-----|------|
| `expect.extend()` | Dota 2 运行时无法动态扩展匹配器 |
| `expect.addEqualityTesters()` | 同上 |
| `expect.addSnapshotSerializer()` | 无文件系统 |
| `toMatchSnapshot()` | 无文件系统 |
| `toMatchInlineSnapshot()` | 无文件系统 |
| `toThrowErrorMatchingSnapshot()` | 无文件系统 |
| `toThrowErrorMatchingInlineSnapshot()` | 无文件系统 |
| `it.concurrent()` | Dota 2 无多线程 |
| `mock.mockResolvedValue()` | 同步环境下有限支持 |
| `mock.mockRejectedValue()` | 同步环境下有限支持 |

---

## 文件结构

```
game/scripts/src/utils/testing/
├── test_framework.ts   # 框架核心 (~1600 行)
├── example_test.ts     # 示例测试用例
├── index.ts            # 导出入口 + 测试注册
└── readme.md           # 本文档
```

## 热重载支持

测试框架通过 `clearSuites()` 支持热重载。`script_reload` 后旧套件会被清除，新套件重新注册。

## 与 Jest 的差异

1. **无文件系统**：快照测试不可用，使用 `toEqual` 替代
2. **无正则表达式**：`toMatch` 和 `stringMatching` 使用子串匹配而非正则
3. **无并发**：`it.concurrent` 顺序执行
4. **Promise 兼容**：依赖 TSTL 的 `lualib_bundle` 提供 Promise polyfill
5. **typeof 差异**：Lua 的 `type()` 与 JS `typeof` 不同，框架已做适配

### Lua 运行时语义差异

由于 Dota 2 VScript 运行在 Lua 环境中，以下 JS/Lua 语义差异已被框架处理：

| 差异 | 说明 | 框架处理 |
|------|------|---------|
| `0` 和 `""` 在 Lua 中是 truthy | Lua 中 `if 0 then` 为真 | `toBeFalsy()`/`toBeTruthy()` 使用 Jest 语义 |
| `null` 和 `undefined` 都是 `nil` | Lua 没有 `undefined`，`null` 编译为 `nil` | `toBeNull()`/`toBeUndefined()` 都匹配 `nil`；`toBeDefined()` 匹配非 `nil` |
| 数组长度 | Lua 用 `#table`，TSTL 数组有 `.length` | `toHaveLength()` 自动检测两种方式 |
| 对象比较 | Lua 用 `pairs()` 遍历，不区分键类型 | `deepEqual()` 统一用 `pairs` 收集键后比较 |
| 方法调用 | Lua 用 `:` 语法调用方法 | `spyOn` 使用 `original(object, ...)` 传 self |
| `noImplicitSelf` | tsconfig 已启用，避免 TSTL 自动添加 `self` | 确保普通函数不会被编译为方法 |

**重要提示**：由于 `null` 和 `undefined` 在 Lua 中等价，以下断言行为与 JS 不同：
- `expect(null).toBeUndefined()` — ✅ 通过（JS 中失败）
- `expect(null).toBeDefined()` — ❌ 失败（JS 中通过）
- `expect(null).not.toBeUndefined()` — ❌ 失败（JS 中通过）

如果需要区分 `null` 和 `undefined`，这无法在 Lua 运行时实现。建议避免依赖此区分的测试。
