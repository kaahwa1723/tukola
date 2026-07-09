'use client';

import { useRef } from 'react';
import { Camera, X, ImageIcon } from 'lucide-react';

interface ImagePickerProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  label?: string;
  hint?: string;
}

export function ImagePicker({ images, onChange, maxImages = 8, label, hint }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = maxImages - images.length;
    const toProcess = files.slice(0, remaining);
    let loaded = 0;
    const newUrls: string[] = [];

    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newUrls.push(reader.result as string);
        loaded++;
        if (loaded === toProcess.length) {
          onChange([...images, ...newUrls]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemove = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-[#0A0F2C] font-semibold text-sm">{label}</label>
          {hint && <span className="text-[11px]" style={{ color: '#8B94B8' }}>{hint}</span>}
        </div>
      )}

      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
        {/* Existing images */}
        {images.map((src, idx) => (
          <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden"
            style={{ border: '1.5px solid rgba(41,82,232,0.12)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.65)' }}>
              <X size={10} color="white" strokeWidth={3} />
            </button>
          </div>
        ))}

        {/* Add tile */}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex-shrink-0 w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-transform"
            style={{ border: '2px dashed #C4CEED', background: '#F7F9FF' }}>
            <Camera size={20} color="#8B94B8" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold" style={{ color: '#8B94B8' }}>
              {images.length === 0 ? 'Add photo' : 'Add more'}
            </span>
          </button>
        )}

        {/* Empty state placeholder when no images yet */}
        {images.length === 0 && (
          <div className="flex-shrink-0 w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1"
            style={{ border: '1.5px solid #E8EDF8', background: '#F7F9FF' }}>
            <ImageIcon size={18} color="#C4CEED" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {images.length > 0 && (
        <p className="text-[11px] mt-1.5 font-medium" style={{ color: '#8B94B8' }}>
          {images.length} / {maxImages} photo{images.length !== 1 ? 's' : ''}
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
