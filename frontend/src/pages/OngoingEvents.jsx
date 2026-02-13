import { API_URL } from "../config";
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import Navbar from "../components/Navbar";

const OngoingEvents = () => {
    const { authTokens } = useContext(AuthContext);
    const navigate = useNavigate();
    const [ongoingEvents, setOngoingEvents] = useState([]);

    useEffect(() => {
        fetchOngoingEvents();
    }, []);

    const fetchOngoingEvents = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/events/ongoing`, {
                headers: { "x-auth-token": authTokens.token }
            });
            setOngoingEvents(res.data);
        } catch (err) {
            console.error("Error fetching ongoing events:", err);
        }
    };

    return (
        <div>
            <Navbar />
            <div style={{ padding: "30px", maxWidth: "1400px", margin: "0 auto" }}>
                <h1 style={{ marginBottom: "30px" }}>Ongoing Events</h1>

                {ongoingEvents.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                        <h2 style={{ color: "#666", marginBottom: "10px" }}>No Ongoing Events</h2>
                        <p style={{ color: "#999" }}>Events currently in progress will appear here</p>
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))" }}>
                        {ongoingEvents.map((event) => (
                            <div 
                                key={event._id}
                                onClick={() => navigate(`/event-detail/${event._id}`)}
                                style={{ 
                                    border: "2px solid #28a745", 
                                    borderRadius: "8px", 
                                    padding: "20px",
                                    cursor: "pointer",
                                    backgroundColor: "white",
                                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                    transition: "transform 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "10px" }}>
                                    <h3 style={{ margin: 0, color: "#333" }}>{event.name}</h3>
                                    <span style={{ 
                                        backgroundColor: "#28a745", 
                                        color: "white", 
                                        padding: "4px 10px", 
                                        borderRadius: "12px",
                                        fontSize: "12px",
                                        fontWeight: "bold"
                                    }}>
                                        ONGOING
                                    </span>
                                </div>

                                <span style={{ 
                                    backgroundColor: event.eventType === 'Normal' ? '#e3f2fd' : '#fff3e0', 
                                    color: '#333', 
                                    padding: '4px 8px', 
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    display: 'inline-block',
                                    marginBottom: '15px'
                                }}>
                                    {event.eventType}
                                </span>

                                <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
                                    {event.description.substring(0, 120)}...
                                </p>

                                <div style={{ fontSize: "13px", color: "#555", lineHeight: "1.8" }}>
                                    <div><strong>Started:</strong> {new Date(event.startDate).toLocaleString()}</div>
                                    <div><strong>Ends:</strong> {new Date(event.endDate).toLocaleString()}</div>
                                    <div><strong>Location:</strong> {event.location || "TBA"}</div>
                                    <div><strong>Participants:</strong> {event.participants?.length || 0} / {event.registrationLimit}</div>
                                </div>

                                <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #eee" }}>
                                    <span style={{ fontSize: "12px", color: "#28a745", fontWeight: "bold" }}>
                                        Click to view details →
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OngoingEvents;
