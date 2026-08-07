import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import RequireAuth from './features/auth/RequireAuth';
import ChatRoomPage from './features/chat/ChatRoomPage';
import ConversationsPage from './features/chat/ConversationsPage';
import FeedPage from './features/feed/FeedPage';
import MyRequestsPage from './features/feed/MyRequestsPage';
import PostRequestsPage from './features/feed/PostRequestsPage';
import KycPage from './features/kyc/KycPage';
import EditProfilePage from './features/profile/EditProfilePage';
import ProfilePage from './features/profile/ProfilePage';
import ReferralPage from './features/profile/ReferralPage';
import ScorePage from './features/profile/ScorePage';
import RelationsPage from './features/relations/RelationsPage';
import ParticipantHistoryPage from './features/tontines/ParticipantHistoryPage';
import TontineDetailPage from './features/tontines/TontineDetailPage';
import TontinesPage from './features/tontines/TontinesPage';
import AppShell from './layout/AppShell';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<FeedPage />} />
          <Route path="tontines" element={<TontinesPage />} />
          <Route path="tontines/:ownerId/:localId" element={<TontineDetailPage />} />
          <Route path="messages" element={<ConversationsPage />} />
          <Route path="messages/:conversationId" element={<ChatRoomPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/edit" element={<EditProfilePage />} />
          <Route path="profile/:userId/score" element={<ScorePage />} />
          <Route path="requests" element={<MyRequestsPage />} />
          <Route path="feed/:postId/requests" element={<PostRequestsPage />} />
          <Route path="kyc" element={<KycPage />} />
          <Route path="referral" element={<ReferralPage />} />
          <Route path="relations" element={<RelationsPage />} />
          <Route path="history" element={<ParticipantHistoryPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
