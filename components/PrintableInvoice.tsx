import React, { forwardRef } from 'react';
import { Document, EntryStatus } from '../types';
import { useData } from '../hooks/useData';

interface PrintableInvoiceProps {
    document: Document;
    logoSize: number;
}

const PrintableInvoice = forwardRef<HTMLDivElement, PrintableInvoiceProps>(function PrintableInvoice({ document, logoSize }, ref) {
    const { companyDetails, clients } = useData();
    const client = clients.find(c => c.id === document.clientId);

    // Sort items by entry code numerically, safely handling potentially null/undefined items array
    const sortedItems = [...(document.items || [])].sort((a, b) => 
        a.entryCode.localeCompare(b.entryCode, undefined, { numeric: true })
    );

    // Formats date as DD/MM/YYYY
    const formatDisplayDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const statusDisplay: { [key in EntryStatus]: { text: string; bg: string; color: string } } = {
        [EntryStatus.DELIVERED]: { text: 'Entregada', bg: '#2ECC71', color: '#000000' },
        [EntryStatus.IN_PROCESS]: { text: 'En Proceso', bg: '#f97316', color: '#000000' },
        [EntryStatus.RECEIVED]: { text: 'Recibida', bg: '#3b82f6', color: '#000000' },
        [EntryStatus.PRE_INVOICED]: { text: 'Prefacturado', bg: '#a855f7', color: '#000000' },
        [EntryStatus.INVOICED]: { text: 'Facturado', bg: '#6b7280', color: '#FFFFFF' }, // Keep white for contrast
    };

    // --- Row Striping Logic ---
    const rowColors: { [entryCode: string]: string } = {};
    const alternatingColors = ['#FFFFFF', '#F9FAFB']; // White and very light gray
    let colorIndex = 0;
    sortedItems.forEach(item => { // Use sortedItems to build the color map
        if (!rowColors[item.entryCode]) {
            rowColors[item.entryCode] = alternatingColors[colorIndex % 2];
            colorIndex++;
        }
    });
    
    // --- New logic for totals ---
    const totalSurcharges = Array.isArray(document.surcharges) ? document.surcharges.reduce((sum, s) => sum + s.amount, 0) : 0;
    const suma = (document.subtotal || 0) + totalSurcharges;


    return (
        <div id={`printable-area-${document.id}`} ref={ref} className="invoice-container">
            <style>
                {`
                @page {
                    size: A4;
                    margin: 0;
                }

                .invoice-container {
                    font-family: 'El Messiri', sans-serif;
                    background-color: #FFFFFF;
                    color: #000000;
                    width: 210mm;
                    min-height: 297mm;
                    padding: 1rem;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                }
                
                /* This class is removed to make footer follow the content */
                /* .invoice-container .content-grow { flex-grow: 1; } */

                .invoice-container h3 {
                    color: #000000;
                    font-weight: 700;
                    font-size: 1.1rem;
                    margin-bottom: 0.5rem;
                }
                
                .invoice-container .info-card {
                    background-color: #F9FAFB;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    font-size: 0.8rem;
                    line-height: 1.4;
                    border: 1px solid #E5E7EB;
                }

                .invoice-container .title-badge {
                    font-size: 1.5rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    border: 2px solid #000000;
                    padding: 0.5rem 1.5rem;
                    border-radius: 0.375rem;
                    box-shadow: 2px 2px 4px rgba(0,0,0,0.08);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }

                .invoice-container .main-table {
                    width: 100%;
                    font-size: 0.75rem;
                    border-collapse: collapse;
                }

                .invoice-container .main-table thead {
                    background-color: #F3F4F6;
                    color: #000000;
                    border-bottom: 2px solid #000000;
                }

                .invoice-container .main-table th,
                .invoice-container .main-table td {
                    padding: 0.5rem;
                    border-bottom: 1px solid #E5E7EB;
                    border-right: 1px solid #E5E7EB;
                    text-align: center;
                    vertical-align: middle;
                }
                
                .invoice-container .main-table th {
                    padding: 0.6rem 0.5rem;
                    font-weight: 600;
                    font-size: 0.8rem;
                }

                .invoice-container .main-table th:last-child,
                .invoice-container .main-table td:last-child {
                    border-right: none;
                }

                .invoice-container .main-table .text-left { text-align: left !important; }
                .invoice-container .main-table .text-right { text-align: right !important; }

                .invoice-container .main-table tbody td {
                    font-weight: 400;
                    color: #000000;
                }

                .invoice-container .status-pill {
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.65rem;
                    font-family: 'El Messiri', sans-serif;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    white-space: nowrap;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 1px 1px 3px rgba(0,0,0,0.1);
                }

                .invoice-container .totals-card {
                    background-color: #F9FAFB;
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                    border: 1px solid #E5E7EB;
                    width: 100%;
                    max-width: 350px;
                    font-size: 0.9rem;
                }
                
                .invoice-container .totals-card .total-row {
                    border-top: 2px solid #000000;
                    font-weight: 700;
                    font-size: 1.1rem;
                    color: #000000;
                }
                
                 .logo-container img {
                  object-fit: contain;
                  max-width: 100%;
                  height: auto;
                }

                @media print {
                    html, body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                         width: 210mm;
                         height: 297mm;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .invoice-container, .invoice-container * {
                        visibility: visible;
                    }
                    .invoice-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        margin: 0;
                        padding: 1cm;
                        box-shadow: none !important;
                        border: none;
                    }
                    .no-print, .no-print * {
                        display: none !important;
                    }
                }
                `}
            </style>
            
            <header className="grid grid-cols-2 gap-8 mb-4">
                 <div className="info-card flex items-center gap-4">
                     {companyDetails.logoUrl && (
                        <div className="logo-container flex-shrink-0" style={{ width: `${logoSize}px`, height: `${logoSize}px` }}>
                            <img src={companyDetails.logoUrl} alt="Company Logo" />
                        </div>
                    )}
                    <div>
                        <h3>{companyDetails.name}</h3>
                        <p>{companyDetails.address}</p>
                        <p>{companyDetails.email} | {companyDetails.phone}</p>
                        <p>VAT: {companyDetails.vatNumber}</p>
                    </div>
                </div>
                 <div className="info-card flex items-center justify-end gap-4 text-right">
                     <div>
                        <h3>{client?.name}</h3>
                        <p>{client?.address}</p>
                        <p>{client?.email} | {client?.phone}</p>
                        <p>VAT: {client?.vatNumber}</p>
                    </div>
                    {client?.logoUrl && (
                        <div className="logo-container flex-shrink-0" style={{ width: `${logoSize}px`, height: `${logoSize}px` }}>
                            <img src={client.logoUrl} alt="Client Logo" />
                        </div>
                    )}
                </div>
            </header>
            
            <main className="flex-grow flex flex-col">
                <section className="flex justify-center items-center my-6">
                    <h2 className="title-badge">
                        {document.documentType}
                    </h2>
                </section>

                <section className="flex justify-between items-center mb-6 text-sm font-semibold">
                    <div>
                        <span className="font-semibold">FECHA: </span>
                        <span>{formatDisplayDate(document.date)}</span>
                    </div>
                    {document.invoicePeriodStart && document.invoicePeriodEnd && (
                        <div className="text-center">
                            <span className="font-semibold">PERIODO DE FACTURACIÓN: </span>
                            <span>{formatDisplayDate(document.invoicePeriodStart)} - {formatDisplayDate(document.invoicePeriodEnd)}</span>
                        </div>
                    )}
                    <div>
                        <span className="font-semibold">Nº {document.documentType.toUpperCase()}: </span>
                        <span>{document.documentNumber}</span>
                    </div>
                </section>
                
                <section>
                    <table className="main-table">
                        <thead>
                            <tr>
                                <th className="w-[5%]">Código</th>
                                <th className="w-[10%]">Referencia</th>
                                <th className="w-[30%] text-left">Producto</th>
                                <th className="w-[7%]">Recibida</th>
                                <th className="w-[7%]">Entregada</th>
                                <th className="w-[7%]">Falta</th>
                                <th className="w-[10%]">Fecha de salida</th>
                                <th className="w-[10%]">Status</th>
                                <th className="w-[7%] text-right">Precio/U</th>
                                <th className="w-[7%] text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedItems.map((item, index) => (
                                <tr key={index} style={{ backgroundColor: rowColors[item.entryCode] }}>
                                    <td style={{ color: '#8D5B5B', fontWeight: 'bold' }}>{item.entryCode}</td>
                                    <td>{item.reference}</td>
                                    <td className="text-left">{item.description}</td>
                                    <td>{Number(item.orderedQty || 0).toLocaleString('de-DE')}</td>
                                    <td className="font-semibold">{Number(item.deliveredQty || 0).toLocaleString('de-DE')}</td>
                                    <td className={`font-bold ${item.pendingQty > 0 ? 'text-red-600' : ''}`}>{item.pendingQty > 0 ? Number(item.pendingQty || 0).toLocaleString('de-DE') : '-'}</td>
                                    <td>
                                        {formatDisplayDate(item.lastDeliveryDate)}
                                        <div className="text-[10px] text-gray-500">({Number(item.deliveredQty || 0)} pcs)</div>
                                    </td>
                                    <td>
                                        <span 
                                            className="status-pill"
                                            style={{ backgroundColor: statusDisplay[item.status]?.bg, color: statusDisplay[item.status]?.color }}
                                        >
                                            {statusDisplay[item.status]?.text || item.status}
                                        </span>
                                    </td>
                                    <td className="text-right">{Number(item.unitPrice || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                                    <td className="text-right font-semibold">{Number(item.total || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
                
                <footer className="flex justify-end mt-4 pt-4">
                    <div className="totals-card">
                        <div className="flex justify-between py-1.5 border-b border-dashed border-gray-400">
                            <span className="font-semibold">Subtotal:</span>
                            <span>{Number(document.subtotal || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                        </div>
                        {Array.isArray(document.surcharges) && document.surcharges.map((surcharge, index) => (
                            <div key={index} className="flex justify-between py-1.5 border-b border-dashed border-gray-400">
                                <span className="font-semibold">{surcharge.reason}:</span>
                                <span>{Number(surcharge.amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                        ))}
                        {totalSurcharges > 0 && (
                            <div className="flex justify-between py-1.5 border-b border-solid border-gray-400 font-bold mt-1">
                                <span className="font-semibold">Suma:</span>
                                <span>{Number(suma || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                        )}
                        <div className="flex justify-between py-1.5 border-b border-dashed border-gray-400">
                            <span className="font-semibold">IVA ({Number(document.taxRate || 0).toLocaleString('de-DE')} %):</span>
                            <span>{Number(document.taxAmount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                        </div>
                        <div className="flex justify-between py-2.5 mt-2 total-row">
                            <span className="font-bold">TOTAL:</span>
                            <span className="font-bold">{Number(document.total || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
});

export default PrintableInvoice;