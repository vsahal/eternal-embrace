import { StorageImage } from '@aws-amplify/ui-react-storage';
import '@aws-amplify/ui-react/styles.css';
import { getUrl, list, remove } from 'aws-amplify/storage';
import { useEffect, useState } from 'react';

interface ScheduledFileGalleryProps {
  identityId: string | undefined;
  userEmail: string | undefined;
  formattedScheduleDate: string;
}

const ScheduledFileGallery = ({ identityId, userEmail, formattedScheduleDate }: ScheduledFileGalleryProps) => {
  const [imageFilePaths, setImageFilePaths] = useState<string[]>([]);
  const [nonImageFilePaths, setNonImageFilePaths] = useState<string[]>([]);
  const [nonImageFileUrls, setNonImageFileUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!identityId || !userEmail || !formattedScheduleDate) return;
    const filePath = `uploads/${identityId}/${userEmail}/${formattedScheduleDate}/`;
    const loadFiles = async () => {
      try {
        const result = await list({ path: filePath, options: { listAll: true } });
        if (!result.items) return;

        const imageFiles = result.items.map(item => item.path).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
        setImageFilePaths(imageFiles);

        const otherFiles = result.items.map(item => item.path).filter(f => /\.(doc|docx|pdf|mp4)$/i.test(f));
        setNonImageFilePaths(otherFiles);

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
        setNonImageFileUrls(fileUrls.filter(url => url !== null) as string[]);
      } catch (error) {
        console.error('Error loading files:', error);
      } finally {
        setLoading(false);
      }
    };
    loadFiles();
  }, [identityId, userEmail, formattedScheduleDate]);

  const handleDelete = async (filePath: string) => {
    try {
      await remove({ path: filePath });
      setImageFilePaths(prev => prev.filter(f => f !== filePath));
      setNonImageFilePaths(prev => prev.filter(f => f !== filePath));
      setNonImageFileUrls(prev => prev.filter(url => !url.includes(filePath)));
    } catch (error) {
      console.error(`Error deleting file: ${filePath}`, error);
    }
  };

  return (
    <div>
      <h3>Uploaded Image Files</h3>
      {loading ? (
        <p>Loading files...</p>
      ) : imageFilePaths.length > 0 ? (
        <table border={1} cellPadding="10" style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr><th>Preview</th><th>Filename</th><th>Action</th></tr>
          </thead>
          <tbody>
            {imageFilePaths.map((file, i) => (
              <tr key={i}>
                <td>
                  <StorageImage alt={`Image ${i + 1}`} path={file} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
                </td>
                <td>{file.split('/').pop()}</td>
                <td>
                  <button type="button" onClick={() => handleDelete(file)} style={{ background: 'red', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No images found.</p>
      )}

      <h3>Uploaded Non-Image Files</h3>
      {nonImageFilePaths.length > 0 ? (
        <table border={1} cellPadding="10" style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr><th>Preview Link</th><th>Filename</th><th>Action</th></tr>
          </thead>
          <tbody>
            {nonImageFilePaths.map((file, i) => (
              <tr key={i}>
                <td><a href={nonImageFileUrls[i]} target="_blank" rel="noopener noreferrer">View File</a></td>
                <td>{file.split('/').pop()}</td>
                <td>
                  <button type="button" onClick={() => handleDelete(file)} style={{ background: 'red', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer' }}>
                    Delete
                  </button>
                </td>
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

export default ScheduledFileGallery;
