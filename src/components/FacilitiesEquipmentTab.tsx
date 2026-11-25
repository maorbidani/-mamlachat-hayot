import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  CheckSquare,
  Lightbulb,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react';
import { ANIMALS, CORE_CHECKLIST_ITEMS, EVENT_MODES } from '../data/animals';
import {
  AnimalEquipmentItem,
  AnimalId,
  CustomChecklistItem,
  EventMode,
  FacilityVisit,
} from '../types';
import { getLocalTodayIso } from '../utils/storage';

interface FacilitiesEquipmentTabProps {
  visits: FacilityVisit[];
  onAddVisit: (visit: Omit<FacilityVisit, 'id'>) => void;
  onDeleteVisit: (id: string) => void;
  packingAnimals: AnimalId[];
  onPackingAnimalsChange: (animals: AnimalId[]) => void;
  checkedItems: Record<string, boolean>;
  onToggleChecked: (itemId: string) => void;
  onResetChecks: () => void;
  customItems: CustomChecklistItem[];
  onAddCustomItem: (item: Omit<CustomChecklistItem, 'id'>) => void;
  onDeleteCustomItem: (id: string) => void;
}

export const FacilitiesEquipmentTab: React.FC<FacilitiesEquipmentTabProps> = ({
  visits,
  onAddVisit,
  onDeleteVisit,
  packingAnimals,
  onPackingAnimalsChange,
  checkedItems,
  onToggleChecked,
  onResetChecks,
  customItems,
  onAddCustomItem,
  onDeleteCustomItem,
}) => {
  // New Visit Form State
  const [facilityName, setFacilityName] = useState('');
  const [eventType, setEventType] = useState<EventMode>('גן ילדים');
  const [visitDate, setVisitDate] = useState(() => getLocalTodayIso());
  const [visitAnimals, setVisitAnimals] = useState<AnimalId[]>(['parrot', 'tortoise', 'rabbit']);
  const [visitNotes, setVisitNotes] = useState('');

  // Custom checklist input
  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] =
    useState<AnimalEquipmentItem['category']>('ציוד והובלה');

  // Group visits by facility name so we can show full history & smart suggestions per facility
  const facilitySummaries = useMemo(() => {
    const map = new Map<string, FacilityVisit[]>();
    visits.forEach((v) => {
      const key = v.facilityName.trim();
      const existing = map.get(key) || [];
      existing.push(v);
      map.set(key, existing);
    });

    return Array.from(map.entries()).map(([name, groupVisits]) => {
      const sorted = [...groupVisits].sort((a, b) => b.date.localeCompare(a.date));
      const visitedSet = new Set<AnimalId>();
      sorted.forEach((v) => v.animals.forEach((a) => visitedSet.add(a)));
      const unvisited = ANIMALS.filter((a) => !visitedSet.has(a.id));
      const suggested =
        unvisited.length > 0
          ? unvisited.slice(0, 3)
          : ANIMALS.filter((a) => !sorted[0].animals.includes(a.id)).slice(0, 3);

      return {
        name,
        visits: sorted,
        visitedAnimals: ANIMALS.filter((a) => visitedSet.has(a.id)),
        suggestedAnimals: suggested,
        allVisitedOnce: unvisited.length === 0,
      };
    });
  }, [visits]);

  const toggleVisitAnimal = (id: AnimalId) => {
    setVisitAnimals((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((a) => a !== id)
          : prev
        : [...prev, id]
    );
  };

  const handleCreateVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityName.trim()) return;
    onAddVisit({
      facilityName: facilityName.trim(),
      eventType,
      date: visitDate,
      animals: visitAnimals,
      notes: visitNotes.trim(),
    });
    setFacilityName('');
    setVisitNotes('');
  };

  const togglePackingAnimal = (id: AnimalId) => {
    const exists = packingAnimals.includes(id);
    if (exists && packingAnimals.length === 1) return;
    onPackingAnimalsChange(
      exists ? packingAnimals.filter((a) => a !== id) : [...packingAnimals, id]
    );
  };

  // Build combined checklist grouped by category
  const allChecklistItems = useMemo(() => {
    const animalSpecific: AnimalEquipmentItem[] = [];
    ANIMALS.forEach((animal) => {
      if (packingAnimals.includes(animal.id)) {
        animal.equipment.forEach((eq) => {
          animalSpecific.push({
            ...eq,
            label: `${eq.label} (${animal.name})`,
          });
        });
      }
    });
    return [...CORE_CHECKLIST_ITEMS, ...animalSpecific, ...customItems];
  }, [packingAnimals, customItems]);

  const categories: AnimalEquipmentItem['category'][] = [
    'ציוד והובלה',
    'האכלה ומים',
    'היגיינה ובטיחות',
  ];

  const completedCount = allChecklistItems.filter((item) => checkedItems[item.id]).length;

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    onAddCustomItem({
      label: newItemText.trim(),
      category: newItemCategory,
    });
    setNewItemText('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left / First Column in RTL: Facility History & Smart Suggestions */}
      <div className="lg:col-span-6 space-y-6">
        {/* Log New Visit Form */}
        <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
          <h2 className="text-xl font-bold text-[#1F5E3B] dark:text-[#7CD49E]">
            תיעוד ביקור במסגרת חינוכית
          </h2>
          <p className="text-sm text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
            שמרו אילו חיות כבר ביקרו בכל גן או קייטנה וקבלו המלצה חכמה לביקור הבא
          </p>

          <form onSubmit={handleCreateVisit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="facility-name" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                  שם המסגרת / הגן / האירוע
                </label>
                <input
                  id="facility-name"
                  type="text"
                  required
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  placeholder="לדוגמה: גן שקד / צהרון הדקל"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                />
              </div>

              <div>
                <label htmlFor="visit-date" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                  תאריך הביקור
                </label>
                <input
                  id="visit-date"
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="visit-event-type" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                סוג הפעילות
              </label>
              <select
                id="visit-event-type"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventMode)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
              >
                {EVENT_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1.5">
                בעלי החיים שהשתתפו בביקור
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ANIMALS.map((a) => {
                  const active = visitAnimals.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleVisitAnimal(a.id)}
                      className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap cursor-pointer transition-colors truncate ${
                        active
                          ? 'bg-[#1F5E3B] border-[#1F5E3B] text-white'
                          : 'bg-[#FBF8F1] dark:bg-[#223229] border-[#6B4423]/15 dark:border-[#E6EDE8]/10 text-[#4A554E] dark:text-[#B5C4BA]'
                      }`}
                    >
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="visit-notes" className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1">
                הערות להמשך (אופציונלי)
              </label>
              <input
                id="visit-notes"
                type="text"
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="לדוגמה: ביקשו בפעם הבאה דגש על זוחלים"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-[#1F5E3B] hover:bg-[#16462B] text-white font-bold text-sm inline-flex items-center justify-center gap-2 active:scale-95 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>שמור ביקור ביומן המסגרות</span>
            </button>
          </form>
        </section>

        {/* Facilities & Smart Suggestions List */}
        <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#1C2A21] dark:text-[#E6EDE8]">
              היסטוריית מסגרות והמלצות לביקור הבא
            </h3>
            <span className="text-xs font-semibold text-[#6B4423] dark:text-[#F4B41A] tabular-nums">
              {facilitySummaries.length} מסגרות
            </span>
          </div>

          {facilitySummaries.length === 0 ? (
            <p className="text-sm text-[#4A554E] dark:text-[#B5C4BA] py-4">
              עדיין לא נרשמו ביקורים. הוסיפו מסגרת למעלה כדי לעקוב אחר החיות ולגלות המלצות לביקור הבא.
            </p>
          ) : (
            <div className="divide-y divide-[#6B4423]/12 dark:divide-[#E6EDE8]/10">
              {facilitySummaries.map((facility) => (
                <div key={facility.name} className="py-4 first:pt-1 last:pb-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-[#1F5E3B] dark:text-[#7CD49E]">
                        {facility.name}
                      </h4>
                      <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] mt-0.5 tabular-nums">
                        {facility.visits.length} ביקורים מתועדים · ביקור אחרון: {facility.visits[0].date}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-[#1C2A21] dark:text-[#E6EDE8]">
                    <strong className="text-[#6B4423] dark:text-[#F4B41A]">כבר פגשו: </strong>
                    {facility.visitedAnimals.map((a) => a.name).join(' · ')}
                  </p>

                  {/* Smart suggestion row */}
                  <div className="rounded-2xl bg-[#FFF9E8] dark:bg-[#223229] border border-[#F4B41A]/50 dark:border-[#F4B41A]/30 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-[#6B4423] dark:text-[#F4B41A] shrink-0 mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        <span className="font-bold text-[#6B4423] dark:text-[#F4B41A] block">
                          {facility.allVisitedOnce
                            ? 'כבר פגשו את כל החיות! גיוון מומלץ:'
                            : 'המלצה חכמה לביקור הבא (טרם פגשו):'}
                        </span>
                        <span className="font-semibold text-[#1C2A21] dark:text-[#E6EDE8]">
                          {facility.suggestedAnimals.map((a) => a.name).join(' · ')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onPackingAnimalsChange(facility.suggestedAnimals.map((a) => a.id))
                      }
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] text-xs font-bold whitespace-nowrap shrink-0 active:scale-95 cursor-pointer transition-all"
                    >
                      טען לצ׳ק-ליסט ציוד
                    </button>
                  </div>

                  {/* Individual visit records */}
                  <div className="space-y-2 pt-1">
                    {facility.visits.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between gap-2 text-xs text-[#4A554E] dark:text-[#B5C4BA] bg-[#FBF8F1] dark:bg-[#223229] px-3 py-2 rounded-xl"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-semibold text-[#1C2A21] dark:text-[#E6EDE8] tabular-nums">
                            <Calendar className="w-3.5 h-3.5 text-[#1F5E3B] dark:text-[#7CD49E] shrink-0" />
                            <span>{v.date}</span>
                            <span>·</span>
                            <span>{v.eventType}</span>
                          </div>
                          {v.notes && <p className="mt-0.5 truncate">{v.notes}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteVisit(v.id)}
                          aria-label={`מחק ביקור ב${v.facilityName}`}
                          className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-[#6B4423]/70 dark:text-[#B5C4BA] hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Right / Second Column in RTL: Dynamic Equipment, Feeding & Hygiene Checklist */}
      <section className="lg:col-span-6 bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
          <div>
            <h2 className="text-xl font-bold text-[#1F5E3B] dark:text-[#7CD49E]">
              צ׳ק-ליסט ציוד, האכלה והיגיינה
            </h2>
            <p className="text-sm text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
              מתעדכן אוטומטית לפי החיות שיוצאות איתך להפעלה היום
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-extrabold text-[#1F5E3B] dark:text-[#7CD49E] tabular-nums">
              {completedCount} / {allChecklistItems.length} מוכן
            </span>
            <button
              type="button"
              onClick={onResetChecks}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F3EDE0] dark:bg-[#223229] hover:bg-[#EAE1CE] dark:hover:bg-[#2B3E33] text-[#6B4423] dark:text-[#F4B41A] text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap active:scale-95 transition-transform cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>איפוס סימונים</span>
            </button>
          </div>
        </div>

        {/* Select Animals for Today's Kit */}
        <div>
          <span className="block text-xs font-bold text-[#6B4423] dark:text-[#F4B41A] mb-2">
            בחרי אילו חיות יוצאות להפעלה:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ANIMALS.map((animal) => {
              const selected = packingAnimals.includes(animal.id);
              return (
                <button
                  key={animal.id}
                  type="button"
                  onClick={() => togglePackingAnimal(animal.id)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                    selected
                      ? 'bg-[#1F5E3B] border-[#1F5E3B] text-white'
                      : 'bg-[#FBF8F1] dark:bg-[#223229] border-[#6B4423]/15 dark:border-[#E6EDE8]/10 text-[#4A554E] dark:text-[#B5C4BA] hover:bg-[#F3EDE0]'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">{animal.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categorized Checklist */}
        <div className="space-y-5">
          {categories.map((cat) => {
            const items = allChecklistItems.filter((i) => i.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="pt-3 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
                <h3 className="text-sm font-bold text-[#6B4423] dark:text-[#F4B41A] mb-2.5">{cat}</h3>
                <ul className="space-y-1.5">
                  {items.map((item) => {
                    const checked = Boolean(checkedItems[item.id]);
                    const isCustom = item.id.startsWith('custom-');
                    return (
                      <li key={item.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleChecked(item.id)}
                          className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-right text-sm flex items-center gap-3 transition-colors cursor-pointer ${
                            checked
                              ? 'bg-[#1F5E3B]/8 dark:bg-[#1F5E3B]/20 text-[#4A554E] dark:text-[#8DA194] line-through'
                              : 'bg-[#FBF8F1] dark:bg-[#223229] hover:bg-[#F3EDE0] dark:hover:bg-[#2B3E33] text-[#1C2A21] dark:text-[#E6EDE8]'
                          }`}
                        >
                          {checked ? (
                            <CheckSquare className="w-5 h-5 text-[#1F5E3B] dark:text-[#7CD49E] shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-[#6B4423]/60 dark:text-[#F4B41A]/70 shrink-0" />
                          )}
                          <span className="leading-snug">{item.label}</span>
                        </button>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => onDeleteCustomItem(item.id)}
                            aria-label="הסר פריט"
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[#6B4423]/70 dark:text-[#B5C4BA] hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Add Custom Checklist Item */}
        <form onSubmit={handleAddCustom} className="pt-4 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 space-y-2">
          <span className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8]">
            הוספת פריט אישי לרשימה
          </span>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="לדוגמה: מערכת הגברה ניידת / כתר ליום הולדת"
              className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
            />
            <select
              value={newItemCategory}
              onChange={(e) =>
                setNewItemCategory(e.target.value as AnimalEquipmentItem['category'])
              }
              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-xs dark:text-[#E6EDE8] font-semibold"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] font-bold text-sm inline-flex items-center justify-center gap-1 whitespace-nowrap active:scale-95 transition-transform cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
