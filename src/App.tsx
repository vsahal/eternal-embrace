import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from "./Home"
import ScheduleMessageForm from "./ScheduleMessageForm";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<Home />} />
        <Route path="/schedule" element={<ScheduleMessageForm />} />
      </Routes>
    </BrowserRouter>

  )
}

export default App;
