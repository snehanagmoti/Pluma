import React from "react";
import "./Topbar.css";
import { FaSearch, FaUser, FaComment, FaBell } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Topbar({ setQuery }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="topbarContainer">
      <div className="topbarLeft">
        <span className="logo" onClick={() => navigate("/")}>SocialApp</span>
      </div>
      <div className="topbarCenter">
        <div className="searchbar">
          <FaSearch className="searchIcon" />
          <input 
            placeholder="Search for bookn or author..." 
            className="searchInput" 
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="topbarRight">
        <div className="topbarLinks">
          <span className="topbarLink" onClick={() => navigate("/")} style={{ fontWeight: "bold", color: "black" }} >Homepage</span>
         {/* <span className="topbarLink">Timeline</span> */}
          
          <span 
            className="topbarLink" 
            onClick={() => navigate("/write")}
            style={{ fontWeight: "bold", color: "black" }} // Optional styling to make it pop
          >
            Write
          </span>

        </div>
        <div className="topbarIcons">
          <div className="topbarIconItem">
           {/* <FaUser /><span className="topbarIconBadge">1</span> */}
          </div>
          <div className="topbarIconItem">
            {/* <FaComment /><span className="topbarIconBadge">2</span> */}
          </div>
          <div className="topbarIconItem">
             {/* <FaBell /><span className="topbarIconBadge">1</span> */}
          </div>
        </div>
        <img 
            src="https://via.placeholder.com/150" 
            alt="" 
            className="topbarImg" 
            onClick={handleLogout} 
            title="Logout"
        />
      </div>
    </div>
  );
}