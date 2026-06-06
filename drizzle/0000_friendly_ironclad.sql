CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'live', 'finished');--> statement-breakpoint
CREATE TYPE "public"."position" AS ENUM('GK', 'DEF', 'MID', 'FWD');--> statement-breakpoint
CREATE TYPE "public"."round_status" AS ENUM('open', 'locked', 'published');--> statement-breakpoint
CREATE TYPE "public"."round_type" AS ENUM('group', 'knockout');--> statement-breakpoint
CREATE TABLE "coaches" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_id" integer NOT NULL,
	"name" text NOT NULL,
	"photo_url" text,
	"price" integer DEFAULT 0 NOT NULL,
	"api_football_id" integer,
	CONSTRAINT "coaches_api_football_id_unique" UNIQUE("api_football_id")
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"flag_url" text,
	"group_letter" text,
	"confederation" text,
	"eliminated_round" integer,
	"api_football_id" integer,
	CONSTRAINT "countries_api_football_id_unique" UNIQUE("api_football_id")
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"total_points" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entries_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "entry_round_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_round_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"is_starter" boolean DEFAULT true NOT NULL,
	"slot" text
);
--> statement-breakpoint
CREATE TABLE "entry_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"round_id" integer NOT NULL,
	"formation" text DEFAULT '4-4-2' NOT NULL,
	"captain_player_id" integer,
	"coach_id" integer,
	"budget_used" integer DEFAULT 0 NOT NULL,
	"points" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_rank" integer
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"owner_id" integer NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leagues_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"home_country_id" integer,
	"away_country_id" integer,
	"kickoff" timestamp with time zone,
	"venue" text,
	"home_score" integer,
	"away_score" integer,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	"motm_player_id" integer,
	"api_football_fixture_id" integer,
	CONSTRAINT "matches_api_football_fixture_id_unique" UNIQUE("api_football_fixture_id")
);
--> statement-breakpoint
CREATE TABLE "player_match_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"match_id" integer NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	"goals" integer DEFAULT 0 NOT NULL,
	"penalty_goals" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"yellow" integer DEFAULT 0 NOT NULL,
	"red" integer DEFAULT 0 NOT NULL,
	"own_goals" integer DEFAULT 0 NOT NULL,
	"penalties_saved" integer DEFAULT 0 NOT NULL,
	"penalties_missed" integer DEFAULT 0 NOT NULL,
	"goals_conceded" integer DEFAULT 0 NOT NULL,
	"clean_sheet" boolean DEFAULT false NOT NULL,
	"rating" double precision,
	"is_motm" boolean DEFAULT false NOT NULL,
	"fantasy_points" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_round_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"round_id" integer NOT NULL,
	"points" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_id" integer NOT NULL,
	"name" text NOT NULL,
	"position" "position" NOT NULL,
	"price" integer DEFAULT 5 NOT NULL,
	"photo_url" text,
	"club" text,
	"jersey_number" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"api_football_id" integer,
	CONSTRAINT "players_api_football_id_unique" UNIQUE("api_football_id")
);
--> statement-breakpoint
CREATE TABLE "point_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"round_id" integer NOT NULL,
	"player_id" integer,
	"points" double precision DEFAULT 0 NOT NULL,
	"breakdown" jsonb
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "round_type" NOT NULL,
	"sort_order" integer NOT NULL,
	"deadline" timestamp with time zone,
	"start_date" timestamp with time zone,
	"status" "round_status" DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"username" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_round_players" ADD CONSTRAINT "entry_round_players_entry_round_id_entry_rounds_id_fk" FOREIGN KEY ("entry_round_id") REFERENCES "public"."entry_rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_round_players" ADD CONSTRAINT "entry_round_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_rounds" ADD CONSTRAINT "entry_rounds_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_rounds" ADD CONSTRAINT "entry_rounds_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_rounds" ADD CONSTRAINT "entry_rounds_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_country_id_countries_id_fk" FOREIGN KEY ("home_country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_country_id_countries_id_fk" FOREIGN KEY ("away_country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_round_points" ADD CONSTRAINT "player_round_points_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_round_points" ADD CONSTRAINT "player_round_points_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "er_entry_round" ON "entry_rounds" USING btree ("entry_id","round_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lm_league_user" ON "league_members" USING btree ("league_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pms_player_match" ON "player_match_stats" USING btree ("player_id","match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prp_player_round" ON "player_round_points" USING btree ("player_id","round_id");