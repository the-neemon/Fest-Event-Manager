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
    const [showRejectModal, setShowRejectModal] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchPayments();
    }, [eventId]);

    const fetchPayments = async () => {
        try {
            console.log('Fetching payments for event:', eventId);
            console.log('Token exists:', !!authTokens?.token);
            const res = await axios.get(
                `${API_URL}/api/organizer/pending-payments/${eventId}`,
                { headers: { 'x-auth-token': authTokens.token } }
            );
            console.log('Payments received:', res.data);
            setPayments(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching payments:', err);
            console.error('Error response:', err.response?.data);
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

    const filteredPayments = filterStatus === 'all' 
        ? payments 
        : payments.filter(p => p.paymentProof?.status === filterStatus);

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status] || 'bg-gray-100'}`}>
                {status.toUpperCase()}
            </span>
        );
    };

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
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Payment Approvals</h1>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        Back to Event
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-4 mb-6 border-b">
                    {['all', 'pending', 'approved', 'rejected'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 font-semibold ${
                                filterStatus === status
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                            {status !== 'all' && ` (${payments.filter(p => p.paymentProof?.status === status).length})`}
                        </button>
                    ))}
                </div>

                {filteredPayments.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">No payments to display</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredPayments.map((payment) => (
                            <div key={payment._id} className="bg-white border rounded-lg p-6 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold mb-2">
                                            {payment.participantId?.firstName} {payment.participantId?.lastName}
                                        </h3>
                                        <p className="text-gray-600 mb-2">{payment.participantId?.email}</p>
                                        <p className="text-sm text-gray-500">
                                            Uploaded: {new Date(payment.paymentProof?.uploadedAt).toLocaleString()}
                                        </p>
                                        {payment.paymentProof?.reviewedAt && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                Reviewed: {new Date(payment.paymentProof.reviewedAt).toLocaleString()}
                                            </p>
                                        )}
                                        {payment.paymentProof?.rejectionReason && (
                                            <p className="text-sm text-red-600 mt-2">
                                                <strong>Reason:</strong> {payment.paymentProof.rejectionReason}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {getStatusBadge(payment.paymentProof?.status)}
                                        {payment.ticketId && (
                                            <p className="text-sm text-gray-600">
                                                Ticket: {payment.ticketId}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-4 items-center">
                                    {payment.paymentProof?.data && (
                                        <>
                                            <img
                                                src={payment.paymentProof.data}
                                                alt="Payment Proof"
                                                className="w-32 h-32 object-cover rounded border cursor-pointer"
                                                onClick={() => setSelectedImage(payment.paymentProof.data)}
                                            />
                                            <button
                                                onClick={() => setSelectedImage(payment.paymentProof.data)}
                                                className="text-blue-600 hover:underline text-sm"
                                            >
                                                View Full Size
                                            </button>
                                        </>
                                    )}
                                </div>

                                {payment.paymentProof?.status === 'pending' && (
                                    <div className="mt-4 flex gap-3">
                                        <button
                                            onClick={() => handleApprove(payment._id)}
                                            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
                                        >
                                            Approve Payment
                                        </button>
                                        <button
                                            onClick={() => setShowRejectModal(payment._id)}
                                            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
                                        >
                                            Reject Payment
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Image Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="max-w-4xl max-h-full">
                        <img
                            src={selectedImage}
                            alt="Payment Proof Full Size"
                            className="max-w-full max-h-screen object-contain"
                        />
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Reject Payment</h3>
                        <p className="text-gray-600 mb-4">
                            Please provide a reason for rejecting this payment:
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full border rounded p-3 mb-4 h-32"
                            placeholder="e.g., Invalid payment screenshot, incorrect amount..."
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowRejectModal(null);
                                    setRejectionReason('');
                                }}
                                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleReject(showRejectModal)}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
