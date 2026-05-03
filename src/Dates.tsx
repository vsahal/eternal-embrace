import { fetchAuthSession } from 'aws-amplify/auth';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/data';
import { format, parse } from 'date-fns';
import DOMPurify from 'dompurify';
import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { Schema } from '../amplify/data/resource';

const client = generateClient<Schema>();

function Dates() {
  const navigate = useNavigate();
  const { user } = useAuthenticator();
  const [userEmail, setUserEmail] = useState<string>('');
  const [identityId, setIdentityId] = useState<string>();
  // used when setting a SINGULAR date
  const [significantDate, setSignificantDate] = useState<Date | null>(null);
  // used to load dates from the DB
  const [significantDates, setSignificantDates] = useState<Array<Schema['SignificantDates']['type']>>([]);
  const [anySignificantDates, setAnySignificantDates] = useState<boolean>(false);
  const [formattedSignificantDate, setFormattedSignificantDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      // 1) Set userEmail
      const loginId = user?.signInDetails?.loginId;
      if (loginId) {
        setUserEmail(loginId);
      }

      // 2) Fetch identityId
      try {
        const session = await fetchAuthSession();
        setIdentityId(session.identityId);
      } catch (err) {
        console.error('Error fetching identityId:', err);
      }
    };

    init();
  }, [user]);

  useEffect(() => {
    const sub = client.models.SignificantDates.observeQuery().subscribe({
      next: data => setSignificantDates([...data.items]),
    });
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    setAnySignificantDates(significantDates.length > 0);
  }, [significantDates]);

  // When user picks a date
  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSignificantDate(date);
      setFormattedSignificantDate(format(date, 'MM-dd-yyyy'));
    } else {
      setSignificantDate(null);
      setFormattedSignificantDate('');
    }
  };

  const disabledDates = significantDates.map(item => parse(item.significantDate, 'MM-dd-yyyy', new Date()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!significantDate || !description) return;

    try {
      await client.models.SignificantDates.create({
        userEmail: userEmail,
        significantDate: formattedSignificantDate,
        description: description,
        identityId: identityId,
      });
      toast.success('Date saved successfully!');

      setSignificantDate(null);
      setDescription('');
    } catch (err) {
      console.error('Error saving date:', err);
      toast.error('Failed to save date. Please try again.');
    }
  };

  async function handleDelete(userEmail: string, significantDate: string) {
    try {
      await client.models.SignificantDates.delete({ userEmail, significantDate });
      toast.success('Date deleted.');
    } catch (error) {
      console.error(
        `Error deleting date from DB with userEmail: ${userEmail} and significantDate: ${significantDate}`,
        error
      );
      toast.error('Failed to delete date. Please try again.');
    }
  }

  return (
    <div>
      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
        <button type="button" onClick={() => navigate('/home')}>
          Home
        </button>
      </div>
      <h3>Current Significant Dates</h3>
      {anySignificantDates ? (
        <ul>
          {significantDates
            .sort(
              (a, b) =>
                new Date(a.significantDate as string).getTime() - new Date(b.significantDate as string).getTime()
            )
            .map(item => (
              <li
                key={item.significantDate}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 10px',
                }}
              >
                <span>
                  {item.significantDate}: {item.description}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(item.userEmail, item.significantDate)}
                  style={{
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    backgroundColor: 'black',
                    color: 'white',
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
        </ul>
      ) : (
        <p style={{ fontStyle: 'italic' }}>No significant dates found.</p>
      )}

      <h3 style={{ marginTop: '5rem' }}>Add a Significant Date</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="date-picker" style={{ marginRight: '1rem', display: 'inline-block', marginBottom: '1rem' }}>
            {' '}
            Select Date:
          </label>
          <DatePicker
            id="date-picker"
            selected={significantDate}
            onChange={handleDateChange}
            required
            showIcon
            minDate={new Date(Date.now() + 86400000)}
            isClearable={true}
            dateFormat="MM-dd-yyyy"
            excludeDates={disabledDates}
            placeholderText="Select a date"
          />
        </div>

        <div>
          <label htmlFor="description" style={{ marginRight: '1rem', display: 'inline-block', marginBottom: '1rem' }}>
            {' '}
            Description:
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(DOMPurify.sanitize(e.target.value))}
            required
            rows={2}
            style={{ width: '100%' }}
          />
        </div>

        <button type="submit" style={{ marginTop: '1rem' }}>
          Add Significant Date
        </button>
      </form>
    </div>
  );
}

export default Dates;
