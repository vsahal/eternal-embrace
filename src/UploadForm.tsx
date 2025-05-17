import { useAuthenticator } from '@aws-amplify/ui-react';
import { FileUploader } from '@aws-amplify/ui-react-storage';
import '@aws-amplify/ui-react/styles.css';
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Schema } from '../amplify/data/resource';
import { isImageFile, processFile } from '../utils/utils';
import FileGallery from './FileGallery';

function UploadForm() {
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const { user } = useAuthenticator();
  const navigate = useNavigate();
  const [identityId, setIdentityId] = useState<string | undefined>();
  const [imageDescriptions, setImageDescriptions] = useState<Record<string, string>>({});
  const [nonImageDescriptions, setNonImageDescriptions] = useState<Record<string, string>>({});
  const [fileDescription, setFileDescription] = useState<Array<Schema['FileDescription']['type']>>([]);
  const client = generateClient<Schema>();

  useEffect(() => {
    if (user?.signInDetails?.loginId) {
      setUserEmail(user.signInDetails.loginId);
    }
  }, [user]);

  async function fetchIdentityId() {
    try {
      const session = await fetchAuthSession();
      setIdentityId(session.identityId);
    } catch (error) {
      console.error(`Error fetching identityId for user: ${userEmail}`, error);
    }
  }

  useEffect(() => {
    if (!userEmail) return; // only run if userEmail is defined

    const fetchIdentity = async () => {
      try {
        await fetchIdentityId();
      } catch (error) {
        console.error('Failed to fetch identityId:', error);
      }
    };

    fetchIdentity();
  }, [userEmail]);

  useEffect(() => {
    client.models.FileDescription.observeQuery().subscribe({
      next: data => {
        setFileDescription([...data.items]);

        const imageDescription: Record<string, string> = {};
        const nonImageDescription: Record<string, string> = {};

        data.items.forEach(item => {
          if (item.fileType === 'IMAGE') {
            imageDescription[item.filePath] = item.fileDescription;
          } else {
            nonImageDescription[item.filePath] = item.fileDescription;
          }
        });

        setImageDescriptions(imageDescription);
        setNonImageDescriptions(nonImageDescription);
      },
    });
  }, []);

  return (
    <main style={{ paddingTop: '20px' }}>
      <div>
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <button onClick={() => navigate('/home')}>Home</button>
        </div>
        <h1>Upload Files</h1>
        <FileUploader
          acceptedFileTypes={[
            // you can list file extensions:
            '.doc',
            '.docx',
            '.jpeg',
            '.jpg',
            '.pdf',
            // or MIME types:
            'image/png',
            'video/*',
          ]}
          // path={({ identityId }) => `uploads/${userEmail}/${scheduleDate}/`}
          path={({ identityId }) => `uploads/${identityId}/${userEmail}/form_uploads/`}
          // path=`uploads/${userEmail}/${scheduleDate}/${file.name}`
          autoUpload={true}
          maxFileCount={10}
          isResumable
          processFile={processFile}
          onUploadSuccess={({ key }) => {
            // ensure identityId and userEmail are defined
            if (!identityId || !userEmail || !key) return;
            const isImageFileType = isImageFile(key);
            client.models.FileDescription.create({
              userEmail: userEmail,
              filePath: key,
              fileDescription: '',
              identityId: identityId,
              fileType: isImageFileType ? 'IMAGE' : 'NON-IMAGE',
            });
          }}
          // ref={ref}
          // TODO: add check for total file size since Amazon SES has a max email size of 40MB
          maxFileSize={5000000} // about 5MB since Amazon SES max email size is 40MB
          displayText={{
            // some text are plain strings
            dropFilesText: 'Drop files here or',
            browseFilesText: 'Browse files',
            // others are functions that take an argument
            getFilesUploadedText: count => `${count} files uploaded`,
          }}
        />
        <h1>Current Uploaded Media</h1>
        {userEmail && identityId ? (
          <FileGallery
            userEmail={userEmail}
            identityId={identityId}
            imageDescriptions={imageDescriptions}
            setImageDescriptions={setImageDescriptions}
            nonImageDescriptions={nonImageDescriptions}
            setNonImageDescriptions={setNonImageDescriptions}
            isDeleteEnabled={true}
          />
        ) : (
          <p>Loading files...</p>
        )}
      </div>
    </main>
  );
}

export default UploadForm;
