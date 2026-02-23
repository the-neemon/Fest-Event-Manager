import { API_URL } from "../config";
import { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import Navbar from "../components/Navbar";

const ManageOrganizers = () => {
    const { authTokens } = useContext(AuthContext);
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrganizers();
    }, []);

    const fetchOrganizers = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/admin/organizers`, {
                headers: { "x-auth-token": authTokens.token }
            });
            setOrganizers(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching organizers:", error);
            alert("Failed to load organizers");
            setLoading(false);
        }
    };

    // currentStatus is organizer.disabled; flips to opposite action label and sends same endpoint either way
    const handleDisable = async (id, currentStatus) => {
        const action = currentStatus ? "enable" : "disable";
        if (!confirm(`Are you sure you want to ${action} this organizer?`)) return;

        try {
            await axios.put(`${API_URL}/api/admin/organizer/${id}/disable`, {}, {
                headers: { "x-auth-token": authTokens.token }
            });
            alert(`Organizer ${action}d successfully!`);
            fetchOrganizers();
        } catch (error) {
            console.error("Error updating organizer:", error);
            alert(error.response?.data?.msg || "Failed to update organizer");
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) return;

        try {
            await axios.delete(`${API_URL}/api/admin/organizer/${id}`, {
                headers: { "x-auth-token": authTokens.token }
            });
            alert("Organizer deleted successfully!");
            fetchOrganizers();
        } catch (error) {
            console.error("Error deleting organizer:", error);
            alert(error.response?.data?.msg || "Failed to delete organizer");
        }
    };

    if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;

    return (
        <div>
            <Navbar />
            <div style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto" }}>
                <h1 style={{ marginBottom: "30px" }}>Manage Clubs</h1>
                
                {organizers.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                        <p style={{ color: "#666" }}>No organizers found</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        {organizers.map((organizer) => (
                            <div 
                                key={organizer._id} 
                                style={{ 
                                    border: "1px solid #ddd", 
                                    borderRadius: "8px", 
                                    padding: "20px", 
                                    backgroundColor: organizer.disabled ? "#f8d7da" : "#fff", // red tint signals disabled state at a glance
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                        <h3 style={{ margin: 0 }}>{organizer.organizerName}</h3>
                                        {organizer.disabled && (
                                            <span style={{
                                                backgroundColor: "#dc3545",
                                                color: "white",
                                                padding: "4px 8px",
                                                borderRadius: "4px",
                                                fontSize: "12px",
                                                fontWeight: "bold"
                                            }}>
                                                DISABLED
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: "14px", color: "#555" }}>
                                        <p style={{ margin: "5px 0" }}>
                                            <strong>Email:</strong> {organizer.contactEmail}
                                        </p>
                                        <p style={{ margin: "5px 0" }}>
                                            <strong>Category:</strong> {organizer.category}
                                        </p>
                                        <p style={{ margin: "5px 0" }}>
                                            <strong>Description:</strong> {organizer.description}
                                        </p>
                                        <p style={{ margin: "5px 0", fontSize: "12px", color: "#999" }}>
                                            <strong>Created:</strong> {new Date(organizer.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "120px" }}>
                                    <button
                                        onClick={() => handleDisable(organizer._id, organizer.disabled)}
                                        style={{
                                            padding: "8px 16px",
                                            backgroundColor: organizer.disabled ? "#28a745" : "#ffc107",
                                            color: organizer.disabled ? "white" : "#000",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            fontWeight: "bold"
                                        }}
                                    >
                                        {organizer.disabled ? "Enable" : "Disable"}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(organizer._id, organizer.organizerName)}
                                        style={{
                                            padding: "8px 16px",
                                            backgroundColor: "#dc3545",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            fontWeight: "bold"
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageOrganizers;
