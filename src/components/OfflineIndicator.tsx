import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      dir="rtl"
      className="bg-[#6B4423] text-[#FBF8F1] px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b border-[#F4B41A]/30"
    >
      <WifiOff className="w-4 h-4 text-[#F4B41A] shrink-0" />
      <span>
        מצב ללא אינטרנט — כל הנתונים, הקולות, הטיימר והגלגל זמינים כרגיל ונשמרים במכשיר
      </span>
    </div>
  );
};
