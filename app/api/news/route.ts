import { getLatestNews } from "../../../lib/news";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getLatestNews();
  return Response.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
