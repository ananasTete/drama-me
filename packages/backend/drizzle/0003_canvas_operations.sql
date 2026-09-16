CREATE TABLE `__canvas_graph_backup` AS
SELECT `id`, `nodes`, `edges` FROM `canvas`;--> statement-breakpoint
CREATE TABLE `__new_canvas` (
	`id` text PRIMARY KEY NOT NULL,
	`ownerId` text NOT NULL,
	`name` text NOT NULL,
	`viewport` text DEFAULT '{"x":0,"y":0,"zoom":1}' NOT NULL,
	`snapToGrid` integer DEFAULT false NOT NULL,
	`schemaVersion` integer DEFAULT 2 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`ownerId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	-- 不带临时表名前缀：SQLite 重命名表时不会同步改写 CHECK 中的限定名。
	CONSTRAINT "canvas_schema_version_positive" CHECK("schemaVersion" >= 1),
	CONSTRAINT "canvas_revision_positive" CHECK("revision" >= 1)
);--> statement-breakpoint
INSERT INTO `__new_canvas`(
	"id", "ownerId", "name", "viewport", "snapToGrid", "schemaVersion", "revision", "createdAt", "updatedAt"
)
SELECT
	"id", "ownerId", "name", "viewport", "snapToGrid", 2, "revision", "createdAt", "updatedAt"
FROM `canvas`;--> statement-breakpoint
DROP TABLE `canvas`;--> statement-breakpoint
ALTER TABLE `__new_canvas` RENAME TO `canvas`;--> statement-breakpoint
CREATE INDEX `canvas_ownerId_updatedAt_idx` ON `canvas` (`ownerId`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `canvasNode` (
	`id` text PRIMARY KEY NOT NULL,
	`canvasId` text NOT NULL,
	`type` text NOT NULL,
	`positionX` real NOT NULL,
	`positionY` real NOT NULL,
	`width` real NOT NULL,
	`height` real NOT NULL,
	`zIndex` integer NOT NULL,
	`locked` integer NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`canvasId`) REFERENCES `canvas`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "canvasNode_type_valid" CHECK("canvasNode"."type" IN ('text', 'image', 'video')),
	CONSTRAINT "canvasNode_width_positive" CHECK("canvasNode"."width" > 0),
	CONSTRAINT "canvasNode_height_positive" CHECK("canvasNode"."height" > 0)
);--> statement-breakpoint
CREATE INDEX `canvasNode_canvasId_idx` ON `canvasNode` (`canvasId`);--> statement-breakpoint
CREATE UNIQUE INDEX `canvasNode_canvasId_id_unique` ON `canvasNode` (`canvasId`,`id`);--> statement-breakpoint
CREATE TABLE `canvasEdge` (
	`id` text PRIMARY KEY NOT NULL,
	`canvasId` text NOT NULL,
	`sourceNodeId` text NOT NULL,
	`targetNodeId` text NOT NULL,
	`sourceHandle` text NOT NULL,
	`targetHandle` text NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`canvasId`) REFERENCES `canvas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`canvasId`,`sourceNodeId`) REFERENCES `canvasNode`(`canvasId`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`canvasId`,`targetNodeId`) REFERENCES `canvasNode`(`canvasId`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "canvasEdge_sourceHandle_valid" CHECK("canvasEdge"."sourceHandle" IN ('left', 'right')),
	CONSTRAINT "canvasEdge_targetHandle_valid" CHECK("canvasEdge"."targetHandle" IN ('left', 'right')),
	CONSTRAINT "canvasEdge_type_valid" CHECK("canvasEdge"."type" = 'default')
);--> statement-breakpoint
CREATE INDEX `canvasEdge_canvasId_idx` ON `canvasEdge` (`canvasId`);--> statement-breakpoint
CREATE TABLE `canvasMutation` (
	`mutationId` text PRIMARY KEY NOT NULL,
	`canvasId` text NOT NULL,
	`requestHash` text NOT NULL,
	`baseRevision` integer NOT NULL,
	`resultingRevision` integer NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`canvasId`) REFERENCES `canvas`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "canvasMutation_baseRevision_positive" CHECK("canvasMutation"."baseRevision" >= 1),
	CONSTRAINT "canvasMutation_resultingRevision_positive" CHECK("canvasMutation"."resultingRevision" >= 1)
);--> statement-breakpoint
CREATE INDEX `canvasMutation_canvasId_idx` ON `canvasMutation` (`canvasId`);--> statement-breakpoint
INSERT INTO `canvasNode` (
	`id`, `canvasId`, `type`, `positionX`, `positionY`, `width`, `height`, `zIndex`, `locked`, `data`
)
SELECT
	json_extract(node.value, '$.id'),
	backup.id,
	json_extract(node.value, '$.type'),
	json_extract(node.value, '$.position.x'),
	json_extract(node.value, '$.position.y'),
	json_extract(node.value, '$.width'),
	json_extract(node.value, '$.height'),
	json_extract(node.value, '$.zIndex'),
	json_extract(node.value, '$.locked'),
	json_extract(node.value, '$.data')
FROM `__canvas_graph_backup` AS backup, json_each(backup.nodes) AS node;--> statement-breakpoint
INSERT INTO `canvasEdge` (
	`id`, `canvasId`, `sourceNodeId`, `targetNodeId`, `sourceHandle`, `targetHandle`, `type`
)
SELECT
	json_extract(edge.value, '$.id'),
	backup.id,
	json_extract(edge.value, '$.source'),
	json_extract(edge.value, '$.target'),
	json_extract(edge.value, '$.sourceHandle'),
	json_extract(edge.value, '$.targetHandle'),
	json_extract(edge.value, '$.type')
FROM `__canvas_graph_backup` AS backup, json_each(backup.edges) AS edge;--> statement-breakpoint
DROP TABLE `__canvas_graph_backup`;
