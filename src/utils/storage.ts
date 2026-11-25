import { ClassRegistrant, DayOfWeek, EventBooking } from '../types';

export const BOOKINGS_STORAGE_KEY = 'geula_event_bookings_v2';

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getLocalTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatInvoiceNumber(prefix: string, seq: number): string {
  const cleanPrefix = prefix.trim() || 'INV-';
  return `${cleanPrefix}${String(Math.max(1, seq)).padStart(3, '0')}`;
}

export function normalizeClassRegistrant(
  raw: Partial<ClassRegistrant>,
  defaultAmount = 180
): ClassRegistrant {
  const rawPayment = raw.payment;
  const amountNum =
    typeof rawPayment?.amount === 'number' && !Number.isNaN(rawPayment.amount)
      ? rawPayment.amount
      : defaultAmount;

  const rawAtt = raw.attendance;
  const sessionsPerCycle =
    typeof rawAtt?.sessionsPerCycle === 'number' && rawAtt.sessionsPerCycle > 0
      ? rawAtt.sessionsPerCycle
      : 4;
  const attendanceDates = Array.isArray(rawAtt?.attendanceDates)
    ? rawAtt.attendanceDates.filter((d): d is string => typeof d === 'string')
    : [];
  const sessionsCompleted =
    typeof rawAtt?.sessionsCompleted === 'number' && rawAtt.sessionsCompleted >= 0
      ? rawAtt.sessionsCompleted
      : attendanceDates.length;

  return {
    id: raw.id || `reg-${Date.now()}`,
    parentAndChildName: raw.parentAndChildName || '',
    phone: raw.phone || '',
    dayOrGroup: raw.dayOrGroup || '',
    notes: raw.notes || '',
    createdAt: raw.createdAt || getLocalTodayIso(),
    payment: {
      status: rawPayment?.status === 'שולם' ? 'שולם' : 'ממתין לתשלום',
      amount: amountNum,
      method: rawPayment?.method || 'ביט',
      paidDate: rawPayment?.paidDate || '',
      invoiceNumber: rawPayment?.invoiceNumber || '',
      paymentLinkOverride: rawPayment?.paymentLinkOverride || '',
      paymentNotes: rawPayment?.paymentNotes || '',
    },
    attendance: {
      sessionsCompleted,
      sessionsPerCycle,
      attendanceDates,
    },
  };
}

export async function copyTextToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

export function downloadCsvWithBom(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvLines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  const csvContent = `\uFEFF${csvLines.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function compressImageFile(
  file: File,
  maxDimension = 900,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function buildWhatsappUrl(
  rawPhone: string | undefined,
  fallbackDigits: string,
  text?: string
): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  let normalized = fallbackDigits;
  if (digits.length >= 9) {
    normalized = digits.startsWith('0')
      ? `972${digits.slice(1)}`
      : digits.startsWith('972')
        ? digits
        : `972${digits}`;
  }
  const base = `https://wa.me/${normalized}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function getLandingPageUrl(): string {
  if (typeof window === 'undefined') return '?view=landing';
  const url = new URL(window.location.href);
  url.hash = '';
  url.searchParams.set('view', 'landing');
  return url.toString();
}

export function buildWazeUrl(address: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(address.trim())}&navigate=yes`;
}

export function buildGoogleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

const JS_DAY_TO_HEBREW: Record<number, DayOfWeek | null> = {
  0: 'יום ראשון',
  1: 'יום שני',
  2: 'יום שלישי',
  3: 'יום רביעי',
  4: 'יום חמישי',
  5: 'יום שישי',
  6: null, // Shabbat
};

export function getHebrewDayOfWeekFromIsoDate(isoDate: string): DayOfWeek | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return JS_DAY_TO_HEBREW[dt.getDay()] ?? null;
}

export function formatHebrewShortDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dayNames = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];
  const dayLabel = dayNames[dt.getDay()] || '';
  return `יום ${dayLabel} ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}

export function findDateConflicts(
  isoDate: string,
  bookings: EventBooking[],
  excludeBookingId?: string
): EventBooking[] {
  if (!isoDate) return [];
  return bookings.filter(
    (b) => b.date === isoDate && b.id !== excludeBookingId
  );
}

/**
 * Checks both live localStorage ('geula_event_bookings_v2') and active state
 * so any booking saved in another tab or persisted locally is caught before save.
 */
export function checkBookingDateConflictInStorage(
  isoDate: string,
  inMemoryBookings: EventBooking[],
  excludeBookingId?: string
): EventBooking[] {
  if (!isoDate) return [];
  const mergedMap = new Map<string, EventBooking>();
  inMemoryBookings.forEach((b) => mergedMap.set(b.id, b));

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(BOOKINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          (parsed as EventBooking[]).forEach((b) => {
            if (b && typeof b === 'object' && typeof b.id === 'string') {
              mergedMap.set(b.id, b);
            }
          });
        }
      }
    } catch {
      // fallback to in-memory bookings
    }
  }

  return Array.from(mergedMap.values()).filter(
    (b) => b.date === isoDate && b.id !== excludeBookingId
  );
}

export function getNextAvailableDates(
  fromIsoDate: string,
  bookings: EventBooking[],
  count = 3
): string[] {
  const bookedSet = new Set(bookings.map((b) => b.date));
  const results: string[] = [];
  let cursor: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromIsoDate)) {
    const [y, m, d] = fromIsoDate.split('-').map(Number);
    cursor = new Date(y, m - 1, d);
  } else {
    cursor = new Date();
  }

  for (let i = 1; i <= 45 && results.length < count; i++) {
    const candidate = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i);
    if (candidate.getDay() === 6) continue; // Skip Saturday by default
    const iso = `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, '0')}-${String(
      candidate.getDate()
    ).padStart(2, '0')}`;
    if (!bookedSet.has(iso)) {
      results.push(iso);
    }
  }
  return results;
}
