ALTER TABLE `user_settings` ADD `lastCollectionDays` int DEFAULT 90 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `serviceCollectionDefaultsJson` text;