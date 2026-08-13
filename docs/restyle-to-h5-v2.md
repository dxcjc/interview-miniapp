# 执行说明：小程序按 H5 重做（结构+样式+图标全对齐）

## 背景与问题
第一轮样式还原只改了 scss（CSS 变量），但**页面 tsx 结构与 H5 不一致**，类名无对应 DOM 节点，渲染效果与 H5 差距大。用户明确反馈：样式差太多、**页面内图标用了 emoji 而非图片**（H5 用 PNG 图片）。

## 目标
小程序 12 个页面 + 全局，**结构与样式一起**按 H5 同名页面源码重做，做到"同页面视觉一致，一个模子"。

## 对照基准（H5 源码，逐页一一对应）
- 全局样式：`/opt/interview-agent/frontend/src/styles/index.css`
- 各页面 JSX+CSS：`/opt/interview-agent/frontend/src/pages/<同名>.jsx`（如 HomePage.jsx ↔ pages/index、BankPage.jsx ↔ pages/bank、CallPage.jsx ↔ pages/interview、ReviewPage.jsx ↔ pages/review、PlanPage.jsx ↔ pages/plan、GraphPage.jsx ↔ pages/graph、MePage.jsx ↔ pages/mine、JobsPage.jsx ↔ pages/jobs、ProgressPage.jsx ↔ pages/progress、WrongBookPage.jsx ↔ pages/wrongbook、ProfilePage.jsx ↔ pages/profile、SettingsPage.jsx ↔ pages/settings）
- 组件：`/opt/interview-agent/frontend/src/components/*.jsx`（TabBar 等）

## 必做清单
1. **tsx 结构重写**：对照 H5 JSX 的 DOM 结构（层级、类名、元素顺序）重写小程序页面 tsx。类名必须与 H5 一致（如 .hm-top、.bank-banner、.sec-head、.chip、.dir、.card 等），这样 H5 的 css 可直接翻译为 scss。
2. **scss 翻译**：把 H5 对应 css 逐条翻译为小程序 scss（px→rpx×2：H5 375px 设计稿，1px=2rpx）。全局变量已备好：`src/styles/tokens.scss`（$bg/$accent/$radius/$shadow/$font-num/$font-serif 等）。
3. **图标全部用图片**：页面内图标一律用 `<Image src={require('../../assets/h5/icon-xxx.png')}>` 引用，**禁止 emoji**。资源已复制到 `src/assets/h5/`（25 个 PNG，与 H5 完全一致）。映射参考：
   - 今日任务：task-book.png / task-mic.png / task-puzzle.png
   - 搜索：icon-search.png；设置：icon-settings.png；目标：icon-target.png；星星：icon-star.png；图谱：icon-map.png；进度：icon-progress.png；错题本：icon-wrongbook.png；简历：icon-resume.png；提示：icon-tip.png；返回：icon-back.png；勾选：icon-check.png；结束：icon-end.png；跳过：icon-skip.png；静音：icon-mute.png；面试官：icon-interviewer.png；拼图：icon-puzzle.png；品牌：brand.png
   - TabBar：若小程序现有 assets/tab/*.png 与 H5 观感不一致，改用 h5/tab-*.png
4. **字体**：$font-num（数字 Nunito 观感）、$font-serif（标题）在小程序端尽量接近：可在 app.scss 用 font-family 列表降级（如 `'DIN Alternate', 'Arial Rounded MT Bold', sans-serif`），或若体积允许引入本地 woff（>200KB 则降级）。目标：大数字/标题观感接近 H5。
5. **组件默认样式 reset**：button/input/textarea 等小程序原生组件默认样式需 reset（H5 是全自定义样式），统一在 app.scss 处理。

## 明确不做
- ❌ 不改业务逻辑（API 调用、状态、事件处理尽量保持，只动渲染结构与样式）
- ❌ 不改 H5
- ❌ 不新增第三方依赖
- ⚠️ 禁止读取/打开任何 .png/.jpg 图片文件（工具链限制，读图会中断任务）；图标资源直接按路径引用即可，不要用视觉工具查看

## 验证清单
1. `npm run build:weapp` 通过（tsc/eslint 无新增错误，最多既有警告）
2. 构建产物 dist 确认无 emoji 图标残留、页面类名与 H5 对齐
3. 截图说明：无 headless 微信工具，无法出小程序截图；用 grep 检查类名/图标引用完整度作为替代验收，输出「页面×类名/图标引用」对照表
4. 提交 git 并 push（commit message 小写开头）

## 验收标准
小程序页面类名与 H5 一致、图标全部图片引用、无 emoji、构建通过；报告附逐页对照表。
