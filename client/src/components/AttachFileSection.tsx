"use client";

import { useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { formatFileSize } from "@/lib/formatFileSize";

const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type AttachFileSectionProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  heading?: string;
  description?: string;
  browseLabel?: string;
};

export function AttachFileSection({
  file,
  onFileChange,
  disabled,
  heading,
  description,
  browseLabel,
}: AttachFileSectionProps) {
  const t = useTranslations("attachFile");
  const resolvedHeading = heading ?? t("heading");
  const resolvedDescription = description ?? t("description");
  const resolvedBrowse = browseLabel ?? t("browseLabel");
  const reactId = useId();
  const inputId = `attach-file-${reactId}`;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section
      aria-labelledby={`${inputId}-heading`}
      className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 p-5 shadow-sm"
    >
      <h2
        id={`${inputId}-heading`}
        className="text-base font-bold text-blue-950 dark:text-blue-100 tracking-tight mb-1"
      >
        {resolvedHeading}
      </h2>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{resolvedDescription}</p>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.files?.[0] ?? null;
          onFileChange(next);
        }}
      />

      {!file ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="w-full min-h-[88px] rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-800/70 bg-white/70 dark:bg-slate-900/40 px-4 py-6 text-sm font-semibold text-blue-800 dark:text-blue-200 hover:bg-white dark:hover:bg-slate-900/60 hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          <span className="material-symbols-outlined text-[28px] text-blue-600 dark:text-blue-400 mb-1 block" aria-hidden>
            upload_file
          </span>
          {resolvedBrowse}
        </button>
      ) : (
        <ul className="flex flex-col gap-3 list-none p-0 m-0">
          <li>
            <article className="flex items-center gap-4 rounded-lg bg-[#EBF2FF] dark:bg-blue-950/50 px-4 py-3 pr-3">
              <div
                className="shrink-0 flex items-center justify-center w-11 h-11 rounded-md bg-white dark:bg-slate-900 shadow-sm border border-blue-100/80 dark:border-blue-900/50"
                aria-hidden
              >
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[26px]">
                  description
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-blue-950 dark:text-blue-50 truncate text-sm sm:text-base">{file.name}</p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onFileChange(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="shrink-0 p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-white/80 dark:hover:bg-slate-900/60 disabled:opacity-40 transition-colors"
                aria-label={t("removeAria")}
              >
                <span className="material-symbols-outlined text-[22px]" aria-hidden>
                  close
                </span>
              </button>
            </article>
          </li>
          <li>
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="text-sm font-semibold text-blue-700 dark:text-blue-300 hover:underline"
            >
              {t("replaceFile")}
            </button>
          </li>
        </ul>
      )}
    </section>
  );
}
