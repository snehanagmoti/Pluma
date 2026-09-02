import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const user = localStorage.getItem("user");
  const token = localStorage.getItem("token");

  // Check if token exists and is not expired
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // Check token expiry
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      return <Navigate to="/login" replace />;
    }
  } catch (e) {
    // Invalid token format
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}