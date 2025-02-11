// V1 with no edit and delete function?



// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { generateClient } from "aws-amplify/data";
// import { useAuthenticator } from "@aws-amplify/ui-react";
// import type { Schema } from "../amplify/data/resource";

// function ScheduleMessageForm() {
//   const { user, signOut } = useAuthenticator();
//   const [userEmail, setUserEmail] = useState<string | undefined>();
//   const [scheduleDate, setScheduleDate] = useState("");
//   const [message, setMessage] = useState("");
//   // const [messageStatus, setMessageStatus] = useState("SCHEDULED");
//   // const [files, setFiles] = useState<File[]>([]);
//   const [recipients, setRecipients] = useState("");
//   const [dateError, setDateError] = useState(""); // For real-time date validation
//   const [emailError, setEmailError] = useState(""); // For real-time email validation
//   const navigate = useNavigate();
//   const client = generateClient<Schema>();

//   useEffect(() => {
//     if (user?.signInDetails?.loginId) {
//       setUserEmail(user.signInDetails.loginId);
//     }
//   }, [user]);


//   // Validates that the selected date is at least one day in the future
//   function handleDateChange(event: React.ChangeEvent<HTMLInputElement>) {
//     const selectedDate = new Date(event.target.value);
//     const today = new Date();
//     today.setDate(today.getDate() + 1); // Minimum valid date (tomorrow)

//     if (selectedDate < today) {
//       setDateError("The scheduled date must be at least one day in the future.");
//     } else {
//       setDateError("");
//     }

//     setScheduleDate(event.target.value);
//   }

//   // Validates the email field as the user types
//   function handleRecipientsChange(event: React.ChangeEvent<HTMLInputElement>) {
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     const emailList = event.target.value.split(",").map(email => email.trim());
//     const invalidEmails = emailList.filter(email => email && !emailRegex.test(email));

//     if (invalidEmails.length > 0) {
//       setEmailError(`Invalid emails: ${invalidEmails.join(", ")}`);
//     } else {
//       setEmailError("");
//     }

//     setRecipients(event.target.value);
//   }


//   async function handleSubmit(event: React.FormEvent) {
//     event.preventDefault();
  
//     // Prevent submission if there are errors
//     if (dateError || emailError) {
//       alert("Please fix all errors before submitting.");
//       return;
//     }
  
//     try {
//       // Upload files to S3 and store file keys
//       // const fileUploadPromises = files.map(async (file) => {
//       //   const fileKey = `uploads/${Date.now()}_${file.name}`; // Unique key for S3
//       //   await Storage.put(fileKey, file);
//       //   return fileKey;
//       // });
  
//       // const fileKeys = await Promise.all(fileUploadPromises);
      
//       // TODO This does not work
//       // setUserEmail(user?.signInDetails?.loginId);
//       console.log("sahalv LOGGING the userEmail:", userEmail);
//       console.log("sahalv LOGGING the scheduleDate:", scheduleDate);
//       console.log("sahalv LOGGING the message:", message);
//       console.log("sahalv LOGGING the recipients:", recipients);
      
//       // setMessageStatus("SCHEDULED");

//       if (!userEmail) {
//         throw new Error("User email is required to schedule a message.");
//       }

//       // Save form data to DynamoDB
//       await client.models.ScheduledMessage.create({
//         userEmail,
//         scheduleDate,
//         message,
//         messageStatus: "SCHEDULED",
//         recipients: recipients.split(",").map(email => email.trim()), // Convert string to array
//         // fileKeys,
//       });
  
//       alert("Message scheduled successfully!");
//       navigate("/", { replace: true });
  
//     } catch (error) {
//       console.error("Error submitting form:", error);
//       alert("An error occurred. Please try again.");
//     }
//   }
  

//   return (
//     <main>
//       <h1>Schedule a Message</h1>
//       <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        
//         {/* Schedule Date Input */}
//         <label>
//           Schedule Date:
//           <input type="date" value={scheduleDate} onChange={handleDateChange} required />
//         </label>
//         {dateError && <p style={{ color: "red" }}>{dateError}</p>} {/* Display date error if exists */}

//         {/* Recipients (To) Input */}
//         <label>
//           To (Emails, separated by commas):
//           <input type="text" value={recipients} onChange={handleRecipientsChange} placeholder="example@example.com, another@example.com" required />
//         </label>
//         {emailError && <p style={{ color: "red" }}>{emailError}</p>} {/* Display email error if exists */}

//         {/* Message Input */}
//         <label>
//           Message:
//           <textarea value={message} onChange={(e) => setMessage(e.target.value)} required />
//         </label>

        
//         {/* TODO next:
//         1. add check where you can only schedule one message a day
//         2. add support for files and s3 */}
//         {/* Multiple File Upload */}
//         {/* <label>
//           Upload Files:
//           <input type="file" accept="*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
//         </label>
//         {files.length > 0 && <p>Selected files: {files.map(file => file.name).join(", ")}</p>} Show selected files */}

//         {/* Button Container for Alignment */}
//         <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
//           <button type="button" onClick={() => navigate("/", { replace: true })} style={{ padding: "10px 20px" }}>
//             Back
//           </button>
//           <button type="submit" style={{ padding: "10px 20px" }}>
//             Submit
//           </button>
//         </div>
//       </form>
//     </main>
//   );
// }

// export default ScheduleMessageForm;



// V2 with edit and delete buttons

// import { useState, useEffect } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import { generateClient } from "aws-amplify/data";
// import { useAuthenticator } from "@aws-amplify/ui-react";
// import type { Schema } from "../amplify/data/resource";

// function ScheduleMessageForm() {
//   const { user, signOut } = useAuthenticator();
//   const navigate = useNavigate();
//   const client = generateClient<Schema>();
//   const location = useLocation(); // Get location state for editing

//   const editingMessage = location.state?.messageObj || null; // Check if we are editing

//   const [userEmail, setUserEmail] = useState<string | undefined>();
//   const [scheduleDate, setScheduleDate] = useState(editingMessage?.scheduleDate || "");
//   const [message, setMessage] = useState(editingMessage?.message || "");
//   const [recipients, setRecipients] = useState(editingMessage?.recipients?.join(", ") || "");
//   const [dateError, setDateError] = useState("");
//   const [emailError, setEmailError] = useState("");

//   useEffect(() => {
//     if (user?.signInDetails?.loginId) {
//       setUserEmail(user.signInDetails.loginId);
//     }
//   }, [user]);

//   // ✅ Ensure a message can only be scheduled once per day
//   async function checkExistingMessage(date: string) {
//     if (!userEmail) return false;
//     const existingMessages = await client.models.ScheduledMessage.list({
//       filter: { userEmail: { eq: userEmail }, scheduleDate: { eq: date } },
//     });
//     return existingMessages.data.length > 0;
//   }

//   // ✅ Validate date (should be at least one day in the future)
//   function handleDateChange(event: React.ChangeEvent<HTMLInputElement>) {
//     const selectedDate = new Date(event.target.value);
//     const today = new Date();
//     today.setDate(today.getDate() + 1);

//     if (selectedDate < today) {
//       setDateError("The scheduled date must be at least one day in the future.");
//     } else {
//       setDateError("");
//     }
//     setScheduleDate(event.target.value);
//   }

//   function handleRecipientsChange(event: React.ChangeEvent<HTMLInputElement>) {
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
//     // Explicitly type emailList as an array of strings
//     const emailList: string[] = event.target.value.split(",").map((email) => email.trim());
  
//     // Explicitly type email inside filter function
//     const invalidEmails = emailList.filter((email: string) => email.length > 0 && !emailRegex.test(email));
  
//     if (invalidEmails.length > 0) {
//       setEmailError(`Invalid emails: ${invalidEmails.join(", ")}`);
//     } else {
//       setEmailError("");
//     }
  
//     setRecipients(event.target.value);
//   }
  

//   // ✅ Handle form submission (Create or Update)
//   async function handleSubmit(event: React.FormEvent) {
//     event.preventDefault();

//     if (dateError || emailError) {
//       alert("Please fix all errors before submitting.");
//       return;
//     }

//     if (!userEmail) {
//       alert("User email is required.");
//       return;
//     }

//     try {
//       if (editingMessage) {
//         // 🔄 Update an existing message
//         await client.models.ScheduledMessage.update({
//           userEmail,
//           scheduleDate,
//           message,
//           // THROWS Parameter 'email' implicitly has an 'any' type
//           recipients: recipients.split(",").map((email: string) => email.trim()),
//         });

//         alert("Message updated successfully!");
//       } else {
//         // 🚀 Create a new message
//         const exists = await checkExistingMessage(scheduleDate);
//         if (exists) {
//           alert("A message is already scheduled for this date. Edit the existing one.");
//           return;
//         }

//         await client.models.ScheduledMessage.create({
//           userEmail,
//           scheduleDate,
//           message,
//           messageStatus: "SCHEDULED",
//           // THROWS Parameter 'email' implicitly has an 'any' type
//           recipients: recipients.split(",").map((email: string) => email.trim()),
//         });

//         alert("Message scheduled successfully!");
//       }

//       navigate("/", { replace: true });
//     } catch (error) {
//       console.error("Error submitting form:", error);
//       alert("An error occurred. Please try again.");
//     }
//   }

//   return (
//     <main>
//       <h1>{editingMessage ? "Edit Scheduled Message" : "Schedule a Message"}</h1>

//       <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
//         {/* Schedule Date Input (Disabled when editing) */}
//         <label>
//           Schedule Date:
//           <input type="date" value={scheduleDate} onChange={handleDateChange} required disabled={!!editingMessage} />
//         </label>
//         {dateError && <p style={{ color: "red" }}>{dateError}</p>}

//         {/* Recipients (To) Input */}
//         <label>
//           To (Emails, separated by commas):
//           <input
//             type="text"
//             value={recipients}
//             onChange={handleRecipientsChange}
//             placeholder="example@example.com, another@example.com"
//             required
//           />
//         </label>
//         {emailError && <p style={{ color: "red" }}>{emailError}</p>}

//         {/* Message Input */}
//         <label>
//           Message:
//           <textarea value={message} onChange={(e) => setMessage(e.target.value)} required />
//         </label>

//         {/* Buttons */}
//         <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
//           <button type="button" onClick={() => navigate("/", { replace: true })} style={{ padding: "10px 20px" }}>
//             Back
//           </button>
//           <button type="submit" style={{ padding: "10px 20px" }}>
//             {editingMessage ? "Update" : "Submit"}
//           </button>
//         </div>
//       </form>
//     </main>
//   );
// }

// export default ScheduleMessageForm;




// V3 with check to make sure only schedule one message per day

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { generateClient } from "aws-amplify/data";
import { useAuthenticator } from "@aws-amplify/ui-react";
import type { Schema } from "../amplify/data/resource";

function ScheduleMessageForm() {
  const { user, signOut } = useAuthenticator();
  const navigate = useNavigate();
  const client = generateClient<Schema>();
  const location = useLocation(); // Get location state for editing

  const editingMessage = location.state?.messageObj || null; // Check if we are editing

  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [scheduleDate, setScheduleDate] = useState(editingMessage?.scheduleDate || "");
  const [message, setMessage] = useState(editingMessage?.message || "");
  const [recipients, setRecipients] = useState(editingMessage?.recipients?.join(", ") || "");
  const [dateError, setDateError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [uniqueDateError, setUniqueDateError] = useState(""); // For unique date validation

  useEffect(() => {
    if (user?.signInDetails?.loginId) {
      setUserEmail(user.signInDetails.loginId);
    }
  }, [user]);

  // Ensure a message can only be scheduled once per day
  async function checkExistingMessage(date: string) {
    if (!userEmail) return false;
    const existingMessages = await client.models.ScheduledMessage.list({
      filter: { userEmail: { eq: userEmail }, scheduleDate: { eq: date } },
    });
    // gives error
    return existingMessages.data.length > 0;
  }

  // Validate date (should be at least one day in the future)
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

  // Handle form submission (Create or Update)
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
        // Update an existing message
        await client.models.ScheduledMessage.update({
          id: editingMessage.id,
          userEmail,
          scheduleDate,
          message,
          recipients: recipients.split(",").map((email: string) => email.trim()),
        });

        alert("Message updated successfully!");
      } else {
        // Create a new message
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