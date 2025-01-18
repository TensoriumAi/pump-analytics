import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const tokens = await db.tokens.toArray();
    return NextResponse.json(tokens);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
  }
} 