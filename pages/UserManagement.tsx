
import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import { Role, User } from '../types';
import { ROLES } from '../constants';

const UserManagement = () => {
    const { users, addUser, updateUser, deleteUser } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, idToDelete: '' });

    const openModal = (user: User | null = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setEditingUser(null);
        setIsModalOpen(false);
    };
    
    const handleDeleteClick = (id: string) => {
        setConfirmModalState({ isOpen: true, idToDelete: id });
    };

    const handleConfirmDelete = () => {
        deleteUser(confirmModalState.idToDelete);
        setConfirmModalState({ isOpen: false, idToDelete: '' });
    };

    return (
        <div className="bg-[var(--component-bg)] shadow-lg rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[var(--text-accent)]">User Management</h2>
                <button
                    onClick={() => openModal()}
                    className="btn-3d primary"
                >
                    + New User
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-color)]">
                    <thead className="bg-[var(--border-color)]/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Full Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Role</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-[var(--component-bg)] divide-y divide-[var(--border-color)]">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">{user.fullName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{user.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{ROLES[user.role]}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button onClick={() => openModal(user)} className="btn-3d sm secondary">Edit</button>
                                        <button onClick={() => handleDeleteClick(user.id)} className="btn-3d sm danger">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <UserFormModal isOpen={isModalOpen} onClose={closeModal} user={editingUser} />
            )}

            <ConfirmationModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ isOpen: false, idToDelete: '' })}
                onConfirm={handleConfirmDelete}
                title="Delete User"
                message="Are you sure you want to delete this user?"
            />
        </div>
    );
};

const UserFormModal = ({ isOpen, onClose, user }) => {
    const { addUser, updateUser } = useData();
    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        username: user?.username || '',
        password: '', // Always clear password field for security
        role: user?.role || Role.USER,
    });

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (user) {
            const updates: Partial<User> = {
                fullName: formData.fullName,
                username: formData.username,
                role: formData.role,
            };
            if (formData.password) {
                updates.password = formData.password;
            }
            updateUser(user.id, updates);
        } else {
            if (!formData.password) {
                alert("Password is required for new users.");
                return;
            }
            addUser(formData as Omit<User, 'id'>);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={user ? "Edit User" : "New User"} footer={<></>}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Full Name</label>
                        <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="mt-1 block p-2 w-full rounded-md shadow-sm" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Role</label>
                        <select name="role" value={formData.role} onChange={handleChange} className="mt-1 block p-2 w-full rounded-md shadow-sm" required>
                           {Object.values(Role).map(role => (
                               <option key={role} value={role}>{ROLES[role]}</option>
                           ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Email</label>
                        <input type="email" name="username" value={formData.username} onChange={handleChange} className="mt-1 block p-2 w-full rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Password</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} className="mt-1 block p-2 w-full rounded-md shadow-sm" placeholder={user ? 'Type to change' : ''} required={!user} />
                    </div>
                </div>
                <div className="pt-4 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="btn-3d cancel">Cancel</button>
                    <button type="submit" className="btn-3d success">Save</button>
                </div>
            </form>
        </Modal>
    );
};

export default UserManagement;
