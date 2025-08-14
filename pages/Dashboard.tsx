

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, ComposedChart, Area, ReferenceLine, Label } from 'recharts';
import DashboardCard from '../components/DashboardCard';
import { useData } from '../hooks/useData';
import { EntryStatus, Role, EntryItem, DeliveryItem, Product, Entry, Delivery, Client } from '../types';
import { COLORS, SIZES } from '../constants';
import { useAuth } from '../hooks/useAuth.tsx';
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

        return relevantEntries.reduce((total, entry: Entry) => {
            const entryTotal = entry.items.reduce((entrySum, item: EntryItem) => {
                const product = products.find(p => p.id === item.productId);
                const price = product ? Number(product.price) : 0;
                const itemQty = Object.values(item.sizeQuantities).reduce((qSum: number, q: unknown) => qSum + (Number(q) || 0), 0);
                return entrySum + (itemQty * price);
            }, 0);
            return total + entryTotal;
        }, 0);
    }, [entries, products, clientFilter, dateRange]);


    const getTotalUnits = (items: (EntryItem | DeliveryItem)[]): number => items.reduce((sum, item) => sum + Object.values(item.sizeQuantities).reduce((qSum: number, q: unknown) => qSum + (Number(q) || 0), 0), 0);

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
            .reduce((sum, item: DeliveryItem) => sum + Object.values(item.sizeQuantities).reduce((qSum: number, q: unknown) => qSum + (Number(q) || 0), 0), 0);
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
                                    <Cell key={`cell-${index}`} fill={STATUS_PIE_COLORS[entry.name as EntryStatus]} />
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
                    data={{...filteredData, clients, products}}
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
            if(client) client.recibida += entry.items.reduce((sum, item: EntryItem) => sum + Object.values(item.sizeQuantities).reduce((a: number, b: unknown) => a + (Number(b) || 0), 0), 0);
        });

        filteredDeliveries.forEach(delivery => {
            const entry = data.filteredEntries.find(e => e.code === delivery.entryCode);
            if (!entry) return;
            const client = clientMap.get(entry.clientId);
            if(!client) return;

            delivery.items.forEach((dItem: DeliveryItem) => {
                const qty = Object.values(dItem.sizeQuantities).reduce((a: number, b: unknown) => a + (Number(b) || 0), 0);
                const entryItem = entry.items.find(i => i.id === dItem.entryItemId);
                const product = products.find(p => p.id === entryItem?.productId);
                client.entregada += qty;
                client.revenue += qty * (Number(product?.price) || 0);
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
                                return (
                                    <text x={x + width / 2} y={y} fill="var(--text-secondary)" textAnchor="middle" dy={-4} fontSize={10}>
                                        {`${percent.toFixed(0)}%`}
                                    </text>
                                );
                            }}
                        />
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.REVENUE_LINE} strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

const CustomTooltipClientPerformance = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[var(--component-bg)] p-4 rounded-lg shadow-lg border border-[var(--border-color)] text-sm">
        <p className="font-bold text-[var(--text-accent)] mb-2">{label}</p>
        {payload.map((pld: any) => (
          <p key={pld.dataKey} style={{ color: pld.color }}>
            {pld.name}: {pld.dataKey === 'revenue' 
                ? pld.value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) 
                : pld.value.toLocaleString('en-US')}
          </p>
        ))}
        <p className="mt-1 pt-1 border-t border-[var(--border-color)]">Fulfillment: {(data.fulfillmentRate * 100).toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

const DeliveryTimeline = ({ data, timeUnit, setTimeUnit }: { data: { filteredEntries: Entry[], filteredDeliveries: Delivery[] }, timeUnit: string, setTimeUnit: (unit: string) => void }) => {
    const timelineData = useMemo(() => {
        const dateMap = new Map<string, { received: number, delivered: number }>();
        const { filteredEntries, filteredDeliveries } = data;

        const getUnitKey = (date: Date) => {
            if (timeUnit === 'Day') return date.toISOString().split('T')[0];
            if (timeUnit === 'Week') {
                const firstDay = new Date(date.setDate(date.getDate() - date.getDay()));
                return firstDay.toISOString().split('T')[0];
            }
            // Default to month
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        };

        filteredEntries.forEach(entry => {
            const key = getUnitKey(new Date(entry.date));
            const existing = dateMap.get(key) || { received: 0, delivered: 0 };
            existing.received += entry.items.reduce((sum, item) => sum + Object.values(item.sizeQuantities).reduce((a: number, b: unknown) => a + (Number(b) || 0), 0), 0);
            dateMap.set(key, existing);
        });

        filteredDeliveries.forEach(delivery => {
            const key = getUnitKey(new Date(delivery.deliveryDate));
            const existing = dateMap.get(key) || { received: 0, delivered: 0 };
            existing.delivered += delivery.items.reduce((sum, item) => sum + Object.values(item.sizeQuantities).reduce((a: number, b: unknown) => a + (Number(b) || 0), 0), 0);
            dateMap.set(key, existing);
        });
        
        return Array.from(dateMap.entries())
            .map(([date, values]) => ({ date, ...values }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data, timeUnit]);
    
     const goal = useMemo(() => {
        if (timelineData.length === 0) return 0;
        const totalReceived = timelineData.reduce((sum, d) => sum + d.received, 0);
        return totalReceived / timelineData.length;
    }, [timelineData]);

    return (
         <div className="bg-[var(--component-bg)] p-4 md:p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-accent)]">Delivery vs. Received Timeline</h3>
                <div className="flex gap-1 bg-[var(--charcoal-dark)] p-1 rounded-lg">
                    {['Day', 'Week', 'Month'].map(unit => (
                        <button 
                            key={unit} 
                            onClick={() => setTimeUnit(unit)}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${timeUnit === unit ? 'bg-[var(--rose-gold-base)] text-white' : 'text-[var(--text-secondary)] hover:bg-gray-700'}`}
                        >
                            {unit}
                        </button>
                    ))}
                </div>
            </div>
             <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)' }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}/>
                    <YAxis tick={{ fill: 'var(--text-secondary)' }}/>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--component-bg)', border: '1px solid var(--border-color)'}}/>
                    <Legend wrapperStyle={{color: 'var(--text-secondary)'}} />
                    <Area type="monotone" dataKey="received" name="Received" fill={CHART_COLORS.RECEIVED} stroke={CHART_COLORS.RECEIVED} fillOpacity={0.3}/>
                    <Bar dataKey="delivered" name="Delivered" barSize={20} fill={CHART_COLORS.DELIVERED} />
                    <Line type="monotone" dataKey="delivered" name="Trend" stroke={CHART_COLORS.FULFILLMENT_LINE} strokeWidth={2} dot={false}/>
                    <ReferenceLine y={goal} label={{ value: 'Avg Received', position: 'insideTopLeft', fill: CHART_COLORS.GOAL_LINE, fontSize: 10 }} stroke={CHART_COLORS.GOAL_LINE} strokeDasharray="3 3" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    )
}

const BottleneckHeatmap = ({ data, mode, setMode, setModalInfo }: { data: { filteredEntries: Entry[], filteredDeliveries: Delivery[], clients: Client[], products: Product[] }, mode: string, setMode: (mode: string) => void, setModalInfo: (info: any) => void }) => {
    const { filteredEntries, filteredDeliveries, clients, products } = data;
    const heatmapData = useMemo(() => {
        const itemMap = new Map<string, { name: string, pending: number, entryCount: number }>();

        const getKey = (item: EntryItem, entry: Entry) => {
            if (mode === 'Client') return entry.clientId;
            if (mode === 'Product') {
                const product = products.find(p => p.id === item.productId);
                return product ? product.modelName : "Unknown Product";
            }
            return 'N/A';
        };
        const getName = (key: string) => {
             if (mode === 'Client') return clients.find(c => c.id === key)?.name || "Unknown Client";
             if (mode === 'Product') return key;
             return 'N/A';
        }

        filteredEntries.forEach(entry => {
            entry.items.forEach(item => {
                const key = getKey(item, entry);
                if (!key) return;

                const deliveredQty = filteredDeliveries
                    .filter(d => d.entryCode === entry.code)
                    .flatMap(d => d.items)
                    .filter(dItem => dItem.entryItemId === item.id)
                    .reduce((sum, dItem) => sum + Object.values(dItem.sizeQuantities).reduce((a: number, b: unknown) => a + (Number(b) || 0), 0), 0);
                
                const orderedQty = Object.values(item.sizeQuantities).reduce((a: number, b: unknown) => a + (Number(b) || 0), 0);
                const pendingQty = orderedQty - deliveredQty;

                if (pendingQty > 0) {
                    const existing = itemMap.get(key) || { name: getName(key), pending: 0, entryCount: 0 };
                    existing.pending += pendingQty;
                    // This is slightly flawed as it increments per item not entry, but gives a sense of activity.
                    existing.entryCount++; 
                    itemMap.set(key, existing);
                }
            });
        });
        
        return Array.from(itemMap.values()).filter(d => d.pending > 0).sort((a,b) => b.pending - a.pending);
    }, [data, mode]);

    const maxPending = useMemo(() => Math.max(...heatmapData.map(d => d.pending), 0), [heatmapData]);

    const getColor = (value) => {
        const ratio = maxPending > 0 ? value / maxPending : 0;
        // Simple linear interpolation from low to high color
        const r = Math.floor(250 + ratio * (183 - 250)); // FAF3F0 -> B76E79
        const g = Math.floor(243 + ratio * (110 - 243));
        const b = Math.floor(240 + ratio * (121 - 240));
        return `rgb(${r}, ${g}, ${b})`;
    }

    const handleClick = (item: any) => {
        setModalInfo({
            isOpen: true,
            title: `Pending Items for ${item.name}`,
            content: <div className="text-sm">Drill-down for this heatmap item is not yet implemented.</div>
        })
    }

    return (
         <div className="bg-[var(--component-bg)] p-4 md:p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-accent)]">Pending Item Bottlenecks</h3>
                 <div className="flex gap-1 bg-[var(--charcoal-dark)] p-1 rounded-lg">
                    {['Client', 'Product'].map(m => (
                        <button 
                            key={m} 
                            onClick={() => setMode(m)}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${mode === m ? 'bg-[var(--rose-gold-base)] text-white' : 'text-[var(--text-secondary)] hover:bg-gray-700'}`}
                        >
                            By {m}
                        </button>
                    ))}
                </div>
            </div>
            {heatmapData.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                    {heatmapData.map(item => (
                        <div 
                            key={item.name} 
                            onClick={() => handleClick(item)}
                            className="p-4 rounded-lg shadow-md transition-transform hover:scale-105 cursor-pointer border border-transparent hover:border-[var(--rose-gold-base)]"
                            style={{ backgroundColor: getColor(item.pending) }}
                        >
                            <p className="font-bold text-black">{item.name}</p>
                            <p className="text-sm text-black/70">{item.pending.toLocaleString()} units pending</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-[var(--text-secondary)] py-8">No pending items found for the current filter.</p>
            )}
        </div>
    )
}

export default Dashboard;