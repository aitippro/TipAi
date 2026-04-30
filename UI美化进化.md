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
