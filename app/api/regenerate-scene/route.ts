/**
 * Regenerate Scene API
 *
 * Regenerates a scene based on user feedback and current content.
 * Used when user is unsatisfied with generated content and wants improvement.
 */

import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import { buildPrompt, PROMPT_IDS } from '@/lib/prompts';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import { extractHtml } from '@/lib/generation/scene-generator';
import { postProcessInteractiveHtml } from '@/lib/generation/interactive-post-processor';
import type { SceneOutline } from '@/lib/types/generation';
import type { InteractiveContent } from '@/lib/types/stage';
import type { Action } from '@/lib/types/action';
import type { WidgetType, WidgetConfig } from '@/lib/types/widgets';

const log = createLogger('Regenerate Scene API');

export const maxDuration = 300;

interface RegenerateSceneRequest {
  sceneId: string;
  sceneType: 'slide' | 'interactive' | 'quiz';
  currentContent: unknown;
  currentActions: Action[];
  outline: SceneOutline;
  userFeedback: string;
  languageDirective?: string;
  widgetType?: WidgetType;
  widgetConfig?: WidgetConfig;
}

export async function POST(req: NextRequest) {
  let sceneTitle: string | undefined;
  let resolvedModelString: string | undefined;

  try {
    const body = await req.json() as RegenerateSceneRequest;
    const {
      sceneId,
      sceneType,
      currentContent,
      currentActions,
      outline,
      userFeedback,
      languageDirective,
      widgetType,
      widgetConfig,
    } = body;

    // Validate required fields
    if (!sceneId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'sceneId is required');
    }
    if (!sceneType) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'sceneType is required');
    }
    if (!userFeedback || userFeedback.trim().length === 0) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'userFeedback is required');
    }
    if (!outline) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'outline is required');
    }

    sceneTitle = outline.title;

    // ── Model resolution ──
    const {
      model: languageModel,
      modelInfo,
      modelString,
      thinkingConfig,
    } = await resolveModelFromRequest(req, body);
    resolvedModelString = modelString;

    log.info(
      `Regenerating scene: "${outline.title}" (${sceneType}) [feedback="${userFeedback.substring(0, 50)}..."] [model=${modelString}]`,
    );

    // ── Handle different scene types ──
    if (sceneType === 'interactive') {
      const content = currentContent as InteractiveContent;
      const currentHtml = content.html || '';

      if (!currentHtml) {
        return apiError('INVALID_REQUEST', 400, 'Interactive scene has no HTML content');
      }

      // Build regenerate prompt
      const prompts = buildPrompt(PROMPT_IDS.REGENERATE_WIDGET, {
        widgetType: widgetType || 'simulation',
        title: outline.title,
        currentHtml,
        widgetConfig: JSON.stringify(widgetConfig || {}),
        currentActions: JSON.stringify(currentActions.map(a => ({ type: a.type, title: a.title }))),
        userFeedback,
        languageDirective: languageDirective || 'zh-CN',
      });

      if (!prompts) {
        return apiError('GENERATION_FAILED', 500, 'Failed to build regenerate prompt');
      }

      // Call LLM
      const result = await callLLM(
        {
          model: languageModel,
          system: prompts.system,
          prompt: prompts.user,
          maxOutputTokens: modelInfo?.outputWindow,
        },
        'regenerate-widget',
        undefined,
        thinkingConfig,
      );

      // Extract HTML from response
      const newHtml = extractHtml(result.text);

      if (!newHtml) {
        log.error('Failed to extract HTML from regenerate response');
        return apiError('GENERATION_FAILED', 500, 'Could not extract HTML from response');
      }

      // Post-process HTML
      const processedHtml = postProcessInteractiveHtml(newHtml);

      // Return new content
      log.info(`Scene regenerated successfully: "${outline.title}"`);

      return apiSuccess({
        content: {
          type: 'interactive',
          url: '',
          html: processedHtml,
          widgetType,
          widgetConfig,
          teacherActions: content.teacherActions,
        },
        actions: currentActions, // Keep existing actions for now
        htmlLength: processedHtml.length,
      });
    }

    // ── Other scene types (slide, quiz) - placeholder for future ──
    if (sceneType === 'slide') {
      // TODO: Implement slide regeneration
      return apiError('INVALID_REQUEST', 400, 'Slide regeneration not yet implemented');
    }

    if (sceneType === 'quiz') {
      // TODO: Implement quiz regeneration
      return apiError('INVALID_REQUEST', 400, 'Quiz regeneration not yet implemented');
    }

    return apiError('INVALID_REQUEST', 400, `Unknown scene type: ${sceneType}`);
  } catch (error) {
    log.error(
      `Scene regeneration failed [scene="${sceneTitle ?? 'unknown'}", model=${resolvedModelString ?? 'unknown'}]:`,
      error,
    );
    return apiError('INTERNAL_ERROR', 500, error instanceof Error ? error.message : String(error));
  }
}