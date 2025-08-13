

import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../hooks/useData';
import { EntryStatus, PaymentStatus, DocumentItem, Surcharge, Document, DeliveryItem, Entry } from '../types';
import { formatDate } from '../lib/helpers';
import Modal from '../components/Modal';
import PrintableInvoice from '../components/PrintableInvoice';
import { SPECIAL_CLIENT_NAME } from '../constants';

declare var jspdf: any;
declare var html2canvas: any;

const InvoiceWorkbench = () => {
    const { entries, updateEntry, clients, deliveries, documents, addDocument, products } = useData();
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedEntries, setSelectedEntries] = useState(new Set<string>());
    const [previewingDocument, setPreviewingDocument] = useState<Document | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [quantityThreshold, setQuantityThreshold] = useState('');
    const [priceIncreasePercent, setPriceIncreasePercent] = useState('');
    const [logoSize, setLogoSize] = useState(60);
    const printableRef = useRef<HTMLDivElement>(null);


    const availableEntries = useMemo(() => {
        return entries.filter((entry: Entry) =>
            (entry.status === EntryStatus.DELIVERED || entry.status === EntryStatus.PRE_INVOICED) && !entry.invoiceId
        );
    }, [entries]);

    const filteredEntries = useMemo(() => {
        let result = availableEntries;
        if (selectedClient) {
            result = result.filter((entry: Entry) => entry.clientId === selectedClient);
        }
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            result = result.filter((entry: Entry) => new Date(entry.date) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter((entry: Entry) => new Date(entry.date) <= end);
        }
        return result;
    }, [availableEntries, selectedClient, startDate, endDate]);
    
    const toggleEntrySelection = (entryId: string) => {
        setSelectedEntries(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(entryId)) {
                newSelection.delete(entryId);
            } else {
                newSelection.add(entryId);
            }
            return newSelection;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allFilteredIds = filteredEntries.map(entry => entry.id);
            setSelectedEntries(new Set(allFilteredIds));
        } else {
            setSelectedEntries(new Set());
        }
    };
    
    const areAllSelected = filteredEntries.length > 0 && selectedEntries.size === filteredEntries.length;

    const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || 'N/A';

    const handlePreview = (type: 'Prefactura' | 'Factura') => {
        if (selectedEntries.size === 0) {
            alert("Please select at least one entry.");
            return;
        }

        const entriesToInvoice = entries.filter(e => selectedEntries.has(e.id));
        const firstClientId = entriesToInvoice[0].clientId;

        if (!entriesToInvoice.every(e => e.clientId === firstClientId)) {
            alert("Entries for the same invoice must belong to the same client.");
            return;
        }
        
        const clientName = clients.find(c => c.id === firstClientId)?.name;
        const isSpecialClient = clientName === SPECIAL_CLIENT_NAME;

        const thresholdNum = parseInt(quantityThreshold, 10) || 0;
        const percentNum = parseFloat(priceIncreasePercent) || 0;


        const docItems: DocumentItem[] = [];
        const surcharges: Surcharge[] = [];
        let specialClientSurchargeBase = 0;
        let dynamicSurchargeBase = 0;

        entriesToInvoice.forEach(entry => {
            const entryDeliveries = deliveries.filter(d => d.entryCode === entry.code);
            entry.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                
                const priceValue = product ? Number(product.price) : 0;
                if (!product || isNaN(priceValue) || priceValue === 0) return;

                const orderedQty = Object.values(item.sizeQuantities || {}).reduce((sum: number, q: number) => sum + (q || 0), 0);
                
                const deliveriesForItem = entryDeliveries.flatMap(d => d.items).filter(dItem => dItem.entryItemId === item.id);
                
                const deliveredQty = deliveriesForItem.reduce((sum: number, dItem: DeliveryItem) => {
                    const itemQuantity = Object.values(dItem.sizeQuantities || {}).reduce((qSum: number, q: number) => qSum + (q || 0), 0);
                    return sum + itemQuantity;
                }, 0);

                if (deliveredQty <= 0) return;

                const allDeliveryDatesForEntry = entryDeliveries.map(d => new Date(d.deliveryDate).getTime());
                const lastDeliveryDate = allDeliveryDatesForEntry.length > 0 ? new Date(Math.max(...allDeliveryDatesForEntry)).toISOString() : undefined;

                const pendingQty = orderedQty - deliveredQty;
                
                const unitPrice: number = priceValue;
                const itemTotal: number = deliveredQty * unitPrice;
                
                 // Check for surcharges but DON'T change the unit price
                if (isSpecialClient && deliveredQty > 0 && deliveredQty <= 20) {
                    specialClientSurchargeBase += itemTotal;
                }
                
                // Apply dynamic surcharge, avoiding double-charging
                if (thresholdNum > 0 && percentNum > 0 && deliveredQty > 0 && deliveredQty <= thresholdNum) {
                     if (!isSpecialClient || !(deliveredQty > 0 && deliveredQty <= 20)) {
                        dynamicSurchargeBase += itemTotal;
                     }
                }

                docItems.push({
                    productId: item.productId,
                    description: item.description,
                    unitPrice: unitPrice,
                    total: itemTotal,
                    entryCode: entry.code,
                    reference: item.productRef,
                    orderedQty,
                    deliveredQty,
                    pendingQty,
                    lastDeliveryDate,
                    status: entry.status,
                });
            });
        });
        
        if (docItems.length === 0) {
            alert("No delivered items with a valid price found in the selected entries.");
            return;
        }

        // Calculate and add surcharges after processing all items
        if (specialClientSurchargeBase > 0) {
            surcharges.push({
                reason: 'Recargo por cantidad pequeña (≤20 unidades)',
                amount: specialClientSurchargeBase * 0.10,
            });
        }

        if (dynamicSurchargeBase > 0) {
            surcharges.push({
                reason: `Recargo por cantidad (${percentNum}%) para pedidos ≤ ${thresholdNum} uds`,
                amount: dynamicSurchargeBase * (percentNum / 100),
            });
        }


        const subtotal = docItems.reduce<number>((sum, item) => sum + (item.total || 0), 0);
        const totalSurcharges = surcharges.reduce<number>((sum, s) => sum + (s.amount || 0), 0);
        const taxRate = 21.00; // Example tax rate
        const taxAmount = (subtotal + totalSurcharges) * (taxRate / 100);
        const total = subtotal + totalSurcharges + taxAmount;

        const newDocument: Document = {
            id: 'temp-' + Date.now(), // Temporary ID for preview
            documentNumber: `${type.slice(0, 2).toUpperCase()}-${(documents.length + 1).toString().padStart(4, '0')}`,
            documentType: type,
            clientId: firstClientId,
            date: new Date().toISOString(),
            entryIds: Array.from(selectedEntries),
            items: docItems,
            subtotal,
            surcharges,
            taxRate,
            taxAmount,
            total,
            invoicePeriodStart: startDate || undefined,
            invoicePeriodEnd: endDate || undefined,
            paymentStatus: PaymentStatus.PENDING,
            payments: [],
        };

        setPreviewingDocument(newDocument);
    };

    const handleConfirmDocument = async () => {
        if (!previewingDocument) return;
        
        const { id, ...docData } = previewingDocument; // remove temp id
        const newDocument = await addDocument(docData as Omit<Document, 'id'>) as Document;
        
        const newStatus = newDocument.documentType === 'Factura' ? EntryStatus.INVOICED : EntryStatus.PRE_INVOICED;

        // Update entries in parallel
        const updatePromises = newDocument.entryIds.map(entryId => 
            updateEntry(entryId, { status: newStatus, invoiceId: newDocument.id })
        );
        
        await Promise.all(updatePromises);

        setSelectedEntries(new Set());
        setPreviewingDocument(null);
    };

    const downloadPdf = (documentNumber: string) => {
        const { jsPDF } = jspdf;
        const input = printableRef.current;
        if (input) {
            html2canvas(input, { scale: 3, useCORS: true }).then((canvas: any) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                const imgHeight = canvas.height * pdfWidth / canvas.width;
                let heightLeft = imgHeight;
                
                let position = 0;
                
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
                
                while (heightLeft > 0) {
                    position -= pdfHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                    heightLeft -= pdfHeight;
                }
                
                pdf.save(`${documentNumber}.pdf`);
            });
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="bg-[var(--component-bg)] shadow-lg rounded-lg p-4 flex flex-col md:flex-row flex-wrap items-center justify-between gap-4">
                 <div className="flex items-center gap-2 w-full md:w-auto">
                    <label htmlFor="client-filter" className="font-semibold text-[var(--text-secondary)] whitespace-nowrap">Client:</label>
                    <select id="client-filter" value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="p-2 border rounded-md w-full">
                        <option value="">All Clients</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                 <div className="flex items-center gap-4 w-full md:w-auto">
                     <div className="flex items-center gap-2">
                         <label htmlFor="start-date" className="font-semibold text-[var(--text-secondary)]">From:</label>
                         <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-md" />
                     </div>
                     <div className="flex items-center gap-2">
                         <label htmlFor="end-date" className="font-semibold text-[var(--text-secondary)]">To:</label>
                         <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-md" />
                     </div>
                 </div>
                 <div className="flex justify-end gap-2 w-full md:w-auto">
                    <button onClick={() => handlePreview('Prefactura')} className="btn-3d secondary" disabled={selectedEntries.size === 0}>Preview Prefactura</button>
                    <button onClick={() => handlePreview('Factura')} className="btn-3d primary" disabled={selectedEntries.size === 0}>Preview Factura</button>
                </div>
            </div>

            <div className="bg-[var(--component-bg)] shadow-lg rounded-lg p-4 space-y-4">
                <h3 className="text-lg font-semibold text-[var(--text-accent)]">Surcharge Rules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                         <label className="text-[var(--text-secondary)]">Increase price by</label>
                         <input type="number" placeholder="e.g., 15" value={priceIncreasePercent} onChange={e => setPriceIncreasePercent(e.target.value)} className="w-24 p-2 rounded-md" />
                         <label className="text-[var(--text-secondary)]">% for orders with quantity of</label>
                         <input type="number" placeholder="e.g., 50" value={quantityThreshold} onChange={e => setQuantityThreshold(e.target.value)} className="w-24 p-2 rounded-md" />
                         <label className="text-[var(--text-secondary)]">or less.</label>
                    </div>
                     <div className="flex items-center gap-2">
                         <label className="text-[var(--text-secondary)]">
                             Note: Client <strong className="text-white">{SPECIAL_CLIENT_NAME}</strong> always has a 10% surcharge for orders of 20 units or less.
                         </label>
                    </div>
                </div>
            </div>

            <div className="bg-[var(--component-bg)] shadow-lg rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border-color)]">
                        <thead className="bg-[var(--border-color)]/50">
                            <tr>
                                <th className="p-4"><input type="checkbox" onChange={handleSelectAll} checked={areAllSelected} className="rounded h-4 w-4 bg-gray-700 border-gray-600 text-[var(--rose-gold-base)] focus:ring-[var(--rose-gold-base)]" /></th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Code</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Client</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Date</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-[var(--component-bg)] divide-y divide-[var(--border-color)]">
                            {filteredEntries.map(entry => (
                                <tr key={entry.id} className={`${selectedEntries.has(entry.id) ? "bg-[var(--metallic-rose)]/10" : "hover:bg-[var(--metallic-rose)]/5"}`} onClick={() => toggleEntrySelection(entry.id)}>
                                    <td className="p-4"><input type="checkbox" checked={selectedEntries.has(entry.id)} onChange={() => {}} className="pointer-events-none rounded h-4 w-4 bg-gray-700 border-gray-600 text-[var(--rose-gold-base)] focus:ring-[var(--rose-gold-base)]" /></td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-white">{entry.code}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">{getClientName(entry.clientId)}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">{formatDate(entry.date)}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">{entry.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {previewingDocument && (
                <Modal isOpen={!!previewingDocument} onClose={() => setPreviewingDocument(null)} title={`${previewingDocument.documentType} Preview`} footer={
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setPreviewingDocument(null)} className="btn-3d cancel">Cancel</button>
                        <button onClick={() => downloadPdf(previewingDocument.documentNumber)} className="btn-3d" style={{'--bg-color': '#4f46e5', '--shadow-color': '#3730a3'} as React.CSSProperties}>Download PDF</button>
                        <button onClick={handleConfirmDocument} className="btn-3d success">Confirm and Save</button>
                    </div>
                }>
                    <div className="flex items-center justify-end gap-2 mb-4 p-2 bg-black/20 rounded-md">
                        <label className="text-[var(--text-secondary)] text-sm">Logo Size:</label>
                        <input type="range" min="30" max="150" value={logoSize} onChange={(e) => setLogoSize(Number(e.target.value))} className="w-48"/>
                    </div>
                    <PrintableInvoice ref={printableRef} document={previewingDocument} logoSize={logoSize}/>
                </Modal>
            )}
        </div>
    );
};

export default InvoiceWorkbench;
