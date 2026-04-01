import { pgTable, uuid, text, jsonb, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { documents } from './documents';
import { users } from './users';

export const questionTypeEnum = pgEnum('question_type', ['multiple_choice', 'true_false']);

export const summaries = pgTable('summaries', {
  id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  summaryText: text('summary_text').notNull(),
  bulletPoints: jsonb('bullet_points').default('[]').notNull(),
  keyConcepts: jsonb('key_concepts').default('[]').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const quizzes = pgTable('quizzes', {
  id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
  quizId: uuid('quiz_id').references(() => quizzes.id, { onDelete: 'cascade' }).notNull(),
  question: text('question').notNull(),
  options: jsonb('options').default('[]').notNull(),
  correctAnswer: text('correct_answer').notNull(),
  questionType: questionTypeEnum('question_type').default('multiple_choice').notNull(),
});

export const flashcards = pgTable('flashcards', {
  id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  isMastered: boolean('is_mastered').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const knowledgeGraphs = pgTable('knowledge_graphs', {
  id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  nodes: jsonb('nodes').default('[]').notNull(),
  edges: jsonb('edges').default('[]').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const aiQueries = pgTable('ai_queries', {
  id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
