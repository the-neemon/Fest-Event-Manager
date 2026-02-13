import { API_URL } from "../config";
import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import Navbar from "../components/Navbar";
import DiscussionForum from "../components/DiscussionForum";

const ParticipantEventDetail = () => {
    const { eventId } = useParams();
    const { authTokens } = useContext(AuthContext);
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [registration, setRegistration] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRegistration();
    }, [eventId]);

    const fetchRegistration = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/events/my-registrations`, {
                headers: { "x-auth-token": authTokens.token }
            });
            const reg = res.data.find(r => r.eventId._id === eventId);
            
            if (reg && reg.eventId) {
                setRegistration(reg);
                setEvent(reg.eventId); // Get event data from registration
                setLoading(false);
            } else {
                alert("Event not found or you're not registered");
                navigate("/my-events");
            }
        } catch (err) {
            console.error("Error fetching registration:", err);
            alert("Failed to load event details");
            navigate("/my-events");
        }
    };

    if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;
    if (!event) return <div style={{ padding: "20px" }}>Event not found</div>;

    return (
        <div>
            <Navbar />
            <div style={{ padding: "30px", maxWidth: "1400px", margin: "0 auto" }}>
                <button 
                    onClick={() => navigate("/my-events")}
                    style={{ 
                        marginBottom: "20px", 
                        padding: "8px 16px", 
                        backgroundColor: "#6c757d", 
                        color: "white", 
                        border: "none", 
                        borderRadius: "4px", 
                        cursor: "pointer" 
                    }}
                >
                    ← Back to My Events
                </button>

                <div style={{
                    backgroundColor: "white",
                    borderRadius: "10px",
                    padding: "30px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    marginBottom: "30px"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                        <div>
                            <h1 style={{ marginBottom: "10px", color: "#333" }}>{event.name}</h1>
                            <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
                                <span style={{
                                    backgroundColor: event.status === 'Upcoming' ? '#007bff' : 
                                                   event.status === 'Ongoing' ? '#28a745' : '#6c757d',
                                    color: "white",
                                    padding: "5px 12px",
                                    borderRadius: "4px",
                                    fontSize: "14px",
                                    fontWeight: "bold"
                                }}>
                                    {event.status}
                                </span>
                                <span style={{
                                    backgroundColor: "#f8f9fa",
                                    padding: "5px 12px",
                                    borderRadius: "4px",
                                    fontSize: "14px",
                                    color: "#666"
                                }}>
                                    {event.eventType}
                                </span>
                            </div>
                        </div>
                        {registration && registration.ticketId && (
                            <button
                                onClick={() => {
                                    // Show ticket modal or navigate to ticket view
                                    navigate("/my-events");
                                }}
                                style={{
                                    padding: "10px 20px",
                                    backgroundColor: "#28a745",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontWeight: "bold"
                                }}
                            >
                                View Ticket
                            </button>
                        )}
                    </div>

                    <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
                        gap: "20px",
                        marginTop: "20px",
                        padding: "20px",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "8px"
                    }}>
                        <div>
                            <strong style={{ color: "#666", fontSize: "13px" }}>Start Date</strong>
                            <p style={{ margin: "5px 0 0", fontSize: "15px" }}>
                                {new Date(event.startDate).toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <strong style={{ color: "#666", fontSize: "13px" }}>End Date</strong>
                            <p style={{ margin: "5px 0 0", fontSize: "15px" }}>
                                {new Date(event.endDate).toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <strong style={{ color: "#666", fontSize: "13px" }}>Location</strong>
                            <p style={{ margin: "5px 0 0", fontSize: "15px" }}>
                                {event.location || "TBA"}
                            </p>
                        </div>
                        <div>
                            <strong style={{ color: "#666", fontSize: "13px" }}>Organizer</strong>
                            <p style={{ margin: "5px 0 0", fontSize: "15px" }}>
                                {event.organizerId?.organizerName || "Unknown"}
                            </p>
                        </div>
                    </div>

                    <div style={{ marginTop: "20px" }}>
                        <h3 style={{ marginBottom: "10px", color: "#333" }}>Description</h3>
                        <p style={{ lineHeight: "1.6", color: "#555" }}>
                            {event.description || "No description available"}
                        </p>
                    </div>

                    {event.registrationFee > 0 && (
                        <div style={{ 
                            marginTop: "20px", 
                            padding: "15px", 
                            backgroundColor: "#e7f3ff",
                            borderRadius: "6px",
                            borderLeft: "4px solid #007bff"
                        }}>
                            <strong>Registration Fee:</strong> ₹{event.registrationFee}
                        </div>
                    )}

                    {event.merchandiseAvailable && (
                        <div style={{ 
                            marginTop: "20px", 
                            padding: "15px", 
                            backgroundColor: "#fff3cd",
                            borderRadius: "6px",
                            borderLeft: "4px solid #ffc107"
                        }}>
                            <strong>Merchandise Available!</strong>
                            <p style={{ margin: "5px 0 0" }}>
                                Price: ₹{event.merchandisePrice} | Available: {event.merchandiseStock} items
                            </p>
                        </div>
                    )}

                    {registration && (
                        <div style={{ 
                            marginTop: "20px", 
                            padding: "15px", 
                            backgroundColor: "#d4edda",
                            borderRadius: "6px",
                            borderLeft: "4px solid #28a745"
                        }}>
                            <strong>✓ You are registered for this event</strong>
                            <p style={{ margin: "5px 0 0", fontSize: "14px" }}>
                                Registration Date: {new Date(registration.registrationDate).toLocaleDateString()}
                            </p>
                            {registration.ticketId && (
                                <p style={{ margin: "5px 0 0", fontSize: "14px", fontFamily: "monospace" }}>
                                    Ticket ID: {registration.ticketId}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Discussion Forum */}
                {registration && <DiscussionForum eventId={eventId} isOrganizer={false} />}
                
                {!registration && (
                    <div style={{
                        backgroundColor: "#f8f9fa",
                        padding: "40px",
                        textAlign: "center",
                        borderRadius: "10px"
                    }}>
                        <h3 style={{ color: "#666" }}>You must be registered for this event to access the discussion forum</h3>
                        <button
                            onClick={() => navigate("/home")}
                            style={{
                                marginTop: "20px",
                                padding: "10px 20px",
                                backgroundColor: "#007bff",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: "bold"
                            }}
                        >
                            Browse Events
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParticipantEventDetail;
