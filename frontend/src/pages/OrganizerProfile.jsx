import { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import Navbar from "../components/Navbar";

const OrganizerProfile = () => {
    const { authTokens } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        organizerName: "",
        category: "",
        description: "",
        contactEmail: "",
        discordWebhook: ""
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/organizer/profile", {
                headers: { "x-auth-token": authTokens.token }
            });
            setFormData(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error loading profile:", err);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put("http://localhost:5000/api/organizer/profile", 
                formData,
                { headers: { "x-auth-token": authTokens.token } }
            );
            alert("Profile updated successfully!");
        } catch (err) {
            console.error("Error updating profile:", err);
            alert("Failed to update profile");
        }
    };

    if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;

    return (
        <div>
            <Navbar />
            <div style={{ maxWidth: "800px", margin: "40px auto", padding: "30px", border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "white" }}>
                <h2 style={{ marginBottom: "30px" }}>Organizer Profile</h2>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    
                    <div>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Organization Name</label>
                        <input 
                            name="organizerName"
                            value={formData.organizerName}
                            onChange={handleChange}
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Category</label>
                        <select 
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                            required
                        >
                            <option value="">Select Category</option>
                            <option value="Technical">Technical</option>
                            <option value="Cultural">Cultural</option>
                            <option value="Sports">Sports</option>
                            <option value="Literary">Literary</option>
                            <option value="Social">Social</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Description</label>
                        <textarea 
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="4"
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", resize: "vertical" }}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Contact Email</label>
                        <input 
                            type="email"
                            name="contactEmail"
                            value={formData.contactEmail}
                            onChange={handleChange}
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                            required
                        />
                    </div>

                    <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px" }}>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Discord Webhook URL (Optional)</label>
                        <p style={{ fontSize: "13px", color: "#666", marginBottom: "10px" }}>
                            Add your Discord webhook URL to automatically post new events to your Discord server
                        </p>
                        <input 
                            type="url"
                            name="discordWebhook"
                            value={formData.discordWebhook || ""}
                            onChange={handleChange}
                            placeholder="https://discord.com/api/webhooks/..."
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                        />
                    </div>

                    <button 
                        type="submit"
                        style={{ 
                            padding: "12px 24px", 
                            backgroundColor: "#007bff", 
                            color: "white", 
                            border: "none", 
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "16px",
                            fontWeight: "bold",
                            marginTop: "10px"
                        }}
                    >
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
};

export default OrganizerProfile;
