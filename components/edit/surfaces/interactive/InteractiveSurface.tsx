'use client';

import { create } from 'zustand';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useStageStore } from '@/lib/store/stage';
import { useI18n } from '@/lib/hooks/use-i18n';
import { InteractiveRenderer } from '@/components/scene-renderers/interactive-renderer';
import { RegenerateDialog } from '@/components/ui/regenerate-dialog';
import { regenerateSceneWithFeedback } from '@/lib/generation/regenerate-scene-client';
import { CHROME_EASE } from '@/lib/edit/transitions';
import type { SceneEditorSurface, SurfaceState } from '@/lib/edit/scene-editor-surface';
import type { InteractiveContent, Scene } from '@/lib/types/stage';

interface InteractiveSurfaceUiState {
  dialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
}

const useInteractiveSurfaceUiStore = create<InteractiveSurfaceUiState>((set) => ({
  dialogOpen: false,
  openDialog: () => set({ dialogOpen: true }),
  closeDialog: () => set({ dialogOpen: false }),
}));

function InteractiveCanvas() {
  const { t, locale } = useI18n();
  const scenes = useStageStore.use.scenes();
  const currentSceneId = useStageStore.use.currentSceneId();
  const regeneratingSceneId = useStageStore.use.regeneratingSceneId();
  const dialogOpen = useInteractiveSurfaceUiStore((s) => s.dialogOpen);
  const openDialog = useInteractiveSurfaceUiStore((s) => s.openDialog);
  const closeDialog = useInteractiveSurfaceUiStore((s) => s.closeDialog);
  const [collapsed, setCollapsed] = useState(false);
  const [errorState, setErrorState] = useState<{ sceneId: string; message: string } | null>(null);

  const scene = useMemo<Scene | null>(
    () => scenes.find((item) => item.id === currentSceneId) ?? null,
    [scenes, currentSceneId],
  );

  useEffect(() => {
    closeDialog();
  }, [currentSceneId, closeDialog]);

  if (!scene || scene.type !== 'interactive' || scene.content.type !== 'interactive') {
    return null;
  }

  const canOptimize = Boolean(scene.content.html);
  const isRegenerating = regeneratingSceneId === scene.id;

  const handleRegenerate = async (feedback: string) => {
    setErrorState(null);
    closeDialog();
    const result = await regenerateSceneWithFeedback(scene.id, feedback);
    if (!result.success) {
      const message = result.error || t('edit.interactive.optimizeFailed');
      setErrorState({ sceneId: scene.id, message });
      throw new Error(message);
    }
  };

  const quickFeedbacks = locale.startsWith('zh')
    ? ['交互逻辑不清晰', '按钮不好用', '移动端体验差', '布局层级混乱', '反馈不够明显']
    : [
        'Interaction flow is unclear',
        'Buttons do not work well',
        'Mobile experience needs work',
        'Layout hierarchy feels messy',
        'Feedback is not obvious enough',
      ];

  return (
    <>
      <InteractiveRenderer content={scene.content} sceneId={scene.id} />
      {isRegenerating && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/72 backdrop-blur-sm">
          <div className="flex min-w-[220px] flex-col items-center gap-3 rounded-2xl border border-border/60 bg-background/92 px-6 py-5 shadow-xl">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            <div className="text-center">
              <div className="text-sm font-semibold text-foreground">
                {t('edit.interactive.optimizing')}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {t('edit.interactive.optimizeDialogDesc')}
              </div>
            </div>
          </div>
        </div>
      )}
      {errorState?.sceneId === scene.id && (
        <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2">
          <div className="rounded-full bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground shadow-md">
            {errorState.message}
          </div>
        </div>
      )}
      {/* Floating optimize toolbar — same structure as FloatingInsertToolbar */}
      {canOptimize && (
        <div className="pointer-events-none absolute top-3 left-1/2 z-30 -translate-x-1/2">
          <AnimatePresence initial={false} mode="wait">
            {collapsed ? (
              <motion.button
                key="collapsed"
                type="button"
                onClick={() => setCollapsed(false)}
                aria-label={t('edit.interactive.optimize')}
                title={t('edit.interactive.optimize')}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: CHROME_EASE }}
                className="pointer-events-auto inline-flex h-7 w-9 items-center justify-center rounded-b-lg rounded-t-none bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md ring-1 ring-zinc-200/80 dark:ring-zinc-700/80 border-t-0 shadow-sm text-zinc-500 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </motion.button>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: CHROME_EASE }}
                className="pointer-events-auto flex items-center gap-1 px-1.5 py-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md ring-1 ring-zinc-200/80 dark:ring-zinc-700/80 rounded-2xl shadow-md"
              >
                <button
                  type="button"
                  onClick={openDialog}
                  disabled={isRegenerating}
                  className="flex h-9 items-center rounded-xl px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors disabled:pointer-events-none disabled:opacity-40"
                >
                  {isRegenerating
                    ? t('edit.interactive.optimizing')
                    : t('edit.interactive.optimize')}
                </button>
                <span className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  aria-label={t('edit.insert.collapseToolbar')}
                  title={t('edit.insert.collapseToolbar')}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      <RegenerateDialog
        open={dialogOpen}
        sceneTitle={scene.title}
        onRegenerate={handleRegenerate}
        onCancel={closeDialog}
        isRegenerating={isRegenerating}
        title={t('edit.interactive.optimizeDialogTitle')}
        description={t('edit.interactive.optimizeDialogDesc')}
        submitLabel={t('edit.interactive.optimizeSubmit')}
        quickFeedbacks={quickFeedbacks}
      />
    </>
  );
}

function useInteractiveSurfaceState(): SurfaceState<InteractiveContent, undefined> {
  const { t } = useI18n();
  const scenes = useStageStore.use.scenes();
  const currentSceneId = useStageStore.use.currentSceneId();

  const scene = useMemo<Scene | null>(
    () => scenes.find((item) => item.id === currentSceneId) ?? null,
    [scenes, currentSceneId],
  );

  const interactiveContent =
    scene?.type === 'interactive' && scene.content.type === 'interactive'
      ? scene.content
      : ({ type: 'interactive', url: '' } as InteractiveContent);

  const canOptimize =
    scene?.type === 'interactive' &&
    scene.content.type === 'interactive' &&
    Boolean(scene.content.html);

  return {
    content: interactiveContent,
    selection: undefined,
    hasSelection: false,
    insertItems: [],
    floatingActions: [],
    commands: [],
    hints: canOptimize
      ? []
      : [
          {
            id: 'interactive-html-missing',
            severity: 'info',
            message: t('edit.interactive.optimizeUnavailable'),
          },
        ],
  };
}

export const interactiveSurface: SceneEditorSurface<InteractiveContent, undefined> = {
  sceneType: 'interactive',
  CanvasComponent: InteractiveCanvas,
  useSurfaceState: useInteractiveSurfaceState,
};
