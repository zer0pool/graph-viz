import React from "react";
import { useAuth } from "../app/AuthContext";

export const TopBar = () => {
    const { user, login, logout } = useAuth();

    return (
        <header style={{
            height: 60,
            background: "#222",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            justifyContent: "space-between"
        }}>
            <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Lineage Platform</div>
            <div>
                {user ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span>Welcome, {user}</span>
                        <button onClick={logout} style={{ padding: "4px 8px" }}>Logout</button>
                    </div>
                ) : (
                    <button onClick={() => login("Admin User")} style={{ padding: "4px 8px" }}>Login</button>
                )}
            </div>
        </header>
    );
};
