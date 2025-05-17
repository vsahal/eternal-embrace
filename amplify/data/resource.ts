import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
const SCHEDULED = 'SCHEDULED';
const SENT = 'SENT';
const USER_EMAIL = 'userEmail';
const SCHEDULE_DATE = 'scheduleDate';
const SIGNIFICANT_DATE = 'significantDate';
const FILE_PATH = 'filePath';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any user authenticated via an API key can "create", "read",
"update", and "delete" any "Todo" records.
=========================================================================*/
// const schema = a.schema({
//   Todo: a
//     .model({
//       content: a.string(),
//     }).authorization(allow => [allow.owner()]),
// });

// export type Schema = ClientSchema<typeof schema>;

// export const data = defineData({
//   schema,
//   authorizationModes: {
//     defaultAuthorizationMode: "userPool",
//     // API Key is used for a.allow.public() rules
//     apiKeyAuthorizationMode: {
//       expiresInDays: 30,
//     },
//   },
// });

// TODO make these all required?? does it make sense?
// since whenever this schema is updated all entries are deleted.
// need to make this flexible
const schema = a.schema({
  // DB for storing user's scheduled messages
  ScheduledMessage: a
    .model({
      id: a.id(),
      userEmail: a.email().required(),
      scheduleDate: a.string().required(),
      message: a.string().required(),
      recipients: a.string().array().required(), // Array of recipient emails
      // TODO add file/img code
      // fileKeys: a.string().array(), // Store S3 file keys as an array of strings
      identityId: a.string(), // Cognito identity ID
      messageStatus: a.enum([SCHEDULED, SENT]),
      fileLocation: a.string().array(), // S3 file location
    })
    // userEmail is primary key and scheduleDate is secondary key
    .identifier([USER_EMAIL, SCHEDULE_DATE])
    // FOR GSI
    .secondaryIndexes(index => [index(SCHEDULE_DATE)])
    .authorization(allow => [allow.owner()]), // Ensuring only the owner can access their messages

  // DB significant dates
  SignificantDates: a
    .model({
      id: a.id(),
      userEmail: a.email().required(),
      significantDate: a.string().required(),
      description: a.string().required(),
      identityId: a.string(), // Cognito identity ID
    })
    .identifier([USER_EMAIL, SIGNIFICANT_DATE])
    .secondaryIndexes(index => [index(USER_EMAIL)])
    .authorization(allow => [allow.owner()]), // Ensuring only the owner can access their messages

  // DB for file descriptions
  FileDescription: a
    .model({
      id: a.id(),
      userEmail: a.email().required(),
      filePath: a.string().required(), // S3 file key
      fileDescription: a.string().required(),
      fileType: a.string(), // e.g., "image/jpeg", "application/pdf"
      identityId: a.string(), // Cognito identity ID
      fileSize: a.string(), // Size of the file in bytes
    })
    .identifier([USER_EMAIL, FILE_PATH])
    .secondaryIndexes(index => [index(USER_EMAIL)])
    .authorization(allow => [allow.owner()]), // Ensuring only the owner can access their messages
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
  logging: {
    excludeVerboseContent: false,
    fieldLogLevel: 'all',
    retention: '3 months',
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
