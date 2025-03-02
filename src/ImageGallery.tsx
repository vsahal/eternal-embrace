import { useState, useEffect } from "react";
import { StorageImage } from "@aws-amplify/ui-react-storage";
import { list } from 'aws-amplify/storage';
import { remove } from 'aws-amplify/storage';
import { getCurrentUser } from "aws-amplify/auth";
import { fetchAuthSession } from 'aws-amplify/auth';

interface ImageGalleryProps {
  userEmail: string;
  scheduleDate: string;
}

export const ImageGallery = ({ userEmail, scheduleDate }: ImageGalleryProps) => {
  const [imgFilePaths, setImageFilePaths] = useState<string[]>([]);
  const [nonImgFilePaths, setNonImageFilePaths] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadImages() {
      try {
        const { username, userId, signInDetails } = await getCurrentUser();
        const session = await fetchAuthSession();
        
        // Load all file paths from the S3 bucket
        const result = await list({
          path: ({ identityId }) => `uploads/${identityId}/${userEmail}/${scheduleDate}/`,
          options: {
            listAll: true,
          },
        });
        
        // TODO name these variables better
        // Load image files from paths 
        const filePaths = result.items 
          ? result.items
              .map((item) => item.path)
              .filter((file) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) // Filter images only
          : [];
        setImageFilePaths(filePaths);
        
        // Load non-image files from paths
        const otherFilePaths = result.items 
          ? result.items
              .map((item) => item.path)
              .filter((file) => /\.(bmp|doc|docx|pdf|mp3|mp4)$/i.test(file)) // Filter images only
          : [];
        setNonImageFilePaths(otherFilePaths);
          
      } catch (error) {
        // TODO: log better
        console.error("Error loading images:", error);
      } finally {
        setLoading(false);
      }
    }

    loadImages();
  }, [userEmail, scheduleDate]);

    const handleDelete = async (filePath: string) => {
      try {
        //TODO use amplify API and remove file
        await remove({
          path: filePath
      }); // Delete from S3
        console.log("deleted file-", filePath);
        setImageFilePaths(imgFilePaths.filter(file => file !== filePath)); // Remove from state
      } catch (error) {
        console.error(`Deleting file: ${filePath}`, error);
      }
    };

  return (
    <div>
      <h3>Uploaded Images</h3>
      {loading ? <p>Loading...</p> : imgFilePaths.length > 0 ? (
        <table>
          <tbody>
            {imgFilePaths.map((file, index) => (
              <tr key={index}>
                <td><StorageImage alt={`Image ${index + 1}`} path={file} /></td>
                <td>{file.split("/").pop()}</td>
                <td><button onClick={() => handleDelete(file)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p>No images found.</p>}
    </div>
  );
};
