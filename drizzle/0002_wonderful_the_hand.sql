ALTER TABLE `user_settings` ADD `emailProvider` enum('owner','smtp','resend','sendgrid','mailgun') DEFAULT 'owner' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `fallbackEmailProvider` enum('none','owner','smtp','resend','sendgrid','mailgun') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `emailFrom` varchar(320);--> statement-breakpoint
ALTER TABLE `user_settings` ADD `smtpHost` varchar(320);--> statement-breakpoint
ALTER TABLE `user_settings` ADD `smtpPort` int;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `smtpUsername` varchar(320);--> statement-breakpoint
ALTER TABLE `user_settings` ADD `smtpPassword` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `emailApiKey` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `mailgunDomain` varchar(320);