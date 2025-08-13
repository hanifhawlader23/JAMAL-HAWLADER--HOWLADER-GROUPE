
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

async function verifyAuth(req: Request) {
    const cookies = parse(req.headers.get('Cookie') || '');
    const token = cookies.token;
    if (!token) return null;
    try {
        return jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    } catch (e) {
        return null;
    }
}


export default async function GET(request: Request) {
    const auth = await verifyAuth(request);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [
            users,
            clients,
            products,
            entries,
            deliveries,
            documents,
            companyDetails,
            currentUser,
        ] = await Promise.all([
            sql`SELECT id, username, role, full_name FROM users ORDER BY full_name`,
            sql`SELECT * FROM clients ORDER BY name`,
            sql`SELECT * FROM products ORDER BY model_name`,
            sql`SELECT * FROM entries ORDER BY date DESC`,
            sql`SELECT * FROM deliveries ORDER BY delivery_date DESC`,
            sql`SELECT * FROM documents ORDER BY date DESC`,
            sql`SELECT * FROM company_details WHERE id = 1`,
            sql`SELECT id, username, role, full_name FROM users WHERE id = ${auth.userId}`,
        ]);

        return NextResponse.json({
            users: users.rows,
            clients: clients.rows,
            products: products.rows,
            entries: entries.rows,
            deliveries: deliveries.rows,
            documents: documents.rows,
            companyDetails: companyDetails.rows[0] || null,
            currentUser: currentUser.rows[0] || null,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}