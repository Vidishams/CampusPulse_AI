import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import AppShell from "./components/AppShell";
import PulseLine from "./components/PulseLine";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Terms from "./pages/Terms";
import StudentDashboard from "./pages/StudentDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminRoster from "./pages/AdminRoster";
import UploadNotice from "./pages/UploadNotice";
import NoticeDetails from "./pages/NoticeDetails";
import Events from "./pages/Events";
import Placements from "./pages/Placements";
import Bookmarks from "./pages/Bookmarks";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import AIAssistant from "./pages/AIAssistant";
import Clubs from "./pages/Clubs";

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 60 }}><PulseLine animate /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <AppShell>{children}</AppShell>;
}

function DashboardRouter() {
  const { user } = useAuth();
  if (user.role === "admin") return <AdminDashboard />;
  if (user.role === "faculty") return <FacultyDashboard />;
  return <StudentDashboard />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/terms" element={<Terms />} />

      <Route path="/dashboard" element={<Protected><DashboardRouter /></Protected>} />
      <Route path="/notices/:id" element={<Protected><NoticeDetails /></Protected>} />
      <Route path="/upload" element={<Protected roles={["faculty", "admin"]}><UploadNotice /></Protected>} />
      <Route path="/events" element={<Protected><Events /></Protected>} />
      <Route path="/placements" element={<Protected><Placements /></Protected>} />
      <Route path="/bookmarks" element={<Protected roles={["student"]}><Bookmarks /></Protected>} />
      <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/assistant" element={<Protected roles={["student"]}><AIAssistant /></Protected>} />
      <Route path="/clubs" element={<Protected><Clubs /></Protected>} />
      <Route path="/analytics" element={<Protected roles={["admin"]}><AdminDashboard /></Protected>} />
      <Route path="/users" element={<Protected roles={["admin"]}><AdminUsers /></Protected>} />
      <Route path="/roster" element={<Protected roles={["admin"]}><AdminRoster /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
