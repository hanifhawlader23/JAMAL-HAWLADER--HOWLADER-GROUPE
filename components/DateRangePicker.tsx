
import React, { useState, useEffect, useRef } from 'react';

interface DateRangePickerProps {
    onDateChange: (range: { label: string; start: Date | null; end: Date | null }) => void;
    selectedRangeLabel: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ onDateChange, selectedRangeLabel }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const wrapperRef = useRef<HTMLDivElement>(null);

    const ranges = {
        'Today': () => { const today = new Date(); today.setHours(0,0,0,0); return { start: today, end: new Date() }},
        'Yesterday': () => { const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(0,0,0,0); const e = new Date(y); e.setHours(23,59,59,999); return { start: y, end: e } },
        'Last 3 Days': () => { const s = new Date(); s.setDate(s.getDate() - 2); s.setHours(0,0,0,0); return { start: s, end: new Date() } },
        'Last 7 Days': () => { const s = new Date(); s.setDate(s.getDate() - 6); s.setHours(0,0,0,0); return { start: s, end: new Date() } },
        'Last 15 Days': () => { const s = new Date(); s.setDate(s.getDate() - 14); s.setHours(0,0,0,0); return { start: s, end: new Date() } },
        'Last Month': () => { const s = new Date(); s.setMonth(s.getMonth() - 1); s.setHours(0,0,0,0); return { start: s, end: new Date() } },
    };

    const handleSelectRange = (label: string, rangeFn: () => {start: Date, end: Date}) => {
        onDateChange({ label, ...rangeFn() });
        setIsOpen(false);
    };

    const handleCustomRangeApply = () => {
        if (customRange.start && customRange.end) {
            const start = new Date(customRange.start);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customRange.end);
            end.setHours(23, 59, 59, 999);
            onDateChange({ label: 'Custom', start, end });
            setIsOpen(false);
        }
    };
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);


    return (
        <div className="relative" ref={wrapperRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="btn-3d primary sm w-full md:w-auto flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 {selectedRangeLabel}
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-[var(--component-bg)] border border-[var(--border-color)] rounded-lg shadow-2xl p-4 z-10">
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => {
                                onDateChange({ label: 'All Time', start: null, end: null });
                                setIsOpen(false);
                            }}
                            className="w-full p-2 text-sm rounded-md hover:bg-[var(--rose-gold-base)] hover:text-[var(--text-inverse)] bg-[var(--charcoal-dark)] text-center font-semibold"
                        >
                            All Time
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(ranges).map(([label, fn]) => (
                                <button key={label} onClick={() => handleSelectRange(label, fn)} className="text-left w-full p-2 text-sm rounded-md hover:bg-[var(--rose-gold-base)] hover:text-[var(--text-inverse)]">
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="border-t border-[var(--border-color)] my-3"></div>
                    <p className="text-sm font-semibold mb-2 text-[var(--text-accent)]">Custom Range</p>
                    <div className="space-y-2">
                         <input type="date" value={customRange.start} onChange={e => setCustomRange(p => ({...p, start: e.target.value}))} className="w-full" />
                         <input type="date" value={customRange.end} onChange={e => setCustomRange(p => ({...p, end: e.target.value}))} className="w-full" />
                    </div>
                    <button onClick={handleCustomRangeApply} className="w-full mt-3 btn-3d success sm">Apply</button>
                </div>
            )}
        </div>
    )
}

export default DateRangePicker;
