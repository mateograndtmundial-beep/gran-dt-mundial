ALTER TABLE "leagues" ADD COLUMN "kind" text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "status" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "entry_fee_ars" integer;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "prize_ars" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "entry_league_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_entry_league_id_leagues_id_fk" FOREIGN KEY ("entry_league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;