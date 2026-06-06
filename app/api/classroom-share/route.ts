import { type NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { isValidClassroomId } from '@/lib/server/classroom-storage';
import { createLogger } from '@/lib/logger';

const log = createLogger('ClassroomShare');

const SHARED_CLASSROOMS_DIR = path.join(process.cwd(), 'data', 'shared-classrooms');
const MAX_ZIP_SIZE = 500 * 1024 * 1024; // 500MB

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * POST /api/classroom-share
 * Upload a classroom ZIP file for sharing.
 * Uses stage.id from manifest.json as the share ID.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing file');
    }

    if (file.size > MAX_ZIP_SIZE) {
      return apiError(
        API_ERROR_CODES.INVALID_REQUEST,
        400,
        `File too large. Max ${MAX_ZIP_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!file.name.endsWith('.maic.zip')) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'Invalid file type. Must be .maic.zip');
    }

    // Extract stageId from manifest.json inside the ZIP
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse ZIP to find manifest.json (simple approach)
    let stageId: string | null = null;

    try {
      let offset = 0;
      while (offset < buffer.length - 30) {
        const signature = buffer.readUInt32LE(offset);
        if (signature !== 0x04034b50) break;

        const compressedSize = buffer.readUInt32LE(offset + 18);
        const uncompressedSize = buffer.readUInt32LE(offset + 22);
        const filenameLength = buffer.readUInt16LE(offset + 26);
        const extraLength = buffer.readUInt16LE(offset + 28);

        const filenameStart = offset + 30;
        const filename = buffer
          .slice(filenameStart, filenameStart + filenameLength)
          .toString('utf8');

        if (filename === 'manifest.json') {
          const dataStart = filenameStart + filenameLength + extraLength;
          const manifestData = buffer.slice(dataStart, dataStart + compressedSize);

          if (compressedSize === uncompressedSize) {
            const manifest = JSON.parse(manifestData.toString('utf8'));
            if (manifest.stage?.id) {
              stageId = manifest.stage.id;
              break;
            }
          }
        }

        offset = filenameStart + filenameLength + extraLength + compressedSize;
      }
    } catch (parseErr) {
      log.warn('Failed to parse ZIP for stageId:', parseErr);
    }

    if (!stageId) {
      return apiError(
        API_ERROR_CODES.INVALID_REQUEST,
        400,
        'Could not find stageId in manifest.json',
      );
    }

    await ensureDir(SHARED_CLASSROOMS_DIR);

    // Store ZIP file with stageId as filename
    const zipPath = path.join(SHARED_CLASSROOMS_DIR, `${stageId}.zip`);
    await fs.writeFile(zipPath, buffer);

    // Build share URL
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const shareUrl = `${protocol}://${host}/classroom/${stageId}`;

    log.info(`Classroom shared: ${stageId} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);

    return apiSuccess({ id: stageId, url: shareUrl }, 201);
  } catch (error) {
    log.error('Classroom share upload failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to share classroom',
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * GET /api/classroom-share?id=xxx
 * Download a shared classroom ZIP.
 */
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing id');
    }

    if (!isValidClassroomId(id)) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'Invalid share ID format');
    }

    const zipPath = path.join(SHARED_CLASSROOMS_DIR, `${id}.zip`);

    try {
      const stat = await fs.stat(zipPath);
      if (!stat.isFile()) {
        return apiError(API_ERROR_CODES.INVALID_REQUEST, 404, 'Shared classroom not found');
      }
    } catch {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 404, 'Shared classroom not found');
    }

    const zipBuffer = await fs.readFile(zipPath);
    const base64Zip = zipBuffer.toString('base64');

    return apiSuccess({
      zipData: base64Zip,
      fileName: `${id}.maic.zip`,
    });
  } catch (error) {
    log.error('Classroom share retrieval failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to retrieve shared classroom',
      error instanceof Error ? error.message : String(error),
    );
  }
}
