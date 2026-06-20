'use client';

import { Stage } from '@/components/stage';
import { ThemeProvider } from '@/lib/hooks/use-theme';
import { useStageStore } from '@/lib/store';
import { loadImageMapping } from '@/lib/utils/image-storage';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSceneGenerator } from '@/lib/hooks/use-scene-generator';
import { useMediaGenerationStore } from '@/lib/store/media-generation';
import { useWhiteboardHistoryStore } from '@/lib/store/whiteboard-history';
import { createLogger } from '@/lib/logger';
import { MediaStageProvider } from '@/lib/contexts/media-stage-context';
import { generateMediaForOutlines } from '@/lib/media/media-orchestrator';
import { db, mediaFileKey } from '@/lib/utils/database';
import { rewriteAudioRefsToIds } from '@/lib/export/classroom-zip-utils';
import type { ClassroomManifest } from '@/lib/export/classroom-zip-types';
import type { Scene } from '@/lib/types/stage';
import { migrateScene } from '@/lib/edit/slide-schema';

const log = createLogger('Classroom');

// Import shared classroom ZIP - use original IDs, no new generation
async function importSharedClassroomZip(zipBlob: Blob, shareId: string): Promise<boolean> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(zipBlob);

    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      log.error('Invalid ZIP: missing manifest.json');
      return false;
    }

    const manifestText = await manifestFile.async('text');
    const manifest: ClassroomManifest = JSON.parse(manifestText);

    if (!manifest.stage || !manifest.scenes) {
      log.error('Invalid manifest: missing stage or scenes');
      return false;
    }

    // Use original stageId from manifest (shareId should match)
    const stageId = manifest.stage.id || shareId;
    const now = Date.now();

    // Audio ref → ID mapping (keep original)
    const audioRefToId: Record<string, string> = {};
    for (const [zipPath, entry] of Object.entries(manifest.mediaIndex ?? {})) {
      if (entry.type === 'audio' && !entry.missing) {
        const filename = zipPath.split('/').pop() ?? '';
        audioRefToId[zipPath] = filename.replace(/\.\w+$/, '');
      }
    }

    // Media ref → ID mapping (keep original elementId)
    const mediaRefToId: Record<string, string> = {};
    for (const [zipPath, entry] of Object.entries(manifest.mediaIndex ?? {})) {
      if ((entry.type === 'generated' || entry.type === 'image') && !entry.missing) {
        const filename = zipPath.split('/').pop() ?? '';
        const elementId = filename.replace(/\.\w+$/, '');
        mediaRefToId[zipPath] = mediaFileKey(stageId, elementId);
      }
    }

    // Write audio files to IndexedDB
    for (const [zipPath, audioId] of Object.entries(audioRefToId)) {
      const zipEntry = zip.file(zipPath);
      if (!zipEntry) continue;
      const blob = await zipEntry.async('blob');
      const meta = manifest.mediaIndex[zipPath];
      await db.audioFiles.put({
        id: audioId,
        blob,
        format: meta?.format || 'mp3',
        duration: meta?.duration,
        voice: meta?.voice,
        createdAt: now,
      });
    }

    // Write media files to IndexedDB (these are the actual images/videos)
    for (const [zipPath, mediaId] of Object.entries(mediaRefToId)) {
      const zipEntry = zip.file(zipPath);
      if (!zipEntry) continue;
      const blob = await zipEntry.async('blob');
      const meta = manifest.mediaIndex[zipPath];

      const record: any = {
        id: mediaId,
        stageId: stageId,
        type: meta?.mimeType?.startsWith('video/') ? 'video' : 'image',
        blob,
        mimeType: meta?.mimeType || 'image/jpeg',
        size: meta?.size || blob.size,
        prompt: meta?.prompt || '',
        params: '',
        createdAt: now,
      };

      const posterPath = zipPath.replace(/\.\w+$/, '.poster.jpg');
      const posterEntry = zip.file(posterPath);
      if (posterEntry) {
        record.poster = await posterEntry.async('blob');
      }

      await db.mediaFiles.put(record);
    }

    // Write stage (use original ID)
    await db.stages.put({
      id: stageId,
      name: manifest.stage.name || 'Shared Classroom',
      description: manifest.stage.description,
      languageDirective: manifest.stage.language,
      style: manifest.stage.style,
      createdAt: manifest.stage.createdAt || now,
      updatedAt: now,
      agentIds: manifest.agents?.map((a: any) => a.id) ?? undefined,
    });

    // Write agents (use original IDs)
    if (manifest.agents?.length) {
      const agentRecords = manifest.agents.map((a: any) => ({
        id: a.id,
        stageId: stageId,
        name: a.name,
        role: a.role,
        persona: a.persona,
        avatar: a.avatar,
        color: a.color,
        priority: a.priority,
        createdAt: now,
      }));
      await db.generatedAgents.bulkPut(agentRecords);
    }

    // Write scenes (keep original IDs)
    const sceneRecords = manifest.scenes.map((mScene: any, index: number) => {
      const sceneId = mScene.id || `scene_${index}`;
      const actions = mScene.actions
        ? rewriteAudioRefsToIds(mScene.actions, audioRefToId)
        : undefined;

      let multiAgent = undefined;
      if (mScene.multiAgent?.enabled) {
        multiAgent = {
          enabled: true,
          agentIds: (mScene.multiAgent.agentIndices ?? [])
            .map((idx: number) => manifest.agents?.[idx]?.id)
            .filter(Boolean),
          directorPrompt: mScene.multiAgent.directorPrompt,
        };
      }

      return {
        id: sceneId,
        stageId: stageId,
        type: mScene.type,
        title: mScene.title,
        order: mScene.order ?? index,
        content: mScene.content,
        actions,
        whiteboard: mScene.whiteboards,
        multiAgent,
        createdAt: now,
        updatedAt: now,
      };
    });
    await db.scenes.bulkPut(sceneRecords);

    // Update store with imported data
    useStageStore.getState().setStage({
      id: stageId,
      name: manifest.stage.name || 'Shared Classroom',
      description: manifest.stage.description,
      languageDirective: manifest.stage.language,
      style: manifest.stage.style,
      createdAt: manifest.stage.createdAt || now,
      updatedAt: now,
      agentIds: manifest.agents?.map((a: any) => a.id) ?? undefined,
    });
    useStageStore.setState({
      scenes: sceneRecords,
      currentSceneId: sceneRecords[0]?.id ?? null,
    });

    log.info('Shared classroom imported:', shareId, '=', stageId);
    return true;
  } catch (error) {
    log.error('Failed to import shared classroom:', error);
    return false;
  }
}

export default function ClassroomDetailPage() {
  const params = useParams();
  const classroomId = params?.id as string;

  const { loadFromStorage } = useStageStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generationStartedRef = useRef(false);

  const { generateRemaining, retrySingleOutline, stop } = useSceneGenerator({
    onComplete: () => {
      log.info('[Classroom] All scenes generated');
    },
  });

  const loadClassroom = useCallback(async () => {
    try {
      await loadFromStorage(classroomId);

      // If IndexedDB had no data, try server-side storage (API-generated classrooms)
      if (!useStageStore.getState().stage) {
        log.info('No IndexedDB data, trying server-side storage for:', classroomId);
        try {
          const res = await fetch(`/api/classroom?id=${encodeURIComponent(classroomId)}`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.classroom) {
              const { stage, scenes } = json.classroom;
              useStageStore.getState().setStage(stage);
              // Normalize legacy slide content (missing schemaVersion)
              const migrated = (scenes as Scene[]).map(migrateScene);
              useStageStore.setState({
                scenes: migrated,
                currentSceneId: migrated[0]?.id ?? null,
                // Reset mode on classroom load so SPA navigation
                // doesn't carry Pro mode across.
                mode: 'playback' as const,
              });
              log.info('Loaded from server-side storage:', classroomId);

              // Hydrate server-generated agents into IndexedDB + registry.
              if (stage.generatedAgentConfigs?.length) {
                const { saveGeneratedAgents } = await import('@/lib/orchestration/registry/store');
                await saveGeneratedAgents(stage.id, stage.generatedAgentConfigs);
                log.info('Hydrated server-generated agents for stage:', stage.id);
              }
            }
          }
        } catch (fetchErr) {
          log.warn('Server-side storage fetch failed:', fetchErr);
        }
      }

      // If still no data, try shared classroom API
      if (!useStageStore.getState().stage) {
        log.info('No server-side data, trying shared classroom for:', classroomId);
        try {
          const shareRes = await fetch(
            `/api/classroom-share?id=${encodeURIComponent(classroomId)}`,
          );
          if (shareRes.ok) {
            const shareJson = await shareRes.json();
            if (shareJson.success && shareJson.zipData) {
              // Convert base64 to blob and import
              const zipBlob = await fetch(`data:application/zip;base64,${shareJson.zipData}`).then(
                (r) => r.blob(),
              );
              const success = await importSharedClassroomZip(zipBlob, classroomId);
              if (success) {
                log.info('Loaded from shared classroom:', classroomId);
              }
            }
          }
        } catch (shareErr) {
          log.warn('Shared classroom fetch failed:', shareErr);
        }
      }

      // If still no data after all attempts, show error
      if (!useStageStore.getState().stage) {
        setError('Classroom not found');
        return;
      }

      // Restore completed media generation tasks from IndexedDB
      const stageId = useStageStore.getState().stage?.id || classroomId;
      await useMediaGenerationStore.getState().restoreFromDB(stageId);
      // Restore agents for this stage
      const { loadGeneratedAgentsForStage, useAgentRegistry } =
        await import('@/lib/orchestration/registry/store');
      const generatedAgentIds = await loadGeneratedAgentsForStage(stageId);
      const { useSettingsStore } = await import('@/lib/store/settings');
      const { restoreAgentSelection } =
        await import('@/lib/orchestration/registry/agent-selection');
      // Keep the user's explicit AgentBar mode/selection when still valid for
      // this stage instead of unconditionally forcing auto mode (which
      // clobbered it on every classroom visit); fall back to the stage-derived
      // defaults otherwise, marking them as NOT user-set so the next classroom
      // never mistakes them for a choice. Stale generated IDs (from another
      // stage / pre-bleed-fix) never validate, so they don't resolve against a
      // leftover registry entry.
      const settings = useSettingsStore.getState();
      const registry = useAgentRegistry.getState();
      const stage = useStageStore.getState().stage;
      const { selection: next, isUserSet } = restoreAgentSelection({
        persisted: { mode: settings.agentMode, selectedAgentIds: settings.selectedAgentIds },
        persistedIsUserSet: settings.agentSelectionIsUserSet,
        generatedAgentIds,
        stageAgentIds: stage?.agentIds,
        isPresetAgent: (id) => {
          const a = registry.getAgent(id);
          return !!a && !a.isGenerated;
        },
      });
      // restoreAgentSelection returns the persisted object as-is when keeping
      // it, so reference checks skip redundant store writes.
      if (next.mode !== settings.agentMode) settings.setAgentMode(next.mode);
      if (next.selectedAgentIds !== settings.selectedAgentIds) {
        settings.setSelectedAgentIds(next.selectedAgentIds);
      }
      if (isUserSet !== settings.agentSelectionIsUserSet) {
        settings.setAgentSelectionIsUserSet(isUserSet);
      }
    } catch (error) {
      log.error('Failed to load classroom:', error);
      setError(error instanceof Error ? error.message : 'Failed to load classroom');
    } finally {
      setLoading(false);
    }
  }, [classroomId, loadFromStorage]);

  useEffect(() => {
    // Reset loading state on course switch to unmount Stage during transition,
    // preventing stale data from syncing back to the new course
    setLoading(true);
    setError(null);
    generationStartedRef.current = false;

    // Clear previous classroom's media tasks to prevent cross-classroom contamination.
    // Placeholder IDs (gen_img_1, gen_vid_1) are NOT globally unique across stages,
    // so stale tasks from a previous classroom would shadow the new one's.
    const mediaStore = useMediaGenerationStore.getState();
    mediaStore.revokeObjectUrls();
    useMediaGenerationStore.setState({ tasks: {} });

    // Clear whiteboard history to prevent snapshots from a previous course leaking in.
    useWhiteboardHistoryStore.getState().clearHistory();

    loadClassroom();

    // Cancel ongoing generation when classroomId changes or component unmounts
    return () => {
      stop();
    };
  }, [classroomId, loadClassroom, stop]);

  // Auto-resume generation for pending outlines
  useEffect(() => {
    if (loading || error || generationStartedRef.current) return;

    const state = useStageStore.getState();
    const { outlines, scenes, stage } = state;

    // Check if there are pending outlines
    const completedOrders = new Set(scenes.map((s) => s.order));
    const hasPending = outlines.some((o) => !completedOrders.has(o.order));

    if (hasPending && stage) {
      generationStartedRef.current = true;

      // Load generation params from sessionStorage (stored by generation-preview before navigating)
      const genParamsStr = sessionStorage.getItem('generationParams');
      const params = genParamsStr ? JSON.parse(genParamsStr) : {};

      // Reconstruct imageMapping from IndexedDB using pdfImages storageIds
      const storageIds = (params.pdfImages || [])
        .map((img: { storageId?: string }) => img.storageId)
        .filter(Boolean);

      loadImageMapping(storageIds).then((imageMapping) => {
        generateRemaining({
          pdfImages: params.pdfImages,
          imageMapping,
          stageInfo: {
            name: stage.name || '',
            description: stage.description,
            style: stage.style,
          },
          agents: params.agents,
          userProfile: params.userProfile,
          languageDirective: params.languageDirective || stage.languageDirective,
        });
      });
    } else if (outlines.length > 0 && stage) {
      // All scenes are generated, but some media may not have finished.
      // Resume media generation for any tasks not yet in IndexedDB.
      // generateMediaForOutlines skips already-completed tasks automatically.
      generationStartedRef.current = true;
      generateMediaForOutlines(outlines, stage.id).catch((err) => {
        log.warn('[Classroom] Media generation resume error:', err);
      });
    }
  }, [loading, error, generateRemaining]);

  return (
    <ThemeProvider>
      <MediaStageProvider value={classroomId}>
        <div className="h-screen flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center text-muted-foreground">
                <p>Loading classroom...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                <p className="text-destructive mb-4">Error: {error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    loadClassroom();
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <Stage onRetryOutline={retrySingleOutline} />
          )}
        </div>
      </MediaStageProvider>
    </ThemeProvider>
  );
}
