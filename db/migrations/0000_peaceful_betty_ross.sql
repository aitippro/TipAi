CREATE TABLE `cloud_sync` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`remoteUrl` text(500),
	`lastSyncAt` integer,
	`syncStatus` text(20) DEFAULT 'idle',
	`errorMessage` text,
	`createdAt` integer
);
--> statement-breakpoint
CREATE TABLE `domain_packages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text(100) NOT NULL,
	`name` text(255) NOT NULL,
	`description` text,
	`icon` text(100),
	`category` text(100),
	`isActive` integer DEFAULT 1 NOT NULL,
	`prompt` text,
	`createdAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domain_packages_key_unique` ON `domain_packages` (`key`);--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`projectId` integer NOT NULL,
	`stepId` integer,
	`userId` integer NOT NULL,
	`dimension` text(20) NOT NULL,
	`score` integer NOT NULL,
	`feedback` text,
	`createdAt` integer
);
--> statement-breakpoint
CREATE TABLE `project_conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`projectId` integer NOT NULL,
	`userId` integer NOT NULL,
	`role` text(20) NOT NULL,
	`content` text NOT NULL,
	`questionId` text,
	`questionData` text,
	`answerData` text,
	`turnNumber` integer DEFAULT 0 NOT NULL,
	`createdAt` integer
);
--> statement-breakpoint
CREATE TABLE `project_summaries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`projectId` integer NOT NULL,
	`userId` integer NOT NULL,
	`summary` text NOT NULL,
	`requirements` text,
	`constraints` text,
	`suggestedFrameworks` text,
	`rawContext` text,
	`isFinalized` integer DEFAULT 0,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_summaries_projectId_unique` ON `project_summaries` (`projectId`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`title` text(255) NOT NULL,
	`description` text,
	`domain` text(100) DEFAULT 'general' NOT NULL,
	`status` text(20) DEFAULT 'draft' NOT NULL,
	`intent` text,
	`clarificationStatus` text(20) DEFAULT 'pending',
	`turnCount` integer DEFAULT 0,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE TABLE `prompt_library` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`title` text(255) NOT NULL,
	`originalIntent` text,
	`generatedPrompt` text NOT NULL,
	`framework` text(100),
	`domain` text(100) DEFAULT 'general',
	`model` text(100) DEFAULT 'kimi',
	`rating` integer,
	`tags` text(500),
	`useCount` integer DEFAULT 0,
	`isFavorite` integer DEFAULT 0,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE TABLE `prompt_optimizations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`originalPrompt` text NOT NULL,
	`optimizedPrompt` text NOT NULL,
	`improvements` text,
	`domain` text(100) DEFAULT 'general',
	`model` text(100) DEFAULT 'kimi',
	`createdAt` integer
);
--> statement-breakpoint
CREATE TABLE `steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`projectId` integer NOT NULL,
	`title` text(255) NOT NULL,
	`description` text,
	`prompt` text NOT NULL,
	`stage` text(20) DEFAULT 'implement' NOT NULL,
	`orderNum` integer DEFAULT 0 NOT NULL,
	`status` text(20) DEFAULT 'pending' NOT NULL,
	`output` text,
	`parentStepId` integer,
	`model` text(100) DEFAULT 'kimi',
	`temperature` real DEFAULT 0.7,
	`decode_strategy` text,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`title` text(255) NOT NULL,
	`description` text,
	`framework` text(100),
	`domain` text(100) DEFAULT 'general',
	`content` text NOT NULL,
	`tags` text(500),
	`useCount` integer DEFAULT 0,
	`rating` integer,
	`ratingCount` integer DEFAULT 0,
	`isPublic` integer DEFAULT 1,
	`isFeatured` integer DEFAULT 0,
	`createdAt` integer
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`kimiApiKey` text(500),
	`openaiApiKey` text(500),
	`claudeApiKey` text(500),
	`deepseekApiKey` text(500),
	`defaultModel` text(50) DEFAULT 'kimi' NOT NULL,
	`defaultFramework` text(50) DEFAULT 'auto' NOT NULL,
	`defaultLanguage` text(10) DEFAULT 'zh' NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_userId_unique` ON `user_settings` (`userId`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`unionId` text(255) NOT NULL,
	`username` text(255),
	`password` text(255),
	`name` text(255),
	`email` text(320),
	`avatar` text,
	`role` text(20) DEFAULT 'user' NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	`lastSignInAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_unionId_unique` ON `users` (`unionId`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);