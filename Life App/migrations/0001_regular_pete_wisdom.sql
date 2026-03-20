CREATE TABLE `goal_tallies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`date` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scheduler_blackout_dates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`label` text,
	`is_recurring` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `goals` ADD `target_unit` text;--> statement-breakpoint
ALTER TABLE `goals` ADD `horizon` text;--> statement-breakpoint
ALTER TABLE `goals` ADD `parent_goal_id` integer REFERENCES goals(id);--> statement-breakpoint
ALTER TABLE `goals` ADD `month` text;--> statement-breakpoint
ALTER TABLE `scheduler_settings` ADD `enforce_weekly_spread` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduler_settings` ADD `max_activities_per_day` integer DEFAULT 4 NOT NULL;