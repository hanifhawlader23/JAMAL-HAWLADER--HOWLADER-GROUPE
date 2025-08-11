
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { EntryStatus, PaymentStatus, Document, Payment } from '../types';
import { formatDate } from '../lib/helpers';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import PrintableInvoice from '../components/PrintableInvoice';
import DateRangePicker from '../components/DateRangePicker';
import DashboardCard from '../components/DashboardCard';
import { ResponsiveContainer, Treemap, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine, PieChart, Pie, Cell } from 'recharts';

declare var jspdf: any;
declare var html2canvas: any;

const CHART_COLORS = {
    PAID: '#B76E79',
    PENDING: '#F6D1C1',
    OVERDUE: '#8B5E5A',
    TREEMAP_LOW: '#F6D1C1',
    TREEMAP_HIGH: '#B76E79',
    LAST_YEAR_LINE: '#8B5E5A',
    GOAL_LINE: '#D4A5A5',
};

const AddPaymentModal = ({
    isOpen,
    onClose,
    doc,
    onAddPayment,
}: { isOpen: boolean, onClose: () => void, doc: Document | null, onAddPayment: (docId: string, payment: Payment) => void }) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState('Bank Transfer');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (doc && doc.amountDue) {
            setAmount(doc.amountDue > 0 ? doc.amountDue.toFixed(2) : '');
            setError('');
        }
    }, [doc]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Please enter a valid positive amount.');
            return;
        }
        if (doc && doc.amountDue && numericAmount > doc.amountDue + 0.001) { // Add epsilon for float comparison
            setError(`Amount cannot exceed the remaining balance of ${doc.amountDue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}.`);
            return;
        }

        const newPayment: Payment = {
            amount: numericAmount,
            date: new Date(date).toISOString(),
            method,
            notes,
        };
        if (doc) {
            onAddPayment(doc.id, newPayment);
        }
        onClose();
    };

    if (!doc) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add Payment for ${doc.documentNumber}`} footer={<></>}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-black/20 p-4 rounded-lg">
                    <div className="flex justify-between text-lg">
                        <span>Total Invoice:</span>
                        <span className="font-bold">{doc.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-400">
                        <span>Already Paid:</span>
                        <span>{(doc.amountPaid || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-400 mt-1 border-t border-[var(--border-color)] pt-1">
                        <span>Amount Due:</span>
                        <span className="font-bold">{(doc.amountDue || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                </div>

                {error && <p className="bg-red-500/20 text-red-300 p-3 rounded-md text-center">{error}</p>}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-[var(--rose-gold-base)]">Payment Amount</label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="mt-1 block w-full p-2 rounded-md shadow-sm"
                            required
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-[var(--rose-gold-base)]">Payment Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="mt-1 block w-full p-2 rounded-md shadow-sm"
                            required
                        />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-[var(--rose-gold-base)]">Payment Method</label>
                    <select value={method} onChange={e => setMethod(e.target.value)} className="mt-1 block w-full p-2 rounded-md shadow-sm">
                        <option>Bank Transfer</option>
                        <option>Cash</option>
                        <option>Credit Card</option>
                        <option>Other</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--rose-gold-base)]">Notes (Optional)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 block w-full p-2 rounded-md shadow-sm" />
                </div>
                <div className="pt-4 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="btn-3d cancel">Cancel</button>
                    <button type="submit" className="btn-3d success">Add Payment</button>
                </div>
            </form>
        </Modal>
    );
};

const InvoiceHistory = () => {
    const { documents, updateDocument, deleteDocument, clients, updateEntry } = useData();
    const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
    const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, idToDelete: '' });
    const [confirmBulkDeleteModalState, setConfirmBulkDeleteModalState] = useState(false);
    const [selectedDocuments, setSelectedDocuments] = useState(new Set());
    const [selectedClient, setSelectedClient] = useState('');
    const [dateRange, setDateRange] = useState({label: 'All Time', start: null, end: null});
    const [statusFilter, setStatusFilter] = useState('');
    const [paymentModalState, setPaymentModalState] = useState<{ isOpen: boolean, doc: Document | null }>({ isOpen: false, doc: null });
    const location = useLocation();
    const navigate = useNavigate();


    const derivedDocuments = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return documents.map(doc => {
            const amountPaid = doc.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
            const amountDue = doc.total - amountPaid;

            let derivedStatus: 'Paid' | 'Pending' | 'Overdue';
            if (amountDue <= 0.001) { // Using an epsilon for float comparisons
                derivedStatus = 'Paid';
            } else if (new Date(doc.date) < thirtyDaysAgo) {
                derivedStatus = 'Overdue';
            } else {
                derivedStatus = 'Pending';
            }
            return { ...doc, derivedStatus, amountPaid, amountDue };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [documents]);

    useEffect(() => {
        const docIdToOpen = location.state?.openDocumentId;
        if (docIdToOpen) {
            const docToView = derivedDocuments.find(d => d.id === docIdToOpen);
            if (docToView) {
                setViewingDocument(docToView);
                // Clear state to prevent re-opening on refresh/navigation
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, derivedDocuments, navigate]);

    const filteredDocuments = useMemo(() => {
        let docs = derivedDocuments;

        if (selectedClient) {
            docs = docs.filter(doc => doc.clientId === selectedClient);
        }
        
        if (statusFilter) {
            docs = docs.filter(doc => doc.derivedStatus === statusFilter);
        }

        if (dateRange.start && dateRange.end) {
            const start = dateRange.start;
            const end = dateRange.end;
            docs = docs.filter(doc => {
                const docDate = new Date(doc.date);
                return docDate >= start && docDate <= end;
            });
        }
        
        return docs;

    }, [derivedDocuments, selectedClient, dateRange, statusFilter]);
    
    // --- Data for KPI Cards & Charts ---

    const kpiData = useMemo(() => {
        const totalAmount = filteredDocuments.reduce((sum, doc) => sum + doc.total, 0);
        const paidAmount = filteredDocuments.filter(d => d.derivedStatus === 'Paid').reduce((sum, doc) => sum + doc.total, 0);
        const pendingAmount = filteredDocuments.reduce((sum, doc) => sum + (doc.amountDue || 0), 0);
        const docCount = filteredDocuments.length;
        const totalPaid = filteredDocuments.reduce((sum, doc) => sum + (doc.amountPaid || 0), 0);

        return {
            totalAmount,
            paidPercent: totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0,
            pendingPercent: totalAmount > 0 ? (pendingAmount / totalAmount) * 100 : 0,
            avgValue: docCount > 0 ? totalAmount / docCount : 0,
        };
    }, [filteredDocuments]);

    const treemapData = useMemo(() => {
        const clientData: { [key: string]: { name: string, totalAmount: number, invoiceCount: number } } = {};

        filteredDocuments.forEach(doc => {
            if (!clientData[doc.clientId]) {
                const clientName = clients.find(c => c.id === doc.clientId)?.name || 'Unknown Client';
                clientData[doc.clientId] = { name: clientName, totalAmount: 0, invoiceCount: 0 };
            }
            clientData[doc.clientId].totalAmount += doc.total;
            clientData[doc.clientId].invoiceCount += 1;
        });

        return Object.values(clientData).map(d => ({
            ...d,
            avgValue: d.invoiceCount > 0 ? d.totalAmount / d.invoiceCount : 0,
        })).sort((a,b) => b.totalAmount - a.totalAmount);
    }, [filteredDocuments, clients]);

    const monthlyFlowData = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;
        const months = Array.from({ length: 12 }, (_, i) => ({
            name: new Date(0, i).toLocaleString('default', { month: 'short' }),
            currentYear: 0,
            lastYear: 0,
        }));

        documents.forEach(doc => {
            const docDate = new Date(doc.date);
            const docYear = docDate.getFullYear();
            const docMonth = docDate.getMonth();
            if (docYear === currentYear) {
                months[docMonth].currentYear += doc.total;
            } else if (docYear === lastYear) {
                months[docMonth].lastYear += doc.total;
            }
        });
        
        // Make it cumulative
        for (let i = 1; i < 12; i++) {
            months[i].currentYear += months[i - 1].currentYear;
            months[i].lastYear += months[i - 1].lastYear;
        }
        return months;
    }, [documents]);

    const sunburstData = useMemo(() => {
        const statusTotals = { Paid: 0, Pending: 0, Overdue: 0 };
        const clientBreakdown: { name: string, value: number, status: string }[] = [];
        
        const clientMap: { [key: string]: { Paid: number, Pending: number, Overdue: number } } = {};

        filteredDocuments.forEach(doc => {
            statusTotals[doc.derivedStatus!] += doc.total;
            const clientName = clients.find(c => c.id === doc.clientId)?.name || 'Unknown';
            if (!clientMap[clientName]) clientMap[clientName] = { Paid: 0, Pending: 0, Overdue: 0 };
            clientMap[clientName][doc.derivedStatus!] += doc.total;
        });
        
        Object.entries(clientMap).forEach(([name, statuses]) => {
            Object.entries(statuses).forEach(([status, value]) => {
                if (value > 0) {
                    clientBreakdown.push({ name, value, status: status });
                }
            });
        });

        const statusData = Object.entries(statusTotals).map(([name, value]) => ({ name, value }));

        return { statusData, clientBreakdown };
    }, [filteredDocuments, clients]);


    // --- General Functions ---
    const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || 'N/A';
    const handleDeleteClick = (docId: string) => setConfirmModalState({ isOpen: true, idToDelete: docId });
    
    const handleConfirmDelete = async () => {
        const docId = confirmModalState.idToDelete;
        const docToDelete = documents.find(d => d.id === docId);
        if (!docToDelete) return;
        
        // Reset status of associated entries
        const updatePromises = docToDelete.entryIds.map(entryId => 
            updateEntry(entryId, { status: EntryStatus.DELIVERED, invoiceId: undefined })
        );
        await Promise.all(updatePromises);
        
        // Delete the document
        await deleteDocument(docId);
        
        setConfirmModalState({ isOpen: false, idToDelete: '' });
    };

    const handleBulkDelete = async () => {
        const docsToDelete = documents.filter(d => selectedDocuments.has(d.id));
        const entryIdsToReset = docsToDelete.flatMap(d => d.entryIds);
        
        const entryUpdatePromises = entryIdsToReset.map(entryId => 
            updateEntry(entryId, { status: EntryStatus.DELIVERED, invoiceId: undefined })
        );
        await Promise.all(entryUpdatePromises);

        const docDeletePromises = docsToDelete.map(d => deleteDocument(d.id));
        await Promise.all(docDeletePromises);

        setSelectedDocuments(new Set());
        setConfirmBulkDeleteModalState(false);
    };

    const handleSelectDocument = (docId: string) => {
        setSelectedDocuments(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(docId)) {
                newSelection.delete(docId);
            } else {
                newSelection.add(docId);
            }
            return newSelection;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allFilteredIds = new Set(filteredDocuments.map(doc => doc.id));
            setSelectedDocuments(allFilteredIds);
        } else {
            setSelectedDocuments(new Set());
        }
    };
    
    const areAllSelected = filteredDocuments.length > 0 && selectedDocuments.size === filteredDocuments.length;

    const handleOpenPaymentModal = (doc: Document) => {
        setPaymentModalState({ isOpen: true, doc });
    };

    const handleAddPayment = async (docId: string, payment: Payment) => {
        const doc = documents.find(d => d.id === docId);
        if (!doc) return;
        
        const existingPayments = doc.payments || [];
        const updatedPayments = [...existingPayments, payment];
        const amountPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        const newPaymentStatus = amountPaid >= doc.total ? PaymentStatus.PAID : PaymentStatus.PENDING;

        await updateDocument(docId, { payments: updatedPayments, paymentStatus: newPaymentStatus });
    };

    const downloadPdf = (documentId: string, documentNumber: string) => {
        const { jsPDF } = jspdf;
        const input = document.getElementById(`printable-area-${documentId}`);
        if (input) {
            html2canvas(input, { scale: 3, useCORS: true }).then((canvas) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, (canvas.height * pdfWidth) / canvas.width);
                pdf.save(`${documentNumber}.pdf`);
            });
        }
    };
    
    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <DashboardCard title="Total Invoice Amount" value={kpiData.totalAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} icon="💶" color={CHART_COLORS.PAID} onClick={() => setStatusFilter('')}/>
                 <DashboardCard title="Total Paid" value={`${kpiData.paidPercent.toFixed(1)}%`} icon="✅" color="#22c55e" onClick={() => setStatusFilter('Paid')}/>
                 <DashboardCard title="Total Pending" value={`${kpiData.pendingPercent.toFixed(1)}%`} icon="⏳" color="#f97316" onClick={() => setStatusFilter('Pending')}/>
                 <DashboardCard title="Avg. Invoice Value" value={kpiData.avgValue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} icon="🧾" color="#3b82f6" />
            </div>

            {/* Filter Bar */}
            <div className="bg-[var(--component-bg)] shadow-lg rounded-lg p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="flex flex-wrap items-center gap-4 flex-grow">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label htmlFor="client-filter" className="font-semibold text-[var(--text-secondary)] whitespace-nowrap">Client:</label>
                        <select id="client-filter" value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="p-2 border rounded-md w-full sm:w-48">
                            <option value="">All Clients</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                     <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label htmlFor="status-filter" className="font-semibold text-[var(--text-secondary)] whitespace-nowrap">Status:</label>
                        <select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border rounded-md w-full sm:w-36">
                            <option value="">All Statuses</option>
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="Overdue">Overdue</option>
                        </select>
                    </div>
                    <DateRangePicker onDateChange={setDateRange} selectedRangeLabel={dateRange.label}/>
                </div>
                 {selectedDocuments.size > 0 && (
                    <button
                        onClick={() => setConfirmBulkDeleteModalState(true)}
                        className="btn-3d danger"
                    >
                        Delete Selected ({selectedDocuments.size})
                    </button>
                )}
            </div>

            {/* Main Table */}
            <div className="bg-[var(--component-bg)] shadow-lg rounded-lg overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border-color)]">
                         <thead className="bg-[var(--border-color)]/50">
                             <tr>
                                <th className="p-4"><input type="checkbox" onChange={handleSelectAll} checked={areAllSelected} className="rounded h-4 w-4 bg-gray-700 border-gray-600 text-[var(--rose-gold-base)] focus:ring-[var(--rose-gold-base)]"/></th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Number</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Client</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Date</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Total</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Status</th>
                                <th className="px-3 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="bg-[var(--component-bg)] divide-y divide-[var(--border-color)]">
                            {filteredDocuments.map(doc => {
                                 const statusStyles = {
                                    Paid: { bg: 'bg-green-500/20', text: 'text-green-300' },
                                    Pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
                                    Overdue: { bg: 'bg-red-500/20', text: 'text-red-300' },
                                };
                                const style = statusStyles[doc.derivedStatus!] || statusStyles.Pending;

                                return (
                                <tr key={doc.id} className={`${selectedDocuments.has(doc.id) ? "bg-[var(--metallic-rose)]/10" : ''}`}>
                                     <td className="p-4"><input type="checkbox" checked={selectedDocuments.has(doc.id)} onChange={() => handleSelectDocument(doc.id)} className="rounded h-4 w-4 bg-gray-700 border-gray-600 text-[var(--rose-gold-base)] focus:ring-[var(--rose-gold-base)]" /></td>
                                     <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-white">{doc.documentNumber}</td>
                                     <td className="px-3 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">{getClientName(doc.clientId)}</td>
                                     <td className="px-3 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">{formatDate(doc.date)}</td>
                                     <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-[var(--text-primary)]">{doc.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
                                     <td className="px-3 py-4 whitespace-nowrap text-sm">
                                         <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style.bg} ${style.text}`}>
                                            {doc.derivedStatus}
                                         </span>
                                     </td>
                                     <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                                         <div className="flex items-center justify-end space-x-2">
                                            {doc.derivedStatus !== 'Paid' && <button onClick={() => handleOpenPaymentModal(doc)} className="btn-3d sm success">Pay</button>}
                                            <button onClick={() => setViewingDocument(doc)} className="btn-3d sm">View</button>
                                            <button onClick={() => handleDeleteClick(doc.id)} className="btn-3d sm danger">Delete</button>
                                         </div>
                                     </td>
                                </tr>
                            )})}
                         </tbody>
                    </table>
                 </div>
            </div>

            {/* Chart Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                 <div className="bg-[var(--component-bg)] p-4 md:p-6 rounded-2xl shadow-lg">
                    <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-4">Revenue by Client</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <Treemap
                            data={treemapData}
                            dataKey="totalAmount"
                            aspectRatio={4 / 3}
                            stroke="#fff"
                            fill={CHART_COLORS.TREEMAP_HIGH}
                            content={<CustomizedContent colors={[CHART_COLORS.TREEMAP_LOW, CHART_COLORS.TREEMAP_HIGH]}/>}
                        >
                             <Tooltip content={<CustomTreemapTooltip />}/>
                        </Treemap>
                    </ResponsiveContainer>
                </div>
                 <div className="bg-[var(--component-bg)] p-4 md:p-6 rounded-2xl shadow-lg">
                     <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-4">Cumulative Revenue Flow (YoY)</h3>
                     <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={monthlyFlowData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)"/>
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)'}}/>
                            <YAxis tickFormatter={(v) => `€${Number(v/1000).toFixed(0)}k`} tick={{ fill: 'var(--text-secondary)'}}/>
                            <Tooltip formatter={(value) => value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} contentStyle={{ backgroundColor: 'var(--component-bg)', border: '1px solid var(--border-color)'}}/>
                            <Legend wrapperStyle={{color: 'var(--text-secondary)'}}/>
                            <Area type="monotone" dataKey="lastYear" name="Last Year" stroke={CHART_COLORS.LAST_YEAR_LINE} fill={CHART_COLORS.LAST_YEAR_LINE} fillOpacity={0.2} />
                            <Area type="monotone" dataKey="currentYear" name="Current Year" stroke={CHART_COLORS.PAID} fill={CHART_COLORS.PAID} fillOpacity={0.5}/>
                        </AreaChart>
                     </ResponsiveContainer>
                </div>
            </div>

            {/* Modals */}
             {viewingDocument && (
                <Modal isOpen={!!viewingDocument} onClose={() => setViewingDocument(null)} title={`${viewingDocument.documentType} Details`} footer={
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setViewingDocument(null)} className="btn-3d cancel">Close</button>
                        <button onClick={() => downloadPdf(viewingDocument.id, viewingDocument.documentNumber)} className="btn-3d" style={{'--bg-color': '#4f46e5', '--shadow-color': '#3730a3'} as React.CSSProperties}>Download PDF</button>
                    </div>
                }>
                    <PrintableInvoice document={viewingDocument} logoSize={60} />
                </Modal>
            )}
             <ConfirmationModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ isOpen: false, idToDelete: '' })}
                onConfirm={handleConfirmDelete}
                title="Delete Document"
                message="Are you sure you want to delete this document? This will also revert the status of associated entries to 'Delivered' and cannot be undone."
            />
             <ConfirmationModal
                isOpen={confirmBulkDeleteModalState}
                onClose={() => setConfirmBulkDeleteModalState(false)}
                onConfirm={handleBulkDelete}
                title={`Delete ${selectedDocuments.size} Documents`}
                message={`Are you sure you want to delete these ${selectedDocuments.size} documents? All associated entries will be marked as 'Delivered' again.`}
            />
            <AddPaymentModal
                isOpen={paymentModalState.isOpen}
                onClose={() => setPaymentModalState({ isOpen: false, doc: null })}
                doc={paymentModalState.doc}
                onAddPayment={handleAddPayment}
            />
        </div>
    );
};

// Custom Treemap Content
const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, colors, name, totalAmount } = props;

    // A simple interpolation function
    const interpolateColor = (color1, color2, factor) => {
        const result = color1.slice();
        for (let i = 0; i < 3; i++) {
            result[i] = Math.round(result[i] + factor * (color2[i] - result[i]));
        }
        return result;
    };

    // Convert hex colors to RGB arrays
    const hexToRgb = (hex) => hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b).substring(1).match(/.{2}/g)?.map(x => parseInt(x, 16)) || [0,0,0];

    const color1Rgb = hexToRgb(colors[0]);
    const color2Rgb = hexToRgb(colors[1]);
    
    // Find max value in the root data to normalize
    const maxVal = Math.max(...root.children.map(c => c.value));
    const normalizedValue = totalAmount / maxVal;

    const finalColor = interpolateColor(color1Rgb, color2Rgb, normalizedValue);

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: `rgb(${finalColor[0]}, ${finalColor[1]}, ${finalColor[2]})`,
                    stroke: '#fff',
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 1 / (depth + 1e-10),
                }}
            />
            {width > 80 && height > 20 ? (
                <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#fff" fontSize={14} stroke="#000" strokeWidth={0.5} strokeLinejoin="round">
                    {name}
                </text>
            ) : null}
        </g>
    );
};

const CustomTreemapTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
             <div className="bg-[var(--component-bg)] p-4 rounded-lg shadow-lg border border-[var(--border-color)] text-sm">
                <p className="font-bold text-[var(--text-accent)] mb-2">{data.name}</p>
                <p>Total Revenue: {data.totalAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                <p>Invoice Count: {data.invoiceCount.toLocaleString()}</p>
                <p>Avg. Invoice: {data.avgValue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
            </div>
        )
    }
    return null;
};


export default InvoiceHistory;
