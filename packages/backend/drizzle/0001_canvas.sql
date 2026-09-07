CREATE TABLE `canvas` (
	`id` text PRIMARY KEY NOT NULL,
	`ownerId` text NOT NULL,
	`name` text NOT NULL,
	`viewport` text DEFAULT '{"x":0,"y":0,"zoom":1}' NOT NULL,
	`nodes` text DEFAULT '[]' NOT NULL,
	`edges` text DEFAULT '[]' NOT NULL,
	`schemaVersion` integer DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`ownerId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "canvas_schema_version_positive" CHECK("canvas"."schemaVersion" >= 1),
	CONSTRAINT "canvas_revision_positive" CHECK("canvas"."revision" >= 1)
);
--> statement-breakpoint
CREATE INDEX `canvas_ownerId_updatedAt_idx` ON `canvas` (`ownerId`,`updatedAt`);