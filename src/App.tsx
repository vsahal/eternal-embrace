import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dates from './Dates';
import Home from './Home';
import ScheduleMessageForm from './ScheduleMessageForm';
import UploadForm from './UploadForm';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 6000 }} />
      <Routes>
        <Route path="*" element={<Home />} />
        <Route path="/schedule" element={<ScheduleMessageForm />} />
        <Route path="/upload" element={<UploadForm />} />
        <Route path="/dates" element={<Dates />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
