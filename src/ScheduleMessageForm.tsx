import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { generateClient } from "aws-amplify/data";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { FileUploader } from "@aws-amplify/ui-react-storage";
import { Button } from '@aws-amplify/ui-react';
import "@aws-amplify/ui-react/styles.css";

import type { Schema } from "../amplify/data/resource";

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
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]); // Store uploaded file paths

  useEffect(() => {
    if (user?.signInDetails?.loginId) {
      setUserEmail(user.signInDetails.loginId);
    }
  }, [user]);

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
        await client.models.ScheduledMessage.update({
          id: editingMessage.id,
          userEmail,
          scheduleDate,
          message,
          recipients: recipients.split(",").map((email: string) => email.trim()),
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

        await client.models.ScheduledMessage.create({
          userEmail,
          scheduleDate,
          message,
          messageStatus: "SCHEDULED",
          recipients: recipients.split(",").map((email: string) => email.trim()),
        });

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

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Schedule Date Input (Disabled when editing) */}
        <label>
          Schedule Date:
          <input type="date" value={scheduleDate} onChange={handleDateChange} required disabled={!!editingMessage} />
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
        <label>
          Upload Attachments:
          <FileUploader
              acceptedFileTypes={[
                // you can list file extensions:
                '.gif',
                '.bmp',
                '.doc',
                '.jpeg',
                '.jpg',
                // or MIME types:
                'image/png',
                'video/*',
              ]}
            path={({ identityId }) => `uploads/${identityId}/`} 
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
              getFilesUploadedText(count) {
                return `${count} images uploaded`;
              },
            }}
          />
          {/* <Button onClick={() => ref.current.clearFiles()}>Clear Files</Button> */}

        </label>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
          <button type="button" onClick={() => navigate("/", { replace: true })} style={{ padding: "10px 20px" }}>
            Back
          </button>
          <button type="submit" style={{ padding: "10px 20px" }}>
            {editingMessage ? "Update" : "Submit"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default ScheduleMessageForm;
