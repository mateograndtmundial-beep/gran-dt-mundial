ALTER TABLE "coaches" ALTER COLUMN "price" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "entry_rounds" ALTER COLUMN "budget_used" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "players" ALTER COLUMN "price" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "players" ALTER COLUMN "price" SET DEFAULT 5;