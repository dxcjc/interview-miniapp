# 面霸·陪练 微信小程序（Taro 3/4 + React + TypeScript）

AI 面试陪练微信小程序版，复用现有后端 API（`http://110.42.215.22/interview/api/` 或后端 8900）。
代码全真实接口，无 demo/mock。

## 快速开始

```bash
npm install
npm run dev:weapp        # 开发（watch 模式，产物在 dist/）
npm run build:weapp      # 生产构建
```

用微信开发者工具「导入项目」选择 `/opt/interview-miniapp`，AppID 用测试号（`touristappid`），
产物目录为 `dist/`（已写入 `project.config.json` 的 `miniprogramRoot`）。

### 开发期调试

1. **勾选「不校验合法域名」**：详情 → 本地设置 → 勾选"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"。
2. dev 构建默认请求 `http://110.42.215.22:8900/api`（后端 8900 端口，HTTP）。
3. 如需覆盖接口地址：

```bash
TARO_APP_API=https://你的域名/interview/api npm run dev:weapp
```

`process.env.TARO_APP_API` 在 `config/index.ts` 的 `defineConstants` 中构建期内联，
小程序运行时不会访问 `process` 全局。

## 环境与接口地址

| 环境 | 默认 API_BASE | 说明 |
| ---- | ---- | ---- |
| dev（`dev:weapp`） | `http://110.42.215.22:8900/api` | 需勾选"不校验合法域名" |
| prod（`build:weapp`） | `https://dishes-delete-palmer-quantity.trycloudflare.com/interview/api` | Cloudflare 隧道（临时域名，会变） |

生产默认地址在 `src/config.ts` 中维护；上线前必须替换为**已备案的 HTTPS 域名**（微信要求小程序
request 域名必须 HTTPS + ICP 备案）。

## 页面清单

| 页面 | 路由 | 数据来源 |
| ---- | ---- | ---- |
| 首页 | `pages/index` | `GET /api/home/overview` |
| 题库 | `pages/bank` | `POST /api/questions/generate` + `GET /api/questions` |
| 模拟面试 | `pages/interview` | `POST /api/mock/session` + `/turn`(SSE) + `/end` |
| 面试复盘 | `pages/review` | `GET /api/review/{session_id}` |
| 辅导计划 | `pages/plan` | `GET /api/plan` + `PATCH /api/plan/days/{id}` |
| 知识图谱 | `pages/graph` | `GET /api/graph` |
| 简历画像 | `pages/profile` | `GET /api/profile` |
| 错题本 | `pages/wrongbook` | `GET /api/wrongbook` + `POST /api/wrongbook/{id}/retest` |
| 进步曲线 | `pages/progress` | `GET /api/reviews` |
| 岗位雷达 | `pages/jobs` | `GET /api/jobs` + `GET /api/jobs/insight` |
| 我的 | `pages/mine` | overview 统计 + 子页入口 |
| 设置 | `pages/settings` | 后端连接检测 |

TabBar：首页 / 题库 / 面试 / 计划 / 我的（图标在 `src/assets/tab/`）。

## 技术要点

- **SSE 流式对话**（`src/utils/sse.ts`）：微信 request 无 EventSource，用 `enableChunked` +
  `onChunkReceived` 逐块拼帧；手写增量 UTF-8 解码器处理 chunk 截断多字节字符。
- **语音**（`src/pages/interview` + `src/utils/voice.ts`）：`wx.getRecorderManager()` 长按录音，
  上传 `POST /api/voice/transcribe` 转写。
  ⚠️ **后端该接口尚未实现**——前端按真实失败处理并明确提示，无伪造数据。后端任务待派：
  接收录音文件 → 火山/讯飞 ASR → 返回 `{"text": "..."}`。
- **请求封装**（`src/utils/request.ts`）：GET 自动剔除 `undefined` 查询参数（避免序列化成
  `"undefined"` 破坏后端过滤），统一超时 60s 与错误 toast。

## 验证

- 构建：`npm run build:weapp`（webpack5 编译通过）
- 类型：`npx tsc --noEmit --skipLibCheck src/**/*.ts src/*.ts`
- Lint：`npx eslint src --ext .ts,.tsx`
- 真机验证：需在装有微信开发者工具 + 微信 App 的设备上打开，勾选"不校验合法域名"，
  对语音、SSE 流式、下拉刷新做真机回归。

## 后端未实现接口（待派）

- `POST /api/voice/transcribe`：录音文件 → ASR 转写文本。
