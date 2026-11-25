import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Link2,
  MessageCircle,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Settings2,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import {
  BrandConfig,
  ClassPaymentSettings,
  ClassRegistrant,
  PaymentMethod,
  PaymentStatus,
} from '../types';
import {
  buildWhatsappUrl,
  copyTextToClipboard,
  downloadCsvWithBom,
  formatInvoiceNumber,
  getLocalTodayIso,
} from '../utils/storage';

interface ClassesSectionProps {
  brand: BrandConfig;
  registrants: ClassRegistrant[];
  paymentSettings: ClassPaymentSettings;
  onUpdatePaymentSettings: (next: ClassPaymentSettings) => void;
  onSaveRegistrant: (registrant: ClassRegistrant) => void;
  onDeleteRegistrant: (id: string) => void;
  onNotify: (message: string) => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'ביט',
  'פייבוקס',
  'העברה בנקאית',
  'כרטיס אשראי',
  'מזומן',
];

interface RegistrantFormState {
  parentAndChildName: string;
  phone: string;
  dayOrGroup: string;
  notes: string;
  createdAt: string;
  status: PaymentStatus;
  amount: string;
  method: PaymentMethod;
  paidDate: string;
  invoiceNumber: string;
  paymentLinkOverride: string;
  paymentNotes: string;
  sessionsPerCycle: string;
}

function createEmptyForm(defaultAmount: number): RegistrantFormState {
  return {
    parentAndChildName: '',
    phone: '',
    dayOrGroup: '',
    notes: '',
    createdAt: getLocalTodayIso(),
    status: 'ממתין לתשלום',
    amount: String(defaultAmount || 180),
    method: 'ביט',
    paidDate: '',
    invoiceNumber: '',
    paymentLinkOverride: '',
    paymentNotes: '',
    sessionsPerCycle: '4',
  };
}

export const ClassesSection: React.FC<ClassesSectionProps> = ({
  brand,
  registrants,
  paymentSettings,
  onUpdatePaymentSettings,
  onSaveRegistrant,
  onDeleteRegistrant,
  onNotify,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RegistrantFormState>(() =>
    createEmptyForm(paymentSettings.defaultAmount)
  );

  const [invoiceRegistrant, setInvoiceRegistrant] = useState<ClassRegistrant | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<ClassPaymentSettings>(paymentSettings);

  const [statusFilter, setStatusFilter] = useState<'הכל' | PaymentStatus>('הכל');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [copiedTable, setCopiedTable] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [brand.logoImage]);

  useEffect(() => {
    setSettingsDraft(paymentSettings);
  }, [paymentSettings]);

  // Keep open invoice modal synced if registrant is edited
  useEffect(() => {
    if (!invoiceRegistrant) return;
    const latest = registrants.find((r) => r.id === invoiceRegistrant.id);
    if (latest) {
      setInvoiceRegistrant(latest);
    } else {
      setInvoiceRegistrant(null);
    }
  }, [registrants, invoiceRegistrant]);

  // Escape key & scroll lock for modals
  useEffect(() => {
    if (!modalOpen && !invoiceRegistrant) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false);
        setInvoiceRegistrant(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [modalOpen, invoiceRegistrant]);

  const promoMessage = useMemo(
    () =>
      [
        `🌿 *חוגי חיות עם ${brand.businessName}* 🦜🐢🐰`,
        `חוויה שבועית קבועה, מרגשת וחינוכית לילדים שאוהבים טבע ובעלי חיים!`,
        ``,
        `✨ *מה מחכה לילדים בחוג?*`,
        `• היכרות מקרוב וליטוף עדין של תוכי אקלקטוס, צב יבשה, שרקן, ארנבון, נחש וחרדון`,
        `• פיתוח חמלה, סבלנות, ביטחון עצמי והתגברות על פחדים`,
        `• משחקי תנועה, סיפורים, טריוויה וויסות חושי בקבוצה קטנה`,
        ``,
        `📍 קבוצות גיל מותאמות · יחס אישי ובטיחות מלאה`,
        `📞 לפרטים והרשמה לשיעור ניסיון: *${brand.phone}*`,
        `💬 להודעה מהירה בוואטסאפ: https://wa.me/${brand.whatsappDigits}`,
      ].join('\n'),
    [brand]
  );

  const promoWhatsappUrl = `https://wa.me/${brand.whatsappDigits}?text=${encodeURIComponent(
    promoMessage
  )}`;

  const stats = useMemo(() => {
    let paidCount = 0;
    let pendingCount = 0;
    let totalPaid = 0;
    let totalPending = 0;
    for (const r of registrants) {
      const amt = Number(r.payment?.amount) || 0;
      if (r.payment?.status === 'שולם') {
        paidCount += 1;
        totalPaid += amt;
      } else {
        pendingCount += 1;
        totalPending += amt;
      }
    }
    return { paidCount, pendingCount, totalPaid, totalPending };
  }, [registrants]);

  const filteredRegistrants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return registrants.filter((r) => {
      if (statusFilter !== 'הכל' && r.payment.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.parentAndChildName.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.dayOrGroup.toLowerCase().includes(q) ||
        r.payment.invoiceNumber.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
      );
    });
  }, [registrants, statusFilter, searchQuery]);

  const handleCopyPromo = async () => {
    await copyTextToClipboard(promoMessage);
    setCopiedPromo(true);
    onNotify('מודעת הפרסום לחוג הועתקה! מוכנה להדבקה בוואטסאפ ובפייסבוק');
    window.setTimeout(() => setCopiedPromo(false), 2400);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePaymentSettings({
      defaultAmount: Math.max(0, Number(settingsDraft.defaultAmount) || 0),
      defaultPaymentLinkUrl: settingsDraft.defaultPaymentLinkUrl.trim(),
      paymentNote: settingsDraft.paymentNote.trim(),
      invoicePrefix: settingsDraft.invoicePrefix.trim() || 'INV-2026-',
      nextInvoiceSeq: Math.max(1, Number(settingsDraft.nextInvoiceSeq) || 1),
    });
    setSettingsOpen(false);
    onNotify('הגדרות התשלום וקישור הגבייה נשמרו');
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(createEmptyForm(paymentSettings.defaultAmount));
    setModalOpen(true);
  };

  const openEditModal = (reg: ClassRegistrant) => {
    setEditingId(reg.id);
    setForm({
      parentAndChildName: reg.parentAndChildName,
      phone: reg.phone,
      dayOrGroup: reg.dayOrGroup,
      notes: reg.notes,
      createdAt: reg.createdAt || getLocalTodayIso(),
      status: reg.payment.status,
      amount: String(reg.payment.amount),
      method: reg.payment.method,
      paidDate: reg.payment.paidDate,
      invoiceNumber: reg.payment.invoiceNumber,
      paymentLinkOverride: reg.payment.paymentLinkOverride || '',
      paymentNotes: reg.payment.paymentNotes || '',
      sessionsPerCycle: String(reg.attendance?.sessionsPerCycle || 4),
    });
    setModalOpen(true);
  };

  const handleFormStatusChange = (nextStatus: PaymentStatus) => {
    setForm((prev) => {
      if (nextStatus === 'שולם') {
        const nextInv =
          prev.invoiceNumber.trim() ||
          formatInvoiceNumber(paymentSettings.invoicePrefix, paymentSettings.nextInvoiceSeq);
        return {
          ...prev,
          status: nextStatus,
          paidDate: prev.paidDate || getLocalTodayIso(),
          invoiceNumber: nextInv,
        };
      }
      return { ...prev, status: nextStatus };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.parentAndChildName.trim()) return;

    const autoGeneratedInvoice = formatInvoiceNumber(
      paymentSettings.invoicePrefix,
      paymentSettings.nextInvoiceSeq
    );

    const finalInvoiceNumber =
      form.status === 'שולם'
        ? form.invoiceNumber.trim() || autoGeneratedInvoice
        : form.invoiceNumber.trim();

    const usedAutoSequence =
      form.status === 'שולם' && finalInvoiceNumber === autoGeneratedInvoice;

    const existingReg = editingId ? registrants.find((r) => r.id === editingId) : undefined;
    const prevAttendance = existingReg?.attendance || {
      sessionsCompleted: 0,
      sessionsPerCycle: 4,
      attendanceDates: [],
    };
    const nextSessionsPerCycle = Math.max(1, Number(form.sessionsPerCycle) || 4);

    const saved: ClassRegistrant = {
      id: editingId || `reg-${Date.now()}`,
      parentAndChildName: form.parentAndChildName.trim(),
      phone: form.phone.trim(),
      dayOrGroup: form.dayOrGroup.trim() || 'קבוצת חוג חדשה',
      notes: form.notes.trim(),
      createdAt: form.createdAt || getLocalTodayIso(),
      payment: {
        status: form.status,
        amount: Math.max(0, Number(form.amount) || 0),
        method: form.method,
        paidDate: form.status === 'שולם' ? form.paidDate || getLocalTodayIso() : form.paidDate,
        invoiceNumber: finalInvoiceNumber,
        paymentLinkOverride: form.paymentLinkOverride.trim(),
        paymentNotes: form.paymentNotes.trim(),
      },
      attendance: {
        ...prevAttendance,
        sessionsPerCycle: nextSessionsPerCycle,
      },
    };

    onSaveRegistrant(saved);

    if (usedAutoSequence) {
      onUpdatePaymentSettings({
        ...paymentSettings,
        nextInvoiceSeq: paymentSettings.nextInvoiceSeq + 1,
      });
    }

    setModalOpen(false);
    onNotify(editingId ? 'פרטי הנרשם והתשלום עודכנו' : 'נרשם חדש נוסף לחוג!');
  };

  const handleMarkAttendance = (reg: ClassRegistrant) => {
    const today = getLocalTodayIso();
    const cur = reg.attendance || { sessionsCompleted: 0, sessionsPerCycle: 4, attendanceDates: [] };
    const nextCount = cur.sessionsCompleted + 1;
    const updated: ClassRegistrant = {
      ...reg,
      attendance: {
        ...cur,
        sessionsCompleted: nextCount,
        attendanceDates: [...cur.attendanceDates, today],
      },
    };
    onSaveRegistrant(updated);
    if (nextCount >= cur.sessionsPerCycle) {
      onNotify(`${reg.parentAndChildName}: סיים מחזור של ${cur.sessionsPerCycle} מפגשים — זמן לחידוש!`);
    } else {
      onNotify(`סומנה הגעה (${nextCount}/${cur.sessionsPerCycle}) עבור ${reg.parentAndChildName}`);
    }
  };

  const handleUndoAttendance = (reg: ClassRegistrant) => {
    const cur = reg.attendance || { sessionsCompleted: 0, sessionsPerCycle: 4, attendanceDates: [] };
    if (cur.sessionsCompleted <= 0) return;
    onSaveRegistrant({
      ...reg,
      attendance: {
        ...cur,
        sessionsCompleted: cur.sessionsCompleted - 1,
        attendanceDates: cur.attendanceDates.slice(0, -1),
      },
    });
  };

  const handleResetAttendanceCycle = (reg: ClassRegistrant) => {
    const cur = reg.attendance || { sessionsCompleted: 0, sessionsPerCycle: 4, attendanceDates: [] };
    onSaveRegistrant({
      ...reg,
      attendance: {
        ...cur,
        sessionsCompleted: 0,
        attendanceDates: [],
      },
      payment: {
        ...reg.payment,
        status: 'ממתין לתשלום',
        paidDate: '',
        invoiceNumber: '',
      },
    });
    onNotify(`מחזור מפגשים חדש נפתח עבור ${reg.parentAndChildName}`);
  };

  const handleMarkAsPaidAndOpenInvoice = (reg: ClassRegistrant) => {
    const invoiceNumber =
      reg.payment.invoiceNumber.trim() ||
      formatInvoiceNumber(paymentSettings.invoicePrefix, paymentSettings.nextInvoiceSeq);
    const updated: ClassRegistrant = {
      ...reg,
      payment: {
        ...reg.payment,
        status: 'שולם',
        paidDate: reg.payment.paidDate || getLocalTodayIso(),
        invoiceNumber,
      },
    };
    onSaveRegistrant(updated);
    if (!reg.payment.invoiceNumber.trim()) {
      onUpdatePaymentSettings({
        ...paymentSettings,
        nextInvoiceSeq: paymentSettings.nextInvoiceSeq + 1,
      });
    }
    setInvoiceRegistrant(updated);
    onNotify(`התשלום עבור ${reg.parentAndChildName} סומן כשולם!`);
  };

  const buildPaymentLinkWhatsappUrl = (reg: ClassRegistrant) => {
    const activeLink =
      reg.payment.paymentLinkOverride?.trim() || paymentSettings.defaultPaymentLinkUrl.trim();
    const amountText = `${reg.payment.amount} ₪`;
    const msg = [
      `שלום ${reg.parentAndChildName} 🌿`,
      `כאן גאולה מ״${brand.businessName}״.`,
      `שולחת פרטי הסדרת תשלום עבור ${reg.dayOrGroup || 'חוג החיות'}:`,
      `💰 סכום לתשלום: *${amountText}*`,
      activeLink ? `🔗 קישור לתשלום מהיר: ${activeLink}` : '',
      paymentSettings.paymentNote ? `ℹ️ ${paymentSettings.paymentNote}` : '',
      ``,
      `לאחר התשלום אשמח לעדכון כדי לשלוח אישור תשלום. תודה רבה! 💛`,
      `גאולה · ${brand.phone}`,
    ]
      .filter(Boolean)
      .join('\n');

    return buildWhatsappUrl(reg.phone, brand.whatsappDigits, msg);
  };

  const buildGeneralWhatsappUrl = (reg: ClassRegistrant) => {
    const msg = [
      `שלום ${reg.parentAndChildName} 🌿`,
      `כאן גאולה מ״${brand.businessName}״.`,
      `תודה שנרשמתם לחוג החיות שלנו${reg.dayOrGroup ? ` (${reg.dayOrGroup})` : ''}!`,
      `נשמח לתאם אתכם את המפגש הקרוב. לכל שאלה אני זמינה כאן: ${brand.phone} 💛`,
    ].join('\n');
    return buildWhatsappUrl(reg.phone, brand.whatsappDigits, msg);
  };

  const buildInvoiceText = (reg: ClassRegistrant) => {
    return [
      `🧾 *אישור תשלום / חשבונית — ${brand.businessName}*`,
      `מספר אסמכתא: ${reg.payment.invoiceNumber || 'טרם הונפק'}`,
      `סטטוס: ${reg.payment.status}`,
      `תאריך: ${reg.payment.paidDate || reg.createdAt}`,
      `------------------------`,
      `שם נרשם/הורה: ${reg.parentAndChildName}`,
      reg.phone ? `טלפון: ${reg.phone}` : '',
      `חוג / קבוצה: ${reg.dayOrGroup}`,
      `אמצעי תשלום: ${reg.payment.method}`,
      `סכום: ${reg.payment.amount} ₪`,
      reg.payment.paymentNotes ? `הערה: ${reg.payment.paymentNotes}` : '',
      `------------------------`,
      `תודה שבחרתם בחוגי החיות שלנו! 🦜🐢🐰`,
      `${brand.businessName} · ${brand.phone}`,
    ]
      .filter(Boolean)
      .join('\n');
  };

  const handleExportCsv = () => {
    const listToExport = filteredRegistrants.length > 0 ? filteredRegistrants : registrants;
    if (listToExport.length === 0) {
      onNotify('אין נרשמים לייצוא כרגע');
      return;
    }
    const headers = [
      'שם הורה וילד',
      'טלפון',
      'קבוצה / יום',
      'נוכחות במחזור',
      'סטטוס תשלום',
      'סכום (₪)',
      'אמצעי תשלום',
      'תאריך תשלום',
      'מספר חשבונית / אסמכתא',
      'הערות תשלום',
      'הערות כלליות',
      'תאריך הרשמה',
    ];
    const rows = listToExport.map((r) => [
      r.parentAndChildName,
      r.phone,
      r.dayOrGroup,
      `${r.attendance?.sessionsCompleted ?? 0}/${r.attendance?.sessionsPerCycle ?? 4}`,
      r.payment.status,
      r.payment.amount,
      r.payment.method,
      r.payment.paidDate || '',
      r.payment.invoiceNumber || '',
      r.payment.paymentNotes || '',
      r.notes,
      r.createdAt,
    ]);
    const today = getLocalTodayIso();
    downloadCsvWithBom(`geula-classes-registrants-${today}.csv`, headers, rows);
    onNotify(`קובץ CSV עם ${listToExport.length} נרשמים הורד בהצלחה!`);
  };

  const handleCopyWhatsappTable = async () => {
    const listToCopy = filteredRegistrants.length > 0 ? filteredRegistrants : registrants;
    if (listToCopy.length === 0) {
      onNotify('אין נרשמים להעתקה כרגע');
      return;
    }
    const header = `📋 *רשימת נרשמים לחוג — ${brand.businessName}*\n(${listToCopy.length} נרשמים · שולם: ${stats.totalPaid} ₪ · ממתין: ${stats.totalPending} ₪)\n`;
    const lines = listToCopy.map((r, idx) => {
      const icon = r.payment.status === 'שולם' ? '✅' : '⏳';
      const inv = r.payment.invoiceNumber ? ` · אסמכתא ${r.payment.invoiceNumber}` : '';
      const att = `${r.attendance?.sessionsCompleted ?? 0}/${r.attendance?.sessionsPerCycle ?? 4} מפגשים`;
      return `${idx + 1}. ${icon} *${r.parentAndChildName}*\n   ${r.dayOrGroup} | ${att} | ${r.payment.amount} ₪ (${r.payment.status}${inv})${r.phone ? ` | 📞 ${r.phone}` : ''}`;
    });
    await copyTextToClipboard(`${header}\n${lines.join('\n')}\n\n📞 ${brand.phone}`);
    setCopiedTable(true);
    onNotify('רשימת הנרשמים הועתקה כטבלה מוכנה לוואטסאפ!');
    window.setTimeout(() => setCopiedTable(false), 2400);
  };

  const handleDownloadInvoicePng = (reg: ClassRegistrant) => {
    const width = 840;
    const height = 1040;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Warm cream background
    ctx.fillStyle = '#FBF8F1';
    ctx.fillRect(0, 0, width, height);

    // Subtle outer border
    ctx.strokeStyle = '#6B4423';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    // Forest green header banner
    ctx.fillStyle = '#1F5E3B';
    ctx.fillRect(24, 24, width - 48, 170);

    // Gold accent line
    ctx.fillStyle = '#F4B41A';
    ctx.fillRect(24, 194, width - 48, 10);

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';

    ctx.fillStyle = '#F4B41A';
    ctx.font = 'bold 24px Rubik, Heebo, Arial, sans-serif';
    ctx.fillText('אישור תשלום / חשבונית חוג', width - 64, 82);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 40px Rubik, Heebo, Arial, sans-serif';
    ctx.fillText(brand.businessName, width - 64, 136);

    ctx.fillStyle = '#E6F2EB';
    ctx.font = '600 22px Heebo, Arial, sans-serif';
    ctx.fillText(`טלפון וואטסאפ: ${brand.phone}`, width - 64, 174);

    // Invoice metadata strip
    ctx.fillStyle = '#F3EDE0';
    ctx.fillRect(54, 234, width - 108, 100);

    ctx.fillStyle = '#1C2A21';
    ctx.font = 'bold 26px Rubik, Heebo, Arial, sans-serif';
    ctx.fillText(
      `מספר אסמכתא: ${reg.payment.invoiceNumber || 'טרם הונפק'}`,
      width - 80,
      276
    );
    ctx.fillStyle = reg.payment.status === 'שולם' ? '#1F5E3B' : '#6B4423';
    ctx.font = 'bold 24px Heebo, Arial, sans-serif';
    ctx.fillText(
      `סטטוס: ${reg.payment.status}   ·   תאריך: ${reg.payment.paidDate || reg.createdAt}`,
      width - 80,
      316
    );

    // Details rows
    const details: [string, string][] = [
      ['לכבוד:', reg.parentAndChildName],
      ['טלפון:', reg.phone || 'לא הוזן'],
      ['מסגרת / קבוצה:', reg.dayOrGroup || 'חוג חיות'],
      ['אמצעי תשלום:', reg.payment.method],
      ['הערות תשלום:', reg.payment.paymentNotes || 'ללא הערות נוספות'],
    ];

    let y = 398;
    details.forEach(([label, val]) => {
      ctx.fillStyle = '#6B4423';
      ctx.font = 'bold 22px Heebo, Arial, sans-serif';
      ctx.fillText(label, width - 64, y);

      ctx.fillStyle = '#1C2A21';
      ctx.font = '600 24px Heebo, Arial, sans-serif';
      const trimmed = val.length > 42 ? `${val.slice(0, 40)}...` : val;
      ctx.fillText(trimmed, width - 64, y + 34);

      ctx.strokeStyle = 'rgba(107, 68, 35, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(64, y + 52);
      ctx.lineTo(width - 64, y + 52);
      ctx.stroke();
      y += 82;
    });

    // Amount Box
    ctx.fillStyle = '#1F5E3B';
    ctx.fillRect(54, 816, width - 108, 108);
    ctx.fillStyle = '#F4B41A';
    ctx.font = 'bold 24px Heebo, Arial, sans-serif';
    ctx.fillText('סכום כולל:', width - 84, 858);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px Rubik, Heebo, Arial, sans-serif';
    ctx.fillText(`${reg.payment.amount} ₪`, width - 84, 904);

    // Footer
    ctx.fillStyle = '#4A554E';
    ctx.font = '600 20px Heebo, Arial, sans-serif';
    ctx.fillText(
      `תודה רבה! ${brand.tagline}`,
      width - 64,
      978
    );

    const link = document.createElement('a');
    link.download = `receipt-${reg.payment.invoiceNumber || reg.id}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify('כרטיס אישור התשלום הורד כתמונה!');
  };

  return (
    <div className="space-y-6">
      {/* Compact Top Utility Strip: Quick Promo & Payment Settings Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setPromoOpen((prev) => !prev)}
          aria-expanded={promoOpen}
          className="min-h-[50px] px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1B2820] border border-[#F4B41A]/60 dark:border-[#F4B41A]/35 shadow-sm flex items-center justify-between gap-2 text-right hover:bg-[#FFF9E8] dark:hover:bg-[#223229] transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
            <Share2 className="w-4 h-4 text-[#F4B41A] shrink-0" />
            <span>שיתוף מודעת פרסום לחוג</span>
          </span>
          {promoOpen ? (
            <ChevronUp className="w-4 h-4 text-[#6B4423] dark:text-[#F4B41A] shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#6B4423] dark:text-[#F4B41A] shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setSettingsOpen((prev) => !prev)}
          aria-expanded={settingsOpen}
          className="min-h-[50px] px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1B2820] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 shadow-sm flex items-center justify-between gap-2 text-right hover:bg-[#FBF8F1] dark:hover:bg-[#223229] transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#1C2A21] dark:text-[#E6EDE8] truncate">
            <Settings2 className="w-4 h-4 text-[#1F5E3B] dark:text-[#F4B41A] shrink-0" />
            <span className="truncate">
              הגדרות גבייה וחשבוניות ({paymentSettings.defaultAmount} ₪)
            </span>
          </span>
          {settingsOpen ? (
            <ChevronUp className="w-4 h-4 text-[#6B4423] dark:text-[#F4B41A] shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#6B4423] dark:text-[#F4B41A] shrink-0" />
          )}
        </button>
      </div>

      {/* Collapsible Promotional Shareable Card for Animal Classes */}
      {promoOpen && (
      <section className="bg-white dark:bg-[#1B2820] rounded-3xl overflow-hidden shadow-sm border border-[#F4B41A]/60 dark:border-[#F4B41A]/35">
        <div className="bg-[#1F5E3B] text-white p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {logoError || !brand.logoImage ? (
                <div className="w-12 h-12 rounded-2xl bg-[#223229] border-2 border-[#F4B41A] flex items-center justify-center text-xl shrink-0">
                  🐾
                </div>
              ) : (
                <img
                  src={brand.logoImage}
                  alt={brand.businessName}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-[#F4B41A] shrink-0"
                />
              )}
              <div>
                <p className="text-xs font-bold text-[#F4B41A]">מודעת פרסום מוכנה לשיתוף</p>
                <h2 className="text-lg sm:text-xl font-extrabold mt-0.5">
                  חוגי חיות עם {brand.businessName}
                </h2>
              </div>
            </div>
            <span className="text-base font-extrabold text-[#F4B41A] tabular-nums shrink-0">
              {brand.phone}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-sm font-semibold text-[#1C2A21] dark:text-[#E6EDE8] leading-relaxed">
            הזמינו הורים וילדים לחוג שבועי חווייתי: מפגש רגוע ומלמד עם בעלי חיים מדהימים,
            פיתוח ביטחון עצמי, חמלה, הקשבה ומשחקי תנועה בקבוצה קטנה.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <a
              href={promoWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] px-5 py-3 rounded-2xl bg-[#1F5E3B] hover:bg-[#16462B] text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 transition-all"
            >
              <Share2 className="w-4 h-4 text-[#F4B41A] shrink-0" />
              <span>שתף פרסום חוג בוואטסאפ</span>
            </a>

            <button
              type="button"
              onClick={handleCopyPromo}
              className="min-h-[48px] px-5 py-3 rounded-2xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] font-extrabold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
            >
              {copiedPromo ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <Copy className="w-4 h-4 shrink-0" />
              )}
              <span>{copiedPromo ? 'המודעה הועתקה!' : 'העתק מודעה להפצה'}</span>
            </button>
          </div>
        </div>
      </section>
      )}

      {/* Collapsible Payment & Invoice Settings */}
      {settingsOpen && (
      <section className="bg-white dark:bg-[#1B2820] rounded-3xl shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 overflow-hidden">
          <form
            onSubmit={handleSaveSettings}
            className="px-5 sm:px-6 pb-5 pt-4 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="pay-def-amount"
                  className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                >
                  עלות חוג ברירת מחדל (₪)
                </label>
                <input
                  id="pay-def-amount"
                  type="number"
                  min={0}
                  value={settingsDraft.defaultAmount}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      defaultAmount: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                />
              </div>

              <div>
                <label
                  htmlFor="pay-inv-prefix"
                  className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                >
                  קידומת חשבונית / אסמכתא
                </label>
                <input
                  id="pay-inv-prefix"
                  type="text"
                  value={settingsDraft.invoicePrefix}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, invoicePrefix: e.target.value })
                  }
                  placeholder="INV-2026-"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                />
              </div>

              <div>
                <label
                  htmlFor="pay-inv-seq"
                  className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                >
                  מספר רץ הבא
                </label>
                <input
                  id="pay-inv-seq"
                  type="number"
                  min={1}
                  value={settingsDraft.nextInvoiceSeq}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      nextInvoiceSeq: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="pay-def-link"
                className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
              >
                קישור תשלום ברירת מחדל (PayBox / Bit / Grow / משולם)
              </label>
              <input
                id="pay-def-link"
                type="url"
                dir="ltr"
                value={settingsDraft.defaultPaymentLinkUrl}
                onChange={(e) =>
                  setSettingsDraft({ ...settingsDraft, defaultPaymentLinkUrl: e.target.value })
                }
                placeholder="https://payboxapp.page.link/..."
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm text-left dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
              />
            </div>

            <div>
              <label
                htmlFor="pay-def-note"
                className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
              >
                הנחיית תשלום שתצורף להודעות בוואטסאפ
              </label>
              <input
                id="pay-def-note"
                type="text"
                value={settingsDraft.paymentNote}
                onChange={(e) =>
                  setSettingsDraft({ ...settingsDraft, paymentNote: e.target.value })
                }
                placeholder="לדוגמה: ניתן לשלם בביט / פייבוקס למספר 050-6030039"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1F5E3B] hover:bg-[#16462B] text-white text-sm font-bold active:scale-95 transition-all cursor-pointer"
              >
                שמור הגדרות תשלום
              </button>
            </div>
          </form>
      </section>
      )}

      {/* Class Registrants List, Export & Payments */}
      <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
          <div>
            <h3 className="text-xl font-extrabold text-[#1C2A21] dark:text-[#E6EDE8]">
              נרשמים, תשלומים וחשבוניות לחוג
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm tabular-nums">
              <span className="font-semibold text-[#4A554E] dark:text-[#B5C4BA]">
                סה״כ {registrants.length} נרשמים
              </span>
              <span className="font-bold text-[#1F5E3B] dark:text-[#7CD49E]">
                שולם ({stats.paidCount}): {stats.totalPaid.toLocaleString('he-IL')} ₪
              </span>
              <span className="font-bold text-[#6B4423] dark:text-[#F4B41A]">
                ממתין ({stats.pendingCount}): {stats.totalPending.toLocaleString('he-IL')} ₪
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F3EDE0] dark:bg-[#223229] hover:bg-[#EAE1CE] dark:hover:bg-[#2B3E33] text-[#1F5E3B] dark:text-[#7CD49E] font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>ייצוא CSV</span>
            </button>

            <button
              type="button"
              onClick={handleCopyWhatsappTable}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F3EDE0] dark:bg-[#223229] hover:bg-[#EAE1CE] dark:hover:bg-[#2B3E33] text-[#6B4423] dark:text-[#F4B41A] font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
            >
              {copiedTable ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <Copy className="w-4 h-4 shrink-0" />
              )}
              <span>{copiedTable ? 'הטבלה הועתקה!' : 'העתק טבלה לוואטסאפ'}</span>
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1F5E3B] hover:bg-[#16462B] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#F4B41A] shrink-0" />
              <span>הוסף נרשם לחוג</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['הכל', 'ממתין לתשלום', 'שולם'] as const).map((tab) => {
              const active = statusFilter === tab;
              const count =
                tab === 'הכל'
                  ? registrants.length
                  : tab === 'שולם'
                    ? stats.paidCount
                    : stats.pendingCount;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap tabular-nums active:scale-95 transition-all cursor-pointer ${
                    active
                      ? 'bg-[#6B4423] text-white'
                      : 'bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 text-[#4A554E] dark:text-[#B5C4BA] hover:bg-[#F3EDE0]'
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#4A554E] dark:text-[#B5C4BA] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש שם, טלפון או חשבונית..."
              className="w-full min-h-[40px] pr-9 pl-3 py-1.5 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-xs sm:text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
            />
          </div>
        </div>

        {filteredRegistrants.length === 0 ? (
          <p className="text-sm text-[#4A554E] dark:text-[#B5C4BA] py-6 text-center">
            {registrants.length === 0
              ? 'עדיין אין נרשמים ברשימה. לחצי על ״הוסף נרשם לחוג״ כדי לתעד מתעניינים חדשים.'
              : 'לא נמצאו נרשמים התואמים לסינון או לחיפוש.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRegistrants.map((reg) => {
              const isPaid = reg.payment.status === 'שולם';
              return (
                <article
                  key={reg.id}
                  className="rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 p-4 flex flex-col justify-between space-y-3.5"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-base font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
                          {reg.parentAndChildName}
                        </h4>
                        <p className="text-xs font-semibold text-[#6B4423] dark:text-[#F4B41A] mt-0.5">
                          {reg.dayOrGroup}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(reg)}
                          aria-label={`ערוך ${reg.parentAndChildName}`}
                          title="ערוך פרטים ותשלום"
                          className="min-h-[38px] min-w-[38px] rounded-xl bg-white dark:bg-[#1B2820] hover:bg-[#F3EDE0] dark:hover:bg-[#2B3E33] text-[#6B4423] dark:text-[#F4B41A] inline-flex items-center justify-center active:scale-95 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {pendingDeleteId === reg.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteRegistrant(reg.id);
                                setPendingDeleteId(null);
                              }}
                              className="min-h-[38px] px-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                            >
                              אשר מחיקה
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              className="min-h-[38px] px-2 rounded-xl bg-white dark:bg-[#1B2820] text-[#6B4423] dark:text-[#E6EDE8] text-xs font-bold cursor-pointer"
                            >
                              ביטול
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(reg.id)}
                            aria-label={`מחק ${reg.parentAndChildName}`}
                            title="מחק נרשם"
                            className="min-h-[38px] min-w-[38px] rounded-xl bg-white dark:bg-[#1B2820] hover:bg-red-50 dark:hover:bg-red-950/40 text-[#6B4423]/70 dark:text-[#B5C4BA] hover:text-red-700 dark:hover:text-red-400 inline-flex items-center justify-center active:scale-95 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {reg.phone && (
                      <p className="text-xs text-[#1C2A21] dark:text-[#E6EDE8] flex items-center gap-1.5 tabular-nums">
                        <Phone className="w-3.5 h-3.5 text-[#1F5E3B] dark:text-[#7CD49E] shrink-0" />
                        <span>{reg.phone}</span>
                      </p>
                    )}

                    {/* Clean typographic payment status line */}
                    <div className="pt-2 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs tabular-nums">
                      <span
                        className={`inline-flex items-center gap-1 font-extrabold ${
                          isPaid
                            ? 'text-[#1F5E3B] dark:text-[#7CD49E]'
                            : 'text-[#6B4423] dark:text-[#F4B41A]'
                        }`}
                      >
                        {isPaid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{reg.payment.status}</span>
                      </span>
                      <span className="text-[#4A554E] dark:text-[#B5C4BA]">·</span>
                      <span className="font-extrabold text-[#1C2A21] dark:text-[#E6EDE8]">
                        {reg.payment.amount} ₪
                      </span>
                      <span className="text-[#4A554E] dark:text-[#B5C4BA]">·</span>
                      <span className="text-[#4A554E] dark:text-[#B5C4BA]">
                        {reg.payment.method}
                      </span>
                      {reg.payment.invoiceNumber && (
                        <>
                          <span className="text-[#4A554E] dark:text-[#B5C4BA]">·</span>
                          <span className="font-semibold text-[#1F5E3B] dark:text-[#7CD49E]">
                            אסמכתא {reg.payment.invoiceNumber}
                          </span>
                        </>
                      )}
                      {reg.payment.paidDate && (
                        <>
                          <span className="text-[#4A554E] dark:text-[#B5C4BA]">·</span>
                          <span className="text-[#4A554E] dark:text-[#B5C4BA]">
                            {reg.payment.paidDate}
                          </span>
                        </>
                      )}
                    </div>

                    {(reg.notes || reg.payment.paymentNotes) && (
                      <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA]">
                        {[reg.notes, reg.payment.paymentNotes].filter(Boolean).join(' · ')}
                      </p>
                    )}

                    {/* Punch-Card Attendance & Renewal Tracker */}
                    {(() => {
                      const att = reg.attendance || {
                        sessionsCompleted: 0,
                        sessionsPerCycle: 4,
                        attendanceDates: [],
                      };
                      const cycleDone = att.sessionsCompleted >= att.sessionsPerCycle;
                      const pct = Math.min(
                        100,
                        Math.round((att.sessionsCompleted / Math.max(1, att.sessionsPerCycle)) * 100)
                      );
                      const lastDate =
                        att.attendanceDates.length > 0
                          ? att.attendanceDates[att.attendanceDates.length - 1]
                          : '';

                      return (
                        <div className="pt-2.5 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 space-y-2">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-bold text-[#1C2A21] dark:text-[#E6EDE8] tabular-nums">
                              כרטיסיית מפגשים: {att.sessionsCompleted} / {att.sessionsPerCycle}
                            </span>
                            {lastDate && (
                              <span className="text-[11px] text-[#4A554E] dark:text-[#B5C4BA] tabular-nums">
                                מפגש אחרון: {lastDate}
                              </span>
                            )}
                          </div>

                          <div className="h-2 rounded-full bg-[#EAE1CE] dark:bg-[#1B2820] overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                cycleDone ? 'bg-[#F4B41A]' : 'bg-[#1F5E3B]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleMarkAttendance(reg)}
                              className="min-h-[34px] px-3 py-1 rounded-lg bg-white dark:bg-[#1B2820] hover:bg-[#F3EDE0] border border-[#1F5E3B]/30 text-[#1F5E3B] dark:text-[#7CD49E] text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>סמן הגעה למפגש</span>
                            </button>

                            {att.sessionsCompleted > 0 && (
                              <button
                                type="button"
                                onClick={() => handleUndoAttendance(reg)}
                                title="בטל סימון אחרון"
                                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white dark:bg-[#1B2820] border border-[#6B4423]/15 text-[#6B4423] dark:text-[#B5C4BA] text-[11px] font-bold cursor-pointer"
                              >
                                -1
                              </button>
                            )}

                            {cycleDone && (
                              <button
                                type="button"
                                onClick={() => handleResetAttendanceCycle(reg)}
                                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#F4B41A]/25 hover:bg-[#F4B41A]/40 text-[#6B4423] dark:text-[#F4B41A] text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>חדש מחזור ואפס</span>
                              </button>
                            )}
                          </div>

                          {cycleDone && (
                            <p className="text-[11px] font-extrabold text-[#6B4423] dark:text-[#F4B41A]">
                              ✨ המחזור הושלם ({att.sessionsPerCycle} מפגשים)! מומלץ לשלוח קישור תשלום לחודש הבא.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Card Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <a
                      href={buildPaymentLinkWhatsappUrl(reg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[42px] px-3 py-2 rounded-xl bg-[#1F5E3B] hover:bg-[#16462B] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all"
                    >
                      <Link2 className="w-3.5 h-3.5 text-[#F4B41A] shrink-0" />
                      <span>שלח לינק לתשלום</span>
                    </a>

                    {isPaid ? (
                      <button
                        type="button"
                        onClick={() => setInvoiceRegistrant(reg)}
                        className="min-h-[42px] px-3 py-2 rounded-xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>חשבונית / אישור</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkAsPaidAndOpenInvoice(reg)}
                        className="min-h-[42px] px-3 py-2 rounded-xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>סמן שולם והפק אישור</span>
                      </button>
                    )}

                    <a
                      href={buildGeneralWhatsappUrl(reg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-white dark:bg-[#1B2820] hover:bg-[#F3EDE0] dark:hover:bg-[#2B3E33] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 text-[#1F5E3B] dark:text-[#7CD49E] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>הודעת וואטסאפ</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => openEditModal(reg)}
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-white dark:bg-[#1B2820] hover:bg-[#F3EDE0] dark:hover:bg-[#2B3E33] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 text-[#6B4423] dark:text-[#F4B41A] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 shrink-0" />
                      <span>עריכה מלאה</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Full Add / Edit Registrant & Payment Modal */}
      {modalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingId ? 'עריכת נרשם ותשלום' : 'הוספת נרשם לחוג'}
        >
          <div className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto overscroll-contain bg-white dark:bg-[#1B2820] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
              <h3 className="text-xl font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
                {editingId ? 'עריכת פרטי נרשם, תשלום וחשבונית' : 'הוספת נרשם חדש לחוג'}
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
                  <label
                    htmlFor="reg-name"
                    className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                  >
                    שם הורה / ילד *
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={form.parentAndChildName}
                    onChange={(e) => setForm({ ...form, parentAndChildName: e.target.value })}
                    placeholder="לדוגמה: יעל לוי (אמא של אורי, בן 5)"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-phone"
                    className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                  >
                    טלפון לוואטסאפ
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="050-0000000"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                  />
                </div>
              </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-group"
                      className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                    >
                      יום / קבוצה
                    </label>
                    <input
                      id="reg-group"
                      type="text"
                      value={form.dayOrGroup}
                      onChange={(e) => setForm({ ...form, dayOrGroup: e.target.value })}
                      placeholder="לדוגמה: חוג יום שלישי · 17:00"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="reg-cycle"
                      className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                    >
                      מספר מפגשים במחזור חודשי
                    </label>
                    <input
                      id="reg-cycle"
                      type="number"
                      min={1}
                      max={20}
                      value={form.sessionsPerCycle}
                      onChange={(e) => setForm({ ...form, sessionsPerCycle: e.target.value })}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                    />
                  </div>
                </div>

              <div>
                <label
                  htmlFor="reg-notes"
                  className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                >
                  הערות כלליות
                </label>
                <textarea
                  id="reg-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="חיה אהובה, ניסיון קודם, העדפות..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                />
              </div>

              {/* Payment & Invoice Editing Section */}
              <div className="pt-3 border-t border-[#6B4423]/12 dark:border-[#E6EDE8]/10 space-y-3">
                <p className="text-sm font-extrabold text-[#6B4423] dark:text-[#F4B41A]">
                  פרטי תשלום, חשבונית וקישור גבייה
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="reg-pay-status"
                      className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                    >
                      סטטוס תשלום
                    </label>
                    <select
                      id="reg-pay-status"
                      value={form.status}
                      onChange={(e) => handleFormStatusChange(e.target.value as PaymentStatus)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                    >
                      <option value="ממתין לתשלום">ממתין לתשלום</option>
                      <option value="שולם">שולם</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-pay-amount"
                      className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                    >
                      סכום (₪)
                    </label>
                    <input
                      id="reg-pay-amount"
                      type="number"
                      min={0}
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-pay-method"
                      className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                    >
                      אמצעי תשלום
                    </label>
                    <select
                      id="reg-pay-method"
                      value={form.method}
                      onChange={(e) =>
                        setForm({ ...form, method: e.target.value as PaymentMethod })
                      }
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-pay-date"
                      className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                    >
                      תאריך תשלום
                    </label>
                    <input
                      id="reg-pay-date"
                      type="date"
                      value={form.paidDate}
                      onChange={(e) => setForm({ ...form, paidDate: e.target.value })}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-pay-invoice"
                      className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                    >
                      מספר חשבונית / אסמכתא
                    </label>
                    <input
                      id="reg-pay-invoice"
                      type="text"
                      value={form.invoiceNumber}
                      onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                      placeholder={formatInvoiceNumber(
                        paymentSettings.invoicePrefix,
                        paymentSettings.nextInvoiceSeq
                      )}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-pay-link"
                    className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                  >
                    קישור תשלום ייחודי לנרשם זה (אופציונלי — דורס ברירת מחדל)
                  </label>
                  <input
                    id="reg-pay-link"
                    type="url"
                    dir="ltr"
                    value={form.paymentLinkOverride}
                    onChange={(e) => setForm({ ...form, paymentLinkOverride: e.target.value })}
                    placeholder={
                      paymentSettings.defaultPaymentLinkUrl || 'https://payboxapp.page.link/...'
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm text-left dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-pay-notes"
                    className="block text-xs font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1"
                  >
                    הערת תשלום לחשבונית (לדוגמה: חודש נובמבר / שיעור ניסיון)
                  </label>
                  <input
                    id="reg-pay-notes"
                    type="text"
                    value={form.paymentNotes}
                    onChange={(e) => setForm({ ...form, paymentNotes: e.target.value })}
                    placeholder="הסדרת חודש נובמבר / תשלום מראש..."
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FBF8F1] dark:bg-[#131D17] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm dark:text-[#E6EDE8] focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] px-5 py-3 rounded-2xl bg-[#1F5E3B] hover:bg-[#16462B] text-white font-bold text-sm active:scale-95 transition-all cursor-pointer"
                >
                  {editingId ? 'שמור שינויים' : 'שמור נרשם'}
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

      {/* Printable & Shareable Invoice / Payment Receipt Card Modal */}
      {invoiceRegistrant && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setInvoiceRegistrant(null);
          }}
          className="print-invoice-backdrop fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="אישור תשלום וחשבונית"
        >
          <div className="print-invoice-card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto overscroll-contain bg-white dark:bg-[#1B2820] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 overflow-hidden">
            {/* Branded Receipt Header */}
            <div className="bg-[#1F5E3B] text-white p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {logoError || !brand.logoImage ? (
                  <div className="w-12 h-12 rounded-2xl bg-[#223229] border-2 border-[#F4B41A] flex items-center justify-center text-xl shrink-0">
                    🐾
                  </div>
                ) : (
                  <img
                    src={brand.logoImage}
                    alt={brand.businessName}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-[#F4B41A] shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#F4B41A]">אישור תשלום / חשבונית</p>
                  <h3 className="text-lg font-extrabold truncate">{brand.businessName}</h3>
                  <p className="text-xs text-[#E6F2EB] tabular-nums">{brand.phone}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInvoiceRegistrant(null)}
                aria-label="סגור אישור תשלום"
                className="no-print min-h-[42px] min-w-[42px] rounded-xl bg-white/15 hover:bg-white/25 text-white inline-flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Invoice Number & Status Strip */}
              <div className="rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 p-4 flex flex-wrap items-center justify-between gap-2 tabular-nums">
                <div>
                  <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA]">מספר אסמכתא / חשבונית</p>
                  <p className="text-base font-extrabold text-[#1C2A21] dark:text-[#E6EDE8]">
                    {invoiceRegistrant.payment.invoiceNumber || 'טרם הונפק'}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA]">
                    {invoiceRegistrant.payment.paidDate || invoiceRegistrant.createdAt}
                  </p>
                  <p
                    className={`text-sm font-extrabold inline-flex items-center gap-1 ${
                      invoiceRegistrant.payment.status === 'שולם'
                        ? 'text-[#1F5E3B] dark:text-[#7CD49E]'
                        : 'text-[#6B4423] dark:text-[#F4B41A]'
                    }`}
                  >
                    {invoiceRegistrant.payment.status === 'שולם' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    <span>{invoiceRegistrant.payment.status}</span>
                  </p>
                </div>
              </div>

              {/* Detail Table */}
              <dl className="divide-y divide-[#6B4423]/10 dark:divide-[#E6EDE8]/10 text-sm">
                <div className="py-2.5 flex justify-between gap-3">
                  <dt className="text-[#4A554E] dark:text-[#B5C4BA]">לכבוד:</dt>
                  <dd className="font-bold text-[#1C2A21] dark:text-[#E6EDE8] text-left">
                    {invoiceRegistrant.parentAndChildName}
                  </dd>
                </div>
                {invoiceRegistrant.phone && (
                  <div className="py-2.5 flex justify-between gap-3 tabular-nums">
                    <dt className="text-[#4A554E] dark:text-[#B5C4BA]">טלפון:</dt>
                    <dd className="font-semibold text-[#1C2A21] dark:text-[#E6EDE8]">
                      {invoiceRegistrant.phone}
                    </dd>
                  </div>
                )}
                <div className="py-2.5 flex justify-between gap-3">
                  <dt className="text-[#4A554E] dark:text-[#B5C4BA]">חוג / קבוצה:</dt>
                  <dd className="font-semibold text-[#1C2A21] dark:text-[#E6EDE8] text-left">
                    {invoiceRegistrant.dayOrGroup}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-3">
                  <dt className="text-[#4A554E] dark:text-[#B5C4BA]">אמצעי תשלום:</dt>
                  <dd className="font-semibold text-[#1C2A21] dark:text-[#E6EDE8]">
                    {invoiceRegistrant.payment.method}
                  </dd>
                </div>
                {invoiceRegistrant.payment.paymentNotes && (
                  <div className="py-2.5 flex justify-between gap-3">
                    <dt className="text-[#4A554E] dark:text-[#B5C4BA]">פירוט:</dt>
                    <dd className="font-medium text-[#1C2A21] dark:text-[#E6EDE8] text-left">
                      {invoiceRegistrant.payment.paymentNotes}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Total Box */}
              <div className="rounded-2xl bg-[#1F5E3B] text-white p-4 flex items-center justify-between">
                <span className="text-sm font-bold text-[#F4B41A]">סה״כ לתשלום / שולם</span>
                <span className="text-2xl font-extrabold tabular-nums">
                  {invoiceRegistrant.payment.amount.toLocaleString('he-IL')} ₪
                </span>
              </div>

              <p className="text-[11px] text-[#4A554E] dark:text-[#B5C4BA] text-center leading-relaxed">
                אישור תשלום פנימי של {brand.businessName}. ניתן לצרף או לעדכן מספר חשבונית מס/קבלה
                ממערכת הנהלת החשבונות שלך בכל עת בלחיצה על ״עריכה״.
              </p>

              {/* Actions */}
              <div className="no-print grid grid-cols-2 gap-2.5 pt-2">
                <a
                  href={buildWhatsappUrl(
                    invoiceRegistrant.phone,
                    brand.whatsappDigits,
                    buildInvoiceText(invoiceRegistrant)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1F5E3B] hover:bg-[#16462B] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all"
                >
                  <MessageCircle className="w-4 h-4 text-[#F4B41A] shrink-0" />
                  <span>שתף בוואטסאפ</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleDownloadInvoicePng(invoiceRegistrant)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>הורד כתמונה (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await copyTextToClipboard(buildInvoiceText(invoiceRegistrant));
                    onNotify('פרטי האישור הועתקו!');
                  }}
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-[#F3EDE0] dark:bg-[#223229] text-[#6B4423] dark:text-[#F4B41A] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span>העתק טקסט</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-[#F3EDE0] dark:bg-[#223229] text-[#1F5E3B] dark:text-[#7CD49E] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span>הדפס / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = invoiceRegistrant;
                    setInvoiceRegistrant(null);
                    openEditModal(target);
                  }}
                  className="col-span-2 min-h-[42px] px-4 py-2 rounded-xl border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-[#1C2A21] dark:text-[#E6EDE8] hover:bg-[#FBF8F1] dark:hover:bg-[#223229] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 shrink-0" />
                  <span>ערוך פרטי תשלום או מספר חשבונית</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
