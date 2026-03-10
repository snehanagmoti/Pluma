import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Home from './pages/home/Home';
import Login from './pages/login/Login';
import Register from './pages/register/Register';
import Profile from './pages/profile/Profile';
import Write from './pages/write/Write';
import Single from './pages/single/Single';
import Settings from './pages/settings/Settings';
import Bookmarks from "./pages/bookmarks/Bookmarks";
import Groups from "./pages/groups/Groups";

import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const activeUserSession = localStorage.getItem("user");

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={activeUserSession ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={activeUserSession ? <Navigate to="/" /> : <Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/write" element={<Write />} />
          <Route path="/book/:bookId" element={<Single />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/groups" element={<Groups />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;