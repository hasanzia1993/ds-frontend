import React, { useState, useEffect, createContext } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
  Outlet,
} from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebase";

import NavBar from "./components/NavBar";
import ScrollToTop from "./components/ScrollToTop";
import PWAInstallBanner from "./components/PWAInstallBanner";
import VehicleList from "./pages/InventoryList";
import VehicleDetail from "./pages/IntentoryDetails";
import StatsUsage from "./pages/StatsUsage";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import JwtContext from "./JwtContext";
import ThemeContext from "./ThemeContext";
import { DealershipProvider, useDealership } from "./contexts/DealershipContext";
import { BACKEND_URL } from "./constants";

// Create AuthContext
export const AuthContext = createContext();

function App() {
  const [jwtToken, setJwtToken] = useState(localStorage.getItem("jwtToken"));
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem("darkMode");
    return stored ? stored === "true" : false;
  });

  // Authentication state
  const [userName, setUserName] = useState(
    () => localStorage.getItem("userName") || ""
  );
  const [userDealership, setUserDealership] = useState(
    () => localStorage.getItem("userDealership") || null
  );
  const [userRole, setUserRole] = useState(
    () => localStorage.getItem("userRole") || "user"
  );

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  useEffect(() => localStorage.setItem("darkMode", isDarkMode), [isDarkMode]);

  // Apply dark mode class to body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Firebase authentication listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idToken = await user.getIdToken();
        loginToBackend(user, idToken);
      } else {
        handleLogout();
      }
    });

    return () => unsubscribe();
  }, []);

  const loginToBackend = async (user, idToken) => {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken }),
      });
      
      const data = await response.json();
      const newJwt = data.token;
      const nameFromFirebase = user.displayName || data.payload?.name || "";
      const userDlr = data.payload?.dealership || "";
      const role = data.payload?.role || "user";

      setJwtToken(newJwt);
      localStorage.setItem("jwtToken", newJwt);
      setUserName(nameFromFirebase);
      localStorage.setItem("userName", nameFromFirebase);
      setUserDealership(userDlr);
      localStorage.setItem("userDealership", userDlr);
      setUserRole(role);
      localStorage.setItem("userRole", role);

      // Set default dealership to user's dealership only if no selection exists
      const existingDealership = localStorage.getItem("currentDealership");
      if (!existingDealership) {
        const defaultDealership = userDlr === "Demo" ? "Demo" : userDlr;
        localStorage.setItem("currentDealership", defaultDealership);
      }
    } catch (err) {
      console.error("Backend login error:", err);
      handleLogout();
    }
  };

  const handleLogout = () => {
    signOut(auth).then(() => {
      localStorage.clear();
      setJwtToken(null);
      setUserName("");
      setUserDealership(null);
      setUserRole("user");
    });
  };

  // Auth context value
  const authContextValue = {
    userName,
    userDealership,
    userRole,
    handleLogout,
  };

  // Create AppContent component inside App to have access to DealershipProvider
  function AppContent() {
    const location = useLocation();
    const showNavBar = location.pathname !== '/login';

    return (
      <div className="min-h-screen bg-background text-foreground dark:bg-background">
        <PWAInstallBanner />
        {showNavBar && <NavBar />}
        <Outlet />
      </div>
    );
  }

  return (
    <JwtContext.Provider value={{ jwtToken, setJwtToken }}>
      <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
        <AuthContext.Provider value={authContextValue}>
          <DealershipProvider>
            <Router>
              <ScrollToTop />
              <Routes>
                <Route 
                  path="/login" 
                  element={
                    jwtToken ? <Navigate to="/" replace /> : <Login />
                  } 
                />
                <Route 
                  path="/" 
                  element={
                    jwtToken ? <AppContent /> : <Navigate to="/login" replace />
                  } 
                >
                  <Route index element={<Navigate to="/inventory" replace />} />
                  <Route path="inventory" element={<VehicleList />} />
                  <Route path="inventory/:id" element={<VehicleDetail />} />
                  <Route path="stats" element={<StatsUsage />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </DealershipProvider>
        </AuthContext.Provider>
      </ThemeContext.Provider>
    </JwtContext.Provider>
  );
}

export default App;
