import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Eye,
  EyeOff,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { ANIMALS, EVENT_MODES, WHEEL_SEGMENTS } from '../data/animals';
import { AnimalId, BrandConfig, EventMode, WheelSegment } from '../types';
import { playAnimalSound, playTimerChime, playWheelTick, playWheelWin } from '../utils/audio';
import { AnimalPhoto } from './AnimalPhoto';

interface LiveActivityTabProps {
  brand: BrandConfig;
  activeMode: EventMode;
  onModeChange: (mode: EventMode) => void;
  onUploadAnimalPhoto: (animalId: AnimalId, file: File) => void;
  focusTool?: 'all' | 'wheel' | 'soundboard' | 'timer';
}

function createInitialRevealed(val: boolean): Record<AnimalId, boolean> {
  return ANIMALS.reduce(
    (acc, a) => {
      acc[a.id] = val;
      return acc;
    },
    {} as Record<AnimalId, boolean>
  );
}

export const LiveActivityTab: React.FC<LiveActivityTabProps> = ({
  brand,
  activeMode,
  onModeChange,
  onUploadAnimalPhoto,
  focusTool = 'all',
}) => {
  // Mystery Soundboard state
  const [mysteryMode, setMysteryMode] = useState<boolean>(true);
  const [revealedIds, setRevealedIds] = useState<Record<AnimalId, boolean>>(() =>
    createInitialRevealed(false)
  );
  const [playingId, setPlayingId] = useState<AnimalId | null>(null);

  // Petting Timer state
  const [timerMinutes, setTimerMinutes] = useState<1 | 2 | 3>(2);
  const [secondsLeft, setSecondsLeft] = useState<number>(120);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [timerFinished, setTimerFinished] = useState<boolean>(false);

  // Spinning Wheel state
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [selectedSegment, setSelectedSegment] = useState<WheelSegment | null>(null);
  const [showTriviaAnswer, setShowTriviaAnswer] = useState<boolean>(false);
  const spinTimeoutRef = useRef<number | null>(null);
  const tickIntervalRef = useRef<number | null>(null);

  const currentModeInfo = useMemo(
    () => EVENT_MODES.find((m) => m.id === activeMode) || EVENT_MODES[0],
    [activeMode]
  );

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          setIsRunning(false);
          setTimerFinished(true);
          playTimerChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) window.clearTimeout(spinTimeoutRef.current);
      if (tickIntervalRef.current) window.clearInterval(tickIntervalRef.current);
    };
  }, []);

  const handleSelectDuration = (mins: 1 | 2 | 3) => {
    setIsRunning(false);
    setTimerFinished(false);
    setTimerMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const handleToggleTimer = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(timerMinutes * 60);
      setTimerFinished(false);
      setIsRunning(true);
      return;
    }
    setTimerFinished(false);
    setIsRunning((prev) => !prev);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimerFinished(false);
    setSecondsLeft(timerMinutes * 60);
  };

  const handlePlaySound = (animalId: AnimalId) => {
    playAnimalSound(animalId);
    setPlayingId(animalId);
    window.setTimeout(() => {
      setPlayingId((cur) => (cur === animalId ? null : cur));
    }, 950);
  };

  const handleToggleReveal = (animalId: AnimalId) => {
    setRevealedIds((prev) => {
      const nextVal = !prev[animalId];
      if (nextVal) {
        playAnimalSound(animalId);
      }
      return { ...prev, [animalId]: nextVal };
    });
  };

  const handleSetAllRevealed = (revealed: boolean) => {
    setRevealedIds(createInitialRevealed(revealed));
  };

  const handleSpinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setShowTriviaAnswer(false);

    const segmentCount = WHEEL_SEGMENTS.length;
    const segmentAngle = 360 / segmentCount;
    const chosenIndex = Math.floor(Math.random() * segmentCount);

    const centerAngle = (chosenIndex + 0.5) * segmentAngle;
    const targetMod = (360 - centerAngle + 360) % 360;
    const currentMod = ((wheelRotation % 360) + 360) % 360;
    const deltaMod = (targetMod - currentMod + 360) % 360;
    const extraSpins = 360 * (4 + Math.floor(Math.random() * 2));
    const nextRotation = wheelRotation + extraSpins + deltaMod;

    setWheelRotation(nextRotation);

    let tickCount = 0;
    tickIntervalRef.current = window.setInterval(() => {
      tickCount += 1;
      playWheelTick();
      if (tickCount >= 18 && tickIntervalRef.current) {
        window.clearInterval(tickIntervalRef.current);
      }
    }, 175);

    spinTimeoutRef.current = window.setTimeout(() => {
      if (tickIntervalRef.current) window.clearInterval(tickIntervalRef.current);
      setIsSpinning(false);
      setSelectedSegment(WHEEL_SEGMENTS[chosenIndex]);
      playWheelWin();
    }, 3450);
  };

  const totalSeconds = timerMinutes * 60;
  const progressRatio = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const circleRadius = 58;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeOffset = circleCircumference * (1 - progressRatio);
  const formattedTime = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(
    secondsLeft % 60
  ).padStart(2, '0')}`;

  const showModeBar = focusTool === 'all' || focusTool === 'soundboard';
  const showSoundboard = focusTool === 'all' || focusTool === 'soundboard';
  const showTimer = focusTool === 'all' || focusTool === 'timer';
  const showWheel = focusTool === 'all' || focusTool === 'wheel';

  return (
    <div className="space-y-6">
      {/* Quick Event Mode Bar */}
      {showModeBar && (
      <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-4 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#6B4423] dark:text-[#F4B41A]">
              מצב הפעלה מהיר · {currentModeInfo.shortDesc}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1F5E3B] dark:text-[#7CD49E] mt-1">
              הפעלה חיה בשטח
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="בחירת סוג הפעלה"
            className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 bg-[#F3EDE0] dark:bg-[#223229] p-1.5 rounded-2xl"
          >
            {EVENT_MODES.map((mode) => {
              const active = mode.id === activeMode;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onModeChange(mode.id)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 active:scale-95 transition-all cursor-pointer ${
                    active
                      ? 'bg-[#1F5E3B] text-white shadow-sm'
                      : 'text-[#6B4423] dark:text-[#E6EDE8] hover:bg-white/70 dark:hover:bg-[#2B3E33]'
                  }`}
                >
                  {mode.id}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-4 pt-3 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 text-sm text-[#4A554E] dark:text-[#B5C4BA] leading-relaxed">
          <strong className="text-[#6B4423] dark:text-[#F4B41A] font-semibold">טיפ להפעלת {activeMode}: </strong>
          {currentModeInfo.liveTip}
        </p>
      </section>
      )}

      {/* Interactive Soundboard + Mystery Reveal */}
      {showSoundboard && (
      <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-4 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
          <div>
            <h2 className="text-xl font-bold text-[#1C2A21] dark:text-[#E6EDE8]">
              לוח קולות ומשחק ״מי מסתתר?״
            </h2>
            <p className="text-sm text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
              השמיעו צליל אמיתי מהטבע, תנו לילדים לנחש לפי הרמז וחשפו את החיה
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMysteryMode((prev) => !prev)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-2 active:scale-95 transition-all cursor-pointer ${
                mysteryMode
                  ? 'bg-[#F4B41A] text-[#1C2A21]'
                  : 'bg-[#F3EDE0] dark:bg-[#223229] text-[#6B4423] dark:text-[#E6EDE8] hover:bg-[#EAE1CE]'
              }`}
            >
              {mysteryMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{mysteryMode ? 'מצב מי מסתתר פעיל' : 'הצגה גלויה'}</span>
            </button>

            {mysteryMode && (
              <>
                <button
                  type="button"
                  onClick={() => handleSetAllRevealed(true)}
                  className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold bg-[#F3EDE0] dark:bg-[#223229] text-[#1F5E3B] dark:text-[#7CD49E] hover:bg-[#EAE1CE] dark:hover:bg-[#2B3E33] whitespace-nowrap shrink-0 active:scale-95 transition-transform cursor-pointer"
                >
                  חשוף הכל
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllRevealed(false)}
                  className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold bg-[#F3EDE0] dark:bg-[#223229] text-[#6B4423] dark:text-[#F4B41A] hover:bg-[#EAE1CE] dark:hover:bg-[#2B3E33] whitespace-nowrap shrink-0 active:scale-95 transition-transform cursor-pointer"
                >
                  הסתר הכל
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {ANIMALS.map((animal) => {
            const isRevealed = !mysteryMode || revealedIds[animal.id];
            const isPlaying = playingId === animal.id;

            return (
              <article
                key={animal.id}
                className="rounded-3xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 overflow-hidden flex flex-col justify-between"
              >
                {isRevealed ? (
                  <div className="relative">
                    <AnimalPhoto
                      animal={animal}
                      customSrc={brand.customAnimalImages[animal.id]}
                      onUploadFile={(file) => onUploadAnimalPhoto(animal.id, file)}
                      showUploadBadge={true}
                      className="h-44 w-full"
                    />
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-bold text-[#1F5E3B] dark:text-[#7CD49E]">
                          {animal.emoji} {animal.name}
                        </h3>
                        <span className="text-xs text-[#6B4423] dark:text-[#F4B41A] font-medium">
                          {animal.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] mt-1">
                        כינוי: {animal.nickname} · {animal.soundLabel}
                      </p>
                      <p className="text-sm text-[#1C2A21] dark:text-[#E6EDE8] mt-2 leading-snug">
                        {animal.pettingCue}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 flex-1 flex flex-col justify-between bg-gradient-to-b from-[#6B4423]/10 to-[#FBF8F1] dark:from-[#2B3E33] dark:to-[#223229]">
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-[#6B4423] dark:text-[#F4B41A]">
                        <span>תיבת הפתעה · מי מסתתר בפנים?</span>
                        <HelpCircle className="w-4 h-4 text-[#F4B41A]" />
                      </div>
                      <p className="mt-3 text-base font-semibold text-[#1C2A21] dark:text-[#E6EDE8] leading-relaxed">
                        ״{animal.clue}״
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA]">
                        רמז קולי: {animal.soundDescription}
                      </p>
                      <label
                        title="החלף תמונה / העלה מהגלריה"
                        className="min-h-[34px] px-2 py-1 rounded-lg bg-white/80 dark:bg-[#1B2820] hover:bg-white dark:hover:bg-[#131D17] border border-[#6B4423]/15 dark:border-[#E6EDE8]/15 text-[11px] font-bold text-[#6B4423] dark:text-[#F4B41A] inline-flex items-center gap-1 cursor-pointer shrink-0 active:scale-95 transition-transform"
                      >
                        <Camera className="w-3 h-3" />
                        <span>תמונה</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onUploadAnimalPhoto(animal.id, f);
                            e.target.value = '';
                          }}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                )}

                <div className="px-4 pb-4 pt-2 flex items-center gap-2 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
                  <button
                    type="button"
                    onClick={() => handlePlaySound(animal.id)}
                    className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 transition-all cursor-pointer ${
                      isPlaying
                        ? 'bg-[#F4B41A] text-[#1C2A21]'
                        : 'bg-[#1F5E3B] text-white hover:bg-[#16462B]'
                    }`}
                  >
                    <Volume2 className="w-4 h-4 shrink-0" />
                    <span>{isPlaying ? 'משמיע...' : isRevealed ? 'השמע קול' : 'רמז קולי'}</span>
                  </button>

                  {mysteryMode && (
                    <button
                      type="button"
                      onClick={() => handleToggleReveal(animal.id)}
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 active:scale-95 transition-all cursor-pointer ${
                        isRevealed
                          ? 'bg-[#EAE1CE] dark:bg-[#1B2820] text-[#6B4423] dark:text-[#E6EDE8] hover:bg-[#DFD3BA]'
                          : 'bg-[#F4B41A] text-[#1C2A21] hover:bg-[#E0A310]'
                      }`}
                    >
                      {isRevealed ? 'הסתר' : 'חשוף חיה!'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      )}

      {/* Visual Petting Timer & Spinning Wheel */}
      {(showTimer || showWheel) && (
      <div className={showTimer && showWheel ? 'grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch' : 'max-w-2xl mx-auto'}>
        {/* Visual Petting Timer */}
        {showTimer && (
        <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-[#1C2A21] dark:text-[#E6EDE8]">
                  טיימר ליטוף והחלפה
                </h2>
                <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
                  זמן קצוב ונעים לכל סבב ליטוף עם צלצול סיום
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-[#F3EDE0] dark:bg-[#223229] p-1 rounded-xl">
                {([1, 2, 3] as const).map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleSelectDuration(mins)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap active:scale-95 cursor-pointer transition-all ${
                      timerMinutes === mins
                        ? 'bg-[#6B4423] text-white'
                        : 'text-[#6B4423] dark:text-[#E6EDE8] hover:bg-white/70 dark:hover:bg-[#2B3E33]'
                    }`}
                  >
                    {mins} {mins === 1 ? 'דקה' : 'דקות'}
                  </button>
                ))}
              </div>
            </div>

            <div className="my-6 flex flex-col items-center justify-center">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-40 h-40 -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
                  <circle
                    cx="70"
                    cy="70"
                    r={circleRadius}
                    fill="none"
                    stroke="#F3EDE0"
                    strokeWidth="12"
                    className="dark:stroke-[#223229]"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r={circleRadius}
                    fill="none"
                    stroke={timerFinished ? '#F4B41A' : '#1F5E3B'}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={strokeOffset}
                    className="transition-[stroke-dashoffset] duration-500 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold font-display text-[#1C2A21] dark:text-[#E6EDE8] tabular-nums">
                    {formattedTime}
                  </span>
                  <span className="text-xs font-medium text-[#6B4423] dark:text-[#F4B41A] mt-0.5">
                    {timerFinished
                      ? 'הזמן הסתיים!'
                      : isRunning
                        ? 'מלטפים בעדינות'
                        : 'מוכן להפעלה'}
                  </span>
                </div>
              </div>

              {timerFinished ? (
                <p className="mt-3 text-sm font-bold text-[#1F5E3B] dark:text-[#7CD49E] text-center">
                  כל הכבוד לילדים! זמן לתת לחיה לנוח, לשטוף ידיים או לעבור לחבר הבא.
                </p>
              ) : (
                <p className="mt-3 text-sm text-[#4A554E] dark:text-[#B5C4BA] text-center">
                  תזכורת למעגל: ידיים פתוחות ורכות, מלטפים בגב בקול שקט.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
            <button
              type="button"
              onClick={handleToggleTimer}
              className="flex-1 min-h-[48px] px-5 py-3 rounded-2xl bg-[#1F5E3B] hover:bg-[#16462B] text-white font-bold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 cursor-pointer transition-all"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>
                {isRunning
                  ? 'השהה טיימר'
                  : secondsLeft === 0
                    ? 'הפעל מחדש'
                    : 'התחל סבב ליטוף'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleResetTimer}
              aria-label="איפוס טיימר"
              className="min-h-[48px] min-w-[48px] px-4 py-3 rounded-2xl bg-[#F3EDE0] dark:bg-[#223229] hover:bg-[#EAE1CE] dark:hover:bg-[#2B3E33] text-[#6B4423] dark:text-[#E6EDE8] font-semibold text-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 cursor-pointer transition-transform"
            >
              <RotateCcw className="w-4 h-4" />
              <span>איפוס</span>
            </button>
          </div>
        </section>
        )}

        {/* Spinning Movement & Trivia Wheel — Pure Geometry SVG + Crisp HTML RTL Labels */}
        {showWheel && (
        <section className="bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-[#1C2A21] dark:text-[#E6EDE8]">
                  גלגל התנועה והטריוויה
                </h2>
                <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
                  סובבו בין החיות למשימות תנועה מצחיקות או חידות טבע
                </p>
              </div>
              <Sparkles className="w-5 h-5 text-[#F4B41A] shrink-0" />
            </div>

            <div className="my-5 flex flex-col items-center">
              {/* Wheel wrapper with fixed top pointer & centered HTML button */}
              <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center select-none">
                {/* Top pointer */}
                <div
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-[#1C2A21] dark:border-t-[#F4B41A] drop-shadow"
                  aria-hidden="true"
                />

                {/* Rotating wheel disc (SVG slices + HTML RTL labels) */}
                <div
                  className="relative w-full h-full rounded-full shadow-md"
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: isSpinning
                      ? 'transform 3.4s cubic-bezier(0.16, 1, 0.3, 1)'
                      : 'none',
                  }}
                >
                  <svg viewBox="0 0 300 300" className="w-full h-full" aria-hidden="true">
                    {WHEEL_SEGMENTS.map((seg, index) => {
                      const count = WHEEL_SEGMENTS.length;
                      const anglePerSlice = 360 / count;
                      const startDeg = index * anglePerSlice - 90;
                      const endDeg = startDeg + anglePerSlice;
                      const startRad = (startDeg * Math.PI) / 180;
                      const endRad = (endDeg * Math.PI) / 180;
                      const r = 144;
                      const cx = 150;
                      const cy = 150;
                      const x1 = cx + r * Math.cos(startRad);
                      const y1 = cy + r * Math.sin(startRad);
                      const x2 = cx + r * Math.cos(endRad);
                      const y2 = cy + r * Math.sin(endRad);

                      return (
                        <path
                          key={seg.id}
                          d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                          fill={seg.color}
                          stroke="#FBF8F1"
                          strokeWidth="2.5"
                        />
                      );
                    })}
                    <circle
                      cx="150"
                      cy="150"
                      r="144"
                      fill="none"
                      stroke="#6B4423"
                      strokeWidth="3"
                    />
                  </svg>

                  {/* Upright, non-mirrored HTML RTL labels for every slice */}
                  <div className="absolute inset-0 pointer-events-none">
                    {WHEEL_SEGMENTS.map((seg, index) => {
                      const count = WHEEL_SEGMENTS.length;
                      const anglePerSlice = 360 / count;
                      const midDeg = (index + 0.5) * anglePerSlice;
                      const midRad = (midDeg * Math.PI) / 180;
                      const radiusPct = 36; // keep outer slice labels well clear of center hub and slice edges
                      const leftPct = 50 + radiusPct * Math.sin(midRad);
                      const topPct = 50 - radiusPct * Math.cos(midRad);
                      const isBottomHalf = midDeg > 90 && midDeg < 270;
                      const labelAngle = isBottomHalf ? midDeg + 180 : midDeg;

                      return (
                        <div
                          key={seg.id}
                          dir="rtl"
                          style={{
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            transform: `translate(-50%, -50%) rotate(${labelAngle}deg)`,
                            direction: 'rtl',
                            unicodeBidi: 'isolate',
                            color: seg.textColor,
                          }}
                          className="absolute w-[48px] sm:w-[58px] flex flex-col items-center justify-center text-center leading-[1.05]"
                        >
                          <span className="text-xs sm:text-sm leading-none mb-0.5" aria-hidden="true">
                            {seg.emoji}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-extrabold tracking-tight">
                            {seg.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Standard HTML RTL button centered on top of the wheel */}
                <button
                  type="button"
                  dir="rtl"
                  onClick={handleSpinWheel}
                  disabled={isSpinning}
                  aria-label="סובב את הגלגל"
                  style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 sm:w-[74px] sm:h-[74px] rounded-full bg-[#FBF8F1] hover:bg-white border-4 border-[#6B4423] shadow-lg flex items-center justify-center font-extrabold text-xs sm:text-sm text-[#1F5E3B] cursor-pointer active:scale-95 transition-transform disabled:opacity-80"
                >
                  <span>{isSpinning ? 'מסתובב' : 'סובב!'}</span>
                </button>
              </div>

              {selectedSegment && (
                <div className="mt-4 w-full rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#F4B41A]/50 dark:border-[#F4B41A]/35 p-4 text-right">
                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#6B4423] dark:text-[#F4B41A]">
                    <span>
                      {selectedSegment.emoji} {selectedSegment.type} · {selectedSegment.title}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-[#1C2A21] dark:text-[#E6EDE8] leading-relaxed">
                    {selectedSegment.prompt}
                  </p>
                  {selectedSegment.answer && (
                    <div className="mt-2.5">
                      {showTriviaAnswer ? (
                        <p className="text-sm font-bold text-[#1F5E3B] dark:text-[#7CD49E]">
                          תשובה: {selectedSegment.answer}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowTriviaAnswer(true)}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] text-xs font-bold active:scale-95 transition-transform cursor-pointer"
                        >
                          גלה תשובה
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
            <button
              type="button"
              onClick={handleSpinWheel}
              disabled={isSpinning}
              className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-[#F4B41A] hover:bg-[#E0A310] disabled:opacity-60 text-[#1C2A21] font-extrabold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 cursor-pointer transition-all"
            >
              <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'הגלגל מסתובב...' : 'סובב את הגלגל!'}</span>
            </button>
          </div>
        </section>
        )}
      </div>
      )}
    </div>
  );
};
