import React, { useState, useEffect } from "react";
import "./Settings.css"; // You'll need to create this CSS file or use inline styles
import Sidebar from "../../components/sidebar/Sidebar";
import Topbar from "../../components/topbar/Topbar";
import axios from "axios";

export default function Settings() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [success, setSuccess] = useState(false);

  // Get current user
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  // Load current data when page opens
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      // Assuming 'isPrivate' is a field in your User model. 
      // If you haven't added it to your backend schema yet, you'll need to do that.
      setIsPrivate(user.isPrivate || false); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSuccess(false);

    const updatedUser = {
      userId: user._id,
      username,
      email,
      isPrivate,
    };

    // If user typed a new password, add it to the request
    if (password) {
      updatedUser.password = password;
    }

    try {
      const res = await axios.put(`http://localhost:5000/api/users/${user._id}`, updatedUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local storage with new data
      localStorage.setItem("user", JSON.stringify(res.data));
      setSuccess(true);
      alert("Profile updated successfully!");
    } catch (err) {
      console.log(err);
      alert("Error updating profile.");
    }
  };

  return (
    <>
      <Topbar setQuery={()=>{}} />
      <div className="settingsContainer" style={{display: "flex"}}>
        <Sidebar />
        <div className="settingsRight" style={{flex: 4, padding: "20px"}}>
          <div className="settingsWrapper">
            <div className="settingsTitle">
              <span className="settingsUpdateTitle" style={{fontSize: "30px", color: "teal"}}>Update Your Account</span>
              <span className="settingsDeleteTitle" style={{color: "red", fontSize: "12px", cursor: "pointer", float: "right"}}>Delete Account</span>
            </div>
            
            <form className="settingsForm" onSubmit={handleUpdate} style={{display: "flex", flexDirection: "column", marginTop: "20px"}}>
              
              <label style={{fontSize: "20px", marginTop: "20px"}}>Username</label>
              <input 
                type="text" 
                placeholder={user?.username} 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{marginTop: "10px", height: "30px", border: "none", borderBottom: "1px solid lightgray"}}
              />
              
              <label style={{fontSize: "20px", marginTop: "20px"}}>Email</label>
              <input 
                type="email" 
                placeholder={user?.email} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{marginTop: "10px", height: "30px", border: "none", borderBottom: "1px solid lightgray"}}
              />
              
              <label style={{fontSize: "20px", marginTop: "20px"}}>New Password</label>
              <input 
                type="password" 
                onChange={(e) => setPassword(e.target.value)}
                style={{marginTop: "10px", height: "30px", border: "none", borderBottom: "1px solid lightgray"}}
              />

              {/* PRIVACY TOGGLE */}
              <div className="settingsPrivacy" style={{marginTop: "20px", display: "flex", alignItems: "center"}}>
                <label style={{fontSize: "20px", marginRight: "10px"}}>Private Account?</label>
                <input 
                    type="checkbox" 
                    checked={isPrivate} 
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    style={{transform: "scale(1.5)"}}
                />
                <span style={{marginLeft: "10px", color: "gray", fontSize: "14px"}}>
                    (If checked, only friends can see your posts)
                </span>
              </div>

              <button 
                className="settingsSubmit" 
                type="submit"
                style={{width: "150px", alignSelf: "center", border: "none", borderRadius: "10px", color: "white", backgroundColor: "teal", padding: "10px", marginTop: "20px", cursor: "pointer"}}
              >
                Update
              </button>
              
              {success && <span style={{color: "green", textAlign: "center", marginTop: "20px"}}>Profile has been updated...</span>}
            </form>
          </div>
        </div>
      </div>
    </>
  );
}