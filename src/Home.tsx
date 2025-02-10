import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import { useNavigate } from "react-router-dom";
// import TodoCreateForm from "../ui-components/TodoCreateForm.jsx";

const client = generateClient<Schema>();

function Home() {
  const { user, signOut } = useAuthenticator();
//   const { data: scheduleMessages } = await client.models.ScheduledMessage.list()
  const [scheduleMessage, setScheduleMessage] = useState<Array<Schema["ScheduledMessage"]["type"]>>([]);
  const navigate = useNavigate();

  useEffect(() => {
    client.models.ScheduledMessage.observeQuery().subscribe({
      next: (data) => setScheduleMessage([...data.items]),
    });
  }, []);

//   async function test() {
//     // TODO: maybe use this to show the message scheduled? need to show all
// // the message info
//     const { data: messageObj } = await client.models.ScheduledMessage.list()
    
//     return <ul>{messageObj.map(messageObj =>  <li key={messageObj.id}>{messageObj.userEmail} {"|"} {messageObj.message} {"|"} {messageObj.scheduleDate} {"|"} {messageObj.recipients}</li>)}</ul>

//   }

//   function createScheduledMessage() {
//     const content = window.prompt("ScheduledMessage content");
    
//     // Prevent creating a todo if user clicks "Cancel" or enters an empty string
//     if (!content) return;
  
//     client.models.ScheduledMessage.create({ content });
//   }

//   function deleteTodo(id: string) {
//     client.models.ScheduledMessage.delete({ id })
//   }

//   function viewForm() {
//     // return <TodoCreateForm />;
//     return (
//       <h1>Hi</h1>
//     )
//   }



  return (
    <main>
        {/* TODO: this works */}
      <h1>{user?.signInDetails?.loginId}'s scheduled messages</h1>
      <div style={{ position: "absolute", top: "10px", right: "10px" }}>
        {/* <button onClick={createTodo}>Schedule new message</button> */}
        <button onClick={() => navigate("/schedule")}>Schedule a Message</button>
      </div>
      <div style={{ position: "absolute", top: "10px", left: "10px" }}>
        <button onClick={signOut}>Sign out</button>
      </div>
      <ul>
        {scheduleMessage.map((messageObj) => (
            // TODO update so that each component has its own block
          <li >{messageObj.message} {"|"} {messageObj.scheduleDate} {"|"} {messageObj.recipients}</li>
        ))} 
        {/* <ul>{scheduleMessages.map(scheduleMessage => <li key={scheduleMessage.id}>{scheduleMessage.message}</li>)}</ul> */}
      </ul>
      <div>
        <br />
      </div>
    </main>
  );
}

export default Home;


