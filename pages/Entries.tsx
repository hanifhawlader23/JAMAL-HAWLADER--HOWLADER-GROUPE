

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { Entry, EntryItem, EntryStatus, Role, User, Delivery } from '../types';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import { generateId, formatDate, getColorForName } from '../lib/helpers';
import { STATUS_STYLES, SIZES, SPECIAL_CLIENT_NAME } from '../constants';
import { useAuth } from '../hooks/useAuth';

const STATUS_GROUPS_TO_DISPLAY = [EntryStatus.RECEIVED, EntryStatus.IN_PROCESS, EntryStatus.DELIVERED, EntryStatus.PRE_INVOICED];

const getDeliveredQuantity = (entry, allDeliveries) => {
    if (!entry || !allDeliveries) return 0;
    return allDeliveries
        .filter(d => d.entryCode === entry.code)
        .flatMap(d => d.items)
        .reduce((sum, item) => sum + Object.values(item.sizeQuantities).reduce((qSum: number, q: number) => qSum + (q || 0), 0), 0);
};

const getLastDelivery = (entry, allDeliveries) => {
    if (!entry || !allDeliveries) return undefined;
    const entryDeliveries = allDeliveries
        .filter(d => d.entryCode === entry.code)
        .sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime());
    return entryDeliveries[0];
};

const Entries = () => {
    const { entries, deleteEntry, clients, products, deliveries } = useData();
    const { hasRole } = useAuth();
    const [isEntryModalOpen, setEntryModalOpen] = useState(false);
    const [isDeliveryModalOpen, setDeliveryModalOpen] = useState(false);
    const [detailsEntry, setDetailsEntry] = useState<Entry | null>(null);
    const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
    const [deliveryTargetEntry, setDeliveryTargetEntry] = useState<Entry | null>(null);
    const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, idToDelete: '' });
    
    const { statusFilter } = useParams<{ statusFilter: string }>();
    const isAdmin = useMemo(() => hasRole([Role.ADMIN]), [hasRole]);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const entryIdToOpen = (location.state as any)?.openEntryId;
        if (entryIdToOpen) {
            const entryToView = entries.find(e => e.id === entryIdToOpen);
            if (entryToView) {
                setDetailsEntry(entryToView);
                // Clear state to prevent re-opening on refresh/navigation
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, entries, navigate, location.pathname]);

    const filteredEntries = useMemo(() => {
        if (!statusFilter) return entries;
        
        switch (statusFilter) {
            case 'pending':
                return entries.filter(e => e.status === EntryStatus.RECEIVED || e.status === EntryStatus.IN_PROCESS);
            case 'delivered':
                return entries.filter(e => e.status === EntryStatus.DELIVERED);
            case 'pre-invoiced':
                return entries.filter(e => e.status === EntryStatus.PRE_INVOICED);
            default:
                return entries;
        }
    }, [entries, statusFilter]);

    const groupedEntries = useMemo(() => {
        const groups: { [key: string]: Entry[] } = {};
        filteredEntries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(entry => {
            if (!groups[entry.status]) {
                groups[entry.status] = [];
            }
            groups[entry.status].push(entry);
        });
        return groups;
    }, [filteredEntries]);

    const handleOpenNewEntryModal = () => {
        setEditingEntry(null);
        setEntryModalOpen(true);
    };

    const handleOpenEditEntryModal = (entry) => {
        setEditingEntry(entry);
        setEntryModalOpen(true);
    };
    
    const handleOpenDeliveryModal = (entry) => {
        setDeliveryTargetEntry(entry);
        setDeliveryModalOpen(true);
    };

    const handleDeleteClick = (id) => {
        setConfirmModalState({ isOpen: true, idToDelete: id });
    };

    const handleConfirmDelete = () => {
        deleteEntry(confirmModalState.idToDelete);
        setConfirmModalState({ isOpen: false, idToDelete: '' });
    };
    
    const getClientName = (clientId) => clients.find(c => c.id === clientId)?.name || 'N/A';
    const getTotalQuantity = (items: EntryItem[]) => items.reduce((sum, item) => sum + Object.values(item.sizeQuantities).reduce((qSum: number, q: number) => qSum + (q || 0), 0), 0);
    
    const getTotalPrice = (items: EntryItem[]) => {
      return items.reduce((sum, item) => {
          const product = products.find(p => p.id === item.productId);
          const price = product ? product.price : 0;
          const itemQty = Object.values(item.sizeQuantities).reduce((qSum: number, q: number) => qSum + (q || 0), 0);
          return sum + (itemQty * price);
      }, 0);
    };


    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <button
                    onClick={handleOpenNewEntryModal}
                    className="btn-3d primary"
                >
                    + Add New Entry
                </button>
            </div>

            {statusFilter && Object.keys(groupedEntries).length === 0 && (
                <div className="text-center py-10 bg-[var(--component-bg)] rounded-lg shadow-lg">
                    <p className="text-lg text-[var(--text-primary)]">No entries found for this status.</p>
                </div>
            )}
            
            {(statusFilter ? Object.keys(groupedEntries) : STATUS_GROUPS_TO_DISPLAY).map(status => {
                const groupEntries = groupedEntries[status];
                if (!groupEntries || groupEntries.length === 0) {
                    if (statusFilter) return null;
                    if (!Object.values(groupedEntries).flat().some(e => e.status === status)) return null;
                }

                const isProcessGroup = status === EntryStatus.IN_PROCESS;
                const hasAnyPendingInGroup = isProcessGroup && groupEntries && groupEntries.some(entry => {
                    const total = getTotalQuantity(entry.items);
                    const delivered = getDeliveredQuantity(entry, deliveries);
                    return total - delivered > 0;
                });
                
                let colSpan = 8;
                if (isAdmin) colSpan += 2;
                if (isProcessGroup) {
                    colSpan += 1; // Entregada column
                    if (hasAnyPendingInGroup) colSpan += 1; // Falta column
                }

                return (
                <div key={status}>
                    <h2 className="text-2xl font-bold text-center mb-4" style={{ color: STATUS_STYLES[status]?.background }}>{status}</h2>
                    <div className="bg-[var(--component-bg)] shadow-lg rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-[var(--border-color)]">
                                <thead className="bg-[var(--border-color)]/50">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-[var(--rose-gold-base)] uppercase tracking-wider">Code</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-[var(--rose-gold-base)] uppercase tracking-wider hidden md:table-cell">Date</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-[var(--rose-gold-base)] uppercase tracking-wider hidden lg:table-cell">Client</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-[var(--rose-gold-base)] uppercase tracking-wider">Description</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-[var(--rose-gold-base)] uppercase tracking-wider">Qty</th>
                                        {isProcessGroup && <>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider hidden md:table-cell">Entregada</th>
                                            {hasAnyPendingInGroup && <th className="px-3 py-3 text-left text-xs font-medium text-red-400 uppercase tracking-wider hidden md:table-cell">Falta</th>}
                                        </>}
                                        {isAdmin && <th className="px-3 py-3 text-left text-xs font-medium text-[var(--rose-gold-base)] uppercase tracking-wider hidden lg:table-cell">Avg. Price</th>}
                                        {isAdmin && <th className="px-3 py-3 text-left text-xs font-medium text-[var(--rose-gold-base)] uppercase tracking-wider hidden lg:table-cell">Total</th>}
                                        <th className="px-3 py-3 text-left text-xs font-medium text-[var(--rose-gold-base)] uppercase tracking-wider">Input By</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-[var(--rose-gold-base)] uppercase tracking-wider hidden lg:table-cell">Output By</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-[var(--rose-gold-base)] uppercase tracking-wider hidden md:table-cell">Status</th>
                                        <th className="px-3 py-3 text-right text-xs font-medium text-[var(--rose-gold-base)] uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-[var(--component-bg)] divide-y divide-[var(--border-color)]">
                                    {groupEntries && groupEntries.length > 0 ? groupEntries.map(entry => {
                                        const totalQuantity = getTotalQuantity(entry.items);
                                        const totalPrice = getTotalPrice(entry.items);
                                        const avgPrice = totalQuantity > 0 ? totalPrice / totalQuantity : 0;
                                        const canUserEditStatus = hasRole([Role.ADMIN, Role.MANAGER, Role.USER]);
                                        
                                        const deliveredQuantity = getDeliveredQuantity(entry, deliveries);
                                        const pendingQuantity = totalQuantity - deliveredQuantity;
                                        const lastDelivery = getLastDelivery(entry, deliveries);
                                        const isDeliveryDisabled = (entry.status === EntryStatus.DELIVERED && pendingQuantity <= 0) || !!entry.invoiceId;

                                        return (
                                            <tr key={entry.id} onClick={() => setDetailsEntry(entry)} className="cursor-pointer hover:bg-[var(--metallic-rose)]/20 transition-colors">
                                                <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm font-medium"><span className="entry-code-highlight">{entry.code}</span></td>
                                                <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm text-[var(--text-primary)] hidden md:table-cell">{formatDate(entry.date)}</td>
                                                <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm hidden lg:table-cell">
                                                    <span className="colorful-name" style={{ backgroundColor: getColorForName(getClientName(entry.clientId))}}>
                                                        {getClientName(entry.clientId)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm text-[var(--text-primary)] max-w-xs truncate">{entry.items.map(i => i.description).join(', ')}</td>
                                                <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm text-[var(--text-primary)] entry-code-highlight">{totalQuantity.toLocaleString('en-US')}</td>
                                                {isProcessGroup && <>
                                                    <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm text-green-400 font-bold hidden md:table-cell">{deliveredQuantity.toLocaleString('en-US')}</td>
                                                    {hasAnyPendingInGroup && <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm text-red-400 font-bold hidden md:table-cell">{pendingQuantity > 0 ? pendingQuantity.toLocaleString('en-US') : '-'}</td>}
                                                </>}
                                                {isAdmin && <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm text-[var(--text-primary)] hidden lg:table-cell">{avgPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>}
                                                {isAdmin && <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm text-[var(--text-primary)] font-semibold hidden lg:table-cell">{totalPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>}
                                                <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm">
                                                    <span className="colorful-name" style={{ backgroundColor: getColorForName(entry.whoInput)}}>
                                                        {entry.whoInput}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm hidden lg:table-cell">
                                                    {lastDelivery ? (
                                                        <span className="colorful-name" style={{ backgroundColor: getColorForName(lastDelivery.whoDelivered)}}>
                                                            {lastDelivery.whoDelivered}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap text-xs sm:text-sm hidden md:table-cell">
                                                    <button onClick={(e) => { e.stopPropagation(); if (canUserEditStatus) handleOpenEditEntryModal(entry); }} className={`w-full text-left appearance-none ${canUserEditStatus ? '' : 'pointer-events-none'}`}>
                                                        <span 
                                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${canUserEditStatus ? 'hover:ring-2 hover:ring-offset-2 hover:ring-offset-[var(--component-bg)]' : ''}`}
                                                            style={{
                                                                backgroundColor: STATUS_STYLES[entry.status].background,
                                                                color: STATUS_STYLES[entry.status].color,
                                                                transition: 'all 0.2s',
                                                                '--tw-ring-color': STATUS_STYLES[entry.status].background,
                                                            } as React.CSSProperties}
                                                        >
                                                            {entry.status}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div onClick={e => e.stopPropagation()} className="flex items-center justify-end space-x-2">
                                                        <button onClick={() => handleOpenDeliveryModal(entry)} className="btn-3d sm success" disabled={isDeliveryDisabled}>Delivery</button>
                                                        <button onClick={() => handleOpenEditEntryModal(entry)} className="btn-3d sm secondary">Edit</button>
                                                        <button onClick={() => handleDeleteClick(entry.id)} className="btn-3d sm danger">Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    }) : (
                                        <tr>
                                            <td colSpan={colSpan} className="text-center py-5 text-[var(--text-secondary)]">No entries found for this status.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                )
            })}

            {isEntryModalOpen && (
                <EntryFormModal 
                    isOpen={isEntryModalOpen} 
                    onClose={() => setEntryModalOpen(false)}
                    entry={editingEntry}
                />
            )}
            
            {isDeliveryModalOpen && deliveryTargetEntry && (
                <DeliveryFormModal
                    isOpen={isDeliveryModalOpen}
                    onClose={() => setDeliveryModalOpen(false)}
                    entry={deliveryTargetEntry}
                />
            )}
            
            {detailsEntry && (
                 <EntryDetailsModal 
                    isOpen={!!detailsEntry} 
                    onClose={() => setDetailsEntry(null)} 
                    entry={detailsEntry} 
                    deliveries={deliveries}
                />
            )}
            
            <ConfirmationModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ isOpen: false, idToDelete: '' })}
                onConfirm={handleConfirmDelete}
                title="Delete Entry"
                message="Are you sure you want to delete this entry? This action cannot be undone."
            />
        </div>
    );
};

// EntryFormModal Component
const EntryFormModal = ({ isOpen, onClose, entry }: { isOpen: boolean, onClose: () => void, entry: Entry | null }) => {
    const { clients, products, entries, addEntry, updateEntry, addProduct } = useData();
    const { currentUser, hasRole } = useAuth();
    const isAdmin = useMemo(() => hasRole([Role.ADMIN]), [hasRole]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingItemIndex, setUploadingItemIndex] = useState<number | null>(null);
    const [cameraState, setCameraState] = useState({ isOpen: false, itemIndex: -1 });
    const suggestionRef = useRef(null);
    
    const [suggestionState, setSuggestionState] = useState({ index: -1, field: 'productRef', suggestions: [], active: false });
    
    const [formData, setFormData] = useState(() => {
        const isEditing = !!entry;
        const maxCode = entries.reduce((max, e) => {
            const codeNum = parseInt(e.code, 10);
            return isNaN(codeNum) ? max : Math.max(max, codeNum);
        }, 0);
        const newCode = (maxCode + 1).toString();

        const defaultItems = [{
            id: generateId(), productId: '', productRef: '', description: '',
            sizeQuantities: {} as {[size: string]: number}, optionalRef1: '', optionalRef2: '', imageUrl: ''
        }];

        const itemsFromEntry = entry?.items.map(it => ({
            ...it,
            productRef: it.productRef || products.find(p => p.id === it.productId)?.reference || '',
            optionalRef1: it.optionalRef1 || '',
            optionalRef2: it.optionalRef2 || '',
            imageUrl: it.imageUrl || '',
        })) || defaultItems;

        return {
            code: entry?.code || newCode,
            date: entry?.date ? entry.date.split('T')[0] : new Date().toISOString().split('T')[0],
            clientId: entry?.clientId || '',
            status: entry?.status || EntryStatus.RECEIVED,
            items: itemsFromEntry,
        };
    });
    
    const clientIsSpecial = useMemo(() => {
        if (!formData.clientId) return false;
        const client = clients.find(c => c.id === formData.clientId);
        return client?.name === SPECIAL_CLIENT_NAME;
    }, [formData.clientId, clients]);

     // Autocomplete Click Outside Handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
                setSuggestionState(prev => ({ ...prev, active: false }));
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        setFormData(currentFormData => {
            let hasChanged = false;
            const updatedItems = currentFormData.items.map(item => {
                if (item.productId) {
                    const product = products.find(p => p.id === item.productId);
                    if (product) { // If product is found, re-sync description
                        if (item.description !== product.description) {
                            hasChanged = true;
                            return { ...item, description: product.description };
                        }
                    }
                }
                return item;
            });

            if (hasChanged) {
                return { ...currentFormData, items: updatedItems };
            }
            return currentFormData;
        });
    }, [products, isOpen]);
    
    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        (newItems[index])[field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const handleAutocompleteChange = (index, field, value) => {
        handleItemChange(index, field, value);

        if (value.length > 0) {
            const lowerCaseValue = value.toLowerCase();
            const filteredProducts = products.filter(p => 
                p.reference.toLowerCase().includes(lowerCaseValue) ||
                p.description.toLowerCase().includes(lowerCaseValue) ||
                p.modelName.toLowerCase().includes(lowerCaseValue)
            );
            setSuggestionState({ index, field, suggestions: filteredProducts, active: true });
        } else {
            setSuggestionState({ ...suggestionState, active: false, suggestions: [] });
        }
    };
    
    const handleSelectSuggestion = (itemIndex, product) => {
        const newItems = [...formData.items];
        const currentItem = newItems[itemIndex];
        currentItem.productId = product.id;
        currentItem.productRef = product.reference;
        currentItem.description = product.description;
        
        if (product.clientId && !formData.clientId) { // Auto-fill client only if not already set
            setFormData(prev => ({...prev, clientId: product.clientId || prev.clientId, items: newItems}));
        } else {
            setFormData(prev => ({ ...prev, items: newItems }));
        }

        setSuggestionState({ ...suggestionState, active: false, suggestions: [] });
    };

    const handleSizeQuantityChange = (itemIndex, size, quantity) => {
        const newItems = [...formData.items];
        const currentItem = newItems[itemIndex];
        const newSizeQuantities = { ...currentItem.sizeQuantities, [size]: quantity };
        if(quantity <= 0) delete newSizeQuantities[size];
        currentItem.sizeQuantities = newSizeQuantities;
        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, {
                id: generateId(), productId: '', productRef: '', description: '',
                sizeQuantities: {} as {[size: string]: number}, optionalRef1: '', optionalRef2: '', imageUrl: ''
            }]
        });
    };

    const removeItem = (index) => {
        setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
    };

    const handleTriggerUpload = (index) => {
        setUploadingItemIndex(index);
        fileInputRef.current?.click();
    };

    const handleImageUpload = (e) => {
        if (uploadingItemIndex === null) return;
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleItemChange(uploadingItemIndex, 'imageUrl', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        setUploadingItemIndex(null);
    };

    const handleTakePicture = (index) => {
        setCameraState({ isOpen: true, itemIndex: index });
    };

    const handleCapture = (imageData) => {
        if (cameraState.itemIndex !== -1) {
            handleItemChange(cameraState.itemIndex, 'imageUrl', imageData);
        }
        setCameraState({ isOpen: false, itemIndex: -1 });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const finalItemsPromises = formData.items.map(async item => {
            if (!item.productRef) {
                throw new Error(`Please provide a Product Reference for item: ${item.description || 'Unnamed Item'}`);
            }
            
            let product = products.find(p => p.reference.toLowerCase() === item.productRef.toLowerCase());
            let finalProductId = product?.id;

            if (!product) {
                const confirmed = await new Promise(resolve => {
                    if(window.confirm(`Product with reference "${item.productRef}" not found. Do you want to create a new product for it?`)) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });

                if (confirmed) {
                    const newProduct = {
                        code: 'N/A', modelName: item.description || "New Product",
                        price: 0, category: 'Uncategorized', reference: item.productRef,
                        description: item.description || item.productRef,
                    };
                    await addProduct(newProduct);
                    
                    // We need to find the product ID after adding it. This is tricky without waiting for the state to update.
                    // For now, we'll alert the user to re-add the entry.
                    // A better solution would involve returning the new product ID from addProduct.
                    alert("New product created. Please re-open the form and select the new product to finalize the entry.");
                    throw new Error("New product created, please re-add entry.");

                } else {
                    throw new Error("Product creation cancelled.");
                }
            }
    
            if (!finalProductId) {
                throw new Error(`Error: Could not determine product ID for reference ${item.productRef}.`);
            }
    
            return {
                ...item,
                productId: finalProductId,
            };
        });
        
        try {
            const finalItems = await Promise.all(finalItemsPromises);
            
            const finalEntryData = {
                ...formData,
                items: finalItems,
                date: new Date(formData.date).toISOString(),
            };
            
            if (entry) {
                await updateEntry(entry.id, finalEntryData);
            } else {
                await addEntry({ ...finalEntryData, whoInput: currentUser.fullName, status: EntryStatus.RECEIVED });
            }
            onClose();

        } catch (error: any) {
            if (error.message.includes("Product creation cancelled") || error.message.includes("please re-add entry")) {
                 alert("Submission cancelled. Please ensure all product references exist or agree to create new ones.");
            } else {
                 alert(`An error occurred: ${error.message}`);
            }
        }
    };
    
    const canUserEditStatus = hasRole([Role.ADMIN, Role.MANAGER, Role.USER]);
    const availableStatuses = useMemo(() => {
        if (!entry) return [formData.status];
        const options = new Set([formData.status, EntryStatus.DELIVERED, EntryStatus.PRE_INVOICED]);
        return Array.from(options);
    }, [entry, formData.status]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={entry ? "Edit Entry" : "Create New Entry"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--rose-gold-base)]">Entry Code</label>
                        <input type="text" name="code" value={formData.code} readOnly className="mt-1 block w-full p-2 rounded-md shadow-sm entry-code-highlight" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--rose-gold-base)]">Date</label>
                        <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="mt-1 block w-full p-2 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--rose-gold-base)]">Client</label>
                        <select name="clientId" value={formData.clientId} onChange={handleInputChange} className="mt-1 block w-full p-2 rounded-md shadow-sm" required>
                            <option value="">Select Client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--rose-gold-base)]">Status</label>
                        <select name="status" value={formData.status} onChange={handleInputChange} className="mt-1 block w-full p-2 rounded-md shadow-sm" disabled={!canUserEditStatus}>
                            {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <h4 className="text-lg font-semibold border-t border-[var(--border-color)] pt-4 mt-4 text-[var(--text-primary)]">Items</h4>
                {formData.items.map((item, index) => {
                    const product = products.find(p => p.id === item.productId);
                    const unitPrice = product?.price || 0;
                    const totalQuantity = Object.values(item.sizeQuantities).reduce((sum: number, q: number) => sum + (q || 0), 0);
                    const totalPrice = totalQuantity * unitPrice;

                    const showSurcharge = clientIsSpecial && totalQuantity > 0 && totalQuantity <= 20;
                    const surchargeAmount = showSurcharge ? totalPrice * 0.10 : 0;
                    const finalPrice = totalPrice + surchargeAmount;

                    return (
                    <div key={item.id} className="p-4 border border-[var(--border-color)] rounded-md space-y-3 bg-black/20 relative">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="relative">
                                <label className="text-xs font-medium text-[var(--rose-gold-base)]">Item Description</label>
                                <input type="text" value={item.description} onChange={e => handleAutocompleteChange(index, 'description', e.target.value)} placeholder="e.g., Polo Shirt Red" className="mt-1 w-full rounded-md shadow-sm p-2" required />
                                {suggestionState.active && suggestionState.index === index && suggestionState.field === 'description' && suggestionState.suggestions.length > 0 && (
                                    <div ref={suggestionRef} className="absolute z-10 w-full bg-gray-900 border border-gray-700 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                        {suggestionState.suggestions.map(p => (
                                            <div key={p.id} onClick={() => handleSelectSuggestion(index, p)} className="p-2 hover:bg-[var(--rose-gold-base)] cursor-pointer text-sm">
                                                <p className="font-bold">{p.reference} - {p.modelName}</p>
                                                <p className="text-xs text-gray-400">{p.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-medium text-[var(--rose-gold-base)]">Image</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <button type="button" onClick={() => handleTriggerUpload(index)} className="btn-3d sm secondary">Upload</button>
                                    <button type="button" onClick={() => handleTakePicture(index)} className="btn-3d sm primary">Camera</button>
                                    {item.imageUrl && (
                                        <>
                                            <img src={item.imageUrl} alt="preview" className="h-10 w-10 object-cover rounded-md border border-[var(--border-color)]"/>
                                            <button type="button" onClick={() => handleItemChange(index, 'imageUrl', '')} className="text-xs text-red-400 hover:underline">Remove</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="relative">
                                <label className="text-xs font-medium text-[var(--rose-gold-base)]">Product Ref (Main)</label>
                                <input type="text" value={item.productRef} onChange={e => handleAutocompleteChange(index, 'productRef', e.target.value)} placeholder="Catalog Ref" className="mt-1 w-full rounded-md shadow-sm p-2" required />
                                 {suggestionState.active && suggestionState.index === index && suggestionState.field === 'productRef' && suggestionState.suggestions.length > 0 && (
                                    <div ref={suggestionRef} className="absolute z-10 w-full bg-gray-900 border border-gray-700 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                        {suggestionState.suggestions.map(p => (
                                            <div key={p.id} onClick={() => handleSelectSuggestion(index, p)} className="p-2 hover:bg-[var(--rose-gold-base)] cursor-pointer text-sm">
                                                <p className="font-bold">{p.reference} - {p.modelName}</p>
                                                <p className="text-xs text-gray-400">{p.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[var(--rose-gold-base)]">Optional Ref 1</label>
                                <input type="text" value={item.optionalRef1} onChange={e => handleItemChange(index, 'optionalRef1', e.target.value)} placeholder="Optional Ref 1" className="mt-1 w-full rounded-md shadow-sm p-2" />
                            </div>
                             <div>
                                <label className="text-xs font-medium text-[var(--rose-gold-base)]">Optional Ref 2</label>
                                <input type="text" value={item.optionalRef2} onChange={e => handleItemChange(index, 'optionalRef2', e.target.value)} placeholder="Optional Ref 2" className="mt-1 w-full rounded-md shadow-sm p-2" />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 pt-2">
                            {SIZES.map(size => (
                                <div key={size}>
                                    <label className="block text-xs font-medium text-center text-[var(--rose-gold-base)]">{size}</label>
                                    <div className="relative mt-1">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={item.sizeQuantities[size] || ''}
                                            onChange={e => handleSizeQuantityChange(index, size, parseInt(e.target.value) || 0)}
                                            className="w-full rounded-md py-1 px-2 text-center"
                                            style={(item.sizeQuantities[size] || 0) > 0 ? {
                                                color: '#FACC15', // a vibrant yellow
                                                fontWeight: 'bold',
                                                transition: 'color 0.3s ease',
                                            } : {
                                                transition: 'color 0.3s ease',
                                            }}
                                        />
                                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col">
                                            <button type="button" onClick={() => handleSizeQuantityChange(index, size, (item.sizeQuantities[size] || 0) + 1)} className="h-3 w-3 flex items-center justify-center text-gray-400 hover:text-white leading-none">▲</button>
                                            <button type="button" onClick={() => handleSizeQuantityChange(index, size, Math.max(0, (item.sizeQuantities[size] || 0) - 1))} className="h-3 w-3 flex items-center justify-center text-gray-400 hover:text-white leading-none">▼</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col items-end space-y-1 mt-2 bg-black/20 p-2 rounded-md">
                            <div className='flex justify-between w-full max-w-xs'>
                                <span className="text-sm">Total Quantity:</span> 
                                <span className="font-bold text-[var(--text-primary)]">{totalQuantity.toLocaleString()}</span>
                            </div>
                            {isAdmin && (
                                <>
                                    <div className='flex justify-between w-full max-w-xs'>
                                        <span className="text-sm">Item Subtotal:</span>
                                        <span className="font-bold text-[var(--text-primary)]">{totalPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                    </div>
                                    {showSurcharge && (
                                         <div className='flex justify-between w-full max-w-xs text-yellow-400'>
                                            <span className="text-sm">Low Qty Surcharge (10%):</span>
                                            <span className="font-bold">{surchargeAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                        </div>
                                    )}
                                    <div className='flex justify-between w-full max-w-xs border-t border-[var(--border-color)] mt-1 pt-1'>
                                        <span className="text-sm font-bold">Item Total:</span>
                                        <span className="font-bold text-[var(--text-primary)]">{finalPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                    </div>
                                </>
                            )}
                        </div>
                         {formData.items.length > 1 && (
                            <button type="button" onClick={() => removeItem(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-400 text-2xl leading-none font-bold">&times;</button>
                        )}
                    </div>
                )})}
                <button type="button" onClick={addItem} className="font-semibold text-[var(--rose-gold-base)] hover:text-white">+ Add Item</button>

                <div className="pt-4 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="btn-3d cancel">Cancel</button>
                    <button type="submit" className="btn-3d success">Save</button>
                </div>
            </form>
            <CameraCaptureModal
                isOpen={cameraState.isOpen}
                onClose={() => setCameraState({ isOpen: false, itemIndex: -1 })}
                onCapture={handleCapture}
            />
        </Modal>
    );
};

// DeliveryFormModal Component
const DeliveryFormModal = ({ isOpen, onClose, entry }: { isOpen: boolean, onClose: () => void, entry: Entry }) => {
    const { deliveries, addDelivery, updateEntry, products, users } = useData();
    const { hasRole } = useAuth();
    const isAdmin = useMemo(() => hasRole([Role.ADMIN]), [hasRole]);
    
    const [deliveryItems, setDeliveryItems] = useState<{[key: string]: {[size: string]: number}}>({});
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [whoDelivered, setWhoDelivered] = useState('');

    const deliveredQuantities = useMemo(() => {
        const quantities = {};
        deliveries
            .filter(d => d.entryCode === entry.code)
            .flatMap(d => d.items)
            .forEach(item => {
                if (!quantities[item.entryItemId]) {
                    quantities[item.entryItemId] = {};
                }
                for (const size in item.sizeQuantities) {
                    if (Object.prototype.hasOwnProperty.call(item.sizeQuantities, size)) {
                        const qVal = item.sizeQuantities[size];
                        const currentVal = quantities[item.entryItemId][size];
                        quantities[item.entryItemId][size] = (currentVal || 0) + qVal;
                    }
                }
            });
        return quantities;
    }, [deliveries, entry.code]);

    const deliveryTotals = useMemo(() => {
        let totalQuantity = 0;
        let totalValue = 0;

        for (const entryItemId in deliveryItems) {
            const sizeQuantities = deliveryItems[entryItemId];
            const entryItem = entry.items.find(it => it.id === entryItemId);
            if (!entryItem) continue;

            const product = products.find(p => p.id === entryItem.productId);
            const price = product?.price || 0;

            const itemQuantity = Object.values(sizeQuantities).reduce((sum: number, q: number) => sum + (q || 0), 0);
            
            totalQuantity += itemQuantity;
            totalValue += itemQuantity * price;
        }

        return { totalQuantity, totalValue };
    }, [deliveryItems, entry.items, products]);

    const handleQuantityChange = (entryItemId, size, value, max) => {
        let quantity = parseInt(value, 10);
        
        if (isNaN(quantity)) {
            // This allows the user to clear the input field
            const newSizeQuantities = { ...(deliveryItems[entryItemId] || {}) };
            delete newSizeQuantities[size];
            setDeliveryItems(prev => ({ ...prev, [entryItemId]: newSizeQuantities }));
            return;
        }

        if (quantity > max) quantity = max;
        if (quantity < 0) quantity = 0;

        setDeliveryItems((prev) => ({
            ...prev,
            [entryItemId]: {
                ...(prev[entryItemId] || {}),
                [size]: quantity,
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!whoDelivered) {
            alert("Please select who is delivering the items.");
            return;
        }

        const newDeliveryItems = entry.items.map(entryItem => {
            const deliverySizes = deliveryItems[entryItem.id];
            if (!deliverySizes || Object.values(deliverySizes).every(q => q === 0)) return null;

            return {
                entryId: entry.id,
                entryItemId: entryItem.id,
                productId: entryItem.productId,
                sizeQuantities: deliverySizes,
            };
        }).filter((item) => item !== null);

        if (newDeliveryItems.length === 0) {
            alert("No quantities were entered for delivery.");
            return;
        }

        const newDelivery = {
            entryCode: entry.code,
            deliveryDate: new Date(deliveryDate).toISOString(),
            whoDelivered: whoDelivered,
            items: newDeliveryItems,
        };

        await addDelivery(newDelivery);

        // AUTOMATIC STATUS UPDATE LOGIC
        // We get the latest deliveries from the context which should be updated by our listener
        const allMyDeliveries = [...deliveries, {id: 'temp', ...newDelivery}];

        const currentEntryDeliveries = allMyDeliveries.filter(d => d.entryCode === entry.code);

        const totalOrdered = entry.items.reduce((sum, item) => sum + Object.values(item.sizeQuantities).reduce((qSum: number, q: number) => qSum + q, 0), 0);
        
        const totalDelivered = currentEntryDeliveries
            .flatMap(d => d.items)
            .reduce((sum, item) => sum + Object.values(item.sizeQuantities).reduce((qSum: number, q: number) => qSum + (q || 0), 0), 0);

        let newStatus = entry.status;
        if (entry.status === EntryStatus.RECEIVED || entry.status === EntryStatus.IN_PROCESS) {
            if (totalDelivered >= totalOrdered) {
                newStatus = EntryStatus.DELIVERED;
            } else if (totalDelivered > 0) {
                newStatus = EntryStatus.IN_PROCESS;
            }
        }

        if (newStatus !== entry.status) {
            await updateEntry(entry.id, { status: newStatus });
        }

        onClose();
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={<>Add Delivery for: <span className="entry-code-highlight">{entry.code}</span></>} footer={<></>}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-[var(--border-color)] rounded-lg">
                    <div>
                        <label className="block text-sm font-medium text-[var(--rose-gold-base)]">Delivery Date</label>
                        <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="mt-1 block w-full p-2 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--rose-gold-base)]">Delivered By</label>
                        <select value={whoDelivered} onChange={e => setWhoDelivered(e.target.value)} className="mt-1 block w-full p-2 rounded-md shadow-sm" required>
                            <option value="" disabled>Select User</option>
                            {users.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                        </select>
                    </div>
                </div>
                {entry.items.map(item => {
                    const product = products.find(p => p.id === item.productId);
                    const deliveredForItem = deliveredQuantities[item.id] || {};
                    const totalOrderedForItem = Object.values(item.sizeQuantities).reduce((sum: number, q: number) => sum + (q || 0), 0);

                    return (
                        <div key={item.id} className="p-4 border border-[var(--border-color)] rounded-md bg-black/20">
                            <h4 className="font-semibold text-[var(--text-primary)]">{item.description} ({product?.reference})</h4>
                            <p className="text-xs text-gray-500">Total Ordered: {totalOrderedForItem} units</p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-x-4 gap-y-2 mt-2">
                                {SIZES.map(size => {
                                    const ordered = item.sizeQuantities[size] || 0;
                                    if (ordered === 0) return null;
                                    const delivered = deliveredForItem[size] || 0;
                                    const remaining = ordered - delivered;
                                    return (
                                        <div key={size}>
                                            <label className="block text-sm font-medium text-[var(--rose-gold-base)] text-center">{size}</label>
                                            <span className="text-xs text-center block text-gray-500">Rem: {remaining}</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max={remaining}
                                                placeholder="0"
                                                value={deliveryItems[item.id]?.[size] || ''}
                                                onChange={e => handleQuantityChange(item.id, size, e.target.value, remaining)}
                                                className="mt-1 w-full rounded-md py-1 px-2 text-center"
                                                disabled={remaining <= 0}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                <div className="flex flex-col items-end space-y-1 mt-4 bg-black/20 p-3 rounded-md">
                    <div className='flex justify-between w-full max-w-sm'>
                        <span className="text-sm font-semibold text-[var(--rose-gold-base)]">Total Delivery Quantity:</span> 
                        <span className="font-bold text-[var(--text-primary)]">{deliveryTotals.totalQuantity.toLocaleString()} units</span>
                    </div>
                    {isAdmin && (
                        <div className='flex justify-between w-full max-w-sm'>
                            <span className="text-sm font-semibold text-[var(--rose-gold-base)]">Total Delivery Value:</span>
                            <span className="font-bold text-[var(--text-primary)]">{deliveryTotals.totalValue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                        </div>
                    )}
                </div>

                 <div className="pt-4 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="btn-3d cancel">Cancel</button>
                    <button type="submit" className="btn-3d success">Confirm Delivery</button>
                </div>
            </form>
        </Modal>
    );
};

// EntryDetailsModal Component
const EntryDetailsModal = ({ isOpen, onClose, entry, deliveries }: { isOpen: boolean, onClose: () => void, entry: Entry | null, deliveries: Delivery[] }) => {
    const { clients, products } = useData();
    const { hasRole } = useAuth();
    const [imageToPreview, setImageToPreview] = useState<string | null>(null);
    const isAdmin = useMemo(() => hasRole([Role.ADMIN]), [hasRole]);
    
    if (!entry) return null;

    const getTotalQuantity = (item: EntryItem) => Object.values(item.sizeQuantities).reduce((sum: number, q: number) => sum + (q || 0), 0);

    const totalEntryQuantity = entry.items.reduce((sum, item) => sum + getTotalQuantity(item), 0);
    const totalEntryPrice = entry.items.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        const price = product ? product.price : 0;
        return sum + (getTotalQuantity(item) * price);
    }, 0);
    const avgPrice = totalEntryQuantity > 0 ? totalEntryPrice / totalEntryQuantity : 0;
    
    const entryDeliveries = deliveries
        .filter(d => d.entryCode === entry.code)
        .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());

    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} title={<>Details for Entry: <span className="entry-code-highlight">{entry.code}</span></>} footer={<></>}>
            <div className="space-y-6 text-[var(--text-primary)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 p-4 bg-black/20 rounded-lg">
                    <div><span className="font-semibold text-[var(--rose-gold-base)]">Client:</span> {clients.find(c => c.id === entry.clientId)?.name}</div>
                    <div><span className="font-semibold text-[var(--rose-gold-base)]">Date:</span> {formatDate(entry.date)}</div>
                    <div><span className="font-semibold text-[var(--rose-gold-base)]">Input By:</span> {entry.whoInput}</div>
                    <div>
                        <span className="font-semibold text-[var(--rose-gold-base)]">Status:</span> 
                         <span className="ml-2 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full" style={{ backgroundColor: STATUS_STYLES[entry.status].background, color: STATUS_STYLES[entry.status].color }}>
                            {entry.status}
                         </span>
                    </div>
                </div>

                <h4 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">Items</h4>
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-3">
                    {entry.items.map(item => {
                        const totalOrderedForItem = getTotalQuantity(item);

                        const deliveredQuantitiesForItem = entryDeliveries
                            .flatMap(d => d.items)
                            .filter(dItem => dItem.entryItemId === item.id)
                            .reduce((sum, dItem) => sum + Object.values(dItem.sizeQuantities).reduce((qSum: number, q: number) => qSum + (q || 0), 0), 0);
                        
                        const pendingQuantitiesForItem = totalOrderedForItem - deliveredQuantitiesForItem;

                        return (
                            <div key={item.id} className="p-4 border border-[var(--border-color)] rounded-lg bg-black/20">
                                <p className="font-bold text-md text-white">{item.description}</p>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    Main Ref: {item.productRef}
                                </p>
                                
                                <div className="mt-3 border-t border-[var(--border-color)] pt-3">
                                    <div className="flex justify-between items-center">
                                      <p className="font-semibold text-gray-300">Quantities by Size:</p>
                                      {item.imageUrl && (
                                            <button onClick={() => setImageToPreview(item.imageUrl || null)} className="btn-3d sm secondary py-1 px-3">Preview</button>
                                       )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2">
                                      {Object.entries(item.sizeQuantities).map(([size, quantity]) => (
                                          <div key={size} className="text-sm">
                                              <span className="font-bold">{size}:</span> {quantity}
                                          </div>
                                      ))}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 text-center font-bold text-md mt-4 border-t border-[var(--border-color)] pt-3">
                                    <div>
                                        <div className="text-sm text-[var(--rose-gold-base)]">Total</div>
                                        <div className="entry-code-highlight text-lg">{totalOrderedForItem.toLocaleString()}</div>
                                    </div>
                                     <div>
                                        <div className="text-sm text-green-500">Entregada</div>
                                        <div className="text-green-400 text-lg">{deliveredQuantitiesForItem.toLocaleString()}</div>
                                    </div>
                                     <div>
                                        <div className="text-sm text-red-500">Falta</div>
                                        <div className="text-red-400 text-lg">{pendingQuantitiesForItem.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                
                {entryDeliveries.length > 0 && (
                    <div className="border-t border-[var(--border-color)] pt-4">
                        <h4 className="text-lg font-semibold text-[var(--text-primary)] pb-2">Delivery History</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-3">
                            {entryDeliveries.map(delivery => (
                                <div key={delivery.id} className="text-sm bg-black/20 p-2 rounded-md flex justify-between items-center">
                                    <span>
                                        <span className="font-semibold">{formatDate(delivery.deliveryDate)}:</span> Delivered by <span className="font-bold">{delivery.whoDelivered}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                 {isAdmin && (
                    <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center gap-x-6 gap-y-2 mt-4 border-t border-[var(--border-color)] pt-4">
                        <p className="text-sm">Total Entry Quantity: <span className="font-bold text-[var(--text-primary)]">{totalEntryQuantity.toLocaleString()}</span></p>
                        <p className="text-sm">Avg. Price/Unit: <span className="font-bold text-[var(--text-primary)]">{avgPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span></p>
                        <p className="text-sm">Total Value: <span className="font-bold text-[var(--text-primary)]">{totalEntryPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span></p>
                    </div>
                )}
            </div>
        </Modal>
        {imageToPreview && (
             <Modal isOpen={!!imageToPreview} onClose={() => setImageToPreview(null)} title="Image Preview">
                <div className="flex justify-center items-center p-4">
                   <img src={imageToPreview} alt="Item Preview" className="max-w-full max-h-[75vh] rounded-lg" />
                </div>
             </Modal>
        )}
        </>
    );
};

// CameraCaptureModal Component
const CameraCaptureModal = ({ isOpen, onClose, onCapture }: { isOpen: boolean, onClose: () => void, onCapture: (dataUrl: string) => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        if (isOpen) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    setStream(stream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    console.error("Error accessing camera: ", err);
                    alert("Could not access camera. Please ensure permissions are granted and that you are using a secure (HTTPS) connection.");
                    onClose();
                });
        } else {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen, onClose, stream]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context?.drawImage(videoRef.current, 0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight);
            const dataUrl = canvasRef.current.toDataURL('image/jpeg');
            onCapture(dataUrl);
            onClose();
        }
    };
    
    const footer = (
        <div className="flex justify-center">
             <button onClick={handleCapture} className="btn-3d success">Capture Photo</button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Take Picture" footer={footer}>
            <div className="flex flex-col items-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-lg bg-black"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
        </Modal>
    );
};


export default Entries;
