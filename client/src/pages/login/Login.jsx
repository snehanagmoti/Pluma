import React, { useRef } from "react";
import "./Login.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const email = useRef();
  const password = useRef();
  const navigate = useNavigate();

  const handleClick = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email: email.current.value,
        password: password.current.value,
      });

      // 1. Save User Details (Keep this)
      localStorage.setItem("user", JSON.stringify(res.data));
      
      // 2. CRITICAL FIX: Save the Token explicitly!
      // This is what ProtectedRoute and Feed.jsx look for.
      localStorage.setItem("token", res.data.token); 

      navigate("/");
    } catch (err) {
      console.log(err);
      alert("Login failed! Please check your email or password.");
    }
  };

  return (
    <div className="login">
      <div className="loginWrapper">
        <div className="loginLeft">
          <h3 className="loginLogo">SocialApp</h3>
          <span className="loginDesc">
            Connect with friends and the world around you on SocialApp.
          </span>
        </div>
        <div className="loginRight">
          <div className="loginBox">
            <input 
              placeholder="Email" 
              type="email" 
              required 
              className="loginInput" 
              ref={email} 
            />
            <input 
              placeholder="Password" 
              type="password" 
              required 
              minLength="6" 
              className="loginInput" 
              ref={password} 
            />
            <button className="loginButton" onClick={handleClick}>
              Log In
            </button>
            <span className="loginForgot">Forgot Password?</span>
            
            <button 
              className="loginRegisterButton" 
              onClick={() => navigate("/register")}
            >
              Create a New Account
            </button>
            
          </div>
        </div>
      </div>
    </div>
  );
}