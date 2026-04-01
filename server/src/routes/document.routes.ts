import { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { planGuard } from '@/middlewares/planGuard'
import * as ctrl from '@/controllers/document.controller'
import * as aiCtrl from '@/controllers/ai.controller'
import * as flashCtrl from '@/controllers/flashcard.controller'

export async function documentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get('/', ctrl.listDocuments)
  app.post('/', ctrl.createDocument)
  app.post('/upload', { preHandler: [planGuard('pro')] }, ctrl.uploadDocument)
  app.post('/:id/append-upload', { preHandler: [planGuard('pro')] }, ctrl.appendUploadToDocument)

  // AI (Step 07) — multi-segment routes before bare `/:id`
  app.post('/:id/summary', aiCtrl.generateSummary)
  app.get('/:id/quizzes', aiCtrl.listQuizzes)
  app.post('/:id/quiz', aiCtrl.generateQuiz)
  app.get('/:id/flashcards', flashCtrl.listFlashcards)
  app.post('/:id/flashcards/reset', flashCtrl.resetFlashcards)
  app.post('/:id/flashcards', aiCtrl.generateFlashcards)
  app.get('/:id/chat/history', aiCtrl.listChatHistory)
  app.post('/:id/chat', aiCtrl.chatWithDocument)
  app.get('/:id/knowledge-graph', aiCtrl.getKnowledgeGraph)
  app.post('/:id/knowledge-graph', aiCtrl.generateKnowledgeGraph)

  app.get('/:id', ctrl.getDocument)
  app.put('/:id', ctrl.updateDocument)
  app.delete('/:id', ctrl.deleteDocument)
}
