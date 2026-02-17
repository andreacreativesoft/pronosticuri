import { NextResponse } from 'next/server';

// Simple ping to verify admin PIN is correct (middleware handles the actual check)
export async function GET() {
  return NextResponse.json({ ok: true });
}
