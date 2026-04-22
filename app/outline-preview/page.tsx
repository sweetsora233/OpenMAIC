'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import {
  ArrowLeft,
  Play,
  Plus,
  Trash2,
  Eye,
  GripVertical,
  ChevronDown,
  FileText,
  HelpCircle,
  Puzzle,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useSettingsStore } from '@/lib/store/settings';
import { useStageStore } from '@/lib/store/stage';
import { nanoid } from 'nanoid';
import type { SceneOutline, PdfImage } from '@/lib/types/generation';
import type { Stage } from '@/lib/types/stage';
import { loadImageMapping } from '@/lib/utils/image-storage';
import { createLogger } from '@/lib/logger';
import { OutlineCard } from '@/components/outline-editor/OutlineCard';

const log = createLogger('OutlinePreview');

// Scene type options
const SCENE_TYPES = [
  { id: 'slide', label: 'toolbar.typeSlide', icon: FileText },
  { id: 'quiz', label: 'toolbar.typeQuiz', icon: HelpCircle },
  { id: 'interactive', label: 'toolbar.typeInteractive', icon: Puzzle },
  { id: 'pbl', label: 'toolbar.typePbl', icon: Briefcase },
] as const;

function OutlinePreviewContent() {
  const router = useRouter();
  const { t } = useI18n();
  const hasResumedRef = useRef(false);

  const [session, setSession] = useState<{
    requirements: {
      requirement: string;
      userNickname?: string;
      userBio?: string;
      webSearch?: boolean;
      interactiveMode?: boolean;
    };
    pdfText?: string;
    pdfImages?: PdfImage[];
    imageStorageIds?: string[];
    researchContext?: string;
    sceneOutlines: SceneOutline[];
    languageDirective?: string;
  } | null>(null);
  const [outlines, setOutlines] = useState<SceneOutline[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageMapping, setImageMapping] = useState<Record<string, string>>({});

  // Load session and outlines from sessionStorage
  useEffect(() => {
    const savedSession = sessionStorage.getItem('outlinePreviewSession');
    const savedOutlines = sessionStorage.getItem('outlinePreviewOutlines');

    if (savedSession && savedOutlines) {
      try {
        const parsedSession = JSON.parse(savedSession);
        const parsedOutlines = JSON.parse(savedOutlines) as SceneOutline[];
        setSession(parsedSession);
        setOutlines(parsedOutlines);
      } catch (e) {
        log.error('Failed to parse outline preview data:', e);
      }
    }
    setLoading(false);
  }, []);

  // Load image mapping for preview
  useEffect(() => {
    if (session?.imageStorageIds && session.imageStorageIds.length > 0) {
      loadImageMapping(session.imageStorageIds).then(setImageMapping);
    }
  }, [session?.imageStorageIds]);

  // Handle continue generation
  const handleContinue = async () => {
    if (!session || !outlines.length) return;

    // Finalize order before continuing
    const finalizedOutlines = outlines.map((o, i) => ({ ...o, order: i + 1 }));

    // Update session with edited outlines
    const updatedSession = {
      ...session,
      sceneOutlines: finalizedOutlines,
    };

    // Store back to generationSession for resumption
    sessionStorage.setItem('generationSession', JSON.stringify(updatedSession));
    sessionStorage.removeItem('outlinePreviewSession');
    sessionStorage.removeItem('outlinePreviewOutlines');

    router.push('/generation-preview?resume=true');
  };

  // Handle go back
  const handleGoBack = () => {
    sessionStorage.removeItem('outlinePreviewSession');
    sessionStorage.removeItem('outlinePreviewOutlines');
    sessionStorage.removeItem('generationSession');
    router.push('/');
  };

  // Add new outline at position
  const handleAddOutline = (atIndex: number) => {
    const newOutline: SceneOutline = {
      id: nanoid(),
      type: 'slide',
      title: '',
      description: '',
      keyPoints: [],
      order: atIndex + 1,
    };
    const newOutlines = [...outlines];
    newOutlines.splice(atIndex, 0, newOutline);
    setOutlines(newOutlines);
  };

  // Delete outline
  const handleDeleteOutline = (id: string) => {
    setOutlines(outlines.filter((o) => o.id !== id));
  };

  // Update outline
  const handleUpdateOutline = (id: string, updates: Partial<SceneOutline>) => {
    setOutlines(outlines.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  // Reorder outlines
  const handleReorder = (newOrder: SceneOutline[]) => {
    setOutlines(newOrder);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="size-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !outlines.length) {
    return (
      <div className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">{t('outlinePreview.noOutlines')}</p>
            <Button onClick={handleGoBack} className="w-full">
              <ArrowLeft className="size-4 mr-2" />
              {t('outlinePreview.backToHome')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="size-4 mr-2" />
            {t('outlinePreview.back')}
          </Button>
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-violet-500" />
            <span className="font-medium">{t('outlinePreview.title')}</span>
            <span className="text-sm text-muted-foreground">
              ({outlines.length} {t('outlinePreview.pages')})
            </span>
          </div>
          <Button onClick={handleContinue} className="gap-2">
            <Play className="size-4" />
            {t('outlinePreview.continue')}
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-4xl mx-auto px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
        <GripVertical className="size-3" />
        {t('outlinePreview.dragToReorder')}
      </div>

      {/* Outline list */}
      <div className="flex-1 max-w-4xl mx-auto px-4 pb-8 space-y-2">
        <Reorder.Group
          axis="y"
          values={outlines}
          onReorder={handleReorder}
          className="space-y-2"
        >
          {outlines.map((outline, index) => (
            <Reorder.Item
              key={outline.id}
              value={outline}
              className="cursor-grab active:cursor-grabbing"
            >
              <OutlineCard
                outline={outline}
                index={index}
                t={t}
                imageMapping={imageMapping}
                pdfImages={session.pdfImages}
                onUpdate={handleUpdateOutline}
                onDelete={() => handleDeleteOutline(outline.id)}
              />
              {/* Add button between cards */}
              {index < outlines.length - 1 && (
                <div className="relative h-8 flex items-center justify-center group">
                  <button
                    onClick={() => handleAddOutline(index + 1)}
                    className="absolute inset-x-0 h-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="w-full h-[2px] bg-border group-hover:bg-violet-300 dark:group-hover:bg-violet-700 transition-colors" />
                    <div className="absolute size-6 rounded-full bg-violet-500 text-white flex items-center justify-center shadow-md">
                      <Plus className="size-3" />
                    </div>
                  </button>
                </div>
              )}
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {/* Add button at the end */}
        <button
          onClick={() => handleAddOutline(outlines.length)}
          className="w-full py-3 border-2 border-dashed border-border hover:border-violet-300 dark:hover:border-violet-700 rounded-lg flex items-center justify-center gap-2 text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
        >
          <Plus className="size-4" />
          {t('outlinePreview.addPage')}
        </button>
      </div>
    </div>
  );
}

export default function OutlinePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
          <div className="animate-pulse space-y-4 text-center">
            <div className="h-8 w-48 bg-muted rounded mx-auto" />
            <div className="h-4 w-64 bg-muted rounded mx-auto" />
          </div>
        </div>
      }
    >
      <OutlinePreviewContent />
    </Suspense>
  );
}