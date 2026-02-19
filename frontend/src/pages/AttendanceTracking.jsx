import { API_URL } from "../config";
import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

// QR scanner with camera and file upload support
import AuthContext from '../context/AuthContext';

const AttendanceTracking = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { authTokens } = useContext(AuthContext);
    const [event, setEvent] = useState(null);
    const [stats, setStats] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [filteredRegistrations, setFilteredRegistrations] = useState([]);
    const [filter, setFilter] = useState('all'); // all, scanned, not-scanned
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [showManualModal, setShowManualModal] = useState(null);
    const [manualReason, setManualReason] = useState('');
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [auditLogs, setAuditLogs] = useState([]);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        fetchEventDetails();
        fetchAttendanceData();
    }, [eventId]);

    useEffect(() => {
        applyFilters();
    }, [filter, searchQuery, registrations]);

    const fetchEventDetails = async () => {
        try {
            console.log('Fetching event details for eventId:', eventId);
            const res = await axios.get(
                `${API_URL}/api/events/${eventId}`,
                { headers: { 'x-auth-token': authTokens.token } }
            );
            setEvent(res.data);
        } catch (err) {
            console.error('Error fetching event:', err);
            console.error('EventId:', eventId);
            console.error('Response:', err.response?.data);
        }
    };

    const fetchAttendanceData = async () => {
        try {
            const res = await axios.get(
                `${API_URL}/api/attendance/event/${eventId}`,
                { headers: { 'x-auth-token': authTokens.token } }
            );
            setStats(res.data.stats);
            setRegistrations(res.data.registrations);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching attendance:', err);
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...registrations];

        // Apply attendance filter
        if (filter === 'scanned') {
            filtered = filtered.filter(r => r.attendance.marked);
        } else if (filter === 'not-scanned') {
            filtered = filtered.filter(r => !r.attendance.marked);
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r => 
                r.participant.name.toLowerCase().includes(query) ||
                r.participant.email.toLowerCase().includes(query) ||
                r.ticketId.toLowerCase().includes(query)
            );
        }

        setFilteredRegistrations(filtered);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                try {
                    const jsQR = (await import('jsqr')).default;
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);

                    if (code) {
                        await processScan(code.data, 'file_upload');
                    } else {
                        alert('No QR code found in image');
                    }
                } catch (err) {
                    console.error('QR decode error:', err);
                    alert('Failed to decode QR code');
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setScanning(true);
                scanFromCamera();
            }
        } catch (err) {
            console.error('Camera error:', err);
            alert('Failed to access camera. Please use file upload instead.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setScanning(false);
    };

    const scanFromCamera = async () => {
        if (!scanning || !videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            try {
                const jsQR = (await import('jsqr')).default;
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    stopCamera();
                    await processScan(code.data, 'qr_scan');
                    return;
                }
            } catch (err) {
                console.error('Scan error:', err);
            }
        }

        requestAnimationFrame(scanFromCamera);
    };

    const processScan = async (qrData, method) => {
        try {
            console.log('Processing scan - QR Data:', qrData);
            console.log('Method:', method);
            
            const res = await axios.post(
                `${API_URL}/api/attendance/scan`,
                { qrData, method },
                { headers: { 'x-auth-token': authTokens.token } }
            );
            
            console.log('Scan successful:', res.data);
            
            setScanResult({
                success: true,
                message: res.data.msg,
                participant: res.data.participant,
                markedAt: res.data.markedAt
            });
            
            fetchAttendanceData();
            
            setTimeout(() => setScanResult(null), 5000);
        } catch (err) {
            console.error('Scan error:', err);
            console.error('Error response:', err.response?.data);
            
            setScanResult({
                success: false,
                message: err.response?.data?.msg || 'Scan failed',
                duplicate: err.response?.data?.duplicate
            });
            
            setTimeout(() => setScanResult(null), 5000);
        }
    };

    const handleManualOverride = async (registrationId, action) => {
        if (!manualReason.trim()) {
            alert('Please provide a reason');
            return;
        }

        try {
            const res = await axios.post(
                `${API_URL}/api/attendance/manual/${registrationId}`,
                { action, reason: manualReason },
                { headers: { 'x-auth-token': authTokens.token } }
            );
            
            alert(res.data.msg);
            setShowManualModal(null);
            setManualReason('');
            fetchAttendanceData();
        } catch (err) {
            alert(err.response?.data?.msg || 'Failed to update attendance');
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const res = await axios.get(
                `${API_URL}/api/attendance/logs/${eventId}`,
                { headers: { 'x-auth-token': authTokens.token } }
            );
            setAuditLogs(res.data);
            setShowLogsModal(true);
        } catch (err) {
            console.error('Error fetching logs:', err);
        }
    };

    const exportToCSV = () => {
        const headers = ['Ticket ID', 'Name', 'Email', 'Contact', 'Attendance', 'Marked At', 'Registration Date'];
        const rows = filteredRegistrations.map(r => [
            r.ticketId,
            r.participant.name,
            r.participant.email,
            r.participant.contact || 'N/A',
            r.attendance.marked ? 'Present' : 'Absent',
            r.attendance.marked ? new Date(r.attendance.timestamp).toLocaleString() : 'N/A',
            new Date(r.registrationDate).toLocaleDateString()
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${event?.name}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div>
                <Navbar />
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Navbar />
            <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                    <div>
                        <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>Attendance Tracking</h1>
                        <p style={{ color: "#666", marginTop: "8px" }}>{event?.name}</p>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ padding: "10px 20px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                        Back to Event
                    </button>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", marginBottom: "25px" }}>
                        <div style={{ padding: "20px", backgroundColor: "#e3f2fd", borderRadius: "8px", textAlign: "center" }}>
                            <p style={{ fontSize: "13px", color: "#666", margin: "0 0 8px 0" }}>Total Registrations</p>
                            <p style={{ fontSize: "32px", fontWeight: "bold", color: "#1976d2", margin: 0 }}>{stats.total}</p>
                        </div>
                        <div style={{ padding: "20px", backgroundColor: "#e8f5e9", borderRadius: "8px", textAlign: "center" }}>
                            <p style={{ fontSize: "13px", color: "#666", margin: "0 0 8px 0" }}>Scanned</p>
                            <p style={{ fontSize: "32px", fontWeight: "bold", color: "#388e3c", margin: 0 }}>{stats.scanned}</p>
                        </div>
                        <div style={{ padding: "20px", backgroundColor: "#fff8e1", borderRadius: "8px", textAlign: "center" }}>
                            <p style={{ fontSize: "13px", color: "#666", margin: "0 0 8px 0" }}>Not Scanned</p>
                            <p style={{ fontSize: "32px", fontWeight: "bold", color: "#f57c00", margin: 0 }}>{stats.notScanned}</p>
                        </div>
                        <div style={{ padding: "20px", backgroundColor: "#f3e5f5", borderRadius: "8px", textAlign: "center" }}>
                            <p style={{ fontSize: "13px", color: "#666", margin: "0 0 8px 0" }}>Scan Rate</p>
                            <p style={{ fontSize: "32px", fontWeight: "bold", color: "#7b1fa2", margin: 0 }}>{stats.scanRate}%</p>
                        </div>
                    </div>
                )}

                {/* Scan Result Alert */}
                {scanResult && (
                    <div style={{
                        marginBottom: "20px",
                        padding: "15px",
                        borderRadius: "8px",
                        backgroundColor: scanResult.success ? '#d4edda' : '#f8d7da',
                        border: scanResult.success ? '1px solid #c3e6cb' : '1px solid #f5c6cb'
                    }}>
                        <p style={{ fontWeight: "bold", color: scanResult.success ? '#155724' : '#721c24', margin: 0 }}>
                            {scanResult.message}
                        </p>
                        {scanResult.participant && (
                            <p style={{ fontSize: "14px", marginTop: "8px", color: "#555", margin: "8px 0 0 0" }}>
                                {scanResult.participant.name} - {scanResult.participant.ticketId}
                            </p>
                        )}
                    </div>
                )}

                {/* Scanner Controls */}
                <div style={{ backgroundColor: "white", border: "1px solid #ddd", borderRadius: "8px", padding: "20px", marginBottom: "25px" }}>
                    <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px" }}>QR Code Scanner</h2>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {!scanning ? (
                            <button
                                onClick={startCamera}
                                style={{ padding: "12px 24px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                            >
                                Start Camera Scan
                            </button>
                        ) : (
                            <button
                                onClick={stopCamera}
                                style={{ padding: "12px 24px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                            >
                                Stop Camera
                            </button>
                        )}
                        <label style={{ padding: "12px 24px", backgroundColor: "#28a745", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                            Upload QR Image
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                style={{ display: "none" }}
                            />
                        </label>
                        <button
                            onClick={fetchAuditLogs}
                            style={{ padding: "12px 24px", backgroundColor: "#6f42c1", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                        >
                            View Audit Logs
                        </button>
                    </div>

                    {/* Camera Preview */}
                    {scanning && (
                        <div style={{ marginTop: "15px" }}>
                            <video
                                ref={videoRef}
                                style={{ width: "100%", maxWidth: "450px", border: "1px solid #ddd", borderRadius: "6px" }}
                                playsInline
                            />
                            <canvas ref={canvasRef} style={{ display: "none" }} />
                            <p style={{ fontSize: "13px", color: "#666", marginTop: "8px" }}>Position QR code in camera view</p>
                        </div>
                    )}
                </div>

                {/* Filters and Search */}
                <div style={{ backgroundColor: "white", border: "1px solid #ddd", borderRadius: "8px", padding: "20px", marginBottom: "25px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                onClick={() => setFilter('all')}
                                style={{
                                    padding: "10px 16px",
                                    borderRadius: "6px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                    backgroundColor: filter === 'all' ? '#007bff' : '#e0e0e0',
                                    color: filter === 'all' ? 'white' : '#333'
                                }}
                            >
                                All ({registrations.length})
                            </button>
                            <button
                                onClick={() => setFilter('scanned')}
                                style={{
                                    padding: "10px 16px",
                                    borderRadius: "6px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                    backgroundColor: filter === 'scanned' ? '#28a745' : '#e0e0e0',
                                    color: filter === 'scanned' ? 'white' : '#333'
                                }}
                            >
                                Scanned ({registrations.filter(r => r.attendance.marked).length})
                            </button>
                            <button
                                onClick={() => setFilter('not-scanned')}
                                style={{
                                    padding: "10px 16px",
                                    borderRadius: "6px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                    backgroundColor: filter === 'not-scanned' ? '#ffc107' : '#e0e0e0',
                                    color: filter === 'not-scanned' ? '#333' : '#333'
                                }}
                            >
                                Not Scanned ({registrations.filter(r => !r.attendance.marked).length})
                            </button>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input
                                type="text"
                                placeholder="Search by name, email, or ticket..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ padding: "10px 16px", border: "1px solid #ddd", borderRadius: "6px", width: "280px" }}
                            />
                            <button
                                onClick={exportToCSV}
                                style={{ padding: "10px 20px", backgroundColor: "#6610f2", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                            >
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                {/* Attendance List */}
                <div style={{ backgroundColor: "white", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead style={{ backgroundColor: "#f8f9fa" }}>
                                <tr>
                                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "14px", fontWeight: "600", borderBottom: "1px solid #ddd" }}>Ticket ID</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "14px", fontWeight: "600", borderBottom: "1px solid #ddd" }}>Participant</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "14px", fontWeight: "600", borderBottom: "1px solid #ddd" }}>Contact</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "14px", fontWeight: "600", borderBottom: "1px solid #ddd" }}>Status</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "14px", fontWeight: "600", borderBottom: "1px solid #ddd" }}>Marked At</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "14px", fontWeight: "600", borderBottom: "1px solid #ddd" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRegistrations.map((reg) => (
                                    <tr key={reg._id} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "12px 16px", fontSize: "13px", fontFamily: "monospace" }}>{reg.ticketId}</td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <div>
                                                <p style={{ fontWeight: "600", margin: 0 }}>{reg.participant.name}</p>
                                                <p style={{ fontSize: "12px", color: "#666", margin: "4px 0 0 0" }}>{reg.participant.email}</p>
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 16px", fontSize: "13px" }}>{reg.participant.contact || 'N/A'}</td>
                                        <td style={{ padding: "12px 16px" }}>
                                            {reg.attendance.marked ? (
                                                <span style={{ display: "inline-block", padding: "4px 12px", backgroundColor: "#d4edda", color: "#155724", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
                                                    Present
                                                </span>
                                            ) : (
                                                <span style={{ display: "inline-block", padding: "4px 12px", backgroundColor: "#f0f0f0", color: "#333", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
                                                    Absent
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: "12px 16px", fontSize: "13px" }}>
                                            {reg.attendance.marked 
                                                ? new Date(reg.attendance.timestamp).toLocaleString()
                                                : '-'
                                            }
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <button
                                                onClick={() => setShowManualModal(reg)}
                                                style={{ padding: "6px 12px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", fontSize: "13px", cursor: "pointer" }}
                                            >
                                                Manual Override
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredRegistrations.length === 0 && (
                            <div style={{ textAlign: "center", padding: "40px 20px", color: "#666" }}>
                                No participants found
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Manual Override Modal */}
            {showManualModal && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
                    <div style={{ backgroundColor: "white", borderRadius: "8px", padding: "24px", maxWidth: "500px", width: "100%" }}>
                        <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px" }}>Manual Override</h3>
                        <p style={{ marginBottom: "8px" }}><strong>Participant:</strong> {showManualModal.participant.name}</p>
                        <p style={{ marginBottom: "16px" }}><strong>Current Status:</strong> {showManualModal.attendance.marked ? 'Present' : 'Absent'}</p>
                        
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Reason for Override:</label>
                        <textarea
                            value={manualReason}
                            onChange={(e) => setManualReason(e.target.value)}
                            style={{ width: "100%", border: "1px solid #ddd", borderRadius: "4px", padding: "12px", height: "100px", fontSize: "14px", marginBottom: "16px", resize: "vertical" }}
                            placeholder="e.g., QR code damaged, lost phone, technical issues..."
                        />
                        
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button
                                onClick={() => {
                                    setShowManualModal(null);
                                    setManualReason('');
                                }}
                                style={{ padding: "8px 16px", backgroundColor: "#e0e0e0", border: "none", borderRadius: "4px", cursor: "pointer" }}
                            >
                                Cancel
                            </button>
                            {!showManualModal.attendance.marked && (
                                <button
                                    onClick={() => handleManualOverride(showManualModal._id, 'mark')}
                                    style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                                >
                                    Mark Present
                                </button>
                            )}
                            {showManualModal.attendance.marked && (
                                <button
                                    onClick={() => handleManualOverride(showManualModal._id, 'unmark')}
                                    style={{ padding: "8px 16px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                                >
                                    Mark Absent
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Logs Modal */}
            {showLogsModal && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
                    <div style={{ backgroundColor: "white", borderRadius: "8px", padding: "24px", maxWidth: "900px", width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <h3 style={{ fontSize: "20px", fontWeight: "bold" }}>Audit Logs</h3>
                            <button
                                onClick={() => setShowLogsModal(false)}
                                style={{ fontSize: "28px", color: "#666", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}
                            >
                                ×
                            </button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {auditLogs.map((log) => (
                                <div key={log._id} style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "16px", backgroundColor: "#f9f9f9" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "10px" }}>
                                        <div>
                                            <p style={{ fontWeight: "600", margin: 0 }}>
                                                {log.participantId?.firstName} {log.participantId?.lastName}
                                            </p>
                                            <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0 0" }}>{log.participantId?.email}</p>
                                        </div>
                                        <span style={{
                                            display: "inline-block",
                                            padding: "4px 12px",
                                            borderRadius: "20px",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            backgroundColor: log.action === 'marked' ? '#d4edda' : '#f8d7da',
                                            color: log.action === 'marked' ? '#155724' : '#721c24'
                                        }}>
                                            {log.action}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: "13px", color: "#555" }}>
                                        <p style={{ margin: "4px 0" }}><strong>Method:</strong> {log.method}</p>
                                        <p style={{ margin: "4px 0" }}><strong>By:</strong> {log.performedBy?.organizerName}</p>
                                        <p style={{ margin: "4px 0" }}><strong>Time:</strong> {new Date(log.timestamp).toLocaleString()}</p>
                                        {log.reason && <p style={{ margin: "4px 0" }}><strong>Reason:</strong> {log.reason}</p>}
                                    </div>
                                </div>
                            ))}
                            {auditLogs.length === 0 && (
                                <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>No audit logs yet</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceTracking;
