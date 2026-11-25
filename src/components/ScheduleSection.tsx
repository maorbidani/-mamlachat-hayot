import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Baby,
  Cake,
  Calendar,
  ClipboardCheck,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Send,
  Tent,
} from 'lucide-react';
import { ANIMALS, DAYS_OF_WEEK } from '../data/animals';
import {
  AnimalId,
  BrandConfig,
  DayOfWeek,
  EventBooking,
  KindergartenRecord,
  MainRoute,
} from '../types';
import {
  buildGoogleMapsUrl,
  buildWazeUrl,
  buildWhatsappUrl,
  formatHebrewShortDate,
  getLocalTodayIso,
} from '../utils/storage';

interface ScheduleSectionProps {
  brand: BrandConfig;
  kindergartens: KindergartenRecord[];
  bookings: EventBooking[];
  onNavigate: (route: MainRoute) => void;
  onOpenChecklistForAnimals: (animals: AnimalId[]) => void;
  onOpenParentSummary?: (item: {
    sourceType: 'kindergarten' | 'birthday' | 'camp';
    title: string;
    animals: AnimalId[];
  }) => void;
}

type ScheduleFilter = 'הכל' | 'גנים' | 'ימי הולדת' | 'קייטנות';

interface ScheduledItem {
  id: string;
  sourceType: 'kindergarten' | 'birthday' | 'camp';
  title: string;
  subtitle: string;
  time: string;
  address: string;
  contactName: string;
  contactPhone: string;
  animals: AnimalId[];
  statusLabel?: string;
  dateIso: string;
  notes?: string;
}

function getWeekDates(weekOffset: number): { day: DayOfWeek; iso: string; shortLabel: string }[] {
  const now = new Date();
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + weekOffset * 7);
  return DAYS_OF_WEEK.map((day, idx) => {
    const dt = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + idx);
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
      dt.getDate()
    ).padStart(2, '0')}`;
    const shortLabel = `${String(dt.getDate()).padStart(2, '0')}.${String(
      dt.getMonth() + 1
    ).padStart(2, '0')}`;
    return { day, iso, shortLabel };
  });
}

function parseTimeMinutes(timeStr: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function detectDayCollisions(items: ScheduledItem[]): string[] {
  const warnings: string[] = [];
  const datedEvents = items.filter((i) => i.sourceType !== 'kindergarten');
  if (datedEvents.length > 1) {
    warnings.push(`קיימים ${datedEvents.length} אירועים פרטיים/קייטנות באותו תאריך — חשוב לוודא שאין חפיפה!`);
  }
  const timed = items
    .map((item) => ({ item, mins: parseTimeMinutes(item.time) }))
    .filter((x): x is { item: ScheduledItem; mins: number } => x.mins !== null)
    .sort((a, b) => a.mins - b.mins);

  for (let i = 0; i < timed.length - 1; i++) {
    const diff = timed[i + 1].mins - timed[i].mins;
    if (diff < 90) {
      warnings.push(
        `זמנים צפופים (${diff === 0 ? 'אותה שעה' : `הפרש ${diff} דק׳`}): ${timed[i].item.title} (${timed[i].item.time}) ו-${timed[i + 1].item.title} (${timed[i + 1].item.time})`
      );
    }
  }
  return warnings;
}

export const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  brand,
  kindergartens,
  bookings,
  onNavigate,
  onOpenChecklistForAnimals,
  onOpenParentSummary,
}) => {
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [filter, setFilter] = useState<ScheduleFilter>('הכל');
  const todayIso = getLocalTodayIso();

  const weekDays = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const weeklyPlan = useMemo(() => {
    return weekDays.map(({ day, iso, shortLabel }) => {
      const items: ScheduledItem[] = [];

      if (filter === 'הכל' || filter === 'גנים') {
        kindergartens
          .filter((kg) => kg.dayOfWeek === day)
          .forEach((kg) => {
            items.push({
              id: `kg-${kg.id}`,
              sourceType: 'kindergarten',
              title: kg.name,
              subtitle: kg.ageGroup ? `גן ילדים · ${kg.ageGroup}` : 'גן ילדים',
              time: kg.time || '09:30',
              address: kg.address,
              contactName: kg.contactName,
              contactPhone: kg.contactPhone,
              animals: kg.visitedAnimals,
              dateIso: iso,
              notes: kg.notes,
            });
          });
      }

      bookings
        .filter((b) => b.date === iso)
        .filter((b) => {
          if (filter === 'ימי הולדת') return b.kind === 'birthday';
          if (filter === 'קייטנות') return b.kind === 'camp';
          if (filter === 'גנים') return false;
          return true;
        })
        .forEach((b) => {
          items.push({
            id: `evt-${b.id}`,
            sourceType: b.kind,
            title: b.title,
            subtitle: b.kind === 'birthday' ? 'יום הולדת' : 'קייטנה',
            time: b.time || '16:00',
            address: b.location,
            contactName: b.contactName,
            contactPhone: b.contactPhone,
            animals: b.animals,
            statusLabel: b.status,
            dateIso: b.date,
            notes: b.notes,
          });
        });

      items.sort((a, b) => a.time.localeCompare(b.time));
      const collisions = detectDayCollisions(items);
      return { day, iso, shortLabel, items, collisions };
    });
  }, [weekDays, kindergartens, bookings, filter]);

  const weekIsoSet = useMemo(() => new Set(weekDays.map((w) => w.iso)), [weekDays]);

  const upcomingOtherDates = useMemo(() => {
    if (filter === 'גנים') return [];
    return bookings
      .filter((b) => !weekIsoSet.has(b.date) && b.date >= todayIso)
      .filter((b) => {
        if (filter === 'ימי הולדת') return b.kind === 'birthday';
        if (filter === 'קייטנות') return b.kind === 'camp';
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [bookings, weekIsoSet, filter, todayIso]);

  const totalWeekItems = weeklyPlan.reduce((sum, d) => sum + d.items.length, 0);
  const totalCollisions = weeklyPlan.reduce((sum, d) => sum + (d.collisions.length > 0 ? 1 : 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Week Switcher */}
      <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
              הלו״ז של גאולה — תצוגה מאוחדת
            </h2>
            <p className="text-sm text-[#4A554E] dark:text-[#B5C4BA] mt-0.5 tabular-nums">
              {totalWeekItems} פעילויות השבוע (גנים, ימי הולדת וקייטנות)
              {totalCollisions > 0 ? ` · ${totalCollisions} ימים עם התראת צפיפות` : ' · ללא התנגשויות השבוע'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-[#F3EDE0] dark:bg-[#223229] p-1 rounded-2xl">
            {[
              { offset: 0, label: 'השבוע' },
              { offset: 1, label: 'שבוע הבא' },
              { offset: 2, label: 'בעוד שבועיים' },
            ].map((w) => (
              <button
                key={w.offset}
                type="button"
                onClick={() => setWeekOffset(w.offset)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-all ${
                  weekOffset === w.offset
                    ? 'bg-[#1F5E3B] text-white'
                    : 'text-[#6B4423] dark:text-[#E6EDE8] hover:bg-white/60 dark:hover:bg-[#1B2820]/60'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div className="pt-3 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(['הכל', 'גנים', 'ימי הולדת', 'קייטנות'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  filter === tab
                    ? 'bg-[#6B4423] text-white'
                    : 'bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 text-[#4A554E] dark:text-[#B5C4BA] hover:bg-[#F3EDE0]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => onNavigate('kindergartens')}
              className="font-bold text-[#1F5E3B] dark:text-[#7CD49E] hover:underline cursor-pointer"
            >
              ניהול גנים
            </button>
            <span className="text-[#4A554E]/50">·</span>
            <button
              type="button"
              onClick={() => onNavigate('birthdays')}
              className="font-bold text-[#6B4423] dark:text-[#F4B41A] hover:underline cursor-pointer"
            >
              הוסף יום הולדת
            </button>
          </div>
        </div>
      </section>

      {/* Weekly Day Cards */}
      <div className="space-y-4">
        {weeklyPlan.map((dayBlock) => {
          const isToday = dayBlock.iso === todayIso;
          return (
          <section
            key={dayBlock.iso}
            className={`bg-white dark:bg-[#1B2820] rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 ${
              isToday
                ? 'border-2 border-[#1F5E3B] dark:border-[#7CD49E]'
                : 'border border-[#6B4423]/12 dark:border-[#E6EDE8]/10'
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1F5E3B] dark:text-[#7CD49E] shrink-0" />
                <h3 className="text-base sm:text-lg font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
                  {dayBlock.day}
                </h3>
                <span className="text-xs font-bold text-[#6B4423] dark:text-[#F4B41A] tabular-nums">
                  ({dayBlock.shortLabel})
                </span>
                {isToday && (
                  <span className="text-xs font-extrabold text-[#1F5E3B] dark:text-[#F4B41A]">
                    · היום
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-[#4A554E] dark:text-[#B5C4BA] tabular-nums">
                {dayBlock.items.length === 0 ? 'פנוי' : `${dayBlock.items.length} פעילויות`}
              </span>
            </div>

            {dayBlock.collisions.length > 0 && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-400/60 p-3 flex items-start gap-2 text-xs text-amber-950 dark:text-amber-200 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {dayBlock.collisions.map((warn, idx) => (
                    <p key={idx}>{warn}</p>
                  ))}
                </div>
              </div>
            )}

            {dayBlock.items.length === 0 ? (
              <p className="text-xs sm:text-sm text-[#4A554E] dark:text-[#B5C4BA] py-1">
                אין פעילויות משובצות ליום זה.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dayBlock.items.map((item) => {
                  const Icon =
                    item.sourceType === 'kindergarten'
                      ? Baby
                      : item.sourceType === 'birthday'
                        ? Cake
                        : Tent;
                  const accentClass =
                    item.sourceType === 'kindergarten'
                      ? 'bg-[#1F5E3B] text-white'
                      : item.sourceType === 'birthday'
                        ? 'bg-[#F4B41A] text-[#1C2A21]'
                        : 'bg-[#6B4423] text-white';

                  const animalNames = ANIMALS.filter((a) => item.animals.includes(a.id))
                    .map((a) => `${a.emoji} ${a.name}`)
                    .join(' · ');

                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 p-4 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accentClass}`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base font-extrabold text-[#1C2A21] dark:text-[#E6EDE8] truncate">
                                {item.title}
                              </h4>
                              <p className="text-xs font-semibold text-[#6B4423] dark:text-[#F4B41A] tabular-nums">
                                {item.subtitle} · שעה {item.time}
                                {item.statusLabel ? ` · ${item.statusLabel}` : ''}
                              </p>
                            </div>
                          </div>
                        </div>

                        {item.address && (
                          <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#6B4423] dark:text-[#F4B41A] shrink-0" />
                            <span>{item.address}</span>
                          </p>
                        )}

                        {animalNames && (
                          <p className="text-xs text-[#1C2A21] dark:text-[#D5E0D9] leading-relaxed">
                            {animalNames}
                          </p>
                        )}
                      </div>

                      {/* Navigation & Quick Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
                        {item.address && (
                          <>
                            <a
                              href={buildWazeUrl(item.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#1F5E3B] hover:bg-[#16462B] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all"
                            >
                              <Navigation className="w-3.5 h-3.5 text-[#F4B41A] shrink-0" />
                              <span>Waze</span>
                            </a>
                            <a
                              href={buildGoogleMapsUrl(item.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#1B2820] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-[#1C2A21] dark:text-[#E6EDE8] text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap active:scale-95 transition-all"
                            >
                              <MapPin className="w-3.5 h-3.5 text-[#6B4423] dark:text-[#F4B41A] shrink-0" />
                              <span>מפות</span>
                            </a>
                          </>
                        )}

                        {item.contactPhone && (
                          <a
                            href={buildWhatsappUrl(
                              item.contactPhone,
                              brand.whatsappDigits,
                              `היי ${item.contactName || 'יקר/ה'} 🌿 כאן גאולה מ״${brand.businessName}״, מתזכרת ומחכה לפגוש אתכם!`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap active:scale-95 transition-all"
                          >
                            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>וואטסאפ</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => onOpenChecklistForAnimals(item.animals)}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#F3EDE0] dark:bg-[#1B2820] text-[#6B4423] dark:text-[#F4B41A] text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>ציוד</span>
                        </button>

                        {onOpenParentSummary && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenParentSummary({
                                sourceType: item.sourceType,
                                title: item.title,
                                animals: item.animals,
                              })
                            }
                            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#1F5E3B]/10 dark:bg-[#1F5E3B]/30 text-[#1F5E3B] dark:text-[#7CD49E] text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 shrink-0" />
                            <span>סיכום להורים</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          );
        })}
      </div>

      {/* Upcoming Dated Events Beyond Selected Week */}
      {upcomingOtherDates.length > 0 && (
        <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 space-y-3">
          <h3 className="text-lg font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
            אירועים עתידיים נוספים ביומן ({upcomingOtherDates.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingOtherDates.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#6B4423] dark:text-[#F4B41A] tabular-nums">
                    {formatHebrewShortDate(b.date)} · שעה {b.time || 'בתיאום'} · {b.status}
                  </p>
                  <p className="text-sm font-extrabold text-[#1C2A21] dark:text-[#E6EDE8] truncate mt-0.5">
                    {b.kind === 'birthday' ? '🎂' : '🏕️'} {b.title}
                  </p>
                  {b.location && (
                    <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] truncate mt-0.5">
                      📍 {b.location}
                    </p>
                  )}
                </div>

                {b.location && (
                  <a
                    href={buildWazeUrl(b.location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#1F5E3B] text-white text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#F4B41A]" />
                    <span>Waze</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
