import { API_URL } from "../config";
import { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import Navbar from "../components/Navbar";

const ProfilePage = () => {
    const { authTokens } = useContext(AuthContext);
    
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        contactNumber: "",
        participantType: "",
        collegeName: "",
        interests: [],
        isIIITStudent: false,
        followedOrganizers: []
    });
    
    const [loading, setLoading] = useState(true);
    const [allOrganizers, setAllOrganizers] = useState([]);
    const [editingInterests, setEditingInterests] = useState(false);
    const [editingClubs, setEditingClubs] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const availableInterests = ["Technical", "Cultural", "Sports"];

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/auth/profile`, {
                    headers: { "x-auth-token": authTokens.token }
                });
                setFormData(res.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                alert("Error loading profile");
            }
        };
        fetchProfile();
    }, [authTokens]);

    useEffect(() => {
        const fetchOrganizers = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/auth/organizers`);
                setAllOrganizers(res.data);
            } catch (error) {
                console.error("Error fetching organizers:", error);
            }
        };
        fetchOrganizers();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleInterest = (interest) => {
        const currentInterests = formData.interests || [];
        const updatedInterests = currentInterests.includes(interest)
            ? currentInterests.filter(i => i !== interest)
            : [...currentInterests, interest];
        setFormData({ ...formData, interests: updatedInterests });
    };

    const toggleClub = (organizerId) => {
        const currentClubs = formData.followedOrganizers || [];
        // after a GET, followedOrganizers contains populated objects; normalize to IDs before toggling
        const clubIds = currentClubs.map(c => typeof c === 'object' ? c._id : c);
        
        const updatedClubs = clubIds.includes(organizerId)
            ? clubIds.filter(id => id !== organizerId)
            : [...clubIds, organizerId];
        
        setFormData({ ...formData, followedOrganizers: updatedClubs });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_URL}/api/auth/profile`, 
                formData,
                { headers: { "x-auth-token": authTokens.token } }
            );
            alert("Profile Updated Successfully!");
            setEditingInterests(false);
            setEditingClubs(false);
            // re-fetch so followedOrganizers is populated (objects with names), not just raw IDs
            const res = await axios.get(`${API_URL}/api/auth/profile`, {
                headers: { "x-auth-token": authTokens.token }
            });
            setFormData(res.data);
        } catch (err) {
            console.error(err);
            alert("Update Failed");
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert("New passwords do not match!");
            return;
        }
        
        if (passwordData.newPassword.length < 6) {
            alert("New password must be at least 6 characters long!");
            return;
        }
        
        try {
            await axios.put(`${API_URL}/api/auth/change-password`, 
                {
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                },
                { headers: { "x-auth-token": authTokens.token } }
            );
            alert("Password changed successfully!");
            setShowPasswordChange(false);
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: ""
            });
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.msg || "Password change failed");
        }
    };

    if (loading) return <div style={{padding: "20px"}}>Loading...</div>;

    // normalize populated docs to plain IDs for checkbox comparison in the edit view
    const followedClubIds = (formData.followedOrganizers || []).map(c => typeof c === 'object' ? c._id : c);

    return (
        <div>
            <Navbar />
            
            <div style={{ maxWidth: "600px", margin: "20px auto", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
                <h2>My Profile</h2>
                
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    
                    <div style={{ backgroundColor: "#f8f9fa", padding: "10px", borderRadius: "5px" }}>
                        <label style={{fontSize: "12px", color: "gray"}}>Email</label>
                        <div style={{fontWeight: "bold"}}>{formData.email}</div>
                    </div>

                    <div style={{ backgroundColor: "#f8f9fa", padding: "10px", borderRadius: "5px" }}>
                        <label style={{fontSize: "12px", color: "gray"}}>Participant Category</label>
                        <div style={{fontWeight: "bold"}}>{formData.isIIITStudent ? "IIIT Student" : "Non-IIIT"}</div>
                    </div>

                    <div style={{ backgroundColor: "#f8f9fa", padding: "10px", borderRadius: "5px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <label style={{fontSize: "12px", color: "gray"}}>Interests</label>
                            <button 
                                type="button"
                                onClick={() => setEditingInterests(!editingInterests)}
                                style={{ fontSize: "12px", padding: "4px 8px", cursor: "pointer", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "3px" }}
                            >
                                {editingInterests ? "Done" : "Edit"}
                            </button>
                        </div>
                        {editingInterests ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {availableInterests.map(interest => (
                                    <label key={interest} style={{ cursor: "pointer" }}>
                                        <input 
                                            type="checkbox" 
                                            checked={(formData.interests || []).includes(interest)}
                                            onChange={() => toggleInterest(interest)}
                                            style={{ marginRight: "8px" }}
                                        />
                                        {interest}
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div style={{fontWeight: "bold"}}>
                                {(formData.interests && formData.interests.length > 0) 
                                    ? formData.interests.join(", ") 
                                    : "No interests selected"}
                            </div>
                        )}
                    </div>

                    <div style={{ backgroundColor: "#f8f9fa", padding: "10px", borderRadius: "5px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <label style={{fontSize: "12px", color: "gray"}}>Followed Clubs</label>
                            <button 
                                type="button"
                                onClick={() => setEditingClubs(!editingClubs)}
                                style={{ fontSize: "12px", padding: "4px 8px", cursor: "pointer", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "3px" }}
                            >
                                {editingClubs ? "Done" : "Edit"}
                            </button>
                        </div>
                        {editingClubs ? (
                            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                                {allOrganizers.map(org => (
                                    <label key={org._id} style={{ display: "block", marginBottom: "8px", cursor: "pointer" }}>
                                        <input 
                                            type="checkbox" 
                                            checked={followedClubIds.includes(org._id)}
                                            onChange={() => toggleClub(org._id)}
                                            style={{ marginRight: "8px" }}
                                        />
                                        {org.organizerName} <span style={{ fontSize: "11px", color: "gray" }}>({org.category})</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div style={{fontWeight: "bold"}}>
                                {formData.followedOrganizers && formData.followedOrganizers.length > 0 
                                    ? formData.followedOrganizers.map(org => typeof org === 'object' ? org.organizerName : org).join(", ")
                                    : "No clubs followed"}
                            </div>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                        <div style={{ flex: 1 }}>
                            <label>First Name</label>
                            <input name="firstName" value={formData.firstName} onChange={handleChange} style={{ width: "100%", padding: "8px" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>Last Name</label>
                            <input name="lastName" value={formData.lastName} onChange={handleChange} style={{ width: "100%", padding: "8px" }} />
                        </div>
                    </div>

                    <div>
                        <label>Contact Number</label>
                        <input name="contactNumber" value={formData.contactNumber || ""} onChange={handleChange} style={{ width: "100%", padding: "8px" }} />
                    </div>

                    {!formData.isIIITStudent && (
                        <div>
                            <label>College / Organization</label>
                            <input name="collegeName" value={formData.collegeName || ""} onChange={handleChange} style={{ width: "100%", padding: "8px" }} />
                        </div>
                    )}

                    <button type="submit" style={{ padding: "12px", backgroundColor: "#007bff", color: "white", border: "none", cursor: "pointer", marginTop: "10px", fontSize: "16px" }}>
                        Save Changes
                    </button>
                </form>

                <div style={{ marginTop: "30px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#fff" }}>
                    <h3 style={{ marginBottom: "15px" }}>Security Settings</h3>
                    
                    {!showPasswordChange ? (
                        <button 
                            onClick={() => setShowPasswordChange(true)}
                            style={{ 
                                padding: "10px 20px", 
                                backgroundColor: "#dc3545", 
                                color: "white", 
                                border: "none", 
                                cursor: "pointer", 
                                borderRadius: "5px",
                                fontSize: "14px"
                            }}
                        >
                            Change Password
                        </button>
                    ) : (
                        <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Current Password</label>
                                <input 
                                    type="password" 
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                    required
                                    style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                                />
                            </div>
                            
                            <div>
                                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>New Password</label>
                                <input 
                                    type="password" 
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                    required
                                    minLength="6"
                                    style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                                />
                                <small style={{ color: "#666", fontSize: "12px" }}>Must be at least 6 characters</small>
                            </div>
                            
                            <div>
                                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Confirm New Password</label>
                                <input 
                                    type="password" 
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                    required
                                    style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                                />
                            </div>
                            
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button 
                                    type="submit"
                                    style={{ 
                                        flex: 1,
                                        padding: "10px", 
                                        backgroundColor: "#28a745", 
                                        color: "white", 
                                        border: "none", 
                                        cursor: "pointer", 
                                        borderRadius: "5px",
                                        fontSize: "14px"
                                    }}
                                >
                                    Update Password
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordChange(false);
                                        setPasswordData({
                                            currentPassword: "",
                                            newPassword: "",
                                            confirmPassword: ""
                                        });
                                    }}
                                    style={{ 
                                        flex: 1,
                                        padding: "10px", 
                                        backgroundColor: "#6c757d", 
                                        color: "white", 
                                        border: "none", 
                                        cursor: "pointer", 
                                        borderRadius: "5px",
                                        fontSize: "14px"
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;