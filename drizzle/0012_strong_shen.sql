CREATE TABLE "scoreboard_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"bucket" text NOT NULL,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD COLUMN "substitute" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scoreboard_posts" ADD CONSTRAINT "scoreboard_posts_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sbp_round_bucket" ON "scoreboard_posts" USING btree ("round_id","bucket");