import { API_URL } from "../config";
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import axios from "axios";

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    
    const { loginUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        isIIITStudent: false,
        collegeName: "",
        contactNumber: ""
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        setFormData(prev => {
            const newData = { ...prev, [name]: type === "checkbox" ? checked : value };
            if (name === "isIIITStudent") {
                // auto-fill college name so IIIT students don't need to type it
                newData.collegeName = checked ? "IIIT Hyderabad" : "";
            }
            return newData;
        });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        await loginUser(formData.email, formData.password);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/api/auth/register`, formData);
            alert("Registration Successful! Please Login.");
            setIsLogin(true);
        } catch (error) {
            alert("Error: " + (error.response?.data?.msg || "Registration Failed"));
        }
    };

    const handlePasswordResetRequest = async () => {
        const email = prompt("Enter your organizer email address:");
        if (!email) return;

        const reason = prompt("Reason for password reset (optional):");
        
        try {
            await axios.post(`${API_URL}/api/auth/request-password-reset`, {
                email,
                reason
            });
            alert("Password reset request submitted successfully! Admin will review your request.");
        } catch (error) {
            alert("Error: " + (error.response?.data?.msg || "Request failed"));
        }
    };

    return (
        <div style={{ maxWidth: "400px", margin: "50px auto", padding: "30px", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            
            <div style={{ display: "flex", marginBottom: "20px", borderBottom: "1px solid #ccc" }}>
                <button 
                    onClick={() => setIsLogin(true)} 
                    style={{ flex: 1, padding: "10px", background: "none", border: "none", borderBottom: isLogin ? "2px solid #007bff" : "none", fontWeight: isLogin ? "bold" : "normal", cursor: "pointer" }}
                >
                    Login
                </button>
                <button 
                    onClick={() => setIsLogin(false)} 
                    style={{ flex: 1, padding: "10px", background: "none", border: "none", borderBottom: !isLogin ? "2px solid #007bff" : "none", fontWeight: !isLogin ? "bold" : "normal", cursor: "pointer" }}
                >
                    Register
                </button>
            </div>

            <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>

            {isLogin ? (
                <>
                    <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        <input type="email" name="email" placeholder="Email" onChange={handleChange} required style={{ padding: "10px" }} />
                        <input type="password" name="password" placeholder="Password" onChange={handleChange} required style={{ padding: "10px" }} />
                        <button type="submit" style={{ padding: "10px", backgroundColor: "#007bff", color: "white", border: "none", cursor: "pointer" }}>Login</button>
                    </form>
                    
                    <div style={{ marginTop: "15px", textAlign: "center" }}>
                        <button 
                            onClick={handlePasswordResetRequest}
                            style={{ 
                                background: "none", 
                                border: "none", 
                                color: "#007bff", 
                                textDecoration: "underline", 
                                cursor: "pointer",
                                fontSize: "14px"
                            }}
                        >
                            Forgot Password? (Organizers Only)
                        </button>
                    </div>
                </>
            ) : (
                <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    
                    <div style={{ display: "flex", gap: "10px" }}>
                        <input type="text" name="firstName" placeholder="First Name" onChange={handleChange} required style={{ flex: 1, padding: "8px" }} />
                        <input type="text" name="lastName" placeholder="Last Name" onChange={handleChange} style={{ flex: 1, padding: "8px" }} />
                    </div>

                    <input type="text" name="contactNumber" placeholder="Contact Number" onChange={handleChange} required style={{ padding: "8px" }} />

                    <label style={{ fontSize: "14px" }}>
                        <input type="checkbox" name="isIIITStudent" onChange={handleChange} /> I am from IIIT
                    </label>

                    {/* Only show College Name input if NOT IIIT Student */}
                    {!formData.isIIITStudent && (
                        <input type="text" name="collegeName" placeholder="College / Organization Name" onChange={handleChange} required style={{ padding: "8px" }} />
                    )}

                    <input type="email" name="email" placeholder="Email" onChange={handleChange} required style={{ padding: "8px" }} />
                    
                    <input type="password" name="password" placeholder="Password" onChange={handleChange} required style={{ padding: "8px" }} />
                    
                    <button type="submit" style={{ padding: "10px", backgroundColor: "#28a745", color: "white", border: "none", cursor: "pointer", marginTop: "10px" }}>Register</button>
                </form>
            )}
        </div>
    );
};

export default AuthPage;