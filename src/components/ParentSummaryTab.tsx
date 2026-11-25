import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  Download,
  ExternalLink,
  ImagePlus,
  Link2,
  MessageCircle,
  Mic,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Square,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { ANIMALS, EVENT_MODES } from '../data/animals';
import { AnimalId, BrandConfig, EventMode, ParentGeneratorState } from '../types';
import { compressImageFile, copyTextToClipboard, getLandingPageUrl } from '../utils/storage';
import { AnimalPhoto } from './AnimalPhoto';

interface ParentSummaryTabProps {
  brand: BrandConfig;
  state: ParentGeneratorState;
  onChange: (next: ParentGeneratorState) => void;
  onNotify: (message: string) => void;
}

export const ParentSummaryTab: React.FC<ParentSummaryTabProps> = ({
  brand,
  state,
  onChange,
  onNotify,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Voice Recorder state (MediaRecorder)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);
  const recordDurationRef = useRef<number>(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef<ParentGeneratorState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    setLogoError(false);
  }, [brand.logoImage]);

  // Cleanup microphone & audio playback on unmount
  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) window.clearInterval(recordIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current = null;
      }
    };
  }, []);

  const selectedAnimalObjects = useMemo(() => {
    const found = ANIMALS.filter((a) => state.selectedAnimals.includes(a.id));
    return found.length > 0 ? found : [ANIMALS[0]];
  }, [state.selectedAnimals]);

  const currentFactAnimal =
    selectedAnimalObjects[state.factIndex % selectedAnimalObjects.length] || selectedAnimalObjects[0];
  const currentQuestionAnimal =
    selectedAnimalObjects[state.questionIndex % selectedAnimalObjects.length] ||
    selectedAnimalObjects[0];

  const toggleAnimal = (id: AnimalId) => {
    const exists = state.selectedAnimals.includes(id);
    if (exists && state.selectedAnimals.length === 1) return;
    const nextAnimals = exists
      ? state.selectedAnimals.filter((item) => item !== id)
      : [...state.selectedAnimals, id];
    onChange({
      ...state,
      selectedAnimals: nextAnimals,
      factIndex: 0,
      questionIndex: 0,
    });
  };

  const targetName = state.groupOrChildName.trim() || 'הקבוצה המקסימה שלנו';
  const animalNamesText = selectedAnimalObjects.map((a) => a.name).join(', ');

  const includeLanding = state.includeLandingLink !== false;
  const landingUrl = useMemo(() => getLandingPageUrl(), []);

  const shareMessage = useMemo(() => {
    const landingLine = includeLanding
      ? `🌐 לפרטים נוספים, חוגי החיות ואישור וטרינרי בקרו באתר: ${landingUrl}`
      : '';

    if (state.mode === 'summary') {
      return [
        `🌿 *${brand.businessName}* — סיכום מפגש להורים`,
        `🎉 ${state.eventType}: *${targetName}*`,
        ``,
        `היום פגשנו מקרוב את: ${animalNamesText}.`,
        `למדנו להקשיב, לגעת בעדינות ולגלות את סודות הטבע בליווי מקצועי ורגוע.`,
        ``,
        `💡 *עובדה מפתיעה מהמפגש (${currentFactAnimal.name}):*`,
        `${currentFactAnimal.surprisingFact}`,
        ``,
        `🍽️ *שאלה לשיחה בארוחת הערב:*`,
        `${currentQuestionAnimal.dinnerQuestion}`,
        state.customNote.trim() ? `\n✨ *הערה מגאולה:* ${state.customNote.trim()}` : '',
        ``,
        `💛 ${brand.tagline}`,
        landingLine,
        `להזמנות ושאלות בוואטסאפ: ${brand.phone} (https://wa.me/${brand.whatsappDigits})`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    return [
      `🌿 *${brand.businessName}* — הכנה למפגש (לפני ההגעה)`,
      `🎈 לקראת ${state.eventType}: *${targetName}*`,
      ``,
      `בקרוב נגיע אליכם לחוויה בלתי נשכחת עם: ${animalNamesText}!`,
      ``,
      `📋 *כדאי לדעת ולהתכונן מראש:*`,
      `• המפגש מתקיים במעגל רגוע בהשגחה מלאה והקפדה על היגיינה וחיטוי ידיים.`,
      `• מומלץ להגיע בבגדים נוחים שמתאימים לישיבה על מחצלת.`,
      `• אם יש רגישות או אלרגיה מיוחדת, אנא עדכנו את הצוות מראש.`,
      `• מסקרן לגלות כבר מעכשיו: ${currentFactAnimal.clue}`,
      state.customNote.trim() ? `\n✨ *הודעה מגאולה:* ${state.customNote.trim()}` : '',
      ``,
      `💛 ${brand.tagline}`,
      landingLine,
      `לתיאום ישיר עם גאולה: ${brand.phone} (https://wa.me/${brand.whatsappDigits})`,
    ]
      .filter(Boolean)
      .join('\n');
  }, [brand, state, targetName, animalNamesText, currentFactAnimal, currentQuestionAnimal, includeLanding, landingUrl]);

  const handleCopyLandingLink = async () => {
    await copyTextToClipboard(landingUrl);
    onNotify('הקישור לדף הנחיתה הועתק!');
  };

  const handleCopyText = async () => {
    await copyTextToClipboard(shareMessage);
    setCopied(true);
    onNotify('הודעת הוואטסאפ הועתקה! מוכנה להדבקה בקבוצת ההורים');
    window.setTimeout(() => setCopied(false), 2400);
  };

  const sessionPhotos = state.sessionPhotos || [];

  const handleAddSessionPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = Math.max(0, 3 - sessionPhotos.length);
    if (remainingSlots === 0) {
      onNotify('ניתן לצרף עד 3 תמונות מפגש לכרטיס');
      return;
    }
    const chosen = Array.from(files).slice(0, remainingSlots);
    try {
      const compressed = await Promise.all(
        chosen.map((file) => compressImageFile(file, 760, 0.78))
      );
      onChange({
        ...stateRef.current,
        sessionPhotos: [...(stateRef.current.sessionPhotos || []), ...compressed].slice(0, 3),
      });
      onNotify('תמונות המפגש נוספו לכרטיס השיתוף!');
    } catch {
      onNotify('לא ניתן היה לקרוא חלק מקבצי התמונה');
    }
  };

  const handleRemoveSessionPhoto = (idx: number) => {
    const next = sessionPhotos.filter((_, i) => i !== idx);
    onChange({
      ...stateRef.current,
      sessionPhotos: next,
    });
  };

  const whatsappShareUrl = `https://wa.me/${brand.whatsappDigits}?text=${encodeURIComponent(
    shareMessage
  )}`;

  // Voice Recording handlers
  const handleStartRecording = async () => {
    setRecorderError(null);
    if (audioElRef.current) {
      audioElRef.current.pause();
      setIsPlayingAudio(false);
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setRecorderError('הדפדפן במכשיר זה אינו תומך בהקלטת קול.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeOptions = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', ''];
      const supportedMime = mimeOptions.find(
        (m) => !m || MediaRecorder.isTypeSupported(m)
      );
      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recordDurationRef.current = 0;
      setRecordingSec(0);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (recordIntervalRef.current) {
          window.clearInterval(recordIntervalRef.current);
          recordIntervalRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blobType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: blobType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          onChange({
            ...stateRef.current,
            prepAudioDataUrl: dataUrl,
            prepAudioDurationSec: Math.max(1, recordDurationRef.current),
          });
          onNotify('ההודעה הקולית נשמרה!');
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
      recordIntervalRef.current = window.setInterval(() => {
        recordDurationRef.current += 1;
        setRecordingSec(recordDurationRef.current);
        if (recordDurationRef.current >= 60 && mediaRecorderRef.current?.state !== 'inactive') {
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
          onNotify('ההקלטה נעצרה אוטומטית לאחר דקה לשמירה נוחה');
        }
      }, 1000);
    } catch {
      setRecorderError('יש לאשר גישה למיקרופון בדפדפן כדי להקליט הודעה קולית.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleTogglePlayback = () => {
    if (!state.prepAudioDataUrl) return;

    if (isPlayingAudio && audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
      setIsPlayingAudio(false);
      return;
    }

    const audio = new Audio(state.prepAudioDataUrl);
    audioElRef.current = audio;
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => {
      setIsPlayingAudio(false);
      setRecorderError('לא ניתן לנגן את ההקלטה במכשיר זה.');
    };
    audio
      .play()
      .then(() => setIsPlayingAudio(true))
      .catch(() => setRecorderError('לא ניתן לנגן את ההקלטה כרגע.'));
  };

  const handleDeleteRecording = () => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    setIsPlayingAudio(false);
    setRecordingSec(0);
    onChange({
      ...state,
      prepAudioDataUrl: undefined,
      prepAudioDurationSec: undefined,
    });
    onNotify('ההקלטה הקולית נמחקה');
  };

  const formatAudioTime = (secs: number) =>
    `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

  // Canvas postcard export (clean RTL layout with all selected animals, uploaded session photos, auto-sized text blocks, & Geula's footer)
  const handleDownloadCardImage = async () => {
    setDownloading(true);
    try {
      const previewAnimals = selectedAnimalObjects;
      const cols = previewAnimals.length <= 2 ? Math.max(1, previewAnimals.length) : 3;
      const rowsCount = Math.ceil(previewAnimals.length / cols);
      const boxH = rowsCount >= 3 ? 175 : rowsCount === 2 ? 200 : 250;
      const rowStep = boxH + 58;

      const photosToDraw = sessionPhotos.slice(0, 3);
      const hasSessionPhotos = photosToDraw.length > 0;
      const hasCustomNote = Boolean(state.customNote.trim());

      const factBody =
        state.mode === 'summary'
          ? currentFactAnimal.surprisingFact
          : 'מגיעים בבגדים נוחים, יושבים במעגל שקט, מלטפים בעדינות ומקפידים על היגיינת ידיים.';
      const questionBody =
        state.mode === 'summary'
          ? currentQuestionAnimal.dinnerQuestion
          : currentFactAnimal.clue;
      const noteBody = hasCustomNote ? `✨ מילה מגאולה: ${state.customNote.trim()}` : '';

      // Pre-measure wrapped line counts so boxes never clip long text
      const measureCanvas = document.createElement('canvas');
      const mCtx = measureCanvas.getContext('2d');
      const splitLines = (text: string, maxWidth: number, font: string): string[] => {
        if (!mCtx) return [text];
        mCtx.font = font;
        const words = text.split(' ');
        const lines: string[] = [];
        let line = '';
        for (let n = 0; n < words.length; n++) {
          const testLine = line ? `${line} ${words[n]}` : words[n];
          if (mCtx.measureText(testLine).width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n];
          } else {
            line = testLine;
          }
        }
        if (line) lines.push(line);
        return lines;
      };

      const factLines = splitLines(factBody, 880, '500 25px Heebo, sans-serif');
      const questionLines = splitLines(questionBody, 880, '500 25px Heebo, sans-serif');
      const noteLines = hasCustomNote ? splitLines(noteBody, 880, 'bold 24px Heebo, sans-serif') : [];

      const box1H = Math.max(176, 118 + factLines.length * 38);
      const box2H = Math.max(176, 118 + questionLines.length * 38);
      const noteBoxH = hasCustomNote ? Math.max(88, 56 + noteLines.length * 34) : 0;

      const gridTopY = 285;
      const totalAnimalGridH = rowsCount * rowStep + 20;
      const sessionStripH = hasSessionPhotos ? 265 : 0;
      const footerH = 150;

      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height =
        gridTopY +
        totalAnimalGridH +
        sessionStripH +
        box1H +
        24 +
        box2H +
        24 +
        (hasCustomNote ? noteBoxH + 22 : 0) +
        footerH;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const loadImage = (src: string) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });

      const [logoImg, loadedResults] = await Promise.all([
        brand.logoImage ? loadImage(brand.logoImage) : Promise.resolve(null),
        Promise.all([
          ...previewAnimals.map((a) => loadImage(brand.customAnimalImages[a.id] || a.defaultImage)),
          ...photosToDraw.map((src) => loadImage(src)),
        ]),
      ]);
      const animalImgs = loadedResults.slice(0, previewAnimals.length);
      const sessionImgs = loadedResults.slice(previewAnimals.length);

      // Background cream
      ctx.fillStyle = '#FBF8F1';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header forest green band
      ctx.fillStyle = '#1F5E3B';
      ctx.fillRect(0, 0, canvas.width, 236);

      // Gold accent band
      ctx.fillStyle = '#F4B41A';
      ctx.fillRect(0, 236, canvas.width, 10);

      // Brand logo badge in header (top-right for RTL)
      if (logoImg) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(884, 48, 136, 136, 28);
        ctx.clip();
        const ratio = Math.max(136 / logoImg.width, 136 / logoImg.height);
        const dw = logoImg.width * ratio;
        const dh = logoImg.height * ratio;
        ctx.drawImage(logoImg, 884 + (136 - dw) / 2, 48 + (136 - dh) / 2, dw, dh);
        ctx.restore();
        ctx.strokeStyle = '#F4B41A';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(884, 48, 136, 136, 28);
        ctx.stroke();
      }

      // Header RTL text
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';

      const textAnchorX = logoImg ? 850 : 1010;
      ctx.fillStyle = '#F4B41A';
      ctx.font = 'bold 28px Heebo, Rubik, sans-serif';
      const subtitle =
        state.mode === 'summary'
          ? `סיכום מפגש להורים · ${state.eventType}`
          : `הכנה למפגש הקרוב · ${state.eventType}`;
      ctx.fillText(subtitle, textAnchorX, 82);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px Rubik, Heebo, sans-serif';
      ctx.fillText(brand.businessName, textAnchorX, 138);

      ctx.fillStyle = '#E6F2EB';
      ctx.font = '600 28px Heebo, sans-serif';
      ctx.fillText(targetName, textAnchorX, 192);

      // Draw all selected animal cards in balanced 1..3 column RTL grid
      const cardGap = 24;
      const totalWidth = 960;
      const boxW = (totalWidth - cardGap * (cols - 1)) / cols;
      const startX = 60;

      previewAnimals.forEach((animal, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const rtlCol = cols - 1 - col;
        const x = startX + rtlCol * (boxW + cardGap);
        const y = gridTopY + row * rowStep;
        const img = animalImgs[idx];

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, boxW, boxH, 26);
        ctx.clip();
        if (img) {
          const ratio = Math.max(boxW / img.width, boxH / img.height);
          const drawW = img.width * ratio;
          const drawH = img.height * ratio;
          ctx.drawImage(img, x + (boxW - drawW) / 2, y + (boxH - drawH) / 2, drawW, drawH);
        } else {
          ctx.fillStyle = '#F3EDE0';
          ctx.fillRect(x, y, boxW, boxH);
          ctx.textAlign = 'center';
          ctx.font = '68px sans-serif';
          ctx.fillText(animal.emoji, x + boxW / 2, y + boxH / 2 + 24);
        }
        ctx.restore();

        ctx.strokeStyle = '#D9CEB8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, boxW, boxH, 26);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#1F5E3B';
        ctx.font = 'bold 23px Rubik, sans-serif';
        ctx.fillText(`${animal.emoji} ${animal.name}`, x + boxW / 2, y + boxH + 34);
      });

      let curY = gridTopY + totalAnimalGridH;

      // Optional Uploaded Session Photos Strip (No Children's Faces)
      if (hasSessionPhotos) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#6B4423';
        ctx.font = 'bold 24px Rubik, sans-serif';
        ctx.fillText('📸 תמונות מפינת ההפעלה היום:', 980, curY + 18);

        const sCols = photosToDraw.length;
        const sGap = 20;
        const sW = (960 - sGap * (sCols - 1)) / sCols;
        const sH = 190;
        const sY = curY + 38;

        photosToDraw.forEach((_, idx) => {
          const rtlCol = sCols - 1 - idx;
          const sx = 60 + rtlCol * (sW + sGap);
          const sImg = sessionImgs[idx];
          if (sImg) {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(sx, sY, sW, sH, 22);
            ctx.clip();
            const ratio = Math.max(sW / sImg.width, sH / sImg.height);
            const dw = sImg.width * ratio;
            const dh = sImg.height * ratio;
            ctx.drawImage(sImg, sx + (sW - dw) / 2, sY + (sH - dh) / 2, dw, dh);
            ctx.restore();
            ctx.strokeStyle = '#F4B41A';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(sx, sY, sW, sH, 22);
            ctx.stroke();
          }
        });
        curY += sessionStripH;
      }

      // Box 1: Surprising fact or Prep info
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(60, curY, 960, box1H, 28);
      ctx.fill();
      ctx.strokeStyle = '#D9CEB8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.fillStyle = '#1F5E3B';
      ctx.font = 'bold 29px Rubik, sans-serif';
      ctx.fillText(
        state.mode === 'summary'
          ? `💡 עובדה מפתיעה מהמפגש · ${currentFactAnimal.name}`
          : '📋 הכנה והנחיות למפגש רגוע ובטוח',
        980,
        curY + 54
      );
      ctx.fillStyle = '#1C2A21';
      ctx.font = '500 25px Heebo, sans-serif';
      factLines.forEach((ln, i) => {
        ctx.fillText(ln, 980, curY + 104 + i * 38);
      });

      curY += box1H + 24;

      // Box 2: Dinner question or Clue
      ctx.fillStyle = '#FFF9E8';
      ctx.beginPath();
      ctx.roundRect(60, curY, 960, box2H, 28);
      ctx.fill();
      ctx.strokeStyle = '#F4B41A';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#6B4423';
      ctx.font = 'bold 29px Rubik, sans-serif';
      ctx.fillText(
        state.mode === 'summary'
          ? '🍽️ שאלה לשיחה בארוחת הערב'
          : '🔍 רמז מסקרן לילדים בבית',
        980,
        curY + 54
      );
      ctx.fillStyle = '#1C2A21';
      ctx.font = '500 25px Heebo, sans-serif';
      questionLines.forEach((ln, i) => {
        ctx.fillText(ln, 980, curY + 104 + i * 38);
      });

      curY += box2H + 24;

      if (hasCustomNote) {
        ctx.fillStyle = '#F3EDE0';
        ctx.beginPath();
        ctx.roundRect(60, curY, 960, noteBoxH, 22);
        ctx.fill();
        ctx.textAlign = 'right';
        ctx.fillStyle = '#1F5E3B';
        ctx.font = 'bold 24px Heebo, sans-serif';
        noteLines.forEach((ln, i) => {
          ctx.fillText(ln, 980, curY + 46 + i * 34);
        });
        curY += noteBoxH + 22;
      }

      // Footer
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1F5E3B';
      ctx.font = 'bold 28px Rubik, sans-serif';
      ctx.fillText(brand.tagline, 540, curY + 42);
      ctx.fillStyle = '#6B4423';
      ctx.font = 'bold 30px Rubik, sans-serif';
      ctx.fillText(`וואטסאפ והזמנות: ${brand.phone} · ללא תמונות פנים של ילדים`, 540, curY + 94);

      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `mamlechet-hahayot-${state.mode}-${Date.now()}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onNotify('כרטיס התמונה מוכן! אפשר לשלוח בקבוצת הוואטסאפ');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Configuration Form */}
      <section className="lg:col-span-5 bg-white dark:bg-[#1B2820] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#6B4423]/12 dark:border-[#E6EDE8]/10 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-[#1F5E3B] dark:text-[#7CD49E]">מחולל סיכום והכנה להורים</h2>
          <p className="text-sm text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
            צרו כרטיס שיתוף מרגש לקבוצת הוואטסאפ — עם תמונות חיות בלבד לשמירה על פרטיות הילדים
          </p>
        </div>

        {/* Toggle Summary vs Prep */}
        <div className="grid grid-cols-2 gap-2 bg-[#F3EDE0] dark:bg-[#24342B] p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => onChange({ ...state, mode: 'summary' })}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap active:scale-95 cursor-pointer transition-all ${
              state.mode === 'summary'
                ? 'bg-[#1F5E3B] text-white shadow-sm'
                : 'text-[#6B4423] dark:text-[#C8D6CD] hover:bg-white/70 dark:hover:bg-[#1B2820]'
            }`}
          >
            סיכום מפגש להורים
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...state, mode: 'prep' })}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap active:scale-95 cursor-pointer transition-all ${
              state.mode === 'prep'
                ? 'bg-[#6B4423] text-white shadow-sm'
                : 'text-[#6B4423] dark:text-[#C8D6CD] hover:bg-white/70 dark:hover:bg-[#1B2820]'
            }`}
          >
            הכנה למפגש (לפני ההגעה)
          </button>
        </div>

        {/* Real Voice Recorder when Prep mode is active */}
        {state.mode === 'prep' && (
          <div className="rounded-2xl bg-[#FFF9E8] dark:bg-[#232D22] border border-[#F4B41A]/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-[#6B4423] dark:text-[#F4B41A]">
                  הקליטי הודעה קולית קצרה לילדים
                </h3>
                <p className="text-xs text-[#4A554E] dark:text-[#B5C4BA] mt-0.5">
                  הילדים שומעים את קולך לפני המפגש ומתרגשים לקראת החיות!
                </p>
              </div>
              {(isRecording || state.prepAudioDurationSec) && (
                <span className="text-xs font-extrabold text-[#1F5E3B] dark:text-[#7CD49E] tabular-nums shrink-0">
                  {formatAudioTime(isRecording ? recordingSec : state.prepAudioDurationSec || 0)}
                </span>
              )}
            </div>

            {recorderError && (
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-xl">
                {recorderError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1F5E3B] hover:bg-[#16462B] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                >
                  <Mic className="w-4 h-4 text-[#F4B41A]" />
                  <span>{state.prepAudioDataUrl ? 'הקלטה חדשה' : 'הקלט הודעה קולית'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>עצור הקלטה ({formatAudioTime(recordingSec)})</span>
                </button>
              )}

              {state.prepAudioDataUrl && !isRecording && (
                <>
                  <button
                    type="button"
                    onClick={handleTogglePlayback}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                  >
                    {isPlayingAudio ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>{isPlayingAudio ? 'עצור השמעה' : 'השמע הודעה'}</span>
                  </button>

                  <a
                    href={state.prepAudioDataUrl}
                    download={`geula-greeting-${Date.now()}.webm`}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-[#1B2820] hover:bg-[#F3EDE0] dark:hover:bg-[#2B3E33] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-[#6B4423] dark:text-[#E6EDE8] text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap active:scale-95 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>הורד שמע</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleDeleteRecording}
                    aria-label="מחק הקלטה"
                    className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-white dark:bg-[#1B2820] hover:bg-red-50 dark:hover:bg-red-950/40 border border-[#6B4423]/15 dark:border-[#E6EDE8]/15 text-[#6B4423] dark:text-[#E6EDE8] hover:text-red-700 dark:hover:text-red-400 text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>מחק</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Event Type */}
        <div>
          <label className="block text-sm font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-2">
            סוג האירוע / מסגרת
          </label>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange({ ...state, eventType: m.id as EventMode })}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold border whitespace-nowrap active:scale-95 cursor-pointer transition-all ${
                  state.eventType === m.id
                    ? 'bg-[#F4B41A]/20 border-[#F4B41A] text-[#1C2A21] dark:text-[#F4B41A]'
                    : 'bg-[#FBF8F1] dark:bg-[#223229] border-[#6B4423]/15 dark:border-[#E6EDE8]/10 text-[#4A554E] dark:text-[#B5C4BA] hover:bg-[#F3EDE0]'
                }`}
              >
                {m.id}
              </button>
            ))}
          </div>
        </div>

        {/* Group / Child Name */}
        <div>
          <label
            htmlFor="group-child-name"
            className="block text-sm font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1.5"
          >
            שם הגן / הקבוצה / ילד או ילדת יום ההולדת
          </label>
          <input
            id="group-child-name"
            type="text"
            value={state.groupOrChildName}
            onChange={(e) => onChange({ ...state, groupOrChildName: e.target.value })}
            placeholder="לדוגמה: גן תמר / יום ההולדת של נועם"
            className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-[#1C2A21] dark:text-[#E6EDE8] placeholder:text-[#4A554E]/60 dark:placeholder:text-[#B5C4BA]/60 focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
          />
        </div>

        {/* Participating Animals */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-[#1C2A21] dark:text-[#E6EDE8]">
              בעלי החיים שהשתתפו
            </span>
            <span className="text-xs text-[#6B4423] dark:text-[#F4B41A] tabular-nums">
              {selectedAnimalObjects.length} נבחרו
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ANIMALS.map((animal) => {
              const selected = state.selectedAnimals.includes(animal.id);
              return (
                <button
                  key={animal.id}
                  type="button"
                  onClick={() => toggleAnimal(animal.id)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 cursor-pointer transition-all ${
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

        {/* Upload Session Photos (No Children's Faces) */}
        <div className="rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/15 dark:border-[#E6EDE8]/10 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-[#1F5E3B] dark:text-[#7CD49E] block">
                תמונות מהמפגש להטמעה בגלויה (עד 3)
              </span>
              <span className="text-[11px] text-[#4A554E] dark:text-[#B5C4BA]">
                פינת החיות / תקריב חמוד — ללא צילום פני ילדים
              </span>
            </div>
            <label
              className={`min-h-[40px] px-3 py-1.5 rounded-xl bg-[#1F5E3B] hover:bg-[#16462B] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-95 transition-transform ${
                sessionPhotos.length >= 3 ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <ImagePlus className="w-3.5 h-3.5 text-[#F4B41A]" />
              <span>הוסף תמונה</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  handleAddSessionPhotos(e.target.files);
                  e.target.value = '';
                }}
                className="sr-only"
              />
            </label>
          </div>

          {sessionPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {sessionPhotos.map((src, idx) => (
                <div
                  key={idx}
                  className="relative rounded-xl overflow-hidden h-20 border border-[#6B4423]/20 dark:border-[#E6EDE8]/15"
                >
                  <img
                    src={src}
                    alt={`תמונת מפגש ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSessionPhoto(idx)}
                    aria-label="הסר תמונת מפגש"
                    className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/70 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optional Note */}
        <div>
          <label
            htmlFor="custom-parent-note"
            className="block text-sm font-bold text-[#1C2A21] dark:text-[#E6EDE8] mb-1.5"
          >
            הערה אישית מגאולה (אופציונלי)
          </label>
          <textarea
            id="custom-parent-note"
            rows={2}
            value={state.customNote}
            onChange={(e) => onChange({ ...state, customNote: e.target.value })}
            placeholder="לדוגמה: הילדים היו מקסימים, סקרנים ועדינים במיוחד!"
            className="w-full px-4 py-2.5 rounded-2xl bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 text-sm text-[#1C2A21] dark:text-[#E6EDE8] placeholder:text-[#4A554E]/60 dark:placeholder:text-[#B5C4BA]/60 focus:outline-none focus:ring-2 focus:ring-[#1F5E3B]"
          />
        </div>

        {/* Include Landing Page & Vet Approval Link Toggle */}
        <div className="pt-3 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 space-y-2.5">
          <button
            type="button"
            onClick={() => onChange({ ...state, includeLandingLink: !includeLanding })}
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 cursor-pointer active:scale-95 transition-all ${
              includeLanding
                ? 'bg-[#1F5E3B]/10 dark:bg-[#1F5E3B]/30 border-[#1F5E3B]/35 text-[#1F5E3B] dark:text-[#7CD49E]'
                : 'bg-[#FBF8F1] dark:bg-[#223229] border-[#6B4423]/15 text-[#4A554E] dark:text-[#B5C4BA]'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-right">
              <Link2 className="w-4 h-4 shrink-0" />
              <span>צרף קישור לדף הנחיתה ואישור וטרינרי בהודעה</span>
            </span>
            <span className="shrink-0">{includeLanding ? 'מופעל' : 'כבוי'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLandingLink}
            className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F3EDE0] dark:bg-[#24342B] hover:bg-[#EAE1CE] text-[#6B4423] dark:text-[#E6EDE8] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>העתק קישור לדף הנחיתה</span>
          </button>
        </div>
      </section>

      {/* Live Shareable Preview Card */}
      <section className="lg:col-span-7 space-y-4">
        <div className="bg-white dark:bg-[#1B2820] rounded-3xl overflow-hidden shadow-sm border border-[#6B4423]/15 dark:border-[#E6EDE8]/10">
          {/* Card Brand Banner */}
          <div className="bg-[#1F5E3B] text-white px-5 py-5 sm:px-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {logoError || !brand.logoImage ? (
                  <div className="w-12 h-12 rounded-2xl bg-[#F4B41A] text-[#1C2A21] flex items-center justify-center text-xl shrink-0 border-2 border-white/40">
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
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#F4B41A]">
                    {state.mode === 'summary' ? 'סיכום מפגש להורים' : 'הכנה למפגש הקרוב'} ·{' '}
                    {state.eventType}
                  </p>
                  <h3 className="text-lg sm:text-xl font-bold truncate">{brand.businessName}</h3>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/90 shrink-0">
                <ShieldCheck className="w-4 h-4 text-[#F4B41A]" />
                <span>ללא צילומי ילדים</span>
              </div>
            </div>

            <p className="mt-3 text-base sm:text-lg font-bold text-[#FBF8F1]">{targetName}</p>
          </div>

          <div className="h-1.5 bg-[#F4B41A]" />

          {/* Animal Photos Strip */}
          <div className="p-5 sm:p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-[#6B4423] dark:text-[#F4B41A] mb-3">
                הכוכבים שהשתתפו היום · {animalNamesText}
              </p>
              <div
                className={`grid gap-3 ${
                  selectedAnimalObjects.length === 1
                    ? 'grid-cols-1'
                    : selectedAnimalObjects.length === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-2 sm:grid-cols-3'
                }`}
              >
                {selectedAnimalObjects.map((animal) => (
                  <div
                    key={animal.id}
                    className="rounded-2xl overflow-hidden bg-[#FBF8F1] dark:bg-[#223229] border border-[#6B4423]/12 dark:border-[#E6EDE8]/10"
                  >
                    <AnimalPhoto
                      animal={animal}
                      customSrc={brand.customAnimalImages[animal.id]}
                      className="h-28 sm:h-32 w-full"
                    />
                    <p className="px-3 py-2 text-xs font-bold text-[#1F5E3B] dark:text-[#7CD49E] text-center truncate">
                      {animal.emoji} {animal.name}
                    </p>
                  </div>
                ))}
              </div>

              {sessionPhotos.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
                  <p className="text-xs font-semibold text-[#6B4423] dark:text-[#F4B41A] mb-2 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    <span>תמונות מפינת ההפעלה היום (ללא פני ילדים)</span>
                  </p>
                  <div
                    className={`grid gap-2.5 ${
                      sessionPhotos.length === 1
                        ? 'grid-cols-1'
                        : sessionPhotos.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-3'
                    }`}
                  >
                    {sessionPhotos.map((src, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl overflow-hidden border border-[#F4B41A]/50 h-28 sm:h-32 bg-[#FBF8F1] dark:bg-[#223229]"
                      >
                        <img
                          src={src}
                          alt={`תמונת מפגש ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fact & Question Blocks */}
            {state.mode === 'summary' ? (
              <div className="space-y-4 pt-2 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#1F5E3B] dark:text-[#7CD49E]">
                      עובדה מפתיעה מהמפגש · {currentFactAnimal.name}
                    </h4>
                    {selectedAnimalObjects.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          onChange({ ...state, factIndex: state.factIndex + 1 })
                        }
                        className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#F3EDE0] dark:bg-[#24342B] text-[#6B4423] dark:text-[#E6EDE8] text-xs font-semibold inline-flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>החלף עובדה</span>
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-[#1C2A21] dark:text-[#D5E0D9] leading-relaxed">
                    {currentFactAnimal.surprisingFact}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#6B4423] dark:text-[#F4B41A] inline-flex items-center gap-1.5">
                      <Utensils className="w-4 h-4 text-[#F4B41A]" />
                      <span>שאלה לשיחה בארוחת הערב</span>
                    </h4>
                    {selectedAnimalObjects.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          onChange({ ...state, questionIndex: state.questionIndex + 1 })
                        }
                        className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#F3EDE0] dark:bg-[#24342B] text-[#6B4423] dark:text-[#E6EDE8] text-xs font-semibold inline-flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>החלף שאלה</span>
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-[#1C2A21] dark:text-[#E6EDE8] leading-relaxed">
                    {currentQuestionAnimal.dinnerQuestion}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
                <div>
                  <h4 className="text-sm font-bold text-[#1F5E3B] dark:text-[#7CD49E]">
                    איך מתכוננים לחוויה בטוחה ונעימה?
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-sm text-[#1C2A21] dark:text-[#D5E0D9]">
                    <li>• מומלץ להלביש לילדים בגדים נוחים לישיבה על מחצלת הפעילות.</li>
                    <li>• שומרים על מעגל רגוע והקשבה — כל החיות מורגלות ועדינות במיוחד.</li>
                    <li>• הקפדה מלאה על חיטוי ושטיפת ידיים לכל משתתף לפני ואחרי הליטוף.</li>
                    <li>• אם יש רגישות או אלרגיה ספציפית, אנא ידעו את הצוות מראש.</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
                  <h4 className="text-sm font-bold text-[#6B4423] dark:text-[#F4B41A]">
                    רמז מסקרן לספר לילדים לפני שנגיע
                  </h4>
                  <p className="mt-1.5 text-sm text-[#1C2A21] dark:text-[#E6EDE8] leading-relaxed">
                    ״{currentFactAnimal.clue}״
                  </p>
                </div>
              </div>
            )}

            {state.customNote.trim() && (
              <div className="pt-3 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10">
                <p className="text-sm text-[#1F5E3B] dark:text-[#7CD49E] font-medium">
                  <strong className="font-bold">מילה חמה מגאולה: </strong>
                  {state.customNote}
                </p>
              </div>
            )}

            {/* Footer line */}
            <div className="pt-4 border-t border-[#6B4423]/10 dark:border-[#E6EDE8]/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[#6B4423] dark:text-[#C8D6CD]">
              <span className="font-bold text-[#1F5E3B] dark:text-[#7CD49E]">{brand.tagline}</span>
              <span className="tabular-nums font-bold">
                וואטסאפ והזמנות: {brand.phone}
              </span>
            </div>
          </div>
        </div>

        {/* Share & Export Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleDownloadCardImage}
            disabled={downloading}
            className="sm:col-span-2 min-h-[52px] px-5 py-3.5 rounded-2xl bg-[#F4B41A] hover:bg-[#E0A310] text-[#1C2A21] font-extrabold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 cursor-pointer transition-all shadow-sm"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{downloading ? 'מכין גלוית תמונה...' : 'הורד כרטיס כתמונה לוואטסאפ'}</span>
          </button>

          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[48px] px-4 py-3 rounded-2xl bg-[#1F5E3B] hover:bg-[#16462B] text-white font-bold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 transition-all"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>שלח טקסט בוואטסאפ</span>
          </a>

          <button
            type="button"
            onClick={handleCopyText}
            className="min-h-[48px] px-4 py-3 rounded-2xl bg-white dark:bg-[#1B2820] hover:bg-[#F3EDE0] dark:hover:bg-[#24342B] text-[#6B4423] dark:text-[#E6EDE8] border border-[#6B4423]/20 dark:border-[#E6EDE8]/15 font-bold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 cursor-pointer transition-all"
          >
            {copied ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
            <span>{copied ? 'הועתק בהצלחה!' : 'העתק טקסט להורים'}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
