CREATE TABLE `training_phases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`training_plan_id` integer NOT NULL,
	`phase_type` text NOT NULL,
	`order_index` integer NOT NULL,
	`duration_weeks` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`description` text NOT NULL,
	`limitation_notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`training_plan_id`) REFERENCES `training_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `training_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`sport` text DEFAULT 'climbing' NOT NULL,
	`periodization_model` text NOT NULL,
	`player_level` text NOT NULL,
	`years_experience` integer NOT NULL,
	`sport_profile` text DEFAULT '{}' NOT NULL,
	`start_date` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `training_plans_goal_id_unique` ON `training_plans` (`goal_id`);