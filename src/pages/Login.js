import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import JwtContext from "../JwtContext";
import ThemeContext from "../ThemeContext";
import DealershipContext from "../contexts/DealershipContext";
import { BACKEND_URL } from "../constants";
import { 
  LogIn, 
  Eye, 
  EyeOff,
  AlertCircle,
  Mail,
  Lock
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { cn } from "../lib/utils";

function Login() {
  const navigate = useNavigate();
  const { setJwtToken } = useContext(JwtContext);
  const { isDarkMode } = useContext(ThemeContext);
  const { refreshFromStorage } = useContext(DealershipContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoggingIn(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      
      // Login to backend
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const newJwt = data.token;
        const nameFromFirebase = user.displayName || data.payload?.name || "";
        const userDlr = data.payload?.dealership || "";
        const role = data.payload?.role || "user";
        console.log('login data', data.payload);
        setJwtToken(newJwt);
        localStorage.setItem("jwtToken", newJwt);
        localStorage.setItem("userName", nameFromFirebase);
        localStorage.setItem("userDealership", userDlr);
        localStorage.setItem("userRole", role);

        let currentDlr = userDlr === "Demo" ? "Demo" : userDlr;
        localStorage.setItem("currentDealership", currentDlr);

        // Refresh dealership context to pick up the new value
        refreshFromStorage();

        // Redirect to home page
        navigate("/");
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "Invalid credentials. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 dark:bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Logo Section */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Dealersnap Logo" 
              className="w-64 object-contain"
            />
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="Enter your email address"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loggingIn}
                className="w-full"
                size="lg"
              >
                {loggingIn ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <a 
              href="https://dealersnap.ca/#contact" 
              className="text-primary hover:text-primary/80 underline underline-offset-4"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
