CREATE INDEX "entries_total_points" ON "entries" USING btree ("total_points");--> statement-breakpoint
CREATE INDEX "erp_entry_round" ON "entry_round_players" USING btree ("entry_round_id");--> statement-breakpoint
CREATE INDEX "er_round" ON "entry_rounds" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "matches_round" ON "matches" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "pms_match" ON "player_match_stats" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "prp_round" ON "player_round_points" USING btree ("round_id");