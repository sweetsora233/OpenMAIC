/**
 * Token Plan (Aliyun) Image Generation Adapter
 *
 * Uses the native Token Plan multimodal generation API.
 * Endpoint: https://token-plan.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
 */

import type {
  ImageGenerationConfig,
  ImageGenerationOptions,
  ImageGenerationResult,
} from '../types';

const DEFAULT_MODEL = 'qwen-image-2.0';
const DEFAULT_BASE_URL = 'https://token-plan.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

function resolveSize(options: ImageGenerationOptions): string {
  return `${options.width || 1024}*${options.height || 1024}`;
}

export async function testTokenPlanImageConnectivity(
  config: ImageGenerationConfig,
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(DEFAULT_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || DEFAULT_MODEL,
        input: {
          messages: [{ role: 'user', content: [{ text: 'test' }] }],
        },
        parameters: { size: '256*256' },
      }),
    });

    if (response.ok) {
      return { success: true, message: 'Connected to Token Plan Image' };
    }

    const text = await response.text().catch(() => response.statusText);
    if (response.status === 401 || response.status === 403) {
      return { success: false, message: `Token Plan auth failed (${response.status}): ${text}` };
    }
    return { success: false, message: `Token Plan API error (${response.status}): ${text}` };
  } catch (err) {
    return { success: false, message: `Token Plan connectivity error: ${err}` };
  }
}

export async function generateWithTokenPlanImage(
  config: ImageGenerationConfig,
  options: ImageGenerationOptions,
): Promise<ImageGenerationResult> {
  const width = options.width || 1024;
  const height = options.height || 1024;
  const apiKey = config.apiKey;
  const model = config.model || DEFAULT_MODEL;

  const response = await fetch(DEFAULT_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [{ role: 'user', content: [{ text: options.prompt }] }],
      },
      parameters: { size: resolveSize(options) },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Token Plan image generation failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const imageData = data.output?.choices?.[0]?.message?.content?.[0]?.image;
  if (!imageData) {
    throw new Error('Token Plan returned empty image response');
  }

  return {
    url: imageData,
    width,
    height,
  };
}