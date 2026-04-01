export type DocumentListItem = {
  id: string;
  title: string;
  word_count: number;
  file_url: string | null;
  created_at: string;
  updated_at: string;
  /** Present on list/detail when API includes deck size */
  flashcard_count?: string | number;
  quiz_count?: string | number;
};

export type DocumentDetail = DocumentListItem & {
  user_id: string;
  content: string;
  deleted_at: string | null;
  summary_text?: string | null;
  bullet_points?: unknown;
  key_concepts?: unknown;
  quiz_count?: string;
  flashcard_count?: string;
};
