/**
 * Analyze Knowledge Point API
 *
 * Analyzes the user's requirement to extract:
 * 1. The main topic/knowledge point
 * 2. Suitable GitHub search keywords
 */

import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import { apiSuccess, apiError } from '@/lib/server/api-response';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import { searchGithubRepositories, formatGithubResultsForPrompt } from '@/lib/github-search';
import { createLogger } from '@/lib/logger';

const log = createLogger('Analyze Knowledge Point');

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requirement } = body as { requirement: string };

    if (!requirement || requirement.trim().length === 0) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'requirement is required');
    }

    // Resolve model
    const { model: languageModel, modelInfo, thinkingConfig } = await resolveModelFromRequest(
      req,
      body,
    );

    log.info(`Analyzing knowledge point: "${requirement.substring(0, 50)}..."`);

    // Call LLM to analyze and generate keywords
    const result = await callLLM(
      {
        model: languageModel,
        system: `You are a knowledge point analyzer. Your job is to:
1. Identify the main topic from the user's learning requirement
2. Generate specific GitHub search keywords for finding related open-source projects

Output a JSON object with this structure:
{
  "topic": "the main knowledge point name",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "reason": "brief explanation of why these keywords are suitable"
}

Requirements for keywords:
- Be specific (e.g., "linked list c implementation", not just "linked list")
- Include programming language if relevant (e.g., "python", "javascript")
- Include implementation type (e.g., "tutorial", "example", "library")
- Generate 2-4 keywords
- Keywords should help find good educational/practice projects`,
        prompt: requirement,
        maxOutputTokens: modelInfo?.outputWindow,
      },
      'analyze-knowledge-point',
      undefined,
      thinkingConfig,
    );

    // Parse result
    let analysis: { topic: string; keywords: string[]; reason: string };
    try {
      // Try to extract JSON from response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        log.error('No JSON found in response:', result.text);
        return apiError('PARSE_FAILED', 500, 'Could not parse analysis result');
      }
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      log.error('Failed to parse JSON:', parseErr);
      return apiError('PARSE_FAILED', 500, 'Could not parse analysis result');
    }

    log.info(`Analysis result: topic="${analysis.topic}", keywords=${analysis.keywords.join(', ')}`);

    // Search GitHub
    const githubResults = await searchGithubRepositories(analysis.keywords, 5);

    log.info(`Found ${githubResults.length} GitHub repositories`);

    return apiSuccess({
      topic: analysis.topic,
      keywords: analysis.keywords,
      reason: analysis.reason,
      githubProjects: githubResults,
      githubProjectsText: formatGithubResultsForPrompt(githubResults),
    });
  } catch (error) {
    log.error('Analysis failed:', error);
    return apiError('INTERNAL_ERROR', 500, error instanceof Error ? error.message : String(error));
  }
}