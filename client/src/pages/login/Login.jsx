import React, { useRef, useState } from "react";
import "./Login.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const email = useRef();
  const password = useRef();
  const navigate = useNavigate();
  const [isFetching, setIsFetching] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    setIsFetching(true);
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email: email.current.value,
        password: password.current.value,
      });

      // Save User & Token
      localStorage.setItem("user", JSON.stringify(res.data));
      localStorage.setItem("token", res.data.token);

      navigate("/");
    } catch (err) {
      console.log(err);
      alert("Login failed! Please check your credentials.");
      setIsFetching(false);
    }
  };

  return (
    <div className="login">
      {/* Background Shapes for visual interest */}
      <div className="loginShape circleOne"></div>
      <div className="loginShape circleTwo"></div>

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
              {isFetching ? "Logging In..." : "Log In"}
            </button>

            <span className="loginForgot">Forgot Password?</span>

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