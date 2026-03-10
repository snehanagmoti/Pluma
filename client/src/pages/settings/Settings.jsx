import React, { useState, useEffect } from "react";
import "./Settings.css";
import Sidebar from "../../components/sidebar/Sidebar";
import Topbar from "../../components/topbar/Topbar";
import axios from "axios";

export default function Settings() {
  const [accountUsername, setAccountUsername] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [isAccountPrivate, setIsAccountPrivate] = useState(false);
  const [updateSuccessStatus, setUpdateSuccessStatus] = useState(false);

  const activeUserSession = JSON.parse(localStorage.getItem("user"));
  const authenticationToken = localStorage.getItem("token");

  useEffect(() => {
    if (activeUserSession) {
      setAccountUsername(activeUserSession.username);
      setAccountEmail(activeUserSession.email);
      setIsAccountPrivate(activeUserSession.isPrivate || false);
    }
  }, []);

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    setUpdateSuccessStatus(false);

    const updatedUserPayload = {
      userId: activeUserSession.id,
      username: accountUsername,
      email: accountEmail,
      isPrivate: isAccountPrivate,
    };

    if (accountPassword) {
      updatedUserPayload.password = accountPassword;
    }

    try {
      const profileUpdateResponse = await axios.put(
        `http://localhost:5000/api/users/${activeUserSession.id}`,
        updatedUserPayload,
        {
          headers: { Authorization: `Bearer ${authenticationToken}` }
        }
      );

      localStorage.setItem("user", JSON.stringify(profileUpdateResponse.data));
      setUpdateSuccessStatus(true);
      alert("Profile updated successfully!");
    } catch (networkUpdateError) {
      console.log(networkUpdateError);
      alert("Error updating profile.");
    }
  };

  return (
    <>
      <Topbar setQuery={() => { }} />
      <div className="settingsContainer" style={{ display: "flex" }}>
        <Sidebar />
        <div className="settingsRight" style={{ flex: 4, padding: "20px" }}>
          <div className="settingsWrapper">
            <div className="settingsTitle">
              <span className="settingsUpdateTitle" style={{ fontSize: "30px", color: "teal" }}>Update Your Account</span>
              <span className="settingsDeleteTitle" style={{ color: "red", fontSize: "12px", cursor: "pointer", float: "right" }}>Delete Account</span>
            </div>

            <form className="settingsForm" onSubmit={handleProfileUpdate} style={{ display: "flex", flexDirection: "column", marginTop: "20px" }}>

              <label style={{ fontSize: "20px", marginTop: "20px" }}>Username</label>
              <input
                type="text"
                placeholder={activeUserSession?.username}
                value={accountUsername}
                onChange={(event) => setAccountUsername(event.target.value)}
                style={{ marginTop: "10px", height: "30px", border: "none", borderBottom: "1px solid lightgray" }}
              />

              <label style={{ fontSize: "20px", marginTop: "20px" }}>Email</label>
              <input
                type="email"
                placeholder={activeUserSession?.email}
                value={accountEmail}
                onChange={(event) => setAccountEmail(event.target.value)}
                style={{ marginTop: "10px", height: "30px", border: "none", borderBottom: "1px solid lightgray" }}
              />

              <label style={{ fontSize: "20px", marginTop: "20px" }}>New Password</label>
              <input
                type="password"
                onChange={(event) => setAccountPassword(event.target.value)}
                style={{ marginTop: "10px", height: "30px", border: "none", borderBottom: "1px solid lightgray" }}
              />

              <div className="settingsPrivacy" style={{ marginTop: "20px", display: "flex", alignItems: "center" }}>
                <label style={{ fontSize: "20px", marginRight: "10px" }}>Private Account?</label>
                <input
                  type="checkbox"
                  checked={isAccountPrivate}
                  onChange={(event) => setIsAccountPrivate(event.target.checked)}
                  style={{ transform: "scale(1.5)" }}
                />
                <span style={{ marginLeft: "10px", color: "gray", fontSize: "14px" }}>
                  (If checked, only friends can see your posts)
                </span>
              </div>

              <button
                className="settingsSubmit"
                type="submit"
                style={{ width: "150px", alignSelf: "center", border: "none", borderRadius: "10px", color: "white", backgroundColor: "teal", padding: "10px", marginTop: "20px", cursor: "pointer" }}
              >
                Update
              </button>

              {updateSuccessStatus && <span style={{ color: "green", textAlign: "center", marginTop: "20px" }}>Profile has been updated...</span>}
            </form>
          </div>
        </div>
      </div>
    </>
  );
}