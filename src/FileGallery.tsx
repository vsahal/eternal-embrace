import { StorageImage } from '@aws-amplify/ui-react-storage';
import '@aws-amplify/ui-react/styles.css';
import { generateClient } from 'aws-amplify/data';
import { getUrl, list, remove } from 'aws-amplify/storage';
import { useEffect, useState } from 'react';
import type { Schema } from '../amplify/data/resource';
import { isImageFile } from '../utils/utils';
import type { FileGalleryProps } from './constants';

const client = generateClient<Schema>();

const FileGallery: React.FC<FileGalleryProps> = ({
  userEmail,
  identityId,
  imageDescriptions,
  nonImageDescriptions,
  setImageDescriptions,
  setNonImageDescriptions,
  isDeleteEnabled,
}) => {
  const [imageFilePaths, setImageFilePaths] = useState<string[]>([]);
  const [nonImageFilePaths, setNonImageFilePaths] = useState<string[]>([]);
  const [nonImageFileUrls, setNonImageFileUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const handleDescriptionChange = (filename: string, value: string) => {
    if (isImageFile(filename)) {
      setImageDescriptions(prev => ({ ...prev, [filename]: value }));
    } else {
      setNonImageDescriptions(prev => ({ ...prev, [filename]: value }));
    }
  };

  const handleSubmitDescription = async (filename: string) => {
    if (!userEmail || !identityId) {
      console.error('userEmail or identityId is missing.');
      return;
    }
    const description = isImageFile(filename) ? imageDescriptions[filename] : nonImageDescriptions[filename];

    try {
      const response = await client.models.FileDescription.update({
        userEmail,
        filePath: filename,
        fileDescription: description || '',
        identityId,
      });
      console.log(`Description saved:`, response);
      alert(`Description saved!`);
    } catch (error) {
      console.error('Error saving description:', error);
    }
  };

  const handleDelete = async (filePath: string) => {
    if (!userEmail || !identityId) {
      console.error('userEmail or identityId is missing.');
      return;
    }
    try {
      await remove({ path: filePath });
      await client.models.FileDescription.delete({ userEmail, filePath });
      setImageFilePaths(prev => prev.filter(f => f !== filePath));
      setNonImageFilePaths(prev => prev.filter(f => f !== filePath));
      setNonImageFileUrls(prev => prev.filter(url => !url.includes(filePath)));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const result = await list({
          path: ({ identityId }) => `uploads/${identityId}/${userEmail}/form_uploads/`,
          options: { listAll: true },
        });

        if (!result.items) return;

        const imageFiles = result.items.map(item => item.path).filter(file => /\.(jpg|jpeg|png)$/i.test(file));
        const otherFiles = result.items.map(item => item.path).filter(file => /\.(doc|docx|pdf|mp4)$/i.test(file));

        setImageFilePaths(imageFiles);
        setNonImageFilePaths(otherFiles);

        const fileUrls = await Promise.all(
          otherFiles.map(async filePath => {
            const lastTwoParts = filePath.split('/').slice(-2).join('/');
            try {
              const link = await getUrl({
                path: ({ identityId }) => `uploads/${identityId}/${userEmail}/${lastTwoParts}`,
                options: {
                  bucket: 'scheduledMessagesFiles',
                  validateObjectExistence: true,
                  expiresIn: 600,
                  useAccelerateEndpoint: false,
                },
              });
              return link.url.toString();
            } catch (err) {
              console.error(`Error fetching URL for ${lastTwoParts}:`, err);
              return null;
            }
          })
        );

        setNonImageFileUrls(fileUrls.filter(url => url !== null) as string[]);
      } catch (err) {
        console.error('Error loading files:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, [userEmail, identityId]);

  return (
    <div>
      <h3 style={{ marginTop: '1rem' }}>
        <u>Images</u>
      </h3>
      {loading ? (
        <p>Loading files...</p>
      ) : imageFilePaths.length ? (
        <table border={1} cellPadding="10" style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr>
              <th>Preview</th>
              <th>Filename</th>
              <th>File Description</th>
              {isDeleteEnabled && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {imageFilePaths.map((file, i) => (
              <tr key={i}>
                <td>
                  <StorageImage
                    path={file}
                    alt={`Image ${i + 1}`}
                    style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }}
                  />
                </td>
                <td>{file.split('/').pop()}</td>
                <td>
                  <textarea
                    value={imageDescriptions[file] || ''}
                    onChange={e => handleDescriptionChange(file, e.target.value)}
                    rows={2}
                    style={{ width: '100%' }}
                  />
                  <button type="button" onClick={() => handleSubmitDescription(file)}>
                    Submit
                  </button>
                </td>
                {isDeleteEnabled && (
                  <td>
                    <button
                      type="button"
                      onClick={() => handleDelete(file)}
                      style={{
                        background: 'red',
                        color: 'white',
                        padding: '5px 10px',
                        border: 'none',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No images found.</p>
      )}

      <h3 style={{ marginTop: '3rem' }}>
        <u>All Other Media</u>
      </h3>
      {nonImageFilePaths.length ? (
        <table border={1} cellPadding="10" style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr>
              <th>Preview Link</th>
              <th>Filename</th>
              <th>File Description</th>
              {isDeleteEnabled && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {nonImageFilePaths.map((file, i) => (
              <tr key={i}>
                <td>
                  <a href={nonImageFileUrls[i]} target="_blank" rel="noopener noreferrer">
                    View File
                  </a>
                </td>
                <td>{file.split('/').pop()}</td>
                <td>
                  <textarea
                    value={nonImageDescriptions[file] || ''}
                    onChange={e => handleDescriptionChange(file, e.target.value)}
                    rows={2}
                    style={{ width: '100%' }}
                  />
                  <button type="button" onClick={() => handleSubmitDescription(file)}>
                    Submit
                  </button>
                </td>
                {isDeleteEnabled && (
                  <td>
                    <button
                      type="button"
                      onClick={() => handleDelete(file)}
                      style={{
                        background: 'red',
                        color: 'white',
                        padding: '5px 10px',
                        border: 'none',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                )}
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

export default FileGallery;
