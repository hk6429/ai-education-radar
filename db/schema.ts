import { sql } from "drizzle-orm";
import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const radarItems = sqliteTable(
  "radar_items",
  {
    id: text("id").primaryKey(),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    channel: text("channel").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    publishedAt: text("published_at").notNull(),
    summary: text("summary"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("radar_items_source_unique").on(
      table.sourceType,
      table.sourceId,
    ),
  ],
);
