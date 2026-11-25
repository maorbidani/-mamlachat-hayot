import React, { useState } from 'react';
import {
  Baby,
  BookOpen,
  Cake,
  Calendar,
  SlidersHorizontal,
  Tent,
} from 'lucide-react';
import { BrandConfig, MainRoute } from '../types';
import { getLandingPageUrl } from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';

interface HomeHubProps {
  brand: BrandConfig;
  counts: {
    kindergartens: number;
    registrants: number;
    birthdays: number;
    camps: number;
    scheduleTotal: number;
  };
  onNavigate: (route: MainRoute) => void;
  onOpenLandingPreview?: () => void;
  onReplayIntro: () => void;
  onNotify?: (message: string) => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({
  brand,
  counts,
  onNavigate,
  onOpenLandingPreview,
  onReplayIntro,
  onNotify,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLandingLink = async () => {
    const url = getLandingPageUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedLink(true);
    onNotify?.('קישור הדף להורים הועתק!');
    window.setTimeout(() => setCopiedLink(false), 2400);
  };

  const categoryIcons: {
    id: MainRoute;
    title: string;
    detail: string;
    icon: typeof Baby;
    iconWrapClass: string;
  }[] = [
    {
      id: 'kindergartens',
      title: 'גנים',
      detail: `גננות, ימים, ניווט וסיכומים · ${counts.kindergartens}`,
      icon: Baby,
      iconWrapClass: 'bg-[#1F5E3B] text-white',
    },
    {
      id: 'classes',
      title: 'חוגים',
      detail: `נרשמים, נוכחות, תשלום וקבלות · ${counts.registrants}`,
      icon: BookOpen,
      iconWrapClass: 'bg-[#F4B41A] text-[#1C2A21]',
    },
    {
      id: 'birthdays',
      title: 'ימי הולדת',
      detail: `מסיבות, תאריכים וסיכומים · ${counts.birthdays}`,
      icon: Cake,
      iconWrapClass: 'bg-[#6B4423] text-white',
    },
    {
      id: 'camps',
      title: 'קייטנות',
      detail: `קייטנות, ציוד והודעות · ${counts.camps}`,
      icon: Tent,
      iconWrapClass: 'bg-[#2E7D52] text-white',
    },
    {
      id: 'schedule',
      title: 'לו״ז שבועי',
      detail: `היום וכל השבוע במקום אחד · ${counts.scheduleTotal}`,
      icon: Calendar,
      iconWrapClass: 'bg-[#B45309] text-white',
    },
    {
      id: 'admin',
      title: 'הפעלה וכלים',
      detail: 'גלגל, קולות, טיימר, ציוד והגדרות',
      icon: SlidersHorizontal,
      iconWrapClass: 'bg-[#1C2A21] dark:bg-[#223229] text-[#F4B41A]',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-6 space-y-7">
      {/* Quiet Centered Opening Header */}
      <header className="text-center space-y-1">
        <h2 className="text-2xl sm:text-3xl font-black text-[#1F5E3B] dark:text-[#7CD49E]">
          {brand.businessName}
        </h2>
        <p className="text-sm text-[#4A554E] dark:text-[#B5C4BA]">
          בחרי סוג פעילות כדי להיכנס לכל התכנים שלו
        </p>
      </header>

      {/* Central Icon Grid — One Clean Hub Icon Per Category */}
      <section aria-label="קטגוריות ראשיות">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
          {categoryIcons.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className="group min-h-[164px] sm:min-h-[188px] rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#1B2820] border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 hover:border-[#1F5E3B]/45 dark:hover:border-[#7CD49E]/45 shadow-sm flex flex-col items-center justify-center text-center gap-3.5 active:scale-[0.98] transition-all cursor-pointer"
              >
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[22px] flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105 ${item.iconWrapClass}`}
                >
                  <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#1C2A21] dark:text-[#E6EDE8]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] leading-snug tabular-nums">
                    {item.detail}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quiet Unboxed Utility Links */}
      <footer className="pt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-bold text-[#4A554E] dark:text-[#B5C4BA]">
        {onOpenLandingPreview && (
          <button
            type="button"
            onClick={onOpenLandingPreview}
            className="min-h-[40px] px-1 hover:text-[#1F5E3B] dark:hover:text-[#7CD49E] hover:underline underline-offset-4 transition-colors cursor-pointer"
          >
            האתר להורים
          </button>
        )}

        {onOpenLandingPreview && <span aria-hidden="true">·</span>}

        <button
          type="button"
          onClick={handleCopyLandingLink}
          className="min-h-[40px] px-1 hover:text-[#1F5E3B] dark:hover:text-[#7CD49E] hover:underline underline-offset-4 transition-colors cursor-pointer"
        >
          {copiedLink ? 'הקישור הועתק ✓' : 'העתקת קישור להורים'}
        </button>

        <span aria-hidden="true">·</span>

        <button
          type="button"
          onClick={onReplayIntro}
          className="min-h-[40px] px-1 hover:text-[#1F5E3B] dark:hover:text-[#7CD49E] hover:underline underline-offset-4 transition-colors cursor-pointer"
        >
          פתיח הכניסה
        </button>

        <PWAInstallButton compact onNotify={onNotify} />
      </footer>
    </div>
  );
};
