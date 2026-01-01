import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// --- IMPORT COMPONENT NAMES CORRECTLY ---
// If your files are in specific folders (e.g. pages/home/Home.jsx), 
// adjust the path strings below to match YOUR folder structure.

import Home from './pages/home/Home';       // Was HomePage
import Login from './pages/login/Login';     // Was LoginPage
import Register from './pages/register/Register'; // Was RegisterPage
import Profile from './pages/profile/Profile';    // Was ProfilePage
import Write from './pages/write/Write';      // You missed importing this
import Single from './pages/single/Single';   // You missed importing this
import Settings from './pages/settings/Settings';
import Bookmarks from "./pages/bookmarks/Bookmarks";
import Groups from "./pages/groups/Groups";   // If you have a Groups page

import ProtectedRoute from './components/ProtectedRoute'; 

function App() {
  // Helper to check if user is logged in (for public route redirection)
  const user = localStorage.getItem("user");

  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        {/* If user is already logged in, send them to Home instead of Login */}
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />

        {/* PROTECTED ROUTES (Middleware) */}
        <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/write" element={<Write />} />
            <Route path="/book/:bookId" element={<Single />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/groups" element={<Groups />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;