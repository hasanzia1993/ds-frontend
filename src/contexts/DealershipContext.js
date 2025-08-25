import React, { createContext, useState, useEffect } from "react";

const DealershipContext = createContext();

export const DealershipProvider = ({ children }) => {
  // Keep the name for backward compatibility
  const [selectedDealership, setSelectedDealership] = useState(() => {
    const stored = localStorage.getItem("currentDealership");
    const fallback = localStorage.getItem("userDealership");
    
    if (stored) {
      return stored;
    } else if (fallback) {
      localStorage.setItem("currentDealership", fallback);
      return fallback;
    }
    return null;
  });

  // Store the full dealership object
  const [selectedDealershipData, setSelectedDealershipData] = useState(() => {
    const stored = localStorage.getItem("currentDealershipData");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (err) {
        console.error("Error parsing stored dealership data:", err);
        localStorage.removeItem("currentDealershipData");
      }
    }
    return null;
  });

  // Listen for changes in localStorage (like from login)
  useEffect(() => {
    const handleStorageChange = () => {
      const newDealership = localStorage.getItem("currentDealership");
      const newDealershipData = localStorage.getItem("currentDealershipData");
      
      if (newDealership && newDealership !== selectedDealership) {
        console.log('DealershipContext: Updating from localStorage:', newDealership);
        setSelectedDealership(newDealership);
      }

      if (newDealershipData && newDealershipData !== JSON.stringify(selectedDealershipData)) {
        try {
          const parsedData = JSON.parse(newDealershipData);
          setSelectedDealershipData(parsedData);
        } catch (err) {
          console.error("Error parsing dealership data from storage:", err);
        }
      }
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', handleStorageChange);
    
    // For same-tab changes, we'll use a polling mechanism as backup
    const interval = setInterval(handleStorageChange, 500);
    
    // Also check for changes on mount
    handleStorageChange();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [selectedDealership, selectedDealershipData]);

  const updateDealership = (value, dealershipData = null) => {
    setSelectedDealership(value);
    localStorage.setItem("currentDealership", value);
    
    if (dealershipData) {
      setSelectedDealershipData(dealershipData);
      localStorage.setItem("currentDealershipData", JSON.stringify(dealershipData));
    }
  };

  // Method to update only the dealership data (for settings updates)
  const updateDealershipData = (dealershipData) => {
    setSelectedDealershipData(dealershipData);
    localStorage.setItem("currentDealershipData", JSON.stringify(dealershipData));
  };

  const resetDealership = () => {
    setSelectedDealership(null);
    setSelectedDealershipData(null);
    localStorage.removeItem("currentDealership");
    localStorage.removeItem("currentDealershipData");
  };

  // Method to force refresh from localStorage (useful after login)
  const refreshFromStorage = () => {
    console.log('DealershipContext: refreshFromStorage called');
    const stored = localStorage.getItem("currentDealership");
    const fallback = localStorage.getItem("userDealership");
    
    let newValue = null;
    if (stored) {
      newValue = stored;
    } else if (fallback) {
      localStorage.setItem("currentDealership", fallback);
      newValue = fallback;
    }
    
    console.log('DealershipContext: Current:', selectedDealership, 'New:', newValue);
    if (newValue !== selectedDealership) {
      console.log('DealershipContext: Updating dealership to:', newValue);
      setSelectedDealership(newValue);
    }
  };

  return (
    <DealershipContext.Provider
      value={{ 
        selectedDealership, 
        selectedDealershipData,
        updateDealership, 
        updateDealershipData,
        resetDealership, 
        refreshFromStorage 
      }}
    >
      {children}
    </DealershipContext.Provider>
  );
};

export default DealershipContext;
