"use client";

import type { LessonNodeRow, LessonNodeType } from "@/types/learning";
import { TextLesson } from "./TextLesson";
import { ChartLesson } from "./ChartLesson";
import { ImageLesson } from "./ImageLesson";
import { QuizLesson, type QuizQuestion } from "./QuizLesson";
import { SummaryLesson } from "./SummaryLesson";

function asStrArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeQuizQuestions(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((question) => {
      const value = question as Record<string, unknown>;
      const options = asStrArray(value.options);
      let correct = typeof value.correct_index === "number" ? value.correct_index : 0;
      if (correct < 0 || correct >= options.length) correct = 0;

      return {
        question: asString(value.question),
        options: options.length >= 2 ? options : ["A", "B", "C", "D"],
        correct_index: correct,
        explanation: asString(value.explanation, "Review the material and try again."),
      };
    })
    .filter((question) => question.question.length > 0);
}

function normalizeReviewCards(raw: unknown): { front: string; back: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((card) => {
      const value = card as Record<string, unknown>;
      return {
        front: asString(value.front || value.question),
        back: asString(value.back || value.answer),
      };
    })
    .filter((card) => card.front.length > 0 && card.back.length > 0);
}

function normalizeSeries(raw: unknown): { label: string; value: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((series) => {
      const value = series as Record<string, unknown>;
      const label = asString(value.label);
      const amount = typeof value.value === "number" ? value.value : Number(value.value);
      return { label, value: Number.isFinite(amount) ? amount : 0 };
    })
    .filter((series) => series.label.length > 0);
}

type LessonNodeRendererProps = {
  node: LessonNodeRow;
  language?: "en" | "th";
  onLessonMastered?: () => void;
};

export function LessonNodeRenderer({
  node,
  language = "en",
  onLessonMastered,
}: LessonNodeRendererProps) {
  const content = node.content || {};
  const type = node.node_type as LessonNodeType;

  switch (type) {
    case "text": {
      const body = asString(content.body, "_No content._");
      const keyPoints = asStrArray(content.key_points ?? content.keyPoints);
      return <TextLesson body={body} keyPoints={keyPoints} language={language} />;
    }
    case "chart": {
      const chartType = asString(content.chart_type ?? content.chartType, "chart");
      const title = asString(content.title, node.title);
      const description = asString(content.description);
      const series = normalizeSeries(content.series ?? content.data);
      return (
        <ChartLesson chartType={chartType} title={title} description={description} series={series} />
      );
    }
    case "image": {
      return (
        <ImageLesson
          caption={asString(content.caption, node.title)}
          alt={asString(content.alt, asString(content.caption, node.title))}
          description={asString(content.description)}
          keyIdeas={asStrArray(content.key_ideas ?? content.keyIdeas)}
          selfCheck={asString(content.self_check ?? content.selfCheck)}
        />
      );
    }
    case "quiz": {
      const questions = normalizeQuizQuestions(content.questions);
      return (
        <QuizLesson
          title={node.title}
          questions={questions}
          mode={asString(content.mode, "checkpoint") === "final_exam" ? "final_exam" : "checkpoint"}
          passingScore={typeof content.passing_score === "number" ? content.passing_score : 70}
          onPassed={onLessonMastered}
        />
      );
    }
    case "flashcard": {
      const cards = normalizeReviewCards(content.cards);
      return (
        <SummaryLesson
          body="This checkpoint is shown as a quick review in the guided route. For active-recall flashcards, use the dedicated flashcard feature instead."
          takeaways={cards.map((card) => `${card.front}: ${card.back}`).slice(0, 6)}
        />
      );
    }
    case "summary": {
      const body = asString(content.body, "_No summary._");
      const takeaways = asStrArray(content.takeaways);
      return <SummaryLesson body={body} takeaways={takeaways} />;
    }
    default:
      return <p className="text-sm text-slate-500">Unsupported lesson type.</p>;
  }
}
