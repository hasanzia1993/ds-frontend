import React, { useEffect, useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import JwtContext from "../JwtContext";
import DealershipContext from "../contexts/DealershipContext";
import ThemeContext from "../ThemeContext";
import { AuthContext } from "../App";
import { BACKEND_URL } from "../constants";
import axios from "../axiosInstance";
import { cn } from "../lib/utils";
import { 
  Sun, 
  Moon, 
  LogOut, 
  User,
  Menu,
  X,
  Building2,
  Car,
  ChevronDown,
  Palette,
  Settings,
  Plus
} from "lucide-react";
const version = "1.0.3";
function NavBar() {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const { jwtToken } = useContext(JwtContext);
  const { userName, userDealership, userRole, handleLogout } = useContext(AuthContext);
  const dealershipContext = useContext(DealershipContext);
  const selectedDealership = dealershipContext?.selectedDealership;
  const updateDealership = dealershipContext?.updateDealership;

  const isAuthenticated = Boolean(jwtToken);
  const [dealerships, setDealerships] = useState([]);
  const [dealershipsLoading, setDealershipsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDealershipDropdown, setShowDealershipDropdown] = useState(false);

  // Add Dealership state
  const [dealershipInfo, setDealershipInfo] = useState(null);
  const [showAddDealershipDialog, setShowAddDealershipDialog] = useState(false);
  const [newDealershipName, setNewDealershipName] = useState("");
  const [addingDealership, setAddingDealership] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const location = useLocation();
  const navigate = useNavigate();

  // Fetch dealership limits and permissions
  const fetchDealershipInfo = async () => {
    if (!jwtToken) return;
    
    try {
      const response = await axios.get('/client-dealerships/info', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      console.log('dealership info', response.data);
      setDealershipInfo(response.data);
    } catch (error) {
      console.error("Failed to fetch dealership info:", error);
      // Don't show error message as this might be expected for non-admin users
    }
  };

  // Create new dealership
  const handleAddDealership = async () => {
    if (!newDealershipName.trim()) return;

    setAddingDealership(true);
    try {
      const response = await axios.post('/client-dealerships', {
        name: newDealershipName.trim()
      });
      
      // Show success message
      setSuccessMessage(`Successfully added ${newDealershipName.trim()} dealership!`);
      setShowSuccessAlert(true);
      
      // Close dialog and reset form
      setShowAddDealershipDialog(false);
      setNewDealershipName("");
      
      // Refresh dealership list and info
      fetchDealerships();
      fetchDealershipInfo();
      
      // Auto-select the new dealership
      if (response.data?.dealership) {
        handleDealershipChange(response.data.dealership.name);
      }
      
      // Hide success alert after 3 seconds
      setTimeout(() => setShowSuccessAlert(false), 3000);
    } catch (error) {
      if (error.response?.status === 403) {
        alert("You don't have permission to create dealerships");
      } else if (error.response?.status === 400) {
        alert(error.response.data?.message || "Invalid dealership name");
      } else {
        alert("Failed to create dealership. Please try again.");
      }
    } finally {
      setAddingDealership(false);
    }
  };

  const fetchDealerships = async () => {
    if (!jwtToken) return;
    
    setDealershipsLoading(true);
    try {
      const response = await axios.get('/dealerships');
      setDealerships(response.data);
    } catch (err) {
      console.error("Failed to fetch dealerships:", err);
    } finally {
      setDealershipsLoading(false);
    }
  };

  const handleDealershipChange = (value) => {
    // Find the full dealership object
    const dealershipObj = dealerships.find(d => d.name === value);
    
    localStorage.setItem("currentDealership", value);
    updateDealership?.(value, dealershipObj);
    setShowDealershipDropdown(false);
    setDrawerOpen(false);
    
    // If on settings page, force a complete reload to fetch new dealership data
    if (location.pathname === "/settings") {
      window.location.reload();
    } else {
      // Only redirect to inventory if not on settings page
      navigate("/inventory");
    }
  };

  const handleVehiclesClick = () => {
    navigate("/inventory");
    setDrawerOpen(false);
  };

  const handleSettingsClick = () => {
    navigate("/settings");
    setDrawerOpen(false);
  };

  const handleLogoutClick = () => {
    handleLogout();
    setDrawerOpen(false);
  };

  useEffect(() => {
    if (!jwtToken) return;
    
    fetchDealerships();
    fetchDealershipInfo();
  }, [jwtToken]);

  // Handle escape key to close sidebar and dropdown
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setShowDealershipDropdown(false);
      }
    };

    if (drawerOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [drawerOpen]);

  // Handle swipe gestures for mobile
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let isDragging = false;

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = true;
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = startX - currentX;
      const diffY = startY - currentY;

      // Only handle horizontal swipes
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0 && drawerOpen) {
          // Swipe left to close drawer
          setDrawerOpen(false);
          setShowDealershipDropdown(false);
        }
        isDragging = false;
      }
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };

    if (drawerOpen) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });

      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [drawerOpen]);

  if (!isAuthenticated) return null;

  // Check if user can add dealerships
  const canAddDealerships = dealershipInfo?.userPermissions?.canAddDealerships;
  const currentCount = dealershipInfo?.client?.currentDealershipCount || 0;
  const maxDealerships = dealershipInfo?.client?.maxDealerships || 0;
  const remainingSlots = dealershipInfo?.client?.remainingSlots || 0;
  const hasReachedLimit = currentCount >= maxDealerships;

  return (
    <>
      <header className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        isDarkMode ? "border-border" : "border-border"
      )}>
        <div className="px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* Left side - Hamburger Menu and Dealership */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => {
                // If sidebar is closed, open it
                if (!drawerOpen) {
                  setDrawerOpen(true);
                  // Close dealership dropdown when opening sidebar from menu button
                  setShowDealershipDropdown(false);
                } else {
                  // If sidebar is already open, just close it
                  setDrawerOpen(false);
                  setShowDealershipDropdown(false);
                }
              }}
              className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            
            {/* Selected Dealership - Responsive text */}
            <button
              onClick={() => {
                // If sidebar is closed, open it and show dropdown
                if (!drawerOpen) {
                  setDrawerOpen(true);
                  setShowDealershipDropdown(true);
                } else {
                  // If sidebar is open, toggle the dropdown
                  setShowDealershipDropdown(!showDealershipDropdown);
                }
              }}
              className="flex items-center space-x-1 sm:space-x-2 hover:text-accent-foreground transition-colors min-w-0"
            >
              <span className="text-xs sm:text-sm font-medium truncate max-w-[160px] sm:max-w-[200px]">
                {selectedDealership || "Select Dealership"}
              </span>
              <ChevronDown className={cn(
                "h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 flex-shrink-0",
                showDealershipDropdown && drawerOpen && "rotate-180"
              )} />
            </button>
          </div>

          {/* Right side - User greeting - Responsive */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <User className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm font-medium hidden xs:inline">
                Hi, {userName}
              </span>
              <span className="text-xs sm:text-sm font-medium xs:hidden">
                {userName}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setDrawerOpen(false);
              setShowDealershipDropdown(false);
            }}
          />
          
          {/* Drawer Content */}
          <div className="absolute left-0 top-0 h-full w-full sm:w-80 bg-background border-r shadow-xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-4 border-b">
                <h2 className="text-lg font-semibold">Menu</h2>
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    setShowDealershipDropdown(false);
                  }}
                  className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Mobile close hint */}
              <div className="sm:hidden px-4 py-2 text-xs text-muted-foreground text-center border-b">
                Swipe left to close
              </div>

              {/* Content */}
              <div className="flex-1 p-4 space-y-4 sm:space-y-6">
                {/* Dealership Selector */}
                <div className="space-y-2 sm:space-y-3">
                  
                  <h3 className="text-sm font-medium text-muted-foreground">Selected Dealership</h3>
                  
                

                  <div className="relative">
                    <button
                      onClick={() => setShowDealershipDropdown(!showDealershipDropdown)}
                      className="w-full flex items-center justify-between px-3 py-3 sm:py-2 text-sm rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <span className="truncate">{selectedDealership || "Select Dealership"}</span>
                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                    </button>
                    
                    {showDealershipDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-popover border rounded-md shadow-lg z-50">
                        <div 
                          className="max-h-48 overflow-y-auto"
                          onWheel={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const container = e.currentTarget;
                            container.scrollTop += e.deltaY;
                          }}
                        >
                          {dealershipsLoading ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              Loading...
                            </div>
                          ) : (
                            dealerships.map((dealership) => (
                              <button
                                key={dealership.id}
                                onClick={() => handleDealershipChange(dealership.name)}
                                className={cn(
                                  "w-full text-left px-3 py-3 sm:py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                                  selectedDealership === dealership.name && "bg-accent text-accent-foreground"
                                )}
                              >
                                {dealership.name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation */}
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Navigation</h3>
                  <button
                    onClick={handleVehiclesClick}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-3 sm:py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                      (location.pathname === "/inventory" || location.pathname.startsWith("/inventory/")) && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Car className="h-4 w-4" />
                    <span>Vehicles</span>
                  </button>
                  
                  <button
                    onClick={handleSettingsClick}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-3 sm:py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                      location.pathname === "/settings" && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                </div>

                {/* Actions */}
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Actions</h3>
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center space-x-3 px-3 py-3 sm:py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
                  </button>
                </div>
              </div>

                            {/* Footer - Logout */}
              <div className="p-4 border-t">
                {/* Add Dealership Button */}
                {canAddDealerships && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowAddDealershipDialog(true)}
                      disabled={hasReachedLimit}
                      className={cn(
                        "w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors",
                        hasReachedLimit
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Dealership</span>
                    </button>
                    
                    {/* Dealership Limits Info */}
                    {dealershipInfo && (
                      <div className="text-xs text-muted-foreground text-center">
                        {currentCount} of {maxDealerships} dealerships used • {remainingSlots} slots remaining
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={handleLogoutClick}
                  className="w-full flex items-center justify-center space-x-2 mt-5 px-4 py-3 sm:py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
                
                {/* Version Number */}
                <div className="text-center ">
                  <span className="text-[10px] text-muted-foreground">v{version}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Dealership Dialog */}
      {showAddDealershipDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddDealershipDialog(false)}
          />
          
          {/* Dialog Content */}
          <div className="relative bg-background border rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add New Dealership</h3>
              <button
                onClick={() => setShowAddDealershipDialog(false)}
                className="p-1 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Dealership Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter dealership name"
                  value={newDealershipName}
                  onChange={(e) => setNewDealershipName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDealership()}
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  disabled={addingDealership}
                />
              </div>
              
              {dealershipInfo && (
                <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
                  <div>Current: {currentCount} of {maxDealerships} dealerships</div>
                  <div>Remaining slots: {remainingSlots}</div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowAddDealershipDialog(false)}
                disabled={addingDealership}
                className="px-4 py-2 text-sm rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDealership}
                disabled={!newDealershipName.trim() || addingDealership}
                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {addingDealership && (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                <span>{addingDealership ? "Adding..." : "Add Dealership"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {showSuccessAlert && (
        <div className="fixed top-4 right-4 z-[70] bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}

export default NavBar;
