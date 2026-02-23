import { API_URL } from "../config";
import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import AuthContext from '../context/AuthContext';

const PaymentApproval = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { authTokens } = useContext(AuthContext);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(null); // stores registrationId to reject; null = modal closed
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchPayments();
    }, [eventId]);

    const fetchPayments = async () => {
        try {
            const res = await axios.get(
                `${API_URL}/api/organizer/pending-payments/${eventId}`,
                { headers: { 'x-auth-token': authTokens.token } }
            );
            setPayments(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching payments:', err);
            setLoading(false);
        }
    };

    const handleApprove = async (registrationId) => {
        if (!window.confirm('Are you sure you want to approve this payment?')) return;

        try {
            const res = await axios.put(
                `${API_URL}/api/organizer/approve-payment/${registrationId}`,
                {},
                { headers: { 'x-auth-token': authTokens.token } }
            );
            alert(res.data.msg);
            fetchPayments();
        } catch (err) {
            alert(err.response?.data?.msg || 'Error approving payment');
        }
    };

    const handleReject = async (registrationId) => {
        if (!rejectionReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }

        try {
            const res = await axios.put(
                `${API_URL}/api/organizer/reject-payment/${registrationId}`,
                { rejectionReason },
                { headers: { 'x-auth-token': authTokens.token } }
            );
            alert(res.data.msg);
            setShowRejectModal(null);
            setRejectionReason('');
            fetchPayments();
        } catch (err) {
            alert(err.response?.data?.msg || 'Error rejecting payment');
        }
    };

    // client-side filter — switching tabs doesn't trigger a new fetch
    const filteredPayments = filterStatus === 'all' 
        ? payments 
        : payments.filter(p => p.paymentProof?.status === filterStatus);

    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <p>Loading payments...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Navbar />
            <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                    <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>Payment Approvals</h1>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ padding: "10px 20px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                        Back
                    </button>
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
                    {['all', 'pending', 'approved', 'rejected'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            style={{
                                padding: "8px 16px",
                                fontWeight: filterStatus === status ? "bold" : "normal",
                                borderBottom: filterStatus === status ? "2px solid #007bff" : "none",
                                color: filterStatus === status ? "#007bff" : "#666",
                                backgroundColor: "transparent",
                                border: "none",
                                cursor: "pointer"
                            }}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                            {status !== 'all' && ` (${payments.filter(p => p.paymentProof?.status === status).length})`}
                        </button>
                    ))}
                </div>

                {filteredPayments.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                        <p style={{ color: "#666", margin: 0 }}>No payments to display</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {filteredPayments.map((payment) => (
                            <div key={payment._id} style={{ backgroundColor: "white", border: "1px solid #ddd", borderRadius: "8px", padding: "20px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "20px", alignItems: "start" }}>
                                    <div>
                                        <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0" }}>
                                            {payment.participantId?.firstName} {payment.participantId?.lastName}
                                        </h3>
                                        <p style={{ color: "#666", margin: "0 0 5px 0", fontSize: "14px" }}>{payment.participantId?.email}</p>
                                        <p style={{ fontSize: "13px", color: "#999", margin: "0 0 3px 0" }}>
                                            Uploaded: {new Date(payment.paymentProof?.uploadedAt).toLocaleString()}
                                        </p>
                                        {payment.paymentProof?.reviewedAt && (
                                            <p style={{ fontSize: "13px", color: "#999", margin: 0 }}>
                                                Reviewed: {new Date(payment.paymentProof.reviewedAt).toLocaleString()}
                                            </p>
                                        )}
                                        {payment.paymentProof?.rejectionReason && (
                                            <p style={{ fontSize: "13px", color: "#dc3545", marginTop: "8px", padding: "8px", backgroundColor: "#fff5f5", borderRadius: "4px" }}>
                                                <strong>Reason:</strong> {payment.paymentProof.rejectionReason}
                                            </p>
                                        )}
                                    </div>

                                    {/* paymentProof.data is the base64 image stored in MongoDB; click opens full-size lightbox */}
                                    {payment.paymentProof?.data && (
                                        <img
                                            src={payment.paymentProof.data}
                                            alt="Payment Proof"
                                            style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "6px", border: "1px solid #ddd", cursor: "pointer" }}
                                            onClick={() => setSelectedImage(payment.paymentProof.data)}
                                        />
                                    )}

                                    <div style={{ textAlign: "right" }}>
                                        <span style={{
                                            display: "inline-block",
                                            padding: "6px 12px",
                                            borderRadius: "20px",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            backgroundColor: payment.paymentProof?.status === 'pending' ? '#fff3cd' : payment.paymentProof?.status === 'approved' ? '#d4edda' : '#f8d7da',
                                            color: payment.paymentProof?.status === 'pending' ? '#856404' : payment.paymentProof?.status === 'approved' ? '#155724' : '#721c24'
                                        }}>
                                            {payment.paymentProof?.status?.toUpperCase()}
                                        </span>
                                        {payment.ticketId && (
                                            <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
                                                Ticket: {payment.ticketId}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {payment.paymentProof?.status === 'pending' && (
                                    <div style={{ marginTop: "20px", display: "flex", gap: "10px", paddingTop: "15px", borderTop: "1px solid #eee" }}>
                                        <button
                                            onClick={() => handleApprove(payment._id)}
                                            style={{ padding: "10px 24px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => setShowRejectModal(payment._id)}
                                            style={{ padding: "10px 24px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedImage && (
                <div 
                    style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
                    onClick={() => setSelectedImage(null)}
                >
                    <img
                        src={selectedImage}
                        alt="Payment Proof"
                        style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain", borderRadius: "8px" }}
                    />
                </div>
            )}

            {showRejectModal && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
                    <div style={{ backgroundColor: "white", borderRadius: "8px", padding: "24px", maxWidth: "500px", width: "100%" }}>
                        <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px" }}>Reject Payment</h3>
                        <p style={{ color: "#666", marginBottom: "16px", fontSize: "14px" }}>
                            Please provide a reason for rejecting this payment:
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            style={{ width: "100%", border: "1px solid #ddd", borderRadius: "4px", padding: "12px", height: "100px", fontSize: "14px", resize: "vertical" }}
                            placeholder="e.g., Invalid payment screenshot, incorrect amount..."
                        />
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
                            <button
                                onClick={() => {
                                    setShowRejectModal(null);
                                    setRejectionReason('');
                                }}
                                style={{ padding: "8px 16px", backgroundColor: "#e0e0e0", border: "none", borderRadius: "4px", cursor: "pointer" }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleReject(showRejectModal)}
                                style={{ padding: "8px 16px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                            >
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentApproval;
