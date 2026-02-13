import { API_URL } from "../config";
import { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import Navbar from "../components/Navbar";

const PasswordResetRequests = () => {
    const { authTokens } = useContext(AuthContext);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/admin/password-reset-requests`, {
                headers: { "x-auth-token": authTokens.token }
            });
            setRequests(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching password reset requests:", error);
            alert("Failed to load password reset requests");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleApprove = async (requestId, organizerId, organizerName) => {
        if (!confirm(`Generate new password for "${organizerName}"?`)) return;

        try {
            const response = await axios.post(
                `${API_URL}/api/admin/approve-password-reset/${requestId}`,
                {},
                { headers: { "x-auth-token": authTokens.token } }
            );

            const newPassword = response.data.newPassword;
            alert(`New password for ${organizerName}:\n\n${newPassword}\n\nPlease share this with the organizer. This will not be shown again.`);
            
            fetchRequests(); // Refresh list
        } catch (error) {
            console.error("Error approving request:", error);
            alert(error.response?.data?.msg || "Failed to approve request");
        }
    };

    const handleReject = async (requestId, organizerName) => {
        if (!confirm(`Reject password reset request for "${organizerName}"?`)) return;

        try {
            await axios.delete(
                `${API_URL}/api/admin/reject-password-reset/${requestId}`,
                { headers: { "x-auth-token": authTokens.token } }
            );
            alert("Request rejected successfully");
            fetchRequests(); // Refresh list
        } catch (error) {
            console.error("Error rejecting request:", error);
            alert(error.response?.data?.msg || "Failed to reject request");
        }
    };

    if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;

    return (
        <div>
            <Navbar />
            <div style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto" }}>
                <h1 style={{ marginBottom: "30px" }}>Password Reset Requests</h1>

                {requests.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                        <p style={{ color: "#666" }}>No pending password reset requests</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        {requests.map((request) => (
                            <div
                                key={request._id}
                                style={{
                                    border: "1px solid #ddd",
                                    borderRadius: "8px",
                                    padding: "20px",
                                    backgroundColor: "#fff",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: 0, marginBottom: "10px" }}>
                                        {request.organizer?.organizerName || "Unknown Organizer"}
                                    </h3>
                                    <div style={{ fontSize: "14px", color: "#555" }}>
                                        <p style={{ margin: "5px 0" }}>
                                            <strong>Email:</strong> {request.organizer?.contactEmail || "N/A"}
                                        </p>
                                        <p style={{ margin: "5px 0" }}>
                                            <strong>Category:</strong> {request.organizer?.category || "N/A"}
                                        </p>
                                        <p style={{ margin: "5px 0" }}>
                                            <strong>Reason:</strong> {request.reason || "No reason provided"}
                                        </p>
                                        <p style={{ margin: "5px 0", fontSize: "12px", color: "#999" }}>
                                            <strong>Requested:</strong> {new Date(request.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "120px" }}>
                                    <button
                                        onClick={() => handleApprove(
                                            request._id, 
                                            request.organizer?._id,
                                            request.organizer?.organizerName
                                        )}
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
                                        Approve & Generate
                                    </button>
                                    <button
                                        onClick={() => handleReject(request._id, request.organizer?.organizerName)}
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
                                        Reject
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

export default PasswordResetRequests;
