CREATE TABLE `bid_analysis_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agency` varchar(255),
	`itemName` text,
	`baseAmount` decimal(18,2) NOT NULL,
	`sampleSize` int NOT NULL,
	`medianRate` decimal(8,4) NOT NULL,
	`lowRate` decimal(8,4) NOT NULL,
	`highRate` decimal(8,4) NOT NULL,
	`expectedBid` decimal(18,2) NOT NULL,
	`minBid` decimal(18,2) NOT NULL,
	`maxBid` decimal(18,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bid_analysis_history_id` PRIMARY KEY(`id`)
);
