import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

async function checkAuth(req: Request) { return true; }

export default async function POST(req: Request) {
    if (!await checkAuth(req)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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
                return NextResponse.json(rows[0]);
            }
            case 'update': {
                const { id, payments, paymentStatus } = payload;
                 const { rows } = await sql`
                    UPDATE documents
                    SET payments = ${JSON.stringify(payments)}, payment_status = ${paymentStatus}
                    WHERE id = ${id}
                    RETURNING *;
                `;
                return NextResponse.json(rows[0]);
            }
            case 'delete': {
                const { id } = payload;
                await sql`DELETE FROM documents WHERE id = ${id};`;
                return NextResponse.json({ message: 'Document deleted successfully' });
            }
            default:
                return NextResponse.json({ message: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}