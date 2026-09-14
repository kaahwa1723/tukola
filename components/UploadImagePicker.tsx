'use client';

import { useRef, useState, useCallback } from 'react';
import { Camera, X, ImageIcon, Loader2, UploadCloud } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface UploadImagePickerProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  label?: string;
  hint?: string;
  bucket: 'job-images' | 'profile-images';
  folder?: string;
}

interface UploadingFile {
  id: string;
  preview: string;
  progress: number;
  error?: string;
}

export function UploadImagePicker({
  images,
  onChange,
  maxImages = 8,
  label,
  hint,
  bucket,
  folder = 'uploads',
}: UploadImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const { t } = useI18n();

  const uploadFile = useCallback(
    async (file: File, id: string): Promise<string | null> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      formData.append('folder', folder);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || t('up.uploadFailed'));
        }
        const { url } = await res.json();
        return url;
      } catch (err: any) {
        console.error('[UploadImagePicker]', err);
        // Persistent, human-readable failure — a silent drop here once cost
        // us a user who thought their job photos had attached.
        setLastError(err?.message ?? t('up.uploadFailed'));
        return null;
      }
    },
    [bucket, folder, t]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = maxImages - images.length;
    const toProcess = files.slice(0, remaining);

    if (toProcess.length === 0) return;
    setLastError(null);

    // Create preview entries for immediate feedback
    const newUploading: UploadingFile[] = await Promise.all(
      toProcess.map(
        (file) =>
          new Promise<UploadingFile>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () =>
              resolve({
                id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                preview: reader.result as string,
                progress: 0,
              });
            reader.readAsDataURL(file);
          })
      )
    );

    setUploading((prev) => [...prev, ...newUploading]);

    const newUrls: string[] = [];

    await Promise.all(
      toProcess.map(async (file, idx) => {
        const id = newUploading[idx].id;
        const url = await uploadFile(file, id);

        setUploading((prev) => prev.filter((u) => u.id !== id));

        if (url) {
          newUrls.push(url);
        } else {
          // Show error on the preview before removing
          setUploading((prev) =>
            prev.map((u) =>
              u.id === id ? { ...u, error: t('up.uploadFailed') } : u
            )
          );
          // Remove after a short delay
          setTimeout(() => {
            setUploading((prev) => prev.filter((u) => u.id !== id));
          }, 2000);
        }
      })
    );

    if (newUrls.length > 0) {
      onChange([...images, ...newUrls]);
    }

    e.target.value = '';
  };

  const handleRemove = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const totalItems = images.length + uploading.length;
  const canAddMore = totalItems < maxImages;

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-[#0A0F2C] font-semibold text-sm">{label}</label>
          {hint && (
            <span className="text-[11px]" style={{ color: '#8B94B8' }}>
              {hint}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
        {/* Existing uploaded images */}
        {images.map((src, idx) => (
          <div
            key={`img-${idx}`}
            className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden"
            style={{ border: '1.5px solid rgba(41,82,232,0.12)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Photo ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
              style={{ background: 'rgba(0,0,0,0.65)' }}
            >
              <X size={10} color="white" strokeWidth={3} />
            </button>
          </div>
        ))}

        {/* Uploading previews */}
        {uploading.map((u) => (
          <div
            key={u.id}
            className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden"
            style={{ border: '1.5px solid rgba(41,82,232,0.12)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={u.preview}
              alt={t('up.uploadingAlt')}
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {u.error ? (
                <span className="text-[9px] font-bold text-red-500 text-center px-1">
                  {t('up.error')}
                </span>
              ) : (
                <Loader2 size={18} className="text-white animate-spin" />
              )}
            </div>
          </div>
        ))}

        {/* Add tile */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex-shrink-0 w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-transform"
            style={{ border: '2px dashed #C4CEED', background: '#F7F9FF' }}
          >
            <UploadCloud size={20} color="#8B94B8" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold" style={{ color: '#8B94B8' }}>
              {images.length === 0 ? t('up.addPhoto') : t('up.addMore')}
            </span>
          </button>
        )}

        {/* Empty state placeholder when no images yet */}
        {images.length === 0 && uploading.length === 0 && (
          <div
            className="flex-shrink-0 w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1"
            style={{ border: '1.5px solid #E8EDF8', background: '#F7F9FF' }}
          >
            <ImageIcon size={18} color="#C4CEED" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {images.length > 0 && (
        <p className="text-[11px] mt-1.5 font-medium" style={{ color: '#8B94B8' }}>
          {t('up.counter', { n: images.length, max: maxImages })}
        </p>
      )}

      {lastError && (
        <p className="text-[12px] mt-1.5 font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {t('up.uploadFailed')}: {lastError}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
