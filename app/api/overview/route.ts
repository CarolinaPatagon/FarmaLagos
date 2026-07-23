import { NextResponse } from 'next/server';
import { getOverview } from '@/lib/queries';

export const runtime = 'nodejs';

export async function GET() {
  const overview = getOverview();
  return NextResponse.json(overview);
}
