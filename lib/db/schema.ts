import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  doublePrecision,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ---------- Enums ----------
export const positionEnum = pgEnum('position', ['GK', 'DEF', 'MID', 'FWD']);
export const roundTypeEnum = pgEnum('round_type', ['group', 'knockout']);
export const roundStatusEnum = pgEnum('round_status', ['open', 'locked', 'published']);
export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'finished']);

// ---------- Datos del torneo (seed) ----------
export const countries = pgTable('countries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code'),
  flagUrl: text('flag_url'),
  groupLetter: text('group_letter'),
  confederation: text('confederation'),
  eliminatedRound: integer('eliminated_round'), // order de la ronda en que quedó afuera; null = sigue vivo
  apiFootballId: integer('api_football_id').unique(),
});

export const coaches = pgTable('coaches', {
  id: serial('id').primaryKey(),
  countryId: integer('country_id').references(() => countries.id).notNull(),
  name: text('name').notNull(),
  photoUrl: text('photo_url'),
  price: doublePrecision('price').notNull().default(0),
  apiFootballId: integer('api_football_id').unique(),
});

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  countryId: integer('country_id').references(() => countries.id).notNull(),
  name: text('name').notNull(),
  position: positionEnum('position').notNull(),
  price: doublePrecision('price').notNull().default(5),
  priceManual: boolean('price_manual').notNull().default(false), // precio fijado a mano: prices:apply no lo pisa
  photoUrl: text('photo_url'),
  club: text('club'),
  birthYear: integer('birth_year'), // para desambiguar el cruce con Transfermarkt
  jerseyNumber: integer('jersey_number'),
  status: text('status').notNull().default('active'),
  apiFootballId: integer('api_football_id').unique(),
});

export const rounds = pgTable('rounds', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: roundTypeEnum('type').notNull(),
  order: integer('sort_order').notNull(),
  deadline: timestamp('deadline', { withTimezone: true }),
  startDate: timestamp('start_date', { withTimezone: true }),
  status: roundStatusEnum('status').notNull().default('open'),
});

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  roundId: integer('round_id').references(() => rounds.id).notNull(),
  homeCountryId: integer('home_country_id').references(() => countries.id),
  awayCountryId: integer('away_country_id').references(() => countries.id),
  kickoff: timestamp('kickoff', { withTimezone: true }),
  venue: text('venue'),
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),
  status: matchStatusEnum('status').notNull().default('scheduled'),
  motmPlayerId: integer('motm_player_id'),
  apiFootballFixtureId: integer('api_football_fixture_id').unique(),
});

export const playerMatchStats = pgTable(
  'player_match_stats',
  {
    id: serial('id').primaryKey(),
    playerId: integer('player_id').references(() => players.id).notNull(),
    matchId: integer('match_id').references(() => matches.id).notNull(),
    minutes: integer('minutes').notNull().default(0),
    goals: integer('goals').notNull().default(0),
    penaltyGoals: integer('penalty_goals').notNull().default(0),
    assists: integer('assists').notNull().default(0),
    yellow: integer('yellow').notNull().default(0),
    red: integer('red').notNull().default(0),
    ownGoals: integer('own_goals').notNull().default(0),
    penaltiesSaved: integer('penalties_saved').notNull().default(0),
    penaltiesMissed: integer('penalties_missed').notNull().default(0),
    goalsConceded: integer('goals_conceded').notNull().default(0),
    cleanSheet: boolean('clean_sheet').notNull().default(false),
    rating: doublePrecision('rating'),
    isMotm: boolean('is_motm').notNull().default(false),
    fantasyPoints: doublePrecision('fantasy_points').notNull().default(0),
  },
  (t) => ({ uniq: uniqueIndex('pms_player_match').on(t.playerId, t.matchId) }),
);

export const playerRoundPoints = pgTable(
  'player_round_points',
  {
    id: serial('id').primaryKey(),
    playerId: integer('player_id').references(() => players.id).notNull(),
    roundId: integer('round_id').references(() => rounds.id).notNull(),
    points: doublePrecision('points').notNull().default(0),
  },
  (t) => ({ uniq: uniqueIndex('prp_player_round').on(t.playerId, t.roundId) }),
);

// ---------- Datos del juego (usuarios) ----------
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  username: text('username'),
  isAdmin: boolean('is_admin').notNull().default(false),
  isPremium: boolean('is_premium').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const entries = pgTable('entries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  name: text('name').notNull(),
  totalPoints: doublePrecision('total_points').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const entryRounds = pgTable(
  'entry_rounds',
  {
    id: serial('id').primaryKey(),
    entryId: integer('entry_id').references(() => entries.id).notNull(),
    roundId: integer('round_id').references(() => rounds.id).notNull(),
    formation: text('formation').notNull().default('4-4-2'),
    captainPlayerId: integer('captain_player_id'),
    coachId: integer('coach_id').references(() => coaches.id),
    budgetUsed: doublePrecision('budget_used').notNull().default(0),
    points: doublePrecision('points').notNull().default(0),
    pinsSpent: integer('pins_spent').notNull().default(0),
    changesMade: integer('changes_made').notNull().default(0),
  },
  (t) => ({ uniq: uniqueIndex('er_entry_round').on(t.entryId, t.roundId) }),
);

export const entryRoundPlayers = pgTable('entry_round_players', {
  id: serial('id').primaryKey(),
  entryRoundId: integer('entry_round_id').references(() => entryRounds.id).notNull(),
  playerId: integer('player_id').references(() => players.id).notNull(),
  isStarter: boolean('is_starter').notNull().default(true),
  slot: text('slot'),
});

export const leagues = pgTable('leagues', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  ownerId: integer('owner_id').references(() => users.id).notNull(),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const leagueMembers = pgTable(
  'league_members',
  {
    id: serial('id').primaryKey(),
    leagueId: integer('league_id').references(() => leagues.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    currentRank: integer('current_rank'),
  },
  (t) => ({ uniq: uniqueIndex('lm_league_user').on(t.leagueId, t.userId) }),
);

export const pointTransactions = pgTable('point_transactions', {
  id: serial('id').primaryKey(),
  entryId: integer('entry_id').references(() => entries.id).notNull(),
  roundId: integer('round_id').references(() => rounds.id).notNull(),
  playerId: integer('player_id'),
  points: doublePrecision('points').notNull().default(0),
  breakdown: jsonb('breakdown'),
});

// ---------- Monetización: pines (única fuente de ingresos) ----------
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'failed', 'expired', 'refunded']);
export const paymentProviderEnum = pgEnum('payment_provider', ['mercadopago', 'dlocal']);
export const pinReasonEnum = pgEnum('pin_reason', ['purchase', 'transfer', 'refund', 'grant']);

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  pins: integer('pins').notNull(),
  priceArs: integer('price_ars'), // Mercado Pago (Argentina)
  priceUsd: doublePrecision('price_usd'), // dLocal (resto de LatAm)
  active: boolean('active').notNull().default(true),
});

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    productId: integer('product_id').references(() => products.id).notNull(),
    pins: integer('pins').notNull(),
    amount: doublePrecision('amount').notNull(),
    currency: text('currency').notNull(),
    provider: paymentProviderEnum('provider').notNull(),
    providerRef: text('provider_ref'),
    status: orderStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (t) => ({ providerRefIdx: index('orders_provider_ref').on(t.provider, t.providerRef) }),
);

export const pinTransactions = pgTable(
  'pin_transactions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    delta: integer('delta').notNull(), // +comprados / -usados
    reason: pinReasonEnum('reason').notNull(),
    orderId: integer('order_id').references(() => orders.id),
    roundId: integer('round_id').references(() => rounds.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userIdx: index('pin_tx_user').on(t.userId) }),
);
