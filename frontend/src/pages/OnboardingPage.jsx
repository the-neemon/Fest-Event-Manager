import { API_URL } from "../config";
import { useState, useContext, useEffect } from "react";
import AuthContext from "../context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const OnboardingPage = () => {
    const { authTokens } = useContext(AuthContext);
    const navigate = useNavigate();

    const [interests, setInterests] = useState({
        Technical: false,
        Cultural: false,
        Sports: false
    });

    const [organizers, setOrganizers] = useState([]);
    const [selectedOrganizers, setSelectedOrganizers] = useState([]);

    // Fetch all organizers
    useEffect(() => {
        const fetchOrganizers = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/auth/organizers`);
                setOrganizers(res.data);
            } catch (error) {
                console.error("Error fetching organizers:", error);
            }
        };
        fetchOrganizers();
    }, []);

    const handleInterestChange = (e) => {
        setInterests({ ...interests, [e.target.name]: e.target.checked });
    };

    const handleOrganizerToggle = (organizerId) => {
        // toggle: remove if already selected, append if not
        setSelectedOrganizers(prev => 
            prev.includes(organizerId) 
                ? prev.filter(id => id !== organizerId)
                : [...prev, organizerId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Convert object {Technical: true, Sports: false} to array ["Technical"]
        const selectedInterests = Object.keys(interests).filter(key => interests[key]);

        try {
            await axios.put(`${API_URL}/api/auth/update-interests`, 
                { 
                    interests: selectedInterests,
                    followedOrganizers: selectedOrganizers
                },
                { headers: { "x-auth-token": authTokens.token } }
            );
            
            alert("Profile Updated!");
            navigate("/my-events");
        } catch (error) {
            console.error(error);
            alert("Error updating profile.");
        }
    };

    return (
        <div style={{ maxWidth: "600px", margin: "50px auto", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
            <h2>Welcome! Set up your preferences</h2>
            
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "30px" }}>
                    <h3>Select your interests:</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <label>
                            <input type="checkbox" name="Technical" checked={interests.Technical} onChange={handleInterestChange} /> Technical
                        </label>
                        <label>
                            <input type="checkbox" name="Cultural" checked={interests.Cultural} onChange={handleInterestChange} /> Cultural
                        </label>
                        <label>
                            <input type="checkbox" name="Sports" checked={interests.Sports} onChange={handleInterestChange} /> Sports
                        </label>
                    </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                    <h3>Follow Clubs/Organizers:</h3>
                    <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid #ddd", borderRadius: "5px", padding: "10px" }}>
                        {organizers.length === 0 ? (
                            <p style={{ color: "gray" }}>Loading clubs...</p>
                        ) : (
                            organizers.map(org => (
                                <div key={org._id} style={{ 
                                    padding: "10px", 
                                    marginBottom: "8px", 
                                    border: "1px solid #eee", 
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                    backgroundColor: selectedOrganizers.includes(org._id) ? "#e7f3ff" : "white"
                                }}
                                onClick={() => handleOrganizerToggle(org._id)}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={selectedOrganizers.includes(org._id)}
                                        onChange={() => handleOrganizerToggle(org._id)}
                                        style={{ marginRight: "10px" }}
                                    />
                                    <strong>{org.organizerName}</strong>
                                    <div style={{ fontSize: "12px", color: "gray" }}>{org.category}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <button type="submit" style={{ width: "100%", padding: "10px", backgroundColor: "#007bff", color: "white", border: "none", cursor: "pointer" }}>
                    Finish Setup
                </button>
            </form>
            <button onClick={() => navigate("/my-events")} style={{ marginTop: "10px", background: "none", border: "none", color: "gray", cursor: "pointer", width: "100%" }}>
                Skip for now
            </button>
        </div>
    );
};

export default OnboardingPage;