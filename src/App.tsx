import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from "./Home"
import ScheduleMessageForm from "./ScheduleMessageForm";
import UploadForm from "./UploadForm";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<Home />} />
        <Route path="/schedule" element={<ScheduleMessageForm />} />
        <Route path="/upload" element={<UploadForm />} />
      </Routes>
    </BrowserRouter>

  )
}

export default App;
