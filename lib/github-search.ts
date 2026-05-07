/**
 * GitHub Repository Search
 *
 * Searches GitHub for repositories related to a topic.
 * Used for recommending open-source projects in courses.
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('GitHubSearch');

interface GitHubRepo {
  id: number;
  full_name: string; // e.g., "torvalds/linux"
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  topics: string[];
}

interface SearchResult {
  name: string;
  url: string;
  description: string;
  stars: number;
  language: string | null;
}

/**
 * Search GitHub repositories by keywords
 */
export async function searchGithubRepositories(
  keywords: string[],
  limit: number = 5,
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  for (const keyword of keywords) {
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(keyword)}&sort=stars&per_page=${limit}`;
      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        log.warn(`GitHub search failed for "${keyword}": HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const items = data.items as GitHubRepo[];

      for (const item of items) {
        // Avoid duplicates
        if (results.some((r) => r.url === item.html_url)) continue;

        results.push({
          name: item.full_name,
          url: item.html_url,
          description: item.description || '',
          stars: item.stargazers_count,
          language: item.language,
        });
      }
    } catch (err) {
      log.error(`GitHub search error for "${keyword}":`, err);
    }
  }

  // Sort by stars and limit total results
  return results.sort((a, b) => b.stars - a.stars).slice(0, limit * 2);
}

/**
 * Format GitHub results for prompt injection
 */
export function formatGithubResultsForPrompt(results: SearchResult[]): string {
  if (results.length === 0) return 'None';

  return results
    .map(
      (r) =>
        `- **${r.name}** (${r.stars} stars, ${r.language || 'unknown'})\n  URL: ${r.url}\n  ${r.description}`,
    )
    .join('\n\n');
}