import { useAuthenticator } from "@aws-amplify/ui-react";
import { FileUploader, StorageImage } from "@aws-amplify/ui-react-storage";
import "@aws-amplify/ui-react/styles.css";
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from "aws-amplify/data";
import { copy, getUrl, list, remove } from 'aws-amplify/storage';
import { format, parse } from "date-fns";
import DOMPurify from 'dompurify';
import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useLocation, useNavigate } from "react-router-dom";
import type { Schema } from "../amplify/data/resource";
import { processFile } from '../utils/utils';

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
  const [emailError, setEmailError] = useState("");
  const [uniqueDateError, setUniqueDateError] = useState("");
  const [scheduledMessages, setScheduledMessages] = useState<Array<Schema["ScheduledMessage"]["type"]>>([]);
  const [identityId, setIdentityId] = useState<string | undefined>();
  const [uploadedSelectedFiles, setUploadedSelectedFiles] = useState<string[]>([]); // State for selected files
  // const [formattedScheduleDate, setFormattedScheduleDate] = useState<string>(editingMessage?.scheduleDate || "");
  const [formattedScheduleDate, setFormattedScheduleDate] = useState<string>("");


  async function fetchIdentityId() {
    try {
      const session = await fetchAuthSession();
      setIdentityId(session.identityId);
    } catch (error) {
      console.error(`Error fetching identityId for user: ${userEmail}`, error);
    }
  }

  useEffect(() => {
    fetchIdentityId();
  }, []);

  useEffect(() => {
    if (user?.signInDetails?.loginId) {
      setUserEmail(user.signInDetails.loginId);
    }
  }, [user]);

  useEffect(() => {
    client.models.ScheduledMessage.observeQuery().subscribe({
      next: (data) => setScheduledMessages([...data.items]),
    });
  }, []);

  useEffect(() => {
    if (editingMessage?.scheduleDate) {
      setFormattedScheduleDate(editingMessage.scheduleDate);
    }
  }, [editingMessage]);

  const disabledDates = scheduledMessages.map((msg) =>
    parse(msg.scheduleDate, "MM-dd-yyyy", new Date())
  );

  // When user picks a date
  const handleDateChange = (date: Date | null) => {
    if (date) {
      setScheduleDate(date);
      setFormattedScheduleDate(format(date, "MM-dd-yyyy"));
    } else {
      setScheduleDate(null);
      setFormattedScheduleDate("");
    }
  };

  const FileGallery = () => {
    const [imageFilePaths, setImageFilePaths] = useState<string[]>([]);
    const [nonImageFilePaths, setNonImageFilePaths] = useState<string[]>([]);
    const [nonImageFileUrls, setNonImageFileUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
      // const filePath = `uploads/${identityId}/${userEmail}/${scheduleDate}/`;
      const filePath = `uploads/${identityId}/${userEmail}/${formattedScheduleDate}/`;
      const loadFiles = async () => {
        try {
          const result = await list({
            path: filePath,
            options: { listAll: true },
          });
          console.log(`Following files were loaded from S3: ${filePath} - files: `, result);

          if (!result.items) return;

          // Filter images
          const imageFiles = result.items
            .map((item) => item.path)
            .filter((file) => /\.(jpg|jpeg|png)$/i.test(file));

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
        console.log("Deleted file!:", filePath);

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
        <h3>Uploaded Image Files</h3>
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
                      type="button"
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

        <h3>Uploaded Non-Image Files</h3>
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
                      type="button"
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

  const UploadFileGallery = () => {

    const [uploadedImageFilePaths, setUploadedImageFilePaths] = useState<string[]>([]);
    const [uploadedNonImageFilePaths, setUploadedNonImageFilePaths] = useState<string[]>([]);
    const [uploadedNonImageFileUrls, setUploadedNonImageFileUrls] = useState<string[]>([]);
    const [uploadedLoading, setUploadedLoading] = useState<boolean>(true);
    useEffect(() => {
      const loadFiles = async () => {
        try {
          const result = await list({
            path: ({ identityId }) => `uploads/${identityId}/${userEmail}/form_uploads/`,
            options: { listAll: true },
          });

          if (!result.items) return;

          // Filter images
          const imageFiles = result.items
            .map((item) => item.path)
            .filter((file) => /\.(jpg|jpeg|png)$/i.test(file));

          setUploadedImageFilePaths(imageFiles);
          console.log("Uploaded image paths: ", imageFiles);

          // Filter non-image files
          const otherFiles = result.items
            .map((item) => item.path)
            .filter((file) => /\.(doc|docx|pdf|mp4)$/i.test(file));

          setUploadedNonImageFilePaths(otherFiles);
          console.log("Uploaded non-image file paths: ", otherFiles);

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

          setUploadedNonImageFileUrls(fileUrls.filter((url) => url !== null) as string[]);
        } catch (error) {
          console.error("Error loading files:", error);
        } finally {
          setUploadedLoading(false);
        }
      };

      loadFiles();
    }, []);

    // Handle checkbox toggle
    const handleCheckboxChange = (file: string) => {
      setUploadedSelectedFiles((prevSelected) => {
        const updatedSelection = prevSelected.includes(file)
          ? prevSelected.filter((selected) => selected !== file)
          : [...prevSelected, file];

        console.log("Updated selectedFiles array:", updatedSelection);

        return updatedSelection;
      });
    };


    return (
      <div>
        <h3>Image File Library</h3>
        {uploadedLoading ? (
          <p>Loading files...</p>
        ) : uploadedImageFilePaths.length > 0 ? (
          <table border={1} cellPadding="10" style={{ width: "100%", textAlign: "left" }}>
            <thead>
              <tr>
                <th>Select</th>
                <th>Preview</th>
                <th>Filename</th>
              </tr>
            </thead>
            <tbody>
              {uploadedImageFilePaths.map((file, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="checkbox"
                      checked={uploadedSelectedFiles.includes(file)}
                      onChange={() => handleCheckboxChange(file)}
                    />
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No images found.</p>
        )}

        <h3>Non-Image File Library </h3>
        {uploadedNonImageFilePaths.length > 0 ? (
          <table border={1} cellPadding="10" style={{ width: "100%", textAlign: "left" }}>
            <thead>
              <tr>
                <th>Select</th>
                <th>Preview Link</th>
                <th>Filename</th>
              </tr>
            </thead>
            <tbody>
              {uploadedNonImageFilePaths.map((file, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="checkbox"
                      checked={uploadedSelectedFiles.includes(file)}
                      onChange={() => handleCheckboxChange(file)}
                    />
                  </td>
                  <td>
                    <a href={uploadedNonImageFileUrls[index]} target="_blank" rel="noopener noreferrer">
                      View File
                    </a>
                  </td>
                  <td>{file.split("/").pop()}</td>
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


  async function checkExistingMessage(date: string) {
    if (!userEmail) return false;
    const existingMessages = await client.models.ScheduledMessage.list({
      filter: { userEmail: { eq: userEmail }, scheduleDate: { eq: date } },
    });
    return existingMessages.data.length > 0;
  }

  // async function handleDateChange(event: React.ChangeEvent<HTMLInputElement>) {
  //   const selectedDate = new Date(event.target.value);
  //   const today = new Date();
  //   today.setDate(today.getDate());

  //   if (selectedDate <= today) {
  //     setDateError("The scheduled date must be at least one day in the future.");
  //   } else {
  //     setDateError("");
  //   }
  //   setScheduleDate(event.target.value);
  // }

  async function handleRecipientsChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
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

    console.log("Uploading files to S3...", uploadedSelectedFiles);
    handleSelectedFiles(uploadedSelectedFiles)

    // if (dateError || emailError) {
    if (emailError) {
      alert("Please fix all errors before submitting.");
      return;
    }

    if (!userEmail) {
      alert("User email is required.");
      return;

    }
    try {
      if (editingMessage) {
        // TODO: remove this check since we are are disabling dates using date picker
        // const exists = await checkExistingMessage(scheduleDate);
        // if (exists) {
        //   setUniqueDateError("A message is already scheduled for this date. Edit the existing one.");
        //   return;
        // } else {
        //   setUniqueDateError("");
        // }
        // get session for itentityId (might not even need it since we are editing and updated)
        const session = await fetchAuthSession();
        const identityId = session.identityId;

        await client.models.ScheduledMessage.update({
          id: editingMessage.id,
          userEmail,
          // scheduleDate,
          scheduleDate: formattedScheduleDate,
          message,
          recipients: recipients.split(",").map((email: string) => email.trim()),
          // fileLocation: [`uploads/${identityId}/${userEmail}/${scheduleDate}/`]
          fileLocation: [`uploads/${identityId}/${userEmail}/${formattedScheduleDate}/`]
        });

        alert("Message updated successfully!");
        navigate("/home", { replace: true });
      } else {
        //TODO: fix, this may not be needed anymore since we disbale dates.
        // const exists = await checkExistingMessage(scheduleDate);
        const exists = await checkExistingMessage(formattedScheduleDate);
        if (exists) {
          setUniqueDateError("A message is already scheduled for this date. Edit the existing one.");
          return;
        } else {
          setUniqueDateError("");
        }
        // saving it to DB
        const response = await client.models.ScheduledMessage.create({
          userEmail,
          // scheduleDate,
          scheduleDate: formattedScheduleDate,
          message,
          messageStatus: "SCHEDULED",
          recipients: recipients.split(",").map((email: string) => email.trim()),
          identityId: identityId,
          fileLocation: [`uploads/${identityId}/${userEmail}/${formattedScheduleDate}/`]
          // fileLocation: [`uploads/${identityId}/${userEmail}/${scheduleDate}/`]
        });
        console.log("Item saved to DB", JSON.stringify(response))
        alert("Message scheduled successfully!");
      }

      navigate("/home", { replace: true });
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred. Please try again.");
    }
  }


  async function handleSelectedFiles(uploadedSelectedFiles: string[]) {

    if (uploadedSelectedFiles.length === 0) {
      return;
    }
    // Iterate over each selected file path
    for (const filePath of uploadedSelectedFiles) {
      try {
        // Define source and destination paths for the file copy
        const sourcePath = `${filePath}`;
        const parts = filePath.split('/');
        const uploadsFolder = parts[0];
        const identityId = parts[1];
        const userEmail = parts[2];
        // const formUploadString = parts[3];
        const fileName = parts[4];

        // const destinationPath = `${uploadsFolder}/${identityId}/${userEmail}/${scheduleDate}/${fileName}`;
        const destinationPath = `${uploadsFolder}/${identityId}/${userEmail}/${formattedScheduleDate}/${fileName}`;

        // Perform the copy operation
        const response = await copy({
          source: {
            path: sourcePath, // Source path
          },
          destination: {
            path: destinationPath, // Destination path
          },
        });

        console.log(`Successfully copied ${filePath} to shared bucket.`, response);
      } catch (error) {
        console.error(`Error copying file ${filePath}:`, error);
      }
    }

    alert("Files uploaded successfully!");
    window.location.reload();
  }

  return (
    <main>
      <h1>{editingMessage ? "Edit Scheduled Message" : "Schedule a Message"}</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <label>
          <p style={{ fontSize: "0.85rem", color: "#555", marginTop: "5px" }}>
            Some dates may be disabled because messages are already scheduled for those dates.
          </p>
          Schedule Date:
          {/* <DatePicker
            showIcon
            selected={scheduleDate}
            onChange={(date) => {
              if (date) {
                const formattedDate = format(date, "MM-dd-yyyy");
                setScheduleDate(formattedDate);
              } else {
                setScheduleDate(null);
              }
            }}
            minDate={new Date(Date.now() + 86400000)}
            isClearable={true}
            dateFormat="MM/dd/yyyy"
            excludeDates={disabledDates}
            placeholderText="Select a date"
          /> */}
          <DatePicker
            showIcon
            selected={scheduleDate}
            // onChange={(date) => {
            //   setScheduleDate(date); // store raw Date object
            // }}
            onChange={handleDateChange}
            minDate={new Date(Date.now() + 86400000)}
            isClearable={true}
            dateFormat="MM/dd/yyyy"
            excludeDates={disabledDates}
            placeholderText="Select a date"
          />
        </label>
        {/* {dateError && <p style={{ color: "red" }}>{dateError}</p>} */}
        {uniqueDateError && <p style={{ color: "red" }}>{uniqueDateError}</p>}

        {/* Recipients (To) Input */}
        <label>
          To (Emails, separated by commas):
          <textarea
            value={recipients}
            onChange={handleRecipientsChange}
            placeholder="example@example.com, another@example.com"
            required
            rows={3} // adjust rows as needed
            style={{ width: "100%" }} // optional: make it span the full width
          />
        </label>

        {emailError && (
          <p
            style={{
              color: "#d9534f", // less intense red (Bootstrap's 'danger' color)
              fontWeight: "bold", // make it bold
              textDecoration: "underline", // underline the text
            }}
          >
            {emailError}
          </p>
        )}

        {/* Message Input */}
        <label>
          Message:
          <textarea
            value={message}
            onChange={(e) => setMessage(DOMPurify.sanitize(e.target.value))}
            required
            rows={3}
            style={{ width: '100%' }}
          />
        </label>

        {/* File Uploader */}
        {message ? (
          <label>
            Upload Attachments:
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
              // path={({ identityId }) => `uploads/${identityId}/${userEmail}/${scheduleDate}/`}
              path={({ identityId }) => `uploads/${identityId}/${userEmail}/${formattedScheduleDate}/`}
              autoUpload={true}
              maxFileCount={5}
              maxFileSize={5000000} // 5MB
              processFile={processFile}
              isResumable
              // ref={ref}
              // TODO: add check for total file size since email has max size
              // maxFileSize={7500000} // about 7.5MB since Amazon SES max email size is 40MB
              displayText={{
                // some text are plain strings
                dropFilesText: 'Drop files here or',
                browseFilesText: 'Browse files',
                // others are functions that take an argument
                getFilesUploadedText: (count) => `${count} files uploaded`,
              }}
            />
          </label>
        ) : (
          <p
            style={{
              color: "#d9534f", // less intense red (Bootstrap's 'danger' color)
              fontWeight: "bold", // make it bold
              textDecoration: "underline", // underline the text
            }}>Please type a message before uploading files.</p>
        )}
        {editingMessage && (
          <div>
            <div>
              <h2>Current Scheduled Files Uploaded</h2>
              <FileGallery />
            </div>

          </div>
        )}

        {/* Buttons */}
        <div>
          {/* Forcing user to select date first before they can upload files */}
          <div style={{ position: "absolute", top: "10px", right: "10px" }}>
            <button type="button" onClick={() => navigate("/home")}>Home</button>
          </div>
        </div>
        {message && (
          <div>
            <h1>File Browser</h1>
            <UploadFileGallery />
            <div>
              {/* <button
                style={{ marginTop: "20px" }}
                onClick={() => handleSelectedFiles(uploadedSelectedFiles)}>
                Upload Selected Files and Submit
              </button> */}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
              <button type="button" onClick={() => navigate("/home", { replace: true })} style={{ padding: "10px 20px" }}>
                Back
              </button>
              <button type="submit" style={{ padding: "10px 20px" }}>
                {editingMessage ? "Update" : "Submit"}
              </button>
            </div>
          </div>
        )}
      </form>
    </main>
  );
}

export default ScheduleMessageForm;