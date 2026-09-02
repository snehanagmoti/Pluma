import React, { useRef, useState } from "react";
import "../login/Login.css";
import API from "../../config/axios";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { HAS_GOOGLE_AUTH } from "../../config/environment";

export default function Register() {
  const username = useRef();
  const email = useRef();
  const password = useRef();
  const passwordAgain = useRef();
  const navigate = useNavigate();
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async (e) => {
    e.preventDefault();
    setError("");

    if (passwordAgain.current.value !== password.current.value) {
      setError("Passwords don't match!");
      return;
    }

    setIsFetching(true);
    try {
      const res = await API.post("/auth/register", {
        username: username.current.value,
        email: email.current.value,
        password: password.current.value,
      });
      localStorage.setItem("user", JSON.stringify(res.data));
      localStorage.setItem("token", res.data.token);
      window.location.href = "/";
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
      setIsFetching(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsFetching(true);
    setError("");
    try {
      const res = await API.post("/auth/google", {
        credential: credentialResponse.credential,
      });
      localStorage.setItem("user", JSON.stringify(res.data));
      localStorage.setItem("token", res.data.token);
      window.location.href = "/";
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-up failed.");
      setIsFetching(false);
    }
  };

  return (
    <div className="login">
      <div className="loginShape circleOne"></div>
      <div className="loginShape circleTwo"></div>
      <div className="loginShape circleThree"></div>

      <div className="loginWrapper">
        <div className="loginLeft">
          <h3 className="loginLogo">Pluma</h3>
          <span className="loginDesc">
            Join the community. <br />
            Start your journey today.
          </span>
        </div>

        <div className="loginRight">
          <form className="loginBox" onSubmit={handleClick} style={{ height: "auto" }}>
            <h2 className="loginTitle">Create Account</h2>

            {error && <div className="loginError">{error}</div>}

            <div className="inputGroup">
              <input placeholder="Username" required ref={username} className="loginInput" />
            </div>
            <div className="inputGroup">
              <input placeholder="Email" required ref={email} className="loginInput" type="email" />
            </div>
            <div className="inputGroup">
              <input placeholder="Password" required ref={password} className="loginInput" type="password" minLength="6" />
            </div>
            <div className="inputGroup">
              <input placeholder="Confirm Password" required ref={passwordAgain} className="loginInput" type="password" />
            </div>

            <button className="loginButton" type="submit" disabled={isFetching}>
              {isFetching ? "Creating Account..." : "Sign Up"}
            </button>

            <div className="loginDivider">
              <span className="loginDividerLine"></span>
              <span className="loginDividerText">or</span>
              <span className="loginDividerLine"></span>
            </div>

            {HAS_GOOGLE_AUTH && <div className="googleLoginWrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google sign-up failed")}
                shape="pill"
                theme="filled_white"
                text="signup_with"
                size="large"
              />
            </div>}

            <hr className="loginHr" />

            <button className="loginRegisterButton" type="button" onClick={() => navigate("/login")}>
              Already have an account? Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
