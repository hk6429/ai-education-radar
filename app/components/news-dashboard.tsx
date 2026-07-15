"use client";

import { useEffect, useMemo, useState } from "react";
import type { Audience, DigestItem, NewsResponse, SourceType } from "../../lib/news";

const audienceLabels: Record<Audience, string> = {
  child: "小學生也懂",
  teacher: "國中老師",
  it: "資訊組",
};

const audienceHeadings: Record<Audience, string> = {
  child: "一句話說人話",
  teacher: "老師可以怎麼用",
  it: "資訊組可以怎麼做",
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "時間待確認";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  }).format(date);
}

function viewText(item: DigestItem, audience: Audience) {
  if (audience === "teacher") return item.teacherUse;
  if (audience === "it") return item.itUse;
  return item.childSummary;
}

export function NewsDashboard({ initialItems }: { initialItems: DigestItem[] }) {
  const [audience, setAudience] = useState<Audience>("child");
  const [source, setSource] = useState<"all" | SourceType>("all");
  const [data, setData] = useState<NewsResponse>({
    items: initialItems,
    generatedAt: new Date().toISOString(),
    liveSourceCount: 0,
    socialStatus: "live",
    aiStatus: "fallback",
    errors: ["正在連接即時來源，目前先顯示示範內容"],
  });
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/news", { cache: "no-store" });
      if (!response.ok) throw new Error("news request failed");
      setData((await response.json()) as NewsResponse);
    } catch {
      setData((current) => ({
        ...current,
        errors: ["即時資料暫時連不上，畫面保留上一次內容"],
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/news", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("news request failed");
        return response.json() as Promise<NewsResponse>;
      })
      .then((nextData) => {
        if (active) setData(nextData);
      })
      .catch(() => {
        if (active) {
          setData((current) => ({
            ...current,
            errors: ["即時資料暫時連不上，畫面保留上一次內容"],
          }));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const items = useMemo(
    () =>
      data.items.filter((item) => source === "all" || item.sourceType === source),
    [data.items, source],
  );

  return (
    <main>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="AI 教育雷達首頁">
          <span className="brand-mark">A+</span>
          <span>AI 教育雷達</span>
        </a>
        <nav aria-label="頁面導覽">
          <a href="#radar">最新消息</a>
          <a href="#method">怎麼閱讀</a>
          <a href="#sources">資料來源</a>
        </nav>
        <button className="refresh-button" type="button" onClick={refresh} disabled={loading}>
          <span aria-hidden="true">↻</span> {loading ? "更新中" : "更新雷達"}
        </button>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span /> AI SIGNAL FOR SCHOOL</div>
        <h1>
          把今天的 AI 大事，
          <em>翻成孩子也懂的話。</em>
        </h1>
        <p className="hero-copy">
          從繁體中文科技媒體、Bluesky 公開社群與每日 YouTube 訂閱推播整理最新消息；每一則都告訴你：發生什麼事、老師怎麼用、資訊組要注意什麼。
        </p>
        <div className="hero-meta">
          <span className="live-pill"><i /> 雷達運作中</span>
          <span>連上 {data.liveSourceCount} 個即時來源</span>
          <span>台灣時間 {formatTime(data.generatedAt)}</span>
        </div>
      </section>

      <section className="control-deck" aria-label="閱讀模式">
        <div>
          <span className="control-label">我想用誰的角度讀？</span>
          <div className="segment" role="group" aria-label="選擇閱讀角色">
            {(Object.keys(audienceLabels) as Audience[]).map((key) => (
              <button
                key={key}
                className={audience === key ? "active" : ""}
                type="button"
                aria-pressed={audience === key}
                onClick={() => setAudience(key)}
              >
                {audienceLabels[key]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="control-label">消息從哪裡來？</span>
          <div className="source-filter" role="group" aria-label="篩選消息來源">
            {(["all", "youtube", "bluesky", "news"] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={source === key ? "active" : ""}
                aria-pressed={source === key}
                onClick={() => setSource(key)}
              >
                {key === "all"
                  ? "全部"
                  : key === "youtube"
                    ? "YouTube"
                    : key === "bluesky"
                        ? "Bluesky 社群"
                        : "新聞網站"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {data.errors.length > 0 && (
        <aside className="status-note" role="status">
          <strong>資料狀態</strong>
          <span>{data.errors.join("；")}</span>
        </aside>
      )}

      <section className="radar-section" id="radar">
        <div className="section-title">
          <div>
            <span className="kicker">LIVE FEED</span>
            <h2>現在正在發生</h2>
          </div>
          <p>{audienceHeadings[audience]} · 共 {items.length} 則</p>
        </div>

        <div className="news-grid">
          {items.map((item, index) => (
            <article className="news-card" key={item.id}>
              <div className="card-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="source-row">
                <span className={`source-badge ${item.sourceType}`}>
                  {item.sourceType === "bluesky"
                    ? "BSKY"
                    : item.sourceType === "youtube"
                      ? "YT"
                      : "NEWS"}
                </span>
                <span>{item.source}</span>
                <time dateTime={item.publishedAt}>{formatTime(item.publishedAt)}</time>
              </div>
              <h3>{item.title}</h3>
              <div className="plain-box">
                <span>{audienceHeadings[audience]}</span>
                <p>{viewText(item, audience)}</p>
              </div>
              <div className="tags">
                {item.tags.map((tag) => <span key={tag}>#{tag}</span>)}
              </div>
              <div className="card-footer">
                <p><strong>先等等：</strong>{item.caution}</p>
                <a href={item.url} target="_blank" rel="noreferrer">
                  看原始消息 <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          ))}
          {items.length === 0 && (
            <div className="empty-state">
              <strong>這個來源目前沒有消息</strong>
              <p>換成「全部」或其他來源，就能繼續閱讀。</p>
            </div>
          )}
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="method-intro">
          <span className="kicker">THINK BEFORE SHARE</span>
          <h2>看 AI 新聞，記得三件事</h2>
          <p>快，不等於對。看懂一則消息後，再多走三小步，就比較不容易被炫目的標題騙走。</p>
        </div>
        <ol className="method-list">
          <li><span>01</span><div><strong>先看原文</strong><p>摘要像地圖，原文才是現場。</p></div></li>
          <li><span>02</span><div><strong>再找第二個來源</strong><p>同一件事有人互相證明，更可靠。</p></div></li>
          <li><span>03</span><div><strong>最後想校園情境</strong><p>能不能用，要看學生、資料與風險。</p></div></li>
        </ol>
      </section>

      <section className="sources-section" id="sources">
        <div>
          <span className="kicker">SOURCE MAP</span>
          <h2>雷達怎麼找消息？</h2>
        </div>
        <div className="source-map">
          <div><span>官方</span><strong>OpenAI · Google AI · DeepMind</strong><p>先看產品與研究團隊自己發布的內容。</p></div>
          <div><span>繁中</span><strong>iThome · 科技新報 · Google 台灣</strong><p>優先補進台灣讀者能直接理解的科技與 AI 消息。</p></div>
          <div><span>社群</span><strong>Bluesky 公開動態</strong><p>免金鑰讀取公開作者貼文，保留作者、時間與原文連結。</p></div>
          <div><span>訂閱</span><strong>YouTube 每日新片</strong><p>接收 Claude Code 的既有推播，只列新片，不產生摘要。</p></div>
        </div>
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark">A+</span><span>AI 教育雷達</span></div>
        <p>AI 摘要可能出錯。教學、採購與資安決策前，請回到原始來源確認。</p>
        <span>為台灣校園設計 · 2026</span>
      </footer>
    </main>
  );
}
