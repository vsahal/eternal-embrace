// Constants

export interface ScheduledMessage {
  id: string;
  userEmail: string;
  scheduleDate: string;
  message: string;
  recipients: string[];
  identityId: string;
  messageStatus: string;
  fileLocation: string[];
  createdAt: string;
  updatedAt: string;
  owner: string;
  __typename?: string;
}

export interface FileGalleryProps {
  userEmail?: string;
  identityId?: string;
  imageDescriptions: Record<string, string>;
  nonImageDescriptions: Record<string, string>;
  setImageDescriptions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setNonImageDescriptions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isDeleteEnabled?: boolean;
  isSelectionEnabled?: boolean;
}

// DB attributes
export const SCHEDULED_MESSAGE_DB_ATTRIBUTES = {
  USER_EMAIL: 'userEmail',
  SCHEDULE_DATE: 'scheduleDate',
  CREATED_AT: 'createdAt',
  FILE_LOCATION: 'fileLocation',
  ID: 'id',
  IDENTITY_ID: 'identityId',
  MESSAGE: 'message',
  MESSAGE_STATUS: 'messageStatus',
  OWNER: 'owner',
  RECIPIENTS: 'recipients',
  UPDATED_AT: 'updatedAt',
  TYPENAME: '__typename',
} as const;

export const SCHEDULED = 'SCHEDULED';
export const SENT = 'SENT';
