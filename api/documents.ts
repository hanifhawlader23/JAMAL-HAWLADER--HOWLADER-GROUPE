import { sql } from '@vercel/postgres';
import { verifyAuth } from './lib/auth.ts';
import { Role } from '../../types.ts';

export const runtime = 'edge';

const jsonResponse = (data: any, status: number = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

export default async function POST(req: Request) {
    const authResult = await verifyAuth(req, [Role.ADMIN]);
    if (authResult.error) {
        return authResult.error;
    }

    try {
        const { action, payload } = await req.json();

        switch (action) {
            case 'create': {
                const { documentNumber, documentType, clientId, date, entryIds, items, subtotal, surcharges, taxRate, taxAmount, total, paymentStatus, payments, invoicePeriodStart, invoicePeriodEnd } = payload;
                const { rows } = await sql`
                    INSERT INTO documents (document_number, document_type, client_id, date, entry_ids, items, subtotal, surcharges, tax_rate, tax_amount, total, payment_status, payments, invoice_period_start, invoice_period_end)
                    VALUES (
                        ${documentNumber}, ${documentType}, ${clientId}, ${date}, ${entryIds}, ${JSON.stringify(items)}, 
                        ${subtotal}, ${JSON.stringify(surcharges)}, ${taxRate}, ${taxAmount}, ${total}, 
                        ${paymentStatus}, ${JSON.stringify(payments)}, ${invoicePeriodStart}, ${invoicePeriodEnd}
                    )
                    RETURNING *;
                `;
                return jsonResponse(rows[0]);
            }
            case 'update': {
                const { id, payments, paymentStatus } = payload;
                 const { rows } = await sql`
                    UPDATE documents
                    SET payments = ${JSON.stringify(payments)}, payment_status = ${paymentStatus}
                    WHERE id = ${id}
                    RETURNING *;
                `;
                return jsonResponse(rows[0]);
            }
            case 'delete': {
                const { id } = payload;
                await sql`DELETE FROM documents WHERE id = ${id};`;
                return jsonResponse({ message: 'Document deleted successfully' });
            }
            default:
                return jsonResponse({ message: `Unknown action: ${action}` }, 400);
        }
    } catch (error: any) {
        return jsonResponse({ message: error.message }, 500);
    }
}