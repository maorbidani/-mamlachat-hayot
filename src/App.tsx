import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Baby,
  BookOpen,
  Cake,
  Calendar,
  Camera,
  Check,
  Home,
  MessageCircle,
  Moon,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import {
  DEFAULT_BRAND_CONFIG,
  DEFAULT_CLASS_PAYMENT_SETTINGS,
  INITIAL_EVENT_BOOKINGS,
  INITIAL_FACILITIES,
  INITIAL_KINDERGARTENS,
  INITIAL_REGISTRANTS,
} from './data/animals';
import {
  AdminToolId,
  AnimalId,
  BrandConfig,
  ClassPaymentSettings,
  ClassRegistrant,
  CustomChecklistItem,
  EventBooking,
  EventMode,
  FacilityVisit,
  KindergartenRecord,
  MainRoute,
  ParentGeneratorState,
} from './types';
import {
  BOOKINGS_STORAGE_KEY,
  compressImageFile,
  formatInvoiceNumber,
  getLocalTodayIso,
  loadFromStorage,
  normalizeClassRegistrant,
  saveToStorage,
} from './utils/storage';
import { HomeHub } from './components/HomeHub';
import { ScheduleSection } from './components/ScheduleSection';
import { KindergartensSection } from './components/KindergartensSection';
import { ClassesSection } from './components/ClassesSection';
import { EventsSection } from './components/EventsSection';
import { AdminHub } from './components/AdminHub';
import { PublicLandingPage } from './components/PublicLandingPage';
import { OfflineIndicator } from './components/OfflineIndicator';
import { EntranceIntro } from './components/EntranceIntro';

function isLandingUrlActive(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('view') === 'landing' || window.location.hash === '#landing';
}

const STORAGE_KEYS = {
  ADMIN_TOOL: 'geula_admin_tool_v2',
  MODE: 'geula_active_mode_v1',
  BRAND: 'geula_brand_config_v1',
  KINDERGARTENS: 'geula_kindergartens_v2',
  REGISTRANTS: 'geula_class_registrants_v2',
  BOOKINGS: BOOKINGS_STORAGE_KEY,
  VISITS: 'geula_facility_visits_v1',
  PACKING_ANIMALS: 'geula_packing_animals_v1',
  CHECKED_ITEMS: 'geula_checked_items_v1',
  CUSTOM_ITEMS: 'geula_custom_items_v1',
  PARENT_GEN: 'geula_parent_gen_v1',
  NIGHT_MODE: 'geula_night_mode_v1',
  CLASS_PAYMENT_SETTINGS: 'geula_class_payment_settings_v1',
};

const DEFAULT_PARENT_STATE: ParentGeneratorState = {
  mode: 'summary',
  eventType: 'גן ילדים',
  groupOrChildName: 'גן תמר',
  selectedAnimals: ['parrot', 'tortoise', 'rabbit'],
  customNote: '',
  factIndex: 0,
  questionIndex: 0,
};

const ROUTE_TITLES: Record<MainRoute, string> = {
  home: 'ראשי',
  schedule: 'הלו״ז של גאולה',
  kindergartens: 'גנים',
  classes: 'חוגים',
  birthdays: 'ימי הולדת',
  camps: 'קייטנות',
  admin: 'ניהול וכלי הפעלה',
};

const SYNC_CHANNEL_NAME = 'geula-kingdom-sync-v1';

export default function App() {
  const [route, setRoute] = useState<MainRoute>('home');
  const [adminTool, setAdminTool] = useState<AdminToolId>(() =>
    loadFromStorage<AdminToolId>(STORAGE_KEYS.ADMIN_TOOL, 'wheel')
  );
  const [activeMode, setActiveMode] = useState<EventMode>(() =>
    loadFromStorage<EventMode>(STORAGE_KEYS.MODE, 'גן ילדים')
  );
  const [isLandingView, setIsLandingView] = useState<boolean>(() => isLandingUrlActive());
  const [landingOpenedFromApp, setLandingOpenedFromApp] = useState<boolean>(false);
  const [nightMode, setNightMode] = useState<boolean>(() =>
    loadFromStorage<boolean>(STORAGE_KEYS.NIGHT_MODE, false)
  );
  const [brand, setBrand] = useState<BrandConfig>(() => ({
    ...DEFAULT_BRAND_CONFIG,
    ...loadFromStorage<Partial<BrandConfig>>(STORAGE_KEYS.BRAND, DEFAULT_BRAND_CONFIG),
  }));
  const [kindergartens, setKindergartens] = useState<KindergartenRecord[]>(() =>
    loadFromStorage<KindergartenRecord[]>(STORAGE_KEYS.KINDERGARTENS, INITIAL_KINDERGARTENS)
  );
  const [paymentSettings, setPaymentSettings] = useState<ClassPaymentSettings>(() => ({
    ...DEFAULT_CLASS_PAYMENT_SETTINGS,
    ...loadFromStorage<Partial<ClassPaymentSettings>>(
      STORAGE_KEYS.CLASS_PAYMENT_SETTINGS,
      DEFAULT_CLASS_PAYMENT_SETTINGS
    ),
  }));
  const [registrants, setRegistrants] = useState<ClassRegistrant[]>(() => {
    const loaded = loadFromStorage<Partial<ClassRegistrant>[]>(
      STORAGE_KEYS.REGISTRANTS,
      INITIAL_REGISTRANTS
    );
    return loaded.map((item) =>
      normalizeClassRegistrant(item, DEFAULT_CLASS_PAYMENT_SETTINGS.defaultAmount)
    );
  });
  const [bookings, setBookings] = useState<EventBooking[]>(() =>
    loadFromStorage<EventBooking[]>(STORAGE_KEYS.BOOKINGS, INITIAL_EVENT_BOOKINGS)
  );
  const [visits, setVisits] = useState<FacilityVisit[]>(() =>
    loadFromStorage<FacilityVisit[]>(STORAGE_KEYS.VISITS, INITIAL_FACILITIES)
  );
  const [packingAnimals, setPackingAnimals] = useState<AnimalId[]>(() =>
    loadFromStorage<AnimalId[]>(STORAGE_KEYS.PACKING_ANIMALS, ['parrot', 'tortoise', 'rabbit'])
  );
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() =>
    loadFromStorage<Record<string, boolean>>(STORAGE_KEYS.CHECKED_ITEMS, {})
  );
  const [customItems, setCustomItems] = useState<CustomChecklistItem[]>(() =>
    loadFromStorage<CustomChecklistItem[]>(STORAGE_KEYS.CUSTOM_ITEMS, [])
  );
  const [parentState, setParentState] = useState<ParentGeneratorState>(() =>
    loadFromStorage<ParentGeneratorState>(STORAGE_KEYS.PARENT_GEN, DEFAULT_PARENT_STATE)
  );

  const [headerLogoError, setHeaderLogoError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    if (isLandingUrlActive()) return false;
    const savedBrand = loadFromStorage<Partial<BrandConfig>>(
      STORAGE_KEYS.BRAND,
      DEFAULT_BRAND_CONFIG
    );
    return savedBrand.showIntroOnLaunch !== false;
  });
  const toastTimerRef = useRef<number | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  useEffect(() => {
    setHeaderLogoError(false);
  }, [brand.logoImage]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Cross-tab instant synchronization (Landing Page <-> Admin tabs)
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      channelRef.current = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channelRef.current.onmessage = (event) => {
        const data = event.data as { type?: string };
        if (data?.type === 'SYNC_STORAGE') {
          setBookings(loadFromStorage<EventBooking[]>(STORAGE_KEYS.BOOKINGS, INITIAL_EVENT_BOOKINGS));
          setRegistrants(
            loadFromStorage<Partial<ClassRegistrant>[]>(
              STORAGE_KEYS.REGISTRANTS,
              INITIAL_REGISTRANTS
            ).map((item) =>
              normalizeClassRegistrant(item, DEFAULT_CLASS_PAYMENT_SETTINGS.defaultAmount)
            )
          );
          setKindergartens(
            loadFromStorage<KindergartenRecord[]>(STORAGE_KEYS.KINDERGARTENS, INITIAL_KINDERGARTENS)
          );
          setBrand({
            ...DEFAULT_BRAND_CONFIG,
            ...loadFromStorage<Partial<BrandConfig>>(STORAGE_KEYS.BRAND, DEFAULT_BRAND_CONFIG),
          });
          setPaymentSettings({
            ...DEFAULT_CLASS_PAYMENT_SETTINGS,
            ...loadFromStorage<Partial<ClassPaymentSettings>>(
              STORAGE_KEYS.CLASS_PAYMENT_SETTINGS,
              DEFAULT_CLASS_PAYMENT_SETTINGS
            ),
          });
        }
      };
    }

    const onStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.BOOKINGS && e.newValue) {
        try {
          setBookings(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      } else if (e.key === STORAGE_KEYS.REGISTRANTS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as Partial<ClassRegistrant>[];
          setRegistrants(
            parsed.map((item) =>
              normalizeClassRegistrant(item, DEFAULT_CLASS_PAYMENT_SETTINGS.defaultAmount)
            )
          );
        } catch {
          // ignore
        }
      } else if (e.key === STORAGE_KEYS.BRAND && e.newValue) {
        try {
          setBrand({ ...DEFAULT_BRAND_CONFIG, ...(JSON.parse(e.newValue) as Partial<BrandConfig>) });
        } catch {
          // ignore
        }
      } else if (e.key === STORAGE_KEYS.CLASS_PAYMENT_SETTINGS && e.newValue) {
        try {
          setPaymentSettings({
            ...DEFAULT_CLASS_PAYMENT_SETTINGS,
            ...(JSON.parse(e.newValue) as Partial<ClassPaymentSettings>),
          });
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorageChange);

    return () => {
      window.removeEventListener('storage', onStorageChange);
      channelRef.current?.close();
    };
  }, []);

  const broadcastSync = () => {
    try {
      channelRef.current?.postMessage({ type: 'SYNC_STORAGE' });
    } catch {
      // ignore
    }
  };

  // Sync Night Mode class & localStorage
  useEffect(() => {
    document.documentElement.classList.toggle('dark', nightMode);
    saveToStorage(STORAGE_KEYS.NIGHT_MODE, nightMode);
  }, [nightMode]);

  // Listen to browser navigation for public landing view (?view=landing or #landing)
  useEffect(() => {
    const syncUrl = () => {
      const active = isLandingUrlActive();
      setIsLandingView(active);
      if (!active) {
        setLandingOpenedFromApp(false);
      }
    };
    window.addEventListener('popstate', syncUrl);
    window.addEventListener('hashchange', syncUrl);
    return () => {
      window.removeEventListener('popstate', syncUrl);
      window.removeEventListener('hashchange', syncUrl);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route, isLandingView]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ADMIN_TOOL, adminTool);
  }, [adminTool]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.MODE, activeMode);
  }, [activeMode]);

  useEffect(() => {
    const ok = saveToStorage(STORAGE_KEYS.BRAND, brand);
    if (!ok) {
      showToast('שטח האחסון במכשיר כמעט מלא — נסי להעלות תמונה קלה יותר');
    }
  }, [brand]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.KINDERGARTENS, kindergartens);
  }, [kindergartens]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CLASS_PAYMENT_SETTINGS, paymentSettings);
  }, [paymentSettings]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.REGISTRANTS, registrants);
  }, [registrants]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.BOOKINGS, bookings);
  }, [bookings]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.VISITS, visits);
  }, [visits]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PACKING_ANIMALS, packingAnimals);
  }, [packingAnimals]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CHECKED_ITEMS, checkedItems);
  }, [checkedItems]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CUSTOM_ITEMS, customItems);
  }, [customItems]);

  useEffect(() => {
    const ok = saveToStorage(STORAGE_KEYS.PARENT_GEN, parentState);
    if (!ok) {
      showToast('שטח האחסון במכשיר מלא — מחקי תמונות מפגש ישנות או הקלטה כדי לפנות מקום');
    }
  }, [parentState]);

  const handleUploadAnimalPhoto = async (animalId: AnimalId, file: File) => {
    try {
      const dataUrl = await compressImageFile(file, 850, 0.82);
      setBrand((prev) => ({
        ...prev,
        customAnimalImages: {
          ...prev.customAnimalImages,
          [animalId]: dataUrl,
        },
      }));
      showToast('תמונת החיה עודכנה ונשמרה במכשיר!');
    } catch {
      showToast('לא ניתן היה לקרוא את קובץ התמונה');
    }
  };

  const handleUploadLogo = async (file: File) => {
    try {
      const dataUrl = await compressImageFile(file, 900, 0.84);
      setBrand((prev) => ({ ...prev, logoImage: dataUrl }));
      showToast('הלוגו עודכן ונשמר במכשיר!');
    } catch {
      showToast('לא ניתן היה לקרוא את קובץ התמונה');
    }
  };

  const handleUploadVetCertificate = async (file: File) => {
    try {
      const dataUrl = await compressImageFile(file, 1000, 0.84);
      setBrand((prev) => ({ ...prev, vetCertificateImage: dataUrl }));
      showToast('אישור וטרינרי נשמר בהצלחה!');
    } catch {
      showToast('לא ניתן היה לקרוא את קובץ האישור');
    }
  };

  const handleOpenLandingPreview = () => {
    setLandingOpenedFromApp(true);
    setIsLandingView(true);
  };

  const handleBackToApp = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      let changed = false;
      if (url.searchParams.get('view') === 'landing') {
        url.searchParams.delete('view');
        changed = true;
      }
      if (url.hash === '#landing') {
        url.hash = '';
        changed = true;
      }
      if (changed) {
        window.history.replaceState({}, '', url.toString());
      }
    }
    setIsLandingView(false);
    setLandingOpenedFromApp(false);
  };

  // Public Landing Page live submissions
  const handleSubmitPublicEventRequest = (data: Omit<EventBooking, 'id'>): EventBooking => {
    const newBooking: EventBooking = {
      ...data,
      id: `evt-pub-${Date.now()}`,
      source: 'landing',
    };
    setBookings((prev) => {
      const next = [newBooking, ...prev];
      saveToStorage(STORAGE_KEYS.BOOKINGS, next);
      return next;
    });
    broadcastSync();
    showToast(`אירוע חדש שוריין מדף הנחיתה: ${newBooking.date}`);
    return newBooking;
  };

  const handleSubmitPublicClassRegistration = (
    data: Pick<ClassRegistrant, 'parentAndChildName' | 'phone' | 'dayOrGroup' | 'notes'>
  ): ClassRegistrant => {
    const today = getLocalTodayIso();
    const newReg: ClassRegistrant = normalizeClassRegistrant(
      {
        id: `reg-pub-${Date.now()}`,
        parentAndChildName: data.parentAndChildName,
        phone: data.phone,
        dayOrGroup: data.dayOrGroup,
        notes: data.notes ? `${data.notes} (נרשם מדף הנחיתה)` : 'נרשם דרך דף הנחיתה',
        createdAt: today,
        payment: {
          status: 'ממתין לתשלום',
          amount: paymentSettings.defaultAmount,
          method: 'ביט',
          paidDate: '',
          invoiceNumber: formatInvoiceNumber(
            paymentSettings.invoicePrefix,
            paymentSettings.nextInvoiceSeq
          ),
          paymentNotes: '',
        },
        attendance: {
          sessionsCompleted: 0,
          sessionsPerCycle: 4,
          attendanceDates: [],
        },
      },
      paymentSettings.defaultAmount
    );
    setRegistrants((prev) => {
      const next = [newReg, ...prev];
      saveToStorage(STORAGE_KEYS.REGISTRANTS, next);
      return next;
    });
    setPaymentSettings((prev) => ({ ...prev, nextInvoiceSeq: prev.nextInvoiceSeq + 1 }));
    broadcastSync();
    showToast(`נרשם חדש לחוג מדף הנחיתה: ${newReg.parentAndChildName}`);
    return newReg;
  };

  // Full Backup Export / Import (JSON)
  const handleExportFullBackup = () => {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      brand,
      kindergartens,
      registrants,
      paymentSettings,
      bookings,
      visits,
      packingAnimals,
      checkedItems,
      customItems,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `geula-animal-kingdom-backup-${getLocalTodayIso()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('קובץ הגיבוי המלא ירד בהצלחה!');
  };

  const handleImportFullBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid backup');

      if (parsed.brand && typeof parsed.brand === 'object') {
        setBrand({ ...DEFAULT_BRAND_CONFIG, ...(parsed.brand as Partial<BrandConfig>) });
      }
      if (Array.isArray(parsed.kindergartens)) {
        setKindergartens(parsed.kindergartens as KindergartenRecord[]);
      }
      if (parsed.paymentSettings && typeof parsed.paymentSettings === 'object') {
        setPaymentSettings({
          ...DEFAULT_CLASS_PAYMENT_SETTINGS,
          ...(parsed.paymentSettings as Partial<ClassPaymentSettings>),
        });
      }
      if (Array.isArray(parsed.registrants)) {
        setRegistrants(
          (parsed.registrants as Partial<ClassRegistrant>[]).map((item) =>
            normalizeClassRegistrant(item, DEFAULT_CLASS_PAYMENT_SETTINGS.defaultAmount)
          )
        );
      }
      if (Array.isArray(parsed.bookings)) {
        setBookings(parsed.bookings as EventBooking[]);
      }
      if (Array.isArray(parsed.visits)) {
        setVisits(parsed.visits as FacilityVisit[]);
      }
      if (Array.isArray(parsed.packingAnimals)) {
        setPackingAnimals(parsed.packingAnimals as AnimalId[]);
      }
      if (parsed.checkedItems && typeof parsed.checkedItems === 'object') {
        setCheckedItems(parsed.checkedItems as Record<string, boolean>);
      }
      if (Array.isArray(parsed.customItems)) {
        setCustomItems(parsed.customItems as CustomChecklistItem[]);
      }
      broadcastSync();
      showToast('כל הנתונים שוחזרו בהצלחה מקובץ הגיבוי!');
    } catch {
      showToast('קובץ הגיבוי לא תקין — בדקי שנבחר קובץ JSON תקין');
    }
  };

  // Kindergarten CRUD
  const handleSaveKindergarten = (record: KindergartenRecord) => {
    setKindergartens((prev) => {
      const exists = prev.some((k) => k.id === record.id);
      return exists ? prev.map((k) => (k.id === record.id ? record : k)) : [record, ...prev];
    });
    broadcastSync();
    showToast(`פרטי ${record.name} נשמרו בהצלחה`);
  };

  const handleDeleteKindergarten = (id: string) => {
    setKindergartens((prev) => prev.filter((k) => k.id !== id));
    broadcastSync();
    showToast('הגן הוסר מהרשימה');
  };

  const handleOpenParentSummaryFromKindergarten = (kg: KindergartenRecord) => {
    setParentState((prev) => ({
      ...prev,
      mode: 'summary',
      eventType: 'גן ילדים',
      groupOrChildName: kg.name,
      selectedAnimals:
        kg.visitedAnimals.length > 0 ? kg.visitedAnimals : ['parrot', 'tortoise', 'rabbit'],
      factIndex: 0,
      questionIndex: 0,
    }));
    setAdminTool('parents');
    setRoute('admin');
  };

  // Class Registrants CRUD
  const handleSaveRegistrant = (reg: ClassRegistrant) => {
    setRegistrants((prev) => {
      const exists = prev.some((r) => r.id === reg.id);
      return exists ? prev.map((r) => (r.id === reg.id ? reg : r)) : [reg, ...prev];
    });
    broadcastSync();
  };

  const handleDeleteRegistrant = (id: string) => {
    setRegistrants((prev) => prev.filter((r) => r.id !== id));
    broadcastSync();
    showToast('הנרשם הוסר מהרשימה');
  };

  // Birthdays & Camps CRUD
  const handleSaveBooking = (booking: EventBooking) => {
    setBookings((prev) => {
      const exists = prev.some((b) => b.id === booking.id);
      return exists ? prev.map((b) => (b.id === booking.id ? booking : b)) : [booking, ...prev];
    });
    broadcastSync();
    showToast('האירוע נשמר בהצלחה');
  };

  const handleDeleteBooking = (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
    broadcastSync();
    showToast('האירוע נמחק');
  };

  const handleOpenSummaryFromBooking = (b: EventBooking) => {
    setParentState((prev) => ({
      ...prev,
      mode: 'summary',
      eventType: b.kind === 'birthday' ? 'יום הולדת' : 'קייטנה',
      groupOrChildName: b.title,
      selectedAnimals: b.animals.length > 0 ? b.animals : ['parrot', 'tortoise', 'rabbit'],
      factIndex: 0,
      questionIndex: 0,
    }));
    setAdminTool('parents');
    setRoute('admin');
  };

  const handleOpenChecklistForAnimals = (animals: AnimalId[]) => {
    setPackingAnimals(animals.length > 0 ? animals : ['parrot', 'tortoise', 'rabbit']);
    setAdminTool('checklist');
    setRoute('admin');
    showToast('החיות נטענו לצ׳ק-ליסט הציוד');
  };

  // Facilities & Checklist handlers
  const handleAddVisit = (visit: Omit<FacilityVisit, 'id'>) => {
    setVisits((prev) => [{ ...visit, id: `visit-${Date.now()}` }, ...prev]);
    showToast('הביקור נשמר ביומן המסגרות');
  };

  const handleDeleteVisit = (id: string) => {
    setVisits((prev) => prev.filter((v) => v.id !== id));
  };

  const handleToggleChecked = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleAddCustomItem = (item: Omit<CustomChecklistItem, 'id'>) => {
    setCustomItems((prev) => [...prev, { ...item, id: `custom-${Date.now()}` }]);
  };

  const handleDeleteCustomItem = (id: string) => {
    setCustomItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleResetBrand = () => {
    setBrand(DEFAULT_BRAND_CONFIG);
    showToast('הגדרות המיתוג שוחזרו לברירת המחדל');
  };

  const navItems: { id: MainRoute; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'ראשי', icon: Home },
    { id: 'kindergartens', label: 'גנים', icon: Baby },
    { id: 'classes', label: 'חוגים', icon: BookOpen },
    { id: 'birthdays', label: 'אירועים', icon: Cake },
    { id: 'admin', label: 'כלים', icon: SlidersHorizontal },
  ];

  if (isLandingView) {
    return (
      <>
        <OfflineIndicator />
        <PublicLandingPage
          brand={brand}
          bookings={bookings}
          kindergartens={kindergartens}
          paymentSettings={paymentSettings}
          showBackToApp={landingOpenedFromApp}
          onBackToApp={handleBackToApp}
          onSubmitEventRequest={handleSubmitPublicEventRequest}
          onSubmitClassRegistration={handleSubmitPublicClassRegistration}
        />
      </>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FBF8F1] dark:bg-[#131D17] text-[#1C2A21] dark:text-[#E6EDE8] flex flex-col transition-colors"
    >
      {showIntro && (
        <EntranceIntro brand={brand} onFinish={() => setShowIntro(false)} />
      )}
      <OfflineIndicator />

      {/* Compact Sticky Top Bar */}
      <header className="sticky top-0 z-30 h-14 bg-[#FBF8F1]/95 dark:bg-[#18241D]/95 backdrop-blur-md border-b border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <label
              title="החלף תמונת לוגו מהגלריה"
              className="relative w-10 h-10 rounded-xl overflow-hidden border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 bg-[#F3EDE0] dark:bg-[#223229] flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
            >
              {headerLogoError || !brand.logoImage ? (
                <span className="text-lg" aria-hidden="true">
                  🐾
                </span>
              ) : (
                <img
                  src={brand.logoImage}
                  alt={brand.businessName}
                  referrerPolicy="no-referrer"
                  onError={() => setHeaderLogoError(true)}
                  className="w-full h-full object-cover"
                />
              )}
              <span className="sr-only">החלף לוגו מהגלריה</span>
              <span className="absolute bottom-0 left-0 bg-[#1F5E3B] text-white p-0.5 rounded-tr-md">
                <Camera className="w-2.5 h-2.5" />
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadLogo(file);
                  e.target.value = '';
                }}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              onClick={() => setRoute('home')}
              className="text-base sm:text-lg font-extrabold text-[#1F5E3B] dark:text-[#7CD49E] truncate whitespace-nowrap cursor-pointer text-right"
            >
              {brand.businessName}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setNightMode((prev) => !prev)}
              aria-label={nightMode ? 'כיבוי מצב לילה' : 'הפעלת מצב לילה'}
              title={nightMode ? 'מצב יום' : 'מצב לילה'}
              className="min-h-[42px] min-w-[42px] px-2.5 rounded-xl bg-[#F3EDE0] dark:bg-[#223229] hover:bg-[#EAE1CE] dark:hover:bg-[#2B3E33] text-[#6B4423] dark:text-[#F4B41A] inline-flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            >
              {nightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <a
              href={`https://wa.me/${brand.whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-[#1F5E3B] hover:bg-[#16462B] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-[#F4B41A] shrink-0" />
              <span className="tabular-nums">{brand.phone}</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-32 sm:pb-28">
        {route !== 'home' && (
          <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRoute('home')}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#1B2820] hover:bg-[#F3EDE0] dark:hover:bg-[#223229] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 text-xs sm:text-sm font-bold text-[#6B4423] dark:text-[#F4B41A] inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                <ArrowRight className="w-4 h-4 shrink-0" />
                <span>מסך ראשי</span>
              </button>

              {(route === 'birthdays' || route === 'camps') && (
                <button
                  type="button"
                  onClick={() => setRoute('schedule')}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F3EDE0] dark:bg-[#223229] hover:bg-[#EAE1CE] text-[#1F5E3B] dark:text-[#7CD49E] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>הלו״ז השבועי</span>
                </button>
              )}
            </div>

            <span className="text-xs font-bold text-[#4A554E] dark:text-[#B5C4BA]">
              {ROUTE_TITLES[route]}
            </span>
          </div>
        )}

        {route === 'home' && (
          <HomeHub
            brand={brand}
            counts={{
              kindergartens: kindergartens.length,
              registrants: registrants.length,
              birthdays: bookings.filter((b) => b.kind === 'birthday').length,
              camps: bookings.filter((b) => b.kind === 'camp').length,
              scheduleTotal: kindergartens.length + bookings.length,
            }}
            onNavigate={setRoute}
            onOpenLandingPreview={handleOpenLandingPreview}
            onReplayIntro={() => setShowIntro(true)}
            onNotify={showToast}
          />
        )}

        {route === 'schedule' && (
          <ScheduleSection
            brand={brand}
            kindergartens={kindergartens}
            bookings={bookings}
            onNavigate={setRoute}
            onOpenChecklistForAnimals={handleOpenChecklistForAnimals}
            onOpenParentSummary={(item) => {
              setParentState((prev) => ({
                ...prev,
                mode: 'summary',
                eventType:
                  item.sourceType === 'kindergarten'
                    ? 'גן ילדים'
                    : item.sourceType === 'birthday'
                      ? 'יום הולדת'
                      : 'קייטנה',
                groupOrChildName: item.title,
                selectedAnimals:
                  item.animals.length > 0 ? item.animals : ['parrot', 'tortoise', 'rabbit'],
                factIndex: 0,
                questionIndex: 0,
              }));
              setAdminTool('parents');
              setRoute('admin');
            }}
          />
        )}

        {route === 'kindergartens' && (
          <KindergartensSection
            brand={brand}
            kindergartens={kindergartens}
            onSaveKindergarten={handleSaveKindergarten}
            onDeleteKindergarten={handleDeleteKindergarten}
            onOpenParentSummary={handleOpenParentSummaryFromKindergarten}
            onOpenChecklistForAnimals={handleOpenChecklistForAnimals}
          />
        )}

        {route === 'classes' && (
          <ClassesSection
            brand={brand}
            registrants={registrants}
            paymentSettings={paymentSettings}
            onUpdatePaymentSettings={setPaymentSettings}
            onSaveRegistrant={handleSaveRegistrant}
            onDeleteRegistrant={handleDeleteRegistrant}
            onNotify={showToast}
          />
        )}

        {route === 'birthdays' && (
          <EventsSection
            kind="birthday"
            brand={brand}
            bookings={bookings}
            kindergartens={kindergartens}
            onSaveBooking={handleSaveBooking}
            onDeleteBooking={handleDeleteBooking}
            onOpenSummaryForBooking={handleOpenSummaryFromBooking}
            onOpenChecklistForAnimals={handleOpenChecklistForAnimals}
            onSwitchKind={(next) => setRoute(next === 'birthday' ? 'birthdays' : 'camps')}
          />
        )}

        {route === 'camps' && (
          <EventsSection
            kind="camp"
            brand={brand}
            bookings={bookings}
            kindergartens={kindergartens}
            onSaveBooking={handleSaveBooking}
            onDeleteBooking={handleDeleteBooking}
            onOpenSummaryForBooking={handleOpenSummaryFromBooking}
            onOpenChecklistForAnimals={handleOpenChecklistForAnimals}
            onSwitchKind={(next) => setRoute(next === 'birthday' ? 'birthdays' : 'camps')}
          />
        )}

        {route === 'admin' && (
          <AdminHub
            activeTool={adminTool}
            onSelectTool={setAdminTool}
            brand={brand}
            onUpdateBrand={setBrand}
            onResetBrand={handleResetBrand}
            onUploadAnimalPhoto={handleUploadAnimalPhoto}
            onUploadLogo={handleUploadLogo}
            onUploadVetCertificate={handleUploadVetCertificate}
            nightMode={nightMode}
            onToggleNightMode={() => setNightMode((prev) => !prev)}
            onOpenLandingPreview={handleOpenLandingPreview}
            onExportBackup={handleExportFullBackup}
            onImportBackup={handleImportFullBackup}
            activeMode={activeMode}
            onModeChange={setActiveMode}
            parentState={parentState}
            onParentStateChange={setParentState}
            visits={visits}
            onAddVisit={handleAddVisit}
            onDeleteVisit={handleDeleteVisit}
            packingAnimals={packingAnimals}
            onPackingAnimalsChange={setPackingAnimals}
            checkedItems={checkedItems}
            onToggleChecked={handleToggleChecked}
            onResetChecks={() => {
              setCheckedItems({});
              showToast('הסימונים בצ׳ק-ליסט אופסו');
            }}
            customItems={customItems}
            onAddCustomItem={handleAddCustomItem}
            onDeleteCustomItem={handleDeleteCustomItem}
            onNotify={showToast}
          />
        )}
      </main>

      {/* Confirmation Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] px-4 py-2.5 rounded-2xl bg-[#1C2A21] dark:bg-[#223229] text-white shadow-lg border border-[#F4B41A]/40 flex items-center gap-2 text-xs sm:text-sm font-bold whitespace-nowrap"
        >
          <Check className="w-4 h-4 text-[#F4B41A] shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar — 5 Spacious RTL Tabs */}
      <nav
        aria-label="ניווט ראשי"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#18241D]/95 backdrop-blur-md border-t border-[#6B4423]/15 dark:border-[#E6EDE8]/10 pb-safe"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              route === item.id ||
              (item.id === 'birthdays' && route === 'camps');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setRoute(item.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-1 px-1 active:scale-95 transition-all cursor-pointer ${
                  isActive
                    ? 'text-[#1F5E3B] dark:text-[#7CD49E]'
                    : 'text-[#4A554E] dark:text-[#B5C4BA] hover:text-[#6B4423] dark:hover:text-[#F4B41A]'
                }`}
              >
                <div
                  className={`px-2.5 py-1 rounded-xl transition-colors ${
                    isActive ? 'bg-[#F4B41A]/25 dark:bg-[#F4B41A]/20 text-[#1F5E3B] dark:text-[#F4B41A]' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold whitespace-nowrap truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
