import { NextResponse } from 'next/server';
import { getOverview } from '@/lib/queries';

export const runtime = 'nodejs';

export async function GET() {
  const overview = await getOverview();
  return NextResponse.json(overview);
}
