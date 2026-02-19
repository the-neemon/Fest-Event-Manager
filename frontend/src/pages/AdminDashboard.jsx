import { API_URL } from "../config";
import { useState, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const AdminDashboard = () => {
    const { authTokens } = useContext(AuthContext);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        organizerName: "",
        category: "Technical",
        description: ""
    });

    const [generatedCredentials, setGeneratedCredentials] = useState(null);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Always auto-generate credentials
            const response = await axios.post(`${API_URL}/api/admin/add-organizer`, {
                ...formData,
                autoGenerate: true
            }, {
                headers: { "x-auth-token": authTokens.token }
            });
            alert("Organizer Added Successfully!");
            
            if (response.data.credentials) {
                setGeneratedCredentials(response.data.credentials);
            }
            
            setFormData({
                organizerName: "",
                category: "Technical",
                description: ""
            });
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.msg || "Error adding organizer");
        }
    };

    return (
        <div>
            <Navbar />
            <div style={{ padding: "30px", maxWidth: "800px", margin: "0 auto" }}>
                <h1 style={{ marginBottom: "30px" }}>Admin Dashboard</h1>
                
                <div style={{ border: "1px solid #ddd", padding: "30px", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
                    <h2 style={{ marginBottom: "20px" }}>Add New Club</h2>
                    <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
                        Email and password will be auto-generated. Email domain: @clubs.iiit.ac.in
                    </p>
                    
                    {generatedCredentials && (
                        <div style={{
                            backgroundColor: "#d4edda",
                            border: "1px solid #c3e6cb",
                            padding: "15px",
                            borderRadius: "5px",
                            marginBottom: "20px"
                        }}>
                            <h3 style={{ color: "#155724", marginBottom: "10px" }}>✓ Club Created Successfully!</h3>
                            <p style={{ margin: "5px 0", color: "#155724" }}><strong>Email:</strong> {generatedCredentials.email}</p>
                            <p style={{ margin: "5px 0", color: "#155724" }}><strong>Password:</strong> {generatedCredentials.password}</p>
                            <p style={{ fontSize: "12px", color: "#155724", marginTop: "10px" }}>
                                Please share these credentials with the club. This password will not be shown again.
                            </p>
                            <button 
                                onClick={() => setGeneratedCredentials(null)}
                                style={{ marginTop: "10px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" }}
                            >
                                Close
                            </button>
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        
                        <div>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Club Name *</label>
                            <input 
                                name="organizerName" 
                                placeholder="e.g. Coding Club, Cultural Committee" 
                                value={formData.organizerName}
                                onChange={handleChange} 
                                required 
                                style={{ width: "100%", padding: "10px", fontSize: "14px", borderRadius: "4px", border: "1px solid #ddd" }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Category *</label>
                            <select 
                                name="category" 
                                value={formData.category}
                                onChange={handleChange} 
                                style={{ width: "100%", padding: "10px", fontSize: "14px", borderRadius: "4px", border: "1px solid #ddd" }}
                            >
                                <option value="Technical">Technical</option>
                                <option value="Cultural">Cultural</option>
                                <option value="Sports">Sports</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Description *</label>
                            <textarea 
                                name="description" 
                                placeholder="Brief description of the club..." 
                                value={formData.description}
                                onChange={handleChange} 
                                required
                                style={{ width: "100%", padding: "10px", fontSize: "14px", height: "80px", resize: "vertical", borderRadius: "4px", border: "1px solid #ddd" }}
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            style={{ 
                                backgroundColor: "#28a745", 
                                color: "white", 
                                padding: "12px", 
                                fontSize: "16px",
                                fontWeight: "bold",
                                border: "none", 
                                borderRadius: "5px",
                                cursor: "pointer", 
                                marginTop: "10px" 
                            }}
                        >
                            Create Club
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
