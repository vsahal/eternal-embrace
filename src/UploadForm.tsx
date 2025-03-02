import { useState, useEffect, ReactElement } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { generateClient } from "aws-amplify/data";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { FileUploader } from "@aws-amplify/ui-react-storage";
import { Button } from '@aws-amplify/ui-react';
import "@aws-amplify/ui-react/styles.css";
import { uploadData } from 'aws-amplify/storage';
import { StorageImage } from '@aws-amplify/ui-react-storage';
import { getCurrentUser } from 'aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import { list } from 'aws-amplify/storage';
import { remove } from 'aws-amplify/storage';
import type { Schema } from "../amplify/data/resource";
import { getUrl } from 'aws-amplify/storage';
import { fetchUserAttributes } from 'aws-amplify/auth';



function UploadForm() {

    const FileGallery = () => {
        const [imageFilePaths, setImageFilePaths] = useState<string[]>([]);
        const [nonImageFilePaths, setNonImageFilePaths] = useState<string[]>([]);
        const [nonImageFileUrls, setNonImageFileUrls] = useState<string[]>([]);
        const [loading, setLoading] = useState<boolean>(true);
    
        useEffect(() => {
          const loadFiles = async () => {
            try {
              const { username, userId, signInDetails } = await getCurrentUser();
              const session = await fetchAuthSession();
    
              const result = await list({
                path: ({ identityId }) => `uploads/${identityId}/${userEmail}/form_uploads/`,
                options: { listAll: true },
              });
    
              if (!result.items) return;
    
              // Filter images
              const imageFiles = result.items
                .map((item) => item.path)
                .filter((file) => /\.(jpg|jpeg|png|gif)$/i.test(file));
    
              setImageFilePaths(imageFiles);
              console.log("Image paths: ", imageFiles);
    
              // Filter non-image files
              const otherFiles = result.items
                .map((item) => item.path)
                .filter((file) => /\.(doc|docx|pdf|mp4)$/i.test(file));
    
              setNonImageFilePaths(otherFiles);
              console.log("Non-image file paths: ", otherFiles);
    
              // Fetch storage URLs in parallel
              const fileUrls = await Promise.all(
                otherFiles.map(async (filePath) => {
                  // spliting so we can get last part of the path since you need to pass in
                  // identityId in a ceratin way or u get 403
                  const parts = filePath.split("/");
                  const lastTwoParts = parts.slice(-2).join("/");
    
                  console.log(`Extracted last two parts: ${lastTwoParts}`);
    
                  try {
                    const linkToStorageFile = await getUrl({
                      path: ({ identityId }) => `uploads/${identityId}/${userEmail}/${lastTwoParts}`,
                      options: {
                        bucket: "scheduledMessagesFiles",
                        validateObjectExistence: true,
                        expiresIn: 600,
                        useAccelerateEndpoint: false,
                      },
                    });
    
                    return linkToStorageFile.url.toString();
                  } catch (error) {
                    console.error(`Error fetching URL for ${lastTwoParts}:`, error);
                    return null;
                  }
                })
              );
    
              setNonImageFileUrls(fileUrls.filter((url) => url !== null) as string[]);
            } catch (error) {
              console.error("Error loading files:", error);
            } finally {
              setLoading(false);
            }
          };
    
          loadFiles();
        }, []);
    
        // Handle file deletion
        const handleDelete = async (filePath: string) => {
          try {
            await remove({ path: filePath }); // Delete from S3
            console.log("Deleted file:", filePath);
    
            // Remove from state
            setImageFilePaths((prev) => prev.filter((file) => file !== filePath));
            setNonImageFilePaths((prev) => prev.filter((file) => file !== filePath));
            setNonImageFileUrls((prev) => prev.filter((url) => !url.includes(filePath)));
          } catch (error) {
            console.error(`Error deleting file: ${filePath}`, error);
          }
        };
    
        return (
          <div>
            <h3>Uploaded Images</h3>
            {loading ? (
              <p>Loading files...</p>
            ) : imageFilePaths.length > 0 ? (
              <table border={1} cellPadding="10" style={{ width: "100%", textAlign: "left" }}>
                <thead>
                  <tr>
                    <th>Preview</th>
                    <th>Filename</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {imageFilePaths.map((file, index) => (
                    <tr key={index}>
                      <td>
                        <StorageImage
                          alt={`Image ${index + 1}`}
                          path={file}
                          style={{
                            width: "100px",
                            height: "100px",
                            objectFit: "cover",
                            borderRadius: "8px",
                          }}
                        />
                      </td>
                      <td>{file.split("/").pop()}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(file)}
                          style={{
                            background: "red",
                            color: "white",
                            border: "none",
                            padding: "5px 10px",
                            cursor: "pointer",
                          }}
                        >
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
    
            <h2>Current Non-Image Files Uploaded</h2>
            {nonImageFilePaths.length > 0 ? (
              <table border={1} cellPadding="10" style={{ width: "100%", textAlign: "left" }}>
                <thead>
                  <tr>
                    <th>Preview Link</th>
                    <th>Filename</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {nonImageFilePaths.map((file, index) => (
                    <tr key={index}>
                      <td>
                        <a href={nonImageFileUrls[index]} target="_blank" rel="noopener noreferrer">
                          View File
                        </a>
                      </td>
                      <td>{file.split("/").pop()}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(file)}
                          style={{
                            background: "red",
                            color: "white",
                            border: "none",
                            padding: "5px 10px",
                            cursor: "pointer",
                          }}
                        >
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
    const [userEmail, setUserEmail] = useState<string | undefined>();

    const { user } = useAuthenticator();
    const navigate = useNavigate();
    const client = generateClient<Schema>();
    useEffect(() => {
        if (user?.signInDetails?.loginId) {
          setUserEmail(user.signInDetails.loginId);
        }
    }, [user]);

    return (
        <main style={{ paddingTop: "20px" }}>
            <div>
                <div style={{ position: "absolute", top: "10px", right: "10px" }}>
                    <button onClick={() => navigate("/home")}>Home</button>
                </div>
                <h1>Upload Files</h1>
                <FileUploader
                    acceptedFileTypes={[
                        // you can list file extensions:
                        '.gif',
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
                    autoUpload={false}
                    maxFileCount={5}
                    isResumable
                    // ref={ref}
                    // TODO: add check for total file size since Amazon SES has a max email size of 40MB
                    // maxFileSize={7500000} // about 7.5MB since Amazon SES max email size is 40MB
                    displayText={{
                    // some text are plain strings
                    dropFilesText: 'Drop files here or',
                    browseFilesText: 'Browse files',
                    // others are functions that take an argument
                        getFilesUploadedText: (count) => `${count} files uploaded`,
                    }}
            />
            <h1>Current Uploaded Media</h1>
            <FileGallery />
            </div>
        </main>
    );
    
}

export default UploadForm;