
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export default async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ message: 'Filename is required' }, { status: 400 });
  }

  // The 'request.body' can be directly passed to the put method
  const blob = await put(filename, request.body!, {
    access: 'public',
  });

  return NextResponse.json(blob);
}
