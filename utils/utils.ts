// export const validateScheduleDate = (date: string) => {
//     return new Date(date) < new Date() ? "Date must be in the future." : "";
//   };

//   export const validateEmails = (emails: string) => {
//     const invalidEmails = emails.split(",").map(email => email.trim()).filter(email => !/^\S+@\S+\.\S+$/.test(email));
//     return invalidEmails.length > 0 ? `Invalid emails: ${invalidEmails.join(", ")}` : "";
//   };

// utils.ts

import { getCurrentUser } from 'aws-amplify/auth';
import { getUrl, list, remove } from 'aws-amplify/storage';

// Helper to get the current user email
export const getUserEmail = async () => {
  const user = await getCurrentUser();
  return user?.signInDetails?.loginId;
};

// Fetch list of files from S3
export const loadFilesFromS3 = async (userEmail: string, path: string) => {
  try {
    const result = await list({
      path: ({ identityId }) => `uploads/${identityId}/${userEmail}/${path}/`,
      options: { listAll: true },
    });
    return result.items || [];
  } catch (error) {
    console.error('Error loading files:', error);
    return [];
  }
};

// Generate URLs for non-image files
export const generateFileUrls = async (userEmail: string, files: string[]) => {
  try {
    const fileUrls = await Promise.all(
      files.map(async filePath => {
        const parts = filePath.split('/');
        const lastTwoParts = parts.slice(-2).join('/');

        try {
          const linkToStorageFile = await getUrl({
            path: ({ identityId }) => `uploads/${identityId}/${userEmail}/${lastTwoParts}`,
            options: {
              bucket: 'scheduledMessagesFiles',
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
    return fileUrls.filter(url => url !== null) as string[];
  } catch (error) {
    console.error('Error generating URLs:', error);
    return [];
  }
};

// Handle file deletion
export const handleFileDeletion = async (filePath: string) => {
  try {
    await remove({ path: filePath });
    console.log('Deleted file:', filePath);
  } catch (error) {
    console.error(`Error deleting file: ${filePath}`, error);
  }
};

export const processFile = async ({ file }: { file: File }) => {
  // Sanitize filename: remove whitespace, special chars, accents, etc.
  const sanitizeFileName = (name: string) => {
    return name
      .normalize('NFKD') // Normalize to remove accents
      .replace(/[\u0300-\u036f]/g, '') // Remove combining marks
      .replace(/\s+/g, '') // Remove all whitespace
      .replace(/[^\w.-]/g, '') // Remove non-word characters except . and -
      .toLowerCase(); // Optional: lowercase for consistency
  };

  const sanitizedFileName = sanitizeFileName(file.name);

  return {
    file,
    key: sanitizedFileName,
  };
};

export const isImageFile = (file: string): boolean => {
  const filename = file.split('/').pop() || file;
  return /\.(jpe?g|png)$/i.test(filename);
};
