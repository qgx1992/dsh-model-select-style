/**
 * dsh-model-select-style 浏览器端 bundle（单文件，经 __ModuleLoader__ 加载）。
 *
 * 把输入框官方「模型选择」控件（@deepseek-ai/dsh-client-ui-model-selection 的
 * composer model seat：ModelSelect）替换为两个独立按钮：
 *   1. 「供应商」按钮 —— 点击弹出供应商列表；
 *   2. 「模型」按钮   —— 点击弹出当前所选供应商的模型列表（两级联动）。
 *
 * 实现方式（刻意不动官方组件/源码）：
 *   - 官方组件照常注册在 conversation.input.model（数据、目录服务、选择提交
 *     全复用），但用 CSS 把它的触发按钮和菜单隐藏；
 *   - 本插件通过 modelDirectories 服务读取同一份模型目录（groups = 供应商分组），
 *     在 conversation.input.right（list slot）追加两个自绘按钮；
 *   - 选择模型时调用官方 directory.select({provider, model})，官方 store 同步，
 *     输入框状态、Toast、推理等级面板等全部与原生行为一致。
 *
 * 定位锚点：
 *   - 官方 trigger：button[aria-haspopup="menu"][aria-label^="选择模型"|"Select model"]
 *   - 本插件的元素统一带 data-mss-* 前缀，绝不外溢到其他组件。
 *
 * 可调参数集中在 KNOBS 区，改完保存刷新页面即生效。
 */

window.__ModuleLoader__.load({
	id: "dsh-model-select-style",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const react = require("react");
		const { useSyncExternalStore, useState, useEffect, useRef, useMemo } = react;

		/* ═══════════════════════ KNOBS · 调参区 ═══════════════════════ */
		const knobs = {
			// 强调色：默认取主题品牌色；也可以写死如 "#4d6bfe"
			accent: "var(--dsw-alias-brand-primary)",
			accentText: "var(--dsw-alias-brand-text, var(--dsw-alias-brand-primary))",

			// 按钮
			buttonHeight: "28px",
			buttonTint: "8%",          // 静止态强调色混合浓度
			buttonTintHover: "16%",    // 悬停浓度
			buttonRadius: "8px",       // 常规圆角（非胶囊）

			// 弹出面板
			menuRadius: "12px",
			menuOpacity: "90%",
			menuBlur: "14px",
			optionRadius: "8px",

			motion: ".16s cubic-bezier(.4, 0, .2, 1)"
		};
		/* ══════════════════════════════════════════════════════════════ */

		// ── 官方 trigger 定位（用于隐藏）──
		const OFFICIAL_TRIG =
			'button[aria-haspopup="menu"][aria-label^="选择模型"], button[aria-haspopup="menu"][aria-label^="Select model"]';

		const css = `
/* ═══ dsh-model-select-style · 双按钮模型选择 ═══ */

/* ── 隐藏官方触发按钮与其菜单（数据/提交逻辑仍由官方组件持有）── */
${OFFICIAL_TRIG} {
	display: none !important;
}

/* ── 双按钮容器 ─────────────────────────────────────────────── */
[data-mss-seat] {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
}
[data-mss-btn] {
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: 4px;
	height: ${knobs.buttonHeight};
	padding: 0 9px;
	border: none;
	border-radius: ${knobs.buttonRadius};
	background: color-mix(in srgb, var(--mss-accent, ${knobs.accent}) ${knobs.buttonTint}, transparent);
	color: var(--mss-accent-text, ${knobs.accentText});
	font-size: 12px;
	font-weight: 500;
	line-height: 20px;
	cursor: pointer;
	white-space: nowrap;
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	transition: background ${knobs.motion}, box-shadow ${knobs.motion};
	outline: none;
}
[data-mss-btn]:hover:not(:disabled) {
	background: color-mix(in srgb, var(--mss-accent, ${knobs.accent}) ${knobs.buttonTintHover}, transparent);
}
[data-mss-btn]:focus-visible {
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--mss-accent, ${knobs.accent}) 55%, transparent);
}
[data-mss-btn]:disabled {
	cursor: default;
	opacity: .55;
}
[data-mss-btn][aria-expanded="true"] {
	background: color-mix(in srgb, var(--mss-accent, ${knobs.accent}) ${knobs.buttonTintHover}, transparent);
}
[data-mss-btn] .mss-caret {
	color: inherit;
	opacity: .7;
	flex: none;
	transition: transform ${knobs.motion};
}
[data-mss-btn][aria-expanded="true"] .mss-caret {
	transform: rotate(180deg);
}

/* ── 弹出面板（向上弹出、右缘对齐，与官方菜单一致，避免被底部遮挡）── */
[data-mss-panel] {
	position: absolute;
	bottom: calc(100% + 6px);
	right: 0;
	z-index: 120;
	min-width: 200px;
	max-width: min(320px, 70vw);
	max-height: min(340px, 60vh);
	overflow: auto;
	background: color-mix(in srgb, var(--dsw-specific-menu, #fff) ${knobs.menuOpacity}, transparent);
	backdrop-filter: blur(${knobs.menuBlur}) saturate(1.3);
	-webkit-backdrop-filter: blur(${knobs.menuBlur}) saturate(1.3);
	border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.08));
	border-radius: ${knobs.menuRadius};
	box-shadow: var(--dsw-shadow-lv3, 0 12px 32px rgba(0,0,0,.16));
	padding: 4px;
	animation: mss-panel-in ${knobs.motion} ease-out;
	transform-origin: bottom right;
	color: var(--dsw-alias-label-primary, inherit);
}
@keyframes mss-panel-in {
	from { opacity: 0; transform: translateY(3px) scale(.98); }
	to   { opacity: 1; transform: none; }
}
[data-mss-panel] .mss-group-title {
	color: var(--dsw-alias-label-tertiary, #999);
	font-size: 11px;
	line-height: 18px;
	padding: 5px 8px 2px;
}
[data-mss-panel] .mss-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 6px 8px;
	border: none;
	border-radius: ${knobs.optionRadius};
	background: none;
	color: inherit;
	font: inherit;
	font-size: 13px;
	line-height: 20px;
	text-align: left;
	cursor: pointer;
	transition: background ${knobs.motion};
}
[data-mss-panel] .mss-row:hover:not(:disabled) {
	background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05));
}
[data-mss-panel] .mss-row[aria-checked="true"] {
	background: color-mix(in srgb, var(--mss-accent, ${knobs.accent}) 12%, transparent);
}
[data-mss-panel] .mss-row .mss-check {
	color: var(--mss-accent-text, ${knobs.accentText});
	flex: none;
	font-size: 14px;
}
[data-mss-panel] .mss-row .mss-desc {
	display: block;
	color: var(--dsw-alias-label-caption, #999);
	font-size: 11px;
	line-height: 16px;
}
[data-mss-panel] .mss-empty {
	padding: 10px 8px;
	color: var(--dsw-alias-label-tertiary, #999);
	font-size: 12px;
	line-height: 18px;
}
[data-mss-panel] .mss-loading {
	padding: 10px 8px;
	color: var(--dsw-alias-label-tertiary, #999);
	font-size: 12px;
}
/* 推理等级区：与上方模型列表分隔 */
[data-mss-panel] .mss-effort-section {
	margin-top: 4px;
	padding-top: 4px;
	border-top: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.08));
}
`.trim();

		// ══════════════════════════════════════════════════════════════
		// 双按钮组件
		// ══════════════════════════════════════════════════════════════

		const NS = "model-select-style";

		const zh = {
			"seat.provider": "供应商",
			"seat.model": "模型",
			"seat.chooseProvider": "选择供应商",
			"seat.chooseModel": "选择模型",
			"seat.noProvider": "未选供应商",
			"seat.loading": "加载中…",
			"seat.empty": "暂无数据",
			"seat.selectHint": "请先选择供应商",
			"seat.effort": "推理等级",
			"seat.effortDefault": "Default"
		};
		const en = {
			"seat.provider": "Provider",
			"seat.model": "Model",
			"seat.chooseProvider": "Select provider",
			"seat.chooseModel": "Select model",
			"seat.noProvider": "No provider",
			"seat.loading": "Loading…",
			"seat.empty": "No data",
			"seat.selectHint": "Choose a provider first",
			"seat.effort": "Reasoning effort",
			"seat.effortDefault": "Default"
		};

		const inject = ["slots", "modelDirectories", "sessions", "locale"];

		/**
		* 供应商 / 模型 双按钮座。
		* @param props - sessionId + 官方目录服务的 face（directory store / load / select）。
		*/
		function ModelSeatSplit(props) {
			const { available, directory, load, select, t } = props;
			const state = useSyncExternalStore((fn) => directory.subscribe(fn), () => directory.getSnapshot());

			const [open, setOpen] = useState(null);      // null | "provider" | "model"
			const [pickedProvider, setPickedProvider] = useState(null); // 当前选中的供应商 id
			const rootRef = useRef(null);

			// 数据
			const groups = state.groups || [];
			const current = state.current;
			const busy = state.status === "selecting";

			// 当前供应商：优先本地选择，其次从 current 推断
			const currentProviderId =
				pickedProvider !== null && groups.some((g) => g.id === pickedProvider)
					? pickedProvider
					: current && groups.some((g) => g.id === current.provider)
						? current.provider
						: null;
			const currentProvider = groups.find((g) => g.id === currentProviderId) || null;
			const currentModel =
				current && currentProvider && current.provider === currentProviderId
					? currentProvider.models.find((m) => m.id === current.model) || null
					: null;

			// 打开时刷新目录
			useEffect(() => {
				if (available) load();
			}, [open, available, load]);

			if (!available) return null;

			// 点击外部关闭
			useEffect(() => {
				if (open === null) return;
				const onDown = (event) => {
					if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(null);
				};
				document.addEventListener("mousedown", onDown);
				return () => document.removeEventListener("mousedown", onDown);
			}, [open]);

			const chooseProvider = (groupId) => {
				setPickedProvider(groupId);
				setOpen(null);
			};
			const chooseModel = (model) => {
				// 与官方一致：支持推理的模型带上默认推理等级
				const selection = {
					provider: currentProviderId,
					model: model.id,
					...model.reasoning?.defaultEffort === void 0 ? {} : { reasoningEffort: model.reasoning.defaultEffort }
				};
				select(selection).then(() => {
					setOpen(null);
				});
			};
			const chooseEffort = (effort) => {
				if (current === null || currentProvider === null) return;
				select({
					provider: currentProviderId,
					model: current.model,
					...effort === void 0 ? {} : { reasoningEffort: effort }
				}).then(() => {
					setOpen(null);
				});
			};

			// ── 推理等级（与官方 effort 面板同构）──
			const reasoning = currentModel?.reasoning;
			const effectiveEffort = current?.reasoningEffort ?? reasoning?.defaultEffort;
			const effortLabel =
				reasoning === void 0
					? void 0
					: effectiveEffort === void 0
						? t("seat.effortDefault")
						: reasoning.efforts.find((l) => l.id === effectiveEffort)?.name ?? effectiveEffort;
			const effortChoices =
				reasoning === void 0
					? []
					: [
							...(reasoning.defaultEffort === void 0 ? [{ key: "default", effort: void 0, label: t("seat.effortDefault") }] : []),
							...reasoning.efforts.map((effort) => ({
								key: `effort:${effort.id}`,
								effort: effort.id,
								label: effort.name,
								...effort.description === void 0 ? {} : { description: effort.description }
							}))
						];

			// ── 供应商按钮文案 ──
			const providerLabel = currentProvider ? currentProvider.name : t("seat.noProvider");
			const modelLabel = currentModel ? currentModel.name : currentProvider ? t("seat.chooseModel") : t("seat.selectHint");
			// 模型按钮：支持推理时显示「模型名 · 推理等级」（与官方一致）
			const modelBtnLabel = effortLabel === void 0 ? modelLabel : `${modelLabel} · ${effortLabel}`;

			const h = react.createElement;

			return h("div", { ref: rootRef, "data-mss-seat": "", style: { position: "relative" } }, [
				// 按钮1：供应商
				h("button", {
					"data-mss-btn": "",
					type: "button",
					"aria-expanded": open === "provider",
					"aria-haspopup": "listbox",
					title: t("seat.chooseProvider"),
					onClick: () => setOpen(open === "provider" ? null : "provider")
				}, [
					providerLabel,
					h("span", { className: "mss-caret" }, "▾")
				]),
				// 按钮2：模型
				h("button", {
					"data-mss-btn": "",
					type: "button",
					"aria-expanded": open === "model",
					"aria-haspopup": "listbox",
					disabled: currentProvider === null || busy,
					title: currentProvider ? t("seat.chooseModel") : t("seat.selectHint"),
					onClick: () => setOpen(open === "model" ? null : "model")
				}, [
					modelBtnLabel,
					h("span", { className: "mss-caret" }, "▾")
				]),

				// ── 供应商面板 ──
				open === "provider" && h("div", { "data-mss-panel": "", role: "listbox" }, [
					state.status === "loading" && h("div", { className: "mss-loading" }, t("seat.loading")),
					state.status !== "loading" && groups.length === 0 && h("div", { className: "mss-empty" }, t("seat.empty")),
					...groups.map((g) =>
						h("button", {
							"data-mss-row": "",
							className: "mss-row",
							key: g.id,
							type: "button",
							role: "option",
							"aria-checked": currentProviderId === g.id,
							onClick: () => chooseProvider(g.id)
						}, [
							h("span", null, g.name),
							currentProviderId === g.id && h("span", { className: "mss-check" }, "✓")
						])
					)
				]),

				// ── 模型面板 ──
				open === "model" && currentProvider !== null && h("div", { "data-mss-panel": "", role: "listbox" }, [
					h("div", { className: "mss-group-title" }, currentProvider.name),
					state.status === "loading" && h("div", { className: "mss-loading" }, t("seat.loading")),
					state.status !== "loading" && currentProvider.models.length === 0 && h("div", { className: "mss-empty" }, t("seat.empty")),
					...currentProvider.models.map((m) =>
						h("button", {
							"data-mss-row": "",
							className: "mss-row",
							key: m.id,
							type: "button",
							role: "option",
							disabled: busy,
							"aria-checked": current && current.provider === currentProviderId && current.model === m.id,
							onClick: () => chooseModel(m)
						}, [
							h("span", null, [
								m.name,
								m.description !== void 0 && h("span", { className: "mss-desc" }, m.description)
							]),
							current && current.provider === currentProviderId && current.model === m.id && h("span", { className: "mss-check" }, "✓")
						])
					),
					// ── 推理等级区：当前模型支持推理时显示，可调节思考等级 ──
					effortChoices.length > 0 && h("div", { className: "mss-effort-section" }, [
						h("div", { className: "mss-group-title" }, t("seat.effort")),
						...effortChoices.map((level) =>
							h("button", {
								"data-mss-row": "",
								className: "mss-row",
								key: level.key,
								type: "button",
								role: "option",
								disabled: busy,
								"aria-checked": effectiveEffort === level.effort,
								onClick: () => chooseEffort(level.effort)
							}, [
								h("span", null, [
									level.label,
									level.description !== void 0 && h("span", { className: "mss-desc" }, level.description)
								]),
								effectiveEffort === level.effort && h("span", { className: "mss-check" }, "✓")
							])
						)
					])
				])
			]);
		}

		function apply(ctx) {
			// 1) 注入样式
			ctx.effect(() => {
				const tagId = "dsh-model-select-style/styles";
				if (typeof document === "undefined") return;
				const existing = document.querySelector(`style[data-plugin-css="${tagId}"]`);
				if (existing !== null) return () => existing.remove();
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-model-select-style";
				tag.dataset.pluginCss = tagId;
				tag.textContent = css;
				document.head.appendChild(tag);
				return () => tag.remove();
			}, "model-select-style: inject styles");

			// 2) 注册双按钮座到输入框右侧操作栏
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "model-select-style: dictionaries");
			const t = ctx.locale.bind(NS);

			ctx.inject(["slots", "modelDirectories", "sessions"], (scope) => {
				const models = scope.modelDirectories;
				const sessions = scope.sessions;

				scope.slots.inject("conversation.input.right", () => scope.slots.register({
					name: "conversation.input.right",
					id: "model-select-style-seat",
					locale: NS,
					inject: (sessionId) => {
						const directory = models.directoryFor(sessionId);
						const available = sessions.subagentAddress(sessionId) === void 0;
						return {
							available,
							directory: directory.store,
							load: () => {
								if (available) directory.load().catch(() => {});
							},
							select: (selection) => available ? directory.select(selection).then(() => true, () => false) : Promise.resolve(false),
							sessionId,
							t
						};
					}
				}, ModelSeatSplit));
			});
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
