
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useData } from '../hooks/useData';
import { EntryStatus, PaymentStatus, DocumentItem, Surcharge, Document, Entry, Client, Product, Delivery } from '../types';
import { formatDate } from '../lib/helpers';
import Modal from '../components/Modal';
import PrintableInvoice from '../components/PrintableInvoice';
import { SPECIAL_CLIENT_NAME } from '../constants';

declare var jspdf: any;
declare var html2canvas: any;

// --- Helper Functions for Document Generation ---

const generateDocumentItems = (
    entriesToInvoice: Entry[],
    products: Product[],
    deliveries: Delivery[],
    isSpecialClient: boolean,
    threshold: number,
    percent: number
): { docItems: DocumentItem[]; surcharges: Surcharge[] } => {
    const docItems: DocumentItem[] = [];
    const surcharges: Surcharge[] = [];
    let specialClientSurchargeBase = 0;
    let dynamicSurchargeBase = 0;

    entriesToInvoice.forEach(entry => {
        const entryDeliveries = deliveries.filter(d => d.entryCode === entry.code);
        entry.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            const priceValue = product ? Number(product.price) || 0 : 0;
            if (!product || isNaN(priceValue) || priceValue === 0) return;

            const orderedQty = Object.values(item.sizeQuantities || {}).reduce<number>((sum, q) => sum + (Number(q) || 0), 0);
            const deliveriesForItem = entryDeliveries.flatMap(d => d.items || []).filter(dItem => dItem.entryItemId === item.id);
            
            const deliveredQty = deliveriesForItem.reduce<number>((sum, dItem) => {
                const itemQty = Object.values(dItem.sizeQuantities || {}).reduce<number>((qSum, q) => qSum + (Number(q) || 0), 0);
                return sum + itemQty;
            }, 0);
            
            if (deliveredQty <= 0) return;

            const allDeliveryDates = entryDeliveries.map(d => new Date(d.deliveryDate).getTime());
            const lastDeliveryDate = allDeliveryDates.length > 0 ? new Date(Math.max(...allDeliveryDates)).toISOString() : undefined;
            const itemTotal = deliveredQty * priceValue;

            if (isSpecialClient && deliveredQty > 0 && deliveredQty <= 20) {
                specialClientSurchargeBase += itemTotal;
            }
            if (threshold > 0 && percent > 0 && deliveredQty > 0 && deliveredQty <= threshold) {
                 if (!isSpecialClient || !(deliveredQty > 0 && deliveredQty <= 20)) {
                    dynamicSurchargeBase += itemTotal;
                 }
            }

            docItems.push({
                productId: item.productId,
                description: item.description,
                unitPrice: priceValue,
                total: itemTotal,
                entryCode: entry.code,
                reference: item.productRef,
                orderedQty,
                deliveredQty,
                pendingQty: orderedQty - deliveredQty,
                lastDeliveryDate,
                status: entry.status,
            });
        });
    });

    if (specialClientSurchargeBase > 0) {
        surcharges.push({ reason: 'Recargo por cantidad pequeña (≤20 unidades)', amount: specialClientSurchargeBase * 0.10 });
    }
    if (dynamicSurchargeBase > 0) {
        surcharges.push({ reason: `Recargo por cantidad (${percent}%) para pedidos ≤ ${threshold} uds`, amount: dynamicSurchargeBase * (percent / 100) });
    }

    return { docItems, surcharges };
};

const calculateTotals = (docItems: DocumentItem[], surcharges: Surcharge[]) => {
    const subtotal = docItems.reduce((sum, item) => sum + item.total, 0);
    const totalSurcharges = surcharges.reduce((sum, s) => sum + s.amount, 0);
    const taxRate = 21.00;
    const taxAmount = (subtotal + totalSurcharges) * (taxRate / 100);
    const total = subtotal + totalSurcharges + taxAmount;
    return { subtotal, totalSurcharges, taxRate, taxAmount, total };
};


// --- Main Component ---

const InvoiceWorkbench = () => {
    const { entries, updateEntry, clients, deliveries, documents, addDocument, products } = useData();
    const [step, setStep] = useState(1);
    const [config, setConfig] = useState({
        clientId: '',
        startDate: '',
        endDate: '',
        quantityThreshold: '20',
        priceIncreasePercent: '10',
    });
    const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
    const [previewingDocument, setPreviewingDocument] = useState<Document | null>(null);
    const [logoSize, setLogoSize] = useState(60);
    const printableRef = useRef<HTMLDivElement>(null);

    const availableEntries = useMemo(() => {
        return entries.filter(entry => 
            (entry.status === EntryStatus.DELIVERED || entry.status === EntryStatus.PRE_INVOICED) && !entry.invoiceId
        );
    }, [entries]);

    const entriesForSelection = useMemo(() => {
        if (step !== 2 || !config.clientId) return [];
        let result = availableEntries.filter(entry => entry.clientId === config.clientId);
        if (config.startDate) {
            const start = new Date(config.startDate);
            start.setHours(0, 0, 0, 0);
            result = result.filter(entry => new Date(entry.date) >= start);
        }
        if (config.endDate) {
            const end = new Date(config.endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter(entry => new Date(entry.date) <= end);
        }
        return result;
    }, [availableEntries, config, step]);
    
    const handleNextStep = () => setStep(s => s + 1);
    const handlePrevStep = () => {
        if (step === 2) setSelectedEntries(new Set());
        setStep(s => s - 1);
    };

    const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handlePreview = useCallback((type: 'Prefactura' | 'Factura') => {
        const entriesToInvoice = entries.filter(e => selectedEntries.has(e.id));
        if (entriesToInvoice.length === 0) return;

        const client = clients.find(c => c.id === config.clientId);
        const isSpecialClient = client?.name === SPECIAL_CLIENT_NAME;
        const threshold = parseInt(config.quantityThreshold, 10) || 0;
        const percent = parseFloat(config.priceIncreasePercent) || 0;

        const { docItems, surcharges } = generateDocumentItems(entriesToInvoice, products, deliveries, isSpecialClient, threshold, percent);
        if (docItems.length === 0) {
            alert("No delivered items with a valid price found in the selected entries.");
            return;
        }

        const { subtotal, taxRate, taxAmount, total } = calculateTotals(docItems, surcharges);

        const newDocument: Document = {
            id: 'temp-' + Date.now(),
            documentNumber: `${type.slice(0, 2).toUpperCase()}-${(documents.length + 1).toString().padStart(4, '0')}`,
            documentType: type,
            clientId: config.clientId,
            date: new Date().toISOString(),
            entryIds: [...selectedEntries],
            items: docItems,
            subtotal,
            surcharges,
            taxRate,
            taxAmount,
            total,
            invoicePeriodStart: config.startDate || undefined,
            invoicePeriodEnd: config.endDate || undefined,
            paymentStatus: PaymentStatus.PENDING,
            payments: [],
        };
        setPreviewingDocument(newDocument);
    }, [config, selectedEntries, entries, products, deliveries, clients, documents.length]);
    
    const handleConfirmDocument = async () => {
        if (!previewingDocument) return;
        const { id, ...docData } = previewingDocument;
        const newDocument = await addDocument(docData as Omit<Document, 'id'>) as Document;
        const newStatus = newDocument.documentType === 'Factura' ? EntryStatus.INVOICED : EntryStatus.PRE_INVOICED;
        
        const updatePromises = newDocument.entryIds.map(entryId => updateEntry(entryId, { status: newStatus, invoiceId: newDocument.id }));
        await Promise.all(updatePromises);

        setSelectedEntries(new Set());
        setPreviewingDocument(null);
        setStep(1);
    };

    const downloadPdf = () => {
        if (!printableRef.current) {
            alert("Preview not ready for download. Please wait a moment and try again.");
            return;
        }
        const { jsPDF: JSPDF } = jspdf;
        html2canvas(printableRef.current, { scale: 3, useCORS: true }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new JSPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = canvas.height * pdfWidth / canvas.width;
            let heightLeft = imgHeight, position = 0;
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
            while (heightLeft > 0) {
                position -= pdf.internal.pageSize.getHeight();
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();
            }
            pdf.save(`${previewingDocument?.documentNumber}.pdf`);
        });
    };
    
    const renderStep = () => {
        switch (step) {
            case 1:
                return <Step1 config={config} clients={clients} onConfigChange={handleConfigChange} onNext={handleNextStep} />;
            case 2:
                return <Step2 entries={entriesForSelection} selectedEntries={selectedEntries} setSelectedEntries={setSelectedEntries} onBack={handlePrevStep} onPreview={handlePreview} />;
            default:
                return <div>Invalid Step</div>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-[var(--component-bg)] p-4 rounded-lg shadow-lg">
                <nav className="flex items-center space-x-4 text-sm font-medium">
                    {['Setup', 'Select Entries'].map((label, index) => (
                        <React.Fragment key={label}>
                            <div className="flex items-center">
                                <span className={`flex items-center justify-center w-8 h-8 rounded-full ${step > index + 1 ? 'bg-green-500' : step === index + 1 ? 'bg-[var(--rose-gold-base)]' : 'bg-[var(--charcoal-dark)] border-2 border-[var(--border-color)]'}`}>
                                    {step > index + 1 ? '✓' : index + 1}
                                </span>
                                <span className={`ml-3 ${step === index + 1 ? 'text-[var(--text-accent)] font-bold' : 'text-[var(--text-secondary)]'}`}>{label}</span>
                            </div>
                            {index < 1 && <div className="flex-1 h-0.5 bg-[var(--border-color)]"></div>}
                        </React.Fragment>
                    ))}
                </nav>
            </div>
            {renderStep()}
            {previewingDocument && (
                <Modal isOpen={!!previewingDocument} onClose={() => setPreviewingDocument(null)} title={`${previewingDocument.documentType} Preview`} footer={
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setPreviewingDocument(null)} className="btn-3d cancel">Cancel</button>
                        <button onClick={downloadPdf} className="btn-3d" style={{'--bg-color': '#4f46e5', '--shadow-color': '#3730a3'} as React.CSSProperties}>Download PDF</button>
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

// --- Step Components ---

const Step1 = ({ config, clients, onConfigChange, onNext }) => (
    <div className="bg-[var(--component-bg)] shadow-lg rounded-lg p-6 space-y-6 animate-fade-in">
        <div>
            <h3 className="text-xl font-semibold text-[var(--text-accent)] mb-4">1. Invoice Setup</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-3">
                    <label htmlFor="clientId" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Select Client</label>
                    <select id="clientId" name="clientId" value={config.clientId} onChange={onConfigChange} className="p-2 border rounded-md w-full">
                        <option value="">-- Select a Client --</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date From</label>
                    <input type="date" id="startDate" name="startDate" value={config.startDate} onChange={onConfigChange} className="p-2 border rounded-md w-full" />
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date To</label>
                    <input type="date" id="endDate" name="endDate" value={config.endDate} onChange={onConfigChange} className="p-2 border rounded-md w-full" />
                </div>
            </div>
        </div>
        <div>
            <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-4">Surcharge Rules</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-black/20 rounded-lg">
                <div className="flex items-center gap-2 flex-wrap">
                     <label className="text-[var(--text-secondary)]">Increase price by</label>
                     <input type="number" placeholder="e.g., 10" name="priceIncreasePercent" value={config.priceIncreasePercent} onChange={onConfigChange} className="w-24 p-2 rounded-md" />
                     <label className="text-[var(--text-secondary)]">% for orders with quantity of</label>
                     <input type="number" placeholder="e.g., 20" name="quantityThreshold" value={config.quantityThreshold} onChange={onConfigChange} className="w-24 p-2 rounded-md" />
                     <label className="text-[var(--text-secondary)]">or less.</label>
                </div>
                 <div className="flex items-center text-sm text-gray-400">
                     <span>Note: Client <strong className="text-white">{SPECIAL_CLIENT_NAME}</strong> always has a 10% surcharge for orders of 20 units or less, which is applied automatically.</span>
                </div>
            </div>
        </div>
        <div className="flex justify-end pt-4">
            <button onClick={onNext} className="btn-3d primary" disabled={!config.clientId}>Next: Select Entries</button>
        </div>
    </div>
);

const Step2 = ({ entries, selectedEntries, setSelectedEntries, onBack, onPreview }) => {
    const toggleEntrySelection = (entryId: string) => {
        setSelectedEntries(prev => {
            const newSelection = new Set(prev);
            newSelection.has(entryId) ? newSelection.delete(entryId) : newSelection.add(entryId);
            return newSelection;
        });
    };
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedEntries(e.target.checked ? new Set(entries.map(entry => entry.id)) : new Set());
    };
    const areAllSelected = entries.length > 0 && selectedEntries.size === entries.length;

    return (
        <div className="bg-[var(--component-bg)] shadow-lg rounded-lg p-6 space-y-6 animate-fade-in">
            <h3 className="text-xl font-semibold text-[var(--text-accent)]">2. Select Entries to Invoice</h3>
            <div className="overflow-x-auto border border-[var(--border-color)] rounded-lg">
                <table className="min-w-full divide-y divide-[var(--border-color)]">
                    <thead className="bg-[var(--border-color)]/50">
                        <tr>
                            <th className="p-4"><input type="checkbox" onChange={handleSelectAll} checked={areAllSelected} className="rounded h-4 w-4 bg-gray-700 border-gray-600 text-[var(--rose-gold-base)] focus:ring-[var(--rose-gold-base)]" /></th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Code</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Date</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Status</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Items Desc.</th>
                        </tr>
                    </thead>
                    <tbody className="bg-[var(--component-bg)] divide-y divide-[var(--border-color)]">
                        {entries.length > 0 ? entries.map(entry => (
                            <tr key={entry.id} className={`${selectedEntries.has(entry.id) ? "bg-[var(--metallic-rose)]/10" : "hover:bg-[var(--metallic-rose)]/5"} cursor-pointer`} onClick={() => toggleEntrySelection(entry.id)}>
                                <td className="p-4"><input type="checkbox" checked={selectedEntries.has(entry.id)} onChange={() => {}} className="pointer-events-none rounded h-4 w-4 bg-gray-700 border-gray-600 text-[var(--rose-gold-base)] focus:ring-[var(--rose-gold-base)]" /></td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-white">{entry.code}</td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">{formatDate(entry.date)}</td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">{entry.status}</td>
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-400 max-w-xs truncate">{entry.items.map(i => i.description).join(', ')}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="text-center py-10 text-[var(--text-secondary)]">No available entries found for the selected client and date range.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-between items-center pt-4">
                <button onClick={onBack} className="btn-3d secondary">Back</button>
                <div className="flex items-center gap-4">
                     <span className="text-sm font-medium text-[var(--text-secondary)]">{selectedEntries.size} entries selected</span>
                     <button onClick={() => onPreview('Prefactura')} className="btn-3d" style={{'--bg-color': '#a855f7', '--shadow-color': '#7e22ce'} as React.CSSProperties} disabled={selectedEntries.size === 0}>Preview Prefactura</button>
                    <button onClick={() => onPreview('Factura')} className="btn-3d primary" disabled={selectedEntries.size === 0}>Preview Factura</button>
                </div>
            </div>
        </div>
    );
};

export default InvoiceWorkbench;
