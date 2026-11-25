import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { AnimalProfile } from '../types';

interface AnimalPhotoProps {
  animal: AnimalProfile;
  customSrc?: string;
  className?: string;
  imgClassName?: string;
  onUploadFile?: (file: File) => void;
  showUploadBadge?: boolean;
}

export const AnimalPhoto: React.FC<AnimalPhotoProps> = ({
  animal,
  customSrc,
  className = '',
  imgClassName = '',
  onUploadFile,
  showUploadBadge = false,
}) => {
  const src = customSrc || animal.defaultImage;
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadFile) {
      onUploadFile(file);
    }
    e.target.value = '';
  };

  if (hasError || !src) {
    return (
      <div
        dir="rtl"
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F3EDE0] via-[#FBF8F1] to-[#F4B41A]/20 dark:from-[#223229] dark:via-[#1B2820] dark:to-[#2B3E33] border-b border-[#6B4423]/12 dark:border-[#E6EDE8]/10 text-[#1C2A21] dark:text-[#E6EDE8] p-4 text-center ${className}`}
      >
        <span className="text-4xl leading-none mb-1.5" role="img" aria-label={animal.name}>
          {animal.emoji}
        </span>
        <span className="text-sm font-extrabold font-display text-[#1F5E3B] dark:text-[#7CD49E]">
          {animal.name}
        </span>
        {onUploadFile && (
          <label className="mt-2.5 min-h-[38px] px-3 py-1.5 rounded-xl bg-[#1F5E3B] hover:bg-[#16462B] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span>העלה מהגלריה</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[#F3EDE0] dark:bg-[#223229] ${className}`}>
      <img
        src={src}
        alt={`${animal.name} — ${animal.nickname}`}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover ${imgClassName}`}
        loading="lazy"
      />
      {showUploadBadge && onUploadFile && (
        <label
          title="החלף תמונה / העלה מהגלריה"
          className="absolute bottom-2.5 left-2.5 min-h-[36px] px-2.5 py-1.5 rounded-xl bg-white/92 dark:bg-[#1B2820]/92 hover:bg-white dark:hover:bg-[#223229] text-[#1C2A21] dark:text-[#E6EDE8] shadow-sm border border-[#6B4423]/15 dark:border-[#E6EDE8]/15 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform backdrop-blur-sm"
        >
          <Camera className="w-3.5 h-3.5 text-[#1F5E3B] dark:text-[#7CD49E] shrink-0" />
          <span>החלף תמונה</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>
      )}
    </div>
  );
};
