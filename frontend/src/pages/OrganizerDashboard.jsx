import { API_URL } from "../config";
import { useState, useEffect, useContext } from "react";
import AuthContext from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

const OrganizerDashboard = () => {
    const { authTokens } = useContext(AuthContext);
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [analytics, setAnalytics] = useState(null);

    useEffect(() => {
        fetchEvents();
        fetchAnalytics();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/events/my-events`, {
                headers: { "x-auth-token": authTokens.token }
            });
            // client-side patch: backend auto-updates every 60s but this ensures correct status on the very first fetch
            const updatedEvents = res.data.map(event => {
                const now = new Date();
                const endDate = new Date(event.endDate);
                if (endDate < now && event.status !== 'Completed' && event.status !== 'Closed') {
                    return { ...event, status: 'Completed' };
                }
                return event;
            });
            setEvents(updatedEvents);
        } catch (err) {
            console.error("Error fetching events:", err);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/events/analytics`, {
                headers: { "x-auth-token": authTokens.token }
            });
            setAnalytics(res.data);
        } catch (err) {
            console.error("Error fetching analytics:", err);
        }
    };

    // lookup object instead of an if-chain; returns grey as default for unknown statuses
    const getStatusColor = (status) => {
        const colors = {
            'Draft': '#6c757d',
            'Published': '#007bff',
            'Ongoing': '#28a745',
            'Completed': '#17a2b8',
            'Closed': '#dc3545'
        };
        return colors[status] || '#6c757d';
    };

    return (
        <div>
            <Navbar />
            <div style={{ padding: "30px", maxWidth: "1400px", margin: "0 auto" }}>
                <h1 style={{ marginBottom: "30px" }}>Organizer Dashboard</h1>

                {/* Analytics Section */}
                {analytics && (
                    <div style={{ marginBottom: "40px" }}>
                        <h2 style={{ marginBottom: "20px" }}>Event Analytics (Completed Events)</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                            <div style={{ backgroundColor: "#e3f2fd", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                                <h3 style={{ margin: "0 0 10px", fontSize: "32px", color: "#1976d2" }}>{analytics.totalRegistrations}</h3>
                                <p style={{ margin: 0, color: "#555" }}>Total Registrations</p>
                            </div>
                            <div style={{ backgroundColor: "#e8f5e9", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                                <h3 style={{ margin: "0 0 10px", fontSize: "32px", color: "#388e3c" }}>{analytics.totalSales}</h3>
                                <p style={{ margin: 0, color: "#555" }}>Total Sales</p>
                            </div>
                            <div style={{ backgroundColor: "#fff3e0", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                                <h3 style={{ margin: "0 0 10px", fontSize: "32px", color: "#f57c00" }}>₹{analytics.totalRevenue}</h3>
                                <p style={{ margin: 0, color: "#555" }}>Total Revenue</p>
                            </div>
                            <div style={{ backgroundColor: "#fce4ec", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                                <h3 style={{ margin: "0 0 10px", fontSize: "32px", color: "#c2185b" }}>{analytics.totalAttendance}</h3>
                                <p style={{ margin: 0, color: "#555" }}>Total Attendance</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Events Carousel */}
                <div>
                    <h2 style={{ marginBottom: "20px" }}>My Events ({events.length})</h2>
                    {events.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                            <p style={{ fontSize: "18px", color: "#666" }}>No events found. Create your first event!</p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                            {events.map((event) => (
                                <div 
                                    key={event._id} 
                                    onClick={() => navigate(`/event-detail/${event._id}`)}
                                    style={{ 
                                        border: "1px solid #ddd", 
                                        borderRadius: "8px", 
                                        padding: "20px", 
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                        cursor: "pointer",
                                        transition: "transform 0.2s",
                                        backgroundColor: "white"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                                >
                                    <h3 style={{ margin: "0 0 15px 0", color: "#333", fontSize: "20px" }}>{event.name}</h3>
                                    
                                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                        <span style={{ 
                                            backgroundColor: event.eventType === 'Normal' ? '#e3f2fd' : '#fff3e0', 
                                            color: '#333', 
                                            padding: '6px 12px', 
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            fontWeight: 'bold'
                                        }}>
                                            {event.eventType}
                                        </span>
                                        <span style={{ 
                                            backgroundColor: getStatusColor(event.status), 
                                            color: 'white', 
                                            padding: '6px 12px', 
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            fontWeight: 'bold'
                                        }}>
                                            {event.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrganizerDashboard;
