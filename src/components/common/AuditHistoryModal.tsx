/**
 * Audit history modal component for displaying full task change history
 */

import React from 'react';
import { Modal, AuditLogTimeline } from '@/components/common';
import './AuditHistoryModal.css';

interface AuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle?: string;
}

export const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskTitle
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Change History${taskTitle ? ` - ${taskTitle}` : ''}`}
    >
      <div className="audit-history-modal__content">
        <AuditLogTimeline 
          taskId={taskId}
          showFilters={true}
          className="audit-history-modal__timeline"
        />
      </div>
    </Modal>
  );
};

export default AuditHistoryModal;