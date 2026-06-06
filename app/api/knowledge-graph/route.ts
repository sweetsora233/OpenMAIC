import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(_req: NextRequest) {
  try {
    const filePath = path.join(
      process.cwd(),
      'lib',
      'data',
      'knowledge-graphs',
      'subjects.json',
    );

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Subjects not found' }, { status: 404 });
    }

    const data = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load subjects data' },
      { status: 500 },
    );
  }
}