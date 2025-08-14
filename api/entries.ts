import { sql } from '@vercel/postgres';
import { verifyAuth } from './lib/auth';

export const runtime = 'edge';

const jsonResponse = (data: any, status: number = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

export default async function POST(req: Request) {
    const authResult = await verifyAuth(req);
    if (authResult.error) {
        return authResult.error;
    }

    try {
        const { action, payload } = await req.json();

        switch (action) {
            case 'create': {
                const { code, date, clientId, whoInput, status, items } = payload;
                const { rows } = await sql`
                    INSERT INTO entries (code, date, client_id, who_input, status, items)
                    VALUES (${code}, ${date}, ${clientId}, ${whoInput}, ${status}, ${JSON.stringify(items)})
                    RETURNING *;
                `;
                return jsonResponse(rows[0]);
            }
            case 'update': {
                const { id, ...updates } = payload;
                if (!id) {
                    return jsonResponse({ message: 'Entry ID is required for update' }, 400);
                }

                const { rows: existingRows } = await sql`SELECT * FROM entries WHERE id = ${id};`;
                if (existingRows.length === 0) {
                    return jsonResponse({ message: 'Entry not found' }, 404);
                }
                const existingEntry = existingRows[0];

                const updatedCode = 'code' in updates ? updates.code : existingEntry.code;
                const updatedDate = 'date' in updates ? updates.date : existingEntry.date;
                const updatedClientId = 'clientId' in updates ? updates.clientId : existingEntry.client_id;
                const updatedWhoInput = 'whoInput' in updates ? updates.whoInput : existingEntry.who_input;
                const updatedStatus = 'status' in updates ? updates.status : existingEntry.status;
                const updatedItems = 'items' in updates ? JSON.stringify(updates.items) : JSON.stringify(existingEntry.items);
                let updatedInvoiceId = 'invoiceId' in updates ? updates.invoiceId : existingEntry.invoice_id;

                if (updatedInvoiceId === undefined) {
                    updatedInvoiceId = null;
                }

                const { rows } = await sql`
                    UPDATE entries
                    SET 
                        code = ${updatedCode},
                        date = ${updatedDate},
                        client_id = ${updatedClientId},
                        who_input = ${updatedWhoInput},
                        status = ${updatedStatus},
                        items = ${updatedItems},
                        invoice_id = ${updatedInvoiceId}
                    WHERE id = ${id}
                    RETURNING *;
                `;
                
                return jsonResponse(rows[0]);
            }
            case 'delete': {
                const { id } = payload;
                await sql`DELETE FROM entries WHERE id = ${id};`;
                return jsonResponse({ message: 'Entry deleted successfully' });
            }
            default:
                return jsonResponse({ message: `Unknown action: ${action}` }, 400);
        }
    } catch (error: any) {
        console.error('API Error in entries.ts:', error);
        return jsonResponse({ message: error.message }, 500);
    }
}