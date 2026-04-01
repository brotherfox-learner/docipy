import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

// กำหนด custom type สำหรับ vector จาก pgvector
import { customType } from 'drizzle-orm/pg-core';
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)'; // Gemini embedding dimension
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
});

export const documents = pgTable('documents', {
  id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').default('').notNull(),
  fileUrl: text('file_url'),
  wordCount: integer('word_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }), // soft delete
});

export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  chunkText: text('chunk_text').notNull(),
  embedding: vector('embedding'),
  chunkIndex: integer('chunk_index').notNull()
}, (table) => {
  return {
    documentIdIdx: index('idx_document_chunks_document_id').on(table.documentId),
    embeddingIdx: index('idx_document_chunks_embedding').using('hnsw', table.embedding.op('vector_cosine_ops'))
  };
});
