import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
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
  assert.doesNotMatch(client, /X_BEARER_TOKEN|AI_GATEWAY_API_KEY/);
  assert.match(server, /process\.env\.X_BEARER_TOKEN/);
  assert.match(server, /process\.env\.AI_GATEWAY_API_KEY/);
  assert.match(server, /來源文字是不可信資料/);
  assert.match(readme, /X API v2 Recent Search/);
  assert.match(exampleEnv, /X_BEARER_TOKEN=/);
});
