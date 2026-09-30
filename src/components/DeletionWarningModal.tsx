import React, { useState } from 'react';
import { Modal, Button, Alert, ListGroup, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

interface ImpactData {
  affectedLeisures?: number;
  affectedStockHistory?: number;
  financialImpact?: number;
  affectedEntities?: string[];
  canDelete?: boolean;
  orphanedRecords?: string[];
  affectsBrokerTotal?: boolean;
  affectsCustomerTotal?: boolean;
  brokerName?: string;
  customerName?: string;
  willDeleteTransaction?: boolean;
  willDeleteLeisure?: boolean;
  transactionId?: string;
}

interface DeletionWarningModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: () => void;
  entityType: 'brokerTransaction' | 'customerTransaction' | 'brokerLeisure' | 'customerLeisure' | 'product' | 'manufacturer' | 'broker' | 'customer' | 'whatsappPreset';
  entityName: string;
  impactData: ImpactData | null;
  isLoading?: boolean;
  isDeleting?: boolean;
}

const DeletionWarningModal: React.FC<DeletionWarningModalProps> = ({
  show,
  onHide,
  onConfirm,
  entityType,
  entityName,
  impactData,
  isLoading = false,
  isDeleting = false
}) => {
  const { t } = useTranslation();
  const [confirmationText, setConfirmationText] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const getWarningLevel = (): 'safe' | 'caution' | 'danger' => {
    if (!impactData) return 'safe';

    const hasFinancialImpact = (impactData.financialImpact || 0) > 0;
    const hasAffectedEntities = (impactData.affectedEntities?.length || 0) > 0;
    const hasOrphanedRecords = (impactData.orphanedRecords?.length || 0) > 0;
    const canDelete = impactData.canDelete !== false;

    if (!canDelete || hasOrphanedRecords) return 'danger';
    if (hasFinancialImpact || hasAffectedEntities) return 'caution';
    return 'safe';
  };

  const getRequiresConfirmation = (): boolean => {
    // Override confirmation requirement based on entity type
    if (entityType === 'broker' || entityType === 'customer') {
      return true; // Brokers and customers always require confirmation
    }
    if (entityType === 'brokerTransaction' || entityType === 'customerTransaction' ||
        entityType === 'brokerLeisure' || entityType === 'customerLeisure') {
      return false; // Transactions and leisures never require confirmation
    }

    // Fallback to original logic for other entity types
    const warningLevel = getWarningLevel();
    return warningLevel === 'danger';
  };

  const getWarningColor = (level: string) => {
    switch (level) {
      case 'danger': return 'danger';
      case 'caution': return 'warning';
      default: return 'success';
    }
  };

  const getWarningIcon = (level: string) => {
    switch (level) {
      case 'danger': return '🚨';
      case 'caution': return '⚠️';
      default: return '✅';
    }
  };

  const getEntityTypeLabel = () => {
    switch (entityType) {
      case 'brokerTransaction': return t('deletion.brokerTransaction', 'Broker Transaction');
      case 'customerTransaction': return t('deletion.customerTransaction', 'Customer Transaction');
      case 'brokerLeisure': return t('deletion.brokerLeisure', 'Broker Payment');
      case 'customerLeisure': return t('deletion.customerLeisure', 'Customer Payment');
      case 'product': return t('deletion.product', 'Product');
      case 'manufacturer': return t('deletion.manufacturer', 'Manufacturer');
      case 'broker': return t('deletion.broker', 'Broker');
      case 'customer': return t('deletion.customer', 'Customer');
      default: return entityType;
    }
  };

  const warningLevel = getWarningLevel();
  const requiresConfirmation = getRequiresConfirmation();
  const expectedConfirmationText = `DELETE ${entityName.toUpperCase()}`;

  const handleConfirm = () => {
    if (requiresConfirmation && !isConfirmed) return;
    onConfirm(); // Parent component handles modal closing
  };

  const handleClose = () => {
    setConfirmationText('');
    setIsConfirmed(false);
    onHide();
  };

  const renderImpactSummary = () => {
    if (!impactData) return null;

    return (
      <div className="mb-3">
        <h6 className="mb-2">{t('deletion.whatWillBeDeleted', 'What will be deleted')}:</h6>
        <ListGroup variant="flush" className="mb-3">
          {impactData.willDeleteTransaction && (
            <ListGroup.Item className="d-flex justify-content-between align-items-center">
              <span>{t('deletion.transaction', 'Transaction')}:</span>
              <Badge bg="danger">✓ {t('deletion.willBeDeleted', 'Will be deleted')}</Badge>
            </ListGroup.Item>
          )}

          {impactData.willDeleteLeisure && (
            <ListGroup.Item className="d-flex justify-content-between align-items-center">
              <span>{t('deletion.leisureRecord', 'Payment Record')}:</span>
              <Badge bg="danger">✓ {t('deletion.willBeDeleted', 'Will be deleted')}</Badge>
            </ListGroup.Item>
          )}

          {impactData.transactionId && (
            <ListGroup.Item className="d-flex justify-content-between align-items-center">
              <span>{t('deletion.transactionId', 'Transaction ID')}:</span>
              <Badge bg="secondary" className="font-monospace">{impactData.transactionId}</Badge>
            </ListGroup.Item>
          )}
        </ListGroup>

        <h6 className="mb-2">{t('deletion.deletionImpact', 'Deletion Impact')}:</h6>
        <ListGroup variant="flush">
          {impactData.financialImpact && impactData.financialImpact > 0 && (
            <ListGroup.Item className="d-flex justify-content-between align-items-center">
              <span>{t('deletion.financialImpact', 'Financial Impact')}:</span>
              <Badge bg="danger" className="fs-6">₹{impactData.financialImpact.toFixed(2)}</Badge>
            </ListGroup.Item>
          )}

          {impactData.affectedLeisures && impactData.affectedLeisures > 0 && (
            <ListGroup.Item className="d-flex justify-content-between align-items-center">
              <span>{t('deletion.affectedLeisures', 'Related Payments')}:</span>
              <Badge bg="warning">{impactData.affectedLeisures}</Badge>
            </ListGroup.Item>
          )}

          {impactData.affectedStockHistory && impactData.affectedStockHistory > 0 && (
            <ListGroup.Item className="d-flex justify-content-between align-items-center">
              <span>{t('deletion.affectedStockHistory', 'Stock History Records')}:</span>
              <Badge bg="info">{impactData.affectedStockHistory}</Badge>
            </ListGroup.Item>
          )}

          {impactData.affectsBrokerTotal && (
            <ListGroup.Item className="d-flex justify-content-between align-items-center">
              <span>{t('deletion.affectsBrokerTotal', 'Affects Broker Balance')}:</span>
              <Badge bg="primary">{impactData.brokerName}</Badge>
            </ListGroup.Item>
          )}

          {impactData.affectsCustomerTotal && (
            <ListGroup.Item className="d-flex justify-content-between align-items-center">
              <span>{t('deletion.affectsCustomerTotal', 'Affects Customer Balance')}:</span>
              <Badge bg="primary">{impactData.customerName}</Badge>
            </ListGroup.Item>
          )}
        </ListGroup>

        {impactData.affectedEntities && impactData.affectedEntities.length > 0 && (
          <div className="mt-2">
            <small className="text-muted">{t('deletion.affectedEntities', 'Affected Records')}:</small>
            <ul className="mb-0 mt-1">
              {impactData.affectedEntities.map((entity, index) => (
                <li key={index} className="small text-muted">{entity}</li>
              ))}
            </ul>
          </div>
        )}

        {impactData.orphanedRecords && impactData.orphanedRecords.length > 0 && (
          <Alert variant="danger" className="mt-2 mb-0">
            <small>
              <strong>{t('deletion.orphanedRecords', 'Warning: This will create orphaned records')}:</strong>
              <ul className="mb-0 mt-1">
                {impactData.orphanedRecords.map((record, index) => (
                  <li key={index}>{record}</li>
                ))}
              </ul>
            </small>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center">
          <span className="me-2">{getWarningIcon(warningLevel)}</span>
          {t('deletion.confirmDeletion', 'Confirm Deletion')}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Alert variant={getWarningColor(warningLevel)} className="mb-3">
          <div className="d-flex align-items-center">
            <span className="me-2">{getWarningIcon(warningLevel)}</span>
            <div>
              <strong>{getEntityTypeLabel()}: {entityName}</strong>
              <div className="small mt-1">
                {warningLevel === 'danger' && t('deletion.dangerWarning', 'This action cannot be undone and may cause data integrity issues.')}
                {warningLevel === 'caution' && t('deletion.cautionWarning', 'This action will affect related records. Please review the impact below.')}
                {warningLevel === 'safe' && t('deletion.safeWarning', 'This action is safe and will not affect other records.')}
              </div>
            </div>
          </div>
        </Alert>

        {isLoading ? (
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
            {t('deletion.analyzingImpact', 'Analyzing deletion impact...')}
          </div>
        ) : isDeleting ? (
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
            {t('deletion.deleting', 'Deleting...')}
          </div>
        ) : (
          renderImpactSummary()
        )}

        {requiresConfirmation && !isLoading && (
          <div className="mt-3 p-3 bg-light rounded">
            <label htmlFor="confirmationInput" className="form-label fw-bold text-danger">
              {t('deletion.typeToConfirm', 'Type "{{text}}" to confirm deletion:', { text: expectedConfirmationText })}
            </label>
            <input
              type="text"
              id="confirmationInput"
              className="form-control"
              value={confirmationText}
              onChange={(e) => {
                setConfirmationText(e.target.value);
                setIsConfirmed(e.target.value === expectedConfirmationText);
              }}
              placeholder={expectedConfirmationText}
            />
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
          {t('deletion.cancel', 'Cancel')}
        </Button>
        <Button
          variant={warningLevel === 'danger' ? 'danger' : 'primary'}
          onClick={handleConfirm}
          disabled={isLoading || isDeleting || (requiresConfirmation && !isConfirmed)}
        >
          {warningLevel === 'danger'
            ? t('deletion.deleteAnyway', 'Delete Anyway')
            : t('deletion.confirmDelete', 'Confirm Delete')
          }
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeletionWarningModal;
