"use client";

import "react-easy-crop/react-easy-crop.css";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCircularCroppedImageBlob } from "@/lib/canvas/crop-circle-image";

const MAX_BYTES = 2 * 1024 * 1024;

type AvatarCropDialogProps = {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onComplete: (file: File) => void;
};

export function AvatarCropDialog({
  open,
  imageSrc,
  onClose,
  onComplete,
}: AvatarCropDialogProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setError("");
      setPending(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  async function handleConfirm() {
    if (!imageSrc || !croppedAreaPixels) {
      setError("Adjust the photo, then try again.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const attempts: { outputSize: number; quality: number }[] = [
        { outputSize: 512, quality: 0.92 },
        { outputSize: 512, quality: 0.82 },
        { outputSize: 512, quality: 0.72 },
        { outputSize: 384, quality: 0.85 },
        { outputSize: 384, quality: 0.72 },
        { outputSize: 256, quality: 0.88 },
      ];

      let blob: Blob | null = null;
      for (const { outputSize, quality } of attempts) {
        const next = await getCircularCroppedImageBlob(imageSrc, croppedAreaPixels, {
          mimeType: "image/jpeg",
          quality,
          outputSize,
        });
        blob = next;
        if (next.size <= MAX_BYTES) break;
      }

      if (!blob) {
        setError("Could not create image.");
        return;
      }
      if (blob.size > MAX_BYTES) {
        setError("Cropped image is still over 2 MB. Try a smaller source image or more zoom.");
        return;
      }

      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      onComplete(file);
    } catch {
      setError("Could not process the image.");
    } finally {
      setPending(false);
    }
  }

  if (!open || !imageSrc) return null;

  const primaryBtnClass =
    "rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/25 transition hover:bg-primary/90 disabled:opacity-60";
  const secondaryBtnClass =
    "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700";

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] dark:bg-black/60"
        aria-label="Close crop dialog"
        disabled={pending}
        onClick={() => !pending && onClose()}
      />
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4">
          <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">
            Crop profile photo
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Drag to reposition. Use the slider to zoom. The result is saved as a circular photo.
          </p>
        </header>

        <div className="relative mb-4 h-72 w-full overflow-hidden rounded-xl bg-slate-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="avatar-crop-zoom" className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
            Zoom
          </label>
          <input
            id="avatar-crop-zoom"
            type="range"
            min={1}
            max={3}
            step={0.02}
            value={zoom}
            disabled={pending}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        {error ? (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="flex flex-wrap justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            className={secondaryBtnClass}
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="button" className={primaryBtnClass} disabled={pending} onClick={() => void handleConfirm()}>
            {pending ? "Saving…" : "Use this photo"}
          </button>
        </footer>
      </article>
    </div>
  );
}
