import { API_URL } from "../config";
import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import Navbar from "../components/Navbar";

const FeedbackPage = () => {
    const { eventId } = useParams();
    const { authTokens, user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [event, setEvent] = useState(null);
    const [feedbacks, setFeedbacks] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ratingFilter, setRatingFilter] = useState('');

    // Participant feedback form
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [hoveredRating, setHoveredRating] = useState(0);

    const isOrganizer = user?.role === 'organizer';

    useEffect(() => {
        fetchEventDetails();
        if (isOrganizer) {
            fetchFeedbacks();
        } else {
            checkFeedbackSubmission();
        }
    }, [eventId, ratingFilter]);

    const fetchEventDetails = async () => {
        try {
            const endpoint = isOrganizer 
                ? `${API_URL}/api/events/detail/${eventId}`
                : `${API_URL}/api/events/${eventId}`;
            const res = await axios.get(endpoint, {
                headers: { "x-auth-token": authTokens.token }
            });
            setEvent(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching event:", err);
            setLoading(false);
        }
    };

    const fetchFeedbacks = async () => {
        try {
            const url = ratingFilter 
                ? `${API_URL}/api/feedback/event/${eventId}?rating=${ratingFilter}`
                : `${API_URL}/api/feedback/event/${eventId}`;
            const res = await axios.get(url, {
                headers: { "x-auth-token": authTokens.token }
            });
            setFeedbacks(res.data.feedbacks);
            setStatistics(res.data.statistics);
        } catch (err) {
            console.error("Error fetching feedbacks:", err);
        }
    };

    const checkFeedbackSubmission = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/feedback/check/${eventId}`, {
                headers: { "x-auth-token": authTokens.token }
            });
            setHasSubmitted(res.data.hasSubmitted);
        } catch (err) {
            console.error("Error checking feedback:", err);
        }
    };

    const handleSubmitFeedback = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            alert("Please select a rating");
            return;
        }
        try {
            await axios.post(
                `${API_URL}/api/feedback/${eventId}`,
                { rating, comment },
                { headers: { "x-auth-token": authTokens.token } }
            );
            alert("Thank you for your feedback!");
            setHasSubmitted(true);
            setRating(0);
            setComment('');
        } catch (err) {
            alert(err.response?.data?.msg || "Failed to submit feedback");
        }
    };

    const handleExportCSV = async () => {
        try {
            const res = await axios.get(
                `${API_URL}/api/feedback/export/${eventId}`,
                {
                    headers: { "x-auth-token": authTokens.token },
                    responseType: 'blob'
                }
            );
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `feedback_${event?.name || 'event'}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert("Failed to export feedback");
        }
    };

    const renderStars = (currentRating, interactive = false) => {
        return (
            <div style={{ display: 'flex', gap: '5px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <span
                        key={star}
                        onClick={() => interactive && setRating(star)}
                        onMouseEnter={() => interactive && setHoveredRating(star)}
                        onMouseLeave={() => interactive && setHoveredRating(0)}
                        style={{
                            fontSize: interactive ? '36px' : '24px',
                            color: star <= (interactive ? (hoveredRating || rating) : currentRating) ? '#ffc107' : '#ddd',
                            cursor: interactive ? 'pointer' : 'default',
                            transition: 'color 0.2s'
                        }}
                    >
                        ★
                    </span>
                ))}
            </div>
        );
    };

    if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;

    return (
        <div>
            <Navbar />
            <div style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto" }}>
                <button 
                    onClick={() => navigate(isOrganizer ? "/organizer-dashboard" : "/my-events")}
                    style={{
                        marginBottom: "20px",
                        padding: "8px 16px",
                        backgroundColor: "#6c757d",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                    }}
                >
                    ← Back
                </button>
                <h1 style={{ marginBottom: "10px" }}>{event?.name}</h1>
                <h2 style={{ marginBottom: "30px", color: "#666" }}>
                    {isOrganizer ? "Feedback Dashboard" : "Submit Feedback"}
                </h2>

                {/* Organizer View */}
                {isOrganizer && statistics && (
                    <>
                        {/* Statistics Cards */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '20px',
                            marginBottom: '30px'
                        }}>
                            <div style={{
                                backgroundColor: '#fff',
                                padding: '20px',
                                borderRadius: '8px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                textAlign: 'center'
                            }}>
                                <h3 style={{ margin: '0 0 10px', color: '#666', fontSize: '14px' }}>Total Feedbacks</h3>
                                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#007bff' }}>
                                    {statistics.totalFeedbacks}
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: '#fff',
                                padding: '20px',
                                borderRadius: '8px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                textAlign: 'center'
                            }}>
                                <h3 style={{ margin: '0 0 10px', color: '#666', fontSize: '14px' }}>Average Rating</h3>
                                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffc107' }}>
                                    {statistics.averageRating} ★
                                </div>
                            </div>
                        </div>

                        {/* Rating Distribution */}
                        <div style={{
                            backgroundColor: '#fff',
                            padding: '20px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            marginBottom: '30px'
                        }}>
                            <h3 style={{ marginBottom: '15px' }}>Rating Distribution</h3>
                            {[5, 4, 3, 2, 1].map(star => (
                                <div key={star} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '10px'
                                }}>
                                    <span style={{ width: '60px', fontWeight: 'bold' }}>{star} ★</span>
                                    <div style={{
                                        flex: 1,
                                        height: '25px',
                                        backgroundColor: '#f0f0f0',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                        marginRight: '10px'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${statistics.totalFeedbacks > 0 ? (statistics.ratingDistribution[star] / statistics.totalFeedbacks * 100) : 0}%`,
                                            backgroundColor: '#ffc107',
                                            transition: 'width 0.3s'
                                        }} />
                                    </div>
                                    <span style={{ width: '50px', textAlign: 'right' }}>
                                        {statistics.ratingDistribution[star]}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Filter and Export */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}>
                            <div>
                                <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Filter by Rating:</label>
                                <select 
                                    value={ratingFilter}
                                    onChange={(e) => setRatingFilter(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd'
                                    }}
                                >
                                    <option value="">All Ratings</option>
                                    <option value="5">5 Stars</option>
                                    <option value="4">4 Stars</option>
                                    <option value="3">3 Stars</option>
                                    <option value="2">2 Stars</option>
                                    <option value="1">1 Star</option>
                                </select>
                            </div>
                            <button
                                onClick={handleExportCSV}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Export to CSV
                            </button>
                        </div>

                        {/* Feedback List */}
                        <div>
                            <h3 style={{ marginBottom: '15px' }}>
                                Feedback Comments ({feedbacks.length})
                            </h3>
                            {feedbacks.length === 0 ? (
                                <div style={{
                                    padding: '40px',
                                    textAlign: 'center',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '8px'
                                }}>
                                    <p style={{ color: '#666' }}>No feedback available</p>
                                </div>
                            ) : (
                                feedbacks.map((feedback, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            backgroundColor: '#fff',
                                            padding: '20px',
                                            borderRadius: '8px',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                            marginBottom: '15px'
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '10px'
                                        }}>
                                            {renderStars(feedback.rating)}
                                            <span style={{ color: '#666', fontSize: '14px' }}>
                                                {new Date(feedback.submittedAt).toLocaleString()}
                                            </span>
                                        </div>
                                        {feedback.comment && (
                                            <p style={{
                                                margin: '10px 0 0',
                                                color: '#333',
                                                lineHeight: '1.6'
                                            }}>
                                                {feedback.comment}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* Participant View */}
                {!isOrganizer && (
                    <div style={{
                        maxWidth: '600px',
                        margin: '0 auto',
                        backgroundColor: '#fff',
                        padding: '30px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        {hasSubmitted ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div style={{ fontSize: '64px', marginBottom: '20px' }}>✓</div>
                                <h3 style={{ color: '#28a745', marginBottom: '10px' }}>
                                    Thank you for your feedback!
                                </h3>
                                <p style={{ color: '#666' }}>
                                    Your anonymous feedback has been submitted successfully.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitFeedback}>
                                <h3 style={{ marginBottom: '20px' }}>How was your experience?</h3>
                                
                                <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '15px',
                                        fontWeight: 'bold'
                                    }}>
                                        Rate this event:
                                    </label>
                                    {renderStars(rating, true)}
                                    <p style={{
                                        marginTop: '10px',
                                        color: '#666',
                                        fontSize: '14px'
                                    }}>
                                        {rating === 0 && "Click to rate"}
                                        {rating === 1 && "Poor"}
                                        {rating === 2 && "Fair"}
                                        {rating === 3 && "Good"}
                                        {rating === 4 && "Very Good"}
                                        {rating === 5 && "Excellent"}
                                    </p>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '10px',
                                        fontWeight: 'bold'
                                    }}>
                                        Comments (Optional):
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Share your thoughts about the event..."
                                        maxLength="1000"
                                        style={{
                                            width: '100%',
                                            minHeight: '120px',
                                            padding: '12px',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            fontSize: '14px',
                                            resize: 'vertical'
                                        }}
                                    />
                                    <small style={{ color: '#666', fontSize: '12px' }}>
                                        {comment.length}/1000 characters
                                    </small>
                                </div>

                                <div style={{
                                    padding: '15px',
                                    backgroundColor: '#fff3cd',
                                    borderRadius: '4px',
                                    marginBottom: '20px',
                                    border: '1px solid #ffc107'
                                }}>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#856404' }}>
                                        🔒 Your feedback is completely anonymous. Organizers will not know who submitted it.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={rating === 0}
                                    style={{
                                        width: '100%',
                                        padding: '15px',
                                        backgroundColor: rating === 0 ? '#ccc' : '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: rating === 0 ? 'not-allowed' : 'pointer',
                                        fontSize: '16px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Submit Feedback
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackPage;
