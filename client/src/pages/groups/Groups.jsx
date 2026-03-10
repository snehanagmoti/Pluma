import React, { useState } from "react";
import "./Groups.css";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";

export default function Groups() {
  const [communityGroups, setCommunityGroups] = useState([
    { id: 1, name: "Sci-Fi Lovers", desc: "Discussing the future of humanity.", members: 120 },
    { id: 2, name: "Writers Club", desc: "Share your drafts and get feedback.", members: 85 },
    { id: 3, name: "Coding Help", desc: "Stuck on a bug? Ask here.", members: 340 },
  ]);

  return (
    <>
      <Topbar setQuery={() => { }} />
      <div className="groupsContainer">
        <Sidebar />
        <div className="groupsRight">
          <div className="groupsHeader">
            <h2 className="groupsTitle">Communities & Groups</h2>
            <button className="createGroupBtn">+ Create New Group</button>
          </div>

          <div className="groupsWrapper">
            {communityGroups.map((groupItem) => (
              <div key={groupItem.id} className="groupCard">
                <img
                  src="https://via.placeholder.com/100"
                  alt=""
                  className="groupImg"
                />
                <div className="groupInfo">
                  <h3 className="groupName">{groupItem.name}</h3>
                  <p className="groupDesc">{groupItem.desc}</p>
                  <span className="groupMembers">{groupItem.members} Members</span>
                  <button className="joinBtn">Join Group</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}