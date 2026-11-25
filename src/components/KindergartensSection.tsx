import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ClipboardCheck,
  Clock,
  Edit3,
  Lightbulb,
  MapPin,
  MessageCircle,
  Navigation,
  Plus,
  Search,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { ANIMALS, DAYS_OF_WEEK } from '../data/animals';
import { AnimalId, BrandConfig, DayOfWeek, KindergartenRecord } from '../types';
import { buildGoogleMapsUrl, buildWazeUrl, buildWhatsappUrl } from '../utils/storage';

interface KindergartensSectionProps {
  brand: BrandConfig;
  kindergartens: KindergartenRecord[];
  onSaveKindergarten: (record: KindergartenRecord) => void;
  onDeleteKindergarten: (id: string) => void;
  onOpenParentSummary: (kg: KindergartenRecord) => void;
  onOpenChecklistForAnimals?: (animals: AnimalId[]) => void;
}

const EMPTY_FORM: Omit<KindergartenRecord, 'id'> = {
  name: '',
  ageGroup: '',
  contactName: '',
  contactPhone: '',
  address: '',
  dayOfWeek: 'יום ראשון',
  time: '09:30',
  notes: '',
  visitedAnimals: [],
};

export const KindergartensSection: React.FC<KindergartensSectionProps> = ({
  brand,
  kindergartens,
  onSaveKindergarten,
  onDeleteKindergarten,
  onOpenParentSummary,
  onOpenChecklistForAnimals,
}) => {
  const [dayFilter, setDayFilter] = useState<DayOfWeek | 'הכל'>('הכל');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<KindergartenRecord, 'id'>>(EMPTY_FORM);

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
    setForm({
      ...EMPTY_FORM,
      dayOfWeek: dayFilter === 'הכל' ? 'יום ראשון' : dayFilter,
    });
    setModalOpen(true);
  };

  const openEditModal = (kg: KindergartenRecord) => {
    setEditingId(kg.id);
    setForm({
      name: kg.name,
      ageGroup: kg.ageGroup,
      contactName: kg.contactName,
      contactPhone: kg.contactPhone,
      address: kg.address,
      dayOfWeek: kg.dayOfWeek,
      time: kg.time,
      notes: kg.notes,
      visitedAnimals: kg.visitedAnimals,
      lastVisitDate: kg.lastVisitDate,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSaveKindergarten({
      ...form,
      id: editingId || `kg-${Date.now()}`,
      name: form.name.trim(),
      ageGroup: form.ageGroup.trim(),
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
    });
    setModalOpen(false);
  };

  const toggleFormAnimal = (id: AnimalId) => {
    setForm((prev) => ({
      ...prev,
      visitedAnimals: prev.visitedAnimals.includes(id)
        ? prev.visitedAnimals.filter((a) => a !== id)
        : [...prev.visitedAnimals, id],
    }));
  };

  const groupedByDay = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const visibleDays = dayFilter === 'הכל' ? DAYS_OF_WEEK : [dayFilter];
    return visibleDays
      .map((day) => ({
        day,
        items: kindergartens
          .filter((kg) => {
            if (kg.dayOfWeek !== day) return false;
            if (!q) return true;
            return (
              kg.name.toLowerCase().includes(q) ||
              kg.contactName.toLowerCase().includes(q) ||
              kg.address.toLowerCase().includes(q) ||
              kg.notes.toLowerCase().includes(q)
            );
          })
          .sort((a, b) => a.time.localeCompare(b.time)),
      }))
      .filter((group) => dayFilter !== 'הכל' || group.items.length > 0);
  }, [kindergartens, dayFilter, searchQuery]);

  const buildContactWhatsappUrl = (kg: KindergartenRecord) => {
    const visitedNames = ANIMALS.filter((a) => kg.visitedAnimals.includes(a.id))
      .map((a) => a.name)
      .join(', ');
    const greetingName = kg.contactName ? `היי ${kg.contactName}` : `שלום צוות ${kg.name}`;
    const msg = [
      `${greetingName} 🌿`,
      `כאן גאולה מ״${brand.businessName}״.`,
      `תודה רבה על המפגש המקסים היום ב${kg.name}${kg.ageGroup ? ` (${kg.ageGroup})` : ''}!`,
      visitedNames ? `היום הילדים פגשו את: ${visitedNames}.` : '',
      ``,
      `💛 ${brand.tagline}`,
      `לשליחה לקבוצת ההורים או תיאום מפגש נוסף: ${brand.phone}`,
    ]
      .filter(Boolean)
      .join('\n');

    return buildWhatsappUrl(kg.contactPhone, brand.whatsappDigits, msg);
  };

  return (
    <div className="space-y-6">
      {/* Header + Prominent Add Button */}
      <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
              גנים לפי ימי השבוע
            </h2>
            <p className="text-sm text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
              ניהול פרטי גנים, אנשי קשר לסיכום, כתובות והיסטוריית חיות שביקרו
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="min-h-[48px] px-5 py-3 rounded-2xl bg-[#1F5E3B] hover:bg-[#16462B] text-white font-bold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-5 h-5 text-[#F4B41A]" />
            <span>הוסף גן חדש</span>
          </button>
        </div>

        {/* Day Filter Bar + Search */}
        <div className="mt-4 pt-4 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setDayFilter('הכל')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 cursor-pointer transition-all ${
                dayFilter === 'הכל'
                  ? 'bg-[#6B4423] text-white'
                  : 'bg-[#F3EDE0] dark:bg-[#223229] text-[#6B4423] dark:text-[#E6EDE8] hover:bg-[#EAE1CE] dark:hover:bg-[#2B3E33]'
              }`}
            >
              כל הימים ({kindergartens.length})
            </button>
            {DAYS_OF_WEEK.map((day) => {
              const count = kindergartens.filter((k) => k.dayOfWeek === day).length;
              const active = dayFilter === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setDayFilter(day)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 cursor-pointer transition-all tabular-nums ${
                    active
                      ? 'bg-[#1F5E3B] text-white'
                      : 'bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 text-[#4A554E] dark:text-[#B5C4BA] hover:bg-[#F3EDE0] dark:hover:bg-[#2B3E33]'
                  }`}
                >
                  {day} {count > 0 ? `(${count})` : ''}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-64 shrink-0">
            <Search className="w-4 h-4 text-[#4A554E] dark:text-[#B5C4BA] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש שם גן, גננת או כתובת..."
              className="w-full min-h-[40px] pr-9 pl-3 py-1.5 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-xs sm:text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
            />
          </div>
        </div>
      </section>

      {/* Grouped Days List */}
      {groupedByDay.length === 0 ? (
        <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-8 text-center shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
          <p className="text-base font-bold text-[#1C2A21] dark:text-[#E6EDE8]">
            עדיין לא נוספו גנים ליום זה
          </p>
          <p className="text-sm text-[#4A554E] dark:text-[#B5C4BA] mt-1">
            לחצי על כפתור הפלוס למעלה כדי להוסיף גן חדש
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          {groupedByDay.map((group) => (
            <section key={group.day} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-extrabold text-[#6B4423] dark:text-[#F4B41A]">
                  {group.day}
                </h3>
                <span className="text-xs font-semibold text-[#4A554E] dark:text-[#B5C4BA] tabular-nums">
                  {group.items.length} גנים
                </span>
              </div>

              {group.items.length === 0 ? (
                <div className="bg-white dark:bg-[#1B2820] rounded-3xl p-6 text-center border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 text-sm text-[#4A554E] dark:text-[#B5C4BA]">
                  אין גנים משובצים ב{group.day}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.items.map((kg) => {
                    const visitedList = ANIMALS.filter((a) => kg.visitedAnimals.includes(a.id));
                    const unvisitedList = ANIMALS.filter((a) => !kg.visitedAnimals.includes(a.id));
                    const suggestedNext = unvisitedList.slice(0, 3);

                    return (
                      <article
                        key={kg.id}
                        className="bg-white dark:bg-[#1B2820] rounded-3xl p-5 shadow-sm border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xl font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
                                {kg.name}
                              </h4>
                              <p className="text-xs font-medium text-[#6B4423] dark:text-[#F4B41A] mt-0.5 tabular-nums">
                                {kg.ageGroup || 'גילאי גן'} · שעה {kg.time || 'בתיאום'}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEditModal(kg)}
                                aria-label={`ערוך ${kg.name}`}
                                className="min-h-[40px] min-w-[40px] rounded-xl bg-[#F3EDE0] dark:bg-[#223229] hover:bg-[#EAE1CE] dark:hover:bg-[#2B3E33] text-[#6B4423] dark:text-[#F4B41A] inline-flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {pendingDeleteId === kg.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteKindergarten(kg.id);
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
                                  onClick={() => setPendingDeleteId(kg.id)}
                                  aria-label={`מחק ${kg.name}`}
                                  className="min-h-[40px] min-w-[40px] rounded-xl bg-[#FBF8F1] dark:bg-[#223229] hover:bg-red-50 dark:hover:bg-red-950/40 text-[#6B4423]/70 dark:text-[#B5C4BA] hover:text-red-700 dark:hover:text-red-400 inline-flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5 text-sm text-[#1C2A21] dark:text-[#E6EDE8]">
                            {(kg.contactName || kg.contactPhone) && (
                              <p className="flex items-center gap-2 text-xs sm:text-sm">
                                <User className="w-4 h-4 text-[#1F5E3B] dark:text-[#7CD49E] shrink-0" />
                                <span>
                                  איש קשר לסיכום: <strong>{kg.contactName || 'צוות הגן'}</strong>
                                  {kg.contactPhone && (
                                    <span className="tabular-nums text-[#6B4423] dark:text-[#F4B41A]">
                                      {' '}
                                      · {kg.contactPhone}
                                    </span>
                                  )}
                                </span>
                              </p>
                            )}
                            {kg.address && (
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-[#4A554E] dark:text-[#B5C4BA]">
                                <p className="flex items-center gap-2 min-w-0">
                                  <MapPin className="w-4 h-4 text-[#6B4423] dark:text-[#F4B41A] shrink-0" />
                                  <span className="truncate">{kg.address}</span>
                                </p>
                                <div className="inline-flex items-center gap-1.5 shrink-0">
                                  <a
                                    href={buildWazeUrl(kg.address)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-[#1F5E3B]/10 dark:bg-[#1F5E3B]/35 text-[#1F5E3B] dark:text-[#7CD49E] text-[11px] font-extrabold inline-flex items-center gap-1 hover:bg-[#1F5E3B]/20 transition-colors"
                                  >
                                    <Navigation className="w-3 h-3" />
                                    <span>Waze</span>
                                  </a>
                                  <a
                                    href={buildGoogleMapsUrl(kg.address)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded-lg bg-[#F3EDE0] dark:bg-[#223229] text-[#6B4423] dark:text-[#F4B41A] text-[11px] font-bold hover:bg-[#EAE1CE] transition-colors"
                                  >
                                    מפות
                                  </a>
                                </div>
                              </div>
                            )}
                            {kg.time && (
                              <p className="flex items-center gap-2 text-xs sm:text-sm text-[#4A554E] dark:text-[#B5C4BA] tabular-nums">
                                <Clock className="w-4 h-4 text-[#6B4423] dark:text-[#F4B41A] shrink-0" />
                                <span>
                                  {kg.dayOfWeek} בשעה {kg.time}
                                </span>
                              </p>
                            )}
                          </div>

                          {kg.notes && (
                            <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] bg-[#FBF8F1] dark:bg-[#223229] px-3 py-2 rounded-xl">
                              {kg.notes}
                            </p>
                          )}

                          {/* Visited Animals & Smart Suggestion */}
                          <div className="pt-3 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 space-y-2 text-xs">
                            <p className="text-[#1C2A21] dark:text-[#E6EDE8]">
                              <strong className="text-[#1F5E3B] dark:text-[#7CD49E]">חיות שביקרו בגן: </strong>
                              {visitedList.length > 0
                                ? visitedList.map((a) => `${a.emoji} ${a.name}`).join(' · ')
                                : 'טרם תועדו ביקורים'}
                            </p>

                            {suggestedNext.length > 0 && (
                              <p className="flex items-start gap-1.5 text-[#6B4423] dark:text-[#F4B41A]">
                                <Lightbulb className="w-3.5 h-3.5 text-[#F4B41A] shrink-0 mt-0.5" />
                                <span>
                                  <strong>מומלץ לביקור הבא: </strong>
                                  {suggestedNext.map((a) => a.name).join(' · ')}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="pt-3 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <a
                            href={buildContactWhatsappUrl(kg)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[44px] px-3 py-2.5 rounded-xl bg-[#1F5E3B] hover:bg-[#16462B] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all"
                          >
                            <MessageCircle className="w-4 h-4 text-[#F4B41A] shrink-0" />
                            <span>סיכום לגננת</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => onOpenParentSummary(kg)}
                            className="min-h-[44px] px-3 py-2.5 rounded-xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 shrink-0" />
                            <span>מחולל להורים</span>
                          </button>

                          {onOpenChecklistForAnimals && (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenChecklistForAnimals(
                                  suggestedNext.length > 0
                                    ? suggestedNext.map((a) => a.id)
                                    : kg.visitedAnimals
                                )
                              }
                              className="min-h-[44px] px-3 py-2.5 rounded-xl bg-[#F3EDE0] dark:bg-[#223229] hover:bg-[#EAE1CE] dark:hover:bg-[#2B3E33] text-[#6B4423] dark:text-[#F4B41A] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>צ׳ק-ליסט ציוד</span>
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Add / Edit Kindergarten Modal */}
      {modalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingId ? 'עריכת פרטי גן' : 'הוספת גן חדש'}
        >
          <div className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto overscroll-contain bg-white dark:bg-[#1B2820] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
              <h3 className="text-xl font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
                {editingId ? 'עריכת פרטי גן' : 'הוספת גן חדש'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="kg-name" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                    שם הגן *
                  </label>
                  <input
                    id="kg-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="לדוגמה: גן רימון"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                  />
                </div>

                <div>
                  <label htmlFor="kg-age" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                    גיל הילדים בגן
                  </label>
                  <input
                    id="kg-age"
                    type="text"
                    value={form.ageGroup}
                    onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
                    placeholder="לדוגמה: גילאי 3–4"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="kg-contact" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                    שם הגננת / איש הקשר לסיכום
                  </label>
                  <input
                    id="kg-contact"
                    type="text"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    placeholder="לדוגמה: שירה הגננת"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                  />
                </div>

                <div>
                  <label htmlFor="kg-phone" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                    טלפון איש הקשר לוואטסאפ
                  </label>
                  <input
                    id="kg-phone"
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="050-0000000"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="kg-address" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                  כתובת
                </label>
                <input
                  id="kg-address"
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="רחוב, מספר ועיר"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="kg-day" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                    יום בשבוע
                  </label>
                  <select
                    id="kg-day"
                    value={form.dayOfWeek}
                    onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value as DayOfWeek })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="kg-time" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                    שעה
                  </label>
                  <input
                    id="kg-time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1.5">
                  חיות שכבר ביקרו בגן (למעקב חכם)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ANIMALS.map((a) => {
                    const active = form.visitedAnimals.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleFormAnimal(a.id)}
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
                <label htmlFor="kg-notes" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                  הערות (אופציונלי)
                </label>
                <textarea
                  id="kg-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="דגשים, חניה, אלרגיות או בקשות מיוחדות..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] px-5 py-3 rounded-2xl bg-[#1F5E3B] hover:bg-[#16462B] text-white font-bold text-sm active:scale-95 transition-all cursor-pointer"
                >
                  {editingId ? 'שמור שינויים' : 'הוסף גן'}
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
