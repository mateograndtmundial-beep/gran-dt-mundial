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
import { sql } from 'drizzle-orm';

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

export const players = pgTable(
  'players',
  {
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
  },
  // getPlayersWithCountry / getCountryFixtures: join+group por país en cada carga de /jugadores.
  (t) => [index('players_country').on(t.countryId)],
);

export const rounds = pgTable('rounds', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: roundTypeEnum('type').notNull(),
  order: integer('sort_order').notNull(),
  deadline: timestamp('deadline', { withTimezone: true }),
  startDate: timestamp('start_date', { withTimezone: true }),
  status: roundStatusEnum('status').notNull().default('open'),
});

export const matches = pgTable(
  'matches',
  {
    id: serial('id').primaryKey(),
    roundId: integer('round_id').references(() => rounds.id).notNull(),
    homeCountryId: integer('home_country_id').references(() => countries.id),
    awayCountryId: integer('away_country_id').references(() => countries.id),
    kickoff: timestamp('kickoff', { withTimezone: true }),
    venue: text('venue'),
    homeScore: integer('home_score'),
    awayScore: integer('away_score'),
    // Resultado de la tanda de penales (solo eliminatorias definidas por penales).
    // Null si no hubo tanda. Define el ganador cuando homeScore === awayScore.
    homePenalties: integer('home_penalties'),
    awayPenalties: integer('away_penalties'),
    status: matchStatusEnum('status').notNull().default('scheduled'),
    motmPlayerId: integer('motm_player_id'),
    apiFootballFixtureId: integer('api_football_fixture_id').unique(),
    // Story de resumen ya generada y posteada a Slack para este partido (idempotencia
    // del generador de stories). Null = todavía no se posteó.
    recapPostedAt: timestamp('recap_posted_at', { withTimezone: true }),
  },
  (t) => [
    index('matches_round').on(t.roundId),
    // getCountryFixtures / publishRound: filtran y joinean por selección local/visitante.
    index('matches_home_country').on(t.homeCountryId),
    index('matches_away_country').on(t.awayCountryId),
  ],
);

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
    // El admin editó esta fila a mano: el sync (incl. el cron) no la pisa.
    manualEdit: boolean('manual_edit').notNull().default(false),
    // Arrancó desde el banco (games.substitute de API-Football). Usado para
    // separar titulares/suplentes en el carrusel de puntajes por grupo.
    substitute: boolean('substitute').notNull().default(false),
  },
  (t) => [
    uniqueIndex('pms_player_match').on(t.playerId, t.matchId),
    index('pms_match').on(t.matchId), // publishRound: inArray(matchId, ...)
  ],
);

export const playerRoundPoints = pgTable(
  'player_round_points',
  {
    id: serial('id').primaryKey(),
    playerId: integer('player_id').references(() => players.id).notNull(),
    roundId: integer('round_id').references(() => rounds.id).notNull(),
    points: doublePrecision('points').notNull().default(0),
  },
  (t) => [
    uniqueIndex('prp_player_round').on(t.playerId, t.roundId),
    index('prp_round').on(t.roundId),
  ],
);

// Carrusel de "puntajes" (portada + tabla por equipo + leyenda) ya posteado a
// #SOCIAL para una unidad de una fecha. `bucket` = "group:A" (un carrusel por
// grupo en fase de grupos) | "match:123" (un carrusel por partido en eliminatorias).
// Idempotencia: si ya existe la fila (roundId, bucket), no se re-postea.
export const scoreboardPosts = pgTable(
  'scoreboard_posts',
  {
    id: serial('id').primaryKey(),
    roundId: integer('round_id').references(() => rounds.id).notNull(),
    bucket: text('bucket').notNull(),
    postedAt: timestamp('posted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('sbp_round_bucket').on(t.roundId, t.bucket)],
);

// ---------- Datos del juego (usuarios) ----------
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    clerkId: text('clerk_id').notNull().unique(),
    // El nickname elige el usuario en /bienvenida. Es null hasta que lo setea
    // (ese null dispara el onboarding). Único de forma case-insensitive: el
    // índice de abajo es sobre lower(username), así "Bruno" y "bruno" chocan.
    // Postgres permite múltiples NULL en un índice único, así que varios
    // usuarios pueden estar pendientes de onboarding a la vez.
    username: text('username'),
    isAdmin: boolean('is_admin').notNull().default(false),
    isPremium: boolean('is_premium').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_username_lower_unique').on(sql`lower(${t.username})`)],
);

export const entries = pgTable(
  'entries',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull().unique(),
    name: text('name').notNull(),
    totalPoints: doublePrecision('total_points').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // Ranking global: ORDER BY total_points DESC (Postgres escanea el índice en reversa).
  (t) => [index('entries_total_points').on(t.totalPoints)],
);

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
  (t) => [
    uniqueIndex('er_entry_round').on(t.entryId, t.roundId),
    index('er_round').on(t.roundId), // publishRound: where(roundId = X)
  ],
);

export const entryRoundPlayers = pgTable(
  'entry_round_players',
  {
    id: serial('id').primaryKey(),
    entryRoundId: integer('entry_round_id').references(() => entryRounds.id).notNull(),
    playerId: integer('player_id').references(() => players.id).notNull(),
    isStarter: boolean('is_starter').notNull().default(true),
    slot: text('slot'),
  },
  (t) => [
    index('erp_entry_round').on(t.entryRoundId),
    // publishRound / getLineupPlayers: cruzan roster contra stats por playerId.
    index('erp_player').on(t.playerId),
  ],
);

export const leagues = pgTable('leagues', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  ownerId: integer('owner_id').references(() => users.id).notNull(),
  isPublic: boolean('is_public').notNull().default(false),
  // Instancia desde la que la liga contabiliza puntos en SU ranking (no afecta el
  // total global). null = desde el inicio (Fecha 1, cuenta todo). El dueño la elige
  // y puede cambiarla en cualquier momento (ver setLeagueScoringStart).
  scoringStartRoundId: integer('scoring_start_round_id').references(() => rounds.id),
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
  (t) => [uniqueIndex('lm_league_user').on(t.leagueId, t.userId)],
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
  // Pack "ilimitado": no acredita pines, marca al usuario como premium (ver lib/payments/credit.ts)
  unlimited: boolean('unlimited').notNull().default(false),
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
  (t) => [index('orders_provider_ref').on(t.provider, t.providerRef)],
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
  (t) => [
    index('pin_tx_user').on(t.userId),
    // Blindaje a nivel DB contra doble acreditación: como mucho un movimiento
    // "purchase" por orden, sin importar cuántas veces llegue/reintente el
    // webhook del proveedor o si dos requests corren en paralelo. creditOrder
    // ya es idempotente por el UPDATE atómico de `orders`, pero esto cierra
    // el hueco si esa guarda fallara o si algo inserta por otro camino.
    uniqueIndex('pin_tx_order_purchase_unique')
      .on(t.orderId)
      .where(sql`${t.reason} = 'purchase'`),
  ],
);
