
import React from 'react';

const Modal = ({ isOpen, onClose, title, children, footer }: { isOpen: boolean, onClose: () => void, title: React.ReactNode, children: React.ReactNode, footer?: React.ReactNode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-start pt-10 md:pt-16">
      <div className="bg-[var(--component-bg)] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col m-4">
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
          <h3 className="text-xl font-semibold text-[var(--text-accent)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end items-center p-4 border-t border-[var(--border-color)] bg-black/20 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
