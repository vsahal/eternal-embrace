import { StorageImage } from '@aws-amplify/ui-react-storage';
import '@aws-amplify/ui-react/styles.css';
import { getUrl, list } from 'aws-amplify/storage';
import React, { useEffect, useState } from 'react';

interface UploadFileGalleryProps {
  userEmail: string | undefined;
  uploadedSelectedFiles: string[];
  setUploadedSelectedFiles: React.Dispatch<React.SetStateAction<string[]>>;
}

const UploadFileGallery = ({ userEmail, uploadedSelectedFiles, setUploadedSelectedFiles }: UploadFileGalleryProps) => {
  const [uploadedImageFilePaths, setUploadedImageFilePaths] = useState<string[]>([]);
  const [uploadedNonImageFilePaths, setUploadedNonImageFilePaths] = useState<string[]>([]);
  const [uploadedNonImageFileUrls, setUploadedNonImageFileUrls] = useState<string[]>([]);
  const [uploadedLoading, setUploadedLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!userEmail) return;
    const loadFiles = async () => {
      try {
        const result = await list({
          path: ({ identityId }) => `uploads/${identityId}/${userEmail}/form_uploads/`,
          options: { listAll: true },
        });

        if (!result.items) return;

        const imageFiles = result.items.map(item => item.path).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
        setUploadedImageFilePaths(imageFiles);

        const otherFiles = result.items.map(item => item.path).filter(f => /\.(doc|docx|pdf|mp4)$/i.test(f));
        setUploadedNonImageFilePaths(otherFiles);

        const fileUrls = await Promise.all(
          otherFiles.map(async filePath => {
            const lastTwoParts = filePath.split('/').slice(-2).join('/');
            try {
              const link = await getUrl({
                path: ({ identityId }) => `uploads/${identityId}/${userEmail}/${lastTwoParts}`,
                options: { bucket: 'scheduledMessagesFiles', validateObjectExistence: true, expiresIn: 600, useAccelerateEndpoint: false },
              });
              return link.url.toString();
            } catch (error) {
              console.error(`Error fetching URL for ${lastTwoParts}:`, error);
              return null;
            }
          })
        );
        setUploadedNonImageFileUrls(fileUrls.filter(url => url !== null) as string[]);
      } catch (error) {
        console.error('Error loading files:', error);
      } finally {
        setUploadedLoading(false);
      }
    };
    loadFiles();
  }, [userEmail]);

  const handleCheckboxChange = (file: string) => {
    setUploadedSelectedFiles(prev =>
      prev.includes(file) ? prev.filter(f => f !== file) : [...prev, file]
    );
  };

  return (
    <div>
      <h3 style={{ marginTop: '1rem' }}><u>Images</u></h3>
      {uploadedLoading ? (
        <p>Loading files...</p>
      ) : uploadedImageFilePaths.length > 0 ? (
        <table border={1} cellPadding="10" style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr><th>Select</th><th>Preview</th><th>Filename</th></tr>
          </thead>
          <tbody>
            {uploadedImageFilePaths.map((file, i) => (
              <tr key={i}>
                <td>
                  <input type="checkbox" checked={uploadedSelectedFiles.includes(file)} onChange={() => handleCheckboxChange(file)} />
                </td>
                <td>
                  <StorageImage alt={`Image ${i + 1}`} path={file} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
                </td>
                <td>{file.split('/').pop()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No images found.</p>
      )}

      <h3 style={{ marginTop: '3rem' }}><u>All Other Media</u></h3>
      {uploadedNonImageFilePaths.length > 0 ? (
        <table border={1} cellPadding="10" style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr><th>Select</th><th>Preview Link</th><th>Filename</th></tr>
          </thead>
          <tbody>
            {uploadedNonImageFilePaths.map((file, i) => (
              <tr key={i}>
                <td>
                  <input type="checkbox" checked={uploadedSelectedFiles.includes(file)} onChange={() => handleCheckboxChange(file)} />
                </td>
                <td><a href={uploadedNonImageFileUrls[i]} target="_blank" rel="noopener noreferrer">View File</a></td>
                <td>{file.split('/').pop()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No non-image files found.</p>
      )}
    </div>
  );
};

export default UploadFileGallery;
