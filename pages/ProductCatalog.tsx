
import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import { Role } from '../types';
import { useAuth } from '../hooks/useAuth.tsx';

// Reusable ProductTable component to display a list of products
const ProductTable = ({
    products,
    isAdmin,
    onEdit,
    onDelete,
}) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-color)]">
                <thead className="bg-[var(--border-color)]/50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Model Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Reference</th>
                        {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Price</th>}
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Category</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-[var(--component-bg)] divide-y divide-[var(--border-color)]">
                    {products.length > 0 ? (
                        products.map(product => (
                            <tr key={product.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">{product.code}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{product.modelName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{product.reference}</td>
                                {isAdmin && <td className={`px-6 py-4 whitespace-nowrap text-sm ${product.price === 0 ? 'bg-red-900/50 font-bold text-red-300' : 'text-[var(--text-secondary)]'}`}>
                                    {product.price === 0 ? 'NEEDS PRICE' : `${product.price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`}
                                </td>}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{product.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button onClick={() => onEdit(product)} className="btn-3d sm secondary">Edit</button>
                                        <button onClick={() => onDelete(product.id)} className="btn-3d sm danger">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                         <tr>
                            <td colSpan={isAdmin ? 6 : 5} className="text-center py-5 text-[var(--text-secondary)]">No products found for this client.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const ProductCatalog = () => {
    const { products, deleteProduct, clients } = useData();
    const { hasRole } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, idToDelete: '' });
    const [selectedClient, setSelectedClient] = useState('');

    const isAdmin = useMemo(() => hasRole([Role.ADMIN]), [hasRole]);

    const filteredProducts = useMemo(() => {
        if (!selectedClient) {
            return []; // Not used when "All Clients" is selected
        }
        return products.filter(product => product.clientId === selectedClient);
    }, [products, selectedClient]);

    const productGroups = useMemo(() => {
        if (selectedClient) return []; // Only used for "All Clients" view

        const groups = products.reduce((acc, product) => {
            const clientId = product.clientId || 'unassigned';
            if (!acc[clientId]) {
                acc[clientId] = [];
            }
            acc[clientId].push(product);
            return acc;
        }, {});

        return Object.entries(groups).map(([clientId, clientProducts]) => ({
            id: clientId,
            name: clients.find(c => c.id === clientId)?.name || 'Products Without Client',
            products: clientProducts,
        })).sort((a,b) => {
            if (a.id === 'unassigned') return 1;
            if (b.id === 'unassigned') return -1;
            return a.name.localeCompare(b.name);
        });
    }, [products, clients, selectedClient]);

    const openModal = (product = null) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setEditingProduct(null);
        setIsModalOpen(false);
    };

    const handleDeleteClick = (id) => {
        setConfirmModalState({ isOpen: true, idToDelete: id });
    };

    const handleConfirmDelete = () => {
        deleteProduct(confirmModalState.idToDelete);
        setConfirmModalState({ isOpen: false, idToDelete: '' });
    };

    return (
        <div className="space-y-6">
             <div className="bg-[var(--component-bg)] shadow-lg rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-10">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <label htmlFor="client-filter" className="font-semibold text-[var(--text-secondary)] whitespace-nowrap">Filter by Client:</label>
                    <select id="client-filter" value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="p-2 border rounded-md w-full md:w-64">
                        <option value="">All Clients</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <button
                    onClick={() => openModal()}
                    className="btn-3d primary"
                >
                    + New Product
                </button>
            </div>
            
            {selectedClient ? (
                // Single client view
                <div className="bg-[var(--component-bg)] shadow-lg rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-[var(--text-accent)] mb-4">
                        {clients.find(c => c.id === selectedClient)?.name || 'Product Catalog'}
                    </h2>
                    <ProductTable products={filteredProducts} isAdmin={isAdmin} onEdit={openModal} onDelete={handleDeleteClick} />
                </div>
            ) : (
                // Grouped "All Clients" view
                 productGroups.length > 0 ? (
                    productGroups.map(group => (
                        <div key={group.id} className="bg-[var(--component-bg)] shadow-lg rounded-lg p-6">
                            <h2 className="text-2xl font-bold text-[var(--text-accent)] mb-4">{group.name}</h2>
                            <ProductTable products={group.products} isAdmin={isAdmin} onEdit={openModal} onDelete={handleDeleteClick} />
                        </div>
                    ))
                ) : (
                     <div className="bg-[var(--component-bg)] shadow-lg rounded-lg p-6 text-center">
                        <p className="py-5 text-[var(--text-secondary)]">No products in the catalog yet.</p>
                     </div>
                )
            )}

            {isModalOpen && (
                <ProductFormModal isOpen={isModalOpen} onClose={closeModal} product={editingProduct} />
            )}
            
            <ConfirmationModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ isOpen: false, idToDelete: '' })}
                onConfirm={handleConfirmDelete}
                title="Delete Product"
                message="Are you sure you want to delete this product? This might affect existing entries."
            />
        </div>
    );
};

const ProductFormModal = ({ isOpen, onClose, product }) => {
    const { addProduct, updateProduct, clients } = useData();
    const [formData, setFormData] = useState({
        code: product?.code || '',
        modelName: product?.modelName || '',
        price: product?.price || 0,
        category: product?.category || '',
        reference: product?.reference || '',
        description: product?.description || '',
        clientId: product?.clientId || '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (product) {
            updateProduct(product.id, formData);
        } else {
            addProduct(formData);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={product ? "Edit Product" : "New Product"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Product Code</label>
                        <input type="text" name="code" value={formData.code} onChange={handleChange} className="mt-1 block w-full p-2 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Model Name</label>
                        <input type="text" name="modelName" value={formData.modelName} onChange={handleChange} className="mt-1 block w-full p-2 rounded-md shadow-sm" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Reference</label>
                        <input type="text" name="reference" value={formData.reference} onChange={handleChange} className="mt-1 block w-full p-2 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Price (€)</label>
                        <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="mt-1 block w-full p-2 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Category</label>
                        <input type="text" name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full p-2 rounded-md shadow-sm" />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-[var(--text-secondary)]">Assign to Client (Optional)</label>
                        <select name="clientId" value={formData.clientId} onChange={handleChange} className="mt-1 block w-full p-2 rounded-md shadow-sm">
                            <option value="">No specific client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="mt-1 block w-full p-2 rounded-md shadow-sm" />
                </div>
                <div className="pt-4 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="btn-3d cancel">Cancel</button>
                    <button type="submit" className="btn-3d success">Save</button>
                </div>
            </form>
        </Modal>
    );
};

export default ProductCatalog;
