# dsh-model-select-style

DSH Web 插件：把输入框官方的「模型选择」控件替换为**两个独立按钮**（供应商选择 + 模型选择），两级联动，不触碰其他界面元素，不改 DSH 任何一行源码。

## 交互方式

1. **「供应商」按钮** —— 点击弹出供应商列表（如 DeepSeek / SiliconFlow / OpenRouter）；
2. 选中某供应商后，「模型」按钮亮起；
3. **「模型」按钮** —— 点击只列出**当前所选供应商**的模型，点选即切换。

选择逻辑完全复用官方组件（同一份模型目录、同一套选择提交、错误 Toast、推理等级），只是把入口从单个按钮拆成两个。

## 实现原理

- 官方组件照常注册在 `conversation.input.model`（数据/提交逻辑原样保留），用 CSS 把官方触发按钮隐藏（`display:none`）；
- 本插件通过 `modelDirectories` 服务读取同一份模型目录（groups = 供应商分组），注册到 `conversation.input.right`（list slot）追加两个自绘按钮；
- 选择模型时调用官方 `directory.select({ provider, model })`，官方 store 同步更新，输入框状态与原生一致。

## 调参

打开 `lib/client.js`，顶部 `knobs` 区改完保存：

```js
const knobs = {
  accent: "var(--dsw-alias-brand-primary)", // 或写死 "#4d6bfe"
  buttonHeight: "28px",
  buttonTint: "8%",       // 按钮静止态强调色浓度
  buttonTintHover: "16%", // 悬停浓度
  buttonRadius: "8px",    // 按钮圆角（非胶囊）
  menuRadius: "12px",
  menuOpacity: "90%",     // 面板底色不透明度
  menuBlur: "14px",       // 面板背景模糊
  optionRadius: "8px",
  motion: ".16s cubic-bezier(.4, 0, .2, 1)"
};
```

保存后刷新网页即可生效（bundle 内容变化会重新计算 rev 缓存），无需重启。
注意：**首次把插件登记进 profile 后需要重启一次 DSH**；重启完成后再调参只需刷新页面。

## 演示

`demo/` 目录：
- `two-button.html` — 可交互模拟（点供应商→选供应商→点模型→选模型）
- `two-button-provider-open.html` — 供应商面板展开快照
- `two-button-model-open.html` — 已选 DeepSeek、模型面板展开快照

## 安装方式

**方式一：从 GitHub 安装（推荐）**

```bash
dsh plugin --profile web add github:qgx1992/dsh-model-select-style
```

或手动在 `~/.dsh/profiles/web/package.json`：
- dependencies 加 `"dsh-model-select-style": "github:qgx1992/dsh-model-select-style"`
- `dsh.profile.bundles` 加 `"dsh-model-select-style"`
- 在 profiles/web 目录执行 `pnpm install`，然后重启 DSH。

**方式二：本地开发**

1. 插件源码位于 `~/.dsh/local-plugins/dsh-model-select-style/`
2. `~/.dsh/profiles/web/package.json`：
   - dependencies 加 `"dsh-model-select-style": "link:C:/Users/QIU/.dsh/local-plugins/dsh-model-select-style"`
   - `dsh.profile.bundles` 加 `"dsh-model-select-style"`
3. 在 profiles/web 目录执行 `pnpm install`，然后重启 DSH。

> 注意：首次登记进 profile 后需要重启一次 DSH；之后调整 `lib/client.js` 只需刷新页面。

## 停用 / 卸载

- 临时停用：设置 → 插件 中停用本插件即可回到官方原生模型选择。
- 彻底卸载：从 bundles 与 dependencies 移除条目、删除 profiles/web/node_modules 内链接与 local-plugins 目录。

## 明确不覆盖的范围

- 输入框里输 `/model` 弹出的命令面板选择器走的是另一套 popupSelect 组件，本插件未涉及。
- 「推理等级」选择仍在官方下拉菜单中（模型按钮点选模型后，官方 toast/等级面板不受影响）。
