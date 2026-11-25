export type AnimalId =
  | 'parrot'
  | 'tortoise'
  | 'guinea_pig'
  | 'rabbit'
  | 'snake'
  | 'bearded_dragon'
  | 'hamster'
  | 'lop_rabbits'
  | 'cockatiel'
  | 'iguana'
  | 'tarantula'
  | 'python'
  | 'hissing_cockroach';

export type AnimalCategory = 'עופות' | 'זוחלים' | 'יונקים' | 'פרוקי רגליים';

export type EventMode =
  | 'גן ילדים'
  | 'יום הולדת'
  | 'קייטנה'
  | 'מסיבת סוף שנה';

export type MainRoute =
  | 'home'
  | 'schedule'
  | 'kindergartens'
  | 'classes'
  | 'birthdays'
  | 'camps'
  | 'admin';

export type AdminToolId =
  | 'wheel'
  | 'soundboard'
  | 'timer'
  | 'parents'
  | 'checklist'
  | 'brand';

export type DayOfWeek =
  | 'יום ראשון'
  | 'יום שני'
  | 'יום שלישי'
  | 'יום רביעי'
  | 'יום חמישי'
  | 'יום שישי';

export interface KindergartenRecord {
  id: string;
  name: string;
  ageGroup: string;
  contactName: string;
  contactPhone: string;
  address: string;
  dayOfWeek: DayOfWeek;
  time: string;
  notes: string;
  visitedAnimals: AnimalId[];
  lastVisitDate?: string;
}

export type PaymentStatus = 'ממתין לתשלום' | 'שולם';

export type PaymentMethod =
  | 'ביט'
  | 'פייבוקס'
  | 'העברה בנקאית'
  | 'כרטיס אשראי'
  | 'מזומן';

export interface ClassPaymentRecord {
  status: PaymentStatus;
  amount: number;
  method: PaymentMethod;
  paidDate: string;
  invoiceNumber: string;
  paymentLinkOverride?: string;
  paymentNotes?: string;
}

export interface ClassAttendanceRecord {
  sessionsCompleted: number;
  sessionsPerCycle: number;
  attendanceDates: string[];
}

export interface ClassPaymentSettings {
  defaultAmount: number;
  defaultPaymentLinkUrl: string;
  paymentNote: string;
  invoicePrefix: string;
  nextInvoiceSeq: number;
}

export interface ClassRegistrant {
  id: string;
  parentAndChildName: string;
  phone: string;
  dayOrGroup: string;
  notes: string;
  createdAt: string;
  payment: ClassPaymentRecord;
  attendance: ClassAttendanceRecord;
}

export interface EventBooking {
  id: string;
  kind: 'birthday' | 'camp';
  title: string;
  date: string;
  time: string;
  location: string;
  contactName: string;
  contactPhone: string;
  animals: AnimalId[];
  status: 'ממתין לאישור' | 'מאושר' | 'התקיים';
  notes: string;
  source?: 'manual' | 'landing';
}

export interface AnimalEquipmentItem {
  id: string;
  label: string;
  category: 'ציוד והובלה' | 'האכלה ומים' | 'היגיינה ובטיחות';
}

export interface AnimalProfile {
  id: AnimalId;
  name: string;
  nickname: string;
  species: string;
  emoji: string;
  category: AnimalCategory;
  defaultImage: string;
  soundLabel: string;
  soundDescription: string;
  clue: string;
  surprisingFact: string;
  dinnerQuestion: string;
  educationalBenefits: string[];
  safetyNote: string;
  pettingCue: string;
  equipment: AnimalEquipmentItem[];
}

export interface WheelSegment {
  id: string;
  type: 'תנועה' | 'טריוויה';
  emoji: string;
  title: string;
  prompt: string;
  answer?: string;
  color: string;
  textColor: string;
}

export interface BrandConfig {
  businessName: string;
  servicesLine: string;
  tagline: string;
  phone: string;
  whatsappDigits: string;
  logoImage: string;
  aboutText: string;
  vetApprovalNote: string;
  vetCertificateImage?: string;
  customAnimalImages: Partial<Record<AnimalId, string>>;
  showIntroOnLaunch?: boolean;
}

export interface FacilityVisit {
  id: string;
  facilityName: string;
  eventType: EventMode;
  date: string;
  animals: AnimalId[];
  notes: string;
}

export interface CustomChecklistItem {
  id: string;
  label: string;
  category: 'ציוד והובלה' | 'האכלה ומים' | 'היגיינה ובטיחות';
}

export interface ParentGeneratorState {
  mode: 'summary' | 'prep';
  eventType: EventMode;
  groupOrChildName: string;
  selectedAnimals: AnimalId[];
  customNote: string;
  factIndex: number;
  questionIndex: number;
  prepAudioDataUrl?: string;
  prepAudioDurationSec?: number;
  includeLandingLink?: boolean;
  sessionPhotos?: string[];
}
