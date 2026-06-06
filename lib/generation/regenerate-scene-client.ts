'use client';

import { createLogger } from '@/lib/logger';
import { useStageStore } from '@/lib/store/stage';
import { useSettingsStore } from '@/lib/store/settings';
import { getCurrentModelConfig } from '@/lib/utils/model-config';

const log = createLogger('SceneRegeneration');

function getApiHeaders(): HeadersInit {
  const config = getCurrentModelConfig();
  const settings = useSettingsStore.getState();
  const imageProviderConfig = settings.imageProvidersConfig?.[settings.imageProviderId];
  const videoProviderConfig = settings.videoProvidersConfig?.[settings.videoProviderId];

  return {
    'Content-Type': 'application/json',
    'x-model': config.modelString || '',
    'x-api-key': config.apiKey || '',
    'x-base-url': config.baseUrl || '',
    'x-provider-type': config.providerType || '',
    'x-image-provider': settings.imageProviderId || '',
    'x-image-model': settings.imageModelId || '',
    'x-image-api-key': imageProviderConfig?.apiKey || '',
    'x-image-base-url': imageProviderConfig?.baseUrl || '',
    'x-video-provider': settings.videoProviderId || '',
    'x-video-model': settings.videoModelId || '',
    'x-video-api-key': videoProviderConfig?.apiKey || '',
    'x-video-base-url': videoProviderConfig?.baseUrl || '',
    'x-image-generation-enabled': String(settings.imageGenerationEnabled ?? false),
    'x-video-generation-enabled': String(settings.videoGenerationEnabled ?? false),
  };
}

export async function regenerateSceneWithFeedback(
  sceneId: string,
  userFeedback: string,
): Promise<{ success: boolean; error?: string }> {
  const stageStore = useStageStore.getState();
  const scene = stageStore.scenes.find((item) => item.id === sceneId);
  if (!scene || !stageStore.stage) {
    return { success: false, error: 'Scene not found' };
  }

  const outline = stageStore.outlines.find((item) => item.order === scene.order);
  if (!outline) {
    return { success: false, error: 'Outline not found' };
  }

  const languageDirective = stageStore.stage.languageDirective || 'zh-CN';

  stageStore.setRegeneratingSceneId(sceneId);

  try {
    const response = await fetch('/api/regenerate-scene', {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({
        sceneId,
        sceneType: scene.type,
        currentContent: scene.content,
        currentActions: scene.actions,
        outline,
        userFeedback,
        languageDirective,
        widgetType:
          scene.type === 'interactive' && scene.content?.type === 'interactive'
            ? scene.content.widgetType
            : undefined,
        widgetConfig:
          scene.type === 'interactive' && scene.content?.type === 'interactive'
            ? scene.content.widgetConfig
            : undefined,
      }),
    });

    const data = await response.json().catch(() => ({
      success: false,
      error: 'Request failed',
    }));

    if (!response.ok || !data.success) {
      const error = data.error || `HTTP ${response.status}`;
      log.error('Regenerate API failed:', error);
      return { success: false, error };
    }

    stageStore.updateScene(sceneId, {
      content: data.content,
      actions: data.actions || scene.actions,
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Scene regeneration error:', error);
    return { success: false, error: message };
  } finally {
    stageStore.setRegeneratingSceneId(null);
  }
}
