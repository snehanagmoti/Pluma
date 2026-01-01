import React from "react";
import "./Sidebar.css";
import { 
  MdChat, 
  MdGroup, 
  MdBookmark, 
  MdSettings,
  MdPerson 
} from "react-icons/md";
import { Link } from "react-router-dom";

export default function Sidebar() {
  // Get current user to link to their profile
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="sidebar">
      <div className="sidebarWrapper">
        <ul className="sidebarList">
          
          {/* 1. Profile Link */}
          <Link to={`/profile/${user?.username}`} style={{textDecoration:"none", color:"inherit"}}>
            <li className="sidebarListItem">
                <MdPerson className="sidebarIcon" />
                <span className="sidebarListItemText">My Profile</span>
            </li>
          </Link>

          {/* 2. Chats */}
          <Link to="/chats" style={{textDecoration:"none", color:"inherit"}}>
            <li className="sidebarListItem">
                <MdChat className="sidebarIcon" />
                <span className="sidebarListItemText">Chats</span>
            </li>
          </Link>

          {/* 3. Groups */}
          <Link to="/groups" style={{textDecoration:"none", color:"inherit"}}>
            <li className="sidebarListItem">
                <MdGroup className="sidebarIcon" />
                <span className="sidebarListItemText">Groups</span>
            </li>
          </Link>

          {/* 4. Bookmarks */}
          <Link to="/bookmarks" style={{textDecoration:"none", color:"inherit"}}>
            <li className="sidebarListItem">
                <MdBookmark className="sidebarIcon" />
                <span className="sidebarListItemText">Bookmarks</span>
            </li>
          </Link>

          <hr className="sidebarHr" />

          {/* 5. Account Settings (New Feature) */}
          <Link to="/settings" style={{textDecoration:"none", color:"inherit"}}>
            <li className="sidebarListItem">
                <MdSettings className="sidebarIcon" />
                <span className="sidebarListItemText">Account Settings</span>
            </li>
          </Link>

        </ul>
        
        {/* Friend List (Optional: Keep or Remove based on preference) */}
        {/*<h4 style={{fontSize:"14px", color:"#555", margin:"10px 0"}}>Friends</h4>
        <ul className="sidebarFriendList">
          <li className="sidebarFriend">
            <img className="sidebarFriendImg" src="https://via.placeholder.com/150" alt="" />
            <span className="sidebarFriendName">Jane Doe</span>
          </li>
          <li className="sidebarFriend">
            <img className="sidebarFriendImg" src="https://via.placeholder.com/150" alt="" />
            <span className="sidebarFriendName">John Smith</span>
          </li>
        </ul>*/}
      </div>
    </div>
  );
}