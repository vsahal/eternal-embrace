import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Dates from "./Dates";
import Home from "./Home";
import ScheduleMessageForm from "./ScheduleMessageForm";
import UploadForm from "./UploadForm";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<Home />} />
        <Route path="/schedule" element={<ScheduleMessageForm />} />
        <Route path="/upload" element={<UploadForm />} />
        <Route path="/dates" element={<Dates />} />
      </Routes>
    </BrowserRouter>

  )
}

export default App;
