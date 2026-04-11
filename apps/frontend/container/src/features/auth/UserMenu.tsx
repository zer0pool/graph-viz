import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import "../../styles/components/UserMenu.css";
import { getAvatarColor } from "../../shared/lib/utils";

export const UserMenu: React.FC = () => {
  const [showProfile, setShowProfile] = useState(false);
  const { user, login, logout } = useAuth();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
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
        <div id="user-chip" className="user-chip" onClick={() => setShowProfile(!showProfile)}>
          {user.picture ? (
            <img id="user-avatar" src={user.picture} alt="User profile" />
          ) : (
            (() => {
              const displayName = user.name || user.email || user.sub || "User";
              const colors = getAvatarColor(displayName);
              const initials = displayName
                .split(/[\s.@]/)
                .filter((s) => s.length > 0)
                .slice(0, 2)
                .map((s) => s[0])
                .join("")
                .toUpperCase();
              return (
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${colors.bg} ${colors.text} text-xs font-semibold mr-2`}
                >
                  {initials || "?"}
                </div>
              );
            })()
          )}
          <span className="user-name">
            {user.name || user.preferred_username || user.email || user.sub}
          </span>
          <span className="caret">▼</span>
        </div>
      )}

      {user && showProfile && (
        <div id="profile-panel">
          <div className="profile-header">
            {user.picture ? (
              <img src={user.picture} alt="Profile" className="profile-avatar-large" />
            ) : (
              (() => {
                const displayName = user.name || user.email || user.sub || "User";
                const colors = getAvatarColor(displayName);
                const initials = displayName
                  .split(/[\s.@]/)
                  .filter((s) => s.length > 0)
                  .slice(0, 2)
                  .map((s) => s[0])
                  .join("")
                  .toUpperCase();
                return (
                  <div
                    className={`w-16 h-16 rounded-xl ${colors.bg} ${colors.text} text-2xl font-bold flex items-center justify-center`}
                  >
                    {initials || "?"}
                  </div>
                );
              })()
            )}
            <h3 className="profile-name">{user.name || user.preferred_username || user.sub}</h3>
            <div className="profile-email">{user.email}</div>
            {(user.title || user.jobTitle) && (
              <div className="profile-info">{user.title || user.jobTitle}</div>
            )}
            {user.department && <div className="profile-info">{user.department}</div>}
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
