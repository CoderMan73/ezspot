import { useEffect, useState } from 'react';
import '../styles/HomePage.css';

type UploadStatus = 'idle' | 'processing' | 'success' | 'failed';

export default function GlobalUploadStatus() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusVisible, setStatusVisible] = useState(false);

  const renderLoadingDots = () => (
    <span className="status-dots" aria-hidden="true">
      <span>.</span><span>.</span><span>.</span>
    </span>
  );

    useEffect(() => {
    let timeoutId: number | undefined;

    const startPolling = () => {
        const savedJob = localStorage.getItem('activeReportJob');
        if (!savedJob) {
        setStatusVisible(false);
        return;
        }

        const { reportId, filename } = JSON.parse(savedJob);

        setStatusVisible(true);
        setUploadStatus('processing');
        setStatusMessage(
        filename ? `Processing ${filename}` : 'Processing report'
        );

        const pollStatus = async () => {
        try {
            const statusResponse = await fetch(
            `/api/report-status/${reportId}`
            );

            if (!statusResponse.ok) {
            throw new Error('Failed to fetch report status.');
            }

            const statusData = await statusResponse.json();

            if (statusData.status === 'Processing') {
            timeoutId = window.setTimeout(pollStatus, 2000);
            } else if (statusData.status === 'Processed') {
            setUploadStatus('success');
            setStatusMessage('Report processed successfully.');
            localStorage.removeItem('activeReportJob');
            
            // Notify other components that a report has finished processing
            window.dispatchEvent(new CustomEvent('report-processed', { detail: { reportId } }));

            timeoutId = window.setTimeout(() => {
                setStatusVisible(false);
            }, 4000);
            } else if (statusData.status === 'Failed') {
            setUploadStatus('failed');
            setStatusMessage('Report processing failed.');
            localStorage.removeItem('activeReportJob');

            timeoutId = window.setTimeout(() => {
                setStatusVisible(false);
            }, 5000);
            }
        } catch (err) {
            console.error('Polling error:', err);
            setUploadStatus('failed');
            setStatusMessage('Could not check report status.');
        }
        };

        pollStatus();
    };

    // run on mount
    startPolling();

    // listen for new uploads (same tab fix)
    const handleStorage = () => startPolling();
    window.addEventListener('storage', handleStorage);

    window.addEventListener('report-uploaded', startPolling);

    return () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('report-uploaded', startPolling);
    };
    }, []);

  if (!statusVisible) return null;

  return (
    <div className={`upload-status-card ${uploadStatus}`}>
      <div className="upload-status-row">
        {uploadStatus === 'processing' && (
          <div className="status-spinner" aria-hidden="true" />
        )}

        {(uploadStatus === 'success' || uploadStatus === 'failed') && (
          <div className="status-icon" aria-hidden="true">
            {uploadStatus === 'success' ? '✓' : '✕'}
          </div>
        )}

        <div className="upload-status-text">
          <strong>
            {uploadStatus === 'processing' && 'Processing'}
            {uploadStatus === 'success' && 'Complete'}
            {uploadStatus === 'failed' && 'Failed'}
          </strong>
          <p>
            {statusMessage}
            {uploadStatus === 'processing' && renderLoadingDots()}
          </p>
        </div>
      </div>
    </div>
  );
}