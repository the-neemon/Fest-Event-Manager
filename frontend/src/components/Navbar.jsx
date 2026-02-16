import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";

const Navbar = () => {
    const { user, logoutUser } = useContext(AuthContext);
    const navigate = useNavigate();

    // Only show Navbar if logged in
    if (!user) return null;

    return (
        <nav style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "15px 30px", backgroundColor: "#343a40", color: "white"
        }}>
            {/* Logo */}
            <div style={{ fontSize: "20px", fontWeight: "bold", cursor: "pointer" }} onClick={() => navigate("/events")}>
                IIIT Events
            </div>

            {/* Dynamic Links based on role */}
            <div style={{ display: "flex", gap: "25px" }}>
                {user.role === "participant" && (
                    <>
                        <Link to="/my-events" style={linkStyle}>Dashboard</Link>
                        <Link to="/events" style={linkStyle}>Browse Events</Link>
                        <Link to="/clubs" style={linkStyle}>Clubs</Link>
                        <Link to="/profile" style={linkStyle}>Profile</Link>
                    </>
                )}
                
                {user.role === "organizer" && (
                    <>
                        <Link to="/organizer-dashboard" style={linkStyle}>Dashboard</Link>
                        <Link to="/create-event" style={linkStyle}>Create Event</Link>
                        <Link to="/ongoing-events" style={linkStyle}>Ongoing Events</Link>
                        <Link to="/organizer-profile" style={linkStyle}>Profile</Link>
                    </>
                )}
                
                {user.role === "admin" && (
                    <>
                        <Link to="/admin-dashboard" style={linkStyle}>Dashboard</Link>
                        <Link to="/manage-organizers" style={linkStyle}>Manage Clubs</Link>
                        <Link to="/password-reset-requests" style={linkStyle}>Password Reset Requests</Link>
                    </>
                )}
            </div>

            {/* Logout */}
            <button 
                onClick={logoutUser} 
                style={{ 
                    padding: "8px 16px", backgroundColor: "#dc3545", color: "white", 
                    border: "none", borderRadius: "4px", cursor: "pointer" 
                }}
            >
                Logout
            </button>
        </nav>
    );
};

const linkStyle = {
    color: "#f8f9fa",
    textDecoration: "none",
    fontSize: "16px",
    fontWeight: "500"
};

export default Navbar;