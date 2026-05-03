import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { copy } from 'aws-amplify/storage';
import { format, isValid, parse } from 'date-fns';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Schema } from '../amplify/data/resource';

const client = generateClient<Schema>();

export function useScheduleForm() {
  const { user } = useAuthenticator();
  const navigate = useNavigate();
  const location = useLocation();

  const editingMessage = location.state?.messageObj || null;

  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [scheduleDate, setScheduleDate] = useState<Date | null>(() => {
    if (editingMessage?.scheduleDate) {
      const parsed = parse(editingMessage.scheduleDate, 'MM-dd-yyyy', new Date());
      return isValid(parsed) ? parsed : null;
    }
    return null;
  });
  const [message, setMessage] = useState<string>(editingMessage?.message || '');
  const [recipients, setRecipients] = useState<string>(editingMessage?.recipients?.join(', ') || '');
  const [emailError, setEmailError] = useState('');
  const [uniqueDateError, setUniqueDateError] = useState('');
  const [scheduledMessages, setScheduledMessages] = useState<Array<Schema['ScheduledMessage']['type']>>([]);
  const [identityId, setIdentityId] = useState<string | undefined>();
  const [uploadedSelectedFiles, setUploadedSelectedFiles] = useState<string[]>([]);
  const [formattedScheduleDate, setFormattedScheduleDate] = useState<string>('');
  const [significantDates, setSignificantDates] = useState<Array<Schema['SignificantDates']['type']>>([]);

  useEffect(() => {
    const fetchIdentityId = async () => {
      try {
        const session = await fetchAuthSession();
        setIdentityId(session.identityId);
      } catch (error) {
        console.error('Error fetching identityId:', error);
      }
    };
    fetchIdentityId();
  }, []);

  useEffect(() => {
    if (user?.signInDetails?.loginId) {
      setUserEmail(user.signInDetails.loginId);
    }
  }, [user]);

  useEffect(() => {
    const sub = client.models.ScheduledMessage.observeQuery().subscribe({
      next: data => setScheduledMessages([...data.items]),
    });
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    const sub = client.models.SignificantDates.observeQuery().subscribe({
      next: data => setSignificantDates([...data.items]),
    });
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    if (editingMessage?.scheduleDate) {
      const parsed = parse(editingMessage.scheduleDate, 'MM-dd-yyyy', new Date());
      if (isValid(parsed)) {
        setScheduleDate(parsed);
        setFormattedScheduleDate(editingMessage.scheduleDate);
      } else {
        console.error('Invalid scheduleDate format:', editingMessage.scheduleDate);
        setScheduleDate(null);
        setFormattedScheduleDate('');
      }
    } else {
      setScheduleDate(null);
      setFormattedScheduleDate('');
    }
  }, [editingMessage]);

  const disabledDates = scheduledMessages.map(msg => parse(msg.scheduleDate, 'MM-dd-yyyy', new Date()));
  const anySignificantDates = significantDates.length > 0;

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setScheduleDate(date);
      setFormattedScheduleDate(format(date, 'MM-dd-yyyy'));
    } else {
      setScheduleDate(null);
      setFormattedScheduleDate('');
    }
  };

  const handleRecipientsChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailList = event.target.value.split(',').map(e => e.trim());
    const invalidEmails = emailList.filter(e => e.length > 0 && !emailRegex.test(e));
    setEmailError(invalidEmails.length > 0 ? `Invalid emails: ${invalidEmails.join(', ')}` : '');
    setRecipients(event.target.value);
  };

  const checkExistingMessage = async (date: string) => {
    if (!userEmail) return false;
    const result = await client.models.ScheduledMessage.list({
      filter: { userEmail: { eq: userEmail }, scheduleDate: { eq: date } },
    });
    return result.data.length > 0;
  };

  const handleSelectedFiles = async (files: string[]) => {
    if (files.length === 0) return;
    for (const filePath of files) {
      try {
        const parts = filePath.split('/');
        const destinationPath = `${parts[0]}/${parts[1]}/${parts[2]}/${formattedScheduleDate}/${parts[4]}`;
        const response = await copy({ source: { path: filePath }, destination: { path: destinationPath } });
        console.log(`Successfully copied ${filePath} to shared bucket.`, response);
      } catch (error) {
        console.error(`Error copying file ${filePath}:`, error);
        toast.error(`Failed to attach file. Please try again.`);
      }
    }
    toast.success('Files attached successfully!');
    window.location.reload();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    handleSelectedFiles(uploadedSelectedFiles);

    if (emailError) {
      toast.error('Please fix invalid email addresses before submitting.');
      return;
    }
    if (!userEmail) {
      toast.error('User email is required.');
      return;
    }

    try {
      if (editingMessage) {
        const session = await fetchAuthSession();
        const sessionIdentityId = session.identityId;
        await client.models.ScheduledMessage.update({
          id: editingMessage.id,
          userEmail,
          scheduleDate: formattedScheduleDate,
          message,
          recipients: recipients.split(',').map(e => e.trim()),
          fileLocation: [`uploads/${sessionIdentityId}/${userEmail}/${formattedScheduleDate}/`],
        });
        toast.success('Message updated successfully!');
      } else {
        const exists = await checkExistingMessage(formattedScheduleDate);
        if (exists) {
          setUniqueDateError('A message is already scheduled for this date. Edit the existing one.');
          return;
        }
        setUniqueDateError('');
        await client.models.ScheduledMessage.create({
          userEmail,
          scheduleDate: formattedScheduleDate,
          message,
          messageStatus: 'SCHEDULED',
          recipients: recipients.split(',').map(e => e.trim()),
          identityId,
          fileLocation: [`uploads/${identityId}/${userEmail}/${formattedScheduleDate}/`],
        });
        toast.success('Message scheduled successfully!');
      }
      navigate('/home', { replace: true });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  return {
    editingMessage,
    userEmail,
    identityId,
    scheduleDate,
    message,
    setMessage,
    recipients,
    emailError,
    uniqueDateError,
    significantDates,
    anySignificantDates,
    uploadedSelectedFiles,
    setUploadedSelectedFiles,
    formattedScheduleDate,
    disabledDates,
    handleDateChange,
    handleRecipientsChange,
    handleSubmit,
    navigate,
  };
}
