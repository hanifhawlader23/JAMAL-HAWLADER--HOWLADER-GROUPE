

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Setup = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{success: boolean, message: string} | null>(null);

    const handleSetup = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const res = await fetch('/api/setup');
            const data = await res.json();
            if (res.ok) {
                setResult({ success: true, message: data.message || 'Setup completed successfully!' });
            } else {
                throw new Error(data.error || 'Setup failed.');
            }
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--page-bg)] p-4">
            <div className="max-w-md w-full bg-[var(--component-bg)] p-8 rounded-2xl shadow-2xl shadow-black/30">
                <h2 className="text-3xl font-bold text-center text-[var(--text-accent)] mb-2 font-stylish">Database Setup</h2>
                <p className="text-center text-[var(--text-secondary)] mb-8">
                    This will create the necessary tables in your Vercel Postgres database.
                    Run this once to initialize the application.
                </p>
                
                <button
                    onClick={handleSetup}
                    disabled={isLoading}
                    className="w-full btn-3d primary"
                >
                    {isLoading ? 'Setting up...' : 'Run Setup'}
                </button>

                {result && (
                     <div className={`mt-6 p-4 rounded-md text-center text-sm ${result.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {result.message}
                     </div>
                )}

                <div className="mt-6 text-center text-sm">
                    <Link to="/login" className="font-medium text-[var(--rose-gold-base)] hover:text-[var(--soft-blush)]">
                        Proceed to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Setup;
