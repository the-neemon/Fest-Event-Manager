import { API_URL } from "../config";
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import Navbar from "../components/Navbar";

const MyEvents = () => {
    const navigate = useNavigate();
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [allRegistrations, setAllRegistrations] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const { authTokens } = useContext(AuthContext);

    const fetchData = async () => {
        try {
            // two separate endpoints: upcoming filters by future startDate, my-registrations returns full history
            const upcomingRes = await axios.get(`${API_URL}/api/events/my-registrations/upcoming`, {
                headers: { "x-auth-token": authTokens.token }
            });
            setUpcomingEvents(upcomingRes.data);

            const allRes = await axios.get(`${API_URL}/api/events/my-registrations`, {
                headers: { "x-auth-token": authTokens.token }
            });
            setAllRegistrations(allRes.data);
        } catch (err) {
            console.error("Error fetching registrations:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [authTokens]);

    const handleCancelRegistration = async (registrationId) => {
        if (!confirm("Are you sure you want to cancel this registration?")) return;

        try {
            await axios.put(`${API_URL}/api/events/cancel-registration/${registrationId}`, {}, {
                headers: { "x-auth-token": authTokens.token }
            });
            alert("Registration cancelled successfully!");
            fetchData();
        } catch (error) {
            console.error("Cancel error:", error);
            alert(error.response?.data?.msg || "Failed to cancel registration");
        }
    };

    // Filter registrations based on active tab
    const getFilteredRegistrations = () => {
        switch(activeTab) {
            case 'normal':
                return allRegistrations.filter(reg => reg.eventId?.eventType === 'Normal');
            case 'merchandise':
                return allRegistrations.filter(reg => reg.eventId?.eventType === 'Merchandise');
            case 'pending':
                return allRegistrations.filter(reg => reg.status === 'Pending');
            case 'completed':
                return allRegistrations.filter(reg => reg.status === 'Completed' || reg.status === 'Approved');
            case 'cancelled':
                return allRegistrations.filter(reg => reg.status === 'Cancelled' || reg.status === 'Rejected');
            default:
                return allRegistrations;
        }
    };

    const filteredRegistrations = getFilteredRegistrations();

    const viewTicket = (registration) => {
        setSelectedTicket(registration);
        setShowTicketModal(true);
    };

    const closeTicketModal = () => {
        setShowTicketModal(false);
        setSelectedTicket(null);
    };

    return (
        <div>
            <Navbar />
            
            {showTicketModal && selectedTicket && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0,0,0,0.7)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "10px",
                        padding: "30px",
                        maxWidth: "500px",
                        width: "90%",
                        position: "relative",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
                    }}>
                        <button
                            onClick={closeTicketModal}
                            style={{
                                position: "absolute",
                                top: "10px",
                                right: "10px",
                                background: "none",
                                border: "none",
                                fontSize: "24px",
                                cursor: "pointer",
                                color: "#666"
                            }}
                        >
                            ×
                        </button>
                        
                        <div style={{ textAlign: "center" }}>
                            <h2 style={{ color: "#667eea", marginBottom: "20px" }}>Your Ticket</h2>
                            
                            <div style={{
                                backgroundColor: "#f8f9fa",
                                padding: "20px",
                                borderRadius: "8px",
                                marginBottom: "20px"
                            }}>
                                <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>{selectedTicket.eventId?.name}</h3>
                                
                                <div style={{ 
                                    backgroundColor: "#667eea",
                                    color: "white",
                                    padding: "15px",
                                    borderRadius: "8px",
                                    marginBottom: "15px",
                                    fontFamily: "monospace",
                                    fontSize: "18px",
                                    fontWeight: "bold",
                                    letterSpacing: "1px"
                                }}>
                                    {selectedTicket.ticketId}
                                </div>
                                
                                <div style={{
                                    backgroundColor: "white",
                                    padding: "15px",
                                    borderRadius: "8px",
                                    border: "2px solid #667eea",
                                    marginBottom: "15px"
                                }}>
                                    {/* uses a free third-party API for display only — scanning uses the backend-issued ticketId */}
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify({
                                            ticketId: selectedTicket.ticketId,
                                            eventName: selectedTicket.eventId?.name,
                                            participantEmail: authTokens.user?.email
                                        }))}`}
                                        alt="QR Code"
                                        style={{ width: "200px", height: "200px" }}
                                    />
                                    <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#666" }}>Scan at venue</p>
                                </div>
                                
                                <div style={{ textAlign: "left", fontSize: "14px", color: "#555" }}>
                                    <p style={{ margin: "8px 0" }}><strong>Type:</strong> {selectedTicket.eventId?.eventType}</p>
                                    <p style={{ margin: "8px 0" }}><strong>Start:</strong> {new Date(selectedTicket.eventId?.startDate).toLocaleString()}</p>
                                    <p style={{ margin: "8px 0" }}><strong>Location:</strong> {selectedTicket.eventId?.location || 'TBA'}</p>
                                    {selectedTicket.eventId?.registrationFee > 0 && (
                                        <p style={{ margin: "8px 0" }}><strong>Fee Paid:</strong> ₹{selectedTicket.eventId?.registrationFee}</p>
                                    )}
                                </div>
                            </div>
                            
                            <div style={{ fontSize: "12px", color: "#666", marginTop: "15px" }}>
                                <p>Present this ticket at the event venue</p>
                                <p>Check your email for a copy</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <div style={{ maxWidth: "1200px", margin: "20px auto", padding: "20px" }}>
                
                {/* Upcoming Events Section */}
                <section style={{ marginBottom: "40px" }}>
                    <h2 style={{ borderBottom: "2px solid #007bff", paddingBottom: "10px" }}>Upcoming Events</h2>
                    
                    {upcomingEvents.length === 0 ? (
                        <p style={{ color: "#666", fontStyle: "italic" }}>No upcoming events.</p>
                    ) : (
                        <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", marginTop: "20px" }}>
                            {upcomingEvents.map((registration) => (
                                <div key={registration._id} style={{ 
                                    border: "1px solid #ddd", 
                                    borderRadius: "8px", 
                                    padding: "20px", 
                                    backgroundColor: "#f9f9f9",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                }}>
                                    <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>{registration.eventId?.name}</h3>
                                    
                                    <div style={{ marginBottom: "10px" }}>
                                        <span style={{ 
                                            backgroundColor: registration.eventId?.eventType === 'Merchandise' ? '#fff3e0' : '#e3f2fd', 
                                            padding: '5px 10px', 
                                            borderRadius: '4px', 
                                            fontSize: '12px', 
                                            fontWeight: 'bold',
                                            color: "#333" 
                                        }}>
                                            {registration.eventId?.eventType}
                                        </span>
                                    </div>
                                    
                                    <div style={{ fontSize: "14px", color: "#555", marginTop: "10px" }}>
                                        <p style={{ margin: "5px 0" }}><strong>Organizer:</strong> {registration.eventId?.organizerId?.organizerName || 'N/A'}</p>
                                        <p style={{ margin: "5px 0" }}><strong>Start Date:</strong> {new Date(registration.eventId?.startDate).toLocaleString()}</p>
                                        <p style={{ margin: "5px 0" }}><strong>End Date:</strong> {new Date(registration.eventId?.endDate).toLocaleString()}</p>
                                        <p style={{ margin: "5px 0" }}><strong>Location:</strong> {registration.eventId?.location || 'Not specified'}</p>
                                        <p 
                                            style={{ margin: "5px 0", color: "#007bff", cursor: "pointer", textDecoration: "underline" }}
                                            onClick={() => viewTicket(registration)}
                                        >
                                            <strong>Ticket ID:</strong> {registration.ticketId}
                                        </p>
                                    </div>
                                    
                                    <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                                        <button 
                                            onClick={() => navigate(`/participant-event/${registration.eventId?._id}`)}
                                            style={{
                                                flex: 1,
                                                padding: "10px",
                                                backgroundColor: "#007bff",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontSize: "14px",
                                                fontWeight: "bold"
                                            }}
                                        >
                                            View Details
                                        </button>
                                        <button 
                                            onClick={() => viewTicket(registration)}
                                            style={{
                                                flex: 1,
                                                padding: "10px",
                                                backgroundColor: "#28a745",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontSize: "14px",
                                                fontWeight: "bold"
                                            }}
                                        >
                                            View Ticket
                                        </button>
                                        <button 
                                            onClick={() => handleCancelRegistration(registration._id)}
                                            style={{
                                                flex: 1,
                                                padding: "10px",
                                                backgroundColor: "#dc3545",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontSize: "14px",
                                                fontWeight: "bold"
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Participation History Section */}
                <section>
                    <h2 style={{ borderBottom: "2px solid #007bff", paddingBottom: "10px" }}>Participation History</h2>
                    
                    {/* tab counts are computed inline from allRegistrations so they stay in sync without extra state */}
                    <div style={{ display: "flex", gap: "10px", marginTop: "20px", marginBottom: "20px", borderBottom: "1px solid #ddd" }}>
                        <button 
                            onClick={() => setActiveTab('all')}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: activeTab === 'all' ? '#007bff' : 'transparent',
                                color: activeTab === 'all' ? 'white' : '#333',
                                border: 'none',
                                borderBottom: activeTab === 'all' ? '3px solid #007bff' : '3px solid transparent',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            All ({allRegistrations.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('normal')}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: activeTab === 'normal' ? '#007bff' : 'transparent',
                                color: activeTab === 'normal' ? 'white' : '#333',
                                border: 'none',
                                borderBottom: activeTab === 'normal' ? '3px solid #007bff' : '3px solid transparent',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            Normal ({allRegistrations.filter(r => r.eventId?.eventType === 'Normal').length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('merchandise')}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: activeTab === 'merchandise' ? '#007bff' : 'transparent',
                                color: activeTab === 'merchandise' ? 'white' : '#333',
                                border: 'none',
                                borderBottom: activeTab === 'merchandise' ? '3px solid #007bff' : '3px solid transparent',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            Merchandise ({allRegistrations.filter(r => r.eventId?.eventType === 'Merchandise').length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('pending')}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: activeTab === 'pending' ? '#007bff' : 'transparent',
                                color: activeTab === 'pending' ? 'white' : '#333',
                                border: 'none',
                                borderBottom: activeTab === 'pending' ? '3px solid #007bff' : '3px solid transparent',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            Pending Approval ({allRegistrations.filter(r => r.status === 'Pending').length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('completed')}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: activeTab === 'completed' ? '#007bff' : 'transparent',
                                color: activeTab === 'completed' ? 'white' : '#333',
                                border: 'none',
                                borderBottom: activeTab === 'completed' ? '3px solid #007bff' : '3px solid transparent',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            Completed ({allRegistrations.filter(r => r.status === 'Completed' || r.status === 'Approved').length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('cancelled')}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: activeTab === 'cancelled' ? '#007bff' : 'transparent',
                                color: activeTab === 'cancelled' ? 'white' : '#333',
                                border: 'none',
                                borderBottom: activeTab === 'cancelled' ? '3px solid #007bff' : '3px solid transparent',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            Cancelled/Rejected ({allRegistrations.filter(r => r.status === 'Cancelled' || r.status === 'Rejected').length})
                        </button>
                    </div>

                    {filteredRegistrations.length === 0 ? (
                        <p style={{ color: "#666", fontStyle: "italic" }}>No records found in this category.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            {filteredRegistrations.map((registration) => (
                                <div key={registration._id} style={{ 
                                    border: "1px solid #ddd", 
                                    borderRadius: "8px", 
                                    padding: "15px", 
                                    backgroundColor: "#fff",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: "0 0 8px 0" }}>{registration.eventId?.name}</h4>
                                        <div style={{ fontSize: "13px", color: "#666" }}>
                                            <span style={{ marginRight: "15px" }}>
                                                <strong>Type:</strong> {registration.eventId?.eventType}
                                            </span>
                                            <span style={{ marginRight: "15px" }}>
                                                <strong>Organizer:</strong> {registration.eventId?.organizerId?.organizerName || 'N/A'}
                                            </span>
                                            <span style={{ marginRight: "15px" }}>
                                                <strong>Status:</strong> 
                                                <span style={{ 
                                                    marginLeft: "5px",
                                                    padding: "2px 8px",
                                                    borderRadius: "3px",
                                                    backgroundColor: 
                                                        registration.status === 'Completed' ? '#d4edda' :
                                                        registration.status === 'Approved' ? '#d4edda' :
                                                        registration.status === 'Cancelled' || registration.status === 'Rejected' ? '#f8d7da' :
                                                        registration.status === 'Pending' ? '#fff3cd' :
                                                        '#d1ecf1',
                                                    color: 
                                                        registration.status === 'Completed' ? '#155724' :
                                                        registration.status === 'Approved' ? '#155724' :
                                                        registration.status === 'Cancelled' || registration.status === 'Rejected' ? '#721c24' :
                                                        registration.status === 'Pending' ? '#856404' :
                                                        '#0c5460',
                                                    fontSize: "12px",
                                                    fontWeight: "bold"
                                                }}>
                                                    {registration.status}
                                                </span>
                                            </span>
                                            {registration.status === 'Pending' && (
                                                <span style={{ marginRight: "15px", fontSize: "12px", color: "#856404" }}>
                                                    (Payment approval pending)
                                                </span>
                                            )}
                                            {registration.status === 'Rejected' && registration.paymentProof?.rejectionReason && (
                                                <span style={{ marginRight: "15px", fontSize: "12px", color: "#721c24" }}>
                                                    (Reason: {registration.paymentProof.rejectionReason})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        {registration.ticketId && (
                                            <>
                                                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                                    <button
                                                        onClick={() => viewTicket(registration)}
                                                        style={{
                                                            padding: "8px 16px",
                                                            backgroundColor: "#28a745",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            cursor: "pointer",
                                                            fontSize: "13px",
                                                            fontWeight: "bold"
                                                        }}
                                                    >
                                                        View Ticket
                                                    </button>
                                                    {registration.eventId?.status === 'Completed' && (
                                                        <button
                                                            onClick={() => navigate(`/feedback/${registration.eventId?._id}`)}
                                                            style={{
                                                                padding: "8px 16px",
                                                                backgroundColor: "#ffc107",
                                                                color: "#000",
                                                                border: "none",
                                                                borderRadius: "4px",
                                                                cursor: "pointer",
                                                                fontSize: "13px",
                                                                fontWeight: "bold"
                                                            }}
                                                        >
                                                            Give Feedback
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={{ 
                                                    fontSize: "12px", 
                                                    color: "#007bff", 
                                                    fontWeight: "bold"
                                                }}>
                                                    {registration.ticketId}
                                                </div>
                                            </>
                                        )}
                                        {!registration.ticketId && registration.status === 'Pending' && (
                                            <div style={{ 
                                                fontSize: "12px", 
                                                color: "#856404",
                                                fontStyle: "italic"
                                            }}>
                                                Ticket will be generated after payment approval
                                            </div>
                                        )}
                                        <div style={{ fontSize: "11px", color: "#999", marginTop: "5px" }}>
                                            Registered: {new Date(registration.registrationDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default MyEvents;