import { useSettingsStore } from '@/lib/store/settings';
import { getModelInfo } from '@/lib/ai/providers';
import {
  getThinkingConfigKey,
  normalizeThinkingConfig,
  supportsConfigurableThinking,
} from '@/lib/ai/thinking-config';

/**
 * Get current model configuration from settings store
 */
export function getCurrentModelConfig() {
  const { providerId, modelId, providersConfig, thinkingConfigs } = useSettingsStore.getState();
  const modelString = `${providerId}:${modelId}`;

  // Get current provider's config
  const providerConfig = providersConfig[providerId];
  const modelInfo = providerConfig?.models.find((model) => model.id === modelId);
  const thinking = modelInfo?.capabilities?.thinking;
  const thinkingConfig = supportsConfigurableThinking(thinking)
    ? normalizeThinkingConfig(thinking, thinkingConfigs[getThinkingConfigKey(providerId, modelId)])
    : undefined;

  // Get custom model config from user settings (may override outputWindow/contextWindow)
  const customModelConfig = providerConfig?.models?.find((m) => m.id === modelId);

  // Get built-in model info as fallback
  const builtInModelInfo = getModelInfo(providerId, modelId);

  // Use custom values if set, otherwise use built-in defaults
  const outputWindow = customModelConfig?.outputWindow ?? builtInModelInfo?.outputWindow;
  const contextWindow = customModelConfig?.contextWindow ?? builtInModelInfo?.contextWindow;

  return {
    providerId,
    modelId,
    modelString,
    apiKey: providerConfig?.apiKey || '',
    baseUrl: providerConfig?.baseUrl || '',
    providerType: providerConfig?.type,
    requiresApiKey: providerConfig?.requiresApiKey,
    isServerConfigured: providerConfig?.isServerConfigured,
    outputWindow,
    contextWindow,
    thinkingConfig,
  };
}