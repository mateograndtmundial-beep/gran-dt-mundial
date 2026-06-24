CREATE TABLE "lineup_change_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"round_id" integer NOT NULL,
	"entry_round_id" integer NOT NULL,
	"players_in" jsonb NOT NULL,
	"players_out" jsonb NOT NULL,
	"formation" text NOT NULL,
	"captain_player_id" integer,
	"coach_id" integer,
	"pins_delta" integer DEFAULT 0 NOT NULL,
	"changes_in_save" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lineup_change_log" ADD CONSTRAINT "lineup_change_log_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineup_change_log" ADD CONSTRAINT "lineup_change_log_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineup_change_log" ADD CONSTRAINT "lineup_change_log_entry_round_id_entry_rounds_id_fk" FOREIGN KEY ("entry_round_id") REFERENCES "public"."entry_rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lcl_entry_round" ON "lineup_change_log" USING btree ("entry_id","round_id","created_at");