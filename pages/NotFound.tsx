import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <h1 className="text-6xl font-bold text-[var(--rose-gold-base)]">404</h1>
            <h2 className="text-3xl font-semibold text-[var(--deep-rose)] mt-4">Page Not Found</h2>
            <p className="text-[var(--gray-500)] mt-2">Sorry, the page you are looking for does not exist.</p>
            <Link
                to="/"
                className="mt-6 btn-3d primary"
            >
                Go back to Dashboard
            </Link>
        </div>
    );
};

export default NotFound;