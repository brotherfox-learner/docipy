import { pgTable, uuid, integer, timestamp, varchar, pgEnum } from 'drizzle-orm/pg-core';
import { users, planEnum } from './users';

export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'canceled', 'past_due']);

export const usageLimits = pgTable('usage_limits', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).primaryKey(),
  aiQueriesToday: integer('ai_queries_today').default(0).notNull(),
  flashcardsGenerated: integer('flashcards_generated').default(0).notNull(),
  quizGenerated: integer('quiz_generated').default(0).notNull(),
  documentsCount: integer('documents_count').default(0).notNull(),
  resetAt: timestamp('reset_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  plan: planEnum('plan').default('free').notNull(),
  status: subscriptionStatusEnum('status').default('active').notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
