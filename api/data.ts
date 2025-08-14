import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export const runtime = 'edge';

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
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
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

        return new Response(JSON.stringify({
            users: users.rows,
            clients: clients.rows,
            products: products.rows,
            entries: entries.rows,
            deliveries: deliveries.rows,
            documents: documents.rows,
            companyDetails: companyDetails.rows[0] || null,
            currentUser: currentUser.rows[0] || null,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}