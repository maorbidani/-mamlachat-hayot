import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
  onNotify?: (message: string) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  onNotify,
}) => {
  const { canNativeInstall, isStandalone, isIos, promptInstall } = usePWAInstall();
  const [guideOpen, setGuideOpen] = useState(false);

  if (isStandalone) return null;

  const handleClick = async () => {
    if (canNativeInstall) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        onNotify?.('האפליקציה הותקנה למסך הבית בהצלחה!');
      }
      return;
    }
    setGuideOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          compact
            ? 'min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer'
            : 'min-h-[44px] px-4 py-2 rounded-2xl bg-[#1F5E3B] hover:bg-[#16462B] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer'
        }
      >
        <Download className={compact ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 text-[#F4B41A] shrink-0'} />
        <span>התקן כאפליקציה בנייד</span>
      </button>

      {guideOpen && (
        <div
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGuideOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="התקנת האפליקציה על מסך הבית"
        >
          <div className="w-full sm:max-w-md bg-white dark:bg-[#1B2820] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#1F5E3B] dark:text-[#7CD49E]" />
                <h3 className="text-lg font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
                  התקנה כאפליקציה במסך הבית
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                aria-label="סגור חלון"
                className="min-h-[40px] min-w-[40px] rounded-xl bg-[#F3EDE0] dark:bg-[#223229] text-[#6B4423] dark:text-[#E6EDE8] inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIos ? (
              <ol className="space-y-2.5 text-sm text-[#1C2A21] dark:text-[#E6EDE8] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-extrabold text-[#1F5E3B] dark:text-[#F4B41A]">1.</span>
                  <span>
                    פתחי את האתר בדפדפן <strong>Safari</strong> ולחצי על כפתור השיתוף{' '}
                    <Share className="inline w-4 h-4 text-[#1F5E3B] dark:text-[#7CD49E]" /> בתחתית המסך.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-extrabold text-[#1F5E3B] dark:text-[#F4B41A]">2.</span>
                  <span>
                    גללי ובחרי ב־<strong>״הוסף למסך הבית״ (Add to Home Screen)</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-extrabold text-[#1F5E3B] dark:text-[#F4B41A]">3.</span>
                  <span>לחצי על ״הוסף״ — האפליקציה תופיע כאייקון עם גישה גם ללא אינטרנט.</span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-sm text-[#1C2A21] dark:text-[#E6EDE8] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-extrabold text-[#1F5E3B] dark:text-[#F4B41A]">1.</span>
                  <span>לחצי על תפריט הדפדפן (⋮ שלוש נקודות בפינה העליונה ב־Chrome).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-extrabold text-[#1F5E3B] dark:text-[#F4B41A]">2.</span>
                  <span>
                    בחרי ב־<strong>״התקן אפליקציה״</strong> או <strong>״הוסף למסך הבית״</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-extrabold text-[#1F5E3B] dark:text-[#F4B41A]">3.</span>
                  <span>האפליקציה תיפתח במסך מלא ותעבוד בצורה חלקה גם כשאין קליטה בשטח!</span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setGuideOpen(false)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1F5E3B] text-white font-bold text-sm cursor-pointer"
            >
              הבנתי, תודה!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
