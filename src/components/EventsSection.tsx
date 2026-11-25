import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  ClipboardCheck,
  Edit3,
  MapPin,
  MessageCircle,
  Navigation,
  Plus,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { ANIMALS } from '../data/animals';
import { AnimalId, BrandConfig, EventBooking, KindergartenRecord } from '../types';
import {
  buildGoogleMapsUrl,
  buildWazeUrl,
  buildWhatsappUrl,
  checkBookingDateConflictInStorage,
  findDateConflicts,
  formatHebrewShortDate,
  getHebrewDayOfWeekFromIsoDate,
  getLocalTodayIso,
  getNextAvailableDates,
} from '../utils/storage';

interface EventsSectionProps {
  kind: 'birthday' | 'camp';
  brand: BrandConfig;
  bookings: EventBooking[];
  kindergartens?: KindergartenRecord[];
  onSaveBooking: (booking: EventBooking) => void;
  onDeleteBooking: (id: string) => void;
  onOpenSummaryForBooking: (booking: EventBooking) => void;
  onOpenChecklistForAnimals: (animals: AnimalId[]) => void;
  onSwitchKind?: (next: 'birthday' | 'camp') => void;
}

export const EventsSection: React.FC<EventsSectionProps> = ({
  kind,
  brand,
  bookings,
  kindergartens = [],
  onSaveBooking,
  onDeleteBooking,
  onOpenSummaryForBooking,
  onOpenChecklistForAnimals,
  onSwitchKind,
}) => {
  const isBirthday = kind === 'birthday';
  const filteredBookings = bookings
    .filter((b) => b.kind === kind)
    .sort((a, b) => a.date.localeCompare(b.date));

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [confirmOverlapOverride, setConfirmOverlapOverride] = useState(false);
  const [overlapSubmitBlocked, setOverlapSubmitBlocked] = useState(false);
  const [form, setForm] = useState<Omit<EventBooking, 'id' | 'kind'>>({
    title: '',
    date: getLocalTodayIso(),
    time: isBirthday ? '16:30' : '10:00',
    location: '',
    contactName: '',
    contactPhone: '',
    animals: ['parrot', 'tortoise', 'rabbit'],
    status: 'מאושר',
    notes: '',
  });

  useEffect(() => {
    if (!modalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [modalOpen]);

  const openAddModal = () => {
    setEditingId(null);
    setConfirmOverlapOverride(false);
    setOverlapSubmitBlocked(false);
    setForm({
      title: '',
      date: getLocalTodayIso(),
      time: isBirthday ? '16:30' : '10:00',
      location: '',
      contactName: '',
      contactPhone: '',
      animals: ['parrot', 'tortoise', 'rabbit'],
      status: 'מאושר',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (b: EventBooking) => {
    setEditingId(b.id);
    setConfirmOverlapOverride(false);
    setOverlapSubmitBlocked(false);
    setForm({
      title: b.title,
      date: b.date,
      time: b.time,
      location: b.location,
      contactName: b.contactName,
      contactPhone: b.contactPhone,
      animals: b.animals,
      status: b.status,
      notes: b.notes,
    });
    setModalOpen(true);
  };

  const toggleAnimal = (id: AnimalId) => {
    setForm((prev) => ({
      ...prev,
      animals: prev.animals.includes(id)
        ? prev.animals.length > 1
          ? prev.animals.filter((a) => a !== id)
          : prev.animals
        : [...prev.animals, id],
    }));
  };

  const modalDateConflicts = useMemo(
    () =>
      modalOpen
        ? checkBookingDateConflictInStorage(form.date, bookings, editingId || undefined)
        : [],
    [modalOpen, form.date, bookings, editingId]
  );

  const modalWeekdayKindergartens = useMemo(() => {
    const heDay = getHebrewDayOfWeekFromIsoDate(form.date);
    if (!heDay) return [];
    return kindergartens.filter((kg) => kg.dayOfWeek === heDay);
  }, [form.date, kindergartens]);

  const modalFreeAlternatives = useMemo(
    () => (modalDateConflicts.length > 0 ? getNextAvailableDates(form.date, bookings, 3) : []),
    [modalDateConflicts.length, form.date, bookings]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    // Live check straight against localStorage right before saving
    const liveConflicts = checkBookingDateConflictInStorage(
      form.date,
      bookings,
      editingId || undefined
    );
    if (liveConflicts.length > 0 && !confirmOverlapOverride) {
      setOverlapSubmitBlocked(true);
      return;
    }

    onSaveBooking({
      ...form,
      id: editingId || `evt-${Date.now()}`,
      kind,
      title: form.title.trim(),
      location: form.location.trim(),
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      notes: form.notes.trim(),
    });
    setModalOpen(false);
  };

  const buildBookingWhatsapp = (b: EventBooking) => {
    const animalList = ANIMALS.filter((a) => b.animals.includes(a.id))
      .map((a) => `${a.emoji} ${a.name}`)
      .join(', ');

    const msg = [
      `שלום ${b.contactName || 'יקר/ה'} 🐾`,
      `כאן גאולה מ״${brand.businessName}״.`,
      `מתרגשת לקראת ${b.title} בתאריך ${b.date}${b.time ? ` בשעה ${b.time}` : ''}!`,
      b.location ? `📍 מיקום: ${b.location}` : '',
      animalList ? `🌿 החיות שיגיעו לשמח: ${animalList}` : '',
      ``,
      `💛 ${brand.tagline}`,
      `לעדכונים ושאלות: ${brand.phone}`,
    ]
      .filter(Boolean)
      .join('\n');

    return buildWhatsappUrl(b.contactPhone, brand.whatsappDigits, msg);
  };

  const quickSelfQuoteUrl = `https://wa.me/${brand.whatsappDigits}?text=${encodeURIComponent(
    isBirthday
      ? `שלום גאולה! 🎈 אשמח לתאם הצעת מחיר ליום הולדת עם ממלכת החיות.`
      : `שלום גאולה! 🏕️ אשמח לתאם הפעלת בעלי חיים לקייטנה.`
  )}`;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 space-y-4">
        {onSwitchKind && (
          <div className="inline-flex rounded-xl bg-[#F3EDE0] dark:bg-[#223229] p-1 gap-1">
            <button
              type="button"
              onClick={() => onSwitchKind('birthday')}
              className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap transition-colors cursor-pointer ${
                isBirthday
                  ? 'bg-[#1F5E3B] text-white'
                  : 'text-[#6B4423] dark:text-[#E6EDE8] hover:bg-white/60 dark:hover:bg-[#1B2820]/60'
              }`}
            >
              ימי הולדת
            </button>
            <button
              type="button"
              onClick={() => onSwitchKind('camp')}
              className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap transition-colors cursor-pointer ${
                !isBirthday
                  ? 'bg-[#1F5E3B] text-white'
                  : 'text-[#6B4423] dark:text-[#E6EDE8] hover:bg-white/60 dark:hover:bg-[#1B2820]/60'
              }`}
            >
              קייטנות
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
              {isBirthday ? 'ימי הולדת ואירועים פרטיים' : 'קייטנות והפעלות חופשה'}
            </h2>
            <p className="text-sm text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
              {isBirthday
                ? 'ניהול ימי הולדת קרובים, בחירת החיות לכוכב המסיבה ושליחת הצעות וסיכומים בוואטסאפ'
                : 'מעקב קייטנות מתוכננות, הכנת ציוד מותאם ושיתוף הודעות לרכזים ולהורים'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href={quickSelfQuoteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] px-4 py-3 rounded-2xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>שלח הצעה בוואטסאפ</span>
            </a>

            <button
              type="button"
              onClick={openAddModal}
              className="min-h-[48px] px-5 py-3 rounded-2xl bg-[#1F5E3B] hover:bg-[#16462B] text-white font-bold text-sm inline-flex items-center gap-2 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5 text-[#F4B41A]" />
              <span>{isBirthday ? 'הוסף יום הולדת' : 'הוסף קייטנה'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-8 text-center shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
          <p className="text-base font-bold text-[#1C2A21] dark:text-[#E6EDE8]">
            {isBirthday ? 'אין עדיין ימי הולדת רשומים' : 'אין עדיין קייטנות רשומות'}
          </p>
          <p className="text-sm text-[#4A554E] dark:text-[#B5C4BA] mt-1">
            לחצי על כפתור הוספה למעלה כדי לשמור אירוע חדש
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((b) => {
            const animalList = ANIMALS.filter((a) => b.animals.includes(a.id));
            const sameDayOthers = findDateConflicts(b.date, bookings, b.id);
            return (
              <article
                key={b.id}
                className={`bg-white dark:bg-[#1B2820] rounded-3xl p-5 shadow-sm border flex flex-col justify-between space-y-4 ${
                  sameDayOthers.length > 0
                    ? 'border-amber-500/70'
                    : 'border-[#6B4423]/15 dark:border-[#E6EDE8]/10'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-[#6B4423] dark:text-[#F4B41A]">
                        סטטוס: {b.status}
                        {b.source === 'landing' ? ' · נרשם מדף הנחיתה' : ''}
                      </p>
                      <h3 className="text-xl font-extrabold text-[#1F5E3B] dark:text-[#7CD49E] mt-0.5">
                        {b.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        aria-label={`ערוך ${b.title}`}
                        className="min-h-[40px] min-w-[40px] rounded-xl bg-[#F3EDE0] dark:bg-[#223229] hover:bg-[#EAE1CE] dark:hover:bg-[#2B3E33] text-[#6B4423] dark:text-[#F4B41A] inline-flex items-center justify-center active:scale-95 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {pendingDeleteId === b.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteBooking(b.id);
                              setPendingDeleteId(null);
                            }}
                            className="min-h-[40px] px-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                          >
                            אשר מחיקה
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(null)}
                            className="min-h-[40px] px-2 rounded-xl bg-[#F3EDE0] dark:bg-[#223229] text-[#6B4423] dark:text-[#E6EDE8] text-xs font-bold cursor-pointer"
                          >
                            ביטול
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(b.id)}
                          aria-label={`מחק ${b.title}`}
                          className="min-h-[40px] min-w-[40px] rounded-xl bg-[#FBF8F1] dark:bg-[#223229] hover:bg-red-50 dark:hover:bg-red-950/40 text-[#6B4423]/70 dark:text-[#B5C4BA] hover:text-red-700 dark:hover:text-red-400 inline-flex items-center justify-center active:scale-95 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {sameDayOthers.length > 0 && (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-400/60 px-3 py-2 flex items-start gap-2 text-xs text-amber-950 dark:text-amber-200 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        שימי לב: תאריך זה תפוס גם עם {sameDayOthers.map((o) => `${o.title} (${o.time || 'בתיאום'})`).join(', ')}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs sm:text-sm text-[#1C2A21] dark:text-[#E6EDE8]">
                    <p className="flex items-center gap-2 tabular-nums">
                      <Calendar className="w-4 h-4 text-[#1F5E3B] dark:text-[#7CD49E] shrink-0" />
                      <span>
                        {b.date} · שעה {b.time || 'בתיאום'}
                      </span>
                    </p>
                    {b.location && (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[#4A554E] dark:text-[#B5C4BA]">
                        <p className="flex items-center gap-2 min-w-0">
                          <MapPin className="w-4 h-4 text-[#6B4423] dark:text-[#F4B41A] shrink-0" />
                          <span className="truncate">{b.location}</span>
                        </p>
                        <div className="inline-flex items-center gap-1.5 shrink-0">
                          <a
                            href={buildWazeUrl(b.location)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-[#1F5E3B]/10 dark:bg-[#1F5E3B]/35 text-[#1F5E3B] dark:text-[#7CD49E] text-[11px] font-extrabold inline-flex items-center gap-1 hover:bg-[#1F5E3B]/20"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Waze</span>
                          </a>
                          <a
                            href={buildGoogleMapsUrl(b.location)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded-lg bg-[#F3EDE0] dark:bg-[#223229] text-[#6B4423] dark:text-[#F4B41A] text-[11px] font-bold hover:bg-[#EAE1CE]"
                          >
                            מפות
                          </a>
                        </div>
                      </div>
                    )}
                    {(b.contactName || b.contactPhone) && (
                      <p className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#1F5E3B] dark:text-[#7CD49E] shrink-0" />
                        <span>
                          {b.contactName || 'איש קשר'}
                          {b.contactPhone && (
                            <span className="tabular-nums text-[#6B4423] dark:text-[#F4B41A]">
                              {' '}
                              · {b.contactPhone}
                            </span>
                          )}
                        </span>
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-[#1C2A21] dark:text-[#E6EDE8] pt-2 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
                    <strong className="text-[#6B4423] dark:text-[#F4B41A]">חיות באירוע: </strong>
                    {animalList.map((a) => `${a.emoji} ${a.name}`).join(' · ')}
                  </p>

                  {b.notes && (
                    <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] bg-[#FBF8F1] dark:bg-[#223229] px-3 py-2 rounded-xl">
                      {b.notes}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <a
                    href={buildBookingWhatsapp(b)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-[#1F5E3B] hover:bg-[#16462B] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#F4B41A] shrink-0" />
                    <span>וואטסאפ</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => onOpenSummaryForBooking(b)}
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>סיכום להורים</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenChecklistForAnimals(b.animals)}
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-[#F3EDE0] dark:bg-[#223229] hover:bg-[#EAE1CE] dark:hover:bg-[#2B3E33] text-[#6B4423] dark:text-[#F4B41A] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>צ׳ק-ליסט ציוד</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Booking Modal */}
      {modalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingId ? 'עריכת אירוע' : 'הוספת אירוע'}
        >
          <div className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto overscroll-contain bg-white dark:bg-[#1B2820] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
              <h3 className="text-xl font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
                {editingId
                  ? 'עריכת פרטי אירוע'
                  : isBirthday
                    ? 'הוספת יום הולדת חדש'
                    : 'הוספת קייטנה חדשה'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="סגור חלון"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-[#F3EDE0] dark:bg-[#223229] text-[#6B4423] dark:text-[#E6EDE8] inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="evt-title" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                  {isBirthday ? 'שם החוגג/ת וגיל *' : 'שם הקייטנה / מסגרת *'}
                </label>
                <input
                  id="evt-title"
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={
                    isBirthday ? 'לדוגמה: יום ההולדת של אביגיל (בת 5)' : 'לדוגמה: קייטנת פסח אלון'
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="evt-date" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                    תאריך
                  </label>
                  <input
                    id="evt-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => {
                      setConfirmOverlapOverride(false);
                      setOverlapSubmitBlocked(false);
                      setForm({ ...form, date: e.target.value });
                    }}
                    className={`w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] text-sm dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 ${
                      modalDateConflicts.length > 0
                        ? 'border-2 border-red-500 ring-2 ring-red-400/50 focus:ring-red-500'
                        : 'border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 focus:ring-[#1F5E3B]'
                    }`}
                  />
                </div>
                <div>
                  <label htmlFor="evt-time" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                    שעה
                  </label>
                  <input
                    id="evt-time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                  />
                </div>
                <div>
                  <label htmlFor="evt-status" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                    סטטוס
                  </label>
                  <select
                    id="evt-status"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as EventBooking['status'] })
                    }
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                  >
                    <option value="מאושר">מאושר</option>
                    <option value="ממתין לאישור">ממתין לאישור</option>
                    <option value="התקיים">התקיים</option>
                  </select>
                </div>
              </div>

              {modalDateConflicts.length > 0 && (
                <div
                  role="alert"
                  className={`rounded-2xl p-4 space-y-2.5 text-xs transition-all ${
                    overlapSubmitBlocked
                      ? 'bg-red-600 text-white border-2 border-[#F4B41A] shadow-md'
                      : 'bg-red-50 dark:bg-red-950/50 border-2 border-red-500 text-red-950 dark:text-red-100'
                  }`}
                >
                  <div className="flex items-start gap-2.5 font-extrabold">
                    <AlertTriangle
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        overlapSubmitBlocked ? 'text-[#F4B41A]' : 'text-red-600 dark:text-red-400'
                      }`}
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-black">
                        התראת התנגשות! כבר קיים אירוע בתאריך {formatHebrewShortDate(form.date)}
                      </p>
                      <ul className="space-y-0.5 font-semibold">
                        {modalDateConflicts.map((c) => (
                          <li key={c.id}>
                            • {c.title} ({c.kind === 'birthday' ? 'יום הולדת' : 'קייטנה'} · שעה{' '}
                            {c.time || 'בתיאום'}
                            {c.location ? ` · ${c.location}` : ''})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {modalFreeAlternatives.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="font-bold">מעבר לתאריך פנוי קרוב:</span>
                      {modalFreeAlternatives.map((iso) => (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => {
                            setConfirmOverlapOverride(false);
                            setOverlapSubmitBlocked(false);
                            setForm((prev) => ({ ...prev, date: iso }));
                          }}
                          className="min-h-[34px] px-2.5 py-1 rounded-xl bg-white dark:bg-[#1B2820] border border-[#1F5E3B]/30 text-[#1F5E3B] dark:text-[#7CD49E] font-extrabold hover:bg-[#F3EDE0] cursor-pointer"
                        >
                          ✅ {formatHebrewShortDate(iso)}
                        </button>
                      ))}
                    </div>
                  )}

                  <label
                    className={`flex items-center gap-2.5 pt-2 border-t cursor-pointer select-none ${
                      overlapSubmitBlocked ? 'border-white/25' : 'border-red-300 dark:border-red-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={confirmOverlapOverride}
                      onChange={(e) => {
                        setConfirmOverlapOverride(e.target.checked);
                        if (e.target.checked) setOverlapSubmitBlocked(false);
                      }}
                      className="w-4 h-4 accent-[#1F5E3B] shrink-0 cursor-pointer"
                    />
                    <span className="font-bold">
                      אני מאשרת לשמור בתאריך זה למרות שקיים בו כבר אירוע אחר (למשל בשעה שונה)
                    </span>
                  </label>
                </div>
              )}

              {modalWeekdayKindergartens.length > 0 && (
                <p className="rounded-xl bg-[#F3EDE0] dark:bg-[#223229] px-3 py-2 text-xs text-[#6B4423] dark:text-[#F4B41A] font-semibold">
                  תזכורת בוקר ({getHebrewDayOfWeekFromIsoDate(form.date)}): יש גנים קבועים בבוקר —{' '}
                  {modalWeekdayKindergartens.map((k) => `${k.name} (${k.time})`).join(', ')}.
                </p>
              )}

              <div>
                <label htmlFor="evt-location" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                  כתובת / עיר
                </label>
                <input
                  id="evt-location"
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="כתובת מלאה או שם המתנ״ס"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="evt-contact" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                    שם איש קשר
                  </label>
                  <input
                    id="evt-contact"
                    type="text"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    placeholder="שם ההורה / הרכז"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                  />
                </div>
                <div>
                  <label htmlFor="evt-phone" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                    טלפון לוואטסאפ
                  </label>
                  <input
                    id="evt-phone"
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="050-0000000"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1.5">
                  בעלי החיים באירוע
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ANIMALS.map((a) => {
                    const active = form.animals.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAnimal(a.id)}
                        className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-[#1F5E3B] border-[#1F5E3B] text-white'
                            : 'bg-[#FBF8F1] dark:bg-[#223229] border-[#6B4423]/15 dark:border-[#E6EDE8]/10 text-[#4A554E] dark:text-[#B5C4BA]'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>{a.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="evt-notes" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                  הערות
                </label>
                <textarea
                  id="evt-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="מספר ילדים, דגשים או בקשות מיוחדות..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className={`flex-1 min-h-[48px] px-5 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-all cursor-pointer ${
                    modalDateConflicts.length > 0 && !confirmOverlapOverride
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : modalDateConflicts.length > 0
                        ? 'bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21]'
                        : 'bg-[#1F5E3B] hover:bg-[#16462B] text-white'
                  }`}
                >
                  {modalDateConflicts.length > 0 && !confirmOverlapOverride
                    ? 'תאריך תפוס — אשרי התראה למעלה או בחרי תאריך'
                    : modalDateConflicts.length > 0
                      ? 'שמור למרות ההתנגשות'
                      : editingId
                        ? 'שמור שינויים'
                        : 'שמור אירוע'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[48px] px-5 py-3 rounded-2xl bg-[#F3EDE0] dark:bg-[#223229] text-[#6B4423] dark:text-[#E6EDE8] font-bold text-sm cursor-pointer"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
