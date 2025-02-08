import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import { useNavigate } from "react-router-dom";
// import TodoCreateForm from "../ui-components/TodoCreateForm.jsx";

const client = generateClient<Schema>();

function Home() {
  const { user, signOut } = useAuthenticator();
  const [scheduleMessage, setScheduleMessage] = useState<Array<Schema["ScheduledMessage"]["type"]>>([]);
  const navigate = useNavigate();

  useEffect(() => {
    client.models.ScheduledMessage.observeQuery().subscribe({
      next: (data) => setScheduleMessage([...data.items]),
    });
  }, []);

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
          <li key={messageObj.id}>{messageObj.userEmail} {"|"} {messageObj.message} {"|"} {messageObj.scheduleDate} {"|"} {messageObj.recipients}</li>
        ))} 
      </ul>
      <div>
        <br />
      </div>
    </main>
  );
}

export default Home;


// TODO: maybe use this to show the message scheduled? need to show all
// the message info
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
