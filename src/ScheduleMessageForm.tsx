import { FileUploader } from '@aws-amplify/ui-react-storage';
import '@aws-amplify/ui-react/styles.css';
import DOMPurify from 'dompurify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { processFile } from '../utils/utils';
import ScheduledFileGallery from './ScheduledFileGallery';
import UploadFileGallery from './UploadFileGallery';
import { useScheduleForm } from './useScheduleForm';

function ScheduleMessageForm() {
  const {
    editingMessage,
    userEmail,
    identityId,
    scheduleDate,
    message,
    setMessage,
    recipients,
    emailError,
    uniqueDateError,
    significantDates,
    anySignificantDates,
    uploadedSelectedFiles,
    setUploadedSelectedFiles,
    formattedScheduleDate,
    disabledDates,
    handleDateChange,
    handleRecipientsChange,
    handleSubmit,
    navigate,
  } = useScheduleForm();

  return (
    <main>
      <h1>{editingMessage ? 'Edit Scheduled Message' : 'Schedule a Message'}</h1>

      {!editingMessage && (
        <>
          <h3 style={{ margin: 0, marginBottom: '0rem' }}>Current Significant Dates</h3>
          {anySignificantDates ? (
            <ul>
              {significantDates
                .sort((a, b) => new Date(a.significantDate as string).getTime() - new Date(b.significantDate as string).getTime())
                .map(item => (
                  <li key={item.significantDate} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 10px' }}>
                    <span>{item.significantDate}: {item.description}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p style={{ fontStyle: 'italic' }}>No significant dates found.</p>
          )}
        </>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label>
          <p style={{ fontSize: '0.85rem', color: '#555', marginTop: '5px' }}>
            Some dates may be disabled because messages are already scheduled for those dates.
          </p>
          Schedule Date:
          <DatePicker
            showIcon
            selected={scheduleDate}
            onChange={handleDateChange}
            minDate={new Date(Date.now() + 86400000)}
            isClearable={true}
            dateFormat="MM-dd-yyyy"
            excludeDates={disabledDates}
            placeholderText="Select a date"
          />
        </label>
        {uniqueDateError && <p style={{ color: 'red' }}>{uniqueDateError}</p>}

        <label>
          To (Emails, separated by commas):
          <textarea
            value={recipients}
            onChange={handleRecipientsChange}
            placeholder="example@example.com, another@example.com"
            required
            rows={3}
            style={{ width: '100%' }}
          />
        </label>
        {emailError && (
          <p style={{ color: '#d9534f', fontWeight: 'bold', textDecoration: 'underline' }}>{emailError}</p>
        )}

        <label>
          Message:
          <textarea
            value={message}
            onChange={e => setMessage(DOMPurify.sanitize(e.target.value))}
            required
            rows={3}
            style={{ width: '100%' }}
          />
        </label>

        {message ? (
          <label>
            Upload Attachments:
            <FileUploader
              acceptedFileTypes={['.doc', '.docx', '.jpeg', '.jpg', '.pdf', 'image/png', 'video/*']}
              path={({ identityId }) => `uploads/${identityId}/${userEmail}/${formattedScheduleDate}/`}
              autoUpload={true}
              maxFileCount={5}
              maxFileSize={5000000}
              processFile={processFile}
              isResumable
              displayText={{
                dropFilesText: 'Drop files here or',
                browseFilesText: 'Browse files',
                getFilesUploadedText: count => `${count} files uploaded`,
              }}
            />
          </label>
        ) : (
          <p style={{ color: '#d9534f', fontWeight: 'bold', textDecoration: 'underline' }}>
            Please type a message before uploading files.
          </p>
        )}

        {editingMessage && (
          <div>
            <h2>Current Scheduled Files Uploaded</h2>
            <ScheduledFileGallery
              identityId={identityId}
              userEmail={userEmail}
              formattedScheduleDate={formattedScheduleDate}
            />
          </div>
        )}

        <div>
          <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
            <button type="button" onClick={() => navigate('/home')}>Home</button>
          </div>
        </div>

        {message && (
          <div>
            <h1>Media Bank</h1>
            <UploadFileGallery
              userEmail={userEmail}
              uploadedSelectedFiles={uploadedSelectedFiles}
              setUploadedSelectedFiles={setUploadedSelectedFiles}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button type="button" onClick={() => navigate('/home', { replace: true })} style={{ padding: '10px 20px' }}>
                Back
              </button>
              <button type="submit" style={{ padding: '10px 20px' }}>
                {editingMessage ? 'Update' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </form>
    </main>
  );
}

export default ScheduleMessageForm;
