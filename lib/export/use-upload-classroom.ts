'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useStageStore } from '@/lib/store/stage';
import { useI18n } from '@/lib/hooks/use-i18n';
import { createLogger } from '@/lib/logger';
import {
  CLASSROOM_ZIP_FORMAT_VERSION,
  type ClassroomManifest,
  type ManifestStage,
  type ManifestAgent,
  type ManifestScene,
  type MediaIndexEntry,
} from './classroom-zip-types';
import { collectAudioFiles, collectMediaFiles, actionsToManifest } from './classroom-zip-utils';
import { db, getGeneratedAgentsByStageId } from '@/lib/utils/database';
import type { SpeechAction } from '@/lib/types/action';

const log = createLogger('UploadClassroom');

export function useUploadClassroom() {
  const [uploading, setUploading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const { t } = useI18n();

  const uploadClassroom = useCallback(async () => {
    const { stage, scenes } = useStageStore.getState();
    if (!stage?.id || scenes.length === 0) {
      toast.error(t('export.noData'));
      return;
    }

    setUploading(true);
    setShareUrl(null);
    const toastId = toast.loading(t('export.uploading'));

    try {
      // Generate ZIP blob (reuse export logic)
      const zipBlob = await createClassroomZipBlob(stage, scenes);
      if (!zipBlob) {
        toast.error(t('export.error.createZip'), { id: toastId });
        return;
      }

      // Upload to server
      const formData = new FormData();
      const safeName = stage.name?.replace(/[\\/:*?"<>|]/g, '_') || 'classroom';
      formData.append('file', zipBlob, `${safeName}.maic.zip`);

      const response = await fetch('/api/classroom-share', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      setShareUrl(result.url);
      toast.success(t('export.uploadSuccess'), { id: toastId });
      log.info(`Classroom uploaded: ${result.id}`);
    } catch (error) {
      log.error('Classroom upload failed:', error);
      toast.error(error instanceof Error ? error.message : t('export.uploadFailed'), {
        id: toastId,
      });
    } finally {
      setUploading(false);
    }
  }, [t]);

  const copyShareUrl = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t('export.urlCopied'));
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success(t('export.urlCopied'));
    }
  }, [shareUrl, t]);

  return {
    uploading,
    shareUrl,
    uploadClassroom,
    copyShareUrl,
    clearShareUrl: () => setShareUrl(null),
  };
}

// Reuse export logic to create ZIP blob
async function createClassroomZipBlob(
  stage: NonNullable<ReturnType<typeof useStageStore.getState>['stage']>,
  scenes: ReturnType<typeof useStageStore.getState>['scenes'],
): Promise<Blob | null> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    const freshStage = await db.stages.get(stage.id);
    const latestName = freshStage?.name || stage.name;

    const agentRecords = await getGeneratedAgentsByStageId(stage.id);
    const audioFiles = await collectAudioFiles(scenes);
    const mediaFiles = await collectMediaFiles(stage.id);

    const audioIdToPath = new Map<string, string>();
    for (const af of audioFiles) {
      audioIdToPath.set(af.record.id, af.zipPath);
    }

    const manifestStage: ManifestStage = {
      id: stage.id,
      name: latestName,
      description: stage.description,
      language: stage.languageDirective,
      style: stage.style,
      createdAt: stage.createdAt,
      updatedAt: stage.updatedAt,
    };

    const manifestAgents: ManifestAgent[] = agentRecords.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      persona: a.persona,
      avatar: a.avatar,
      color: a.color,
      priority: a.priority,
    }));

    if (manifestAgents.length === 0 && stage.generatedAgentConfigs?.length) {
      for (const a of stage.generatedAgentConfigs) {
        manifestAgents.push({
          id: a.id,
          name: a.name,
          role: a.role,
          persona: a.persona,
          avatar: a.avatar,
          color: a.color,
          priority: a.priority,
        });
      }
    }

    const agentIdToIndex = new Map<string, number>();
    agentRecords.forEach((a, i) => agentIdToIndex.set(a.id, i));
    if (stage.generatedAgentConfigs?.length && agentRecords.length === 0) {
      stage.generatedAgentConfigs.forEach((a, i) => agentIdToIndex.set(a.id, i));
    }

    const manifestScenes: ManifestScene[] = scenes.map((scene) => ({
      id: scene.id,
      type: scene.type,
      title: scene.title,
      order: scene.order,
      content: scene.content,
      actions: scene.actions ? actionsToManifest(scene.actions, audioIdToPath) : undefined,
      whiteboards: scene.whiteboards,
      ...(scene.multiAgent?.enabled
        ? {
            multiAgent: {
              enabled: true,
              agentIndices: (scene.multiAgent.agentIds ?? [])
                .map((id) => agentIdToIndex.get(id))
                .filter((i): i is number => i !== undefined),
              directorPrompt: scene.multiAgent.directorPrompt,
            },
          }
        : {}),
    }));

    const mediaIndex: Record<string, MediaIndexEntry> = {};

    for (const af of audioFiles) {
      mediaIndex[af.zipPath] = {
        type: 'audio',
        format: af.record.format,
        duration: af.record.duration,
        voice: af.record.voice,
      };
    }
    for (const mf of mediaFiles) {
      mediaIndex[mf.zipPath] = {
        type: 'generated',
        mimeType: mf.record.mimeType,
        size: mf.record.size,
        prompt: mf.record.prompt,
      };
    }

    // Check for missing audio references
    for (const scene of scenes) {
      for (const action of scene.actions ?? []) {
        if (action.type === 'speech') {
          const audioId = (action as SpeechAction).audioId;
          if (audioId && !audioIdToPath.has(audioId)) {
            const missingPath = `audio/${audioId}.mp3`;
            mediaIndex[missingPath] = { type: 'audio', missing: true };
          }
        }
      }
    }

    const manifest: ClassroomManifest = {
      formatVersion: CLASSROOM_ZIP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: process.env.npm_package_version || '0.0.0',
      stage: manifestStage,
      agents: manifestAgents,
      scenes: manifestScenes,
      mediaIndex,
    };

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    for (const af of audioFiles) {
      zip.file(af.zipPath, af.record.blob);
    }
    for (const mf of mediaFiles) {
      zip.file(mf.zipPath, mf.record.blob);
      if (mf.record.poster) {
        zip.file(mf.zipPath.replace(/\.\w+$/, '.poster.jpg'), mf.record.poster);
      }
    }

    return await zip.generateAsync({ type: 'blob' });
  } catch (error) {
    log.error('Failed to create ZIP blob:', error);
    return null;
  }
}
