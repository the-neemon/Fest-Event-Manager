import { API_URL } from "../config";
import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import Navbar from "../components/Navbar";

const EventDetailPage = () => {
    const { eventId } = useParams();
    const { authTokens } = useContext(AuthContext);
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({});

    useEffect(() => {
        fetchEventDetails();
        fetchParticipants();
    }, [eventId]);

    const fetchEventDetails = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/events/detail/${eventId}`, {
                headers: { "x-auth-token": authTokens.token }
            });
            setEvent(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching event details:", err);
            alert("Failed to load event details");
            navigate("/organizer-dashboard");
        }
    };

    const fetchParticipants = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/events/${eventId}/participants`, {
                headers: { "x-auth-token": authTokens.token }
            });
            setParticipants(res.data);
        } catch (err) {
            console.error("Error fetching participants:", err);
        }
    };


    const handlePublish = async () => {
        try {
            await axios.put(`${API_URL}/api/events/${eventId}/publish`, {}, {
                headers: { "x-auth-token": authTokens.token }
            });
            alert("Event published successfully!");
            fetchEventDetails(); // Refresh to show updated status
        } catch (err) {
            alert(err.response?.data?.msg || "Failed to publish event");
        }
    };

    const handleEdit = () => {
        setEditMode(true);
        setEditData({
            description: event.description,
            registrationDeadline: event.registrationDeadline,
            registrationLimit: event.registrationLimit,
            name: event.name,
            startDate: event.startDate,
            endDate: event.endDate,
            location: event.location,
            registrationFee: event.registrationFee,
            eligibility: event.eligibility
        });
    };

    const handleCancelEdit = () => {
        setEditMode(false);
        setEditData({});
    };

    const handleSaveEdit = async () => {
        try {
            await axios.put(`${API_URL}/api/events/${eventId}/update`, editData, {
                headers: { "x-auth-token": authTokens.token }
            });
            alert("Event updated successfully!");
            setEditMode(false);
            fetchEventDetails();
        } catch (err) {
            alert(err.response?.data?.msg || "Failed to update event");
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            await axios.put(`${API_URL}/api/events/${eventId}/status`, 
                { status: newStatus },
                { headers: { "x-auth-token": authTokens.token } }
            );
            alert("Status updated successfully!");
            fetchEventDetails();
        } catch (err) {
            alert(err.response?.data?.msg || "Failed to update status");
        }
    };

    const handleExportCSV = () => {
        const csvContent = [
            ["Name", "Email", "Registration Date", "Payment", "Attendance", "Ticket ID"],
            ...filteredParticipants.map(p => [
                `${p.participantId.firstName} ${p.participantId.lastName}`,
                p.participantId.email,
                new Date(p.registrationDate).toLocaleDateString(),
                event.registrationFee || "Free",
                p.attendance?.marked ? "Present" : "Absent",
                p.ticketId
            ])
        ].map(row => row.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${event.name}_participants.csv`;
        a.click();
    };

    if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;
    if (!event) return <div style={{ padding: "20px" }}>Event not found</div>;

    const filteredParticipants = participants.filter(p => 
        p.participantId.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.participantId.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.participantId.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const registrationCount = participants.length;
    const attendanceCount = participants.filter(p => p.attendance?.marked).length;
    const revenue = registrationCount * (event.registrationFee || 0);

    return (
        <div>
            <Navbar />
            <div style={{ padding: "30px", maxWidth: "1400px", margin: "0 auto" }}>
                <button 
                    onClick={() => navigate("/organizer-dashboard")}
                    style={{ marginBottom: "20px", padding: "8px 16px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                >
                    ← Back to Dashboard
                </button>

                {/* Event Overview */}
                <div style={{ backgroundColor: "#f8f9fa", padding: "30px", borderRadius: "8px", marginBottom: "30px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "20px" }}>
                        <div style={{ flex: 1 }}>
                            {editMode && event.status === 'Draft' ? (
                                <input 
                                    value={editData.name}
                                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                                    style={{ fontSize: "32px", fontWeight: "bold", width: "100%", padding: "5px", marginBottom: "10px" }}
                                />
                            ) : (
                                <h1 style={{ margin: "0 0 10px" }}>{event.name}</h1>
                            )}
                            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                                <span style={{ backgroundColor: "#007bff", color: "white", padding: "4px 12px", borderRadius: "4px", fontSize: "14px" }}>
                                    {event.eventType}
                                </span>
                                <span style={{ backgroundColor: event.status === 'Published' ? '#28a745' : event.status === 'Draft' ? '#6c757d' : event.status === 'Ongoing' ? '#ffc107' : '#dc3545', color: "white", padding: "4px 12px", borderRadius: "4px", fontSize: "14px" }}>
                                    {event.status}
                                </span>
                            </div>
                            {editMode ? (
                                <textarea
                                    value={editData.description}
                                    onChange={(e) => setEditData({...editData, description: e.target.value})}
                                    style={{ fontSize: "16px", width: "100%", padding: "8px", minHeight: "80px" }}
                                />
                            ) : (
                                <p style={{ fontSize: "16px", color: "#555", marginTop: "10px" }}>{event.description}</p>
                            )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {editMode ? (
                                <>
                                    <button onClick={handleSaveEdit} style={{ backgroundColor: "#28a745", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Save Changes</button>
                                    <button onClick={handleCancelEdit} style={{ backgroundColor: "#6c757d", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer" }}>Cancel</button>
                                </>
                            ) : (
                                <>
                                    {event.status === 'Draft' && (
                                        <>
                                            <button onClick={handleEdit} style={{ backgroundColor: "#007bff", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Edit Event</button>
                                            <button onClick={handlePublish} style={{ backgroundColor: "#28a745", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Publish Event</button>
                                        </>
                                    )}
                                    {event.status === 'Published' && (
                                        <button onClick={handleEdit} style={{ backgroundColor: "#007bff", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Edit Limited</button>
                                    )}
                                    {event.eventType === 'Merchandise' && (
                                        <button 
                                            onClick={() => navigate(`/payment-approval/${event._id}`)} 
                                            style={{ backgroundColor: "#ffc107", color: "#000", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
                                        >
                                            Payment Approvals
                                        </button>
                                    )}
                                    {(event.status === 'Ongoing' || event.status === 'Completed') && (
                                        <button 
                                            onClick={() => navigate(`/attendance-tracking/${event._id}`)} 
                                            style={{ backgroundColor: "#17a2b8", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
                                        >
                                            Track Attendance
                                        </button>
                                    )}
                                    {event.status === 'Completed' && (
                                        <button 
                                            onClick={() => navigate(`/feedback/${event._id}`)} 
                                            style={{ backgroundColor: "#28a745", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
                                        >
                                            View Feedback
                                        </button>
                                    )}
                                    {(event.status === 'Published' || event.status === 'Ongoing') && (
                                        <select onChange={(e) => handleStatusChange(e.target.value)} value={event.status} style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ddd", cursor: "pointer" }}>
                                            <option value="Published">Published</option>
                                            <option value="Ongoing">Ongoing</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginTop: "20px" }}>
                        <div>
                            <strong>Start Date:</strong><br />
                            {editMode && event.status === 'Draft' ? (
                                <input type="datetime-local" value={editData.startDate?.slice(0, 16)} onChange={(e) => setEditData({...editData, startDate: e.target.value})} style={{ width: "100%" }} />
                            ) : (
                                new Date(event.startDate).toLocaleString()
                            )}
                        </div>
                        <div>
                            <strong>End Date:</strong><br />
                            {editMode && event.status === 'Draft' ? (
                                <input type="datetime-local" value={editData.endDate?.slice(0, 16)} onChange={(e) => setEditData({...editData, endDate: e.target.value})} style={{ width: "100%" }} />
                            ) : (
                                new Date(event.endDate).toLocaleString()
                            )}
                        </div>
                        <div>
                            <strong>Registration Deadline:</strong><br />
                            {editMode ? (
                                <input type="datetime-local" value={editData.registrationDeadline?.slice(0, 16)} onChange={(e) => setEditData({...editData, registrationDeadline: e.target.value})} style={{ width: "100%" }} />
                            ) : (
                                new Date(event.registrationDeadline).toLocaleString()
                            )}
                        </div>
                        <div>
                            <strong>Location:</strong><br />
                            {editMode && event.status === 'Draft' ? (
                                <input value={editData.location} onChange={(e) => setEditData({...editData, location: e.target.value})} style={{ width: "100%" }} />
                            ) : (
                                event.location || "TBA"
                            )}
                        </div>
                        <div>
                            <strong>Eligibility:</strong><br />
                            {editMode && event.status === 'Draft' ? (
                                <select value={editData.eligibility} onChange={(e) => setEditData({...editData, eligibility: e.target.value})} style={{ width: "100%" }}>
                                    <option value="All">All</option>
                                    <option value="IIIT Students Only">IIIT Students Only</option>
                                </select>
                            ) : (
                                event.eligibility
                            )}
                        </div>
                        <div>
                            <strong>Fee:</strong><br />
                            {editMode && event.status === 'Draft' ? (
                                <input type="number" value={editData.registrationFee} onChange={(e) => setEditData({...editData, registrationFee: e.target.value})} style={{ width: "100%" }} />
                            ) : (
                                `₹${event.registrationFee || 0}`
                            )}
                        </div>
                        <div>
                            <strong>Capacity:</strong><br />
                            {editMode ? (
                                <input type="number" value={editData.registrationLimit} onChange={(e) => setEditData({...editData, registrationLimit: e.target.value})} style={{ width: "100%" }} />
                            ) : (
                                event.registrationLimit
                            )}
                        </div>
                    </div>
                </div>

                {/* Analytics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
                    <div style={{ backgroundColor: "#e3f2fd", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                        <h3 style={{ margin: "0 0 5px", fontSize: "28px", color: "#1976d2" }}>{registrationCount}</h3>
                        <p style={{ margin: 0, color: "#555" }}>{event.eventType === 'Merchandise' ? 'Sales' : 'Registrations'}</p>
                    </div>
                    <div style={{ backgroundColor: "#e8f5e9", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                        <h3 style={{ margin: "0 0 5px", fontSize: "28px", color: "#388e3c" }}>{attendanceCount}</h3>
                        <p style={{ margin: 0, color: "#555" }}>Attendance</p>
                    </div>
                    <div style={{ backgroundColor: "#fff3e0", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                        <h3 style={{ margin: "0 0 5px", fontSize: "28px", color: "#f57c00" }}>₹{revenue}</h3>
                        <p style={{ margin: 0, color: "#555" }}>Revenue</p>
                    </div>
                    <div style={{ backgroundColor: "#f3e5f5", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                        <h3 style={{ margin: "0 0 5px", fontSize: "28px", color: "#7b1fa2" }}>{event.registrationLimit}</h3>
                        <p style={{ margin: 0, color: "#555" }}>Capacity</p>
                    </div>
                </div>

                {/* Participants List */}
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <h2>Participants ({filteredParticipants.length})</h2>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <input 
                                type="text"
                                placeholder="Search participants..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: "4px", width: "250px" }}
                            />
                            <button 
                                onClick={handleExportCSV}
                                style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                            >
                                Export CSV
                            </button>
                        </div>
                    </div>

                    {filteredParticipants.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                            <p style={{ color: "#666" }}>No participants yet</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
                                <thead>
                                    <tr style={{ backgroundColor: "#343a40", color: "white" }}>
                                        <th style={{ padding: "12px", textAlign: "left" }}>Name</th>
                                        <th style={{ padding: "12px", textAlign: "left" }}>Email</th>
                                        <th style={{ padding: "12px", textAlign: "left" }}>Reg. Date</th>
                                        <th style={{ padding: "12px", textAlign: "left" }}>Payment</th>
                                        <th style={{ padding: "12px", textAlign: "left" }}>Ticket ID</th>
                                        <th style={{ padding: "12px", textAlign: "left" }}>Attendance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredParticipants.map((participant, index) => (
                                        <tr key={participant._id} style={{ borderBottom: "1px solid #ddd", backgroundColor: index % 2 === 0 ? "#f8f9fa" : "white" }}>
                                            <td style={{ padding: "12px" }}>{participant.participantId.firstName} {participant.participantId.lastName}</td>
                                            <td style={{ padding: "12px" }}>{participant.participantId.email}</td>
                                            <td style={{ padding: "12px" }}>{new Date(participant.registrationDate).toLocaleDateString()}</td>
                                            <td style={{ padding: "12px" }}>₹{event.registrationFee || "Free"}</td>
                                            <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "12px" }}>{participant.ticketId}</td>
                                            <td style={{ padding: "12px" }}>
                                                {(event.status === 'Ongoing' || event.status === 'Completed') ? (
                                                    <span style={{ 
                                                        backgroundColor: participant.attendance?.marked ? "#28a745" : "#dc3545",
                                                        color: "white",
                                                        padding: "4px 8px",
                                                        borderRadius: "4px",
                                                        fontSize: "12px"
                                                    }}>
                                                        {participant.attendance?.marked ? "Present" : "Absent"}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "#666" }}>-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>


            </div>
        </div>
    );
};

export default EventDetailPage;
