import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';

const Clients = () => {
    const { clients, addClient, updateClient, deleteClient } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, idToDelete: '' });

    const openModal = (client = null) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setEditingClient(null);
        setIsModalOpen(false);
    };
    
    const handleDeleteClick = (id) => {
        setConfirmModalState({ isOpen: true, idToDelete: id });
    };

    const handleConfirmDelete = () => {
        deleteClient(confirmModalState.idToDelete);
        setConfirmModalState({ isOpen: false, idToDelete: '' });
    };

    return (
        <div className="bg-[var(--component-bg)] shadow-lg rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[var(--text-accent)]">Client List</h2>
                <button
                    onClick={() => openModal()}
                    className="btn-3d primary"
                >
                    + New Client
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-color)]">
                    <thead className="bg-[var(--border-color)]/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Phone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Address</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-[var(--component-bg)] divide-y divide-[var(--border-color)]">
                        {clients.map(client => (
                            <tr key={client.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">{client.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{client.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{client.phone}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{client.address}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                     <div className="flex items-center justify-end space-x-2">
                                        <button onClick={() => openModal(client)} className="btn-3d sm secondary">Edit</button>
                                        <button onClick={() => handleDeleteClick(client.id)} className="btn-3d sm danger">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <ClientFormModal isOpen={isModalOpen} onClose={closeModal} client={editingClient} />
            )}
            
            <ConfirmationModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ isOpen: false, idToDelete: '' })}
                onConfirm={handleConfirmDelete}
                title="Delete Client"
                message="Are you sure you want to delete this client? All associated data might be affected."
            />
        </div>
    );
};


const ClientFormModal = ({ isOpen, onClose, client }) => {
    const { addClient, updateClient } = useData();
    const [formData, setFormData] = useState({
        name: client?.name || '',
        address: client?.address || '',
        email: client?.email || '',
        phone: client?.phone || '',
        vatNumber: client?.vatNumber || '',
        logoUrl: client?.logoUrl || '',
    });

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, logoUrl: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (client) {
            updateClient(client.id, formData);
        } else {
            addClient(formData);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={client ? "Edit Client" : "New Client"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Client Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block p-2 w-full rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Phone Number</label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block p-2 w-full rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block p-2 w-full rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">VAT Number</label>
                        <input type="text" name="vatNumber" value={formData.vatNumber} onChange={handleChange} className="mt-1 block p-2 w-full rounded-md shadow-sm" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Address</label>
                    <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="mt-1 p-2 block w-full rounded-md shadow-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Client Logo</label>
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--rose-gold-base)] file:text-white hover:file:bg-[var(--metallic-rose)]" />
                    {formData.logoUrl && (
                        <div className='mt-2'>
                          <img src={formData.logoUrl} alt="Logo Preview" className="h-20 w-auto object-contain rounded-md bg-gray-700/50 p-1" />
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))} className="text-xs text-red-400 hover:underline mt-1">Remove Logo</button>
                        </div>
                    )}
                </div>
                <div className="pt-4 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="btn-3d cancel">Cancel</button>
                    <button type="submit" className="btn-3d success">Save</button>
                </div>
            </form>
        </Modal>
    );
};

export default Clients;