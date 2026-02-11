import { useState, useContext } from "react";
import AuthContext from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

const CreateEvent = () => {
    const { authTokens } = useContext(AuthContext);
    const navigate = useNavigate();

    const [eventType, setEventType] = useState("Normal");

    // Basic Data
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
        tags: "", // Comma separated string
        stock: 50,
        purchaseLimit: 1
    });

    // Merchandise Specific State
    const [merchDetails, setMerchDetails] = useState({
        sizes: { S: false, M: false, L: false, XL: false },
        colors: "" // Comma separated
    });

    // Dynamic Form Builder State
    const [customQuestions, setCustomQuestions] = useState([]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // --- Dynamic Form Logic ---
    const addQuestion = () => {
        setCustomQuestions([...customQuestions, { label: "", fieldType: "text", required: false }]);
    };

    const updateQuestion = (index, field, value) => {
        const newQuestions = [...customQuestions];
        newQuestions[index][field] = value;
        setCustomQuestions(newQuestions);
    };

    const removeQuestion = (index) => {
        setCustomQuestions(customQuestions.filter((_, i) => i !== index));
    };

    // --- Merch Logic ---
    const handleSizeChange = (e) => {
        setMerchDetails({
            ...merchDetails,
            sizes: { ...merchDetails.sizes, [e.target.name]: e.target.checked }
        });
    };

    const handleSubmit = async (e, status = 'Draft') => {
        e.preventDefault();
        try {
            // Process Tags
            const tagArray = formData.tags.split(",").map(t => t.trim()).filter(t => t);

            // Process Merch Sizes
            const selectedSizes = Object.keys(merchDetails.sizes).filter(key => merchDetails.sizes[key]);
            const colorArray = merchDetails.colors.split(",").map(c => c.trim()).filter(c => c);

            const payload = {
                ...formData,
                eventType,
                tags: tagArray,
                status,  // Add status field
                // Only attach if Normal
                formFields: eventType === 'Normal' ? customQuestions : [],
                // Only attach if Merch
                itemDetails: eventType === 'Merchandise' ? { sizes: selectedSizes, colors: colorArray } : {},
            };

            await axios.post("http://localhost:5000/api/events/create", payload, {
                headers: { "x-auth-token": authTokens.token }
            });

            alert(`Event ${status === 'Published' ? 'Published' : 'Saved as Draft'} Successfully!`);
            navigate("/organizer-dashboard");
        } catch (error) {
            alert("Error creating event");
            console.error(error);
        }
    };

    return (
        <div>
            <Navbar />
            <div style={{ maxWidth: "600px", margin: "30px auto", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
            <h2>Create New Event</h2>
            
            <label><strong>Event Type:</strong></label>
            <select 
                value={eventType} 
                onChange={(e) => setEventType(e.target.value)}
                style={{ marginBottom: "15px", display: "block", width: "100%", padding: "8px" }}
            >
                <option value="Normal">Normal</option>
                <option value="Merchandise">Merchandise</option>
            </select>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input name="name" placeholder="Event Name" onChange={handleChange} required style={{padding: "8px"}} />
                <textarea name="description" placeholder="Description" onChange={handleChange} required style={{padding: "8px"}} />
                
                <input name="tags" placeholder="Tags (e.g. Coding, AI, Fun) - Comma Separated" onChange={handleChange} style={{padding: "8px"}} />

                <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{flex: 1}}>
                        <label>Registeration Deadline:</label>
                        <input type="datetime-local" name="registrationDeadline" onChange={handleChange} required style={{width: "100%"}} />
                    </div>
                    <div style={{flex: 1}}>
                        <label>Start Date:</label>
                        <input type="datetime-local" name="startDate" onChange={handleChange} required style={{width: "100%"}} />
                    </div>
                </div>
                <div style={{flex: 1}}>
                    <label>End Date:</label>
                    <input type="datetime-local" name="endDate" onChange={handleChange} required style={{width: "100%"}} />
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                    <input type="number" name="registrationLimit" placeholder="Registration Limit" onChange={handleChange} required style={{padding: "8px", flex: 1}} />
                    <select name="eligibility" onChange={handleChange} style={{padding: "8px", flex: 1}}>
                        <option value="All">Open to All</option>
                        <option value="IIIT Students Only">IIIT Students Only</option>
                    </select>
                </div>

                <div>
                    <label>Location/Venue:</label>
                    <input name="location" placeholder="e.g. Lecture Hall 1, T-Hub, Sports Complex" onChange={handleChange} required style={{width: "100%", padding: "8px"}} />
                </div>

                <hr />

                {/* --- pe === "Normal" && (
                    <div>
                        <h4>Workshop Details</h4>
                        <input type="number" name="registrationFee" placeholder="Registration Fee" onChange={handleChange} style={{marginBottom: "10px", width: "100%", padding: "8px"}} />
                        <input name="location" placeholder="Location" onChange={handleChange} style={{width: "100%", padding: "8px"}} />
                        
                        <h5>Custom Registration Questions</h5>
                        {customQuestions.map((q, index) => (
                            <div key={index} style={{ display: "flex", gap: "5px", marginBottom: "5px" }}>
                                <input placeholder="Question (e.g. Diet Preference)" value={q.label} onChange={(e) => updateQuestion(index, 'label', e.target.value)} required style={{flex: 2}} />
                                <select value={q.fieldType} onChange={(e) => updateQuestion(index, 'fieldType', e.target.value)}>
                                    <option value="text">Text</option>
                                    <option value="number">Number</option>
                                </select>
                                <button type="button" onClick={() => removeQuestion(index)} style={{color: "red"}}>X</button>
                            </div>
                        ))}
                        <button type="button" onClick={addQuestion} style={{marginTop: "5px", fontSize: "12px"}}>+ Add Question</button>
                    </div>
                )}

                {/* --- DYNAMIC SECTION FOR MERCHANDISE --- */}
                {eventType === "Merchandise" && (
                    <div>
                        <h4>Merchandise Details</h4>
                        <input type="number" name="registrationFee" placeholder="Price" onChange={handleChange} style={{width: "100%", marginBottom: "10px", padding: "8px"}} />
                        
                        <div style={{display: "flex", gap: "10px"}}>
                            <input type="number" name="stock" placeholder="Stock quantity" onChange={handleChange} style={{flex: 1, padding: "8px"}} />
                            <input type="number" name="purchaseLimit" placeholder="Max per user" onChange={handleChange} style={{flex: 1, padding: "8px"}} />
                        </div>

                        <div style={{marginTop: "10px"}}>
                            <label>Available Sizes:</label>
                            <div style={{display: "flex", gap: "10px", marginTop: "5px"}}>
                                {["S", "M", "L", "XL"].map(size => (
                                    <label key={size}><input type="checkbox" name={size} checked={merchDetails.sizes[size]} onChange={handleSizeChange} /> {size}</label>
                                ))}
                            </div>
                        </div>

                        <input name="colors" placeholder="Colors (e.g. Black, Red) - Comma Sep" 
                            value={merchDetails.colors} 
                            onChange={(e) => setMerchDetails({...merchDetails, colors: e.target.value})} 
                            style={{marginTop: "10px", width: "100%", padding: "8px"}} 
                        />
                    </div>
                )}

                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                    <button 
                        type="button"
                        onClick={(e) => handleSubmit(e, 'Draft')}
                        style={{ flex: 1, backgroundColor: "#6c757d", color: "white", padding: "12px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "4px" }}
                    >
                        Save as Draft
                    </button>
                    <button 
                        type="button"
                        onClick={(e) => handleSubmit(e, 'Published')}
                        style={{ flex: 1, backgroundColor: "#28a745", color: "white", padding: "12px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "4px", fontWeight: "bold" }}
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