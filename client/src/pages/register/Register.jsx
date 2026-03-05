import React, { useRef, useState } from "react";
// We reuse the Login CSS so the theme (Golden Hour + Glass) matches perfectly
import "../login/Login.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const username = useRef();
  const email = useRef();
  const password = useRef();
  const passwordAgain = useRef();
  const navigate = useNavigate();
  const [isFetching, setIsFetching] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();

    // 1. Validation: Check if passwords match
    if (passwordAgain.current.value !== password.current.value) {
      passwordAgain.current.setCustomValidity("Passwords don't match!");
    } else {
      setIsFetching(true);
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
        setIsFetching(false);
      }
    }
  };

  return (
    <div className="login">
      {/* Background Shapes for consistency */}
      <div className="loginShape circleOne"></div>
      <div className="loginShape circleTwo"></div>

      <div className="loginWrapper">
        <div className="loginLeft">
          <h3 className="loginLogo">Pluma</h3>
          <span className="loginDesc">
            Join the community. <br />
            Start your journey today.
          </span>
        </div>

        <div className="loginRight">
          <form className="loginBox" onSubmit={handleClick} style={{ height: "auto" }}> {/* Auto height for extra inputs */}
            <h2 className="loginTitle">Create Account</h2>

            <div className="inputGroup">
              <input
                placeholder="Username"
                required
                ref={username}
                className="loginInput"
              />
            </div>

            <div className="inputGroup">
              <input
                placeholder="Email"
                required
                ref={email}
                className="loginInput"
                type="email"
              />
            </div>

            <div className="inputGroup">
              <input
                placeholder="Password"
                required
                ref={password}
                className="loginInput"
                type="password"
                minLength="6"
              />
            </div>

            <div className="inputGroup">
              <input
                placeholder="Password Again"
                required
                ref={passwordAgain}
                className="loginInput"
                type="password"
              />
            </div>

            <button className="loginButton" type="submit" disabled={isFetching}>
              {isFetching ? "Creating Account..." : "Sign Up"}
            </button>

            <hr className="loginHr" />

            <button
              className="loginRegisterButton"
              type="button"
              onClick={() => navigate("/login")}
            >
              Log into Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}