import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  // Check if user is logged in. 
  // This could be from Context, Redux, or simple localStorage.
  // Example using localStorage:
  const token = localStorage.getItem('token'); 

  // If no token exists, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If token exists, render the child routes (The actual page)
  return <Outlet />;
};

export default ProtectedRoute;