CREATE TYPE "public"."learning_path_status" AS ENUM('generating', 'ready', 'error');
CREATE TYPE "public"."lesson_node_type" AS ENUM('text', 'chart', 'image', 'quiz', 'flashcard', 'summary');

CREATE TABLE "learning_paths" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"total_nodes" integer DEFAULT 0 NOT NULL,
	"status" "learning_path_status" DEFAULT 'generating' NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"error_message" text,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "learning_paths_document_user_unique" ON "learning_paths" ("document_id","user_id");

ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE TABLE "lesson_nodes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"learning_path_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"node_type" "lesson_node_type" NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "lesson_nodes" ADD CONSTRAINT "lesson_nodes_learning_path_id_learning_paths_id_fk" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "lesson_nodes_path_order_idx" ON "lesson_nodes" ("learning_path_id","order_index");

CREATE TABLE "learning_progress" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"learning_path_id" uuid NOT NULL,
	"current_node_index" integer DEFAULT 0 NOT NULL,
	"completed_node_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"streak_count" integer DEFAULT 0 NOT NULL,
	"last_activity_at" timestamptz
);

CREATE UNIQUE INDEX "learning_progress_user_path_unique" ON "learning_progress" ("user_id","learning_path_id");

ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_learning_path_id_learning_paths_id_fk" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON DELETE cascade ON UPDATE no action;
