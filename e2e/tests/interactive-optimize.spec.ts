import { test, expect } from '../fixtures/base';
import { createSettingsStorage } from '../fixtures/test-data/settings';
import { defaultTheme } from '../fixtures/test-data/scene-content';

const TEST_STAGE_ID = 'e2e-interactive-optimize';
const INTERACTIVE_SCENE_ID = 'scene-interactive';
const SETTINGS_STORAGE = createSettingsStorage({ sidebarCollapsed: false });

const INTERACTIVE_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#eaf0ff">
  <div style="text-align:center">
    <h1>interactive widget</h1>
  </div>
</body></html>`;

async function seedDatabase(page: import('@playwright/test').Page) {
  await page.addInitScript((settings) => {
    localStorage.setItem('settings-storage', settings);
  }, SETTINGS_STORAGE);

  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });

  await page.evaluate(
    ({ stageId, interactiveId, html, theme }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('MAIC-Database');
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = db.transaction(['stages', 'scenes', 'stageOutlines'], 'readwrite');
          const now = Date.now();

          tx.objectStore('stages').put({
            id: stageId,
            name: 'Interactive optimize',
            description: '',
            language: 'zh-CN',
            style: 'professional',
            currentSceneId: interactiveId,
            createdAt: now,
            updatedAt: now,
          });

          tx.objectStore('scenes').put({
            id: interactiveId,
            stageId,
            type: 'interactive',
            title: 'Interactive',
            order: 0,
            content: { type: 'interactive', url: '', html, widgetType: 'simulation' },
            createdAt: now,
            updatedAt: now,
          });

          tx.objectStore('stageOutlines').put({
            stageId,
            outlines: [],
            createdAt: now,
            updatedAt: now,
          });

          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      });
    },
    {
      stageId: TEST_STAGE_ID,
      interactiveId: INTERACTIVE_SCENE_ID,
      html: INTERACTIVE_HTML,
      theme: defaultTheme,
    },
  );
}

test('interactive optimize submits request in pro mode even when outlines are missing', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });

  let requestCount = 0;
  await page.route('**/api/regenerate-scene', async (route) => {
    requestCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        content: {
          type: 'interactive',
          url: '',
          html: '<!DOCTYPE html><html><body><h1>updated</h1></body></html>',
          widgetType: 'simulation',
        },
        actions: [],
      }),
    });
  });

  await seedDatabase(page);
  await page.goto(`http://localhost:3001/classroom/${TEST_STAGE_ID}`);
  await page.getByText('Loading classroom...').waitFor({ state: 'hidden', timeout: 15000 });

  await page.getByRole('switch').first().click();
  await page.getByRole('button', { name: /Optimize page|优化页面/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /Optimize|开始优化/ }).click();

  await expect.poll(() => requestCount).toBe(1);

  if (pageErrors.length > 0) {
    throw new Error(pageErrors.join('\n'));
  }
});
