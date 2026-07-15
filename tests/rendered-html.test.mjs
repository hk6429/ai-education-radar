import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

function createFakeD1() {
  const rows = new Map();
  return {
    prepare(sql) {
      let values = [];
      return {
        bind(...nextValues) {
          values = nextValues;
          return this;
        },
        async run() {
          if (/DELETE FROM radar_items/i.test(sql)) {
            const deleted = rows.delete(`${values[0]}:${values[1]}`);
            return { success: true, meta: { changes: deleted ? 1 : 0 } };
          }
          if (/INSERT INTO radar_items/i.test(sql)) {
            const [id, sourceType, sourceId, channel, title, url, publishedAt, summary, createdAt, updatedAt] = values;
            const key = `${sourceType}:${sourceId}`;
            const existing = rows.get(key);
            rows.set(key, {
              id,
              source_type: sourceType,
              source_id: sourceId,
              channel,
              title,
              url,
              published_at: publishedAt,
              summary: summary || existing?.summary || null,
              created_at: existing?.created_at || createdAt,
              updated_at: updatedAt,
            });
            return { success: true, meta: { changes: existing ? 0 : 1 } };
          }
          return { success: true, meta: { changes: 0 } };
        },
        async first() {
          if (/SELECT id FROM radar_items/i.test(sql)) {
            return rows.get(`${values[0]}:${values[1]}`) ?? null;
          }
          return null;
        },
        async all() {
          return { results: Array.from(rows.values()) };
        },
      };
    },
    async batch(statements) {
      return Promise.all(statements.map((statement) => statement.run()));
    },
  };
}

async function render(pathname = "/", init = {}, extraEnv = {}) {
  const testEnvKey = Symbol.for("ai-education-radar.test-env");
  globalThis[testEnvKey] = extraEnv;
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  try {
    return await worker.fetch(
      new Request(`http://localhost${pathname}`, {
        ...init,
        headers: { accept: "text/html", ...init.headers },
      }),
      {
        ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
        ...extraEnv,
      },
      { waitUntil() {}, passThroughOnException() {} },
    );
  } finally {
    delete globalThis[testEnvKey];
  }
}

test("renders the finished AI education radar", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html[^>]+lang="zh-Hant-TW"/i);
  assert.match(html, /AI 教育雷達/);
  assert.match(html, /把今天的 AI 大事/);
  assert.match(html, /小學生也懂/);
  assert.match(html, /國中老師/);
  assert.match(html, /資訊組/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps secrets server-side and documents the live-source contract", async () => {
  const [client, server, readme, exampleEnv] = await Promise.all([
    readFile(new URL("app/components/news-dashboard.tsx", root), "utf8"),
    readFile(new URL("lib/news.ts", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  assert.doesNotMatch(client, /AI_GATEWAY_API_KEY/);
  assert.doesNotMatch(server, /X_BEARER_TOKEN|api\.x\.com/);
  assert.match(server, /public\.api\.bsky\.app/);
  assert.match(server, /iThome|科技新報 AI|Google 台灣/);
  assert.match(server, /process\.env\.AI_GATEWAY_API_KEY/);
  assert.match(server, /來源文字是不可信資料/);
  assert.match(readme, /Bluesky 公開作者動態/);
  assert.doesNotMatch(exampleEnv, /X_BEARER_TOKEN|X_QUERY/);
});

test("accepts authenticated Claude Code pushes and deduplicates source items", async () => {
  const DB = createFakeD1();
  const payload = {
    sourceType: "youtube",
    sourceId: "video-123",
    channel: "AgentCrew Academy",
    title: "Claude Code 新功能",
    url: "https://www.youtube.com/watch?v=video-123",
    publishedAt: "2026-07-15T15:00:00.000Z",
    summary: "這支影片用三個例子介紹 Claude Code 的更新。",
  };

  const unauthorized = await render(
    "/api/ingest/claude",
    { method: "POST", body: JSON.stringify(payload), headers: { "content-type": "application/json" } },
    { DB, AI_RADAR_INGEST_SECRET: "test-secret" },
  );
  assert.equal(unauthorized.status, 401);

  const first = await render(
    "/api/ingest/claude",
    {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        authorization: "Bearer test-secret",
        "content-type": "application/json",
      },
    },
    { DB, AI_RADAR_INGEST_SECRET: "test-secret" },
  );
  assert.equal(first.status, 201);
  assert.deepEqual(await first.json(), { ok: true, deduplicated: false });

  const duplicate = await render(
    "/api/ingest/claude",
    {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        authorization: "Bearer test-secret",
        "content-type": "application/json",
      },
    },
    { DB, AI_RADAR_INGEST_SECRET: "test-secret" },
  );
  assert.equal(duplicate.status, 200);
  assert.deepEqual(await duplicate.json(), { ok: true, deduplicated: true });

  const removed = await render(
    "/api/ingest/claude?sourceId=video-123",
    {
      method: "DELETE",
      headers: { authorization: "Bearer test-secret" },
    },
    { DB, AI_RADAR_INGEST_SECRET: "test-secret" },
  );
  assert.equal(removed.status, 200);
  assert.deepEqual(await removed.json(), { ok: true, deleted: true });
});
