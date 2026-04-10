"use client";

import type { LessonNodeRow, LessonNodeType } from "@/types/learning";
import { TextLesson } from "./TextLesson";
import { ChartLesson } from "./ChartLesson";
import { ImageLesson } from "./ImageLesson";
import { QuizLesson, type QuizQuestion } from "./QuizLesson";
import { FlashcardLesson, type FlashcardItem } from "./FlashcardLesson";
import { SummaryLesson } from "./SummaryLesson";

function asStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function normalizeQuizQuestions(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((q) => {
      const o = q as Record<string, unknown>;
      const options = asStrArray(o.options);
      let correct = typeof o.correct_index === "number" ? o.correct_index : 0;
      if (correct < 0 || correct >= options.length) correct = 0;
      return {
        question: asString(o.question),
        options: options.length >= 2 ? options : ["A", "B", "C", "D"],
        correct_index: correct,
        explanation: asString(o.explanation, "Review the material and try again."),
      };
    })
    .filter((q) => q.question.length > 0);
}

function normalizeFlashcards(raw: unknown): FlashcardItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => {
      const o = c as Record<string, unknown>;
      return {
        front: asString(o.front || o.question),
        back: asString(o.back || o.answer),
      };
    })
    .filter((c) => c.front.length > 0 && c.back.length > 0);
}

function normalizeSeries(raw: unknown): { label: string; value: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      const o = s as Record<string, unknown>;
      const label = asString(o.label);
      const value = typeof o.value === "number" ? o.value : Number(o.value);
      return { label, value: Number.isFinite(value) ? value : 0 };
    })
    .filter((s) => s.label.length > 0);
}

type LessonNodeRendererProps = {
  node: LessonNodeRow;
};

export function LessonNodeRenderer({ node }: LessonNodeRendererProps) {
  const c = node.content || {};
  const t = node.node_type as LessonNodeType;

  switch (t) {
    case "text": {
      const body = asString(c.body, "_No content._");
      const keyPoints = asStrArray(c.key_points ?? c.keyPoints);
      return <TextLesson body={body} keyPoints={keyPoints} />;
    }
    case "chart": {
      const chartType = asString(c.chart_type ?? c.chartType, "chart");
      const title = asString(c.title, node.title);
      const description = asString(c.description);
      const series = normalizeSeries(c.series ?? c.data);
      return (
        <ChartLesson chartType={chartType} title={title} description={description} series={series} />
      );
    }
    case "image": {
      return (
        <ImageLesson
          caption={asString(c.caption, node.title)}
          alt={asString(c.alt, asString(c.caption, node.title))}
          description={asString(c.description)}
          keyIdeas={asStrArray(c.key_ideas ?? c.keyIdeas)}
          selfCheck={asString(c.self_check ?? c.selfCheck)}
        />
      );
    }
    case "quiz": {
      const questions = normalizeQuizQuestions(c.questions);
      return <QuizLesson questions={questions} />;
    }
    case "flashcard": {
      const cards = normalizeFlashcards(c.cards);
      return <FlashcardLesson cards={cards} />;
    }
    case "summary": {
      const body = asString(c.body, "_No summary._");
      const takeaways = asStrArray(c.takeaways);
      return <SummaryLesson body={body} takeaways={takeaways} />;
    }
    default:
      return <p className="text-sm text-slate-500">Unsupported lesson type.</p>;
  }
}
