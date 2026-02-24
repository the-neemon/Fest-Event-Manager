import { API_URL } from "../config";
import { useState, useContext } from "react";
import AuthContext from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

const CreateEvent = () => {
    const { authTokens } = useContext(AuthContext);
    const navigate = useNavigate();

    const [eventType, setEventType] = useState("Normal");

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        eligibility: "All",
        registrationDeadline: "",
        startDate: "",
        endDate: "",
        registrationLimit: 100,
        registrationFee: 0,
        location: "",
        tags: "",
        stock: 50,
        purchaseLimit: 1
    });

    const [merchDetails, setMerchDetails] = useState({
        sizes: { S: false, M: false, L: false, XL: false },
        colors: ""
    });

    // each question: { label, fieldType, required, options }
    const [customQuestions, setCustomQuestions] = useState([]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const addQuestion = () => {
        setCustomQuestions([...customQuestions, { label: "", fieldType: "text", required: false, options: "" }]);
    };

    const updateQuestion = (index, field, value) => {
        const newQuestions = [...customQuestions];
        newQuestions[index][field] = value;
        setCustomQuestions(newQuestions);
    };

    const removeQuestion = (index) => {
        setCustomQuestions(customQuestions.filter((_, i) => i !== index));
    };

    const handleSizeChange = (e) => {
        setMerchDetails({
            ...merchDetails,
            sizes: { ...merchDetails.sizes, [e.target.name]: e.target.checked }
        });
    };

    // default status is Draft; Publish button passes 'Published' explicitly
    const handleSubmit = async (e, status = 'Draft') => {
        e.preventDefault();
        try {
            const tagArray = formData.tags.split(",").map(t => t.trim()).filter(t => t);

            // options field only makes sense for checkbox type; clear it for others
            const processedQuestions = customQuestions.map(q => ({
                ...q,
                options: q.fieldType === 'checkbox' ? q.options : ''
            }));

            const selectedSizes = Object.keys(merchDetails.sizes).filter(key => merchDetails.sizes[key]);
            const colorArray = merchDetails.colors.split(",").map(c => c.trim()).filter(c => c);

            const payload = {
                ...formData,
                eventType,
                tags: tagArray,
                status,
                // Only attach if Normal
                formFields: eventType === 'Normal' ? processedQuestions : [],
                // Only attach if Merch
                itemDetails: eventType === 'Merchandise' ? { sizes: selectedSizes, colors: colorArray } : {},
            };

            await axios.post(`${API_URL}/api/events/create`, payload, {
                headers: { "x-auth-token": authTokens.token }
            });

            alert(`Event ${status === 'Published' ? 'Published' : 'Saved as Draft'} Successfully!`);
            navigate("/organizer-dashboard");
        } catch (error) {
            alert("Error creating event");
            console.error(error);
        }
    };

    const inputStyle = {
        width: "100%", padding: "10px 12px", border: "1px solid #ddd",
        borderRadius: "6px", fontSize: "14px", boxSizing: "border-box",
        outline: "none", transition: "border-color 0.2s"
    };
    const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "13px", color: "#444" };
    const cardStyle = { backgroundColor: "#fff", border: "1px solid #e0e0e0", borderRadius: "10px", padding: "24px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
    const sectionTitle = { fontSize: "15px", fontWeight: "700", color: "#333", marginBottom: "18px", paddingBottom: "10px", borderBottom: "2px solid #f0f0f0" };

    return (
        <div style={{ backgroundColor: "#f7f8fc", minHeight: "100vh" }}>
            <Navbar />
            <div style={{ maxWidth: "720px", margin: "0 auto", padding: "30px 20px 60px" }}>

                {/* Header */}
                <div style={{ marginBottom: "28px" }}>
                    <h1 style={{ fontSize: "26px", fontWeight: "800", margin: 0, color: "#1a1a2e" }}>Create New Event</h1>
                    <p style={{ color: "#777", marginTop: "6px", fontSize: "14px" }}>Fill in the details below. You can save as draft or publish immediately.</p>
                </div>

                {/* Event Type Selector */}
                <div style={cardStyle}>
                    <p style={sectionTitle}>Event Type</p>
                    <div style={{ display: "flex", gap: "12px" }}>
                        {["Normal", "Merchandise"].map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setEventType(type)}
                                style={{
                                    flex: 1, padding: "12px", borderRadius: "8px", fontSize: "14px",
                                    fontWeight: "600", cursor: "pointer", transition: "all 0.2s",
                                    border: eventType === type ? "2px solid #007bff" : "2px solid #e0e0e0",
                                    backgroundColor: eventType === type ? "#e8f0fe" : "#fafafa",
                                    color: eventType === type ? "#007bff" : "#555"
                                }}
                            >
                                {type === "Normal" ? "Normal Event" : "Merchandise Sale"}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Basic Info */}
                    <div style={cardStyle}>
                        <p style={sectionTitle}>Basic Information</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={labelStyle}>Event Name *</label>
                                <input name="name" placeholder="e.g. Hackathon 2026" onChange={handleChange} required style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Description *</label>
                                <textarea name="description" placeholder="Describe your event..." onChange={handleChange} required
                                    style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Tags <span style={{ fontWeight: 400, color: "#888" }}>(comma separated)</span></label>
                                <input name="tags" placeholder="e.g. Coding, AI, Fun" onChange={handleChange} style={inputStyle} />
                            </div>
                        </div>
                    </div>

                    {/* Schedule */}
                    <div style={cardStyle}>
                        <p style={sectionTitle}>Schedule</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div>
                                    <label style={labelStyle}>Registration Deadline *</label>
                                    <input type="datetime-local" name="registrationDeadline" onChange={handleChange} required style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Start Date *</label>
                                    <input type="datetime-local" name="startDate" onChange={handleChange} required style={inputStyle} />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div>
                                    <label style={labelStyle}>End Date *</label>
                                    <input type="datetime-local" name="endDate" onChange={handleChange} required style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Location / Venue *</label>
                                    <input name="location" placeholder="e.g. Lecture Hall 1, T-Hub" onChange={handleChange} required style={inputStyle} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Registration Settings */}
                    <div style={cardStyle}>
                        <p style={sectionTitle}>Registration Settings</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            <div>
                                <label style={labelStyle}>Registration Limit *</label>
                                <input type="number" name="registrationLimit" placeholder="e.g. 100" onChange={handleChange} required style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Eligibility</label>
                                <select name="eligibility" onChange={handleChange} style={{ ...inputStyle, backgroundColor: "#fff" }}>
                                    <option value="All">Open to All</option>
                                    <option value="IIIT Students Only">IIIT Students Only</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Normal Event Details */}
                    {eventType === "Normal" && (
                        <div style={cardStyle}>
                            <p style={sectionTitle}>Event Details</p>
                            <div style={{ marginBottom: "20px" }}>
                                <label style={labelStyle}>Registration Fee <span style={{ fontWeight: 400, color: "#888" }}>(₹0 for free)</span></label>
                                <input type="number" name="registrationFee" placeholder="0" onChange={handleChange} style={{ ...inputStyle, maxWidth: "200px" }} />
                            </div>

                            <p style={{ ...sectionTitle, marginBottom: "12px" }}>Custom Registration Questions</p>
                            {customQuestions.map((q, index) => (
                                <div key={index} style={{ border: "1px solid #e8e8e8", padding: "14px", marginBottom: "12px", borderRadius: "8px", backgroundColor: "#fafafa" }}>
                                    <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                                        <input
                                            placeholder="Question label"
                                            value={q.label}
                                            onChange={(e) => updateQuestion(index, 'label', e.target.value)}
                                            required
                                            style={{ ...inputStyle, flex: 2 }}
                                        />
                                        <select
                                            value={q.fieldType}
                                            onChange={(e) => updateQuestion(index, 'fieldType', e.target.value)}
                                            style={{ ...inputStyle, flex: 1, backgroundColor: "#fff" }}
                                        >
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="checkbox">Checkbox</option>
                                        </select>
                                        <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", whiteSpace: "nowrap", cursor: "pointer" }}>
                                            <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(index, 'required', e.target.checked)} />
                                            Required
                                        </label>
                                        <button type="button" onClick={() => removeQuestion(index)}
                                            style={{ padding: "6px 10px", backgroundColor: "#fff", border: "1px solid #dc3545", color: "#dc3545", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", flexShrink: 0 }}>
                                            Remove
                                        </button>
                                    </div>
                                    {q.fieldType === 'checkbox' && (
                                        <input
                                            placeholder="Options (comma separated, e.g. Option A, Option B)"
                                            value={q.options}
                                            onChange={(e) => updateQuestion(index, 'options', e.target.value)}
                                            style={{ ...inputStyle, fontSize: "13px" }}
                                        />
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={addQuestion}
                                style={{ padding: "9px 16px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                                + Add Question
                            </button>
                        </div>
                    )}

                    {/* Merchandise Details */}
                    {eventType === "Merchandise" && (
                        <div style={cardStyle}>
                            <p style={sectionTitle}>Merchandise Details</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                                    <div>
                                        <label style={labelStyle}>Price per item (₹) *</label>
                                        <input type="number" name="registrationFee" placeholder="e.g. 299" onChange={handleChange} required style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Stock Quantity</label>
                                        <input type="number" name="stock" placeholder="e.g. 50" onChange={handleChange} style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Max per user</label>
                                        <input type="number" name="purchaseLimit" placeholder="e.g. 2" onChange={handleChange} style={inputStyle} />
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>Available Sizes</label>
                                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                        {["S", "M", "L", "XL"].map(size => (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => setMerchDetails(prev => ({ ...prev, sizes: { ...prev.sizes, [size]: !prev.sizes[size] } }))}
                                                style={{
                                                    padding: "8px 18px", borderRadius: "6px", fontWeight: "600",
                                                    cursor: "pointer", fontSize: "13px", transition: "all 0.15s",
                                                    border: merchDetails.sizes[size] ? "2px solid #007bff" : "2px solid #ddd",
                                                    backgroundColor: merchDetails.sizes[size] ? "#e8f0fe" : "#fafafa",
                                                    color: merchDetails.sizes[size] ? "#007bff" : "#555"
                                                }}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>Available Colors <span style={{ fontWeight: 400, color: "#888" }}>(comma separated)</span></label>
                                    <input name="colors" placeholder="e.g. Black, White, Red"
                                        value={merchDetails.colors}
                                        onChange={(e) => setMerchDetails({ ...merchDetails, colors: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons — type="button" prevents implicit form submit; status passed explicitly */}
                    <div style={{ display: "flex", gap: "12px" }}>
                        <button
                            type="button"
                            onClick={(e) => handleSubmit(e, 'Draft')}
                            style={{ flex: 1, backgroundColor: "#fff", color: "#555", padding: "14px", fontSize: "15px", border: "2px solid #ddd", cursor: "pointer", borderRadius: "8px", fontWeight: "600" }}
                        >
                            Save as Draft
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleSubmit(e, 'Published')}
                            style={{ flex: 2, backgroundColor: "#007bff", color: "white", padding: "14px", fontSize: "15px", border: "none", cursor: "pointer", borderRadius: "8px", fontWeight: "700", boxShadow: "0 2px 8px rgba(0,123,255,0.3)" }}
                        >
                            Publish Event
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateEvent;