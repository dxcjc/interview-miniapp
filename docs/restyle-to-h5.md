# 执行说明：小程序样式按 H5 设计 1:1 还原

## 背景
H5 版（/opt/interview-agent/frontend）已完成「暖米白+蜜橘」移动端设计体系（全局 index.css 979 行，定义 CSS 变量：accent=#FF8A5C、bg=#FBF8F3、ink、橙渐变 #FFB28F→#FF8A5C、暖阴影、pill 圆角、Nunito 数字字体、标题衬线字体）。
Taro 小程序（/opt/interview-miniapp）12 个页面是另行重写的，仅主题色一致，视觉语言（圆角/阴影/字体/间距/组件样式/布局）与 H5 不一致。

## 目标
小程序 12 个页面（index/bank/interview/review/plan/graph/mine/profile/progress/wrongbook/jobs/settings）+ 全局样式，按 H5 视觉语言还原，做到同页面对比"一个模子"。

## 改动范围
| 文件 | 动作 |
|---|---|
| `src/app.scss` | 对齐 H5 全局变量（色值/圆角/阴影/字体栈）、页面背景、通用卡片/标签/按钮样式 |
| `src/pages/*/index.scss`（12 个） | 逐页对照 H5 对应页 CSS 还原：配色、圆角、阴影、间距、字号字重、渐变、进度条样式 |
| `src/components/`（如有样式） | 同步还原 |
| 字体 | 小程序无法外链 Google Fonts：Nunito 等数字字体用系统近似替代或内嵌 woff（体积<200KB 才做），标题衬线字体同理降级 |

## 明确不做
- ❌ 不改页面结构（tsx/wxml 布局、逻辑、文案）——除非样式还原必须加 class/节点（最小改动）
- ❌ 不改 H5
- ❌ 不重写业务逻辑

## 还原依据（对照清单）
1. H5 全局：`/opt/interview-agent/frontend/src/styles/index.css`
2. H5 各页：`/opt/interview-agent/frontend/src/pages/*/*.css`（同名页面一一对应）
3. 设计令牌：accent #FF8A5C / accent-strong（深橙）/ bg #FBF8F3 / ink 墨色 / muted 灰 / 白卡片 + 暖阴影 rgba(93,66,42,.06~.15) / 圆角 12~20px + pill / 渐变 #FFB28F→#FF8A5C / 大数字 900 字重

## 验证清单
1. `npm run build:weapp` 构建通过（tsc/eslint 无新增错误）
2. 微信开发者工具模拟器截图每个页面，与 H5 同页截图并排对比：
   - 首页（进度卡/今日任务/掌握度卡片）
   - 题库（搜索/chip 筛选/题目卡片）
   - 面试（会话气泡/输入框/录音按钮）
   - 计划（顶部大数字/周网格/勾选）
   - 我的/图谱/错题本/进步/岗位/设置
3. 关键差异项自查：TabBar 选中态、卡片阴影、按钮渐变、圆角、数字字体
4. 截图存 /tmp/miniapp-restyle/，随报告附对比

## 验收标准
小程序与 H5 同页面视觉一致（色值/圆角/阴影/间距/字体观感），构建通过，截图对比无明显偏差。
