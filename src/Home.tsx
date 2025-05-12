import { useAuthenticator } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import { list, remove } from 'aws-amplify/storage';
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Schema } from "../amplify/data/resource";
import { SCHEDULED, ScheduledMessage, SENT } from "./constants";

const client = generateClient<Schema>();

function Home() {
  const { user, signOut } = useAuthenticator();
  const [scheduledMessages, setScheduledMessages] = useState<Array<Schema["ScheduledMessage"]["type"]>>([]);
  const [selectedMessage, setSelectedMessage] = useState<ScheduledMessage | null>(null); // Track the selected message for deletion
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false); // Track if the confirmation pop-up is open
  const navigate = useNavigate();


  useEffect(() => {
    client.models.ScheduledMessage.observeQuery().subscribe({
      next: (data) => setScheduledMessages([...data.items]),
    });
  }, []);

  const handleDelete = (message: ScheduledMessage) => {
    // Call the deleteScheduledMessage function for DB
    deleteScheduledMessageDB(message.userEmail, message.scheduleDate);
    // Call the deleteScheduledMessage function for S3
    deleteScheduledMessageS3(message);
    setIsConfirmationOpen(false); // Close the confirmation dialog after deletion
  };

  const openConfirmation = (messageObj: Schema["ScheduledMessage"]["type"]) => {
    const scheduledMessage: ScheduledMessage = {
      id: messageObj.id ?? '',
      userEmail: messageObj.userEmail,
      scheduleDate: messageObj.scheduleDate,
      message: messageObj.message,
      recipients: (messageObj.recipients || []).filter((r): r is string => r !== null),
      identityId: messageObj.identityId ?? '',
      messageStatus: messageObj.messageStatus ?? '',
      fileLocation: (messageObj.fileLocation || []).filter((r): r is string => r !== null),
      createdAt: messageObj.createdAt,
      updatedAt: messageObj.updatedAt,
      owner: messageObj.owner ?? '',
    };

    setSelectedMessage(scheduledMessage);
    setIsConfirmationOpen(true);
  };

  const closeConfirmation = () => {
    // Close the confirmation dialog without deletion
    setSelectedMessage(null);
    setIsConfirmationOpen(false);
  };

  async function deleteScheduledMessageDB(userEmail: string, scheduleDate: string) {
    console.log(`Deleting DB entry with userEmail: ${userEmail} and scheduleDate: ${scheduleDate}`);
    try {
      client.models.ScheduledMessage.delete({ userEmail, scheduleDate })
    } catch (error) {
      console.error(`Error deleting message from DB with userEmail: ${userEmail} and scheduleDate: ${scheduleDate}`, error);
    }
  }

  async function deleteScheduledMessageS3(message: ScheduledMessage) {
    console.log(`Deleting S3 files for ${JSON.stringify(message)}`);
    const filePath = `uploads/${message.identityId}/${message.userEmail}/${message.scheduleDate}/`
    const allFiles = await list({
      path: filePath,
      options: { listAll: true },
    });

    try {
      if (allFiles.items && allFiles.items.length > 0) {
        for (const file of allFiles.items) {
          await remove({ path: file.path });
          console.log(`Deleted: ${file.path}`);
        }
      }
    } catch (error) {
      console.error(`Error deleting S3 files for message ${JSON.stringify(message)}`, error);
    }
  }


  return (
    <main>
      <div style={{ position: "absolute", top: "10px", right: "10px" }}>
        <button onClick={() => navigate("/upload")}>Upload Files</button>
      </div>
      <div style={{ position: "absolute", top: "60px", right: "10px" }}>
        <button onClick={() => navigate("/schedule")}>Schedule a Message</button>
      </div>
      <div style={{ position: "absolute", top: "110px", right: "10px" }}>
        <button onClick={() => navigate("/dates")}>Add Significant Dates</button>
      </div>
      <div style={{ position: "absolute", top: "10px", left: "10px" }}>
        <button onClick={signOut}>Sign out</button>
      </div>

      {/* Table for SCHEDULED messages */}
      <h1>{`${user?.signInDetails?.loginId}'s Scheduled Messages`}</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid black" }}>
            <th style={{ padding: "10px", textAlign: "left" }}>Scheduled Date</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Recipients</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Message</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {scheduledMessages
            .filter((messageObj) => messageObj.messageStatus === SCHEDULED)
            .sort((a, b) => new Date(a.scheduleDate as string).getTime() - new Date(b.scheduleDate as string).getTime())
            .map((messageObj) => (
              <tr key={messageObj.id} style={{ borderBottom: "1px solid #ccc" }}>
                <td style={{ padding: "10px" }}>{messageObj.scheduleDate}</td>
                <td style={{ padding: "10px" }}>
                  {messageObj.recipients ? messageObj.recipients.join(", ") : "No recipients"}
                </td>
                <td style={{ padding: "10px" }}>{messageObj.message}</td>
                <td style={{ padding: "10px" }}>
                  <button onClick={() => openConfirmation(messageObj)}>Delete</button>
                  <button onClick={() => navigate("/schedule", { state: { messageObj } })}>Edit</button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <div style={{ marginBottom: "80px" }}></div>

      {/* Table for SENT messages */}
      <h1>{`${user?.signInDetails?.loginId}'s Sent Messages`}</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid black" }}>
            <th style={{ padding: "10px", textAlign: "left" }}>Sent Date</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Recipients</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Message</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {scheduledMessages
            .filter((messageObj) => messageObj.messageStatus === SENT)
            .sort((a, b) => new Date(a.scheduleDate as string).getTime() - new Date(b.scheduleDate as string).getTime())
            .map((messageObj) => (
              <tr key={messageObj.id} style={{ borderBottom: "1px solid #ccc" }}>
                <td style={{ padding: "10px" }}>{messageObj.scheduleDate}</td>
                <td style={{ padding: "10px" }}>
                  {messageObj.recipients ? messageObj.recipients.join(", ") : "No recipients"}
                </td>
                <td style={{ padding: "10px" }}>{messageObj.message}</td>
                <td style={{ padding: "10px" }}>
                  <button onClick={() => navigate("/schedule", { state: { messageObj } })}>View</button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {/* Confirmation Modal */}
      {isConfirmationOpen && selectedMessage && (
        <div style={{ position: "fixed", top: "0", left: "0", right: "0", bottom: "0", backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "8px",
              width: "300px",
            }}
          >
            <h3>Are you sure you want to delete this scheduled message?</h3>
            <p>
              <strong>Message:</strong> {selectedMessage.message}
            </p>
            <p>
              <strong>Scheduled Date:</strong> {selectedMessage.scheduleDate}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={closeConfirmation}>Cancel</button>
              <button
                onClick={() => handleDelete(selectedMessage)}
                style={{ backgroundColor: "red", color: "white" }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );

}

export default Home;


