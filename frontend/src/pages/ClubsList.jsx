import { useState, useEffect, useContext } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import AuthContext from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ClubsList = () => {
    const [clubs, setClubs] = useState([]);
    const [followedOrganizers, setFollowedOrganizers] = useState([]);
    const { authTokens } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        fetchClubs();
        fetchFollowedOrganizers();
    }, []);

    const fetchClubs = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/auth/organizers");
            setClubs(res.data);
        } catch (err) {
            console.error("Error fetching clubs");
        }
    };

    const fetchFollowedOrganizers = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/auth/followed-organizers", {
                headers: { "x-auth-token": authTokens.token }
            });
            setFollowedOrganizers(res.data);
        } catch (err) {
            console.error("Error fetching followed organizers");
        }
    };

    const handleFollow = async (organizerId) => {
        try {
            await axios.post(`http://localhost:5000/api/auth/follow/${organizerId}`, {}, {
                headers: { "x-auth-token": authTokens.token }
            });
            alert("Successfully followed!");
            fetchFollowedOrganizers();
        } catch (error) {
            console.error("Follow error:", error);
            alert(error.response?.data?.msg || "Failed to follow");
        }
    };

    const handleUnfollow = async (organizerId) => {
        try {
            await axios.delete(`http://localhost:5000/api/auth/unfollow/${organizerId}`, {
                headers: { "x-auth-token": authTokens.token }
            });
            alert("Successfully unfollowed!");
            fetchFollowedOrganizers();
        } catch (error) {
            console.error("Unfollow error:", error);
            alert(error.response?.data?.msg || "Failed to unfollow");
        }
    };

    const isFollowing = (organizerId) => {
        return followedOrganizers.some(id => id === organizerId);
    };

    return (
        <div>
            <Navbar />
            <div style={{ maxWidth: "800px", margin: "20px auto", padding: "20px" }}>
                <h2>Clubs</h2>
                <div style={{ display: "grid", gap: "20px" }}>
                    {clubs.map((club) => (
                        <div key={club._id} style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                <div style={{ flex: 1 }}>
                                    <h3 
                                        onClick={() => navigate(`/organizer/${club._id}`)}
                                        style={{ margin: "0 0 5px", cursor: "pointer", color: "#007bff", textDecoration: "underline" }}
                                    >
                                        {club.organizerName}
                                    </h3>
                                    <span style={{ backgroundColor: "#e9ecef", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>
                                        {club.category}
                                    </span>
                                    <p style={{ fontStyle: "italic", color: "#555", marginTop: "10px" }}>{club.description || "No description provided."}</p>
                                </div>
                                <button
                                    onClick={() => isFollowing(club._id) ? handleUnfollow(club._id) : handleFollow(club._id)}
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: isFollowing(club._id) ? "#6c757d" : "#007bff",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "bold",
                                        marginLeft: "15px"
                                    }}
                                >
                                    {isFollowing(club._id) ? "Unfollow" : "Follow"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ClubsList;