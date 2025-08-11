import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ToastMessage } from '../context/ToastContext';

// Toast Component
const Toast: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, 5000); // Auto-dismiss after 5 seconds

        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    const typeStyles = {
        success: { bg: 'bg-green-500', icon: '✅' },
        error: { bg: 'bg-red-500', icon: '❌' },
        info: { bg: 'bg-blue-500', icon: 'ℹ️' },
        warning: { bg: 'bg-yellow-500', icon: '⚠️' },
    };

    const style = typeStyles[toast.type];

    return (
        <div className={`flex items-center text-white p-4 rounded-lg shadow-lg mb-2 animate-toast-in ${style.bg} border-2 border-white/20`}
             style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
        >
            <span className="text-xl mr-3">{style.icon}</span>
            <p className="flex-grow font-semibold">{toast.message}</p>
            <button onClick={() => onDismiss(toast.id)} className="ml-4 font-bold text-xl opacity-70 hover:opacity-100 transition-opacity">&times;</button>
        </div>
    );
};


// ToastContainer Component
interface ToastContainerProps {
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
    const toastRoot = document.getElementById('toast-root');
    if (!toastRoot) return null;
    
    // Some basic animation styling
    const animationStyle = `
        @keyframes toast-in {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        .animate-toast-in {
            animation: toast-in 0.5s ease-out forwards;
        }
    `;

    return ReactDOM.createPortal(
        <>
            <style>{animationStyle}</style>
            <div className="fixed top-5 right-5 z-[100] w-full max-w-sm">
                {toasts.map(toast => (
                    <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
                ))}
            </div>
        </>,
        toastRoot
    );
};

export default ToastContainer;
