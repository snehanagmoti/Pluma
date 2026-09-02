import React, { useRef, useState } from "react";
import "./Login.css";
import API from "../../config/axios";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { HAS_GOOGLE_AUTH } from "../../config/environment";

export default function Login() {
  const email = useRef();
  const password = useRef();
  const navigate = useNavigate();
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async (e) => {
    e.preventDefault();
    setIsFetching(true);
    setError("");
    try {
      const res = await API.post("/auth/login", {
        email: email.current.value,
        password: password.current.value,
      });
      localStorage.setItem("user", JSON.stringify(res.data));
      localStorage.setItem("token", res.data.token);
      window.location.href = "/";
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
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
      setError(err.response?.data?.message || "Google sign-in failed.");
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
            Unleash your creativity. <br />
            Share your story with the world.
          </span>
        </div>

        <div className="loginRight">
          <form className="loginBox" onSubmit={handleClick}>
            <h2 className="loginTitle">Welcome Back</h2>

            {error && <div className="loginError">{error}</div>}

            <div className="inputGroup">
              <input
                placeholder="Email"
                type="email"
                required
                className="loginInput"
                ref={email}
              />
            </div>

            <div className="inputGroup">
              <input
                placeholder="Password"
                type="password"
                required
                minLength="6"
                className="loginInput"
                ref={password}
              />
            </div>

            <button className="loginButton" type="submit" disabled={isFetching}>
              {isFetching ? "Signing In..." : "Sign In"}
            </button>

            <span className="loginForgot">Forgot Password?</span>

            <div className="loginDivider">
              <span className="loginDividerLine"></span>
              <span className="loginDividerText">or</span>
              <span className="loginDividerLine"></span>
            </div>

            {HAS_GOOGLE_AUTH && <div className="googleLoginWrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google sign-in failed")}
                shape="pill"
                theme="filled_white"
                text="signin_with"
                size="large"
                width="320"
              />
            </div>}

            <hr className="loginHr" />

            <button
              className="loginRegisterButton"
              type="button"
              onClick={() => navigate("/register")}
            >
              Create a New Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
