import React, { useRef, useState } from "react";
import "../login/Login.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const usernameInputRef = useRef();
  const emailInputRef = useRef();
  const passwordInputRef = useRef();
  const passwordConfirmationInputRef = useRef();
  const navigationController = useNavigate();
  const [isNetworkRequestPending, setIsNetworkRequestPending] = useState(false);

  const handleRegistrationSubmission = async (event) => {
    event.preventDefault();

    if (passwordConfirmationInputRef.current.value !== passwordInputRef.current.value) {
      passwordConfirmationInputRef.current.setCustomValidity("Passwords don't match!");
    } else {
      setIsNetworkRequestPending(true);
      const registrationPayload = {
        username: usernameInputRef.current.value,
        email: emailInputRef.current.value,
        password: passwordInputRef.current.value,
      };

      try {
        await axios.post("http://localhost:5000/api/auth/register", registrationPayload);

        alert("Account created successfully!");
        navigationController("/login");
      } catch (networkRegistrationError) {
        console.log(networkRegistrationError);
        alert("Registration failed! Email or Username might be taken.");
        setIsNetworkRequestPending(false);
      }
    }
  };

  return (
    <div className="login">
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
          <form className="loginBox" onSubmit={handleRegistrationSubmission} style={{ height: "auto" }}>
            <h2 className="loginTitle">Create Account</h2>

            <div className="inputGroup">
              <input
                placeholder="Username"
                required
                ref={usernameInputRef}
                className="loginInput"
              />
            </div>

            <div className="inputGroup">
              <input
                placeholder="Email"
                required
                ref={emailInputRef}
                className="loginInput"
                type="email"
              />
            </div>

            <div className="inputGroup">
              <input
                placeholder="Password"
                required
                ref={passwordInputRef}
                className="loginInput"
                type="password"
                minLength="6"
              />
            </div>

            <div className="inputGroup">
              <input
                placeholder="Password Again"
                required
                ref={passwordConfirmationInputRef}
                className="loginInput"
                type="password"
              />
            </div>

            <button className="loginButton" type="submit" disabled={isNetworkRequestPending}>
              {isNetworkRequestPending ? "Creating Account..." : "Sign Up"}
            </button>

            <hr className="loginHr" />

            <button
              className="loginRegisterButton"
              type="button"
              onClick={() => navigationController("/login")}
            >
              Log into Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}