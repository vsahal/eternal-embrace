import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateClient } from "aws-amplify/data";
import { useAuthenticator } from "@aws-amplify/ui-react";
import type { Schema } from "../amplify/data/resource";

function ScheduleMessageForm() {
  const { user, signOut } = useAuthenticator();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [scheduleDate, setScheduleDate] = useState("");
  const [message, setMessage] = useState("");
  // const [messageStatus, setMessageStatus] = useState("SCHEDULED");
  // const [files, setFiles] = useState<File[]>([]);
  const [recipients, setRecipients] = useState("");
  const [dateError, setDateError] = useState(""); // For real-time date validation
  const [emailError, setEmailError] = useState(""); // For real-time email validation
  const navigate = useNavigate();
  const client = generateClient<Schema>();

  useEffect(() => {
    if (user?.signInDetails?.loginId) {
      setUserEmail(user.signInDetails.loginId);
    }
  }, [user]);


  // Validates that the selected date is at least one day in the future
  function handleDateChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedDate = new Date(event.target.value);
    const today = new Date();
    today.setDate(today.getDate() + 1); // Minimum valid date (tomorrow)

    if (selectedDate < today) {
      setDateError("The scheduled date must be at least one day in the future.");
    } else {
      setDateError("");
    }

    setScheduleDate(event.target.value);
  }

  // Validates the email field as the user types
  function handleRecipientsChange(event: React.ChangeEvent<HTMLInputElement>) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailList = event.target.value.split(",").map(email => email.trim());
    const invalidEmails = emailList.filter(email => email && !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      setEmailError(`Invalid emails: ${invalidEmails.join(", ")}`);
    } else {
      setEmailError("");
    }

    setRecipients(event.target.value);
  }


  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
  
    // Prevent submission if there are errors
    if (dateError || emailError) {
      alert("Please fix all errors before submitting.");
      return;
    }
  
    try {
      // Upload files to S3 and store file keys
      // const fileUploadPromises = files.map(async (file) => {
      //   const fileKey = `uploads/${Date.now()}_${file.name}`; // Unique key for S3
      //   await Storage.put(fileKey, file);
      //   return fileKey;
      // });
  
      // const fileKeys = await Promise.all(fileUploadPromises);
      
      // TODO This does not work
      // setUserEmail(user?.signInDetails?.loginId);
      console.log("sahalv LOGGING the userEmail:", userEmail);
      console.log("sahalv LOGGING the scheduleDate:", scheduleDate);
      console.log("sahalv LOGGING the message:", message);
      console.log("sahalv LOGGING the recipients:", recipients);
      
      // setMessageStatus("SCHEDULED");

      if (!userEmail) {
        throw new Error("User email is required to schedule a message.");
      }

      // Save form data to DynamoDB
      await client.models.ScheduledMessage.create({
        userEmail,
        scheduleDate,
        message,
        messageStatus: "SCHEDULED",
        recipients: recipients.split(",").map(email => email.trim()), // Convert string to array
        // fileKeys,
      });
  
      alert("Message scheduled successfully!");
      navigate("/", { replace: true });
  
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred. Please try again.");
    }
  }
  

  return (
    <main>
      <h1>Schedule a Message</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        
        {/* Schedule Date Input */}
        <label>
          Schedule Date:
          <input type="date" value={scheduleDate} onChange={handleDateChange} required />
        </label>
        {dateError && <p style={{ color: "red" }}>{dateError}</p>} {/* Display date error if exists */}

        {/* Recipients (To) Input */}
        <label>
          To (Emails, separated by commas):
          <input type="text" value={recipients} onChange={handleRecipientsChange} placeholder="example@example.com, another@example.com" required />
        </label>
        {emailError && <p style={{ color: "red" }}>{emailError}</p>} {/* Display email error if exists */}

        {/* Message Input */}
        <label>
          Message:
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} required />
        </label>

        {/* Multiple File Upload */}
        {/* <label>
          Upload Files:
          <input type="file" accept="*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
        </label>
        {files.length > 0 && <p>Selected files: {files.map(file => file.name).join(", ")}</p>} Show selected files */}

        {/* Button Container for Alignment */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
          <button type="button" onClick={() => navigate("/", { replace: true })} style={{ padding: "10px 20px" }}>
            Back
          </button>
          <button type="submit" style={{ padding: "10px 20px" }}>
            Submit
          </button>
        </div>
      </form>
    </main>
  );
}

export default ScheduleMessageForm;
