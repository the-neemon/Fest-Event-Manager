import Navbar from "../components/Navbar";
import { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
    const [events, setEvents] = useState([]);
    const [trendingEvents, setTrendingEvents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        eventType: 'all',
        eligibility: 'all',
        startDate: '',
        endDate: '',
        followedOnly: false
    });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [paymentProofFile, setPaymentProofFile] = useState(null);
    const [paymentProofPreview, setPaymentProofPreview] = useState(null);
    const { user, logoutUser, authTokens } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        fetchEvents();
        fetchTrendingEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (filters.eventType !== 'all') params.append('eventType', filters.eventType);
            if (filters.eligibility !== 'all') params.append('eligibility', filters.eligibility);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.followedOnly) params.append('followedOnly', 'true');

            const res = await axios.get(`http://localhost:5000/api/events/all?${params.toString()}`, {
                headers: authTokens?.token ? { "x-auth-token": authTokens.token } : {}
            });
            setEvents(res.data);
        } catch (err) {
            console.error("Error fetching events");
        }
    };

    const fetchTrendingEvents = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.eventType !== 'all') params.append('eventType', filters.eventType);
            if (filters.eligibility !== 'all') params.append('eligibility', filters.eligibility);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.followedOnly) params.append('followedOnly', 'true');

            const res = await axios.get(`http://localhost:5000/api/events/trending?${params.toString()}`, {
                headers: authTokens?.token ? { "x-auth-token": authTokens.token } : {}
            });
            setTrendingEvents(res.data);
        } catch (err) {
            console.error("Error fetching trending events");
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        applyFilters();
    };

    const handleFilterChange = (filterName, value) => {
        setFilters({ ...filters, [filterName]: value });
    };

    const applyFilters = () => {
        fetchEvents();
        fetchTrendingEvents();
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilters({
            eventType: 'all',
            eligibility: 'all',
            startDate: '',
            endDate: '',
            followedOnly: false
        });
        setTimeout(() => {
            fetchEvents();
            fetchTrendingEvents();
        }, 100);
    };

    const handleRegister = async (eventId, event) => {
        // For merchandise events, show payment modal
        if (event.eventType === 'Merchandise') {
            setSelectedEvent(event);
            setShowPaymentModal(true);
            return;
        }

        // For normal events, register directly
        if (!confirm("Are you sure you want to register?")) return;
        
        try {
            console.log("Attempting registration for event:", eventId);
            console.log("Auth token:", authTokens?.token ? "Present" : "Missing");
            
            const response = await axios.post(`http://localhost:5000/api/events/register/${eventId}`, {}, {
                headers: { "x-auth-token": authTokens.token }
            });
            
            console.log("Registration response:", response.data);
            alert(`Success! You are registered. Ticket ID: ${response.data.ticketId}`);
            window.location.reload(); 
        } catch (error) {
            console.error("Registration error:", error);
            console.error("Error response:", error.response?.data);
            console.error("Error status:", error.response?.status);
            alert(error.response?.data?.msg || error.message || "Registration Failed");
        }
    };

    const handlePaymentProofChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPaymentProofFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentProofPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleMerchandisePurchase = async () => {
        if (!paymentProofFile) {
            alert("Please upload payment proof");
            return;
        }

        try {
            const response = await axios.post(
                `http://localhost:5000/api/events/register/${selectedEvent._id}`,
                { paymentProof: paymentProofPreview },
                { headers: { "x-auth-token": authTokens.token } }
            );

            alert(response.data.msg);
            setShowPaymentModal(false);
            setPaymentProofFile(null);
            setPaymentProofPreview(null);
            setSelectedEvent(null);
            window.location.reload();
        } catch (error) {
            alert(error.response?.data?.msg || "Purchase failed");
        }
    };

    const isRegistrationClosed = (registrationDeadline) => {
        return new Date() > new Date(registrationDeadline);
    };

    return (
        <div>
            {/* 1. Navbar: Handles Navigation & Logout (Only shows if logged in) */}
            <Navbar />

            {/* 2. Main Content Container */}
            <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
                
                {/* 3. Header Logic: Show Login button only if NOT logged in */}
                {!user ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ddd", paddingBottom: "10px", marginBottom: "20px" }}>
                        <h1>Felicity Events</h1>
                        <button onClick={() => navigate("/login")} style={{ backgroundColor: "#0275d8", color: "white", border: "none", padding: "8px 16px", cursor: "pointer" }}>
                            Login
                        </button>
                    </div>
                ) : (
                    <h1 style={{ marginBottom: "20px" }}>Browse Events</h1>
                )}

                {/* Search Bar */}
                <div style={{ marginBottom: "20px" }}>
                    <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px" }}>
                        <input 
                            type="text"
                            placeholder="Search events or organizers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ 
                                flex: 1, 
                                padding: "12px", 
                                fontSize: "16px",
                                border: "1px solid #ddd",
                                borderRadius: "4px"
                            }}
                        />
                    </form>
                </div>

                {/* Filters Section */}
                <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "20px", 
                    borderRadius: "8px", 
                    marginBottom: "30px",
                    border: "1px solid #ddd"
                }}>
                    <h3 style={{ marginTop: 0 }}>Filters</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Event Type</label>
                            <select 
                                value={filters.eventType}
                                onChange={(e) => handleFilterChange('eventType', e.target.value)}
                                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                            >
                                <option value="all">All Types</option>
                                <option value="Normal">Normal</option>
                                <option value="Merchandise">Merchandise</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Eligibility</label>
                            <select 
                                value={filters.eligibility}
                                onChange={(e) => handleFilterChange('eligibility', e.target.value)}
                                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                            >
                                <option value="all">All</option>
                                <option value="All">Open to All</option>
                                <option value="IIIT Students Only">IIIT Students Only</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Start Date From</label>
                            <input 
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Start Date To</label>
                            <input 
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                            />
                        </div>

                        {user && user.role === "participant" && (
                            <div>
                                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Followed Clubs</label>
                                <label style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: "8px" }}>
                                    <input 
                                        type="checkbox"
                                        checked={filters.followedOnly}
                                        onChange={(e) => handleFilterChange('followedOnly', e.target.checked)}
                                        style={{ marginRight: "8px", width: "18px", height: "18px", cursor: "pointer" }}
                                    />
                                    Show Only Followed Clubs
                                </label>
                            </div>
                        )}
                    </div>
                    <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                        <button 
                            onClick={applyFilters}
                            style={{ 
                                padding: "10px 20px", 
                                backgroundColor: "#28a745", 
                                color: "white", 
                                border: "none", 
                                borderRadius: "4px",
                                cursor: "pointer"
                            }}
                        >
                            Apply Filters
                        </button>
                        <button 
                            onClick={clearFilters}
                            style={{ 
                                padding: "10px 20px", 
                                backgroundColor: "#6c757d", 
                                color: "white", 
                                border: "none", 
                                borderRadius: "4px",
                                cursor: "pointer"
                            }}
                        >
                            Clear All
                        </button>
                    </div>
                </div>

                {/* Trending Events Section */}
                {trendingEvents.length > 0 && (
                    <div style={{ marginBottom: "30px" }}>
                        <h2 style={{ 
                            borderBottom: "2px solid #ff6b6b", 
                            paddingBottom: "10px",
                            display: "inline-block"
                        }}>
                            Trending Events (Top 5 / 24h)
                        </h2>
                        <div style={{ display: "flex", gap: "15px", overflowX: "auto", padding: "10px 0" }}>
                            {trendingEvents.map((event) => (
                                <div key={event._id} style={{ 
                                    minWidth: "280px",
                                    border: "2px solid #ff6b6b", 
                                    borderRadius: "8px", 
                                    padding: "15px",
                                    backgroundColor: "#fff5f5"
                                }}>
                                    <h4 style={{ margin: "0 0 10px 0", color: "#ff6b6b" }}>{event.name}</h4>
                                    <p style={{ fontSize: "12px", color: "#666", margin: "5px 0" }}>
                                        <strong>Type:</strong> {event.eventType}
                                    </p>
                                    <p style={{ fontSize: "12px", color: "#666", margin: "5px 0" }}>
                                        <strong>Organizer:</strong> {event.organizerId?.organizerName || 'N/A'}
                                    </p>
                                    <p style={{ fontSize: "12px", color: "#666", margin: "5px 0" }}>
                                        <strong>Date:</strong> {new Date(event.startDate).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. All Events Grid */}
                <h2 style={{ marginBottom: "15px" }}>All Events ({events.length})</h2>
                <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                    {events.map((event) => (
                        <div key={event._id} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "15px" }}>
                            <h3 style={{ margin: "0 0 10px 0" }}>{event.name}</h3>
                            <p style={{ color: "#666", fontSize: "14px" }}>{event.description}</p>
                            
                            <div style={{ marginTop: "10px", fontSize: "13px", lineHeight: "1.6" }}>
                                <div><strong>Type:</strong> {event.eventType}</div>
                                <div><strong>Start Date:</strong> {new Date(event.startDate).toLocaleString()}</div>
                                <div><strong>End Date:</strong> {new Date(event.endDate).toLocaleString()}</div>
                                <div><strong>Registration Deadline:</strong> {new Date(event.registrationDeadline).toLocaleString()}</div>
                                <div><strong>Location:</strong> {event.location || 'TBA'}</div>
                                <div><strong>Organizer:</strong> {event.organizerId?.organizerName || 'N/A'}</div>
                            </div>

                            {user && user.role === "participant" && (
                                <button 
                                    style={{ 
                                        marginTop: "15px", 
                                        width: "100%", 
                                        padding: "10px", 
                                        backgroundColor: isRegistrationClosed(event.registrationDeadline) ? "#ccc" : "#5cb85c", 
                                        color: "white", 
                                        border: "none", 
                                        cursor: isRegistrationClosed(event.registrationDeadline) ? "not-allowed" : "pointer",
                                        opacity: isRegistrationClosed(event.registrationDeadline) ? 0.6 : 1
                                    }}
                                    onClick={() => handleRegister(event._id, event)}
                                    disabled={isRegistrationClosed(event.registrationDeadline)}
                                >
                                    {isRegistrationClosed(event.registrationDeadline) 
                                        ? "Registration Closed" 
                                        : (event.eventType === 'Merchandise' ? 'Buy Now' : 'Register')
                                    }
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Payment Proof Modal */}
                {showPaymentModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '30px',
                            borderRadius: '8px',
                            maxWidth: '500px',
                            width: '90%'
                        }}>
                            <h2 style={{ marginBottom: '20px' }}>Purchase Merchandise</h2>
                            <p style={{ marginBottom: '10px' }}>
                                <strong>Event:</strong> {selectedEvent?.name}
                            </p>
                            <p style={{ marginBottom: '20px' }}>
                                <strong>Price:</strong> ₹{selectedEvent?.registrationFee || 0}
                            </p>
                            
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                                    Upload Payment Proof:
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePaymentProofChange}
                                    style={{
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        width: '100%'
                                    }}
                                />
                            </div>

                            {paymentProofPreview && (
                                <div style={{ marginBottom: '20px' }}>
                                    <img
                                        src={paymentProofPreview}
                                        alt="Payment Proof Preview"
                                        style={{ maxWidth: '100%', maxHeight: '200px', border: '1px solid #ddd', borderRadius: '4px' }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => {
                                        setShowPaymentModal(false);
                                        setPaymentProofFile(null);
                                        setPaymentProofPreview(null);
                                        setSelectedEvent(null);
                                    }}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleMerchandisePurchase}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Submit Purchase
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;