CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'failed', 'expired', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('mercadopago', 'dlocal');--> statement-breakpoint
CREATE TYPE "public"."pin_reason" AS ENUM('purchase', 'transfer', 'refund', 'grant');--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"pins" integer NOT NULL,
	"amount" double precision NOT NULL,
	"currency" text NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_ref" text,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pin_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"delta" integer NOT NULL,
	"reason" "pin_reason" NOT NULL,
	"order_id" integer,
	"round_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"pins" integer NOT NULL,
	"price_ars" integer,
	"price_usd" double precision,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "entry_rounds" ADD COLUMN "pins_spent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "entry_rounds" ADD COLUMN "changes_made" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pin_transactions" ADD CONSTRAINT "pin_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pin_transactions" ADD CONSTRAINT "pin_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pin_transactions" ADD CONSTRAINT "pin_transactions_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_provider_ref" ON "orders" USING btree ("provider","provider_ref");--> statement-breakpoint
CREATE INDEX "pin_tx_user" ON "pin_transactions" USING btree ("user_id");