import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { documents } from './documents'
import { users } from './users'

export const learningPathStatusEnum = pgEnum('learning_path_status', ['generating', 'ready', 'error'])
export const lessonNodeTypeEnum = pgEnum('lesson_node_type', ['text', 'chart', 'image', 'quiz', 'flashcard', 'summary'])

export const learningPaths = pgTable(
  'learning_paths',
  {
    id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
    documentId: uuid('document_id')
      .references(() => documents.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description').default('').notNull(),
    totalNodes: integer('total_nodes').default(0).notNull(),
    status: learningPathStatusEnum('status').default('generating').notNull(),
    language: varchar('language', { length: 10 }).default('en').notNull(),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => ({
    documentUserUnique: uniqueIndex('learning_paths_document_user_unique').on(table.documentId, table.userId),
  })
)

export const lessonNodes = pgTable(
  'lesson_nodes',
  {
    id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
    learningPathId: uuid('learning_path_id')
      .references(() => learningPaths.id, { onDelete: 'cascade' })
      .notNull(),
    orderIndex: integer('order_index').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    nodeType: lessonNodeTypeEnum('node_type').notNull(),
    content: jsonb('content').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => ({
    pathOrderIdx: index('lesson_nodes_path_order_idx').on(table.learningPathId, table.orderIndex),
  })
)

export const learningProgress = pgTable(
  'learning_progress',
  {
    id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    learningPathId: uuid('learning_path_id')
      .references(() => learningPaths.id, { onDelete: 'cascade' })
      .notNull(),
    currentNodeIndex: integer('current_node_index').default(0).notNull(),
    completedNodeIds: jsonb('completed_node_ids').default('[]').notNull(),
    xpEarned: integer('xp_earned').default(0).notNull(),
    streakCount: integer('streak_count').default(0).notNull(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    userPathUnique: uniqueIndex('learning_progress_user_path_unique').on(table.userId, table.learningPathId),
  })
)
