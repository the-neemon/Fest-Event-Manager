import { API_URL } from "../config";
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
    const [showRegistrationModal, setShowRegistrationModal] = useState(false);
    const [formResponses, setFormResponses] = useState({});
    const [merchSelections, setMerchSelections] = useState({ size: '', color: '', quantity: 1 });
    const [participantProfile, setParticipantProfile] = useState(null);
    const { user, authTokens } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        fetchEvents();
        fetchTrendingEvents();
        if (user && user.role === 'participant') {
            fetchParticipantProfile();
        }
    }, []);

    const fetchParticipantProfile = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/auth/profile`, {
                headers: { "x-auth-token": authTokens.token }
            });
            setParticipantProfile(res.data);
        } catch (err) {
            console.error("Error fetching participant profile:", err);
        }
    };

    const fetchEvents = async () => {
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (filters.eventType !== 'all') params.append('eventType', filters.eventType);
            if (filters.eligibility !== 'all') params.append('eligibility', filters.eligibility);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.followedOnly) params.append('followedOnly', 'true');

            const res = await axios.get(`${API_URL}/api/events/all?${params.toString()}`, {
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

            const res = await axios.get(`${API_URL}/api/events/trending?${params.toString()}`, {
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
        // setTimeout lets React flush the state reset before the fetch reads the new values
        setTimeout(() => {
            fetchEvents();
            fetchTrendingEvents();
        }, 100);
    };

    const handleRegister = async (eventId, event) => {
        setSelectedEvent(event);
        
        // payment proof required for merchandise and paid normal events
        if (event.eventType === 'Merchandise' || (event.eventType === 'Normal' && event.registrationFee > 0)) {
            setMerchSelections({ size: '', color: '', quantity: 1 });
            setShowPaymentModal(true);
            return;
        }

        // Check if event has custom form fields
        if (event.formFields && event.formFields.length > 0) {
            setShowRegistrationModal(true);
            setFormResponses({});
            return;
        }

        if (!confirm("Are you sure you want to register?")) return;
        
        try {
            const response = await axios.post(`${API_URL}/api/events/register/${eventId}`, {}, {
                headers: { "x-auth-token": authTokens.token }
            });
            
            alert(`Success! You are registered. Ticket ID: ${response.data.ticketId}`);
            window.location.reload(); // full reload to re-derive registration state across all event cards
        } catch (error) {
            console.error("Registration error:", error);
            alert(error.response?.data?.msg || error.message || "Registration Failed");
        }
    };

    const handlePaymentProofChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // client-side validation is UX only — backend also validates via the 50mb body limit
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                alert('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
                e.target.value = '';
                return;
            }
            
            if (file.size > 10 * 1024 * 1024) {
                alert('File size is too large. Please upload an image smaller than 10MB.');
                e.target.value = '';
                return;
            }
            
            setPaymentProofFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentProofPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRegistrationSubmit = async () => {
        const requiredFields = selectedEvent.formFields.filter(f => f.required);
        for (const field of requiredFields) {
            if (!formResponses[field.label] || formResponses[field.label].trim() === '') {
                alert(`Please fill in the required field: ${field.label}`);
                return;
            }
        }

        try {
            const response = await axios.post(
                `${API_URL}/api/events/register/${selectedEvent._id}`,
                { formResponses },
                { headers: { "x-auth-token": authTokens.token } }
            );

            alert(`Success! You are registered. Ticket ID: ${response.data.ticketId}`);
            setShowRegistrationModal(false);
            setFormResponses({});
            setSelectedEvent(null);
            window.location.reload();
        } catch (error) {
            alert(error.response?.data?.msg || "Registration failed");
        }
    };

    const handleMerchandisePurchase = async () => {
        if (!paymentProofFile) {
            alert("Please upload payment proof");
            return;
        }

        // validate size/color only if the organizer set those options
        if (selectedEvent?.eventType === 'Merchandise') {
            if (selectedEvent.itemDetails?.sizes?.length > 0 && !merchSelections.size) {
                alert("Please select a size");
                return;
            }
            if (selectedEvent.itemDetails?.colors?.length > 0 && !merchSelections.color) {
                alert("Please select a color");
                return;
            }
        }

        // build formResponses from merch selections so they're stored in the registration record
        const mergedFormResponses = selectedEvent?.eventType === 'Merchandise' ? {
            ...(merchSelections.size && { Size: merchSelections.size }),
            ...(merchSelections.color && { Color: merchSelections.color }),
            Quantity: String(merchSelections.quantity)
        } : {};

        try {
            // paymentProofPreview is the full base64 data URL read by FileReader
            const response = await axios.post(
                `${API_URL}/api/events/register/${selectedEvent._id}`,
                { paymentProof: paymentProofPreview, formResponses: mergedFormResponses },
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

    const isEligible = (event) => {
        if (!participantProfile) return true;
        if (event.eligibility === 'IIIT Students Only' && !participantProfile.isIIITStudent) {
            return false;
        }
        return true;
    };

    return (
        <div>
            <Navbar />

            <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
                
                {/* show login CTA for unauthenticated visitors browsing the public event list */}
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

                <h2 style={{ marginBottom: "15px" }}>All Events ({events.length})</h2>
                <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                    {events.map((event) => (
                        <div key={event._id} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "15px" }}>
                            <h3 style={{ margin: "0 0 10px 0" }}>{event.name}</h3>
                            <p style={{ color: "#666", fontSize: "14px" }}>{event.description}</p>
                            
                            <div style={{ marginTop: "10px", fontSize: "13px", lineHeight: "1.6" }}>
                                <div><strong>Type:</strong> {event.eventType}</div>
                                <div><strong>Eligibility:</strong> {event.eligibility}</div>
                                <div><strong>Start Date:</strong> {new Date(event.startDate).toLocaleString()}</div>
                                <div><strong>End Date:</strong> {new Date(event.endDate).toLocaleString()}</div>
                                <div><strong>Registration Deadline:</strong> {new Date(event.registrationDeadline).toLocaleString()}</div>
                                <div><strong>Location:</strong> {event.location || 'TBA'}</div>
                                <div><strong>Organizer:</strong> {event.organizerId?.organizerName || 'N/A'}</div>
                            </div>

                            {user && user.role === "participant" && (
                                <>
                                    {!isEligible(event) && (
                                        <div style={{
                                            marginTop: "10px",
                                            padding: "8px",
                                            backgroundColor: "#fff3cd",
                                            border: "1px solid #ffc107",
                                            borderRadius: "4px",
                                            color: "#856404",
                                            fontSize: "13px"
                                        }}>
                                            You are not eligible for this event
                                        </div>
                                    )}
                                    <button 
                                        style={{ 
                                            marginTop: "15px", 
                                            width: "100%", 
                                            padding: "10px", 
                                            backgroundColor: (isRegistrationClosed(event.registrationDeadline) || !isEligible(event)) ? "#ccc" : "#5cb85c", 
                                            color: "white", 
                                            border: "none", 
                                            cursor: (isRegistrationClosed(event.registrationDeadline) || !isEligible(event)) ? "not-allowed" : "pointer",
                                            opacity: (isRegistrationClosed(event.registrationDeadline) || !isEligible(event)) ? 0.6 : 1
                                        }}
                                        onClick={() => handleRegister(event._id, event)}
                                        disabled={isRegistrationClosed(event.registrationDeadline) || !isEligible(event)}
                                    >
                                        {isRegistrationClosed(event.registrationDeadline) 
                                            ? "Registration Closed" 
                                            : !isEligible(event)
                                            ? "Not Eligible"
                                            : event.eventType === 'Merchandise' ? 'Buy Now' : event.registrationFee > 0 ? 'Register & Pay' : 'Register'
                                        }
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Registration Modal with Custom Form Fields */}
                {showRegistrationModal && selectedEvent && (
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
                        zIndex: 1000,
                        overflowY: 'auto'
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '30px',
                            borderRadius: '8px',
                            maxWidth: '600px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflowY: 'auto'
                        }}>
                            <h2 style={{ marginBottom: '20px' }}>Register for {selectedEvent.name}</h2>
                            <p style={{ marginBottom: '20px', color: '#666' }}>Please fill out the registration form:</p>
                            
                            {selectedEvent.formFields.map((field, index) => (
                                <div key={index} style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                        {field.label}
                                        {field.required && <span style={{ color: 'red' }}> *</span>}
                                    </label>
                                    
                                    {field.fieldType === 'text' && (
                                        <input
                                            type="text"
                                            value={formResponses[field.label] || ''}
                                            onChange={(e) => setFormResponses({
                                                ...formResponses,
                                                [field.label]: e.target.value
                                            })}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px'
                                            }}
                                            required={field.required}
                                        />
                                    )}
                                    
                                    {field.fieldType === 'number' && (
                                        <input
                                            type="number"
                                            value={formResponses[field.label] || ''}
                                            onChange={(e) => setFormResponses({
                                                ...formResponses,
                                                [field.label]: e.target.value
                                            })}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px'
                                            }}
                                            required={field.required}
                                        />
                                    )}
                                    
                                    {field.fieldType === 'checkbox' && (
                                        <div>
                                            {field.options.split(',').map((option, optIndex) => (
                                                <label key={optIndex} style={{ display: 'block', marginBottom: '8px' }}>
                                                    <input
                                                        type="checkbox"
                                                        value={option.trim()}
                                                        checked={(formResponses[field.label] || '').split(',').includes(option.trim())}
                                                        onChange={(e) => {
                                                            const currentValues = formResponses[field.label] ? formResponses[field.label].split(',') : [];
                                                            let newValues;
                                                            if (e.target.checked) {
                                                                newValues = [...currentValues, option.trim()];
                                                            } else {
                                                                newValues = currentValues.filter(v => v !== option.trim());
                                                            }
                                                            setFormResponses({
                                                                ...formResponses,
                                                                [field.label]: newValues.join(',')
                                                            });
                                                        }}
                    style={{ marginRight: '8px' }}
                                                    />
                                                    {option.trim()}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '30px' }}>
                                <button
                                    onClick={() => {
                                        setShowRegistrationModal(false);
                                        setFormResponses({});
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
                                    onClick={handleRegistrationSubmit}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Register
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                            <h2 style={{ marginBottom: '20px' }}>
                                {selectedEvent?.eventType === 'Merchandise' ? 'Purchase Merchandise' : 'Complete Registration'}
                            </h2>
                            <p style={{ marginBottom: '10px' }}>
                                <strong>Event:</strong> {selectedEvent?.name}
                            </p>
                            <p style={{ marginBottom: selectedEvent?.eventType === 'Merchandise' ? '10px' : '20px' }}>
                                <strong>Fee per item:</strong> ₹{selectedEvent?.registrationFee || 0}
                            </p>
                            {selectedEvent?.eventType === 'Merchandise' && (
                                <p style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 'bold', color: '#28a745' }}>
                                    Total: ₹{(selectedEvent?.registrationFee || 0) * (Number(merchSelections.quantity) || 1)}
                                </p>
                            )}

                            {selectedEvent?.eventType === 'Merchandise' && (
                                <>
                                    {selectedEvent.itemDetails?.sizes?.length > 0 && (
                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Size <span style={{ color: 'red' }}>*</span></label>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {selectedEvent.itemDetails.sizes.map(s => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => setMerchSelections(prev => ({ ...prev, size: s }))}
                                                        style={{
                                                            padding: '6px 14px',
                                                            border: '2px solid',
                                                            borderColor: merchSelections.size === s ? '#007bff' : '#ddd',
                                                            borderRadius: '4px',
                                                            backgroundColor: merchSelections.size === s ? '#e7f0ff' : 'white',
                                                            cursor: 'pointer',
                                                            fontWeight: merchSelections.size === s ? 'bold' : 'normal'
                                                        }}
                                                    >{s}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedEvent.itemDetails?.colors?.length > 0 && (
                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Color <span style={{ color: 'red' }}>*</span></label>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {selectedEvent.itemDetails.colors.map(c => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => setMerchSelections(prev => ({ ...prev, color: c }))}
                                                        style={{
                                                            padding: '6px 14px',
                                                            border: '2px solid',
                                                            borderColor: merchSelections.color === c ? '#007bff' : '#ddd',
                                                            borderRadius: '4px',
                                                            backgroundColor: merchSelections.color === c ? '#e7f0ff' : 'white',
                                                            cursor: 'pointer',
                                                            fontWeight: merchSelections.color === c ? 'bold' : 'normal'
                                                        }}
                                                    >{c}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={selectedEvent.purchaseLimit || 1}
                                            value={merchSelections.quantity}
                                            onChange={e => setMerchSelections(prev => ({ ...prev, quantity: e.target.value }))}
                                            onBlur={e => {
                                                const clamped = Math.max(1, Math.min(Number(e.target.value) || 1, selectedEvent.purchaseLimit || 1));
                                                setMerchSelections(prev => ({ ...prev, quantity: clamped }));
                                            }}
                                            style={{ width: '80px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
                                        />
                                        <span style={{ marginLeft: '8px', fontSize: '13px', color: '#666' }}>max {selectedEvent.purchaseLimit || 1} per person</span>
                                    </div>
                                </>
                            )}
                            
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                                    Upload Payment Proof:
                                </label>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                    onChange={handlePaymentProofChange}
                                    style={{
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        width: '100%'
                                    }}
                                />
                                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                    Supported formats: JPEG, PNG, GIF, WebP (Max 10MB)
                                </p>
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
                                    {selectedEvent?.eventType === 'Merchandise' ? 'Submit Purchase' : 'Submit Payment'}
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