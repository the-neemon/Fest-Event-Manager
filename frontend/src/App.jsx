import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import AdminDashboard from "./pages/AdminDashboard";
import ManageOrganizers from "./pages/ManageOrganizers";
import PasswordResetRequests from "./pages/PasswordResetRequests";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import CreateEvent from "./pages/CreateEvent";
import HomePage from "./pages/HomePage";
import OnboardingPage from "./pages/OnboardingPage";
import ClubsList from "./pages/ClubsList";
import MyEvents from "./pages/MyEvents";
import ProfilePage from "./pages/ProfilePage";
import OrganizerDetailPage from "./pages/OrganizerDetailPage";
import EventDetailPage from "./pages/EventDetailPage";
import OngoingEvents from "./pages/OngoingEvents";
import OrganizerProfile from "./pages/OrganizerProfile";
import PaymentApproval from "./pages/PaymentApproval";
import AttendanceTracking from "./pages/AttendanceTracking";
import ParticipantEventDetail from "./pages/ParticipantEventDetail";
import FeedbackPage from "./pages/FeedbackPage";

function App() {
  return (
    <Router>
      {/* AuthProvider is inside Router so AuthContext can call useNavigate for post-login redirects */}
      <AuthProvider>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} /> 
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/events" element={<HomePage />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/manage-organizers" element={<ManageOrganizers />} />
          <Route path="/password-reset-requests" element={<PasswordResetRequests />} />
          <Route path="/organizer-dashboard" element={<OrganizerDashboard />} />
          <Route path="/create-event" element={<CreateEvent />} />
          <Route path="/event-detail/:eventId" element={<EventDetailPage />} />
          <Route path="/participant-event/:eventId" element={<ParticipantEventDetail />} />
          <Route path="/payment-approval/:eventId" element={<PaymentApproval />} />
          <Route path="/attendance-tracking/:eventId" element={<AttendanceTracking />} />
          <Route path="/feedback/:eventId" element={<FeedbackPage />} />
          <Route path="/ongoing-events" element={<OngoingEvents />} />
          <Route path="/organizer-profile" element={<OrganizerProfile />} />
          <Route path="/clubs" element={<ClubsList />} />
          <Route path="/organizer/:organizerId" element={<OrganizerDetailPage />} />
          <Route path="/my-events" element={<MyEvents />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;