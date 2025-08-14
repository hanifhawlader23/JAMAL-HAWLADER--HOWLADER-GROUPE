import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { verifyAuth } from './lib/auth.js';

export const runtime = 'edge';

export default async function POST(request: Request): Promise<NextResponse> {
  const authResult = await verifyAuth(request);
  if (authResult.error) {
      return authResult.error as NextResponse;
  }
  
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ message: 'Filename is required' }, { status: 400 });
  }

  if (!request.body) {
    return NextResponse.json({ message: 'Request body is required for upload' }, { status: 400 });
  }
  
  const blob = await put(filename, request.body, {
    access: 'public',
  });

  return NextResponse.json(blob);
}