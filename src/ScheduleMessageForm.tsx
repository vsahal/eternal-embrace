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

function ScheduleMessageForm() {
  const { user } = useAuthenticator();
  const navigate = useNavigate();
  const client = generateClient<Schema>();
  const location = useLocation();

  const editingMessage = location.state?.messageObj || null;

  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [scheduleDate, setScheduleDate] = useState(editingMessage?.scheduleDate || "");
  const [message, setMessage] = useState(editingMessage?.message || "");
  const [recipients, setRecipients] = useState(editingMessage?.recipients?.join(", ") || "");
  const [dateError, setDateError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [uniqueDateError, setUniqueDateError] = useState("");
  // const [uploadedFiles, setUploadedFiles] = useState<string[]>([]); // Store uploaded file paths
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]); // Store uploaded file paths
  const [confirmUpload, setConfirmUpload] = useState(false);
  const [identityId, setIdentityId] = useState<string | undefined>();

  async function fetchIdentityId() {
    try {
      const session = await fetchAuthSession();
      setIdentityId(session.identityId);
    } catch (error) {
      console.error(`Error fetching identityId for user: ${userEmail}`, error);
    }
  }

  fetchIdentityId();

  useEffect(() => {
    if (user?.signInDetails?.loginId) {
      setUserEmail(user.signInDetails.loginId);
    }
  }, [user]);


  const FileGallery = ({ filePath }: { filePath: string }) => {
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
            // path: ({ identityId }) => `uploads/${identityId}/${userEmail}/${scheduleDate}/`,
            path: filePath,
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
        window.location.reload();
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

        <h2>Current Scheduled Non-Image Files Uploaded</h2>
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

  // const UploadFileGallery = ({ filePath }: { filePath: string }) => {
  //   const [imageFilePaths, setImageFilePaths] = useState<string[]>([]);
  //   const [nonImageFilePaths, setNonImageFilePaths] = useState<string[]>([]);
  //   const [nonImageFileUrls, setNonImageFileUrls] = useState<string[]>([]);
  //   const [loading, setLoading] = useState<boolean>(true);
  //   const [selectedFiles, setSelectedFiles] = useState<string[]>([]); // State for selected files

  //   useEffect(() => {
  //     const loadFiles = async () => {
  //       try {
  //         const result = await list({
  //           path: filePath,
  //           options: { listAll: true },
  //         });

  //         if (!result.items) return;

  //         const imageFiles = result.items
  //           .map((item) => item.path)
  //           .filter((file) => /\.(jpg|jpeg|png|gif)$/i.test(file));

  //         setImageFilePaths(imageFiles);

  //         const otherFiles = result.items
  //           .map((item) => item.path)
  //           .filter((file) => /\.(doc|docx|pdf|mp4)$/i.test(file));

  //         setNonImageFilePaths(otherFiles);

  //         const fileUrls = await Promise.all(
  //           otherFiles.map(async (filePath) => {
  //             try {
  //               const linkToStorageFile = await getUrl({
  //                 path: ({ identityId }) =>
  //                   `uploads/${identityId}/${filePath.split("/").slice(-2).join("/")}`,
  //                 options: {
  //                   bucket: "scheduledMessagesFiles",
  //                   validateObjectExistence: true,
  //                   expiresIn: 600,
  //                   useAccelerateEndpoint: false,
  //                 },
  //               });
  //               return linkToStorageFile.url.toString();
  //             } catch (error) {
  //               console.error(`Error fetching URL for ${filePath}:`, error);
  //               return null;
  //             }
  //           })
  //         );

  //         setNonImageFileUrls(fileUrls.filter((url) => url !== null) as string[]);
  //       } catch (error) {
  //         console.error("Error loading files:", error);
  //       } finally {
  //         setLoading(false);
  //       }
  //     };

  //     loadFiles();
  //   }, []);

  //   // Handle checkbox toggle
  //   const handleCheckboxChange = (file: string) => {
  //     setSelectedFiles((prevSelected) => {
  //       const updatedSelection = prevSelected.includes(file)
  //         ? prevSelected.filter((selected) => selected !== file)
  //         : [...prevSelected, file];
    
  //       console.log("Updated selectedFiles array:", updatedSelection); // 🔹 Logging the selected files
    
  //       return updatedSelection;
  //     });
  //   };    

  //   // Handle file deletion
  //   const handleDelete = async (filePath: string) => {
  //     try {
  //       await remove({ path: filePath });
  //       setImageFilePaths((prev) => prev.filter((file) => file !== filePath));
  //       setNonImageFilePaths((prev) => prev.filter((file) => file !== filePath));
  //       setNonImageFileUrls((prev) => prev.filter((url) => !url.includes(filePath)));
  //       setSelectedFiles((prevSelected) => prevSelected.filter((file) => file !== filePath));
  //       window.location.reload();
  //     } catch (error) {
  //       console.error(`Error deleting file: ${filePath}`, error);
  //     }
  //   };

  //   return (
  //     <div>
  //       <h3>Uploaded Images</h3>
  //       {loading ? (
  //         <p>Loading files...</p>
  //       ) : imageFilePaths.length > 0 ? (
  //         <table border={1} cellPadding="10" style={{ width: "100%", textAlign: "left" }}>
  //           <thead>
  //             <tr>
  //               <th>Select</th>
  //               <th>Preview</th>
  //               <th>Filename</th>
  //               <th>Action</th>
  //             </tr>
  //           </thead>
  //           <tbody>
  //             {imageFilePaths.map((file, index) => (
  //               <tr key={index}>
  //                 <td>
  //                   <input
  //                     type="checkbox"
  //                     checked={selectedFiles.includes(file)}
  //                     onChange={() => handleCheckboxChange(file)}
  //                   />
  //                 </td>
  //                 <td>
  //                   <StorageImage
  //                     alt={`Image ${index + 1}`}
  //                     path={file}
  //                     style={{
  //                       width: "100px",
  //                       height: "100px",
  //                       objectFit: "cover",
  //                       borderRadius: "8px",
  //                     }}
  //                   />
  //                 </td>
  //                 <td>{file.split("/").pop()}</td>
  //                 <td>
  //                   <button
  //                     onClick={() => handleDelete(file)}
  //                     style={{
  //                       background: "red",
  //                       color: "white",
  //                       border: "none",
  //                       padding: "5px 10px",
  //                       cursor: "pointer",
  //                     }}
  //                   >
  //                     Delete
  //                   </button>
  //                 </td>
  //               </tr>
  //             ))}
  //           </tbody>
  //         </table>
  //       ) : (
  //         <p>No images found.</p>
  //       )}

  //       <h2>Current Scheduled Non-Image Files Uploaded</h2>
  //       {nonImageFilePaths.length > 0 ? (
  //         <table border={1} cellPadding="10" style={{ width: "100%", textAlign: "left" }}>
  //           <thead>
  //             <tr>
  //               <th>Select</th>
  //               <th>Preview Link</th>
  //               <th>Filename</th>
  //               <th>Action</th>
  //             </tr>
  //           </thead>
  //           <tbody>
  //             {nonImageFilePaths.map((file, index) => (
  //               <tr key={index}>
  //                 <td>
  //                   <input
  //                     type="checkbox"
  //                     checked={selectedFiles.includes(file)}
  //                     onChange={() => handleCheckboxChange(file)}
  //                   />
  //                 </td>
  //                 <td>
  //                   <a href={nonImageFileUrls[index]} target="_blank" rel="noopener noreferrer">
  //                     View File
  //                   </a>
  //                 </td>
  //                 <td>{file.split("/").pop()}</td>
  //                 <td>
  //                   <button
  //                     onClick={() => handleDelete(file)}
  //                     style={{
  //                       background: "red",
  //                       color: "white",
  //                       border: "none",
  //                       padding: "5px 10px",
  //                       cursor: "pointer",
  //                     }}
  //                   >
  //                     Delete
  //                   </button>
  //                 </td>
  //               </tr>
  //             ))}
  //           </tbody>
  //         </table>
  //       ) : (
  //         <p>No non-image files found.</p>
  //       )}
  //     </div>
  //   );
  // };



  async function handleSandbox() {
    // const linkToStorageFile = await getUrl({
    //   // identityId = 
    //   // path: ({identityId}) => `uploads/${identityId}/mogli3000@gmail.com/2025-02-27/spray-paint.jpg`,
    //   path: 'uploads/us-east-1:e349a6b9-5073-c655-a2ef-44b062d503e7/mogli3000@gmail.com/2025-02-27/spray-paint.jpg',
    //   options: {
    //     // specify a target bucket using name assigned in Amplify Backend
    //     bucket: 'scheduledMessagesFiles',
    //     // ensure object exists before getting url
    //     validateObjectExistence: true, 
    //     // url expiration time in seconds.
    //     expiresIn: 300,
    //     // whether to use accelerate endpoint
    //     useAccelerateEndpoint: false,
    //   }
    // });
    
    const output2 = await fetchAuthSession();

    // console.log(`sahalv LOGGING NOW the identityId: ${identityId}`);
    console.log('sahalv LOGGING signed output2: ', output2);
    
    
  }



  async function checkExistingMessage(date: string) {
    if (!userEmail) return false;
    const existingMessages = await client.models.ScheduledMessage.list({
      filter: { userEmail: { eq: userEmail }, scheduleDate: { eq: date } },
    });
    return existingMessages.data.length > 0;
  }

  function handleDateChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedDate = new Date(event.target.value);
    const today = new Date();
    today.setDate(today.getDate() + 1);

    if (selectedDate < today) {
      setDateError("The scheduled date must be at least one day in the future.");
    } else {
      setDateError("");
    }
    setScheduleDate(event.target.value);
  }

  function handleRecipientsChange(event: React.ChangeEvent<HTMLInputElement>) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailList = event.target.value.split(",").map((email) => email.trim());
    const invalidEmails = emailList.filter((email) => email.length > 0 && !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      setEmailError(`Invalid emails: ${invalidEmails.join(", ")}`);
    } else {
      setEmailError("");
    }
    setRecipients(event.target.value);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!confirmUpload) {
      alert("If attachments are added ensure they are uploaded before submitting the form!");
      setConfirmUpload(true);
      return;
    }


    if (dateError || emailError) {
      alert("Please fix all errors before submitting.");
      return;
    }

    if (!userEmail) {
      alert("User email is required.");
      return;

    }
    try {
      if (editingMessage) {
        const exists = await checkExistingMessage(scheduleDate);
        if (exists) {
          setUniqueDateError("A message is already scheduled for this date. Edit the existing one.");
          return;
        } else {
          setUniqueDateError("");
        }
        // get session for itentityId (might not even need it since we are editing and updated)
        // const session = await fetchAuthSession();
        // const identityId = session.identityId;

        await client.models.ScheduledMessage.update({
          id: editingMessage.id,
          userEmail,
          scheduleDate,
          message,
          recipients: recipients.split(",").map((email: string) => email.trim()),
          fileLocation: [`uploads/${identityId}/${userEmail}/${scheduleDate}/`]
        });

        alert("Message updated successfully!");
      } else {
        const exists = await checkExistingMessage(scheduleDate);
        if (exists) {
          setUniqueDateError("A message is already scheduled for this date. Edit the existing one.");
          return;
        } else {
          setUniqueDateError("");
        }

        // saving it to DB
        await client.models.ScheduledMessage.create({
          userEmail,
          scheduleDate,
          message,
          messageStatus: "SCHEDULED",
          recipients: recipients.split(",").map((email: string) => email.trim()),
          identityId: identityId,
          fileLocation: [`uploads/${identityId}/${userEmail}/${scheduleDate}/`]
        });

        // uploading files to s3
        // setUploadedFiles(event.target.files ? Array.from(event.target.files) : []);
        // setUploadedFiles(event.target.files?.[0])

        alert("Message scheduled successfully!");
      }

      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred. Please try again.");
    }
  }

  return (
    <main>
      <h1>{editingMessage ? "Edit Scheduled Message" : "Schedule a Message"}</h1>
      {/* <button onClick={handleSandbox} style={{ padding: "10px 20px", fontSize: "16px" }}>
        Click Me sandbox
      </button> */}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Schedule Date Input (Disabled when editing) */}
        <label>
          Schedule Date:
          {/* <input type="date" value={scheduleDate} onChange={handleDateChange} required disabled={!!editingMessage} /> */}
          <input type="date" value={scheduleDate} onChange={handleDateChange}/>
        </label>
        {dateError && <p style={{ color: "red" }}>{dateError}</p>}
        {uniqueDateError && <p style={{ color: "red" }}>{uniqueDateError}</p>}

        {/* Recipients (To) Input */}
        <label>
          To (Emails, separated by commas):
          <input
            type="text"
            value={recipients}
            onChange={handleRecipientsChange}
            placeholder="example@example.com, another@example.com"
            required
          />
        </label>
        {emailError && <p style={{ color: "red" }}>{emailError}</p>}

        {/* Message Input */}
        <label>
          Message:
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} required />
        </label>

        {/* File Uploader */}
        {scheduleDate ? (
        <label>
          Upload Attachments:
          <FileUploader
              acceptedFileTypes={[
                // you can list file extensions:
                '.gif',
                '.bmp',
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
            path={({ identityId }) => `uploads/${identityId}/${userEmail}/${scheduleDate}/`}
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

            {/* <Button onClick={() => ref.current.clearFiles()}>Clear Files</Button> */}

            {/* <div>
                <input type="file" onChange={handleChange} />
                <button onClick={handleClick}>Upload</button>
              </div> */}
          </label>
        ) : (
          <p style={{ color: 'red' }}>Please select a date before uploading files.</p>
        )}
        {editingMessage && (
          <div>
            <div>
            <h2>Current Scheduled Images Uploaded</h2>
            {/* <StorageImage alt="img" path={({ identityId }) => `uploads/${identityId}/${userEmail}/${scheduleDate}/spray-paint.jpg`} /> */}
            <FileGallery filePath={`uploads/${identityId}/${userEmail}/${scheduleDate}/`} />
            </div>

          </div>

        )}

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
          <button type="button" onClick={() => navigate("/", { replace: true })} style={{ padding: "10px 20px" }}>
            Back
          </button>
          <button type="submit" style={{ padding: "10px 20px" }}>
            {editingMessage ? "Update" : "Submit"}
          </button>
        </div>
        <div>
          <h1>File Browser</h1>
          {/* <UploadFileGallery filePath={`uploads/${identityId}/${userEmail}/form_uploads/`} /> */}

        </div>
      </form>
    </main>
  );
}

export default ScheduleMessageForm;