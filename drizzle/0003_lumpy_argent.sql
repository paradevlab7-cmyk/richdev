ALTER TABLE `collection_runs` ADD `totalAvailable` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `collection_runs` ADD `storedCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `collection_runs` ADD `startPage` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `collection_runs` ADD `currentPage` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `collection_runs` ADD `totalPages` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `collection_runs` ADD `queryStartAt` timestamp;--> statement-breakpoint
ALTER TABLE `collection_runs` ADD `queryEndAt` timestamp;--> statement-breakpoint
ALTER TABLE `collection_runs` ADD `isBackground` boolean DEFAULT false NOT NULL;