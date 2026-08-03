### 虚拟 DOM 与 fiber

概念：

1. **虚拟 DOM**：用 JS 对象描述 UI，先算差异，再少改真实 DOM。
2. Filber：虚拟 DOM 机制在 react 的实现

filber：每个组件/DOM 节点对应一个 **fiber 节点**对象，整棵 UI 变成一棵 **fiber 树。**

1. Fiber 树不是用 `children: []` 数组，而是用 `child / sibling / return` 三条指针串成的链表树。


| **字段**    | **意义**                           |
| --------- | -------------------------------- |
| `return`  | 父 fiber                          |
| `child`   | 第一个子 fiber                       |
| `sibling` | 下一个兄弟 fiber                      |
| `index`   | 在兄弟里的位置（无 key 时参与配对）             |
| `key`     | 同层兄弟的数据身份（有 key 时优先用 key + type） |
| `type`    | 组件/DOM 类型，必须一致才能复用               |




### 理解 react 更新机制


|      | **React Element**                      | **Fiber**                              |
| ---- | -------------------------------------- | -------------------------------------- |
| 是什么  | JSX 产出的**临时描述** `{ type, props, key }` | 运行时**持久存在**的对象                         |
| 何时产生 | 每次函数组件执行的结果                            | 首次挂载创建，更新时**尽量复用**                     |
| 存什么  | 这次 UI「长什么样」                            | type、props、state、hooks、DOM 引用、effect 等 |


更新时：不是整棵 Fiber 树全局对比，也不是先生成一整棵新 Fiber 子树再 diff。而是重新执行函数组件得到新的 **React Element 树**，拿**新 Element** 树和其对应的旧 Filber 树逐层 reconcile。

reconcile：判断**同层**的哪些节点应该创建、销毁、更新、移动

逐层 reconcile：使用深度优先策略对每一层进行 reconcile。

跳过子树：`React.memo` 且 props 没变下不会进入子树进行 reconsile。

reconsile 时如何判断是否为同一节点？


| 情况              | 配对依据，filer 节点的字段      |
| --------------- | --------------------- |
| 多个子节点，**有 key** | `key` + `type`        |
| 多个子节点，**无 key** | `index`（兄弟顺序）+ `type` |
| 只有 1 个子节点       | 通常直接按位置配对，靠 `type`    |


旧树没有对应项 → 新建 fiber，挂 DOM；新树没有对应项 → 卸载 fiber，拆 DOM；配对成功（同 type，有 key 则 key 相同）→ 复用 fiber，改 props，必要时继续往下 reconcile 子节点；还是同一个（靠 key 认出），只是兄弟顺序变了 → 复用，改位置。

### 延伸问题：为什么列表子项要有唯一 key？用 index 作 key 有什么问题？

因为列表项是同 type 的，不设置唯一 key 只剩下 index 作为判断唯一条件，但列表会增删/调整顺序。这会导致在 reconcile 时 react element 树和对应的 filber 树匹配错误。会导致子项状态错误以及性能下降。

#### 用 index 作 key：状态错误

```
旧: [0]买牛奶  [1]写代码(已勾选)  [2]跑步
删掉「买牛奶」后：
新: [0]写代码  [1]跑步
```

由于 type 都相同，【2 跑步】被删除，【0 牛奶】被更新为【0 写代码】，【1 写代码】更新为【1 跑步】。

为什么勾选状态不会被更新为非勾选？

因为常见写法里，勾选是 **组件内部 state**，不是随 `todo` props 下来的：

```ts
function TodoItem({ todo }) {
  const [checked, setChecked] = useState(false) // 只在「首次挂载」用一次
  return (
    <li>
      <input type="checkbox" checked={checked} onChange={...} />
      {todo.text}  {/* 这个会随 props 更新 */}
    </li>
  )
}
```

**reconsile 只会更新 props !**

**如果勾选状态有 props 驱动，则也会变化。**

#### 用 index 作 key：性能下降

如果用 key 的话，只需要删除 【1 买牛奶】的 filber ，剩下的 filber 换位置就可以复用了。但现在删除了一个，更新了两个，这同时也意味着 DOM 操作。这在大数据的列表中浪费性能。

#### 何时 index 还可以？

列表**静态**（不增删重排）+ 项**无内部 state** + 无非受控输入等。一旦动态变化，用稳定唯一的 id。

### 延伸问题：为什么非列表子项通常不需要 key？编辑器也不强制？

因为在非列表场景下一般不会有增删/改变顺序的情况。

1. checked 在 false 下也不会header、main、footer 都会被删除，然后 main 和 footer 会被重建，因为 false 会占据 index = 0

```tsx
<>
  {checked && <header />}
  <main />
  <footer />
</>
```
2. 这个会

```tsx
{checked ? (
  <>
    <header />
    <main />
    <footer />
  </>
) : (
  <>
    <main />
    <footer />
  </>
)}
```

## JSX

### 通过事件委托来性能优化

- JSX 上的 `onClick={...}` 并没有把监听器绑到那个真实 DOM 上，而是挂在对应的 filber.props 上，react 真正挂在浏览器上的，通常只有根容器上那几个原生监听。真实 DOM 触发时，事件会冒泡到 root，根据 `event.target`  **React 自己在 filber 树里“再冒泡一遍”找到 filber 节点并执行 handler**
- **对于捕获事件同理，在捕获事件触发到 root 时在其原生事件中根据** `event.target` 。。。

所有事件都走事件委托吗？不

- 对于不冒泡也不捕获的事件，通常使用其他事件代替。如 `focus`/`blur` 不冒泡，`focusin`/`focusout` 会，在 `onFocus` 事件内部使用后者代替；`onMouseEnter` / `onMouseLeave` 往往用 `mouseover` / `mouseout`（会冒泡）再加上 `relatedTarget` 判断「是不是刚进入/离开这个组件」，在组件树里**模拟**进入/离开语义
- 个别事件直接挂载到对应 DOM：有些事件既不好委托、语义又绑在具体元素上（部分媒体事件如 `load`/`error`，以及某些特殊情况），React 会在**那个 DOM 节点**上直接加监听，而不是只靠根委托。

那在 react 中开发者是不是就再也不用自己写事件委托了，因为 react 已经做了？不是

1. 你想要的是少挂原生监听，那可以不用做了。比如在 ul>li 下一般都使用 map 来处理，只要在 li 上挂 onClick 事件即可，不用考虑在 ul 上
2. 富文本、图表库、自己 `appendChild` 的节点、部分 canvas/widget——**不走 React 合成事件**。这时经典委托仍然有用。



### 通过合成事件来实现跨浏览器一致性、统一 API

在 fiber 树中冒泡或捕获找到 handler 之后，react 把原生 event 包成 合成事件，再调用你的 onClick。

跨浏览器兼容，尤其是 IE：


| **差异点**  | **常见分裂**                                     |
| -------- | -------------------------------------------- |
| 事件对象从哪来  | 标准：参数里的 `event`；老 IE：`window.event`          |
| 目标节点     | `event.target` vs `event.srcElement`         |
| 阻止默认     | `preventDefault()` vs `returnValue = false`  |
| 阻止冒泡     | `stopPropagation()` vs `cancelBubble = true` |
| 坐标、按键等字段 | 名字或计算方式不一致                                   |


1. 使用一套 API，不管底层浏览器是什么
2. 仍然可以通过 `e.nativeEvent` 访问浏览器原生事件对象。



### 不走react事件委托和合成事件的节点

由 React 创建的节点才会生成 filber，如果某个 DOM 不是 React `createElement` / JSX 渲出来的，如

- 富文本编辑器在自己的编辑器容器里塞 DOM、自己绑键盘/鼠标；
- 图表库（ECharts、D3 等）在一个空 `div` 里画 SVG/Canvas
- 自己监听；自己 `appendChild`
- 点击落在 canvas 像素上

这些库可能内部实现事件委托但不参与 react 这套事件委托机制。当点击真实 DOM 时会在浏览器冒泡或捕获阶段来处理，事件对象也不是合成事件而是原生事件。如果走到了 root 因为组件树中没有这个节点所以也不会在组件树中冒泡。