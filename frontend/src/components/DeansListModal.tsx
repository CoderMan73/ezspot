import React, { useState, useEffect } from 'react';
import '../styles/DeansListModal.css';

export interface DeansListFormData {
  dean_first_name: string;
  dean_last_name: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_email: string;
  mean_1000: string;
  mean_2000: string;
  mean_3000: string;
  mean_4000: string;
  mean_5000: string;
  mean_6000: string;
  date: string;
}

interface DeansListModalProps {
  isOpen: boolean;
  reportId: string;
  reportName: string;
  onClose: () => void;
  onGenerate: (formData: DeansListFormData) => Promise<void>;
  isLoading?: boolean;
}

const INITIAL_FORM_STATE: DeansListFormData = {
  dean_first_name: '',
  dean_last_name: '',
  contact_first_name: '',
  contact_last_name: '',
  contact_email: '',
  mean_1000: '',
  mean_2000: '',
  mean_3000: '',
  mean_4000: '',
  mean_5000: '',
  mean_6000: '',
  date: new Date().toISOString().split('T')[0],
};

const MEAN_LEVELS = [1000, 2000, 3000, 4000, 5000, 6000] as const;

export default function DeansListModal({
  isOpen,
  reportName,
  onClose,
  onGenerate,
  isLoading = false,
}: DeansListModalProps) {
  const [formData, setFormData] = useState<DeansListFormData>(INITIAL_FORM_STATE);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...INITIAL_FORM_STATE,
        date: new Date().toISOString().split('T')[0],
      });
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async () => {
    try {
      await onGenerate(formData);
      onClose();
    } catch (error) {
      console.error('Failed to generate Dean\'s List:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="deans-list-modal-overlay" onClick={onClose}>
      <div 
        className="deans-list-modal" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-title"
      >
        <div className="deans-list-modal-header">
          <h2 id="modal-title">Generate Teaching Dean's List</h2>
          <button
            className="deans-list-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        <div className="deans-list-modal-content">
          <div className="deans-list-report-info">
            Report: <strong>{reportName}</strong>
          </div>

          <section className="deans-list-form-section">
            <h3>Dean Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dean_first_name">Dean's First Name</label>
                <input
                  id="dean_first_name"
                  type="text"
                  name="dean_first_name"
                  value={formData.dean_first_name}
                  onChange={handleInputChange}
                  placeholder="Keep placeholder"
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="dean_last_name">Dean's Last Name</label>
                <input
                  id="dean_last_name"
                  type="text"
                  name="dean_last_name"
                  value={formData.dean_last_name}
                  onChange={handleInputChange}
                  placeholder="Keep placeholder"
                  disabled={isLoading}
                />
              </div>
            </div>
          </section>

          <section className="deans-list-form-section">
            <h3>Course Mean Ratings by Level</h3>
            <div className="form-grid-3">
              {MEAN_LEVELS.map((level) => (
                <div className="form-group" key={level}>
                  <label htmlFor={`mean_${level}`}>{level} Level</label>
                  <input
                    id={`mean_${level}`}
                    type="text"
                    name={`mean_${level}`}
                    value={formData[`mean_${level}` as keyof DeansListFormData]}
                    onChange={handleInputChange}
                    placeholder="e.g., 4.5"
                    disabled={isLoading}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="deans-list-form-section">
            <h3>Contact Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contact_first_name">Contact First Name</label>
                <input
                  id="contact_first_name"
                  type="text"
                  name="contact_first_name"
                  value={formData.contact_first_name}
                  onChange={handleInputChange}
                  placeholder="Keep placeholder"
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact_last_name">Contact Last Name</label>
                <input
                  id="contact_last_name"
                  type="text"
                  name="contact_last_name"
                  value={formData.contact_last_name}
                  onChange={handleInputChange}
                  placeholder="Keep placeholder"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="form-group full-width mt-12">
              <label htmlFor="contact_email">Contact Email</label>
              <input
                id="contact_email"
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleInputChange}
                placeholder="Keep placeholder"
                disabled={isLoading}
              />
            </div>
          </section>

          <section className="deans-list-form-section">
            <h3>Document Date</h3>
            <div className="form-group full-width">
              <label htmlFor="date">Memo Date</label>
              <input
                id="date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </section>

          <div className="deans-list-note">
            Note: Leave fields blank to display them as <strong>red placeholders</strong> in the final document.
          </div>
        </div>

        <div className="deans-list-modal-footer">
          <button
            className="deans-list-btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="deans-list-btn-generate"
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Generating...
              </>
            ) : (
              'Generate Document'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
