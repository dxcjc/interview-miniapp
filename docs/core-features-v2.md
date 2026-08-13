# 执行说明：岗位→知识库→出题 完整闭环（V2）

## 用户需求（产品逻辑）
1. 岗位不做外链跳转，**系统内做岗位详情页**（展示抓取的完整信息）
2. 岗位的**技能点/要求要收集**，经过 **AI 分析纳入知识库**
3. 出题要**贴合岗位方向**——知识库里的岗位技能点作为出题素材

## 闭环架构
```
岗位抓取(crawler) → 岗位详情(系统内展示)
      ↓ AI 分析提炼技能点
知识库 KnowledgeItem(source='job_xxx') 
      ↓ 检索融合
出题引擎(按 direction + 岗位技能点) → 贴合真实岗位的题目
```

## 后端改动（/opt/interview-agent/backend）
### 1. 岗位详情接口
- `GET /api/jobs/{id}`：返回 JobOut 全字段 + 该岗位已入库知识条数（analyzed 状态）
- app/api/jobs.py 加路由；404 处理

### 2. AI 分析入库服务（新增 app/services/job_knowledge.py）
- `analyze_job(db, job) -> KnowledgeItem`：调用 LLM 分析岗位（title/company/city/direction/tags）→ 提炼 3~6 个核心技能考察点，每个生成：
  - topic：技能点（如"KV Cache 原理"）
  - tags：关联标签
  - question_template：可直接做题面的题目
  - followup_chain：2~3 层追问链
  - answer_points：参考答题要点 2~4 条
  - source：`job_{job.id}`（与 public/personal 区分）
  - difficulty_ref：参考难度
- 幂等：同 job + topic 不重复入库（UniqueConstraint 或先查后插）
- LLM 复用 app/services/llm.py 现有封装；失败降级：仅把 job.tags 转为简单 KnowledgeItem（topic=tag）

### 3. 批量分析入口
- `POST /api/jobs/analyze`：扫描未分析岗位（无 job_ 来源知识条）批量分析，返回处理数量
- 或 crawler 抓取后自动触发（在 crawler/jobs.py fetch 入库后调 analyze 队列）——实现简单版：手动/接口触发 + 前端详情页按钮触发单个

### 4. 出题引擎融合岗位技能点
- app/services/question_engine.py `_retrieve_items`：检索 KnowledgeItem 时，若该 direction 素材不足或作为补充，查询 jobs 表同 direction 岗位的已入库知识条（source LIKE 'job_%'）并入素材
- `_build_prompt` 提示词注明"以下素材包含真实岗位技能点"

## 前端改动
### H5（/opt/interview-agent/frontend）
- JobsPage.jsx：岗位卡点击 → 岗位详情弹层（全字段：标题/公司/城市/方向/经验/tags 全部/来源/发布时间/原文链接(展示不跳转)/已入库状态）
- 详情弹层带「分析入库」按钮（调 POST /api/jobs/{id}/analyze 或批量）——若后端做批量接口则显示"已收集 N 个技能点"
- BankPage.jsx：保持方向出题；出题结果若含岗位来源标注（optional）

### 小程序（/opt/interview-miniapp）
- jobs/index.tsx：岗位卡点击 → 详情弹层（同 H5 字段 + 技能点列表）
- api/jobs.ts：+ getJobDetail(id)、analyzeJob(id)
- bank/index.tsx：保持方向出题（已验证正常），无大改

## 不做
- ❌ 不做外链跳转打开（详情页在系统内）
- ❌ 不改 crawler 抓取范围（现有字段够用）
- ❌ 不做复杂去重/知识图谱融合（v1 简单按岗位入库）

## 验证
1. 后端：curl GET /api/jobs/{id} 200；POST /api/jobs/analyze 处理 N 条；DB 确认 job_ 来源知识条入库；出题接口 direction 出题含岗位技能点素材
2. H5：build 通过 + 岗位详情弹层字段齐全 + 分析入库按钮生效
3. 小程序：build:weapp 通过 + grep 详情弹层类名 + 无 emoji
4. 全量 pytest 通过（新增接口测试）

## 验收
岗位详情页系统内完整展示、AI 分析技能点入库、出题贴合岗位方向、构建/测试通过。
