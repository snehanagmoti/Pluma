import React, { useRef } from "react";
import "./Register.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const username = useRef();
  const email = useRef();
  const password = useRef();
  const passwordAgain = useRef();
  const navigate = useNavigate();

  const handleClick = async (e) => {
    e.preventDefault();
    
    // 1. Validation: Check if passwords match
    if (passwordAgain.current.value !== password.current.value) {
      passwordAgain.current.setCustomValidity("Passwords don't match!");
    } else {
      const user = {
        username: username.current.value,
        email: email.current.value,
        password: password.current.value,
      };

      try {
        // 2. Send Register Request to Backend
        await axios.post("http://localhost:5000/api/auth/register", user);
        
        // 3. If successful, redirect to Login page
        alert("Account created successfully!");
        navigate("/login");
      } catch (err) {
        console.log(err);
        alert("Registration failed! Email or Username might be taken.");
      }
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
          <form className="loginBox" onSubmit={handleClick}>
            <input 
              placeholder="Username" 
              required 
              ref={username} 
              className="loginInput" 
            />
            <input 
              placeholder="Email" 
              required 
              ref={email} 
              className="loginInput" 
              type="email" 
            />
            <input 
              placeholder="Password" 
              required 
              ref={password} 
              className="loginInput" 
              type="password" 
              minLength="6" 
            />
            <input 
              placeholder="Password Again" 
              required 
              ref={passwordAgain} 
              className="loginInput" 
              type="password" 
            />
            <button className="loginButton" type="submit">
              Sign Up
            </button>
            <button className="loginRegisterButton" onClick={() => navigate("/login")}>
              Log into Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}