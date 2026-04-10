export type LessonNodeType = "text" | "chart" | "image" | "quiz" | "flashcard" | "summary";

export type LearningPathRow = {
  id: string;
  document_id: string;
  user_id: string;
  title: string;
  description: string;
  total_nodes: number;
  status: "generating" | "ready" | "error";
  language: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type LessonNodeRow = {
  id: string;
  learning_path_id: string;
  order_index: number;
  title: string;
  node_type: LessonNodeType;
  content: Record<string, unknown>;
  created_at: string;
};

export type LearningProgressRow = {
  id: string;
  user_id: string;
  learning_path_id: string;
  current_node_index: number;
  completed_node_ids: string[];
  xp_earned: number;
  streak_count: number;
  last_activity_at: string | null;
};

export type LearningPathApiPayload = {
  path: LearningPathRow;
  nodes: LessonNodeRow[];
  progress: LearningProgressRow | null;
} | null;

export type LearningDashboardStats = {
  total_xp: number;
  best_streak: number;
  paths_with_progress: number;
  nodes_completed: number;
};
