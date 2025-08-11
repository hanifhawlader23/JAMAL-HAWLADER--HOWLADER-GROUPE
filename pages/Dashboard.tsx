

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, ComposedChart, Area, ReferenceLine, Label, TooltipProps } from 'recharts';
import DashboardCard from '../components/DashboardCard';
import { useData } from '../hooks/useData';
import { EntryStatus, Role, EntryItem, DeliveryItem, Product, Entry, Delivery, Client } from '../types';
import { COLORS, SIZES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import DateRangePicker from '../components/DateRangePicker';

// --- New Chart Colors ---
const CHART_COLORS = {
    DELIVERED: '#B76E79', // Dark Rose
    PENDING: '#FFE9E3',   // Soft Blush
    PENDING_BORDER: '#D4A5A5',
    REVENUE_LINE: '#8B5E5A', // Deep Rose-ish
    RECEIVED: '#F6D1C1',
    FULFILLMENT_LINE: '#8B5E5A',
    GOAL_LINE: '#D4A5A5',
    HEATMAP_LOW: '#FAF3F0',
    HEATMAP_HIGH: '#B76E79',
};


const Dashboard = () => {
    const { entries, clients, deliveries, documents, products } = useData();
    const { hasRole } = useAuth();
    const navigate = useNavigate();
    const [clientFilter, setClientFilter] = useState('');
    const [dateRange, setDateRange] = useState<{ label: string; start: Date | null; end: Date | null }>({label: 'All Time', start: null, end: null});
    
    const isAdmin = useMemo(() => hasRole([Role.ADMIN]), [hasRole]);
    
    const filteredData = useMemo(() => {
        const clientMatch = (entry: Entry) => !clientFilter || entry.clientId === clientFilter;
        const dateMatch = (date: Date) => (!dateRange.start || date >= dateRange.start) && (!dateRange.end || date <= dateRange.end);

        const fEntries = entries.filter(e => clientMatch(e) && dateMatch(new Date(e.date)));
        const fDeliveries = deliveries.filter(d => {
            const entry = entries.find(e => e.code === d.entryCode);
            return entry ? clientMatch(entry) && dateMatch(new Date(d.deliveryDate)) : false;
        });
        return { filteredEntries: fEntries, filteredDeliveries: fDeliveries };
    }, [clientFilter, dateRange, entries, deliveries]);

    const filteredRevenue = useMemo(() => {
        const relevantEntries = entries.filter(entry => {
            const isRelevantStatus = entry.status === EntryStatus.DELIVERED || entry.status === EntryStatus.PRE_INVOICED;
            if (!isRelevantStatus) return false;

            const clientMatch = !clientFilter || entry.clientId === clientFilter;
            
            const entryDate = new Date(entry.date);
            const dateMatch = (!dateRange.start || entryDate >= dateRange.start) && (!dateRange.end || entryDate <= dateRange.end);
            
            return clientMatch && dateMatch;
        });

        return relevantEntries.reduce((total, entry) => {
            const entryTotal = entry.items.reduce((entrySum, item) => {
                const product = products.find(p => p.id === item.productId);
                const price = product ? product.price : 0;
                const itemQty = Object.values(item.sizeQuantities).reduce((qSum, q) => qSum + q, 0);
                return entrySum + (itemQty * price);
            }, 0);
            return total + entryTotal;
        }, 0);
    }, [entries, products, clientFilter, dateRange]);


    const getTotalUnits = (items: (EntryItem | DeliveryItem)[]) => items.reduce((sum, item) => sum + Object.values(item.sizeQuantities).reduce((qSum, q) => qSum + q, 0), 0);

    const { filteredEntries, filteredDeliveries } = filteredData;
    
    // Card values are now calculated based on the filtered data
    const totalEntries = filteredEntries.length;
    const unitsReceived = getTotalUnits(filteredEntries.flatMap(e => e.items));
    const unitsDelivered = getTotalUnits(filteredDeliveries.flatMap(d => d.items));
    const pendingUnits = unitsReceived - unitsDelivered;

    // Status Breakdown Data - this chart remains global to show overall status distribution
    const statusData = Object.values(EntryStatus)
        .map(status => ({
            name: status,
            value: entries.filter(e => e.status === status).length
        })).filter(item => item.value > 0);

    const STATUS_PIE_COLORS = {
        [EntryStatus.RECEIVED]: '#3b82f6',
        [EntryStatus.IN_PROCESS]: '#f97316',
        [EntryStatus.DELIVERED]: '#22c55e',
        [EntryStatus.PRE_INVOICED]: '#a855f7',
        [EntryStatus.INVOICED]: '#6b7280',
    };
    
    // Revenue Trend Data - remains global for an overall trend view
    const revenueTrendData = documents 
        .filter(d => d.documentType === 'Factura' || d.documentType === 'Prefactura')
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(d => ({
            date: new Date(d.date).toLocaleDateString('en-CA'),
            revenue: d.total,
        }));
    
    // Product Performance Data - remains global for overall product popularity
    const productPerformanceData = products.map(product => {
        const deliveredCount = deliveries.flatMap(del => del.items)
            .filter((item): item is DeliveryItem => item.productId === product.id)
            .reduce((sum, item) => sum + Object.values(item.sizeQuantities).reduce((qSum, q) => qSum + q, 0), 0);
        return { name: product.modelName, 'Units Delivered': deliveredCount };
    }).filter(p => p['Units Delivered'] > 0);


    const chartTextColor = 'var(--text-secondary)';
    const chartGridColor = 'var(--border-color)';

    // State for new charts
    const [modalInfo, setModalInfo] = useState<{isOpen: boolean, title: string, content: React.ReactNode}>({ isOpen: false, title: '', content: null });
    const [timelineUnit, setTimelineUnit] = useState('Month');
    const [heatmapMode, setHeatmapMode] = useState('Client');

    return (
        <div className="space-y-6">
            <div className="bg-[var(--component-bg)] shadow-lg rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <label htmlFor="client-filter" className="font-semibold text-[var(--text-secondary)] whitespace-nowrap">Client:</label>
                    <select id="client-filter" value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="p-2 border rounded-md w-full">
                        <option value="">All Clients</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <DateRangePicker onDateChange={setDateRange} selectedRangeLabel={dateRange.label}/>
            </div>
            
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${isAdmin ? 'md:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-4'}`}>
                <DashboardCard title="Total Entries" value={totalEntries} icon={'📦'} color={COLORS.ROSE_GOLD_BASE} onClick={() => navigate('/entries')} />
                <DashboardCard title="Units Received" value={unitsReceived.toLocaleString('en-US')} icon={'📥'} color={'#3b82f6'} onClick={() => navigate('/entries')} />
                <DashboardCard title="Units Delivered" value={unitsDelivered.toLocaleString('en-US')} icon={'🚚'} color={'#22c55e'} onClick={() => navigate('/entries/delivered')} />
                <DashboardCard title="Pending Units" value={pendingUnits.toLocaleString('en-US')} icon={'⏳'} color={'#f97316'} onClick={() => navigate('/entries/pending')} />
                {isAdmin && (
                    <DashboardCard title="Filtered Revenue" value={`${filteredRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`} icon={'💰'} color={'#a855f7'} onClick={() => navigate('/invoice-history')} />
                 )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[var(--component-bg)] p-4 md:p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-4">Status Breakdown</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label={{ fill: chartTextColor }}>
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={STATUS_PIE_COLORS[entry.name]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'var(--component-bg)', border: '1px solid var(--border-color)'}} formatter={(value) => `${Number(value).toLocaleString('en-US')} Entries`}/>
                            <Legend wrapperStyle={{ color: chartTextColor }}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-[var(--component-bg)] p-4 md:p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-4">Product Performance</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={productPerformanceData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                            <XAxis type="number" tickFormatter={(tick) => Number(tick).toLocaleString('en-US')} tick={{ fill: chartTextColor }}/>
                            <YAxis type="category" dataKey="name" width={100} tick={{ fill: chartTextColor, fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--component-bg)', border: '1px solid var(--border-color)'}} formatter={(value) => `${Number(value).toLocaleString('en-US')} Units`}/>
                            <Legend wrapperStyle={{ color: chartTextColor }}/>
                            <Bar dataKey="Units Delivered" fill="var(--metallic-rose)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {isAdmin && (
                 <div className="bg-[var(--component-bg)] p-4 md:p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-4">Overall Revenue Trends</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={revenueTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                            <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} tick={{ fill: chartTextColor }}/>
                            <YAxis tickFormatter={(tick) => `${Number(tick).toLocaleString('de-DE')} €`} tick={{ fill: chartTextColor }}/>
                            <Tooltip contentStyle={{ backgroundColor: 'var(--component-bg)', border: '1px solid var(--border-color)'}} formatter={(value) => `${Number(value).toLocaleString('de-DE')} €`}/>
                            <Legend wrapperStyle={{ color: chartTextColor }}/>
                            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="var(--rose-gold-base)" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* --- NEW CHARTS START HERE --- */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {isAdmin && (
                    <ClientPerformanceChart
                        data={{...filteredData, clients, products}}
                        setModalInfo={setModalInfo}
                    />
                )}
                <div className={!isAdmin ? 'xl:col-span-2' : ''}>
                    <DeliveryTimeline 
                        data={{...filteredData, filteredEntries: entries.filter(e=>filteredEntries.map(fe => fe.id).includes(e.id))}}
                        timeUnit={timelineUnit}
                        setTimeUnit={setTimelineUnit}
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
                 <BottleneckHeatmap
                    data={{...filteredData, clients}}
                    mode={heatmapMode}
                    setMode={setHeatmapMode}
                    setModalInfo={setModalInfo}
                 />
            </div>

             {modalInfo.isOpen && (
                <Modal isOpen={modalInfo.isOpen} onClose={() => setModalInfo({isOpen: false, title: '', content: null})} title={modalInfo.title} footer={<></>}>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {modalInfo.content}
                    </div>
                </Modal>
            )}
        </div>
    );
};

// --- NEW CHART COMPONENTS ---

const ClientPerformanceChart = ({ data, setModalInfo }: { data: { filteredEntries: Entry[], filteredDeliveries: Delivery[], clients: Client[], products: Product[] }, setModalInfo: (info: { isOpen: boolean, title: string, content: React.ReactNode }) => void }) => {
    const { filteredEntries, filteredDeliveries, clients, products } = data;

    const performanceData = useMemo(() => {
        const clientMap = new Map<string, { name: string, recibida: number, entregada: number, revenue: number }>();
        clients.forEach(c => clientMap.set(c.id, { name: c.name, recibida: 0, entregada: 0, revenue: 0 }));

        filteredEntries.forEach(entry => {
            const client = clientMap.get(entry.clientId);
            if(client) client.recibida += entry.items.reduce((sum, item) => sum + Object.values(item.sizeQuantities).reduce((a, b) => a + b, 0), 0);
        });

        filteredDeliveries.forEach(delivery => {
            const entry = data.filteredEntries.find(e => e.code === delivery.entryCode);
            if (!entry) return;
            const client = clientMap.get(entry.clientId);
            if(!client) return;

            delivery.items.forEach((dItem: DeliveryItem) => {
                const qty = Object.values(dItem.sizeQuantities).reduce((a, b) => a + b, 0);
                const entryItem = entry.items.find(i => i.id === dItem.entryItemId);
                const product = products.find(p => p.id === entryItem?.productId);
                client.entregada += qty;
                client.revenue += qty * (product?.price || 0);
            });
        });

        const result = Array.from(clientMap.values())
            .map(d => ({
                ...d,
                falta: Math.max(0, d.recibida - d.entregada),
                fulfillmentRate: d.recibida > 0 ? (d.entregada / d.recibida) : 0,
            }))
            .filter(d => d.recibida > 0)
            .sort((a,b) => b.revenue - a.revenue);
        return result;

    }, [filteredEntries, filteredDeliveries, clients, products]);
    
    const handleBarClick = (payload: any) => {
        if (!payload) return;
        const clientName = payload.name;
        const client = clients.find(c => c.name === clientName);
        if (!client) return;
        
        const content = (
            <div className="text-sm">Drill-down for {clientName} is not yet implemented.</div>
        );

        setModalInfo({ isOpen: true, title: `Details for ${clientName}`, content });
    };

    return (
        <div className="bg-[var(--component-bg)] p-4 md:p-6 rounded-2xl shadow-lg" style={{borderRadius: '16px'}}>
            <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-4">Client Performance Overview</h3>
             <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={performanceData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis yAxisId="left" orientation="left" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} label={{ value: 'Quantity', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }} />
                    <YAxis yAxisId="right" orientation="right" stroke={CHART_COLORS.REVENUE_LINE} tick={{ fill: CHART_COLORS.REVENUE_LINE }} label={{ value: 'Revenue (€)', angle: 90, position: 'insideRight', fill: CHART_COLORS.REVENUE_LINE }} />
                    <Tooltip content={<CustomTooltipClientPerformance />} />
                    <Legend wrapperStyle={{color: 'var(--text-secondary)'}} />
                    <Bar yAxisId="left" dataKey="entregada" name="Entregada" barSize={30} stackId="a" fill={CHART_COLORS.DELIVERED} onClick={handleBarClick} style={{cursor: 'pointer'}} />
                    <Bar yAxisId="left" dataKey="falta" name="Falta" barSize={30} stackId="a" fill={CHART_COLORS.PENDING} stroke={CHART_COLORS.PENDING_BORDER} onClick={handleBarClick} style={{cursor: 'pointer'}}>
                        <Label
                            content={(props: any) => {
                                const { x, y, width, value, payload } = props;
                                if (!payload) return null;
                                const total = Number(payload.entregada) + Number(payload.falta);
                                const percent = total > 0 ? (Number(payload.falta) / total) * 100 : 0;
                                if (percent < 5) return null;
                                return <text x={Number(x) + Number(width) / 2} y={Number(y) - 5} fill="var(--text-secondary)" textAnchor="middle" fontSize={10}>{`${percent.toFixed(0)}%`}</text>;
                            }}
                        />
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.REVENUE_LINE} strokeWidth={2} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

const CustomTooltipClientPerformance = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const total = Number(data.entregada) + Number(data.falta);
        const avgPrice = data.entregada > 0 ? data.revenue / data.entregada : 0;
        return (
            <div className="bg-[var(--component-bg)] p-4 rounded-lg shadow-lg border border-[var(--border-color)] text-sm">
                <p className="font-bold text-[var(--text-accent)] mb-2">{data.name}</p>
                <p><span style={{color: CHART_COLORS.DELIVERED}}>■</span> Entregada: {data.entregada.toLocaleString()}</p>
                <p><span style={{color: CHART_COLORS.PENDING}}>■</span> Falta: {data.falta.toLocaleString()}</p>
                <p className="border-t border-[var(--border-color)] mt-1 pt-1">Total: {total.toLocaleString()}</p>
                <p>Fulfillment Rate: {data.fulfillmentRate.toLocaleString(undefined, {style: 'percent', minimumFractionDigits: 1})}</p>
                <p>Avg. Price: {avgPrice.toLocaleString('de-DE', {style: 'currency', currency: 'EUR'})}</p>
                <p className="font-bold mt-1"><span style={{color: CHART_COLORS.REVENUE_LINE}}>●</span> Revenue: {data.revenue.toLocaleString('de-DE', {style: 'currency', currency: 'EUR'})}</p>
            </div>
        );
    }
    return null;
};

const DeliveryTimeline = ({ data, timeUnit, setTimeUnit }: {data: { filteredEntries: Entry[], filteredDeliveries: Delivery[] }, timeUnit: string, setTimeUnit: (unit: string) => void}) => {
    const { filteredEntries, filteredDeliveries } = data;
    
    const getPeriodKey = (date: Date, unit: string) => {
        const d = new Date(date);
        if (unit === 'Day') return d.toISOString().split('T')[0];
        if (unit === 'Month') return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        // Week
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        const weekNo = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
    };

    const timelineData = useMemo(() => {
        const periodMap = new Map<string, {recibida: number, entregada: number}>();
        
        filteredEntries.forEach((entry: Entry) => {
            const key = getPeriodKey(new Date(entry.date), timeUnit);
            const period = periodMap.get(key) || { recibida: 0, entregada: 0 };
            period.recibida += entry.items.reduce((sum, item) => sum + Object.values(item.sizeQuantities).reduce((a, b) => a + b, 0), 0);
            periodMap.set(key, period);
        });

        filteredDeliveries.forEach((delivery: Delivery) => {
            const key = getPeriodKey(new Date(delivery.deliveryDate), timeUnit);
            const period = periodMap.get(key) || { recibida: 0, entregada: 0 };
            period.entregada += delivery.items.reduce((sum, item) => sum + Object.values(item.sizeQuantities).reduce((a, b) => a + b, 0), 0);
            periodMap.set(key, period);
        });

        return Array.from(periodMap.entries())
            .map(([period, data]) => ({
                period,
                ...data,
                falta: data.recibida - data.entregada,
                fulfillmentRate: data.recibida > 0 ? data.entregada / data.recibida : 0,
            }))
            .sort((a,b) => a.period.localeCompare(b.period));

    }, [filteredEntries, filteredDeliveries, timeUnit]);
    
    return (
        <div className="bg-[var(--component-bg)] p-4 md:p-6 rounded-2xl shadow-lg" style={{borderRadius: '16px'}}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-accent)]">Delivery Progress Timeline</h3>
                <div className="flex space-x-1 bg-[var(--charcoal-dark)] p-1 rounded-md">
                    {(['Day', 'Week', 'Month']).map(unit => (
                        <button key={unit} onClick={() => setTimeUnit(unit)} className={`px-2 py-1 text-xs rounded ${timeUnit === unit ? 'bg-[var(--rose-gold-base)] text-white' : 'text-[var(--text-secondary)]'}`}>{unit}</button>
                    ))}
                </div>
            </div>
             <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis yAxisId="left" orientation="left" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                    <YAxis yAxisId="right" orientation="right" stroke={CHART_COLORS.FULFILLMENT_LINE} tickFormatter={(v) => `${(Number(v)*100).toFixed(0)}%`} domain={[0, 1]} tick={{ fill: CHART_COLORS.FULFILLMENT_LINE }} />
                    <Tooltip content={<CustomTooltipTimeline />} />
                    <Legend wrapperStyle={{color: 'var(--text-secondary)'}} />
                    <ReferenceLine yAxisId="right" y={0.95} label={{value: '95% Target', position: 'insideTopRight', fill: CHART_COLORS.GOAL_LINE}} stroke={CHART_COLORS.GOAL_LINE} strokeDasharray="3 3" />
                    <Area yAxisId="left" type="monotone" dataKey="recibida" name="Recibida" fill={CHART_COLORS.RECEIVED} stroke={CHART_COLORS.RECEIVED} fillOpacity={0.6}/>
                    <Area yAxisId="left" type="monotone" dataKey="entregada" name="Entregada" fill={CHART_COLORS.DELIVERED} stroke={CHART_COLORS.DELIVERED} />
                    <Line yAxisId="right" type="monotone" dataKey="fulfillmentRate" name="Fulfillment %" stroke={CHART_COLORS.FULFILLMENT_LINE} dot={false} strokeWidth={2}/>
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

const CustomTooltipTimeline = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-[var(--component-bg)] p-4 rounded-lg shadow-lg border border-[var(--border-color)] text-sm">
                <p className="font-bold text-[var(--text-accent)] mb-2">{label}</p>
                <p><span style={{color: CHART_COLORS.RECEIVED}}>■</span> Recibida: {data.recibida.toLocaleString()}</p>
                <p><span style={{color: CHART_COLORS.DELIVERED}}>■</span> Entregada: {data.entregada.toLocaleString()}</p>
                <p>Falta: {data.falta.toLocaleString()}</p>
                <p className="font-bold mt-1"><span style={{color: CHART_COLORS.FULFILLMENT_LINE}}>●</span> Fulfillment Rate: {data.fulfillmentRate.toLocaleString(undefined, {style: 'percent', minimumFractionDigits: 1})}</p>
            </div>
        );
    }
    return null;
};

const BottleneckHeatmap = ({ data, mode, setMode, setModalInfo }: {data: { filteredEntries: Entry[], filteredDeliveries: Delivery[], clients: Client[] }, mode: string, setMode: (mode: string) => void, setModalInfo: (info: { isOpen: boolean, title: string, content: React.ReactNode }) => void}) => {
    const { filteredEntries, filteredDeliveries, clients } = data;

    const heatmapData = useMemo(() => {
        const faltaByItem = new Map<string, number>(); // entryItemId -> faltaQty
        filteredEntries.forEach((entry: Entry) => {
            entry.items.forEach(item => {
                const ordered = Object.values(item.sizeQuantities).reduce((s, q) => s + q, 0);
                faltaByItem.set(item.id, ordered);
            });
        });
        filteredDeliveries.forEach((delivery: Delivery) => {
            delivery.items.forEach((dItem: DeliveryItem) => {
                if(faltaByItem.has(dItem.entryItemId)) {
                    const delivered = Object.values(dItem.sizeQuantities).reduce((s, q) => s + q, 0);
                    faltaByItem.set(dItem.entryItemId, (faltaByItem.get(dItem.entryItemId) || 0) - delivered);
                }
            });
        });

        const rows = SIZES;
        let columns: string[];
        const matrix: {[key: string]: {[key: string]: number}} = {};
        rows.forEach(r => matrix[r] = {});

        if (mode === 'Client') {
            const faltaByClient = new Map();
            filteredEntries.forEach((entry: Entry) => {
                entry.items.forEach(item => {
                    const falta = faltaByItem.get(item.id) || 0;
                    if(falta > 0) {
                        const total = faltaByClient.get(entry.clientId) || 0;
                        faltaByClient.set(entry.clientId, total + falta);
                    }
                });
            });

            const topClients = Array.from(faltaByClient.entries()).sort((a,b) => b[1] - a[1]).slice(0, 8);
            const topClientIds = new Set(topClients.map(c => c[0]));
            columns = [...topClients.map(c => clients.find(cl => cl.id === c[0])?.name || 'Unknown'), 'Others'];
            
            columns.forEach(c => rows.forEach(r => matrix[r][c] = 0));

            filteredEntries.forEach((entry: Entry) => {
                entry.items.forEach(item => {
                    const falta = faltaByItem.get(item.id) || 0;
                    if (falta > 0) {
                        const colName = topClientIds.has(entry.clientId) ? (clients.find(c => c.id === entry.clientId)?.name || 'Unknown') : 'Others';
                        Object.entries(item.sizeQuantities).forEach(([size, orderedQty]) => {
                           const deliveredQty = filteredDeliveries.flatMap((d: Delivery) => d.items).filter(dI => dI.entryItemId === item.id).reduce((s: number, dI: DeliveryItem) => s + (dI.sizeQuantities[size] || 0), 0);
                           const faltaQty = Number(orderedQty) - deliveredQty;
                           if (faltaQty > 0 && matrix[size]) matrix[size][colName] = (matrix[size][colName] || 0) + faltaQty;
                        });
                    }
                });
            });
        } else { // Mode is Month
            const months = new Set<string>();
            filteredEntries.forEach(e => months.add(new Date(e.date).toISOString().slice(0, 7)));
            columns = Array.from(months).sort();
            columns.forEach(c => rows.forEach(r => matrix[r][c] = 0));

            filteredEntries.forEach((entry: Entry) => {
                const colName = new Date(entry.date).toISOString().slice(0, 7);
                entry.items.forEach(item => {
                    const falta = faltaByItem.get(item.id) || 0;
                     if (falta > 0) {
                        Object.entries(item.sizeQuantities).forEach(([size, orderedQty]) => {
                           const deliveredQty = filteredDeliveries.flatMap((d: Delivery) => d.items).filter(dI => dI.entryItemId === item.id).reduce((s: number, dI: DeliveryItem) => s + (dI.sizeQuantities[size] || 0), 0);
                           const faltaQty = Number(orderedQty) - deliveredQty;
                           if (faltaQty > 0 && matrix[size]) matrix[size][colName] = (matrix[size][colName] || 0) + faltaQty;
                        });
                    }
                })
            });
        }
        
        const allValues = Object.values(matrix).flatMap(row => Object.values(row) as number[]);
        const maxFalta = Math.max(...allValues, 0);

        return { rows, columns, matrix, maxFalta };
    }, [filteredEntries, filteredDeliveries, mode, clients]);

    const getColorForValue = (value: number, max: number) => {
        if (value <= 0 || max <= 0) return 'transparent';
        const intensity = Math.min(value / max, 1);
        if(intensity === 0) return 'transparent';
        const r = Math.floor(250 + (183 - 250) * intensity);
        const g = Math.floor(243 + (110 - 243) * intensity);
        const b = Math.floor(224 + (121 - 224) * intensity);
        return `rgb(${r}, ${g}, ${b})`;
    };

    return (
        <div className="bg-[var(--component-bg)] p-4 md:p-6 rounded-2xl shadow-lg" style={{borderRadius: '16px'}}>
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-accent)]">Bottlenecks by Size</h3>
                <div className="flex space-x-1 bg-[var(--charcoal-dark)] p-1 rounded-md">
                    {(['Client', 'Month']).map(m => (
                        <button key={m} onClick={() => setMode(m)} className={`px-2 py-1 text-xs rounded ${mode === m ? 'bg-[var(--rose-gold-base)] text-white' : 'text-[var(--text-secondary)]'}`}>{m}</button>
                    ))}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="p-2 border border-[var(--border-color)] text-[var(--text-accent)] text-sm">Size</th>
                            {heatmapData.columns.map(col => <th key={col} className="p-2 border border-[var(--border-color)] text-[var(--text-accent)] text-sm">{col}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {heatmapData.rows.map(row => (
                            <tr key={row}>
                                <td className="p-2 border border-[var(--border-color)] font-bold text-center text-xs">{row}</td>
                                {heatmapData.columns.map(col => {
                                    const value = heatmapData.matrix[row]?.[col] || 0;
                                    return (
                                        <td key={col} className="p-2 border border-[var(--border-color)] text-center text-sm font-semibold" style={{ backgroundColor: getColorForValue(value, heatmapData.maxFalta), color: value > heatmapData.maxFalta * 0.6 ? 'white' : 'var(--text-primary)'}}>
                                           {value > 0 ? value.toLocaleString() : '-'}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


export default Dashboard;