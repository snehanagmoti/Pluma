import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./context/ThemeContext";
import { GOOGLE_CLIENT_ID, HAS_GOOGLE_AUTH } from "./config/environment";

import "./index.css";

const Home = lazy(() => import("./pages/home/Home"));
const Login = lazy(() => import("./pages/login/Login"));
const Register = lazy(() => import("./pages/register/Register"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const Write = lazy(() => import("./pages/write/Write"));
const Single = lazy(() => import("./pages/single/Single"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const Bookmarks = lazy(() => import("./pages/bookmarks/Bookmarks"));
const Groups = lazy(() => import("./pages/groups/Groups"));
const StoryCanvas = lazy(() => import("./pages/canvas/StoryCanvas"));
const PlanningBoard = lazy(() => import("./pages/planning/PlanningBoard"));
const Community = lazy(() => import("./pages/community/Community"));
const Messages = lazy(() => import("./pages/messages/Messages"));
const Notifications = lazy(() => import("./pages/notifications/Notifications"));
const Projects = lazy(() => import("./pages/projects/Projects"));
const Reader = lazy(() => import("./pages/reader/Reader"));
const Catalog = lazy(() => import("./pages/catalog/Catalog"));
const Channel = lazy(() => import("./pages/groups/Channel"));
const NotFound = lazy(() => import("./pages/notfound/NotFound"));

const RouteFallback = () => (
  <div className="routeFallback" role="status" aria-live="polite">
    <span className="routeFallbackSpinner" aria-hidden="true" />
    Loading Pluma…
  </div>
);

const AuthRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? <Navigate to="/" /> : children;
};

function App() {
  const router = (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/write" element={<Navigate to="/projects" replace />} />
          <Route path="/write/:bookId" element={<Write />} />
          <Route path="/book/:bookId" element={<Single />} />
          <Route path="/reader/:bookId" element={<Reader />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:groupId" element={<Channel />} />
          <Route path="/community" element={<Community />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:conversationId" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/canvas" element={<StoryCanvas />} />
          <Route path="/planning" element={<PlanningBoard />} />
          <Route path="/planning/:bookId" element={<PlanningBoard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );

  return (
    <ThemeProvider>
      {HAS_GOOGLE_AUTH ? (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{router}</GoogleOAuthProvider>
      ) : router}
    </ThemeProvider>
  );
}

export default App;
