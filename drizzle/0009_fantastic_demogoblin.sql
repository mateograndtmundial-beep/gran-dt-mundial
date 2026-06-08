CREATE INDEX "erp_player" ON "entry_round_players" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "matches_home_country" ON "matches" USING btree ("home_country_id");--> statement-breakpoint
CREATE INDEX "matches_away_country" ON "matches" USING btree ("away_country_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pin_tx_order_purchase_unique" ON "pin_transactions" USING btree ("order_id") WHERE "pin_transactions"."reason" = 'purchase';--> statement-breakpoint
CREATE INDEX "players_country" ON "players" USING btree ("country_id");