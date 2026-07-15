export type IngestSourceType = "youtube";

export type IngestItem = {
  sourceType: IngestSourceType;
  sourceId: string;
  channel: string;
  title: string;
  url: string;
  publishedAt: string;
  summary?: string;
};

export type StoredRadarItem = {
  id: string;
  source_type: IngestSourceType;
  source_id: string;
  channel: string;
  title: string;
  url: string;
  published_at: string;
  summary: string | null;
};

type RadarEnv = {
  DB?: D1Database;
  AI_RADAR_INGEST_SECRET?: string;
};

const TEST_ENV_KEY = Symbol.for("ai-education-radar.test-env");

export async function getRadarEnv(): Promise<RadarEnv> {
  const injected = (globalThis as Record<symbol, unknown>)[TEST_ENV_KEY];
  if (injected) return injected as RadarEnv;
  const { env } = await import("cloudflare:workers");
  return env as unknown as RadarEnv;
}

async function getDatabase(): Promise<D1Database> {
  const database = (await getRadarEnv()).DB;
  if (!database) throw new Error("D1 binding DB is not configured");
  return database;
}

async function ensureSchema(database: D1Database) {
  await database.batch([
    database.prepare(`
      CREATE TABLE IF NOT EXISTS radar_items (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        published_at TEXT NOT NULL,
        summary TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(source_type, source_id)
      )
    `),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS radar_items_published_idx ON radar_items(published_at DESC)",
    ),
  ]);
}

export async function upsertRadarItem(item: IngestItem) {
  const database = await getDatabase();
  await ensureSchema(database);
  const existing = await database
    .prepare("SELECT id FROM radar_items WHERE source_type = ? AND source_id = ?")
    .bind(item.sourceType, item.sourceId)
    .first<{ id: string }>();
  const now = new Date().toISOString();
  const id = `${item.sourceType}:${item.sourceId}`;

  await database
    .prepare(`
      INSERT INTO radar_items (
        id, source_type, source_id, channel, title, url, published_at,
        summary, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_type, source_id) DO UPDATE SET
        channel = excluded.channel,
        title = excluded.title,
        url = excluded.url,
        published_at = excluded.published_at,
        summary = CASE
          WHEN excluded.summary IS NOT NULL AND excluded.summary <> ''
          THEN excluded.summary ELSE radar_items.summary
        END,
        updated_at = excluded.updated_at
    `)
    .bind(
      id,
      item.sourceType,
      item.sourceId,
      item.channel,
      item.title,
      item.url,
      item.publishedAt,
      item.summary ?? null,
      now,
      now,
    )
    .run();

  return { deduplicated: Boolean(existing) };
}

export async function listRadarItems(limit = 30): Promise<StoredRadarItem[]> {
  const database = await getDatabase();
  await ensureSchema(database);
  const result = await database
    .prepare(`
      SELECT id, source_type, source_id, channel, title, url, published_at, summary
      FROM radar_items
      ORDER BY published_at DESC
      LIMIT ?
    `)
    .bind(limit)
    .all<StoredRadarItem>();
  return result.results;
}

export async function deleteRadarItem(
  sourceType: IngestSourceType,
  sourceId: string,
): Promise<boolean> {
  const database = await getDatabase();
  await ensureSchema(database);
  const result = await database
    .prepare("DELETE FROM radar_items WHERE source_type = ? AND source_id = ?")
    .bind(sourceType, sourceId)
    .run();
  return Number(result.meta.changes ?? 0) > 0;
}
