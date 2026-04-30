# TipAi UI 美化进化 — 原子任务清单

> 来源: `tipai-extreme-ui-design-spec.md` (极致 UI/UX 设计规格)
> 版本: v1.0 | 日期: 2026-04-30
> 总任务数: 42 | 预计总工期: 5-6 周

---

## 任务总览

| 批次 | 优先级 | 任务数 | 工期 | 状态 |
|------|--------|--------|------|------|
| Phase 1 | P0 | 12 | 1-1.5 周 | ⬜ |
| Phase 2 | P1 | 16 | 2-2.5 周 | ⬜ |
| Phase 3 | P2 | 14 | 1.5-2 周 | ⬜ |

---

## Phase 1 — 基础设施 & 核心视觉系统 (P0)

必须先完成，所有后续任务依赖此阶段。不做完 Phase 1，Phase 2/3 无法执行。

---

### P0-1 搭建弹簧动画核心库

**优先级:** P0 | **编号:** P0-1 | **工期:** 4h

**详细描述:**
实现自研弹簧解算器，不依赖 framer-motion 的底层也可以独立运行。定义 5 种弹簧手感预设，提供统一的 `useSpring` Hook。

**涉及文件:**
- 新建 `src/lib/animation/springs.ts`
- 新建 `src/lib/animation/easings.ts`
- 新建 `src/lib/animation/perf.ts`
- 新建 `src/hooks/useSpring.ts`

**验收标准:**
- [ ] `SPRINGS.snappy/smooth/gentle/bouncy/heavy` 5 种预设定义完成
- [ ] `useSpring(targetValue, config)` 可返回当前插值，支持 RAF 驱动
- [ ] `springs.ts` 导出手动弹簧解算函数（用于非 React 场景）
- [ ] `perf.ts` 提供 `measureFPS()` 和 `measureLayoutShift()` 辅助
- [ ] 单元测试: 弹簧值在 500ms 内收敛到目标值误差 < 0.1%

**设计规格引用:** §4.1 弹簧物理引擎

---

### P0-2 安装动画依赖包

**优先级:** P0 | **编号:** P0-2 | **工期:** 1h

**详细描述:**
安装 framer-motion（主动画库）、lenis（平滑滚动）、@use-gesture/react（拖拽手势）。配置 TypeScript 类型兼容。

**涉及文件:**
- `package.json`
- `package-lock.json`
- `tsconfig.json`（如有类型冲突需调整）

**验收标准:**
- [ ] `npm install framer-motion lenis @use-gesture/react` 成功
- [ ] `npm run check` (tsc) 0 errors
- [ ] `npm run build` 通过，产物中动画库代码被正确 tree-shake

**设计规格引用:** §12.1 新增依赖

---

### P0-3 Apple Design CSS Token 系统落地

**优先级:** P0 | **编号:** P0-3 | **工期:** 4h

**详细描述:**
将 Apple Design 配色系统全部写入 CSS 变量，覆盖 Light/Dark 双模式、语义化映射、材质 token。同步扩展 tailwind.config.js。

**涉及文件:**
- 修改 `src/index.css`（新增完整 CSS 变量区）
- 修改 `tailwind.config.js`（扩展 colors / boxShadow）
- 新建 `src/lib/theme/tokens.ts`（运行时 JS 访问 token）

**验收标准:**
- [ ] Light/Dark 模式下所有 `--color-*` / `--bg-*` / `--text-*` 变量可切换
- [ ] Tailwind 支持 `apple.blue` / `apple.purple` / `shadow-apple-glow-blue` 等类名
- [ ] 对比度验证: 主文字 16.5:1，次要 5.8:1，占位符 3.2:1
- [ ] Dark 模式自动跟随系统 `prefers-color-scheme`

**设计规格引用:** §2.0.1-2.0.9 Apple Design 配色系统

---

### P0-4 Aurora 背景引擎 (WebGL/Canvas)

**优先级:** P0 | **编号:** P0-4 | **工期:** 1 天

**详细描述:**
实现动态 Aurora 流体渐变背景。3-4 层 blob 色块漂移，响应鼠标磁场扰动，使用 Apple 系统色盘。支持 WebGL 加速 + Canvas2D fallback。

**涉及文件:**
- 新建 `src/components/effects/AuroraBackground.tsx`
- 新建 `src/components/effects/AuroraBackground.worker.ts`（OffscreenCanvas Worker）
- 新建 `src/lib/effects/aurora.ts`（核心渲染逻辑）

**验收标准:**
- [ ] Light 模式: 蓝/紫/粉/青 blob 融合，Screen Blend
- [ ] Dark 模式: 深蓝紫调 + 星空微粒子
- [ ] 鼠标移动时最近 blob 产生涟漪位移
- [ ] WebGL 不可用自动降级 Canvas2D
- [ ] 标签页不可见时停止渲染（节省 GPU）
- [ ] GPU 时间/帧 < 1ms，60fps 在 Intel UHD 稳定
- [ ] `prefers-reduced-motion` 时降级为静态渐变

**设计规格引用:** §3.1 动态 Aurora 背景引擎

---

### P0-5 减少运动适配全局 Hook

**优先级:** P0 | **编号:** P0-5 | **工期:** 2h

**详细描述:**
实现 `useReducedMotion()` Hook，检测 `prefers-reduced-motion`。所有动画系统必须查询此 Hook，在减少运动模式下跳过动画。

**涉及文件:**
- 新建 `src/hooks/useReducedMotion.ts`
- 修改 `src/lib/animation/springs.ts`（弹簧动画在 reduce-motion 时直接跳到终值）
- 修改 `src/components/effects/AuroraBackground.tsx`（停止漂移）

**验收标准:**
- [ ] `useReducedMotion()` 正确返回 boolean
- [ ] 系统开启"减少动态效果"时，所有弹簧动画时长变为 1ms
- [ ] Aurora 停止漂移，保留静态渐变
- [ ] 滚动揭示动画禁用

**设计规格引用:** §6.3 动画调度与节流（减少运动段落）

---

### P0-6 GPU 合成层基础设施

**优先级:** P0 | **编号:** P0-6 | **工期:** 3h

**详细描述:**
建立全局 GPU 合成层管理。定义 `.gpu-layer` 工具类，动画前自动添加 `will-change`，动画后自动移除。避免 layout thrashing。

**涉及文件:**
- 修改 `src/index.css`（新增 `.gpu-layer` / `.content-island` / `contain-*` 工具类）
- 新建 `src/hooks/useGPULayer.ts`
- 新建 `src/lib/animation/layerManager.ts`（RAF 批量更新磁吸元素）

**验收标准:**
- [ ] `.gpu-layer` 使用 `translateZ(0) + backface-visibility: hidden`
- [ ] `useGPULayer(ref, active)` 在 active 时设置 will-change，非 active 时移除
- [ ] `layerManager.ts` 提供 `scheduleFrame(callback)` 批量 RAF 更新
- [ ] Chrome DevTools Layers 面板可看到正确分层

**设计规格引用:** §6.1 渲染管道优化

---

### P0-7 材质卡片系统 (Glass + Material)

**优先级:** P0 | **编号:** P0-7 | **工期:** 4h

**详细描述:**
实现 4 级 Glass 材质卡片 + Material 卡片。包含 backdrop-filter blur、saturate、层级阴影、hover 品牌色 glow 边框。

**涉及文件:**
- 修改 `src/index.css`（Glass 1-4 材质类 + Material Card 类）
- 新建 `src/components/ui/GlassCard.tsx`
- 新建 `src/components/ui/MaterialCard.tsx`

**验收标准:**
- [ ] Glass-1/2/3/4 四级透明度 + blur 组合正确
- [ ] Material Card hover 时边框变为品牌色微光 (`rgba(0,122,255,0.15)`) + 外发光
- [ ] Dark 模式下 Glass 透明度降低 10%，blur 增加
- [ ] 卡片 3D tilt 效果可在此组件上叠加（预留接口）

**设计规格引用:** §2.0.4 材质色彩 — Glass & Material

---

### P0-8 涟漪按钮组件 (RippleButton)

**优先级:** P0 | **编号:** P0-8 | **工期:** 3h

**详细描述:**
通用按钮组件，集成 press 内陷 + release 回弹 + 涟漪扩散。支持磁吸效果可叠加。

**涉及文件:**
- 新建 `src/components/ui/RippleButton.tsx`
- 修改 `src/index.css`（ripple 动画 keyframes）

**验收标准:**
- [ ] Hover: scale(1.03) + glow 阴影扩散
- [ ] Press(mousedown): scale(0.96) + translateY(1px) + 阴影收缩
- [ ] Release: spring 回弹，有轻微 overshoot (bouncy)
- [ ] 成功操作时从点击位置发出环形波纹（扩散 4x 后消失）
- [ ] 可接受 children 和 onClick，兼容现有 shadcn Button 接口

**设计规格引用:** §5.2 按钮的"肉体感"

---

### P0-9 磁吸效果 HOC (MagneticWrapper)

**优先级:** P0 | **编号:** P0-9 | **工期:** 4h

**详细描述:**
实现磁吸光标系统。可交互元素在光标进入 60px 范围时向光标方向位移（max 8px），使用 spring: magnetic。离开后立即弹回。

**涉及文件:**
- 新建 `src/components/effects/MagneticWrapper.tsx`
- 新建 `src/hooks/useMagnetic.ts`
- 修改 `src/lib/animation/layerManager.ts`（磁吸更新纳入 RAF 批量）

**验收标准:**
- [ ] 光标进入元素 60px 范围时，元素向光标位移（最大 8px）
- [ ] 位移使用 spring: magnetic 参数（stiffness: 150, damping: 15）
- [ ] 位移同时元素 scale 1.02 + glow 增强
- [ ] 光标离开时弹回原位（spring: snappy）
- [ ] 使用 RAF 批量更新，避免逐元素 layout thrashing
- [ ] 缓存 `getBoundingClientRect`，只在 resize/scroll 时重新计算
- [ ] `prefers-reduced-motion` 时完全禁用

**设计规格引用:** §5.1 磁吸光标

---

### P0-10 3D 倾斜卡片 (TiltCard)

**优先级:** P0 | **编号:** P0-10 | **工期:** 3h

**详细描述:**
卡片跟随鼠标位置产生 3D 倾斜效果。`rotateY` 由光标 X 位置驱动，`rotateX` 由 Y 位置驱动，最大 10deg。

**涉及文件:**
- 新建 `src/components/effects/TiltCard.tsx`
- 新建 `src/hooks/useTilt.ts`

**验收标准:**
- [ ] 卡片使用 `transform-style: preserve-3d` + `perspective(800px)`
- [ ] `rotateY = (cursorX - 0.5) * 10deg`，`rotateX = (0.5 - cursorY) * 10deg`
- [ ] 鼠标离开时 spring 弹回平面
- [ ] 卡片同时有悬浮 translateZ(20px) + 物理阴影
- [ ] 可与 MagneticWrapper 叠加使用
- [ ] `prefers-reduced-motion` 时禁用

**设计规格引用:** §7.2 卡片悬浮系统

---

### P0-11 文字揭示动画组件 (TextReveal)

**优先级:** P0 | **编号:** P0-11 | **工期:** 3h

**详细描述:**
实现 Living Typography 系统。逐字/逐词 stagger 淡入 + blur 清晰 + 可选 gradient shimmer。

**涉及文件:**
- 新建 `src/components/effects/TextReveal.tsx`
- 修改 `src/index.css`（`@keyframes livingCharIn`）

**验收标准:**
- [ ] 文字逐字/逐词入场，stagger 间隔 30ms + 随机抖动 15ms
- [ ] 入场动画: `opacity 0→1` + `translateY 20px→0` + `blur 4px→0` + `scale 0.95→1`
- [ ] 支持 `gradient-shimmer` 模式（文字渐变从左到右流动）
- [ ] 支持 `weight-shift` 模式（字重 300→600 动画，需可变字体）
- [ ] 入场完成后停止 RAF，不再消耗资源

**设计规格引用:** §3.2 活字排版 (Living Typography)

---

### P0-12 输入框活态系统 (LivingInput)

**优先级:** P0 | **编号:** P0-12 | **工期:** 4h

**详细描述:**
输入框聚焦时边框 glow 从中心扩散，占位符呼吸脉动，打字时有微震动反馈，错误时抖动。

**涉及文件:**
- 新建 `src/components/ui/LivingInput.tsx`
- 新建 `src/components/ui/FloatingLabel.tsx`
- 修改 `src/index.css`（input-glow keyframes, shake keyframes）

**验收标准:**
- [ ] 聚焦: `box-shadow` 从中心对称扩散（border-image 动画或 box-shadow 脉冲）
- [ ] 占位符默认呼吸: `opacity 0.5→0.8→0.5`，周期 3s
- [ ] 聚焦时占位符上浮缩小为 label（Floating Label，0.25s spring）
- [ ] 每输入一个字符: 极微弱震动 `translateX 0→0.5px→0`
- [ ] 错误: `shake` 动画（translateX ±4px，3 次，spring: snappy）+ Red glow
- [ ] 自动补全 ghost text 淡入在光标后
- [ ] 与现有 shadcn/ui Input 组件 API 兼容

**设计规格引用:** §5.4 输入框的"活态"

---

## Phase 2 — 全局体验 & 核心页面 (P1)

依赖 Phase 1 基础设施。可在 Phase 1 部分完成后并行启动。

---

### P1-1 全局页面过渡系统 (3D 空间切换)

**优先级:** P1 | **编号:** P1-1 | **工期:** 6h

**详细描述:**
实现页面 A → 页面 B 的 3D 空间滑动过渡。页面 A retreat（scale↓ + opacity↓ + translateZ↓），页面 B emerge（translateY↑ + blur↓）。

**涉及文件:**
- 新建 `src/components/layout/PageTransition.tsx`
- 修改 `src/App.tsx`（路由出口包裹 AnimatePresence）
- 修改 `src/index.css`（perspective 容器样式）

**验收标准:**
- [ ] 根容器 `perspective: 1200px`，页面 `transform-style: preserve-3d`
- [ ] 离开页面: `scale(1→0.92)` + `opacity(1→0.5)` + `translateZ(0→-200px)`
- [ ] 进入页面: `translateY(40px→0)` + `opacity(0→1)` + `blur(8px→0)`
- [ ] 使用 `AnimatePresence` 处理卸载，卸载动画完成后再真正移除 DOM
- [ ] 过渡期间 Aurora 背景产生涟漪扰动（磁场放大 2 倍）
- [ ] `prefers-reduced-motion` 时直接硬切（无过渡）

**设计规格引用:** §4.2 页面过渡 — 空间深度切换

---

### P1-2 全局平滑滚动 (Lenis) + 视差层

**优先级:** P1 | **编号:** P1-2 | **工期:** 4h

**详细描述:**
接入 Lenis 平滑滚动。实现 4 层视差：Aurora（×0.1）、装饰图形（×0.3）、内容（×1.0）、前景（×-0.1）。

**涉及文件:**
- 修改 `src/main.tsx`（Lenis 初始化）
- 新建 `src/hooks/useScrollProgress.ts`
- 新建 `src/components/effects/ParallaxLayer.tsx`

**验收标准:**
- [ ] 滚动平滑，无原生滚动顿挫感
- [ ] 4 层视差速度正确分配
- [ ] 与虚拟滚动（Phase 2 后期）兼容，不冲突
- [ ] 在移动端（触摸滚动）下表现正常
- [ ] `prefers-reduced-motion` 时禁用视差，保留平滑滚动

**设计规格引用:** §4.4 滚动驱动的视差与揭示

---

### P1-3 全局滚动揭示系统 (ScrollReveal)

**优先级:** P1 | **编号:** P1-3 | **工期:** 4h

**详细描述:**
元素进入视口 20% 时自动触发入场动画。使用 Intersection Observer，will-change 动态管理。

**涉及文件:**
- 新建 `src/components/effects/ScrollReveal.tsx`
- 新建 `src/hooks/useIntersectionReveal.ts`
- 修改 `src/index.css`（reveal 动画 keyframes）

**验收标准:**
- [ ] Intersection Observer threshold: 0.2，rootMargin: 50px
- [ ] 进入视口: `opacity 0→1` + `translateY 30px→0` + `rotateX 10deg→0`
- [ ] 动画前自动设置 `will-change: transform, opacity`
- [ ] 动画完成后移除 will-change
- [ ] 离开视口时可选择反向或保持（可配置）
- [ ] 支持 stagger（同组子元素依次入场）

**设计规格引用:** §4.4 滚动驱动的视差与揭示

---

### P1-4 全局 Command Palette (Cmd+K)

**优先级:** P1 | **编号:** P1-4 | **工期:** 1 天

**详细描述:**
全局搜索面板。支持项目/提示词/模板搜索，快捷操作区，键盘导航（↑/↓/Enter/Esc）。出现使用"舞台"动画。

**涉及文件:**
- 新建/完善 `src/components/search/CommandPalette.tsx`
- 修改 `src/hooks/useKeyboardShortcuts.ts`（注册 Cmd+K）

**验收标准:**
- [ ] `Cmd/Ctrl + K` 触发，模态框居中 + 半透明遮罩
- [ ] 遮罩: `opacity 0→1` + `backdrop-filter blur(0→8px)`
- [ ] 面板: `scale(0.85→1)` + `translateY(30px→0)` + `rotateX(8deg→0)`，spring: gentle
- [ ] 搜索范围: 项目（名称/描述）、提示词库（标题/内容）、模板（名称）
- [ ] 快捷操作区: Cmd+N 创建项目、Cmd+O 打开优化器、Cmd+E 导出
- [ ] 键盘导航: ↑/↓ 选择, Enter 确认, Esc 关闭
- [ ] 面板内容 stagger 入场（0.05s 起，每项 +0.02s）

**设计规格引用:** §7.3 模态框的"舞台"出现 + §5.4 输入框活态

---

### P1-5 全局 Toast 通知系统升级

**优先级:** P1 | **编号:** P1-5 | **工期:** 3h

**详细描述:**
现有 sonner 基础上升级 Toast 进入/退出动画。使用 3D 空间层（translateZ: 150px），spring 入场。

**涉及文件:**
- 修改 `src/components/ui/sonner.tsx`
- 修改 `src/index.css`（toast 动画 keyframes）

**验收标准:**
- [ ] Toast 从屏幕右下/上方滑入: `translateX(20px→0)` + `scale(0.95→1)` + `opacity(0→1)`
- [ ] 使用 spring: snappy
- [ ] 成功 Toast: 左侧有 3px 绿色指示条滑入
- [ ] 错误 Toast: 左侧有 3px 红色指示条 + 轻微 shake
- [ ] 多个 Toast 堆叠时有 z-index 深度差（像卡片堆叠）
- [ ] 自动消失前 3s 进度条从右向左收缩
- [ ] 消失: `translateX(0→30px)` + `opacity(1→0)` + `scale(1→0.9)`

**设计规格引用:** §7.3 模态框舞台出现（Toast 属于 Depth 6 层）

---

### P1-6 Sidebar 玻璃增强 + 抽屉物理

**优先级:** P1 | **编号:** P1-6 | **工期:** 6h

**详细描述:**
升级现有 Sidebar。glass blur 增强到 30px + saturate 200%。导航项磁吸 hover。激活指示器液态滑入。展开/收起有物理抽屉感。

**涉及文件:**
- 修改 `src/components/Sidebar.tsx`
- 修改 `src/components/Navbar.tsx`（macOS 标题栏区联动）
- 修改 `src/index.css`（sidebar-glass 增强类）

**验收标准:**
- [ ] glass: `backdrop-filter: blur(30px) saturate(200%)`
- [ ] 导航项 hover: 磁吸 + 背景渐变从中心向两边扩散
- [ ] 激活项左侧 3px Primary indicator，液态滑入（spring: snappy）
- [ ] 激活项图标旋转 5deg + scale 1.1
- [ ] 侧边栏展开: spring: heavy，主内容区被挤开 translateX(20px) + scale(0.98)
- [ ] 侧边栏收起: 主内容先弹回，侧边栏随后滑出（先后节奏）
- [ ] 移动端: 底部导航或 sheet 抽屉

**设计规格引用:** §7.4 侧边栏的"抽屉"物理 + §10.2 Sidebar 极致版

---

### P1-7 Home 首屏极致版 — Hero 区域

**优先级:** P1 | **编号:** P1-7 | **工期:** 1 天

**详细描述:**
Home 页顶部 Hero 区域重设计。包含 Aurora 背景、TextReveal 产品名、动态占位符、主输入框活态。

**涉及文件:**
- 修改 `src/pages/Home.tsx`
- 修改 `src/components/home/HomeHeroSection.tsx`
- 修改 `src/components/home/SceneCards.tsx`（增加 3D tilt）

**验收标准:**
- [ ] 全屏 Aurora 背景（Canvas 层）
- [ ] 产品名 "TipAi" 使用 TextReveal 逐字入场
- [ ] 副标题 "AI 提示词工作流平台" 入场延迟 0.2s
- [ ] 主输入框: LivingInput 系统（聚焦 glow + 占位符呼吸 + 打字震动）
- [ ] `/` 快捷指令下拉: scaleIn + stagger 每项 0.02s
- [ ] 场景卡片: TiltCard 磁吸 + 3D tilt + hover glow 增强
- [ ] 最近项目: 从左侧滑入 stagger
- [ ] 整体入场顺序: Aurora → 产品名 → 副标题 → 输入框 → 场景卡片 → 最近项目

**设计规格引用:** §10.1 HomeHeroSection 极致版

---

### P1-8 Workspace 工作台极致版

**优先级:** P1 | **编号:** P1-8 | **工期:** 1 天

**详细描述:**
工作台页面全面动画升级。分栏拖拽有物理阻力感，项目列表卡片 hover 操作按钮滑入，空状态动态星座图，统计数字滚动动画。

**涉及文件:**
- 修改 `src/pages/Workspace.tsx`
- 新建 `src/components/effects/ConstellationGraph.tsx`（动态星座空状态）
- 新建 `src/components/effects/CountUp.tsx`（数字滚动）

**验收标准:**
- [ ] 分栏 Resizable: 拖拽时有物理阻力（阻力随面板大小变化）
- [ ] 项目卡片 hover: 右侧操作按钮从右侧滑入 (`translateX(10px→0)`)
- [ ] 项目卡片 hover: 左侧出现 2px Primary 色条指示
- [ ] 空状态: ConstellationGraph（20-40 节点 + 贝塞尔连线 + 呼吸缩放 + 流动 dash-array）
- [ ] 统计栏: CountUp 动画（数字从 0 滚动到目标值，1s，spring）
- [ ] 刷新: 下拉刷新，拉过头触发，释放后旋转图标 + 内容更新
- [ ] 列表项入场: Stagger 0.03s + jitter

**设计规格引用:** §10.3 Workspace 工作台极致版 + §4.3 瀑布 Stagger

---

### P1-9 Toolbox 工具箱极致版

**优先级:** P1 | **编号:** P1-9 | **工期:** 6h

**详细描述:**
工具箱页面卡片网格升级。每张卡片使用 TiltCard + MagneticWrapper + RippleButton 叠加。

**涉及文件:**
- 修改 `src/pages/Toolbox.tsx`
- 修改 `src/components/effects/TiltCard.tsx`（确保可嵌套）

**验收标准:**
- [ ] 工具卡片网格: 2-3 列响应式
- [ ] 每张卡片: 3D tilt + 磁吸 + 涟漪点击
- [ ] 卡片入场: Stagger 0.05s，`scale(0.9→1)` + `opacity(0→1)`
- [ ] API Key 预留卡片: 半透明 + "即将上线"标签
- [ ] 点击后导航到对应功能页，页面过渡动画联动

**设计规格引用:** §10.3 Workspace 极致版（工具箱部分）

---

### P1-10 ClarifyChatPanel 极致版 — 消息动画

**优先级:** P1 | **编号:** P1-10 | **工期:** 1 天

**详细描述:**
对话面板消息气泡全面动画升级。用户消息从右下弹入，AI 消息从左下弹入 + 打字机效果。思考状态有频谱波形。

**涉及文件:**
- 修改 `src/components/clarify/ClarifyMessageBubble.tsx`
- 修改 `src/components/clarify/ClarifyChatPanel.tsx`
- 新建 `src/components/effects/TypewriterText.tsx`
- 新建 `src/components/effects/WaveformDots.tsx`

**验收标准:**
- [ ] 用户消息: `translateX(20px→0)` + `translateY(10px→0)`，spring: snappy
- [ ] AI 消息: `translateX(-20px→0)` + `translateY(10px→0)` + `opacity(0→1)`
- [ ] AI 文字: Typewriter 逐字出现（每字 15ms），带闪烁 cursor
- [ ] 连续消息间距缩小（形成会话流）
- [ ] 时间戳: hover 消息时淡入（非常驻）
- [ ] AI 思考状态: WaveformDots（3 圆点依次弹跳 + glow 脉动）
- [ ] 输入框发送: 消息先"飞出"到聊天区（FLIP 动画）

**设计规格引用:** §10.4 ClarifyChatPanel 极致版

---

### P1-11 模态框舞台出现系统 (ModalStage)

**优先级:** P1 | **编号:** P1-11 | **工期:** 4h

**详细描述:**
通用模态框/Dialog 组件升级。遮罩 blur + 内容 3D 弹出 + 内容 stagger 入场。

**涉及文件:**
- 修改 `src/components/ui/dialog.tsx`
- 修改 `src/components/GenerateModal.tsx`
- 新建 `src/components/layout/ModalStage.tsx`

**验收标准:**
- [ ] 遮罩: `opacity 0→1` (0.3s) + `backdrop-filter blur(0→8px)` (0.4s)
- [ ] 内容容器: `scale(0.85→1)` + `translateY(30px→0)` + `rotateX(8deg→0)`，spring: gentle
- [ ] 阴影从扁平变为立体扩散
- [ ] 内容内部元素 stagger 入场（0.05s 起，每项 +0.02s）
- [ ] 关闭: 反向动画，卸载 DOM 在动画完成后
- [ ] GenerateModal 使用此系统

**设计规格引用:** §7.3 模态框的"舞台"出现

---

### P1-12 全局键盘快捷键系统升级

**优先级:** P1 | **编号:** P1-12 | **工期:** 3h

**详细描述:**
完善现有 `useKeyboardShortcuts`。添加快捷键帮助面板（Cmd+/），所有快捷键实际可触发导航。

**涉及文件:**
- 修改 `src/hooks/useKeyboardShortcuts.ts`
- 新建 `src/components/KeyboardShortcuts.tsx`（帮助面板）
- 修改 `src/App.tsx`（全局挂载）

**验收标准:**
- [ ] `Cmd/Ctrl + K` → 打开 Command Palette
- [ ] `Cmd/Ctrl + N` → 创建新项目（跳转 Home 并聚焦输入框）
- [ ] `Cmd/Ctrl + O` → 打开优化器
- [ ] `Cmd/Ctrl + E` → 打开导出
- [ ] `Cmd/Ctrl + /` → 显示快捷键帮助面板（模态框）
- [ ] `Esc` → 关闭弹窗/返回上一页
- [ ] 帮助面板: 分类表格，用 `kbd` 样式显示快捷键

**设计规格引用:** §5.4 输入框活态（快捷键段落）

---

### P1-13 空状态系统升级

**优先级:** P1 | **编号:** P1-13 | **工期:** 4h

**详细描述:**
所有列表页面统一空状态组件。每种空状态有独特图标 + 动态装饰 + 引导按钮。

**涉及文件:**
- 修改 `src/components/EmptyState.tsx`
- 新建 `src/components/effects/EmptyStateDecorations.tsx`

**验收标准:**
- [ ] 工作台-项目: 📭 图标 + "还没有项目" + [开始创建]
- [ ] 工作台-活动: 📝 图标 + "还没有活动记录"
- [ ] 资源-库: 📚 图标 + "提示词库为空" + [去生成]
- [ ] 优化器: ✨ 图标 + "还没有优化记录" + [粘贴提示词]
- [ ] 导出: 📦 图标 + "还没有导出记录" + [去工作台]
- [ ] 空状态背景有微妙动态装饰（粒子/星座/网络节点）
- [ ] 入场: `scale(0.95→1)` + `opacity(0→1)`，spring: gentle

**设计规格引用:** §3.3 生成艺术装饰元素 + §5.4 空状态设计

---

### P1-14 列表项入场 Stagger 系统全局接入

**优先级:** P1 | **编号:** P1-14 | **工期:** 3h

**详细描述:**
将 Stagger 入场动画接入所有列表/网格：项目列表、提示词库、模板市场、优化历史、导出记录。

**涉及文件:**
- 修改 `src/pages/Workspace.tsx`
- 修改 `src/pages/Library.tsx`
- 修改 `src/pages/TemplateMarket.tsx`
- 修改 `src/pages/Optimizer.tsx`
- 修改 `src/pages/Export.tsx`

**验收标准:**
- [ ] 所有列表加载时应用 stagger 入场
- [ ] delay(i) = 0.05 + i * 0.03 + Math.random() * 0.02
- [ ] 每项: `opacity 0→1` + `translateY 16px→0` + `scale 0.96→1` + `blur 2px→0`
- [ ] 持续时间 0.4s，spring: gentle
- [ ] 配合 ScrollReveal，视口外的列表项滚动到可见时再触发

**设计规格引用:** §4.3 列表项入场 — 瀑布 Stagger

---

### P1-15 生成艺术空状态装饰 — 粒子螺旋加载

**优先级:** P1 | **编号:** P1-15 | **工期:** 6h

**详细描述:**
实现粒子螺旋加载动画和动态星座图。用于空状态、加载态、生成等待态。

**涉及文件:**
- 新建 `src/components/effects/ParticleSpiral.tsx`
- 新建 `src/components/effects/ConstellationGraph.tsx`

**验收标准:**
- [ ] ParticleSpiral: 粒子沿阿基米德螺旋线运动，拖尾长度与速度成正比
- [ ] 颜色沿螺旋渐变（使用 Apple 色盘）
- [ ] 加载完成时粒子"爆散"向四周 + 内容 scaleIn
- [ ] ConstellationGraph: 20-40 节点随机分布，贝塞尔曲线连接
- [ ] 节点呼吸缩放 `scale 1→1.05→1`
- [ ] 连线有流动 dash-array 动画
- [ ] Hover 节点时相邻节点高亮，连线变粗发光

**设计规格引用:** §3.3 生成艺术装饰元素

---

### P1-16 路由懒加载 + 预加载策略

**优先级:** P1 | **编号:** P1-16 | **工期:** 3h

**详细描述:**
按路由分割代码，鼠标 hover 导航项时 prefetch 对应 chunk，空闲时预加载可能页面。

**涉及文件:**
- 修改 `src/App.tsx`（路由配置改为 lazy + Suspense）
- 修改 `src/components/Sidebar.tsx`（hover 时 prefetch）
- 新建 `src/lib/preload.ts`

**验收标准:**
- [ ] Workspace/Toolbox/Optimizer/Export 等页面使用 `React.lazy()`
- [ ] 侧边栏 hover 导航项 200ms 后触发 `import()` 预加载
- [ ] 空闲时 `requestIdleCallback` 预加载用户最可能访问的下一页
- [ ] 页面切换时有 loading skeleton（与 Stagger 系统区分）
- [ ] `npm run build` 后每个路由对应独立 chunk，可验证

**设计规格引用:** §6.4 代码分割与懒加载

---

## Phase 3 — 微交互 Polish + 性能硬化 (P2)

依赖 Phase 1/2，可并行进行。主要是细节打磨和性能保障。

---

### P2-1 开关 (Toggle/Switch) 物理化

**优先级:** P2 | **编号:** P2-1 | **工期:** 2h

**详细描述:**
Switch 组件升级。圆点滑动使用弹簧，切换时背景色渐变，圆点有 overshoot。

**涉及文件:**
- 修改 `src/components/ui/switch.tsx`

**验收标准:**
- [ ] 圆点: `translateX(0→100%)`，spring: snappy
- [ ] 滑动中圆点放大到 1.1x（overshoot），到达后缩回
- [ ] 背景: 灰色 → Primary，CSS transition 0.2s
- [ ] OFF 时圆点略微下沉 `translateY(1px)`
- [ ] 拖拽支持: 可拖拽圆点过半即切换

**设计规格引用:** §8.1 开关 (Toggle/Switch)

---

### P2-2 滑块 (Slider) 物理化

**优先级:** P2 | **编号:** P2-2 | **工期:** 2h

**详细描述:**
Slider 组件升级。Thumb hover 放大 + glow，拖动时上浮，释放时回弹，轨道填充渐变。

**涉及文件:**
- 修改 `src/components/ui/slider.tsx`

**验收标准:**
- [ ] Thumb hover: 放大 1.3x + outer glow（Primary 色）
- [ ] 拖动时 thumb 上浮 `translateY(-2px)` + 阴影加深
- [ ] 轨道填充部分: 灰色 → Primary，宽度 transition
- [ ] 释放时 thumb 有微小回弹
- [ ] 显示 tooltip 当前值: `scale(0.8→1)` + `opacity(0→1)`

**设计规格引用:** §8.2 滑块 (Slider)

---

### P2-3 复选框 (Checkbox) 物理化

**优先级:** P2 | **编号:** P2-3 | **工期:** 2h

**详细描述:**
Checkbox 组件升级。对勾 SVG stroke-dashoffset 动画画出，完成后 pop 效果。

**涉及文件:**
- 修改 `src/components/ui/checkbox.tsx`

**验收标准:**
- [ ] Check: 背景白 → Primary，0.15s
- [ ] 对勾: stroke-dashoffset 动画画出，0.25s
- [ ] 画完后整个 checkbox "pop" (`scale 1→1.15→1`，spring: bouncy)
- [ ] Uncheck: 对勾淡出 0.1s，背景恢复 0.15s
- [ ] 中间状态（indeterminate）: 横线从中心向两边扩展

**设计规格引用:** §8.3 复选框 (Checkbox)

---

### P2-4 标签页 (Tabs) 滑动指示器

**优先级:** P2 | **编号:** P2-4 | **工期:** 3h

**详细描述:**
Tabs 指示器（pill/下划线）不是跳切，而是使用 FLIP 技术滑动到新的位置。被选中 tab 字重变化。

**涉及文件:**
- 修改 `src/components/ui/tabs.tsx`
- 新建 `src/hooks/useFLIP.ts`

**验收标准:**
- [ ] 指示器使用 FLIP: 记录旧位置 → 新位置 → Invert → Play
- [ ] 滑动动画: spring: snappy
- [ ] 被选中 tab: 字重 400 → 600（可变字体 weight 轴，如不支持则跳过）
- [ ] 未被选中 tab hover 时微微上浮 `translateY(-1px)`
- [ ] 支持 overflow scroll tabs（移动端）

**设计规格引用:** §8.4 标签页 (Tabs)

---

### P2-5 滚动条极致定制

**优先级:** P2 | **编号:** P2-5 | **工期:** 2h

**详细描述:**
全局自定义滚动条。2px 宽，默认隐藏，滚动时显现，hover 变宽。

**涉及文件:**
- 修改 `src/index.css`（滚动条样式）

**验收标准:**
- [ ] 默认 2px 宽，圆角
- [ ] 默认隐藏 `opacity: 0`
- [ ] 滚动时显现 `opacity: 1`，0.3s transition
- [ ] 停止滚动 1s 后淡出
- [ ] Thumb: Primary 色 30% 透明度
- [ ] Hover thumb: 宽度变为 6px（spring 动画）
- [ ] Dark 模式 thumb: `rgba(255,255,255,0.15)`

**设计规格引用:** §8.5 滚动条 (Scrollbar)

---

### P2-6 复制/粘贴/删除反馈粒子

**优先级:** P2 | **编号:** P2-6 | **工期:** 3h

**详细描述:**
全局操作反馈。复制成功时飞出 ✓ 粒子，粘贴时内容"倒入"，删除时元素缩小消失。

**涉及文件:**
- 新建 `src/components/effects/ActionFeedback.tsx`
- 新建 `src/hooks/useActionFeedback.ts`

**验收标准:**
- [ ] 复制成功: 按钮文字变 "Copied ✓" 0.1s，1.5s 后恢复
- [ ] 同时飞出 ✓ 粒子，向上飘 20px 后消失
- [ ] 粘贴: 输入框内容淡入 + 轻微从上滑落 `translateY(-5px→0)`
- [ ] 删除: 元素 `scale(1→0)` + `opacity(1→0)`，其他元素 FLIP 填补空间
- [ ] 导出成功: 飞出 📦 粒子 + 下载图标脉动

**设计规格引用:** §8.6 复制/粘贴反馈

---

### P2-7 深色模式增强过渡

**优先级:** P2 | **编号:** P2-7 | **工期:** 3h

**详细描述:**
系统 dark mode 切换时，不是瞬间跳变，而是 0.5s 内所有颜色属性 transition，Aurora 颜色从暖到冷过渡。

**涉及文件:**
- 修改 `src/index.css`（所有颜色属性增加 `transition`）
- 修改 `src/components/effects/AuroraBackground.tsx`（颜色过渡逻辑）

**验收标准:**
- [ ] 切换 dark mode: 所有 CSS 颜色属性 0.5s transition
- [ ] 背景渐变使用 cross-fade 效果
- [ ] Aurora blob 颜色从 day palette → night palette 平滑过渡
- [ ] 文字颜色同步过渡，无闪烁
- [ ] 测试: 系统切换、手动切换、时间自动切换（如果启用）

**设计规格引用:** §9.2 自动切换过渡

---

### P2-8 虚拟滚动接入长列表

**优先级:** P2 | **编号:** P2-8 | **工期:** 6h

**详细描述:**
所有超过 50 项的列表使用虚拟滚动。使用 `@tanstack/react-virtual` 或自研。

**涉及文件:**
- 新建 `src/components/ui/VirtualList.tsx`
- 修改 `src/pages/Library.tsx`（提示词库列表）
- 修改 `src/pages/Workspace.tsx`（项目列表）
- 修改 `src/pages/TemplateMarket.tsx`（模板列表）

**验收标准:**
- [ ] 列表超过 50 项时使用虚拟滚动
- [ ] 使用 `transform: translateY()` 定位可见项，不改 margin/padding
- [ ] 列表容器 `contain: strict`
- [ ] 滚动时暂停非关键动画（Intersection Observer 控制）
- [ ] 支持动态高度项（`measureElement: true`）
- [ ] 搜索过滤后列表能正确重计算高度

**设计规格引用:** §6.2 虚拟滚动 (Virtual Scrolling)

---

### P2-9 性能监控仪表板 (Dev Only)

**优先级:** P2 | **编号:** P2-9 | **工期:** 4h

**详细描述:**
开发模式下右下角显示 FPS 计数器、布局抖动计数、合成层数量、内存占用。

**涉及文件:**
- 新建 `src/components/dev/PerfMonitor.tsx`
- 修改 `src/App.tsx`（条件渲染，仅在 `import.meta.env.DEV` 显示）

**验收标准:**
- [ ] 显示实时 FPS（绿色 ≥55，黄色 30-55，红色 <30）
- [ ] 显示累积 layout shift 次数
- [ ] 显示当前合成层数量
- [ ] 显示 JS heap 内存占用（MB）
- [ ] 生产构建时完全不包含此组件（tree-shake）
- [ ] 可折叠为小圆点，点击展开详情

**设计规格引用:** §11.3 性能监控仪表板

---

### P2-10 内存泄漏排查 & 硬化

**优先级:** P2 | **编号:** P2-10 | **工期:** 4h

**详细描述:**
全局排查内存泄漏。所有 RAF、EventListener、IntersectionObserver、Canvas/WebGL context 在卸载时释放。

**涉及文件:**
- 审查所有 `src/components/effects/*.tsx`
- 审查所有 `src/hooks/*.ts`
- 修改 `src/components/effects/AuroraBackground.tsx`（WebGL context 释放）
- 修改 `src/lib/animation/layerManager.ts`

**验收标准:**
- [ ] 所有 RAF 循环在组件卸载时 cancel
- [ ] 所有 EventListener 确保 remove（或使用 `{ once: true }`）
- [ ] Intersection Observer 在卸载时 disconnect
- [ ] Canvas/WebGL context 不再需要时主动释放
- [ ] 大型列表使用对象池复用 DOM 元素（如虚拟滚动已处理则跳过）
- [ ] Chrome Memory Profiler 录制 5 分钟操作，内存增长 < 20MB

**设计规格引用:** §6.5 内存管理

---

### P2-11 暗色模式专属效果

**优先级:** P2 | **编号:** P2-11 | **工期:** 3h

**详细描述:**
Dark 模式不只是反色，有专属视觉效果：星空微粒子、冷白月光 glow、文字 text-shadow。

**涉及文件:**
- 修改 `src/components/effects/AuroraBackground.tsx`（星空粒子层）
- 修改 `src/index.css`（dark 模式 glow 和 text-shadow）

**验收标准:**
- [ ] Aurora 背景增加星空微粒子（20-50 个，缓慢闪烁）
- [ ] 所有 glow 效果从 Primary 蓝变为冷白光（月光感）
- [ ] 重要文字有微妙 `text-shadow: 0 0 20px rgba(255,255,255,0.1)`
- [ ] Glass 卡片 border 变为高亮细线 `rgba(255,255,255,0.1)`
- [ ] 自定义光标在 dark 模式下变为半透明白色圆环

**设计规格引用:** §9.1 深色模式专属效果

---

### P2-12 语音交互可视化预留

**优先级:** P2 | **编号:** P2-12 | **工期:** 3h

**详细描述:**
如果未来接入语音输入，实现录音状态可视化组件。频谱波形 + 同心圆环 + glow 脉动。

**涉及文件:**
- 新建 `src/components/effects/VoiceWaveform.tsx`
- 新建 `src/hooks/useAudioAnalyzer.ts`（AnalyserNode 封装）

**验收标准:**
- [ ] 录音中: 麦克风按钮变成圆形频谱（中心呼吸圆 + 3-4 层同心圆环）
- [ ] 圆环根据音量 expand/contract（音量驱动 amplitude）
- [ ] 波形线条从圆环向外辐射（FFT 数据驱动）
- [ ] 整体 glow 脉动
- [ ] 停止说话 2s 后波形逐渐平息，自动提交
- [ ] 结束: 波形向内收缩到中心点，然后消失（spring: snappy）
- [ ] 按钮恢复原状（spring: bouncy）
- [ ] 预留接口，当前不接入实际录音逻辑

**设计规格引用:** §5.5 语音交互可视化 + §8.7 语音波形

---

### P2-13 拖拽与抛掷系统 (Drag & Fling)

**优先级:** P2 | **编号:** P2-13 | **工期:** 6h

**详细描述:**
实现拖拽物理系统。适用于卡片排序、面板调整、滑块操作。使用 @use-gesture/react + 弹簧动画。

**涉及文件:**
- 新建 `src/components/effects/DraggableCard.tsx`
- 新建 `src/hooks/useDragPhysics.ts`
- 修改 `src/components/ui/slider.tsx`（滑块拖拽）

**验收标准:**
- [ ] 拖拽时元素放大 1.05 + 阴影加深（浮起感）
- [ ] 轻微旋转跟随拖拽方向: `rotateZ = velocityX * 0.01`，max 3deg
- [ ] 光标变为 grabbing
- [ ] 释放时如果速度 > threshold: 惯性滑行（`v *= 0.9` 每帧）
- [ ] 最终吸附到最近目标位置（spring: snappy）
- [ ] 无效位置释放: 弹回原位（spring: bouncy）
- [ ] 列表重排使用 FLIP，元素"自己走"到新位置
- [ ] 支持 touch 和 mouse

**设计规格引用:** §5.3 拖拽与抛掷 (Drag & Fling)

---

### P2-14 低端设备降级策略

**优先级:** P2 | **编号:** P2-14 | **工期:** 3h

**详细描述:**
建立设备能力检测和动态降级。低配设备自动禁用 Aurora、3D tilt、磁吸、视差等重效果。

**涉及文件:**
- 新建 `src/lib/deviceCapability.ts`
- 修改 `src/components/effects/AuroraBackground.tsx`（条件渲染）
- 修改 `src/components/effects/TiltCard.tsx`（条件启用）
- 修改 `src/components/effects/MagneticWrapper.tsx`（条件启用）

**验收标准:**
- [ ] `detectDeviceCapability()` 检测: GPU 等级、内存、CPU core 数
- [ ] 策略:
  - 高性能: 全开
  - 中性能: 禁用 Aurora WebGL（降级 Canvas2D），禁用 3D tilt
  - 低性能: 禁用 Aurora、磁吸、视差，仅保留基础 spring 动画
- [ ] 内存 < 4GB 或 GPU 为 Intel UHD 时自动降级
- [ ] 降级切换平滑，不重新加载页面
- [ ] 用户可手动覆盖降级决策（设置项）

**设计规格引用:** §6.1 渲染管道优化（低端设备段落）

---

## 验收总表

| 编号 | 名称 | 优先级 | 状态 |
|------|------|--------|------|
| P0-1 | 搭建弹簧动画核心库 | P0 | ⬜ |
| P0-2 | 安装动画依赖包 | P0 | ⬜ |
| P0-3 | Apple Design CSS Token 系统落地 | P0 | ⬜ |
| P0-4 | Aurora 背景引擎 | P0 | ⬜ |
| P0-5 | 减少运动适配全局 Hook | P0 | ⬜ |
| P0-6 | GPU 合成层基础设施 | P0 | ⬜ |
| P0-7 | 材质卡片系统 | P0 | ⬜ |
| P0-8 | 涟漪按钮组件 | P0 | ⬜ |
| P0-9 | 磁吸效果 HOC | P0 | ⬜ |
| P0-10 | 3D 倾斜卡片 | P0 | ⬜ |
| P0-11 | 文字揭示动画组件 | P0 | ⬜ |
| P0-12 | 输入框活态系统 | P0 | ⬜ |
| P1-1 | 全局页面过渡系统 | P1 | ⬜ |
| P1-2 | 全局平滑滚动 + 视差 | P1 | ⬜ |
| P1-3 | 全局滚动揭示系统 | P1 | ⬜ |
| P1-4 | 全局 Command Palette | P1 | ⬜ |
| P1-5 | 全局 Toast 通知升级 | P1 | ⬜ |
| P1-6 | Sidebar 玻璃增强 + 抽屉物理 | P1 | ⬜ |
| P1-7 | Home 首屏极致版 | P1 | ⬜ |
| P1-8 | Workspace 工作台极致版 | P1 | ⬜ |
| P1-9 | Toolbox 工具箱极致版 | P1 | ⬜ |
| P1-10 | ClarifyChatPanel 极致版 | P1 | ⬜ |
| P1-11 | 模态框舞台出现系统 | P1 | ⬜ |
| P1-12 | 全局键盘快捷键升级 | P1 | ⬜ |
| P1-13 | 空状态系统升级 | P1 | ⬜ |
| P1-14 | 列表项入场 Stagger 全局接入 | P1 | ⬜ |
| P1-15 | 生成艺术空状态装饰 | P1 | ⬜ |
| P1-16 | 路由懒加载 + 预加载 | P1 | ⬜ |
| P2-1 | 开关物理化 | P2 | ⬜ |
| P2-2 | 滑块物理化 | P2 | ⬜ |
| P2-3 | 复选框物理化 | P2 | ⬜ |
| P2-4 | 标签页滑动指示器 | P2 | ⬜ |
| P2-5 | 滚动条极致定制 | P2 | ⬜ |
| P2-6 | 复制/粘贴/删除反馈粒子 | P2 | ⬜ |
| P2-7 | 深色模式增强过渡 | P2 | ⬜ |
| P2-8 | 虚拟滚动接入长列表 | P2 | ⬜ |
| P2-9 | 性能监控仪表板 | P2 | ⬜ |
| P2-10 | 内存泄漏排查 | P2 | ⬜ |
| P2-11 | 暗色模式专属效果 | P2 | ⬜ |
| P2-12 | 语音交互可视化预留 | P2 | ⬜ |
| P2-13 | 拖拽与抛掷系统 | P2 | ⬜ |
| P2-14 | 低端设备降级策略 | P2 | ⬜ |

---

## 执行建议

**开发顺序:**
1. **Week 1**: Phase 1 全部完成（基础设施）
2. **Week 2-3**: Phase 2（核心页面 + 全局体验），可与 Phase 1 后半段并行
3. **Week 4-5**: Phase 3（微交互 polish + 性能硬化）

**依赖关系图:**
```
P0-1/2/3 ──┬──> P0-4/5/6/7/8/9/10/11/12 ──┬──> P1-1/2/3/4/5/6 ──┬──> P1-7/8/9/10/11/12/13/14/15/16
           │                            │                    └──> P2-1~14
           └──> P1-6 (Sidebar 可提前)
```

**每批次完成后必须:**
- `npm run check` 0 errors
- `npm run lint` 0 warnings
- `npm run build` 通过
- 提交到 git 并 push

---

*本文档由小龙坎根据 `tipai-extreme-ui-design-spec.md` 拆解生成。*
*不是建议，是可直接执行的命令式任务清单。*

---

# 第二部分 — 极致界面布局重构

> 版本: v2.0 | 日期: 2026-04-30
> 定位: 从"功能堆砌"到"Apple 客户端级别的空间布局与功能组织"
> 说明: 动画与布局不是替代关系，是叠加关系 —— 先有合理的空间组织，再注入极致的交互体验。

---

## 当前布局诊断

扫描完所有页面、组件、路由后，核心问题不是缺动画——是**功能组织混乱 + 空间层次扁平**。

### 现有问题清单

| 问题 | 位置 | 严重程度 |
|------|------|----------|
| **导航扁平无层次** | Sidebar | 🔴 高 — 6个项平铺，没有"创建""管理""工具"分组 |
| **工作台 vs 项目 概念重叠** | /workspace + /projects | 🔴 高 — 两个页面都显示项目，用户分不清 |
| **工具箱沦为快捷方式** | /toolbox | 🟡 中 — 动态提示词指向首页，API/Ollama指向设置 |
| **设置页过载** | /settings | 🔴 高 — API Key + 模型 + 全局提示词 + 数据管理 全堆在一起 |
| **资源 vs 库 命名不统一** | Sidebar"资源" → 页面"提示词库" | 🟡 中 |
| **搜索割裂** | 每页独立搜索 | 🟡 中 — 没有统一全局搜索体验 |
| **空状态千篇一律** | 所有页面 | 🟡 中 — 换个图标就是新空状态 |
| **缺少面包屑/路径感** | /projects/:id 等深层页面 | 🟡 中 |
| **没有快捷创建入口** | 全局 | 🟡 中 — 必须从首页才能创建 |
| **反馈层级单一** | 全局 | 🟢 低 — Toast 是唯一反馈通道 |

---

## 一、全新导航架构 — Apple 式空间组织

### 1.1 核心原则: 三层空间模型

Apple 客户端（如 Xcode、Final Cut、Logic Pro）使用**三层空间**组织功能：

```
┌─────────────────────────────────────────────────────────┐
│  顶栏: 全局操作层 (Toolbar / Title Bar)                  │
├─────────────────────────────────────────────────────────┤
│  侧边栏: 导航与上下文层 (Navigator / Inspector)         │
├─────────────────────────────────────────────────────────┤
│  主区域: 内容编辑层 (Canvas / Editor)                   │
├─────────────────────────────────────────────────────────┤
│  底栏: 状态与反馈层 (Status Bar / Floating)             │
└─────────────────────────────────────────────────────────┘
```

### 1.2 全新 Sidebar 结构

```
TipAi
├── 🎯 创建
│   ├── 首页 (/)           ← 主要创建入口
│   └── 快速创建 (⌘N)      ← 全局快捷
│
├── 📦 管理
│   ├── 工作台 (/workspace) ← 项目看板 + 生命周期
│   ├── 提示词库 (/library) ← 已保存提示词
│   └── 模板 (/templates)   ← 模板市场
│
├── ⚡ 工具
│   ├── 优化器 (/optimizer) ← 提示词优化
│   ├── 导出 (/export)      ← 批量导出
│   └── 动态生成 (/)        ← 带调优选项的生成
│
└── ⚙️ 系统
    ├── 设置 (/settings)    ← 精简后的核心设置
    ├── 账户 (/account)     ← 用户 + API Key
    └── 关于 (/about)
```

**视觉区分:**
- 分组标题使用 `text-secondary text-xs font-medium uppercase tracking-wider`，间距 24px
- 每个分组之间用 1px 分割线 `separator` 隔开
- 激活项左侧有 3px 品牌色 indicator（液态滑入）
- 未读/待处理项目显示 subtle badge（不抢视觉焦点）

### 1.3 顶栏 (Title Bar) 改造

```
macOS 风格顶栏 (固定 38px):
┌──────────────────────────────────────────────────┐
│ ○ ○ ○  │  页面标题          │  [搜索] [新建] [⚙️]  │
│(红绿灯)  │  (居中/左对齐)      │  (右侧操作区)        │
└──────────────────────────────────────────────────┘
```

**功能点:**
- **红绿灯** (macOS): 实际为 Electron 的 traffic light buttons，不可交互但需预留空间
- **页面标题**: 当前页面名称 + 可选副标题（如 "工作台 · 3 个项目"）
- **全局搜索** (Cmd+K): 常驻搜索图标，点击打开 Command Palette
- **新建按钮** (+): 全局快速创建入口（项目/提示词/模板）
- **用户头像**: 右侧圆形头像，点击打开 Account 下拉

### 1.4 全局浮动操作按钮 (FAB)

```
右下角固定悬浮按钮 (Desktop 显示，Mobile 隐藏):
┌─────┐
│  +  │  ← 大圆形，Primary 渐变背景
└─────┘
  点击展开扇形菜单:
  ┌─────┐
  │ 📝  │ 新建项目
  │ ⚡  │ 快速优化
  │ 📦  │ 新建模板
  │ 🔄  │ 重新生成
  └─────┘
```

**设计细节:**
- 默认状态: 56px 圆形，品牌渐变，`shadow-apple-lg`
- Hover: scale 1.08 + glow 增强
- 点击: 旋转 45deg + 扇形展开 4 个二级按钮（每个 40px，spring: bouncy）
- 展开时背景遮罩 `rgba(0,0,0,0.05)`
- 快捷键 `Cmd/Ctrl + N` 直接触发新建项目

---

## 二、页面级布局重构 — 逐页极致设计

### 2.1 首页 (Home) — "创造者的起点"

**当前问题**: 功能完整但层次混乱。Hero 区 + 场景卡片 + 最近项目 + HowItWorks 全堆在滚动流里。

**极致设计:**

```
┌─────────────────────────────────────────────────────────┐
│  顶栏: TipAi · 创造                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Aurora 背景层 (全屏 Canvas, z: -2)             │   │
│  │                                                 │   │
│  │  "让 AI 理解你的真实需求"                        │   │
│  │  副标题: 从模糊想法到精准提示词，只需描述        │   │
│  │                                                 │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │ [📝 输入你的需求...]                     │   │   │
│  │  │ 支持 /快捷指令  @引用项目  #标签          │   │   │
│  │  │                    [⚡ 开始生成 →]        │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                                                 │   │
│  │  📌 快速场景 (水平滚动，磁吸卡片):           │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │   │
│  │  │营销 │ │编程 │ │教学 │ │数据 │ │图像 │     │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  最近动态 (Recent Activity)                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  横向滚动时间线 (Timeline):                     │   │
│  │  ●───●───●───●───●───●───●───●               │   │
│  │  项目创建  提示词生成  优化完成  导出记录         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  统计概览 (Stats Overview)                               │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │ 12     │ │ 48     │ │ 7      │ │ 100%   │          │
│  │ 项目   │ │ 提示词 │ │ 模板   │ │ 本地率 │          │
│  └────────┘ └────────┘ └────────┘ └────────┘          │
└─────────────────────────────────────────────────────────┘
```

**空间改造要点:**

1. **Hero 区绝对中心化**
   - 垂直居中于首屏（calc(50vh - 200px)）
   - Aurora 背景作为环境层，不干扰内容阅读
   - 标题使用 `text-gradient-hero` shimmer 动画
   - 输入框 680px 宽，24px 圆角，glass-2 材质
   - 输入框下方常驻快捷指令提示栏（`@项目名` `#标签` `/命令`）

2. **场景卡片改为横向磁吸滚动**
   - 从垂直 grid 改为水平 scroll-snap 容器
   - 卡片使用 TiltCard + MagneticWrapper
   - 每张卡片尺寸 160×120px，圆角 20px
   - 滚动时有"惯性吸附"效果（像 iOS 的 app switcher）
   - 最后一张卡片是 "更多 →"，点击展开完整网格

3. **新增"最近动态"时间线**
   - 横向滚动时间轴，展示最近操作
   - 节点类型: 项目创建、澄清对话、提示词生成、优化完成、导出
   - 每个节点: 图标 + 简短描述 + 时间戳
   - 点击节点跳转到对应页面

4. **新增"统计概览"**
   - 4 个计数卡片: 项目总数、提示词总数、模板使用、本地率
   - 数字使用 CountUp 动画（从 0 滚动到目标值，1s）
   - 卡片使用 Glass-2 材质，hover 有 3D tilt

5. **移除 HowItWorksSection**
   - 对于已使用应用的用户，此区块冗余
   - 功能移入 Onboarding（首次启动）和 /about（帮助中心）

### 2.2 工作台 (Workspace) — "项目的指挥舱"

**当前问题**: /workspace 和 /projects 功能重叠。Workspace 有项目列表 + 生命周期面板，Projects 也有项目列表 + 对话详情。

**极致设计 — 统一工作台:**

```
┌─────────────────────────────────────────────────────────┐
│  顶栏: 工作台 · 管理所有项目                              │
├──────────┬──────────────────────────────────────────────┤
│  项目列表 │  主编辑区 (根据选中项切换)                     │
│  侧边栏   │                                                │
│ (280px)  │                                                │
│          │  模式A: 未选中 → 欢迎/概览面板                 │
│ 🔍 搜索   │  ┌─────────────────────────────────────┐    │
│ ──────────│  │  欢迎回来                            │    │
│ 全部项目  │  │  3 个项目待处理 · 2 个已完成         │    │
│ ──────────│  │  [快速创建] [导入项目]               │    │
│ ● 项目1   │  └─────────────────────────────────────┘    │
│   草稿    │                                                │
│ ● 项目2   │  模式B: 选中项目 → 生命周期看板              │
│   澄清中  │  ┌─────────────────────────────────────┐    │
│ ● 项目3   │  │  项目名 · 领域 · 状态                │    │
│   就绪    │  │  ┌─────┬─────┬─────┬─────┐        │    │
│ ──────────│  │  │ 需求 │ 澄清 │ 生成 │ 完成 │        │    │
│ 归档项目  │  │  │ ✓   │ →   │ ○   │ ○   │        │    │
│ ──────────│  │  └─────┴─────┴─────┴─────┘        │    │
│ + 新建    │  │  [查看对话] [生成提示词] [导出]     │    │
│          │  └─────────────────────────────────────┘    │
├──────────┴──────────────────────────────────────────────┤
│  底栏: 当前项目状态 · 最后更新 2分钟前                   │
└─────────────────────────────────────────────────────────┘
```

**空间改造要点:**

1. **三栏布局 → 两栏主从**
   - 左侧: 项目列表侧边栏（280px 固定，可折叠到 72px）
   - 右侧: 主编辑区（剩余空间，最小 600px）
   - 移除现有的 "右侧生命周期" 面板概念，生命周期作为选中项目的主内容

2. **项目列表侧边栏重设计**
   - 分组: "活跃中" / "已完成" / "已归档"
   - 每个项目卡片: 图标 + 标题 + 状态 badge + 进度条
   - 进度条: 根据生命周期阶段填充（需求→澄清→生成→完成）
   - Hover: 右侧出现操作按钮（编辑/删除/导出）从右侧滑入
   - 选中态: 左侧 3px 品牌 indicator + 背景高亮
   - 拖拽排序: 可拖拽调整项目顺序（保存到 localStorage）

3. **主编辑区 — 三种模式**
   - **模式A — 概览**: 未选中项目时显示欢迎面板 + 全局统计
   - **模式B — 生命周期看板**: 选中项目后显示流程看板（4阶段）
     - 需求阶段: 原始需求展示 + 编辑按钮
     - 澄清阶段: 最近 3 轮对话摘要 + "展开全部"按钮
     - 生成阶段: 生成的提示词预览 + 复制/优化按钮
     - 完成阶段: 最终提示词 + 导出选项
   - **模式C — 完整对话**: 点击"展开全部"进入完整 ClarifyChatPanel

4. **合并 /projects 和 /workspace**
   - 取消 /projects 独立页面，其功能全部合并到工作台
   - /projects/:id 重定向到 /workspace?id=xxx
   - 工作台的 URL 结构: `/workspace`（概览）→ `/workspace?id=123`（具体项目）

### 2.3 提示词库 (Library) — "你的提示词档案"

**当前问题**: 列表式展示，信息密度高但可读性差。每张卡片展开/收起操作繁琐。

**极致设计 — 双视图档案:**

```
┌─────────────────────────────────────────────────────────┐
│  顶栏: 提示词库 · 48 条记录                              │
├─────────────────────────────────────────────────────────┤
│  [🔍 搜索]  [筛选 ▼]  [排序 ▼]  [视图 ▤/▣]  [批量操作]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  网格视图 (Grid View) — 默认                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ 📄           │ │ 📄           │ │ 📄           │    │
│  │ 营销文案生成  │ │ Python代码   │ │ 数据分析报告 │    │
│  │ ─────────────│ │ ─────────────│ │ ─────────────│    │
│  │ 内容营销 · GPT│ │ 编程 · Claude│ │ 数据 · DS   │    │
│  │ [复制] [优化]│ │ [复制] [优化]│ │ [复制] [优化]│    │
│  │ 2026-04-28   │ │ 2026-04-27   │ │ 2026-04-25   │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                         │
│  列表视图 (List View) — 紧凑                             │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 📄 营销文案生成 · 内容营销 · GPT · 2026-04-28      [⋮]││
│  │ 📄 Python代码助手 · 编程 · Claude · 2026-04-27   [⋮]││
│  │ 📄 数据分析报告 · 数据 · DeepSeek · 2026-04-25   [⋮]││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**空间改造要点:**

1. **双视图切换**
   - **网格视图**: 3 列（桌面）/ 2 列（平板），卡片式展示
     - 卡片: Glass-2 材质，圆角 20px，内边距 16px
     - 内容区: 提示词前 200 字符预览（截断加 ...）
     - 底部: 领域 badge + 模型 badge + 日期
     - 操作: 复制（主按钮）+ 优化（次按钮）+ 更多（下拉菜单）
   - **列表视图**: 紧凑行，每行展示标题 + 领域 + 模型 + 日期 + 操作按钮
   - 视图偏好保存到 localStorage

2. **搜索 + 筛选 + 排序工具栏**
   - 搜索框: 支持全文搜索（标题 + 提示词内容）
   - 筛选: 领域（下拉多选）、模型（下拉多选）、时间范围
   - 排序: 最近创建 / 最近使用 / 标题 A-Z / 领域分组
   - 批量操作: 选择多个后显示批量操作栏（批量复制/批量导出/批量删除）

3. **提示词详情抽屉**
   - 点击卡片不跳转页面，而是右侧滑出详情抽屉（Sheet，宽度 480px）
   - 抽屉内: 完整提示词（可复制）+ 元信息（需求原文、生成参数、领域）+ 操作按钮
   - 抽屉内可直接触发"优化此提示词"，跳转到优化器并自动带入

4. **领域图标系统**
   - 每个领域有专属渐变色图标（如营销=rose，编程=blue，教育=amber）
   - 图标在卡片左上角作为视觉锚点

### 2.4 模板市场 (TemplateMarket) — "灵感商店"

**当前问题**: 信息不足，用户不知道模板长什么样。

**极致设计 — 卡片橱窗:**

```
┌─────────────────────────────────────────────────────────┐
│  顶栏: 模板市场 · 发现高效提示词                         │
├─────────────────────────────────────────────────────────┤
│  [🔍 搜索]  [全部 ▼]  [热门 🔥]  [最新 🕐]  [我的 ⭐]    │
├─────────────────────────────────────────────────────────┤
│  分类导航 (水平滚动):                                   │
│  [全部] [营销] [编程] [教育] [数据] [法律] [图像] [视频] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  精选推荐 (Featured): 横向滚动大卡片                      │
│  ┌────────────────────────────────────────────┐        │
│  │  "小红书爆款文案生成器"                      │        │
│  │  🏆 本周最热 · 1.2k 使用 · 98% 好评         │        │
│  │  [预览] [使用此模板]                         │        │
│  └────────────────────────────────────────────┘        │
│                                                         │
│  全部模板 (网格):                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ 📝       │ │ 💻       │ │ 📊       │ │ 🎨       │  │
│  │ 小红书   │ │ Python   │ │ SQL分析  │ │ Midjourney│  │
│  │ 1.2k ⭐   │ │ 800 ⭐   │ │ 600 ⭐   │ │ 400 ⭐    │  │
│  │ [使用]   │ │ [使用]   │ │ [使用]   │ │ [使用]   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**空间改造要点:**

1. **精选推荐区 (Hero Carousel)**
   - 顶部横向滚动的"本周精选"大卡片
   - 尺寸: 400×180px，圆角 24px，带渐变背景
   - 信息: 模板名 + 使用统计 + 好评率 + 预览/使用按钮
   - 横向滚动，scroll-snap

2. **分类导航**
   - 所有领域标签水平排列，类似 App Store 分类导航
   - 选中态: 品牌色 pill 背景
   - 支持横向滚动（当屏幕不够宽时）

3. **模板卡片重设计**
   - 卡片尺寸: 220×160px，网格布局
   - 视觉层次: 领域图标 → 模板名 → 使用统计 → 使用按钮
   - Hover: 卡片上浮 4px + 阴影加深 + "预览"按钮淡入
   - 点击: 打开预览模态框（展示模板完整内容和参数说明）
   - 模板详情: 支持"直接填入输入框使用"和"收藏到本地"

4. **我的收藏**
   - 顶部增加 "我的 ⭐" tab
   - 显示用户收藏的本地模板列表
   - 支持取消收藏

### 2.5 提示词优化器 (Optimizer) — "提示词手术台"

**当前问题**: 布局合理但视觉层次单一。Tabs 切换体验生硬。策略选择区占据过多垂直空间。

**极致设计 — 手术台布局:**

```
┌─────────────────────────────────────────────────────────┐
│  顶栏: 提示词优化器                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  策略选择 (紧凑 pills, 可横向滚动):                     │
│  [通用优化 ●] [结构化] [精简] [创意增强] [技术深化]      │
│                                                         │
│  ┌────────────────────┐  ┌────────────────────┐        │
│  │ 原始提示词          │  │ 优化结果            │        │
│  │                    │  │                    │        │
│  │ [粘贴或输入...]    │→ │ [优化后的提示词...] │        │
│  │                    │  │                    │        │
│  │      2,340 字符     │  │      1,890 字符     │        │
│  │                    │  │                    │        │
│  │ [🧹 清空] [📋 粘贴]│  │ [📋 复制] [💾 保存]│        │
│  └────────────────────┘  └────────────────────┘        │
│           ↑                                      ↑       │
│      Diff 高亮对比线 (中间)                              │
│                                                         │
│  改进点:                                                │
│  ✅ 添加角色定义  ✅ 结构化输出  ✅ 增加约束条件          │
│  ✅ 精简冗余表达                                         │
│                                                         │
│  [⚡ 开始优化 →]                                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  历史记录 (底部可折叠面板)                                │
│  ─────────────────────────────────────────────────────  │
│  2026-04-28 通用优化 · 小红书文案 → 已优化               │
│  2026-04-27 结构化 · Python 代码 → 已优化                 │
└─────────────────────────────────────────────────────────┘
```

**空间改造要点:**

1. **策略选择改为紧凑 pills**
   - 从 3 张大卡片改为横向 pill 标签栏
   - 选中态: 品牌色填充 pill + 左侧小圆点
   - 支持左右滑动查看更多策略
   - 策略 hover 时显示 tooltip 说明

2. **双栏对比布局 (Diff 模式)**
   - 左侧: 原始输入区（Textarea，min 200px 高）
   - 中间: 垂直对比线，Diff 高亮（红=删除，绿=新增）
   - 右侧: 优化结果（只读 Textarea，同上高度）
   - 三栏等宽，间隙 16px
   - 结果区顶部显示 "优化完成 · 减少 450 字符 · 信息密度 +23%"

3. **改进点徽章行**
   - 优化完成后，在结果下方显示一排改进点 badge
   - 每个 badge: 图标 + 改进描述（如 ✅ 添加角色定义）
   - Badge 使用对应语义色（成功=green，结构=blue，精简=orange）

4. **历史记录可折叠面板**
   - 页面底部固定高度 200px 的历史记录区
   - 默认收起（只显示标题栏），点击展开
   - 展开动画: `height 0→200px` + `opacity 0→1`
   - 历史项: 日期 + 策略名 + 原始提示词截断 + 跳转按钮
   - 与右侧 HistoryPanel 合并，不再独立侧边栏

### 2.6 导出 (Export) — "提示词出口"

**当前问题**: 直接套了个 ExportPanel，没有独立的页面设计感。

**极致设计 — 打包站:**

```
┌─────────────────────────────────────────────────────────┐
│  顶栏: 批量导出 · 选择要导出的内容                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  步骤 1: 选择内容                                       │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [ ] 全选                                            ││
│  │  [✓] 📄 营销文案生成 · 内容营销 · 2026-04-28       ││
│  │  [✓] 📄 Python代码助手 · 编程 · 2026-04-27         ││
│  │  [ ] 📄 数据分析报告 · 数据 · 2026-04-25           ││
│  │  [✓] 📄 教学大纲设计 · 教育 · 2026-04-20           ││
│  └─────────────────────────────────────────────────────┘│
│  已选 3 项                                               │
│                                                         │
│  步骤 2: 选择格式                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │  📦 JSON │ │  📝 MD    │ │  📄 TXT  │                  │
│  │  结构化  │ │  可读性  │ │  纯文本  │                  │
│  │  [选择]  │ │  [选择]  │ │  [选择]  │                  │
│  └──────────┘ └──────────┘ └──────────┘                  │
│                                                         │
│  步骤 3: 高级选项 (可折叠)                               │
│  ┌─────────────────────────────────────────────────────┐│
│  │  包含元信息 [Switch ON]                                ││
│  │  包含原始需求 [Switch ON]                              ││
│  │  分组方式: [按领域 / 按时间 / 不分组 ▼]                ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  [📦 导出 3 项提示词 →]                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**空间改造要点:**

1. **向导式三步骤**
   - 清晰的步骤指示器（步骤 1 → 步骤 2 → 步骤 3）
   - 每步完成才能进入下一步（但可以自由返回）
   - 步骤切换使用 slide 动画（spring: smooth）

2. **内容选择区**
   - 可勾选列表，支持全选/反选
   - 每项显示: 图标 + 标题 + 领域 + 日期
   - 已选数量在底部实时显示

3. **格式选择**
   - 三种格式用大卡片展示（JSON/Markdown/TXT）
   - 选中态: 品牌色边框 + glow + 内部 checkmark
   - 每种格式有简短说明和预览链接

4. **导出按钮**
   - 大按钮显示 "导出 N 项提示词"
   - 导出中显示进度条和旋转图标
   - 完成后自动下载文件 + Toast 通知

### 2.7 设置页重设计 — "偏好控制中心"

**当前问题**: 过载。API Key + 模型 + 全局提示词 + 数据管理 全挤在一个页面。

**极致设计 — 分 Tab 设置中心:**

```
┌─────────────────────────────────────────────────────────┐
│  顶栏: 设置                                              │
├─────────────────────────────────────────────────────────┤
│  [通用] [模型与Key] [界面] [数据] [高级]                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  通用设置                                               │
│  ┌─────────────────────────────────────────────────────┐│
│  │  语言                                                ││
│  │  [简体中文 ▼]                                        ││
│  │                                                      ││
│  │  主题                                                ││
│  │  [☀️ 浅色] [🌙 深色] [🔄 跟随系统]                   ││
│  │                                                      ││
│  │  全局提示词前缀                                      ││
│  │  ┌─────────────────────────────────────────────┐   ││
│  │  │ 例如：始终使用中文、结构化输出...          │   ││
│  │  └─────────────────────────────────────────────┘   ││
│  │                                                      ││
│  │  默认生成框架                                       ││
│  │  [CO-STAR ▼] [CRISPE] [BROKE] [自定义]              ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**空间改造要点:**

1. **分 5 个 Tab**
   - **通用**: 语言、主题、全局提示词、默认框架
   - **模型与Key**: 所有 API Key 管理 + 默认模型 + 本地 Ollama
   - **界面**: 动画开关、减少运动、字体大小、缩放
   - **数据**: 云端同步、导入/导出、清除缓存、备份恢复
   - **高级**: 日志级别、开发者模式、快捷键自定义

2. **每个设置项卡片化**
   - 相关设置归为一组卡片
   - 卡片标题 + 描述 + 控件
   - 即时保存（blur 后自动保存，无需点击"保存"按钮）

3. **移除大"保存所有设置"按钮**
   - 改为即时保存 + 保存成功 Toast
   - 重大操作（清除数据）需要确认对话框

4. **模型与 Key 页面**
   - 每个模型一行: 图标 + 名称 + Key 输入框 + 状态 dot
   - Key 输入框支持显示/隐藏（Eye 按钮）
   - 配置完成的模型显示绿色 dot + "已配置"
   - 测试连接按钮（测试 Key 是否有效）

### 2.8 账户页 — "身份与接入"

**新增页面**: `/account`

```
┌─────────────────────────────────────────────────────────┐
│  顶栏: 账户                                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  个人资料                                               │
│  ┌─────────────────────────────────────────────────────┐│
│  │              ┌─────┐                                ││
│  │  头像        │ 👤  │  用户名                         ││
│  │  (可点击     └─────┘  email@example.com               ││
│  │   更换)              [编辑资料]                       ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  使用统计                                               │
│  ┌─────────────────────────────────────────────────────┐│
│  │  本月生成: 24 次  │  本月优化: 8 次  │  本地率: 100%   ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  登录与安全                                             │
│  ┌─────────────────────────────────────────────────────┐│
│  │  当前模式: 🔒 本地模式（无需登录）                   ││
│  │  [切换到云端账户]                                     ││
│  │                                                      ││
│  │  设备列表                                            ││
│  │  📱 本机 · 最后活跃 2分钟前                          ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.9 项目详情页重设计 — "对话剧场"

**当前问题**: /projects/:id 左右分栏，但对话区和摘要区比例不对。对话气泡没有 Apple 风格。

**极致设计 — 剧场式对话:**

```
┌─────────────────────────────────────────────────────────┐
│  ← 返回工作台 │ 项目名 · 领域 · 状态                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  对话剧场 (全宽沉浸)                                    │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │     🤖 AI                                        │ │
│  │  ┌─────────────────────────────────────────┐      │ │
│  │  │ 你好！我来帮你细化这个需求...        │      │ │
│  │  │ 能告诉我你的目标受众是谁吗？         │      │ │
│  │  └─────────────────────────────────────────┘      │ │
│  │                                                   │ │
│  │  ┌─────────────────────────────────────────┐      │ │
│  │  │ 目标受众是大学生，年龄 18-22 岁。      │      │ │
│  │  └─────────────────────────────────────────┘      │ │
│  │                                    👤 用户       │ │
│  │                                                   │ │
│  │     🤖 AI                                        │ │
│  │  ┌─────────────────────────────────────────┐      │ │
│  │  │ 了解了！那你的内容风格偏好是...        │      │ │
│  │  └─────────────────────────────────────────┘      │ │
│  │                                                   │ │
│  │  ─────────────────────────────────────────────  │ │
│  │  [📝 继续对话...]  [⚡ 生成提示词 →]             │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  需求摘要 (可折叠侧边抽屉，默认展开)                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 需求摘要 · 已生成                                  │ │
│  │ ─────────────────────────────────────────────────  │ │
│  │ 💡 为大学生群体生成营销文案                        │ │
│  │                                                    │ │
│  │ 核心需求:                                          │ │
│  │ 1. 针对 18-22 岁大学生                            │ │
│  │ 2. 内容风格活泼有趣                               │ │
│  │ 3. 适配小红书平台                                │ │
│  │                                                    │ │
│  │ 约束条件:                                          │ │
│  │ • 字数 200-500                                   │ │
│  │ • 包含 emoji                                     │ │
│  │                                                    │ │
│  │ [📋 复制摘要] [🔄 重新生成]                       │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**空间改造要点:**

1. **对话区全宽沉浸**
   - 对话气泡使用 Apple Messages 风格
   - AI 气泡: 左侧对齐，白色背景，圆角 `0 16px 16px 16px`
   - 用户气泡: 右侧对齐，品牌渐变背景，圆角 `16px 0 16px 16px`
   - 头像: AI 使用机器人图标，用户使用首字母
   - 连续消息: 头像只显示在第一条，后续消息缩进对齐

2. **输入区固定在底部**
   - 类似 iMessage 输入栏: 圆形输入框 + 发送按钮
   - 支持 `/` 快捷指令（显示场景选择浮层）
   - 支持 `@` 引用之前的对话轮次

3. **需求摘要作为可折叠面板**
   - 默认折叠为底部标签栏，点击展开为右侧抽屉
   - 展开动画: `translateX(100%→0)` + `opacity(0→1)`
   - 摘要内容使用结构化卡片展示

4. **生成的提示词作为"彩蛋"出现**
   - 对话完成后，提示词以特殊卡片形式出现在对话末尾
   - 卡片有"复制""优化""保存到库"三个操作按钮

---

## 三、全局组件设计规范 — Apple DNA

### 3.1 卡片设计 (Card)

```
基础卡片 (Material Card):
┌──────────────────────────────┐
│                              │
│  [内容区]                     │
│                              │
│  标题                         │
│  描述文字...                  │
│                              │
│              [操作按钮]       │
│                              │
└──────────────────────────────┘

尺寸规范:
- 圆角: 20px (大卡片) / 16px (中卡片) / 12px (小卡片)
- 内边距: 20px (大) / 16px (中) / 12px (小)
- 背景: Glass-2 (rgba(255,255,255,0.82), blur 30px)
- 边框: 0.5px solid rgba(0,0,0,0.06)
- 阴影: shadow-apple (三层分层阴影)

Hover 态:
- translateY(-2px)
- border-color: rgba(0,122,255,0.15)
- 叠加 glow: 0 0 20px rgba(0,122,255,0.08)
- 阴影加深: shadow-apple-md

Press 态:
- scale(0.98)
- translateY(0)
- 阴影收缩
```

### 3.2 按钮设计 (Button)

```
Primary Button (品牌渐变):
┌──────────────────────────────┐
│  [Sparkles] 开始生成         │
└──────────────────────────────┘
- 背景: linear-gradient(135deg, #007AFF, #AF52DE)
- 圆角: 16px
- 高度: 44px
- 字重: 500
- 字号: 14px
- 内边距: 0 24px
- 阴影: 0 4px 16px rgba(0,122,255,0.2)

Secondary Button (Ghost):
┌──────────────────────────────┐
│  [Copy] 复制                 │
└──────────────────────────────┘
- 背景: transparent
- 边框: 1px solid rgba(0,0,0,0.08)
- 圆角: 16px
- Hover: bg rgba(0,0,0,0.03)

Tertiary Button (文字):
- 纯文字，品牌色
- Hover: 下划线滑入
```

### 3.3 输入框设计 (Input)

```
Search Input:
┌──────────────────────────────────────┐
│ 🔍 │ 搜索项目、提示词、模板...         │
└──────────────────────────────────────┘
- 圆角: 14px
- 高度: 40px
- 背景: Glass-1 (rgba(255,255,255,0.92))
- 边框: 1px solid rgba(0,0,0,0.06)
- Focus: border-color → Primary + glow 扩散
- 左侧搜索图标: text-secondary

Textarea (代码/提示词):
┌──────────────────────────────────────┐
│ 在这里粘贴提示词...                   │
│                                      │
│                                      │
│                                      │
│                         2,340 字符   │
└──────────────────────────────────────┘
- 圆角: 16px
- 背景: #F2F2F7 (secondary-bg)
- 字体: SF Mono (代码) / SF Pro Text (自然语言)
- 字符计数: 右下角，text-tertiary，12px
```

### 3.4 Badge 设计 (Tag)

```
Domain Badge:
┌────────────┐
│ 内容营销   │
└────────────┘
- 圆角: 8px
- 高度: 22px
- 内边距: 0 10px
- 字号: 12px
- 字重: 500
- 每个领域有专属背景色 + 文字色（见配色系统）

Status Badge:
┌────────────┐
│ ● 草稿   │
└────────────┘
- 左侧 6px 圆点表示状态
- 草稿=gray, 就绪=green, 执行中=blue, 完成=purple
```

### 3.5 空状态设计 (Empty State)

```
每个页面有专属空状态，不是换图标：

工作台空状态:
┌─────────────────────────────────────┐
│                                     │
│  ┌─────┐                           │
│  │ 📝  │  还没有项目                │
│  └─────┘                           │
│  从首页创建一个需求，                │
│  AI 会引导你完成整个流程。          │
│                                     │
│  [⚡ 创建第一个项目 →]              │
│                                     │
│  (背景: 星座图装饰线)                │
│                                     │
└─────────────────────────────────────┘

库空状态:
┌─────────────────────────────────────┐
│  ┌─────┐                           │
│  │ 📚  │  还没有保存的提示词       │
│  └─────┘                           │
│  生成提示词后点击 "保存到库"，      │
│  方便日后查看和复用。               │
│  [去生成 →]                         │
└─────────────────────────────────────┘
```

**设计要点:**
- 图标: 80px 圆形容器，品牌渐变背景，白色图标
- 标题: 18px semibold
- 描述: 14px secondary，最大宽度 320px
- 操作按钮: Primary 样式
- 背景: 微弱的星座图/网络装饰（不干扰主内容）

---

## 四、信息架构重组 — 路由与 URL

### 4.1 新路由表

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | Home | 首页，主要创建入口 |
| `/workspace` | Workspace | 项目工作台（概览） |
| `/workspace?id=123` | Workspace | 查看具体项目 |
| `/library` | Library | 提示词库 |
| `/library/:id` | LibraryDetail | 提示词详情（抽屉或页面） |
| `/templates` | TemplateMarket | 模板市场 |
| `/templates/:id` | TemplateDetail | 模板详情 |
| `/optimizer` | Optimizer | 提示词优化器 |
| `/export` | Export | 批量导出 |
| `/settings` | Settings | 通用设置 |
| `/settings/keys` | SettingsKeys | API Key 管理 |
| `/settings/data` | SettingsData | 数据管理 |
| `/account` | Account | 账户中心（新增） |
| `/about` | About | 关于 |
| `/login` | Login | 登录 |

### 4.2 废弃/合并

| 旧路径 | 处理方式 | 原因 |
|--------|----------|------|
| `/projects` | 301 → `/workspace` | 功能合并到工作台 |
| `/projects/:id` | 301 → `/workspace?id=:id` | 统一项目视图 |
| `/settings` (旧) | 拆分为多个子页 | 解耦过载页面 |

---

## 五、布局响应式断点

```
Desktop (≥1280px):
- Sidebar: 240px 固定
- 主内容区: calc(100vw - 240px)
- 工作台: 左 280px + 右 flex-1
- 网格: 4 列（模板）/ 3 列（库）

Tablet (768px - 1279px):
- Sidebar: 可折叠到 72px（图标模式）
- 主内容区: calc(100vw - 72px)
- 工作台: 左 240px + 右 flex-1
- 网格: 2 列

Mobile (<768px):
- Sidebar: 隐藏，底部 Tab Bar 代替
- 主内容区: 100vw
- 工作台: 单栏（列表在上，详情在下）
- 网格: 1 列
- FAB 替换为底部居中大按钮
```

**底部 Tab Bar (Mobile Only):**
```
┌─────────────────────────────────────────┐
│  [🏠]  [📦]  [+]  [⚡]  [⚙️]            │
│  首页  工作台 新建 工具箱 设置           │
└─────────────────────────────────────────┘
- 高度: 64px + safe-area-inset-bottom
- 中间 "+" 按钮凸起 8px
- 选中态: 品牌色图标 + 标签
- 未选中: gray 图标
```

---

## 六、交互流程重设计

### 6.1 创建流程

```
用户行为: 想要创建新提示词

方案A — 从首页:
1. 用户进入 /
2. 在 Hero 输入框输入需求
3. 点击 "开始生成" 或 Cmd+Enter
4. 自动创建项目，跳转 /workspace?id=new_id
5. 打开 ClarifyChatPanel（右侧滑入）
6. AI 开始澄清对话

方案B — 全局快捷:
1. 用户在任意页面按 Cmd+N
2. 弹出快速创建浮层（类似 Spotlight）
3. 输入需求 → 直接创建并跳转

方案C — FAB:
1. 用户点击右下角 FAB
2. 选择 "新建项目"
3. 弹出输入浮层
4. 同上跳转
```

### 6.2 优化流程

```
用户行为: 优化已有提示词

方案A — 从库:
1. 用户进入 /library
2. 找到要优化的提示词
3. 点击卡片上的 "优化" 按钮
4. 跳转 /optimizer?prompt=xxx（自动带入）
5. 用户选择策略 → 开始优化

方案B — 直接粘贴:
1. 用户进入 /optimizer
2. 粘贴提示词到左侧输入框
3. 选择策略 → 开始优化
4. 查看 Diff 对比 → 复制结果
```

### 6.3 导出流程

```
用户行为: 导出提示词

1. 用户进入 /export
2. 勾选要导出的提示词（可多选）
3. 选择格式（JSON/Markdown/TXT）
4. 配置高级选项（可选）
5. 点击导出 → 下载文件
6. Toast 通知 "导出完成"
```

---

## 七、视觉层级系统

```
Z-Index 空间:

z-0:   页面背景 (Aurora)
z-10:  内容层 (卡片、文字)
z-20:  悬浮层 (FAB、返回顶部)
z-30:  抽屉层 (详情抽屉、侧边面板)
z-40:  模态层 (对话框、确认框)
z-50:  覆盖层 (Toast、通知)
z-60:  全局层 (Command Palette、Onboarding)
z-70:  最高层 (拖拽中元素)

阴影层级:
Level 1 (紧贴): shadow-xs    — 内部元素、分割线
Level 2 (微浮): shadow-sm    — 卡片、输入框
Level 3 (悬浮): shadow-md    — Hover 态卡片、下拉菜单
Level 4 (浮起): shadow-lg    — 模态框、Drawer
Level 5 (最高): shadow-xl    — FAB、Toast
```

---

## 八、布局重构原子任务拆分

### 批次 1 — 导航与布局骨架 (P0)

| 编号 | 任务 | 工期 | 验收标准 |
|------|------|------|----------|
| L1-1 | 重构 Sidebar 为分组导航 | 4h | 三层分组 + 激活态 indicator + 可折叠 |
| L1-2 | 顶栏 Title Bar 改造 | 3h | macOS 风格 + 页面标题 + 右侧操作区 |
| L1-3 | 全局 FAB 组件 | 4h | 右下角悬浮 + 扇形展开菜单 + 快捷键 |
| L1-4 | 响应式布局系统 | 6h | Desktop/Tablet/Mobile 三态 + 底部 Tab Bar |
| L1-5 | 路由重组 + 重定向 | 3h | 新路由表 + /projects → /workspace 301 |
| L1-6 | 面包屑/路径导航 | 2h | 深层页面显示返回 + 路径 |

### 批次 2 — 页面级重构 (P1)

| 编号 | 任务 | 工期 | 验收标准 |
|------|------|------|----------|
| L2-1 | 首页 Hero 区重设计 | 6h | 居中布局 + 横向场景卡片 + 统计区 |
| L2-2 | 工作台两栏布局 | 8h | 左项目列表 + 右生命周期/概览 |
| L2-3 | 工作台合并 Projects | 4h | /projects 功能并入 /workspace |
| L2-4 | 提示词库双视图 | 6h | 网格/列表切换 + 详情抽屉 |
| L2-5 | 模板市场橱窗设计 | 6h | 精选区 + 分类导航 + 卡片网格 |
| L2-6 | 优化器双栏对比 | 6h | 原始/结果并排 + Diff 高亮 + 改进徽章 |
| L2-7 | 导出向导式流程 | 4h | 三步骤 + 选择 + 格式 + 导出 |
| L2-8 | 设置分 Tab 重构 | 6h | 5 个 Tab + 即时保存 + 模型 Key 页 |
| L2-9 | 账户页新建 | 4h | 个人资料 + 统计 + 登录安全 |
| L2-10 | 项目详情对话剧场 | 6h | Messages 风格气泡 + 摘要抽屉 + 输入栏 |

### 批次 3 — 全局组件 Polish (P2)

| 编号 | 任务 | 工期 | 验收标准 |
|------|------|------|----------|
| L3-1 | 卡片组件统一 | 4h | Material Card + Glass + Hover/Press 态 |
| L3-2 | 按钮组件统一 | 3h | Primary/Secondary/Tertiary 三级 |
| L3-3 | 输入框组件统一 | 3h | Search/Textarea + Focus 态 |
| L3-4 | Badge 组件统一 | 2h | Domain/Status 两种 + 领域色 |
| L3-5 | 空状态组件统一 | 3h | 每页专属 + 图标 + 操作按钮 |
| L3-6 | 全局搜索升级 | 4h | Command Palette 搜索全部内容 |
| L3-7 | 空状态生成艺术 | 4h | 星座图/粒子装饰背景 |

---

## 九、合并执行路线图

```
Week 1: Phase 1 动画基础设施 + L1 导航骨架
  ├── P0-1 ~ P0-12（动画基础设施）
  └── L1-1 ~ L1-6（导航与布局骨架）

Week 2: Phase 2 核心动画体验 + L2 页面重构
  ├── P1-1 ~ P1-8（全局体验 + 核心页面动画）
  └── L2-1 ~ L2-5（首页/工作台/库/模板/优化器）

Week 3: Phase 2 后半段 + L2 后半段
  ├── P1-9 ~ P1-16（剩余核心页面 + 路由懒加载）
  └── L2-6 ~ L2-10（导出/设置/账户/详情）

Week 4: Phase 3 微交互 + L3 组件 Polish
  ├── P2-1 ~ P2-14（微交互 + 性能硬化）
  └── L3-1 ~ L3-7（全局组件统一）

Week 5: 验收与调优
  ├── 全链路测试
  ├── 性能调优
  └── 低设备降级验证
```

---

*本文档第一部分（动画系统）由小龙坎根据 `tipai-extreme-ui-design-spec.md` 拆解生成。*
*本文档第二部分（布局重构）由小龙坎基于 TipAi 完整代码库扫描后编写。*
*动画与布局不是替代关系，是叠加关系 —— 先有合理的空间组织，再注入极致的交互体验。*
