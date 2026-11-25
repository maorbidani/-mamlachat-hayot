import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  CalendarHeart,
  Camera,
  Check,
  Copy,
  Download,
  ExternalLink,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { ANIMALS, DEFAULT_BRAND_CONFIG, DEFAULT_LOGO_IMAGE } from '../data/animals';
import { AnimalCategory, AnimalId, BrandConfig } from '../types';
import { getLandingPageUrl } from '../utils/storage';
import { AnimalPhoto } from './AnimalPhoto';

type BookingEventType = 'יום הולדת' | 'הפעלה בגן' | 'מסיבת סוף שנה' | 'קייטנה' | 'חוג';

const BOOKING_EVENT_TYPES: BookingEventType[] = [
  'יום הולדת',
  'הפעלה בגן',
  'מסיבת סוף שנה',
  'קייטנה',
  'חוג',
];

interface CatalogBrandTabProps {
  brand: BrandConfig;
  onUpdateBrand: (next: BrandConfig) => void;
  onResetBrand: () => void;
  onUploadAnimalPhoto: (animalId: AnimalId, file: File) => void;
  onUploadLogo: (file: File) => void;
  onUploadVetCertificate: (file: File) => void;
  nightMode: boolean;
  onToggleNightMode: () => void;
  onOpenLandingPreview: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onNotify: (message: string) => void;
}

export const CatalogBrandTab: React.FC<CatalogBrandTabProps> = ({
  brand,
  onUpdateBrand,
  onResetBrand,
  onUploadAnimalPhoto,
  onUploadLogo,
  onUploadVetCertificate,
  nightMode,
  onToggleNightMode,
  onOpenLandingPreview,
  onExportBackup,
  onImportBackup,
  onNotify,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'הכל' | AnimalCategory>('הכל');
  const [logoError, setLogoError] = useState(false);

  // Quick Booking & Quote Request Builder state
  const [bookingEventType, setBookingEventType] = useState<BookingEventType>('יום הולדת');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingCity, setBookingCity] = useState('');
  const [bookingContactName, setBookingContactName] = useState('');
  const [preferredAnimals, setPreferredAnimals] = useState<AnimalId[]>([]);
  const [copiedBooking, setCopiedBooking] = useState(false);
  const [confirmResetBrand, setConfirmResetBrand] = useState(false);
  const bookingSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setLogoError(false);
  }, [brand.logoImage]);

  const scrollToBooking = () => {
    bookingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const togglePreferredAnimal = (id: AnimalId) => {
    setPreferredAnimals((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const bookingInquiryMessage = useMemo(() => {
    const chosenAnimalNames = ANIMALS.filter((a) => preferredAnimals.includes(a.id))
      .map((a) => `${a.emoji} ${a.name}`)
      .join(', ');

    return [
      `שלום גאולה! 🐾 אשמח לקבל הצעת מחיר ופרטים להזמנת הפעלה עם ${brand.businessName}:`,
      ``,
      `🎉 *סוג האירוע:* ${bookingEventType}`,
      bookingContactName.trim() ? `👤 *שם:* ${bookingContactName.trim()}` : '',
      bookingDate.trim() ? `📅 *תאריך משוער:* ${bookingDate.trim()}` : `📅 *תאריך משוער:* גמיש / בתיאום`,
      bookingCity.trim() ? `📍 *עיר / שכונה:* ${bookingCity.trim()}` : '',
      chosenAnimalNames
        ? `🌿 *בעלי חיים מועדפים:* ${chosenAnimalNames}`
        : `🌿 *בעלי חיים:* אשמח להמלצה שלך`,
      ``,
      `תודה רבה! 💛`,
    ]
      .filter(Boolean)
      .join('\n');
  }, [brand.businessName, bookingEventType, bookingContactName, bookingDate, bookingCity, preferredAnimals]);

  const bookingWhatsappUrl = `https://wa.me/${brand.whatsappDigits}?text=${encodeURIComponent(
    bookingInquiryMessage
  )}`;

  const handleCopyBooking = async () => {
    try {
      await navigator.clipboard.writeText(bookingInquiryMessage);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = bookingInquiryMessage;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedBooking(true);
    onNotify('פרטי ההזמנה הועתקו! אפשר להדביק בוואטסאפ');
    window.setTimeout(() => setCopiedBooking(false), 2200);
  };

  const handleCopyLandingUrl = async () => {
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
    onNotify('הקישור לדף הנחיתה הציבורי הועתק!');
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadLogo(file);
    e.target.value = '';
  };

  const handleVetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadVetCertificate(file);
    e.target.value = '';
  };

  const handleRestoreAnimalPhoto = (animalId: AnimalId) => {
    const nextCustom = { ...brand.customAnimalImages };
    delete nextCustom[animalId];
    onUpdateBrand({ ...brand, customAnimalImages: nextCustom });
  };

  const handlePhoneChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    const waDigits = digitsOnly.startsWith('0')
      ? `972${digitsOnly.slice(1)}`
      : digitsOnly || DEFAULT_BRAND_CONFIG.whatsappDigits;
    onUpdateBrand({
      ...brand,
      phone: value,
      whatsappDigits: waDigits,
    });
  };

  const filteredAnimals =
    categoryFilter === 'הכל'
      ? ANIMALS
      : ANIMALS.filter((a) => a.category === categoryFilter);

  const trustHighlights = [
    {
      icon: ShieldCheck,
      title: 'בטיחות והיגיינה מלאה',
      desc: 'חיטוי ידיים מוקפד לפני ואחרי כל מפגש, מחצלות נקיות וליווי צמוד.',
    },
    {
      icon: HeartHandshake,
      title: 'חיות רגועות ומורגלות',
      desc: 'כל בעלי החיים מורגלים למגע עדין עם ילדים ונבחרים בקפידה לאופי שליו.',
    },
    {
      icon: Award,
      title: 'ליווי וטרינרי שוטף',
      desc: 'פיקוח בריאותי קבוע, תזונה מאוזנת ורווחת בעלי החיים מעל הכל.',
    },
    {
      icon: Sparkles,
      title: 'ערך חינוכי ורגשי',
      desc: 'חיזוק ביטחון עצמי, התגברות על חששות, ויסות חושי ואהבת הטבע.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Night Mode & Public Landing Page Quick Controls */}
      <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] p-4 border border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
            <div>
              <h3 className="text-sm font-extrabold text-[#1C2A21] dark:text-[#E6EDE8]">
                מצב תצוגה (יום / לילה)
              </h3>
              <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
                {nightMode
                  ? 'מצב לילה פעיל — תאורה כהה ורכה להקלה על העיניים בערב'
                  : 'מצב יום בהיר — לחצי למעבר לגוונים כהים ורכים לעבודה בערב'}
              </p>
            </div>

            <button
              type="button"
              onClick={onToggleNightMode}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 whitespace-nowrap shrink-0 active:scale-95 transition-all cursor-pointer ${
                nightMode
                  ? 'bg-[#F4B41A] text-[#1C2A21]'
                  : 'bg-[#1C2A21] text-white hover:bg-[#2A3D31]'
              }`}
            >
              {nightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-[#F4B41A]" />}
              <span>{nightMode ? 'מצב יום' : 'מצב לילה'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] p-4 border border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
            <button
              type="button"
              onClick={onOpenLandingPreview}
              className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-[#1F5E3B] hover:bg-[#16462B] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-[#F4B41A] shrink-0" />
              <span>דף נחיתה / תצוגת לקוח</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLandingUrl}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#1B2820] hover:bg-[#F3EDE0] dark:hover:bg-[#2B3D32] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-[#6B4423] dark:text-[#E6EDE8] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 shrink-0" />
              <span>העתק קישור לדף הנחיתה</span>
            </button>
          </div>
        </div>

        {/* Intro Animation Setting */}
        <div className="mt-4 pt-4 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#1C2A21] dark:text-[#E6EDE8]">
              פתיח החיות והתוכי בכניסה לאפליקציה
            </h3>
            <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
              {brand.showIntroOnLaunch !== false
                ? 'מופעל — מוצג בכל פתיחה של האפליקציה (ניתן לדלג בלחיצה אחת)'
                : 'כבוי בכניסה — ניתן להפעיל ידנית מהמסך הראשי לילדים'}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateBrand({
                ...brand,
                showIntroOnLaunch: brand.showIntroOnLaunch === false,
              })
            }
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 active:scale-95 transition-all cursor-pointer ${
              brand.showIntroOnLaunch !== false
                ? 'bg-[#1F5E3B] text-white'
                : 'bg-[#F3EDE0] dark:bg-[#223229] text-[#6B4423] dark:text-[#E6EDE8]'
            }`}
          >
            {brand.showIntroOnLaunch !== false ? 'פתיח בכניסה: פעיל' : 'פתיח בכניסה: כבוי'}
          </button>
        </div>

        {/* Full Data Backup & Device Transfer */}
        <div className="mt-4 pt-4 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#1C2A21] dark:text-[#E6EDE8]">
              גיבוי והעברת נתונים בין מכשירים (קובץ גיבוי מלא)
            </h3>
            <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
              שמרי קובץ גיבוי של כל הגנים, הנרשמים, ימי ההולדת, הקייטנות והגדרות המותג — וטעני בכל מכשיר.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onExportBackup}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>הורד גיבוי מלא</span>
            </button>
            <label className="min-h-[42px] px-4 py-2 rounded-xl bg-[#F3EDE0] dark:bg-[#223229] hover:bg-[#EAE1CE] dark:hover:bg-[#2B3E33] text-[#1F5E3B] dark:text-[#7CD49E] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-95 transition-all">
              <Upload className="w-4 h-4 shrink-0" />
              <span>שחזר מקובץ גיבוי</span>
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportBackup(file);
                  e.target.value = '';
                }}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Editable Brand Settings + About Geula + Veterinary Approval Certificate */}
      <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 space-y-5">
        <div className="pb-4 border-b border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
          <h2 className="text-xl font-bold text-[#1F5E3B] dark:text-[#7CD49E]">
            הגדרות מותג, אודות ואישור וטרינרי
          </h2>
          <p className="text-sm text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
            כל שינוי נשמר אוטומטית ב-localStorage ומוצג בדף הנחיתה הציבורי ובכרטיסי ההורים
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="brand-name"
              className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
            >
              שם העסק
            </label>
            <input
              id="brand-name"
              type="text"
              value={brand.businessName}
              onChange={(e) => onUpdateBrand({ ...brand, businessName: e.target.value })}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm text-[#1C2A21] dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
            />
          </div>

          <div>
            <label
              htmlFor="brand-phone"
              className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
            >
              טלפון / וואטסאפ להזמנות
            </label>
            <input
              id="brand-phone"
              type="tel"
              value={brand.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm text-[#1C2A21] dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
            />
          </div>

          <div>
            <label
              htmlFor="brand-tagline"
              className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
            >
              סלוגן ראשי
            </label>
            <input
              id="brand-tagline"
              type="text"
              value={brand.tagline}
              onChange={(e) => onUpdateBrand({ ...brand, tagline: e.target.value })}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm text-[#1C2A21] dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
            />
          </div>

          <div>
            <label
              htmlFor="brand-services"
              className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
            >
              שורת שירותים
            </label>
            <input
              id="brand-services"
              type="text"
              value={brand.servicesLine}
              onChange={(e) => onUpdateBrand({ ...brand, servicesLine: e.target.value })}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm text-[#1C2A21] dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
            />
          </div>
        </div>

        {/* Editable About Geula & Classes */}
        <div>
          <label
            htmlFor="brand-about"
            className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
          >
            טקסט ״אודות גאולה והחוגים״ (מוצג בדף הנחיתה הציבורי)
          </label>
          <textarea
            id="brand-about"
            rows={3}
            value={brand.aboutText}
            onChange={(e) => onUpdateBrand({ ...brand, aboutText: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm text-[#1C2A21] dark:text-[#E6EDE8] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
          />
        </div>

        {/* Veterinary Approval Text + Certificate Image Upload */}
        <div className="rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 p-4 space-y-3">
          <div>
            <label
              htmlFor="brand-vet-note"
              className="block text-xs font-bold text-[#1F5E3B] dark:text-[#7CD49E] mb-1"
            >
              הערת ״אישור וטרינרי ובטיחות״
            </label>
            <textarea
              id="brand-vet-note"
              rows={2}
              value={brand.vetApprovalNote}
              onChange={(e) => onUpdateBrand({ ...brand, vetApprovalNote: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1B2820] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm text-[#1C2A21] dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1F5E3B] hover:bg-[#16462B] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer active:scale-95 transition-transform">
              <ShieldCheck className="w-4 h-4 text-[#F4B41A]" />
              <span>
                {brand.vetCertificateImage ? 'החלף תמונת אישור וטרינרי' : 'העלה תמונת אישור וטרינרי'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleVetFileChange}
                className="sr-only"
              />
            </label>

            {brand.vetCertificateImage && (
              <>
                <img
                  src={brand.vetCertificateImage}
                  alt="תצוגה מקדימה של אישור וטרינרי"
                  className="h-11 w-16 rounded-lg object-cover border border-[#6B4423]/20"
                />
                <button
                  type="button"
                  onClick={() => onUpdateBrand({ ...brand, vetCertificateImage: undefined })}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#1B2820] hover:bg-red-50 dark:hover:bg-red-950/40 text-[#6B4423] dark:text-[#E6EDE8] hover:text-red-700 dark:hover:text-red-400 border border-[#6B4423]/15 dark:border-[#E6EDE8]/15 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>הסר תמונה</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 flex flex-wrap items-center gap-3">
          <label className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] text-sm font-bold inline-flex items-center gap-2 cursor-pointer active:scale-95 transition-transform">
            <Upload className="w-4 h-4" />
            <span>החלף תמונה / העלה לוגו מהגלריה</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoFileChange}
              className="sr-only"
            />
          </label>

          {brand.logoImage !== DEFAULT_LOGO_IMAGE && (
            <button
              type="button"
              onClick={() => onUpdateBrand({ ...brand, logoImage: DEFAULT_LOGO_IMAGE })}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#F3EDE0] dark:bg-[#24342B] hover:bg-[#EAE1CE] dark:hover:bg-[#2B3E33] text-[#6B4423] dark:text-[#E6EDE8] text-sm font-bold active:scale-95 transition-transform cursor-pointer"
            >
              החזר פלייר מקורי
            </button>
          )}

          {confirmResetBrand ? (
            <div className="flex items-center gap-2 mr-auto">
              <button
                type="button"
                onClick={() => {
                  onResetBrand();
                  setConfirmResetBrand(false);
                }}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold cursor-pointer"
              >
                כן, אפס הגדרות מותג
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetBrand(false)}
                className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#F3EDE0] dark:bg-[#223229] text-[#6B4423] dark:text-[#E6EDE8] text-xs sm:text-sm font-bold cursor-pointer"
              >
                ביטול
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmResetBrand(true)}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-white dark:bg-[#223229] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 hover:bg-[#F3EDE0] dark:hover:bg-[#2B3E33] text-[#6B4423] dark:text-[#E6EDE8] text-sm font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer mr-auto"
            >
              <RotateCcw className="w-4 h-4" />
              <span>איפוס הגדרות מיתוג</span>
            </button>
          )}
        </div>
      </section>

      {/* Brand Hero & Trust Card */}
      <section className="bg-white dark:bg-[#1B2820] rounded-3xl overflow-hidden shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-5 bg-[#F3EDE0] dark:bg-[#223229] flex flex-col items-center justify-center p-4 sm:p-6 gap-3">
            {logoError || !brand.logoImage ? (
              <div className="w-full min-h-[220px] rounded-2xl bg-gradient-to-br from-[#FBF8F1] to-[#F4B41A]/20 dark:from-[#1B2820] dark:to-[#24342B] border border-[#6B4423]/15 flex flex-col items-center justify-center p-6 text-center">
                <span className="text-5xl mb-2" role="img" aria-label={brand.businessName}>
                  🐾
                </span>
                <p className="text-base font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
                  {brand.businessName}
                </p>
                <label className="mt-3 min-h-[40px] px-4 py-2 rounded-xl bg-[#1F5E3B] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
                  <Upload className="w-4 h-4" />
                  <span>העלה לוגו מהגלריה</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="sr-only"
                  />
                </label>
              </div>
            ) : (
              <>
                <img
                  src={brand.logoImage}
                  alt={brand.businessName}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full max-h-80 lg:h-full object-contain rounded-2xl shadow-sm"
                />
                <label className="min-h-[40px] px-4 py-2 rounded-xl bg-white dark:bg-[#1B2820] hover:bg-[#FBF8F1] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-[#6B4423] dark:text-[#E6EDE8] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
                  <Camera className="w-3.5 h-3.5 text-[#1F5E3B] dark:text-[#7CD49E]" />
                  <span>החלף תמונה / העלה לוגו מהגלריה</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="sr-only"
                  />
                </label>
              </>
            )}
          </div>

          <div className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-between space-y-5">
            <div>
              <p className="text-xs font-bold text-[#6B4423] dark:text-[#F4B41A]">
                {brand.servicesLine}
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F5E3B] dark:text-[#7CD49E] mt-1.5">
                {brand.businessName}
              </h2>
              <p className="text-base font-semibold text-[#1C2A21] dark:text-[#E6EDE8] mt-2">
                {brand.tagline}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
                {trustHighlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#1F5E3B]/10 dark:bg-[#1F5E3B]/30 text-[#1F5E3B] dark:text-[#7CD49E] flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#1C2A21] dark:text-[#E6EDE8]">
                          {item.title}
                        </h3>
                        <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] mt-0.5 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[#6B4423]/12 dark:border-[#E6EDE8]/10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-[#4A554E] dark:text-[#B5C4BA] block">
                  לתיאום הפעלות ואירועים
                </span>
                <span className="text-xl font-extrabold text-[#6B4423] dark:text-[#F4B41A] tabular-nums">
                  {brand.phone}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={scrollToBooking}
                  className="min-h-[48px] px-5 py-3 rounded-2xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] font-extrabold text-sm inline-flex items-center gap-2 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                >
                  <CalendarHeart className="w-4 h-4 shrink-0" />
                  <span>להזמנת אירוע / יום הולדת</span>
                </button>

                <a
                  href={`https://wa.me/${brand.whatsappDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[48px] px-5 py-3 rounded-2xl bg-[#1F5E3B] hover:bg-[#16462B] text-white font-bold text-sm inline-flex items-center gap-2 whitespace-nowrap active:scale-95 transition-all"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>וואטסאפ ישיר</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Booking & Quote Request Builder */}
      <section
        ref={bookingSectionRef}
        id="quick-booking-form"
        className="scroll-mt-20 bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-7 shadow-sm border border-[#F4B41A]/60 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
          <div>
            <p className="text-xs font-bold text-[#6B4423] dark:text-[#F4B41A]">
              הצעת מחיר מהירה ותיאום תאריך
            </p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1F5E3B] dark:text-[#7CD49E] mt-0.5">
              להזמנת אירוע / יום הולדת עם ממלכת החיות
            </h2>
          </div>
          <span className="text-xs font-bold text-[#1F5E3B] dark:text-[#7CD49E] tabular-nums">
            מענה מהיר בוואטסאפ: {brand.phone}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <span className="block text-sm font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-2">
                סוג האירוע המבוקש
              </span>
              <div className="flex flex-wrap gap-2">
                {BOOKING_EVENT_TYPES.map((type) => {
                  const active = bookingEventType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBookingEventType(type)}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border whitespace-nowrap active:scale-95 transition-all cursor-pointer ${
                        active
                          ? 'bg-[#1F5E3B] border-[#1F5E3B] text-white shadow-sm'
                          : 'bg-[#FBF8F1] dark:bg-[#223229] border-[#6B4423]/15 dark:border-[#E6EDE8]/10 text-[#4A554E] dark:text-[#B5C4BA] hover:bg-[#F3EDE0] dark:hover:bg-[#2B3E33]'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="booking-date"
                  className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                >
                  תאריך משוער
                </label>
                <input
                  id="booking-date"
                  type="text"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  placeholder="לדוגמה: 15.12 או יום שישי"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm text-[#1C2A21] dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                />
              </div>

              <div>
                <label
                  htmlFor="booking-city"
                  className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                >
                  עיר / שכונה
                </label>
                <input
                  id="booking-city"
                  type="text"
                  value={bookingCity}
                  onChange={(e) => setBookingCity(e.target.value)}
                  placeholder="לדוגמה: פתח תקווה"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm text-[#1C2A21] dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                />
              </div>

              <div>
                <label
                  htmlFor="booking-name"
                  className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                >
                  שם הפונה (אופציונלי)
                </label>
                <input
                  id="booking-name"
                  type="text"
                  value={bookingContactName}
                  onChange={(e) => setBookingContactName(e.target.value)}
                  placeholder="לדוגמה: דנה כהן / גן שקד"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm text-[#1C2A21] dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                />
              </div>
            </div>

            <div>
              <span className="block text-sm font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-2">
                חיות מועדפות להפעלה (אופציונלי)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ANIMALS.map((animal) => {
                  const selected = preferredAnimals.includes(animal.id);
                  return (
                    <button
                      key={animal.id}
                      type="button"
                      onClick={() => togglePreferredAnimal(animal.id)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#F4B41A] border-[#F4B41A] text-[#1C2A21]'
                          : 'bg-[#FBF8F1] dark:bg-[#223229] border-[#6B4423]/15 dark:border-[#E6EDE8]/10 text-[#4A554E] dark:text-[#B5C4BA] hover:bg-[#F3EDE0]'
                      }`}
                    >
                      <span aria-hidden="true">{animal.emoji}</span>
                      <span className="truncate">{animal.name}</span>
                      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-3xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#6B4423] dark:text-[#F4B41A]">
                תצוגה מקדימה לפנייה לוואטסאפ
              </h3>
              <MapPin className="w-4 h-4 text-[#1F5E3B] dark:text-[#7CD49E] shrink-0" />
            </div>

            <pre
              dir="rtl"
              className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-[#1C2A21] dark:text-[#E6EDE8] bg-white dark:bg-[#1B2820] rounded-2xl p-3.5 border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 leading-relaxed"
            >
              {bookingInquiryMessage}
            </pre>

            <div className="flex flex-col gap-2.5">
              <a
                href={bookingWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[50px] px-5 py-3 rounded-2xl bg-[#1F5E3B] hover:bg-[#16462B] text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 transition-all shadow-sm"
              >
                <MessageCircle className="w-4 h-4 text-[#F4B41A] shrink-0" />
                <span>שלח פרטים לוואטסאפ של גאולה</span>
              </a>

              <button
                type="button"
                onClick={handleCopyBooking}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1B2820] hover:bg-[#F3EDE0] text-[#6B4423] dark:text-[#E6EDE8] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 font-bold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                {copiedBooking ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedBooking ? 'הפרטים הועתקו!' : 'העתק הודעת הזמנה'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Animal Catalog with Educational Benefits & Custom Photo Upload */}
      <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
          <div>
            <h2 className="text-xl font-bold text-[#1C2A21] dark:text-[#E6EDE8]">
              קטלוג חיות הממלכה וערך חינוכי
            </h2>
            <p className="text-sm text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
              הכירו את החברים שלנו והחליפו תמונות אישיות מהגלריה
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-[#F3EDE0] dark:bg-[#24342B] p-1 rounded-xl">
            {(['הכל', 'יונקים', 'זוחלים', 'עופות', 'פרוקי רגליים'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap active:scale-95 cursor-pointer transition-all ${
                  categoryFilter === cat
                    ? 'bg-[#1F5E3B] text-white'
                    : 'text-[#6B4423] dark:text-[#C8D6CD] hover:bg-white/70 dark:hover:bg-[#1B2820]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAnimals.map((animal) => {
            const hasCustomPhoto = Boolean(brand.customAnimalImages[animal.id]);
            return (
              <article
                key={animal.id}
                className="rounded-3xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <AnimalPhoto
                    animal={animal}
                    customSrc={brand.customAnimalImages[animal.id]}
                    onUploadFile={(file) => onUploadAnimalPhoto(animal.id, file)}
                    className="h-52 w-full"
                  />
                  <div className="p-5 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-[#6B4423] dark:text-[#F4B41A]">
                        {animal.category} · {animal.species}
                      </p>
                      <h3 className="text-xl font-bold text-[#1F5E3B] dark:text-[#7CD49E] mt-0.5">
                        {animal.emoji} {animal.name} — {animal.nickname}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
                      <h4 className="text-xs font-bold text-[#6B4423] dark:text-[#F4B41A] mb-1.5">
                        מה הילדים מרוויחים מהמפגש:
                      </h4>
                      <ul className="space-y-1 text-xs text-[#1C2A21] dark:text-[#D5E0D9] leading-relaxed">
                        {animal.educationalBenefits.map((benefit, idx) => (
                          <li key={idx}>• {benefit}</li>
                        ))}
                      </ul>
                    </div>

                    <p className="pt-2 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 text-xs text-[#4A554E] dark:text-[#B5C4BA] leading-relaxed">
                      <strong className="text-[#1F5E3B] dark:text-[#7CD49E]">הנחיית בטיחות: </strong>
                      {animal.safetyNote}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2 flex items-center gap-2">
                  <label className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-[#1B2820] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 hover:bg-[#F3EDE0] text-[#6B4423] dark:text-[#E6EDE8] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
                    <Camera className="w-4 h-4 shrink-0 text-[#1F5E3B] dark:text-[#7CD49E]" />
                    <span>החלף תמונה / העלה מהגלריה</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUploadAnimalPhoto(animal.id, file);
                        e.target.value = '';
                      }}
                      className="sr-only"
                    />
                  </label>
                  {hasCustomPhoto && (
                    <button
                      type="button"
                      onClick={() => handleRestoreAnimalPhoto(animal.id)}
                      title="שחזר תמונה מקורית"
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-[#F3EDE0] dark:bg-[#1B2820] hover:bg-[#EAE1CE] text-[#6B4423] dark:text-[#E6EDE8] text-xs font-bold active:scale-95 transition-transform cursor-pointer"
                    >
                      מקור
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
