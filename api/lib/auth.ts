

import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { Role } from '../../types.ts';

export interface AuthPayload {
  userId: string;
  role: Role;
}

// This function will verify the JWT from the request cookie and check roles
export async function verifyAuth(req: Request, allowedRoles?: Role[]): Promise<{ user: AuthPayload | null; error?: Response }> {
  const cookies = parse(req.headers.get('Cookie') || '');
  const token = cookies.token;

  if (!token) {
    return { user: null, error: new Response(JSON.stringify({ message: 'Unauthorized: Missing token' }), { status: 401 }) };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;
    
    // If specific roles are required, check them
    if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        return { user: null, error: new Response(JSON.stringify({ message: 'Forbidden: Insufficient permissions' }), { status: 403 }) };
    }

    return { user: decoded };
  } catch (error) {
    return { user: null, error: new Response(JSON.stringify({ message: 'Unauthorized: Invalid token' }), { status: 401 }) };
  }
}