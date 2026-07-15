CREATE TABLE `radar_items` (
	`id` text PRIMARY KEY NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`channel` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`published_at` text NOT NULL,
	`summary` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `radar_items_source_unique` ON `radar_items` (`source_type`,`source_id`);