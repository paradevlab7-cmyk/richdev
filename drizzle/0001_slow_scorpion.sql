CREATE TABLE `collection_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceType` varchar(32) NOT NULL,
	`status` enum('running','success','failed') NOT NULL,
	`fetchedCount` int NOT NULL DEFAULT 0,
	`matchedCount` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	CONSTRAINT `collection_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_keywords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`keyword` varchar(255) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitoring_keywords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notice_keywords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`noticeId` int NOT NULL,
	`keywordId` int NOT NULL,
	`matchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notice_keywords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceType` enum('bid','spec','award','contract','standard') NOT NULL,
	`noticeId` varchar(128) NOT NULL,
	`title` text NOT NULL,
	`agency` varchar(255),
	`itemName` text,
	`noticeDate` timestamp,
	`deadline` timestamp,
	`awardAmount` decimal(18,2),
	`baseAmount` decimal(18,2),
	`awardRate` decimal(8,4),
	`originalUrl` text,
	`attachmentsJson` text,
	`rawJson` text,
	`sourceUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notices_id` PRIMARY KEY(`id`),
	CONSTRAINT `notices_noticeId_unique` UNIQUE(`noticeId`)
);
--> statement-breakpoint
CREATE TABLE `saved_notices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`noticeId` int NOT NULL,
	`status` enum('watching','reviewing','submitted','closed') NOT NULL DEFAULT 'watching',
	`memo` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_notices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dataServiceKey` text,
	`telegramBotToken` text,
	`telegramChatId` varchar(128),
	`notificationEmail` varchar(320),
	`emailEnabled` boolean NOT NULL DEFAULT true,
	`telegramEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_settings_userId_unique` UNIQUE(`userId`)
);
