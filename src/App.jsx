import { Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import RegistrationPage from './pages/RegistrationPage';
import UserDashboard from './pages/UserDashboard';
import AddStudentPage from './pages/AddStudentPage';
import PendingPage from './pages/PendingPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Toast from './components/Toast';

function App() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen relative">
        {/* Background decorations */}
        <div className="bg-decoration bg-blob-1" />
        <div className="bg-decoration bg-blob-2" />

        {/* Toast notifications */}
        {toast && <Toast message={toast.message} type={toast.type} />}

        <Routes>
          <Route path="/" element={<LandingPage showToast={showToast} />} />
          <Route path="/register" element={<RegistrationPage showToast={showToast} />} />
          <Route path="/dashboard" element={<UserDashboard showToast={showToast} />} />
          <Route path="/add-student" element={<AddStudentPage showToast={showToast} />} />
          <Route path="/pending" element={<PendingPage showToast={showToast} />} />
          <Route path="/adminlogin" element={<AdminLogin showToast={showToast} />} />
          <Route path="/admin/dashboard" element={<AdminDashboard showToast={showToast} />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;
