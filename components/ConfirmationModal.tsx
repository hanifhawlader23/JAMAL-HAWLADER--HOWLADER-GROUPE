
import React from 'react';
import Modal from './Modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="btn-3d cancel">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="btn-3d danger">
            Confirm
          </button>
        </div>
      }
    >
      <p className="text-[var(--text-primary)]">{message}</p>
    </Modal>
  );
};

export default ConfirmationModal;