# 执行说明：主干功能完善（岗位要求/跳转/题目详情/我的页修复）

## 背景
用户反馈 5 个主干问题：
1. 岗位要求点没列举 → 前端只显示 6 个 tags，经验/城市/来源未强调，无完整要求
2. 岗位点进去应跳转原招聘页 → 后端有 url（高校就业网/腾讯招聘），小程序只复制链接无引导
3. 题目不能点详情 + 历史要记录 → 后端已存题库（出题即入库），前端无详情展示、历史无入口
4. 我的页样式错乱、图标大小没设好
5. 题目"假/少" → 已验证后端按方向 LLM 生成正常（direction+count=8，质量高），旧版 API 不通导致显示异常；优化加载体验即可

## 改动方案（H5 与小程序同步改）

### A. 岗位页（H5 JobsPage.jsx + 小程序 jobs/index.tsx&scss）
- **要求完整展示**：tags 全部展示（不再 slice(0,6)）；经验（experience）、城市、来源（source）明确行展示
- **点击跳转原文**：
  - H5：岗位卡点击 → window.open(url) 新窗口打开
  - 小程序：点击 → wx.setClipboardData 复制链接 + wx.showModal「已复制链接，请到浏览器打开」引导（个人小程序 web-view 需备案域名，暂用复制方案；后续有域名可升级）
- 空 tags 时不渲染标签行

### B. 题库页（H5 BankPage.jsx + 小程序 bank/index.tsx&scss）
- **题目详情**：题目卡点击 → 详情弹层/新页展示：难度（easy/mid/hard）、知识点 kp、追问链 followup_chain（逐条列出）、tags
- **历史记录**：题库页增加「历史出题」入口/分页列表（GET /api/questions 已支持 direction 分页），展示累计出题记录（含 AI 生成标记），与「本次出题」并列
- **出题体验**：生成中 loading 文案「AI 正在按方向出题…」、失败明确提示+重试按钮

### C. 我的页（小程序 mine/index.scss）
- 修复图标尺寸：检查 menu 图标/头像/统计图标 Image 尺寸，统一设 width/height（Image 不设尺寸会默认 320px 撑爆布局）
- 对齐 H5 me 页布局

### D. 出题验证（无需改）
- 实测确认方向出题正常（llm_app 方向生成 KV Cache/Beam Search 等高质量题）
- 前端确认 direction 正确传递、count=8

## 不做
- ❌ 不改后端数据结构（Job 不新增字段，用现有 tags/experience/url）
- ❌ 不重抓岗位数据
- ❌ 不做 web-view 跳转（备案域名未就绪，用复制链接方案）

## 验证
1. H5：npm run build 通过 + 页面点验（岗位要求全展示、点卡新窗口开原文、题目点开详情、历史列表可翻页）
2. 小程序：npm run build:weapp 通过 + grep 检查类名/逻辑 + dist 无 emoji
3. 后端出题实测 curl 返回正常
4. git 提交推送

## 验收
岗位要求完整可见、点击跳转原文（H5 开窗/小程序复制+引导）、题目详情可看、历史记录可查、我的页图标大小正常、构建通过。
