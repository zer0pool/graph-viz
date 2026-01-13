import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../app/AuthContext";
import "../styles/components/UserMenu.css";

export const UserMenu: React.FC = () => {
  const [showProfile, setShowProfile] = useState(false);
  const { user, login, logout } = useAuth();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setShowProfile(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogin = () => {
    console.info("[UserMenu] Initiating login flow");
    login();
  };

  return (
    <div id="user-controls" ref={profileRef}>
      {!user ? (
        <button id="login-btn" onClick={handleLogin} className="btn-primary">
          Sign in
        </button>
      ) : (
        <div
          id="user-chip"
          className="user-chip"
          onClick={() => setShowProfile(!showProfile)}
        >
          <img
            id="user-avatar"
            src={
              user.picture ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user.name || user.email || user.sub
              )}&background=1a73e8&color=fff`
            }
            alt="User profile"
          />
          <span className="user-name">
            {user.name || user.preferred_username || user.email || user.sub}
          </span>
          <span className="caret">▼</span>
        </div>
      )}

      {user && showProfile && (
        <div id="profile-panel">
          <div className="profile-header">
            <img
              src={
                user.picture ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user.name || user.email || user.sub
                )}&background=3b82f6&color=fff&size=64`
              }
              alt="Profile"
              className="profile-avatar-large"
            />
            <h3 className="profile-name">
              {user.name || user.preferred_username || user.sub}
            </h3>
            <div className="profile-email">{user.email}</div>
            {(user.title || user.jobTitle) && (
              <div className="profile-info">{user.title || user.jobTitle}</div>
            )}
            {user.department && (
              <div className="profile-info">{user.department}</div>
            )}
            <div className="profile-id">ID: {user.sub}</div>
          </div>
          <button
            id="logout-btn"
            onClick={() => {
              logout();
              setShowProfile(false);
            }}
            className="btn-secondary"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
};
