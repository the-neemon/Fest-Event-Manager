import { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode"; // We use this to read the token
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export default AuthContext;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        if (localStorage.getItem("authTokens")) {
            // Restore user info from token on refresh
            let token = JSON.parse(localStorage.getItem("authTokens")).token;
            return jwtDecode(token).user;
        }
        return null;
    });
    
    const [authTokens, setAuthTokens] = useState(() => {
        return localStorage.getItem("authTokens") 
            ? JSON.parse(localStorage.getItem("authTokens")) 
            : null;
    });

    const navigate = useNavigate();

    const loginUser = async (email, password) => {
        try {
            const response = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (response.status === 200) {
                setAuthTokens(data);
                const decodedUser = jwtDecode(data.token).user;
                setUser(decodedUser);
                localStorage.setItem("authTokens", JSON.stringify(data));
                
                // --- UPDATED REDIRECT LOGIC ---
                if (decodedUser.role === 'admin') {
                    navigate('/admin-dashboard');
                } else if (decodedUser.role === 'organizer') {
                    navigate('/organizer-dashboard');
                } else {
                    // For participants, check if they have already set interests
                    if (data.hasInterests) {
                        navigate('/my-events');
                    } else {
                        navigate('/onboarding');
                    }
                }
                return true;
            } else {
                alert("Login Failed: " + data.msg);
                return false;
            }
        } catch (error) {
            console.error("Login Error:", error);
            return false;
        }
    };

    const logoutUser = () => {
        setAuthTokens(null);
        setUser(null);
        localStorage.removeItem("authTokens");
        navigate('/login');
    };

    const contextData = {
        user,
        authTokens,
        loginUser,
        logoutUser
    };

    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    );
};