import React, { useState, useEffect } from 'react';
import { useData } from '../hooks/useData';

const CompanyDetailsPage = () => {
    const { companyDetails, updateCompanyDetails } = useData();
    const [formData, setFormData] = useState(companyDetails);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        // When companyDetails from context updates (e.g., initial load), update the form data.
        setFormData(companyDetails);
    }, [companyDetails]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setIsSaved(false);
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
        setIsSaved(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        updateCompanyDetails(formData);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    return (
        <div className="max-w-4xl mx-auto bg-[var(--component-bg)] shadow-lg rounded-lg p-8">
            <h2 className="text-2xl font-bold text-[var(--text-accent)] mb-6">Company Details</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Company Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm p-2" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">VAT/BIN Number</label>
                        <input type="text" name="vatNumber" value={formData.vatNumber} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Phone Number</label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm p-2" />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Address</label>
                    <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md shadow-sm p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Company Logo</label>
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--rose-gold-base)] file:text-white hover:file:bg-[var(--metallic-rose)]" />
                    {formData.logoUrl && (
                        <div className="mt-2">
                           <img src={formData.logoUrl} alt="Logo Preview" className="h-24 w-auto object-contain rounded-md bg-gray-700/50 p-2" />
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))} className="text-xs text-red-400 hover:underline mt-1">Remove Logo</button>
                        </div>
                    )}
                </div>
                <div className="flex justify-end items-center">
                    {isSaved && <p className="text-green-400 mr-4">Information saved successfully!</p>}
                    <button
                        type="submit"
                        className="btn-3d primary"
                    >
                        Save
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CompanyDetailsPage;