import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, ButtonGroup, Table, Toast, ToastContainer } from 'react-bootstrap';
import CustomPagination from '../components/CustomPagination';
import { useTranslation } from 'react-i18next';
import { useAppContext, WhatsAppPreset } from '../context/AppContext';
import SearchBar from '../components/SearchBar';
import DeletionWarningModal from '../components/DeletionWarningModal';
import { FiPlus, FiEdit2, FiTrash2, FiSend, FiCheck, FiX, FiMessageSquare, FiUser, FiPhone, FiDollarSign } from 'react-icons/fi';

const WhatsAppManager: React.FC = () => {
  const { t } = useTranslation();
  const { 
    customers,
    brokers,
    whatsappPresets, 
    businessSettings,
    addWhatsAppPreset, 
    updateWhatsAppPreset, 
    deleteWhatsAppPreset 
  } = useAppContext();
  
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // System Presets (Non-editable, Non-deletable)
  const SYSTEM_PRESETS: WhatsAppPreset[] = [
    {
      id: 'sys_1_en',
      title: 'Payment Reminder (EN)',
      message: 'Hello {contactName}, this is a reminder regarding your outstanding balance of ₹{totalPending} at {businessName}. Kindly settle the payment at your earliest convenience. Thank you!'
    },
    {
      id: 'sys_2_en',
      title: 'Payment Due in 1 Month (EN)',
      message: 'Hello {contactName}, your payment of ₹{totalPending} is due in 1 month. Please ensure timely payment to maintain a smooth account. Regards, {businessName}.'
    },
    {
      id: 'sys_3_en',
      title: 'Visit Us Again (EN)',
      message: 'Hello {contactName}, it has been a long time since your last visit to {businessName}. We value your business and would love to see you again soon!'
    },
    {
      id: 'sys_4_en',
      title: 'Happy New Year (EN)',
      message: 'Wishing you a very Happy and Prosperous New Year! May this year bring success and happiness to you and your family. Regards, {businessName}.'
    },
    {
      id: 'sys_5_en',
      title: 'Happy Diwali (EN)',
      message: 'May the divine light of Diwali spread into your life peace, prosperity, and happiness. Wishing you and your family a very Happy Diwali! From {businessName}.'
    },
    {
      id: 'sys_1_mr',
      title: 'देयक आठवण (MR)',
      message: 'नमस्कार {contactName}, {businessName} कडून ही आपल्या ₹{totalPending} च्या थकीत रकमेची आठवण आहे. कृपया लवकरात लवकर रक्कम जमा करावी. धन्यवाद!'
    },
    {
      id: 'sys_2_mr',
      title: 'मुदत आठवण (MR)',
      message: 'नमस्कार {contactName}, आपले ₹{totalPending} देय येत्या १ महिन्यात भरायचे आहे. कृपया वेळेवर पेमेंट करावे. शुभेच्छा, {businessName}.'
    },
    {
      id: 'sys_3_mr',
      title: 'पुन्हा भेट द्या (MR)',
      message: 'नमस्कार {contactName}, {businessName} ला आपली भेट देऊन बराच काळ झाला आहे. आम्हाला आपली सेवा करायला पुन्हा आवडेल. लवकरच भेट द्या!'
    },
    {
      id: 'sys_4_mr',
      title: 'नवीन वर्ष शुभेच्छा (MR)',
      message: 'तुम्हाला आणि तुमच्या परिवाराला नवीन वर्षाच्या हार्दिक शुभेच्छा! हे वर्ष तुम्हाला सुख-समृद्धीचे जावो. शुभेच्छुक, {businessName}.'
    },
    {
      id: 'sys_5_mr',
      title: 'दिवाळी शुभेच्छा (MR)',
      message: 'दीपावलीच्या या मंगल समयी तुमच्या जीवनात सुख, शांती आणि समृद्धी नांदो. तुम्हाला आणि तुमच्या परिवाराला दिवाळीच्या हार्दिक शुभेच्छा! - {businessName}.'
    }
  ];

  // State for selection mode (customer or broker)
  const [selectionMode, setSelectionMode] = useState<'customer' | 'broker'>('customer');
  
  // State for contact selection
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // State for preset management
  const [presetSearchQuery, setPresetSearchQuery] = useState('');
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<WhatsAppPreset | null>(null);
  const [presetForm, setPresetForm] = useState({ title: '', message: '' });
  const [presetError, setPresetError] = useState('');

  // State for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<WhatsAppPreset | null>(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Pagination state for contacts
  const [contactCurrentPage, setContactCurrentPage] = useState(1);
  const contactItemsPerPage = 10;

  // Pagination state for presets
  const [presetCurrentPage, setPresetCurrentPage] = useState(1);
  const presetItemsPerPage = 10;

  // Get contacts based on selection mode
  const contacts = useMemo(() => {
    return selectionMode === 'customer' ? customers : brokers;
  }, [selectionMode, customers, brokers]);

  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!contactSearchQuery.trim()) {
      return contacts;
    }
    const query = contactSearchQuery.toLowerCase();
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(query) ||
      contact.contact.toLowerCase().includes(query) ||
      contact.address.toLowerCase().includes(query)
    );
  }, [contacts, contactSearchQuery]);

  // Filter presets based on search query
  const filteredPresets = useMemo(() => {
    const allPresets = [...SYSTEM_PRESETS, ...whatsappPresets];
    if (!presetSearchQuery.trim()) {
      return allPresets;
    }
    const query = presetSearchQuery.toLowerCase();
    return allPresets.filter(preset => 
      preset.title.toLowerCase().includes(query) ||
      preset.message.toLowerCase().includes(query)
    );
  }, [whatsappPresets, presetSearchQuery]);

  // Paginated contacts
  const paginatedContacts = useMemo(() => {
    const startIndex = (contactCurrentPage - 1) * contactItemsPerPage;
    return filteredContacts.slice(startIndex, startIndex + contactItemsPerPage);
  }, [filteredContacts, contactCurrentPage, contactItemsPerPage]);

  // Paginated presets
  const paginatedPresets = useMemo(() => {
    const startIndex = (presetCurrentPage - 1) * presetItemsPerPage;
    return filteredPresets.slice(startIndex, startIndex + presetItemsPerPage);
  }, [filteredPresets, presetCurrentPage, presetItemsPerPage]);

  // Reset contact pagination when search changes
  React.useEffect(() => {
    setContactCurrentPage(1);
  }, [contactSearchQuery, selectionMode]);

  // Reset preset pagination when search changes
  React.useEffect(() => {
    setPresetCurrentPage(1);
  }, [presetSearchQuery]);

  // Get selected contact
  const selectedContact = useMemo(() => {
    return contacts.find(c => c.id === selectedContactId);
  }, [contacts, selectedContactId]);

  // Handle contact selection
  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId === selectedContactId ? null : contactId);
  };

  // Handle clear selection
  const handleClearSelection = () => {
    setSelectedContactId(null);
  };

  // Open add preset modal
  const handleOpenAddPreset = () => {
    setEditingPreset(null);
    setPresetForm({ title: '', message: '' });
    setPresetError('');
    setShowPresetModal(true);
  };

  // Open edit preset modal
  const handleOpenEditPreset = (preset: WhatsAppPreset) => {
    setEditingPreset(preset);
    setPresetForm({ title: preset.title, message: preset.message });
    setPresetError('');
    setShowPresetModal(true);
  };

  // Handle preset form change
  const handlePresetFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPresetForm(prev => ({ ...prev, [name]: value }));
    if (presetError) setPresetError('');
  };

  // Helper to insert placeholder at cursor position
  const insertPlaceholder = (tag: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = presetForm.message;
    const before = text.substring(0, start);
    const after = text.substring(end);

    const newMessage = before + tag + after;
    setPresetForm(prev => ({ ...prev, message: newMessage }));
    
    // Set focus back to textarea after state update
    setTimeout(() => {
      textarea.focus();
      const newPos = start + tag.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Save preset
  const handleSavePreset = async () => {
    if (!presetForm.title.trim()) {
      setPresetError('Title is required');
      return;
    }
    if (!presetForm.message.trim()) {
      setPresetError('Message is required');
      return;
    }

    try {
      if (editingPreset) {
        await updateWhatsAppPreset({
          id: editingPreset.id,
          title: presetForm.title.trim(),
          message: presetForm.message.trim()
        });
        setToastMessage('Preset updated successfully!');
      } else {
        await addWhatsAppPreset({
          title: presetForm.title.trim(),
          message: presetForm.message.trim()
        });
        setToastMessage('Preset added successfully!');
      }
      setToastType('success');
      setShowToast(true);
      setShowPresetModal(false);
      setPresetForm({ title: '', message: '' });
    } catch (error) {
      console.error('Failed to save preset:', error);
      setPresetError('Failed to save preset');
      setToastMessage('Failed to save preset');
      setToastType('error');
      setShowToast(true);
    }
  };

  // Open delete confirmation modal
  const handleDeletePresetClick = (preset: WhatsAppPreset) => {
    setPresetToDelete(preset);
    setShowDeleteModal(true);
  };

  // Delete preset
  const confirmDeletePreset = async () => {
    if (!presetToDelete) return;

    try {
      await deleteWhatsAppPreset(presetToDelete.id);
      setToastMessage('Preset deleted successfully!');
      setToastType('success');
      setShowToast(true);
      setShowDeleteModal(false);
      setPresetToDelete(null);
    } catch (error) {
      console.error('Failed to delete preset:', error);
      setToastMessage('Failed to delete preset');
      setToastType('error');
      setShowToast(true);
    }
  };

  // Handle delete modal close
  const handleDeleteModalClose = () => {
    setShowDeleteModal(false);
    setPresetToDelete(null);
  };

  // Send WhatsApp message
  const handleSendMessage = async (preset: WhatsAppPreset) => {
    if (!selectedContact) {
      setToastMessage('Please select a contact first');
      setToastType('error');
      setShowToast(true);
      return;
    }

    // Replace placeholders in message
    let message = preset.message;
    message = message.replace(/{contactName}/g, selectedContact.name);
    message = message.replace(/{customerName}/g, selectedContact.name); // Keep for backward compatibility
    message = message.replace(/{businessName}/g, businessSettings.businessName || 'Our Business');
    message = message.replace(/{proprietorName}/g, businessSettings.proprietorName || '');
    message = message.replace(/{date}/g, new Date().toLocaleDateString());
    message = message.replace(/{totalPending}/g, selectedContact.totalPending.toFixed(2));

    // Format phone number (digits only for clean protocol parsing)
    const cleanPhone = selectedContact.contact.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const encodedMessage = encodeURIComponent(message);
    const appUrl = `whatsapp://send?phone=${finalPhone}&text=${encodedMessage}`;
    const webUrl = `https://wa.me/${finalPhone}?text=${encodedMessage}`;

    if (window.electronAPI) {
      try {
        await window.electronAPI.openExternal(appUrl);
      } catch (err) {
        console.warn('WhatsApp Desktop app not found or failed to open directly, falling back to browser (wa.me)...', err);
        await window.electronAPI.openExternal(webUrl);
      }
    } else {
      window.open(webUrl, '_blank');
    }
  };

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2 className="mb-1">{t('whatsappManager.title', 'WhatsApp Manager')}</h2>
            <p className="text-muted mb-0">
              {t('whatsappManager.subtitle', 'Send personalized messages to contacts using dynamic templates')}
            </p>
          </div>
        </Col>
      </Row>

      <Row>
        {/* Left Column - Contact Selection */}
        <Col lg={6} className="mb-4">
          <Card className="h-100 shadow-sm border-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <Card.Header className="bg-white py-3 text-dark">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <FiUser className="me-2 text-primary" size={20} />
                  <h5 className="mb-0" style={{ color: 'var(--primary-dark)' }}>
                    {selectionMode === 'customer' 
                      ? t('whatsappManager.customerSelection', 'Customer Selection') 
                      : t('whatsappManager.brokerSelection', 'Broker Selection')}
                  </h5>
                </div>
                {selectedContact && (
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={handleClearSelection}
                  >
                    <FiX className="me-1" />
                    {t('whatsappManager.clearSelection', 'Clear Selection')}
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              {/* Toggle Buttons */}
              <div className="mb-3">
                <ButtonGroup className="w-100">
                  <Button
                    variant={selectionMode === 'customer' ? 'primary' : 'outline-primary'}
                    onClick={() => { setSelectionMode('customer'); setSelectedContactId(null); }}
                  >
                    <FiUser className="me-1" />
                    {t('whatsappManager.customers', 'Customers')}
                  </Button>
                  <Button
                    variant={selectionMode === 'broker' ? 'primary' : 'outline-primary'}
                    onClick={() => { setSelectionMode('broker'); setSelectedContactId(null); }}
                  >
                    <FiUser className="me-1" />
                    {t('whatsappManager.brokers', 'Brokers')}
                  </Button>
                </ButtonGroup>
              </div>

              {/* Search Bar */}
              <div className="mb-3">
                <SearchBar
                  placeholder={selectionMode === 'customer' 
                    ? t('whatsappManager.searchCustomers', 'Search customers...') 
                    : t('whatsappManager.searchBrokers', 'Search brokers...')}
                  onSearch={setContactSearchQuery}
                />
              </div>

              {/* Selected Contact Details */}
              {selectedContact && (
                <Card className="mb-3 border-success bg-success bg-opacity-10">
                  <Card.Body className="py-2 px-3">
                    <div className="d-flex align-items-center">
                      <FiCheck className="text-success me-2" size={16} />
                      <div className="flex-grow-1">
                        <div className="fw-semibold small">{selectedContact.name}</div>
                        <div className="d-flex gap-3 text-muted" style={{ fontSize: '0.85rem' }}>
                          <span><FiPhone className="me-1" size={12} />{selectedContact.contact}</span>
                          <span><FiDollarSign className="me-1" size={12} />₹{selectedContact.totalPending.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              )}

              {/* Contact Table */}
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th style={{ cursor: 'pointer' }}>
                      {selectionMode === 'customer' ? 'Customer' : 'Broker'}
                    </th>
                    <th>{t('whatsappManager.contact', 'Contact')}</th>
                    <th>{t('whatsappManager.pending', 'Pending')}</th>
                    <th>{t('whatsappManager.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContacts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4">
                        {selectionMode === 'customer' 
                          ? t('whatsappManager.noCustomersFound', 'No customers found') 
                          : t('whatsappManager.noBrokersFound', 'No brokers found')}
                      </td>
                    </tr>
                  ) : (
                    paginatedContacts.map(contact => (
                      <tr 
                        key={contact.id} 
                        className={selectedContactId === contact.id ? 'table-success' : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSelectContact(contact.id)}
                      >
                        <td>
                          <div className="d-flex align-items-center">
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center me-2"
                              style={{
                                width: '32px',
                                height: '32px',
                                backgroundColor: selectedContactId === contact.id ? 'var(--primary-color)' : 'var(--border-color)',
                                color: selectedContactId === contact.id ? 'white' : 'var(--text-secondary)',
                                fontWeight: 'bold',
                                fontSize: '14px'
                              }}
                            >
                              {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="fw-semibold">{contact.name}</div>
                              <div className="text-muted small">{contact.address}</div>
                            </div>
                          </div>
                        </td>
                        <td>{contact.contact}</td>
                        <td className={contact.totalPending > 0 ? 'text-danger' : 'text-success'}>
                          ₹{contact.totalPending.toFixed(2)}
                        </td>
                        <td>
                          <Button
                            variant={selectedContactId === contact.id ? 'success' : 'outline-primary'}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectContact(contact.id);
                            }}
                          >
                            {selectedContactId === contact.id ? (
                              <>
                                <FiCheck className="me-1" size={14} />
                                Selected
                              </>
                            ) : (
                              'Select'
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>

              {/* Contact Pagination */}
              {filteredContacts.length > contactItemsPerPage && (
                <div className="d-flex justify-content-center mt-3">
                  <CustomPagination
                    currentPage={contactCurrentPage}
                    totalPages={Math.ceil(filteredContacts.length / contactItemsPerPage)}
                    onPageChange={setContactCurrentPage}
                  />
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column - Message Presets */}
        <Col lg={6} className="mb-4">
          <Card className="h-100 shadow-sm border-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <Card.Header className="bg-white py-3 text-dark">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <FiMessageSquare className="me-2 text-primary" size={20} />
                  <h5 className="mb-0" style={{ color: 'var(--primary-dark)' }}>{t('whatsappManager.messagePresets', 'Message Presets')}</h5>
                </div>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={handleOpenAddPreset}
                >
                  <FiPlus className="me-1" />
                  {t('whatsappManager.addPreset', 'Add Preset')}
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {/* Search Bar */}
              <div className="mb-3">
                <SearchBar
                  placeholder={t('whatsappManager.searchPresets', 'Search presets...')}
                  onSearch={setPresetSearchQuery}
                />
              </div>

              {/* Preset Table */}
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>{t('whatsappManager.presetTitle', 'Title')}</th>
                    <th>{t('whatsappManager.presetMessage', 'Message')}</th>
                    <th>{t('whatsappManager.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPresets.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center text-muted py-4">
                        {t('whatsappManager.noPresetsFound', 'No presets found. Add a new preset to get started.')}
                      </td>
                    </tr>
                  ) : (
                    paginatedPresets.map(preset => (
                      <tr key={preset.id}>
                        <td className="fw-semibold">{preset.title}</td>
                        <td>
                          <div 
                            className="text-muted small" 
                            style={{ 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              maxWidth: '250px'
                            }}
                          >
                            {preset.message}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleSendMessage(preset)}
                              disabled={!selectedContact}
                              title={!selectedContact ? 'Select a contact first' : 'Send message'}
                            >
                              <FiSend size={14} />
                            </Button>
                            {!preset.id.toString().startsWith('sys_') && (
                              <>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleOpenEditPreset(preset)}
                                >
                                  <FiEdit2 size={14} />
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDeletePresetClick(preset)}
                                >
                                  <FiTrash2 size={14} />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>

              {/* Preset Pagination */}
              {filteredPresets.length > presetItemsPerPage && (
                <div className="d-flex justify-content-center mt-3">
                  <CustomPagination
                    currentPage={presetCurrentPage}
                    totalPages={Math.ceil(filteredPresets.length / presetItemsPerPage)}
                    onPageChange={setPresetCurrentPage}
                  />
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Preset Modal */}
      <Modal show={showPresetModal} onHide={() => setShowPresetModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingPreset ? t('whatsappManager.editPreset', 'Edit Preset') : t('whatsappManager.addPreset', 'Add Preset')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('whatsappManager.presetTitle', 'Title')}</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={presetForm.title}
                onChange={handlePresetFormChange}
                placeholder={t('whatsappManager.placeholderTitle', 'Enter preset title')}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('whatsappManager.presetMessage', 'Message')}</Form.Label>
              <div className="mb-2 d-flex flex-wrap gap-2">
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => insertPlaceholder('{contactName}')}
                >
                  + Name
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => insertPlaceholder('{totalPending}')}
                >
                  + Pending Amount
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => insertPlaceholder('{businessName}')}
                >
                  + Business Name
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => insertPlaceholder('{date}')}
                >
                  + Date
                </Button>
              </div>
              <Form.Control
                as="textarea"
                rows={5}
                name="message"
                ref={textareaRef}
                value={presetForm.message}
                onChange={handlePresetFormChange}
                placeholder={t('whatsappManager.placeholderMessage', 'Enter message content. Use buttons above to add placeholders.')}
              />
              <Form.Text className="text-muted">
                {t('whatsappManager.placeholdersHint', 'Placeholders will be replaced with actual values when sending.')}
              </Form.Text>
            </Form.Group>
            {presetError && (
              <div className="alert alert-danger py-2">{presetError}</div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPresetModal(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSavePreset}
          >
            {t('common.save', 'Save')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeletionWarningModal
        show={showDeleteModal}
        onHide={handleDeleteModalClose}
        onConfirm={confirmDeletePreset}
        entityType="whatsappPreset"
        entityName={presetToDelete?.title || ''}
        impactData={null}
      />

      {/* Toast Notifications */}
      <ToastContainer
        position="bottom-end"
        className="p-3"
        style={{
          zIndex: 9999,
          position: 'fixed',
          bottom: '20px',
          right: '20px'
        }}
      >
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
          bg={toastType === 'success' ? 'success' : 'danger'}
        >
          <Toast.Header>
            <strong className={`me-auto ${toastType === 'success' ? 'text-success' : 'text-danger'}`}>
              {toastType === 'success' ? 'Success' : 'Error'}
            </strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default WhatsAppManager;