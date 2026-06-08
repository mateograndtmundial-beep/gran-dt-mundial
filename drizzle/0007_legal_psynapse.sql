ALTER TABLE "matches" ADD COLUMN "home_penalties" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "away_penalties" integer;--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD COLUMN "manual_edit" boolean DEFAULT false NOT NULL;