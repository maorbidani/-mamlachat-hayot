import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Cake,
  Calendar,
  CheckCircle2,
  HeartHandshake,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Tent,
} from 'lucide-react';
import { ANIMALS } from '../data/animals';
import {
  AnimalCategory,
  AnimalId,
  BrandConfig,
  ClassPaymentSettings,
  ClassRegistrant,
  EventBooking,
  KindergartenRecord,
} from '../types';
import {
  findDateConflicts,
  formatHebrewShortDate,
  getHebrewDayOfWeekFromIsoDate,
  getLocalTodayIso,
  getNextAvailableDates,
} from '../utils/storage';
import { AnimalPhoto } from './AnimalPhoto';

interface PublicLandingPageProps {
  brand: BrandConfig;
  bookings: EventBooking[];
  kindergartens: KindergartenRecord[];
  paymentSettings: ClassPaymentSettings;
  showBackToApp: boolean;
  onBackToApp?: () => void;
  onSubmitEventRequest: (booking: Omit<EventBooking, 'id'>) => EventBooking;
  onSubmitClassRegistration: (
    data: Pick<ClassRegistrant, 'parentAndChildName' | 'phone' | 'dayOrGroup' | 'notes'>
  ) => ClassRegistrant;
}

type PortalTab = 'event' | 'class';

type PublicEventKind = 'יום הולדת' | 'קייטנה' | 'הפעלה בגן ילדים' | 'מסיבת סוף שנה';

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({
  brand,
  bookings,
  kindergartens,
  paymentSettings,
  showBackToApp,
  onBackToApp,
  onSubmitEventRequest,
  onSubmitClassRegistration,
}) => {
  const [logoError, setLogoError] = useState(false);
  const [vetImgError, setVetImgError] = useState(false);
  const [animalFilter, setAnimalFilter] = useState<'הכל' | AnimalCategory>('הכל');

  useEffect(() => {
    setLogoError(false);
  }, [brand.logoImage]);

  useEffect(() => {
    setVetImgError(false);
  }, [brand.vetCertificateImage]);

  const [portalTab, setPortalTab] = useState<PortalTab>('event');

  const todayIso = getLocalTodayIso();

  // Event / Birthday Booking Inquiry State
  const [eventType, setEventType] = useState<PublicEventKind>('יום הולדת');
  const [eventDate, setEventDate] = useState<string>(() => {
    const free = getNextAvailableDates(todayIso, bookings, 1);
    return free[0] || todayIso;
  });
  const [eventTime, setEventTime] = useState('16:30');
  const [eventCity, setEventCity] = useState('');
  const [eventContactName, setEventContactName] = useState('');
  const [eventContactPhone, setEventContactPhone] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [submittedEvent, setSubmittedEvent] = useState<EventBooking | null>(null);

  // Class Registration State
  const [classParentChild, setClassParentChild] = useState('');
  const [classPhone, setClassPhone] = useState('');
  const [classGroup, setClassGroup] = useState('חוג יום שלישי · 17:00 (גילאי 4–6)');
  const [classNotes, setClassNotes] = useState('');
  const [submittedClassReg, setSubmittedClassReg] = useState<ClassRegistrant | null>(null);

  // Safe non-PII upcoming busy dates list
  const upcomingBusyDates = useMemo(() => {
    return bookings
      .filter((b) => b.date >= todayIso)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);
  }, [bookings, todayIso]);

  const dateConflicts = useMemo(
    () => findDateConflicts(eventDate, bookings),
    [eventDate, bookings]
  );
  const isDateBusy = dateConflicts.length > 0;

  const nearestFreeDates = useMemo(
    () => (isDateBusy ? getNextAvailableDates(eventDate, bookings, 3) : []),
    [isDateBusy, eventDate, bookings]
  );

  const morningKindergartensOnDate = useMemo(() => {
    const heDay = getHebrewDayOfWeekFromIsoDate(eventDate);
    if (!heDay) return [];
    return kindergartens.filter((kg) => kg.dayOfWeek === heDay);
  }, [eventDate, kindergartens]);

  const isMorningSlot = useMemo(() => {
    const h = Number(eventTime.split(':')[0] || 16);
    return h < 13;
  }, [eventTime]);

  const hasMorningKindergartenConflict =
    isMorningSlot && morningKindergartensOnDate.length > 0;

  const filteredAnimals =
    animalFilter === 'הכל'
      ? ANIMALS
      : ANIMALS.filter((a) => a.category === animalFilter);

  const whatsappDirectUrl = `https://wa.me/${brand.whatsappDigits}?text=${encodeURIComponent(
    `שלום גאולה! אשמח לקבל פרטים על ${brand.businessName}.`
  )}`;

  const eventWhatsappUrl = useMemo(() => {
    const msg = [
      `שלום גאולה! 🐾 שלחתי פנייה דרך דף הנחיתה של ${brand.businessName}:`,
      `🎉 *סוג פעילות:* ${eventType}`,
      eventContactName.trim() ? `👤 *שם:* ${eventContactName.trim()}` : '',
      eventContactPhone.trim() ? `📞 *טלפון:* ${eventContactPhone.trim()}` : '',
      eventDate ? `📅 *תאריך מבוקש:* ${formatHebrewShortDate(eventDate)} בשעה ${eventTime}` : '',
      eventCity.trim() ? `📍 *עיר / כתובת:* ${eventCity.trim()}` : '',
      isDateBusy ? `⚠️ ראיתי שהתאריך תפוס — אשמח לבדוק האם יש שעה פנויה אחרת.` : '',
      eventNotes.trim() ? `📝 *הערות:* ${eventNotes.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    return `https://wa.me/${brand.whatsappDigits}?text=${encodeURIComponent(msg)}`;
  }, [
    brand.businessName,
    brand.whatsappDigits,
    eventType,
    eventContactName,
    eventContactPhone,
    eventDate,
    eventTime,
    eventCity,
    isDateBusy,
    eventNotes,
  ]);

  const classWhatsappUrl = useMemo(() => {
    const msg = [
      `שלום גאולה! 🌿 נרשמתי דרך דף הנחיתה לחוגי החיות:`,
      `👶 *שם הורה וילד:* ${classParentChild || 'הרשמה חדשה'}`,
      classPhone ? `📞 *טלפון:* ${classPhone}` : '',
      `🗓️ *קבוצה מועדפת:* ${classGroup}`,
      classNotes ? `📝 *הערות:* ${classNotes}` : '',
      paymentSettings.defaultPaymentLinkUrl
        ? `💳 קישור לתשלום דמי החוג: ${paymentSettings.defaultPaymentLinkUrl}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
    return `https://wa.me/${brand.whatsappDigits}?text=${encodeURIComponent(msg)}`;
  }, [
    brand.whatsappDigits,
    classParentChild,
    classPhone,
    classGroup,
    classNotes,
    paymentSettings.defaultPaymentLinkUrl,
  ]);

  const handleSubmitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDateBusy) return;
    if (!eventContactName.trim() || !eventContactPhone.trim() || !eventDate) return;

    const defaultAnimals: AnimalId[] = ['parrot', 'tortoise', 'rabbit', 'python'];
    const created = onSubmitEventRequest({
      kind: eventType === 'קייטנה' ? 'camp' : 'birthday',
      title: `${eventType} — ${eventContactName.trim()}`,
      date: eventDate,
      time: eventTime,
      location: eventCity.trim(),
      contactName: eventContactName.trim(),
      contactPhone: eventContactPhone.trim(),
      animals: defaultAnimals,
      status: 'ממתין לאישור',
      notes: eventNotes.trim(),
      source: 'landing',
    });
    setSubmittedEvent(created);
  };

  const handleSubmitClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classParentChild.trim() || !classPhone.trim()) return;
    const created = onSubmitClassRegistration({
      parentAndChildName: classParentChild.trim(),
      phone: classPhone.trim(),
      dayOrGroup: classGroup.trim(),
      notes: classNotes.trim(),
    });
    setSubmittedClassReg(created);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FBF8F1] dark:bg-[#131D17] text-[#1C2A21] dark:text-[#E6EDE8]"
    >
      {/* Clean Public Header */}
      <header className="sticky top-0 z-30 h-14 bg-[#FBF8F1]/95 dark:bg-[#18241D]/95 backdrop-blur-md border-b border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {logoError || !brand.logoImage ? (
              <div className="w-9 h-9 rounded-xl bg-[#F3EDE0] dark:bg-[#24342B] flex items-center justify-center text-lg shrink-0">
                🐾
              </div>
            ) : (
              <img
                src={brand.logoImage}
                alt={brand.businessName}
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-9 h-9 rounded-xl object-cover border border-[#6B4423]/20 shrink-0"
              />
            )}
            <span className="text-base sm:text-lg font-extrabold font-display text-[#1F5E3B] dark:text-[#7CD49E] truncate whitespace-nowrap">
              {brand.businessName}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {showBackToApp && onBackToApp && (
              <button
                type="button"
                onClick={onBackToApp}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F3EDE0] dark:bg-[#24342B] hover:bg-[#EAE1CE] dark:hover:bg-[#2D4035] text-[#6B4423] dark:text-[#E6EDE8] text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>חזרה לאפליקציית הניהול</span>
              </button>
            )}

            <a
              href={whatsappDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#1F5E3B] hover:bg-[#16462B] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-[#F4B41A] shrink-0" />
              <span className="tabular-nums">{brand.phone}</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-10">
        {/* 1. Hero & Brand Identity */}
        <section className="bg-white dark:bg-[#1B2820] rounded-3xl overflow-hidden shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-5 bg-[#F3EDE0] dark:bg-[#223229] flex items-center justify-center p-5 sm:p-7">
              {logoError || !brand.logoImage ? (
                <div className="w-full min-h-[240px] rounded-2xl bg-[#FBF8F1] dark:bg-[#1B2820] flex flex-col items-center justify-center p-6 text-center">
                  <span className="text-6xl mb-2" role="img" aria-label={brand.businessName}>
                    🐾
                  </span>
                  <p className="text-lg font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
                    {brand.businessName}
                  </p>
                </div>
              ) : (
                <img
                  src={brand.logoImage}
                  alt={brand.businessName}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full max-h-96 lg:h-full object-contain rounded-2xl shadow-sm"
                />
              )}
            </div>

            <div className="lg:col-span-7 p-6 sm:p-9 flex flex-col justify-between space-y-6">
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#6B4423] dark:text-[#F4B41A]">
                  {brand.servicesLine}
                </p>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1F5E3B] dark:text-[#E6EDE8] mt-2 leading-tight">
                  {brand.businessName}
                </h1>
                <p className="text-lg sm:text-xl font-bold text-[#1C2A21] dark:text-[#C8D6CD] mt-3">
                  {brand.tagline}
                </p>
                <p className="text-sm sm:text-base text-[#4A554E] dark:text-[#B5C4BA] mt-4 leading-relaxed">
                  חוויה חמה, בטוחה ובלתי נשכחת שבה ילדים פוגשים מגוון מדהים של בעלי חיים מקרוב —
                  יונקים פרוותיים, תוכים צבעוניים, זוחלים ופרוקי רגליים נדירים, בקצב רגוע ובליווי מקצועי.
                </p>
              </div>

              <div className="pt-4 border-t border-[#6B4423]/12 dark:border-[#E6EDE8]/10 flex flex-wrap items-center gap-3">
                <a
                  href="#public-booking"
                  className="min-h-[52px] px-6 py-3.5 rounded-2xl bg-[#1F5E3B] hover:bg-[#16462B] text-white font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 transition-all shadow-sm"
                >
                  <Calendar className="w-5 h-5 text-[#F4B41A] shrink-0" />
                  <span>בדיקת תאריך פנוי ושריון</span>
                </a>
                <a
                  href="#public-booking"
                  onClick={() => setPortalTab('class')}
                  className="min-h-[52px] px-5 py-3.5 rounded-2xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] font-extrabold text-sm inline-flex items-center justify-center whitespace-nowrap active:scale-95 transition-all"
                >
                  הרשמה לחוגי החיות
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 2. About Geula & Services */}
        <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-6 sm:p-8 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 space-y-6">
          <div className="max-w-3xl">
            <p className="text-xs font-bold text-[#6B4423] dark:text-[#F4B41A]">
              אודות גאולה והפעילות שלנו
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F5E3B] dark:text-[#7CD49E] mt-1">
              מפגש מהלב עם עולם החי · חוגים, גנים וימי הולדת
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#1C2A21] dark:text-[#D5E0D9] leading-relaxed whitespace-pre-line">
              {brand.aboutText}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
            <div className="rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] p-4 space-y-2">
              <BookOpen className="w-6 h-6 text-[#1F5E3B] dark:text-[#F4B41A]" />
              <h3 className="text-base font-extrabold text-[#1C2A21] dark:text-[#E6EDE8]">
                חוגי חיות שבועיים
              </h3>
              <p className="text-xs sm:text-sm text-[#4A554E] dark:text-[#B5C4BA] leading-relaxed">
                קבוצות קטנות ומותאמות גיל לטיפוח חמלה, ביטחון עצמי, הקשבה וויסות חושי.
              </p>
            </div>

            <div className="rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] p-4 space-y-2">
              <HeartHandshake className="w-6 h-6 text-[#6B4423] dark:text-[#F4B41A]" />
              <h3 className="text-base font-extrabold text-[#1C2A21] dark:text-[#E6EDE8]">
                גני ילדים וצהרונים
              </h3>
              <p className="text-xs sm:text-sm text-[#4A554E] dark:text-[#B5C4BA] leading-relaxed">
                מפגשים רגועים במעגל עם חידות, צלילים וליטוף עדין בליווי פדגוגי מקצועי.
              </p>
            </div>

            <div className="rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] p-4 space-y-2">
              <Cake className="w-6 h-6 text-[#F4B41A]" />
              <h3 className="text-base font-extrabold text-[#1C2A21] dark:text-[#E6EDE8]">
                ימי הולדת חגיגיים
              </h3>
              <p className="text-xs sm:text-sm text-[#4A554E] dark:text-[#B5C4BA] leading-relaxed">
                הפעלה שמחה ומרתקת שבה ילד או ילדת יום ההולדת במרכז החגיגה עם כל החיות.
              </p>
            </div>

            <div className="rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] p-4 space-y-2">
              <Tent className="w-6 h-6 text-[#1F5E3B] dark:text-[#7CD49E]" />
              <h3 className="text-base font-extrabold text-[#1C2A21] dark:text-[#E6EDE8]">
                קייטנות ומסיבות סוף שנה
              </h3>
              <p className="text-xs sm:text-sm text-[#4A554E] dark:text-[#B5C4BA] leading-relaxed">
                תוכנית חווייתית ומגבשת לקבוצות גדולות, קייטנות קיץ וחורף ואירועי משפחות.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Meet all 13 Animals Showcase (Strictly Read-Only) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-bold text-[#6B4423] dark:text-[#F4B41A]">
                כוכבי הממלכה ({ANIMALS.length} סוגי בעלי חיים)
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
                הכירו את בעלי החיים שלנו
              </h2>
            </div>

            <div className="flex flex-wrap gap-1.5 bg-[#F3EDE0] dark:bg-[#223229] p-1 rounded-xl">
              {(['הכל', 'יונקים', 'זוחלים', 'עופות', 'פרוקי רגליים'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAnimalFilter(cat)}
                  className={`min-h-[38px] px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                    animalFilter === cat
                      ? 'bg-[#1F5E3B] text-white'
                      : 'text-[#6B4423] dark:text-[#C8D6CD] hover:bg-white/70 dark:hover:bg-[#1B2820]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAnimals.map((animal) => (
              <article
                key={animal.id}
                className="bg-white dark:bg-[#1B2820] rounded-3xl overflow-hidden shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 flex flex-col justify-between"
              >
                <div>
                  <AnimalPhoto
                    animal={animal}
                    customSrc={brand.customAnimalImages[animal.id]}
                    className="h-52 w-full"
                  />
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
                        {animal.emoji} {animal.name}
                      </h3>
                      <span className="text-xs font-semibold text-[#6B4423] dark:text-[#F4B41A]">
                        {animal.category}
                      </span>
                    </div>
                    <p className="text-sm text-[#1C2A21] dark:text-[#D5E0D9] leading-relaxed">
                      {animal.surprisingFact}
                    </p>
                    <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] pt-2 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
                      • {animal.educationalBenefits[0]}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 4. Veterinary Approval & Safety Trust Section */}
        <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-6 sm:p-8 shadow-sm border border-[#1F5E3B]/25 dark:border-[#7CD49E]/25">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 text-sm font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
                <ShieldCheck className="w-6 h-6 text-[#F4B41A]" />
                <span>אישור וטרינרי בתוקף · בטיחות והיגיינה מעל הכל</span>
              </div>

              <h2 className="text-2xl font-extrabold text-[#1C2A21] dark:text-[#E6EDE8]">
                אישור וטרינרי ובטיחות מלאה לילדים ולחיות
              </h2>

              <p className="text-sm sm:text-base text-[#1C2A21] dark:text-[#D5E0D9] leading-relaxed">
                {brand.vetApprovalNote}
              </p>

              <ul className="space-y-2 text-sm text-[#4A554E] dark:text-[#B5C4BA]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1F5E3B] dark:text-[#7CD49E] shrink-0" />
                  <span>אישור וטרינרי בתוקף ובדיקות בריאות שוטפות לכל בעלי החיים.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1F5E3B] dark:text-[#7CD49E] shrink-0" />
                  <span>הקפדה מלאה על שטיפה וחיטוי ידיים לכל ילד לפני ואחרי המגע.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1F5E3B] dark:text-[#7CD49E] shrink-0" />
                  <span>בעלי חיים עדינים, מורגלים לילדים ומלווים בהנחיה צמודה לאורך כל המפגש.</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-5">
              {brand.vetCertificateImage && !vetImgError ? (
                <div className="rounded-2xl overflow-hidden bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/15 p-3">
                  <img
                    src={brand.vetCertificateImage}
                    alt="אישור וטרינרי בתוקף — ממלכת החיות של גאולה"
                    referrerPolicy="no-referrer"
                    onError={() => setVetImgError(true)}
                    className="w-full max-h-72 object-contain rounded-xl"
                  />
                  <p className="text-center text-xs font-bold text-[#1F5E3B] dark:text-[#7CD49E] mt-2">
                    אישור וטרינרי בתוקף · {brand.businessName}
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl bg-[#F3EDE0] dark:bg-[#223229] border border-[#F4B41A]/50 p-6 text-center space-y-2.5">
                  <Award className="w-12 h-12 text-[#1F5E3B] dark:text-[#F4B41A] mx-auto" />
                  <h3 className="text-lg font-extrabold text-[#1F5E3B] dark:text-[#E6EDE8]">
                    אישור וטרינרי בתוקף
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4A554E] dark:text-[#B5C4BA] leading-relaxed">
                    פיקוח רפואי קבוע, ציוד נקי ומחוטא ורווחת בעלי החיים בכל הפעלה, חוג ויום הולדת.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 5. Live Booking with Busy-Date Collision Guard + Class Registration */}
        <section
          id="public-booking"
          className="scroll-mt-20 bg-[#1F5E3B] text-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#F4B41A] inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>בדיקת יומן בזמן אמת · ללא כפילויות</span>
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">
                שריון יום הולדת / הרשמה לחוג חיות
              </h2>
            </div>
            <span className="text-xl font-extrabold text-[#F4B41A] tabular-nums shrink-0">
              {brand.phone}
            </span>
          </div>

          {/* Portal Switcher */}
          <div className="inline-flex rounded-2xl bg-black/20 p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setPortalTab('event');
                setSubmittedEvent(null);
              }}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold cursor-pointer transition-all ${
                portalTab === 'event'
                  ? 'bg-[#F4B41A] text-[#1C2A21]'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              🎂 קביעת יום הולדת / הפעלה
            </button>
            <button
              type="button"
              onClick={() => {
                setPortalTab('class');
                setSubmittedClassReg(null);
              }}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold cursor-pointer transition-all ${
                portalTab === 'class'
                  ? 'bg-[#F4B41A] text-[#1C2A21]'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              🌿 הרשמה לחוגי חיות
            </button>
          </div>

          {portalTab === 'event' ? (
            <div className="space-y-4">
              {/* Safe Public Busy Dates Strip (No PII exposed) */}
              {upcomingBusyDates.length > 0 && (
                <div className="rounded-2xl bg-black/20 border border-white/15 p-3.5 space-y-2">
                  <p className="text-xs font-bold text-[#F4B41A]">
                    תאריכים שכבר תפוסים ביומן הקרוב (כדי למנוע התנגשות):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {upcomingBusyDates.map((b) => (
                      <span
                        key={b.id}
                        className="px-3 py-1 rounded-xl bg-red-500/25 border border-red-300/40 text-xs font-bold text-white tabular-nums"
                      >
                        🚫 {formatHebrewShortDate(b.date)} · {b.time || 'תפוס'} (תפוס)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {submittedEvent ? (
                <div className="rounded-2xl bg-white text-[#1C2A21] p-5 sm:p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-7 h-7 text-[#1F5E3B] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-extrabold text-[#1F5E3B]">
                        התאריך נשמר ונרשם ביומן של גאולה!
                      </h3>
                      <p className="text-sm text-[#4A554E] mt-1">
                        {formatHebrewShortDate(submittedEvent.date)} בשעה {submittedEvent.time} · סטטוס: ממתין לאישור סופי מגאולה.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <a
                      href={eventWhatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#1F5E3B] text-white font-extrabold text-sm inline-flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4 text-[#F4B41A]" />
                      <span>שלח אישור גם בוואטסאפ</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const free = getNextAvailableDates(submittedEvent.date || todayIso, bookings, 1);
                        setEventDate(free[0] || todayIso);
                        setEventContactName('');
                        setEventContactPhone('');
                        setEventCity('');
                        setEventNotes('');
                        setSubmittedEvent(null);
                      }}
                      className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#F3EDE0] text-[#6B4423] font-bold text-sm cursor-pointer"
                    >
                      שריון תאריך נוסף
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitEvent} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="pub-ev-type" className="block text-xs font-bold text-[#E6F2EB] mb-1">
                        סוג האירוע
                      </label>
                      <select
                        id="pub-ev-type"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value as PublicEventKind)}
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white text-[#1C2A21] text-sm font-semibold focus:outline-none"
                      >
                        <option value="יום הולדת">יום הולדת</option>
                        <option value="הפעלה בגן ילדים">הפעלה בגן ילדים</option>
                        <option value="מסיבת סוף שנה">מסיבת סוף שנה</option>
                        <option value="קייטנה">קייטנה</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="pub-ev-date" className="block text-xs font-bold text-[#E6F2EB] mb-1">
                        בחירת תאריך *
                      </label>
                      <input
                        id="pub-ev-date"
                        type="date"
                        required
                        min={todayIso}
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white text-[#1C2A21] text-sm font-bold tabular-nums focus:outline-none ${
                          isDateBusy ? 'ring-4 ring-red-400 border-2 border-red-500' : ''
                        }`}
                      />
                    </div>

                    <div>
                      <label htmlFor="pub-ev-time" className="block text-xs font-bold text-[#E6F2EB] mb-1">
                        שעה מועדפת
                      </label>
                      <input
                        id="pub-ev-time"
                        type="time"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white text-[#1C2A21] text-sm font-bold tabular-nums focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Collision Alert OR Free Date Confirmation */}
                  {isDateBusy ? (
                    <div
                      role="alert"
                      className="rounded-2xl bg-red-600/95 border-2 border-[#F4B41A] p-4 space-y-2.5 text-white shadow-md"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-6 h-6 text-[#F4B41A] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm sm:text-base font-extrabold">
                            שימו לב — התאריך {formatHebrewShortDate(eventDate)} כבר תפוס ביומן של גאולה!
                          </p>
                          <p className="text-xs sm:text-sm text-white/95 mt-0.5">
                            בשעה {dateConflicts.map((c) => c.time || 'בתיאום').join(', ')} כבר קיימת פעילות משובצת. כדי שלא תהיה התנגשות, נא לבחור תאריך פנוי אחר מהאפשרויות למטה:
                          </p>
                        </div>
                      </div>
                      {nearestFreeDates.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-xs font-bold text-[#F4B41A]">תאריכים פנויים קרובים:</span>
                          {nearestFreeDates.map((iso) => (
                            <button
                              key={iso}
                              type="button"
                              onClick={() => setEventDate(iso)}
                              className="min-h-[36px] px-3 py-1 rounded-xl bg-white text-[#1F5E3B] text-xs font-extrabold hover:bg-[#FBF8F1] cursor-pointer active:scale-95 transition-transform"
                            >
                              ✅ {formatHebrewShortDate(iso)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white/15 border border-[#F4B41A]/50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                      <span className="font-extrabold text-[#F4B41A] inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>התאריך {formatHebrewShortDate(eventDate)} פנוי לשריון!</span>
                      </span>
                      {hasMorningKindergartenConflict && (
                        <span className="text-xs text-[#FBF8F1]">
                          * הערה: בשעות הבוקר מתקיימת פעילות בגנים — שעות אחר הצהריים (מ־15:30) פנויות לגמרי.
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="pub-ev-name" className="block text-xs font-bold text-[#E6F2EB] mb-1">
                        שם ההורה / איש הקשר *
                      </label>
                      <input
                        id="pub-ev-name"
                        type="text"
                        required
                        value={eventContactName}
                        onChange={(e) => setEventContactName(e.target.value)}
                        placeholder="לדוגמה: דנה לוי (יומולדת 5 למיקה)"
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white text-[#1C2A21] placeholder:text-[#4A554E]/70 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="pub-ev-phone" className="block text-xs font-bold text-[#E6F2EB] mb-1">
                        טלפון לוואטסאפ *
                      </label>
                      <input
                        id="pub-ev-phone"
                        type="tel"
                        required
                        value={eventContactPhone}
                        onChange={(e) => setEventContactPhone(e.target.value)}
                        placeholder="050-0000000"
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white text-[#1C2A21] placeholder:text-[#4A554E]/70 text-sm tabular-nums focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="pub-ev-city" className="block text-xs font-bold text-[#E6F2EB] mb-1">
                        עיר / כתובת האירוע
                      </label>
                      <input
                        id="pub-ev-city"
                        type="text"
                        value={eventCity}
                        onChange={(e) => setEventCity(e.target.value)}
                        placeholder="לדוגמה: פתח תקווה"
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white text-[#1C2A21] placeholder:text-[#4A554E]/70 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="pub-ev-notes" className="block text-xs font-bold text-[#E6F2EB] mb-1">
                      הערות וחיות שהילדים אוהבים (אופציונלי)
                    </label>
                    <input
                      id="pub-ev-notes"
                      type="text"
                      value={eventNotes}
                      onChange={(e) => setEventNotes(e.target.value)}
                      placeholder="גיל החוגג/ת, כמות ילדים משוערת, חיה מבוקשת..."
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white text-[#1C2A21] placeholder:text-[#4A554E]/70 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={isDateBusy}
                      className="min-h-[52px] px-6 py-3.5 rounded-2xl bg-[#F4B41A] hover:bg-[#E0A310] disabled:bg-white/25 disabled:text-white/60 disabled:cursor-not-allowed text-[#1C2A21] font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                    >
                      <Calendar className="w-5 h-5 shrink-0" />
                      <span>{isDateBusy ? 'התאריך תפוס — יש לבחור תאריך פנוי' : 'שמור ושריין תאריך אצל גאולה'}</span>
                    </button>

                    <a
                      href={eventWhatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[52px] px-5 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 transition-all"
                    >
                      <MessageCircle className="w-4 h-4 text-[#F4B41A] shrink-0" />
                      <span>בירור מהיר בוואטסאפ</span>
                    </a>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {submittedClassReg ? (
                <div className="rounded-2xl bg-white text-[#1C2A21] p-5 sm:p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-7 h-7 text-[#1F5E3B] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-extrabold text-[#1F5E3B]">
                        ההרשמה לחוג נקלטה בהצלחה!
                      </h3>
                      <p className="text-sm text-[#4A554E] mt-1">
                        {submittedClassReg.parentAndChildName} · {submittedClassReg.dayOrGroup}. גאולה תראה את ההרשמה ברשימת החוגים ותשמח לאשר מולכם.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <a
                      href={classWhatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#1F5E3B] text-white font-extrabold text-sm inline-flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4 text-[#F4B41A]" />
                      <span>שלח הודעה לגאולה בוואטסאפ</span>
                    </a>
                    {paymentSettings.defaultPaymentLinkUrl && (
                      <a
                        href={paymentSettings.defaultPaymentLinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#F4B41A] text-[#1C2A21] font-extrabold text-sm inline-flex items-center gap-2"
                      >
                        <span>מעבר לתשלום ({paymentSettings.defaultAmount} ₪)</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setClassParentChild('');
                        setClassPhone('');
                        setClassNotes('');
                        setSubmittedClassReg(null);
                      }}
                      className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#F3EDE0] text-[#6B4423] font-bold text-sm cursor-pointer"
                    >
                      רישום ילד נוסף
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitClass} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="pub-cl-name" className="block text-xs font-bold text-[#E6F2EB] mb-1">
                        שם ההורה והילד/ה (וגיל) *
                      </label>
                      <input
                        id="pub-cl-name"
                        type="text"
                        required
                        value={classParentChild}
                        onChange={(e) => setClassParentChild(e.target.value)}
                        placeholder="לדוגמה: מאיה (אמא של איתמר, בן 5)"
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white text-[#1C2A21] placeholder:text-[#4A554E]/70 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="pub-cl-phone" className="block text-xs font-bold text-[#E6F2EB] mb-1">
                        טלפון לוואטסאפ *
                      </label>
                      <input
                        id="pub-cl-phone"
                        type="tel"
                        required
                        value={classPhone}
                        onChange={(e) => setClassPhone(e.target.value)}
                        placeholder="050-0000000"
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white text-[#1C2A21] placeholder:text-[#4A554E]/70 text-sm tabular-nums focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="pub-cl-group" className="block text-xs font-bold text-[#E6F2EB] mb-1">
                        יום / קבוצה מועדפת
                      </label>
                      <input
                        id="pub-cl-group"
                        type="text"
                        value={classGroup}
                        onChange={(e) => setClassGroup(e.target.value)}
                        placeholder="לדוגמה: יום שלישי אחה״צ"
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white text-[#1C2A21] placeholder:text-[#4A554E]/70 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="pub-cl-notes" className="block text-xs font-bold text-[#E6F2EB] mb-1">
                      הערות / חיה אהובה (אופציונלי)
                    </label>
                    <input
                      id="pub-cl-notes"
                      type="text"
                      value={classNotes}
                      onChange={(e) => setClassNotes(e.target.value)}
                      placeholder="העדפות, רגישויות או שיעור ניסיון..."
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white text-[#1C2A21] placeholder:text-[#4A554E]/70 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="submit"
                      className="min-h-[52px] px-6 py-3.5 rounded-2xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                    >
                      <BookOpen className="w-5 h-5 shrink-0" />
                      <span>שליחת הרשמה לחוג</span>
                    </button>

                    <a
                      href={classWhatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[52px] px-5 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 transition-all"
                    >
                      <MessageCircle className="w-4 h-4 text-[#F4B41A] shrink-0" />
                      <span>שיחה בוואטסאפ</span>
                    </a>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-[#E6F2EB]">
            <a
              href={`tel:${brand.phone.replace(/[^\d+]/g, '')}`}
              className="inline-flex items-center gap-1.5 font-bold hover:text-[#F4B41A] tabular-nums"
            >
              <Phone className="w-4 h-4 text-[#F4B41A]" />
              <span>חיוג ישיר לגאולה: {brand.phone}</span>
            </a>
            <span>{brand.tagline}</span>
          </div>
        </section>
      </main>
    </div>
  );
};
