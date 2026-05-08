import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;

  try {
    const filePath = path.join(
      process.cwd(),
      'lib',
      'data',
      'knowledge-graphs',
      `${courseId}.json`,
    );

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const data = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load course data' },
      { status: 500 },
    );
  }
}