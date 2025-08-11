
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real application, you would make an API call here.
        // For this simulation, we'll just show a generic success message
        // for security reasons (to not reveal if an email is registered).
        setMessage('If an account with that email exists, a password reset link has been sent.');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--page-bg)] p-4">
            <div className="max-w-md w-full bg-[var(--component-bg)] p-8 rounded-2xl shadow-2xl shadow-black/30">
                <h2 className="text-3xl font-bold text-center text-[var(--text-accent)] mb-2 font-stylish">Reset Password</h2>
                <p className="text-center text-[var(--text-secondary)] mb-8">Enter your email to receive a reset link.</p>
                
                {message && <p className="bg-green-500/20 text-green-300 p-3 rounded-md mb-4 text-center">{message}</p>}
                
                {!message && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[var(--text-secondary)] text-sm font-bold mb-2" htmlFor="email">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="shadow-inner appearance-none border rounded-lg w-full py-3 px-4 leading-tight focus:outline-none focus:ring-2"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full btn-3d primary"
                        >
                            Send Reset Link
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center text-sm">
                    <Link to="/login" className="font-medium text-[var(--rose-gold-base)] hover:text-[var(--soft-blush)]">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;