import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import { useNavigate } from "react-router-dom";

const client = generateClient<Schema>();

function Home() {
  const { user, signOut } = useAuthenticator();
//   const { data: scheduleMessages } = await client.models.ScheduledMessage.list()
  const [scheduleMessage, setScheduleMessage] = useState<Array<Schema["ScheduledMessage"]["type"]>>([]);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null); // Track the selected message for deletion
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false); // Track if the confirmation pop-up is open
  const navigate = useNavigate();

  useEffect(() => {
    client.models.ScheduledMessage.observeQuery().subscribe({
      next: (data) => setScheduleMessage([...data.items]),
    });
  }, []);

  const handleDelete = (userEmail: string, scheduleDate: string) => {
    // Call the deleteScheduledMessage function
    deleteScheduledMessage(userEmail, scheduleDate);
    setIsConfirmationOpen(false); // Close the confirmation dialog after deletion
  };

  const openConfirmation = (messageObj: any) => {
    // Set the selected message for deletion and open the confirmation dialog
    setSelectedMessage(messageObj);
    setIsConfirmationOpen(true);
  };

  const closeConfirmation = () => {
    // Close the confirmation dialog without deletion
    setSelectedMessage(null);
    setIsConfirmationOpen(false);
  };

  function deleteScheduledMessage(userEmail: string, scheduleDate: string) {
    client.models.ScheduledMessage.delete({ userEmail, scheduleDate })
  }

return (
    <main>
    <h1>{user?.signInDetails?.loginId}'s Scheduled Messages</h1>

    <div style={{ position: "absolute", top: "10px", right: "10px" }}>
        <button onClick={() => navigate("/schedule")}>Schedule a Message</button>
    </div>

    <div style={{ position: "absolute", top: "10px", left: "10px" }}>
        <button onClick={signOut}>Sign out</button>
    </div>

    {/* Table for better readability */}
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
        {scheduleMessage.map((messageObj) => (
            <tr key={messageObj.id} style={{ borderBottom: "1px solid #ccc" }}>
            <td style={{ padding: "10px" }}>{messageObj.message}</td>
            <td style={{ padding: "10px" }}>{messageObj.scheduleDate}</td>
            <td style={{ padding: "10px" }}>
                {messageObj.recipients ? messageObj.recipients.join(", ") : "No recipients"}
            </td>
            <td style={{ padding: "10px" }}>
                {/* Add a delete button for each row */}
                <button onClick={() => openConfirmation(messageObj)}>Delete</button>
                <button onClick={() => navigate("/schedule", { state: { messageObj } })}>Edit</button>
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
                onClick={() => handleDelete(selectedMessage.userEmail, selectedMessage.scheduleDate)}
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


