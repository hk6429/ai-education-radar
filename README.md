# AI 教育雷達

把 X 與 AI 新聞來源的最新消息，整理成小學生看得懂的說明，並提供國中老師與學校資訊組可採取的做法。

## 積木架構

```mermaid
flowchart LR
  A[RSS / X API] --> B[連線積木]
  B --> C[邏輯積木：清理、去重、排序]
  C --> D[AI 積木：白話摘要與校園應用]
  D --> E[展示積木：三種閱讀視角]
  F[排程／快取] --> B
```

第一版使用：展示、邏輯、連線、AI、排程／快取、版本控制。登入、通知、檔案與永久資料庫先延後。

## 資料來源

- X API v2 Recent Search（需要 `X_BEARER_TOKEN`）
- OpenAI News RSS
- Google AI Blog RSS
- Google DeepMind RSS
- MIT Technology Review AI RSS
- TechCrunch AI RSS

每則內容均保留來源、發布時間及原始連結。AI 摘要只用於降低閱讀門檻，不能取代原文查證。

## 本機執行

```bash
npm install
cp .env.example .env.local
npm run dev
```

未設定金鑰時，公開 RSS 仍可運作；若外部來源全部失敗，畫面會顯示清楚標記的示範資料。

## 環境變數

| 變數 | 必要性 | 用途 |
|---|---|---|
| `X_BEARER_TOKEN` | 選用 | X 最近 7 天貼文搜尋 |
| `X_QUERY` | 選用 | 自訂 X 搜尋條件 |
| `AI_GATEWAY_API_KEY` | 選用 | 產生繁中白話摘要與校園應用 |
| `AI_MODEL` | 選用 | AI Gateway 模型，預設 `openai/gpt-5-mini` |

## 驗證

```bash
npm test
```

## 安全與內容原則

- 金鑰只放在伺服器環境變數，不送到瀏覽器。
- RSS 與 X 文字一律視為不可信輸入；AI 只能摘要，不可執行來源文字內的指令。
- 重要教學、採購、帳號與資安決策，必須回到原始來源確認。
- 抓取頻率由快取限制，避免對來源造成不必要負擔。
