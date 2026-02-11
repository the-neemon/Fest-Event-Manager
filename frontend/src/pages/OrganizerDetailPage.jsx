import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

const OrganizerDetailPage = () => {
    const { organizerId } = useParams();
    const navigate = useNavigate();
    const [organizer, setOrganizer] = useState(null);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [pastEvents, setPastEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrganizerDetails();
    }, [organizerId]);

    const fetchOrganizerDetails = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/auth/organizer/${organizerId}`);
            setOrganizer(res.data.organizer);
            setUpcomingEvents(res.data.upcomingEvents);
            setPastEvents(res.data.pastEvents);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching organizer details:", err);
            alert("Failed to load organizer details");
            navigate("/clubs");
        }
    };

    if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;
    if (!organizer) return <div style={{ padding: "20px" }}>Organizer not found</div>;

    return (
        <div>
            <Navbar />
            <div style={{ maxWidth: "1000px", margin: "20px auto", padding: "20px" }}>
                <button 
                    onClick={() => navigate("/clubs")} 
                    style={{ marginBottom: "20px", padding: "8px 16px", cursor: "pointer", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px" }}
                >
                    Back to Clubs
                </button>

                {/* Organizer Info Card */}
                <div style={{ border: "2px solid #007bff", padding: "30px", borderRadius: "8px", marginBottom: "30px", backgroundColor: "#f8f9fa" }}>
                    <h1 style={{ margin: "0 0 10px", color: "#007bff" }}>{organizer.organizerName}</h1>
                    <span style={{ backgroundColor: "#007bff", color: "white", padding: "4px 12px", borderRadius: "4px", fontSize: "14px", fontWeight: "bold" }}>
                        {organizer.category}
                    </span>
                    <p style={{ marginTop: "15px", fontSize: "16px", color: "#333" }}>{organizer.description || "No description available."}</p>
                    <p style={{ marginTop: "10px", fontSize: "14px", color: "#555" }}>
                        <strong>Contact Email:</strong> {organizer.contactEmail || organizer.email}
                    </p>
                </div>

                {/* Upcoming Events */}
                <div style={{ marginBottom: "30px" }}>
                    <h2 style={{ borderBottom: "2px solid #28a745", paddingBottom: "10px", color: "#28a745" }}>
                        Upcoming Events ({upcomingEvents.length})
                    </h2>
                    {upcomingEvents.length === 0 ? (
                        <p style={{ color: "#777", fontStyle: "italic", marginTop: "10px" }}>No upcoming events</p>
                    ) : (
                        <div style={{ display: "grid", gap: "15px", marginTop: "15px" }}>
                            {upcomingEvents.map((event) => (
                                <div key={event._id} style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "6px", backgroundColor: "white" }}>
                                    <h3 style={{ margin: "0 0 5px" }}>{event.eventName}</h3>
                                    <span style={{ 
                                        backgroundColor: event.eventType === "Merchandise" ? "#ff6b6b" : "#4dabf7", 
                                        color: "white", 
                                        padding: "3px 8px", 
                                        borderRadius: "3px", 
                                        fontSize: "12px" 
                                    }}>
                                        {event.eventType}
                                    </span>
                                    <p style={{ margin: "10px 0 5px", color: "#555" }}>{event.eventDescription}</p>
                                    <p style={{ fontSize: "14px", margin: "5px 0" }}>
                                        <strong>Date:</strong> {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                                    </p>
                                    <p style={{ fontSize: "14px", margin: "5px 0" }}>
                                        <strong>Location:</strong> {event.location || "TBA"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Past Events */}
                <div>
                    <h2 style={{ borderBottom: "2px solid #6c757d", paddingBottom: "10px", color: "#6c757d" }}>
                        Past Events ({pastEvents.length})
                    </h2>
                    {pastEvents.length === 0 ? (
                        <p style={{ color: "#777", fontStyle: "italic", marginTop: "10px" }}>No past events</p>
                    ) : (
                        <div style={{ display: "grid", gap: "15px", marginTop: "15px" }}>
                            {pastEvents.map((event) => (
                                <div key={event._id} style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "6px", backgroundColor: "#f8f9fa" }}>
                                    <h3 style={{ margin: "0 0 5px", color: "#6c757d" }}>{event.eventName}</h3>
                                    <span style={{ 
                                        backgroundColor: event.eventType === "Merchandise" ? "#ff6b6b" : "#4dabf7", 
                                        color: "white", 
                                        padding: "3px 8px", 
                                        borderRadius: "3px", 
                                        fontSize: "12px" 
                                    }}>
                                        {event.eventType}
                                    </span>
                                    <p style={{ margin: "10px 0 5px", color: "#555" }}>{event.eventDescription}</p>
                                    <p style={{ fontSize: "14px", margin: "5px 0" }}>
                                        <strong>Date:</strong> {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                                    </p>
                                    <p style={{ fontSize: "14px", margin: "5px 0" }}>
                                        <strong>Location:</strong> {event.location || "TBA"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrganizerDetailPage;
