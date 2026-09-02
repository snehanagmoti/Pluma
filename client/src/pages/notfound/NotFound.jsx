import React from "react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Poppins', sans-serif",
      color: "white",
      textAlign: "center",
      padding: "20px",
    }}>
      <h1 style={{
        fontFamily: "'Dancing Script', cursive",
        fontSize: "120px",
        fontWeight: 700,
        margin: 0,
        lineHeight: 1,
        textShadow: "0 4px 20px rgba(0,0,0,0.1)",
      }}>404</h1>
      <p style={{
        fontSize: "22px",
        fontWeight: 300,
        marginTop: "10px",
        opacity: 0.9,
      }}>This page has wandered off...</p>
      <button onClick={() => navigate("/")} style={{
        marginTop: "30px",
        background: "linear-gradient(to right, #e9ac32, #dd2476)",
        color: "white",
        border: "none",
        padding: "14px 36px",
        borderRadius: "12px",
        fontSize: "16px",
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 4px 15px rgba(221, 36, 118, 0.4)",
        transition: "transform 0.3s ease",
        fontFamily: "'Poppins', sans-serif",
      }}
      onMouseOver={e => e.target.style.transform = "translateY(-2px)"}
      onMouseOut={e => e.target.style.transform = "translateY(0)"}
      >
        Go Home
      </button>
    </div>
  );
}
