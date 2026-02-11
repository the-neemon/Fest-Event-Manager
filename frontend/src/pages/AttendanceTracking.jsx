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
            const res = await axios.get(
                `http://localhost:5000/api/events/${eventId}`,
                { headers: { 'x-auth-token': authTokens.token } }
            );
            setEvent(res.data);
        } catch (err) {
            console.error('Error fetching event:', err);
        }
    };

    const fetchAttendanceData = async () => {
        try {
            const res = await axios.get(
                `http://localhost:5000/api/attendance/event/${eventId}`,
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
            const res = await axios.post(
                'http://localhost:5000/api/attendance/scan',
                { qrData, method },
                { headers: { 'x-auth-token': authTokens.token } }
            );
            
            setScanResult({
                success: true,
                message: res.data.msg,
                participant: res.data.participant,
                markedAt: res.data.markedAt
            });
            
            fetchAttendanceData();
            
            setTimeout(() => setScanResult(null), 5000);
        } catch (err) {
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
                `http://localhost:5000/api/attendance/manual/${registrationId}`,
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
                `http://localhost:5000/api/attendance/logs/${eventId}`,
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
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Attendance Tracking</h1>
                        <p className="text-gray-600 mt-1">{event?.name}</p>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        Back to Event
                    </button>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-100 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Total Registrations</p>
                            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                        </div>
                        <div className="bg-green-100 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Scanned</p>
                            <p className="text-3xl font-bold text-green-600">{stats.scanned}</p>
                        </div>
                        <div className="bg-yellow-100 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Not Scanned</p>
                            <p className="text-3xl font-bold text-yellow-600">{stats.notScanned}</p>
                        </div>
                        <div className="bg-purple-100 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Scan Rate</p>
                            <p className="text-3xl font-bold text-purple-600">{stats.scanRate}%</p>
                        </div>
                    </div>
                )}

                {/* Scan Result Alert */}
                {scanResult && (
                    <div className={`mb-6 p-4 rounded-lg ${scanResult.success ? 'bg-green-100 border border-green-400' : 'bg-red-100 border border-red-400'}`}>
                        <p className={`font-bold ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
                            {scanResult.message}
                        </p>
                        {scanResult.participant && (
                            <p className="text-sm mt-2 text-gray-700">
                                {scanResult.participant.name} - {scanResult.participant.ticketId}
                            </p>
                        )}
                    </div>
                )}

                {/* Scanner Controls */}
                <div className="bg-white border rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">QR Code Scanner</h2>
                    <div className="flex flex-wrap gap-3">
                        {!scanning ? (
                            <button
                                onClick={startCamera}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                            >
                                Start Camera Scan
                            </button>
                        ) : (
                            <button
                                onClick={stopCamera}
                                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                            >
                                Stop Camera
                            </button>
                        )}
                        <label className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold cursor-pointer">
                            Upload QR Image
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                        <button
                            onClick={fetchAuditLogs}
                            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                        >
                            View Audit Logs
                        </button>
                    </div>

                    {/* Camera Preview */}
                    {scanning && (
                        <div className="mt-4">
                            <video
                                ref={videoRef}
                                className="w-full max-w-md border rounded"
                                playsInline
                            />
                            <canvas ref={canvasRef} className="hidden" />
                            <p className="text-sm text-gray-600 mt-2">Position QR code in camera view</p>
                        </div>
                    )}
                </div>

                {/* Filters and Search */}
                <div className="bg-white border rounded-lg p-6 mb-6">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                            >
                                All ({registrations.length})
                            </button>
                            <button
                                onClick={() => setFilter('scanned')}
                                className={`px-4 py-2 rounded ${filter === 'scanned' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
                            >
                                Scanned ({registrations.filter(r => r.attendance.marked).length})
                            </button>
                            <button
                                onClick={() => setFilter('not-scanned')}
                                className={`px-4 py-2 rounded ${filter === 'not-scanned' ? 'bg-yellow-600 text-white' : 'bg-gray-200'}`}
                            >
                                Not Scanned ({registrations.filter(r => !r.attendance.marked).length})
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Search by name, email, or ticket..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-4 py-2 border rounded w-64"
                            />
                            <button
                                onClick={exportToCSV}
                                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                {/* Attendance List */}
                <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Ticket ID</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Participant</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Contact</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Marked At</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRegistrations.map((reg) => (
                                    <tr key={reg._id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-mono">{reg.ticketId}</td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-semibold">{reg.participant.name}</p>
                                                <p className="text-xs text-gray-600">{reg.participant.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{reg.participant.contact || 'N/A'}</td>
                                        <td className="px-4 py-3">
                                            {reg.attendance.marked ? (
                                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                                                    Present
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
                                                    Absent
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {reg.attendance.marked 
                                                ? new Date(reg.attendance.timestamp).toLocaleString()
                                                : '-'
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setShowManualModal(reg)}
                                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                            >
                                                Manual Override
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredRegistrations.length === 0 && (
                            <div className="text-center py-8 text-gray-600">
                                No participants found
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Manual Override Modal */}
            {showManualModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Manual Override</h3>
                        <p className="mb-2"><strong>Participant:</strong> {showManualModal.participant.name}</p>
                        <p className="mb-4"><strong>Current Status:</strong> {showManualModal.attendance.marked ? 'Present' : 'Absent'}</p>
                        
                        <label className="block mb-2 font-semibold">Reason for Override:</label>
                        <textarea
                            value={manualReason}
                            onChange={(e) => setManualReason(e.target.value)}
                            className="w-full border rounded p-3 mb-4 h-24"
                            placeholder="e.g., QR code damaged, lost phone, technical issues..."
                        />
                        
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowManualModal(null);
                                    setManualReason('');
                                }}
                                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            {!showManualModal.attendance.marked && (
                                <button
                                    onClick={() => handleManualOverride(showManualModal._id, 'mark')}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    Mark Present
                                </button>
                            )}
                            {showManualModal.attendance.marked && (
                                <button
                                    onClick={() => handleManualOverride(showManualModal._id, 'unmark')}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Audit Logs</h3>
                            <button
                                onClick={() => setShowLogsModal(false)}
                                className="text-gray-600 hover:text-gray-800 text-2xl"
                            >
                                ×
                            </button>
                        </div>
                        <div className="space-y-3">
                            {auditLogs.map((log) => (
                                <div key={log._id} className="border rounded p-3 bg-gray-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold">
                                                {log.participantId?.firstName} {log.participantId?.lastName}
                                            </p>
                                            <p className="text-sm text-gray-600">{log.participantId?.email}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                            log.action === 'marked' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {log.action}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-700">
                                        <p><strong>Method:</strong> {log.method}</p>
                                        <p><strong>By:</strong> {log.performedBy?.organizerName}</p>
                                        <p><strong>Time:</strong> {new Date(log.timestamp).toLocaleString()}</p>
                                        {log.reason && <p><strong>Reason:</strong> {log.reason}</p>}
                                    </div>
                                </div>
                            ))}
                            {auditLogs.length === 0 && (
                                <p className="text-center text-gray-600 py-4">No audit logs yet</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceTracking;
