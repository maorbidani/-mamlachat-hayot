import React from 'react';
import {
  ClipboardCheck,
  Palette,
  RotateCw,
  Share2,
  Timer,
  Volume2,
} from 'lucide-react';
import {
  AdminToolId,
  AnimalId,
  BrandConfig,
  CustomChecklistItem,
  EventMode,
  FacilityVisit,
  ParentGeneratorState,
} from '../types';
import { LiveActivityTab } from './LiveActivityTab';
import { ParentSummaryTab } from './ParentSummaryTab';
import { FacilitiesEquipmentTab } from './FacilitiesEquipmentTab';
import { CatalogBrandTab } from './CatalogBrandTab';

interface AdminHubProps {
  activeTool: AdminToolId;
  onSelectTool: (tool: AdminToolId) => void;
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
  activeMode: EventMode;
  onModeChange: (mode: EventMode) => void;
  parentState: ParentGeneratorState;
  onParentStateChange: (next: ParentGeneratorState) => void;
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
  onNotify: (message: string) => void;
}

const FIELD_TOOLS: { id: AdminToolId; label: string; icon: typeof RotateCw }[] = [
  { id: 'wheel', label: 'גלגל תנועה', icon: RotateCw },
  { id: 'soundboard', label: 'קופסת קולות', icon: Volume2 },
  { id: 'timer', label: 'טיימר ליטוף', icon: Timer },
];

const PREP_TOOLS: { id: AdminToolId; label: string; icon: typeof Share2 }[] = [
  { id: 'parents', label: 'סיכום להורים', icon: Share2 },
  { id: 'checklist', label: 'ציוד ומסגרות', icon: ClipboardCheck },
  { id: 'brand', label: 'הגדרות וחיות', icon: Palette },
];

export const AdminHub: React.FC<AdminHubProps> = ({
  activeTool,
  onSelectTool,
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
  activeMode,
  onModeChange,
  parentState,
  onParentStateChange,
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
  onNotify,
}) => {
  const renderToolButton = (tool: { id: AdminToolId; label: string; icon: typeof RotateCw }) => {
    const Icon = tool.icon;
    const active = activeTool === tool.id;
    return (
      <button
        key={tool.id}
        type="button"
        onClick={() => onSelectTool(tool.id)}
        className={`min-h-[58px] sm:min-h-[48px] px-1.5 sm:px-3 py-2 rounded-2xl text-[11px] sm:text-sm font-bold border flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center leading-tight active:scale-95 transition-all cursor-pointer ${
          active
            ? 'bg-[#1F5E3B] border-[#1F5E3B] text-white shadow-sm'
            : 'bg-[#FBF8F1] dark:bg-[#223229] border-[#6B4423]/15 dark:border-[#E6EDE8]/10 text-[#4A554E] dark:text-[#B5C4BA] hover:bg-[#F3EDE0] dark:hover:bg-[#2B3E33]'
        }`}
      >
        <Icon
          className={`w-4 h-4 shrink-0 ${
            active ? 'text-[#F4B41A]' : 'text-[#6B4423] dark:text-[#F4B41A]'
          }`}
        />
        <span>{tool.label}</span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Grouped Calm Tool Selector */}
      <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-4 sm:p-5 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
            כלים להפעלה, להורים ולהגדרות
          </h2>
          <p className="text-xs sm:text-sm text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
            לחיצה אחת על הכלי שצריך כרגע — מחולק לזמן הפעלה ולפני/אחרי מפגש
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="block text-xs font-extrabold text-[#6B4423] dark:text-[#F4B41A]">
              בזמן הפעלה עם הילדים
            </span>
            <div className="grid grid-cols-3 gap-2">
              {FIELD_TOOLS.map(renderToolButton)}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-extrabold text-[#1F5E3B] dark:text-[#7CD49E]">
              סיכום להורים, ציוד והגדרות
            </span>
            <div className="grid grid-cols-3 gap-2">
              {PREP_TOOLS.map(renderToolButton)}
            </div>
          </div>
        </div>
      </section>

      {activeTool === 'wheel' && (
        <LiveActivityTab
          brand={brand}
          activeMode={activeMode}
          onModeChange={onModeChange}
          onUploadAnimalPhoto={onUploadAnimalPhoto}
          focusTool="wheel"
        />
      )}

      {activeTool === 'soundboard' && (
        <LiveActivityTab
          brand={brand}
          activeMode={activeMode}
          onModeChange={onModeChange}
          onUploadAnimalPhoto={onUploadAnimalPhoto}
          focusTool="soundboard"
        />
      )}

      {activeTool === 'timer' && (
        <LiveActivityTab
          brand={brand}
          activeMode={activeMode}
          onModeChange={onModeChange}
          onUploadAnimalPhoto={onUploadAnimalPhoto}
          focusTool="timer"
        />
      )}

      {activeTool === 'parents' && (
        <ParentSummaryTab
          brand={brand}
          state={parentState}
          onChange={onParentStateChange}
          onNotify={onNotify}
        />
      )}

      {activeTool === 'checklist' && (
        <FacilitiesEquipmentTab
          visits={visits}
          onAddVisit={onAddVisit}
          onDeleteVisit={onDeleteVisit}
          packingAnimals={packingAnimals}
          onPackingAnimalsChange={onPackingAnimalsChange}
          checkedItems={checkedItems}
          onToggleChecked={onToggleChecked}
          onResetChecks={onResetChecks}
          customItems={customItems}
          onAddCustomItem={onAddCustomItem}
          onDeleteCustomItem={onDeleteCustomItem}
        />
      )}

      {activeTool === 'brand' && (
        <CatalogBrandTab
          brand={brand}
          onUpdateBrand={onUpdateBrand}
          onResetBrand={onResetBrand}
          onUploadAnimalPhoto={onUploadAnimalPhoto}
          onUploadLogo={onUploadLogo}
          onUploadVetCertificate={onUploadVetCertificate}
          nightMode={nightMode}
          onToggleNightMode={onToggleNightMode}
          onOpenLandingPreview={onOpenLandingPreview}
          onExportBackup={onExportBackup}
          onImportBackup={onImportBackup}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};
