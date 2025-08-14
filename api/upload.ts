import { put } from '@vercel/blob';
import { verifyAuth } from './lib/auth';

export const runtime = 'edge';

export default async function POST(request: Request): Promise<Response> {
  const authResult = await verifyAuth(request);
  if (authResult.error) {
      return authResult.error as Response;
  }
  
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return new Response(JSON.stringify({ message: 'Filename is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!request.body) {
    return new Response(JSON.stringify({ message: 'Request body is required for upload' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  
  const blob = await put(filename, request.body, {
    access: 'public',
  });

  return new Response(JSON.stringify(blob), { status: 200, headers: { 'Content-Type': 'application/json' } });
}