import {
  deleteRadarItem,
  getRadarEnv,
  type IngestItem,
  upsertRadarItem,
} from "../../../../db/radar-items";

export const dynamic = "force-dynamic";

async function isAuthorized(request: Request): Promise<boolean> {
  const secret = (await getRadarEnv()).AI_RADAR_INGEST_SECRET;
  if (!secret) return false;
  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (provided.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

export async function DELETE(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const sourceId = cleanString(new URL(request.url).searchParams.get("sourceId"), 500);
  if (!sourceId) {
    return Response.json({ ok: false, error: "invalid_source_id" }, { status: 400 });
  }
  try {
    const deleted = await deleteRadarItem("youtube", sourceId);
    return Response.json({ ok: true, deleted });
  } catch {
    return Response.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  }
}

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseItem(value: unknown): IngestItem | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const sourceType = body.sourceType;
  if (sourceType !== "youtube") return null;
  const sourceId = cleanString(body.sourceId, 500);
  const channel = cleanString(body.channel, 200);
  const title = cleanString(body.title, 500);
  const url = cleanString(body.url, 2_000);
  const publishedAt = cleanString(body.publishedAt, 100);
  const summary = cleanString(body.summary, 4_000);
  if (!sourceId || !channel || !title || !url || !publishedAt) return null;
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return null;
    if (Number.isNaN(new Date(publishedAt).getTime())) return null;
  } catch {
    return null;
  }
  return {
    sourceType,
    sourceId,
    channel,
    title,
    url,
    publishedAt: new Date(publishedAt).toISOString(),
    ...(summary ? { summary } : {}),
  };
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const item = parseItem(body);
  if (!item) {
    return Response.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }
  try {
    const result = await upsertRadarItem(item);
    return Response.json(
      { ok: true, deduplicated: result.deduplicated },
      { status: result.deduplicated ? 200 : 201 },
    );
  } catch {
    return Response.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  }
}
