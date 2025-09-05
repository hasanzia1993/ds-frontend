import React, { useRef, useEffect } from "react";
import { Button, Typography } from "antd";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Upload, Check, Loader2, X, Info } from "lucide-react";

const { Text } = Typography;

const ShotTypeSelector = ({ 
  shotTypes, 
  currentShotType, 
  onShotTypeChange,
  shotStatuses = {}, // Object with shotType as key and status as value
  onInfoClick // Function to handle info icon click
}) => {
  const scrollContainerRef = useRef(null);

  // Scroll to selected shot when currentShotType changes
  useEffect(() => {
    if (scrollContainerRef.current && currentShotType) {
      const currentIndex = shotTypes.findIndex(shot => shot === currentShotType);
      if (currentIndex !== -1) {
        // Calculate the position to scroll to - position selected shot at top
        const itemHeight = 80; // Approximate height of each shot item
        const targetPosition = currentIndex * itemHeight;
        
        // Smooth scroll to the target position
        scrollContainerRef.current.scrollTo({
          top: Math.max(0, targetPosition),
          behavior: 'smooth'
        });
      }
    }
  }, [currentShotType, shotTypes]);

  const getShotImage = (shotType) => {
    // Map shot types to their example images
    const imageMapping = {
      "Front Quarter Shot": require("../assets/shot_images/front_quarter.jpg"),
      "Front Shot": require("../assets/shot_images/front.jpg"),
      "Side Shot": require("../assets/shot_images/side.jpg"),
      "Back Quarter Shot": require("../assets/shot_images/back_quarter.jpg"),
      "Back Shot": require("../assets/shot_images/back.jpg"),
      "Wheel Shot": require("../assets/shot_images/wheel.jpg"),
      "Tire Tread Shot": require("../assets/shot_images/tire_tread.jpg"),
      "Head Light Shot": require("../assets/shot_images/head_light.jpg"),
      "Emblem Shot": require("../assets/shot_images/emblem.jpg"),
      "Engine Shot": require("../assets/shot_images/engine.jpg"),
      "Tail light Shot": require("../assets/shot_images/tail_light.jpg"),
      "Trunk Shot": require("../assets/shot_images/trunk.jpg"),
      "Side Dash Shot": require("../assets/shot_images/side_dash.jpg"),
      "Steering Wheel Shot": require("../assets/shot_images/steering_wheel.jpg"),
      "Guages Shot": require("../assets/shot_images/gauges.jpg"),
      "Steering Buttons Shot": require("../assets/shot_images/steering_buttons.jpg"),
      "Back Seat Shot": require("../assets/shot_images/back_seat.jpg"),
      "Centre Dash Shot": require("../assets/shot_images/centre_dash.jpg"),
      "Door Shot": require("../assets/shot_images/door.jpg"),
      "Fabric Shot": require("../assets/shot_images/fabric.jpg"),
      "Panoramic Shot": require("../assets/shot_images/panoramic.jpg"),
      "Passenger Cabin Shot": require("../assets/shot_images/passenger_cabin.jpg"),
      "Passenger Seat Shot": require("../assets/shot_images/passenger_seat.jpg"),
      "Rear Mirror Shot": require("../assets/shot_images/rear_mirror.jpg"),
      "Shifter Shot": require("../assets/shot_images/shifter.jpg"),
    };
    
    return imageMapping[shotType] || null;
  };

  const getShortName = (shotType) => {
    // Convert long shot names to shorter versions for display
    const shortNames = {
      "Front Quarter Shot": "Front Quarter",
      "Front Shot": "Front",
      "Side Shot": "Side", 
      "Back Quarter Shot": "Back Quarter",
      "Back Shot": "Back",
      "Wheel Shot": "Wheel",
      "Tire Tread Shot": "Tire Tread",
      "Head Light Shot": "Head Light",
      "Emblem Shot": "Emblem",
      "Engine Shot": "Engine",
      "Tail light Shot": "Tail Light",
      "Trunk Shot": "Trunk",
      "Side Dash Shot": "Side Dash",
      "Steering Wheel Shot": "Steering Wheel",
      "Guages Shot": "Gauges",
      "Steering Buttons Shot": "Steering Buttons",
      "Back Seat Shot": "Back Seat",
      "Centre Dash Shot": "Centre Dash",
      "Door Shot": "Door",
      "Fabric Shot": "Fabric",
      "Panoramic Shot": "Panoramic",
      "Passenger Cabin Shot": "Passenger Cabin",
      "Passenger Seat Shot": "Passenger Seat",
      "Rear Mirror Shot": "Rear Mirror",
      "Shifter Shot": "Shifter",
    };
    
    return shortNames[shotType] || shotType;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'empty':
        return null; // No icon for empty status
      case 'uploading':
        return (
          <div style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#f59e0b", // amber-500
            // border: "2px solid #fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 8px rgba(245, 158, 11, 0.6)",
            animation: "pulse 1.5s ease-in-out infinite"
          }}>
            <Upload size={6} color="#fff" />
          </div>
        );
      case 'processing':
        return (
          <div style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#3b82f6", // blue-500
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "spin 1s linear infinite"
          }}>
            <Loader2 size={6} color="#fff" />
          </div>
        );
      case 'completed':
        return (
          <div style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#10b981", // emerald-500
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Check size={6} color="#fff" />
          </div>
        );
      case 'error':
        return (
          <div style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#ef4444", // red-500
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <X size={6} color="#fff" />
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'empty':
        return '#6b7280'; // gray-500
      case 'uploading':
        return '#f59e0b'; // amber-500
      case 'processing':
        return '#3b82f6'; // blue-500
      case 'completed':
        return '#10b981'; // emerald-500
      default:
        return '#6b7280';
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { 
              opacity: 1; 
              box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
            }
            50% { 
              opacity: 0.7; 
              box-shadow: 0 0 12px rgba(245, 158, 11, 0.8);
            }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100%",
          padding: "4px 0px 0px 0px",
          overflow: "hidden",
        }}
      >
              {/* Scrollable shot list */}
        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            width: "100%",
            padding: "0 4px",
            maxHeight:"80vh", // Limit height to prevent page scrolling
          }}
        >
        {shotTypes.map((shotType, index) => {
          const isSelected = shotType === currentShotType;
          const shotImage = getShotImage(shotType);
          const shortName = getShortName(shotType);
          const shotNumber = index + 1;
          const status = shotStatuses[shotType] || 'empty';

          return (
            <div
              key={shotType}
              style={{
                marginBottom: "6px",
                cursor: "pointer",
              }}
              onClick={() => onShotTypeChange(shotType, index)}
            >
              <Card
                style={{
                  backgroundColor: isSelected ? "transparent" : "#2a2a2a",
                  border: isSelected ? "2px solid #4a90e2" : "1px solid #444",
                  borderRadius: "8px",
                
                  transition: "all 0.2s ease",
                  minHeight: "auto",
                  boxShadow: isSelected ? "0 2px 8px rgba(74, 144, 226, 0.3)" : "0 1px 3px rgba(0, 0, 0, 0.3)",
                }}
                hoverable
              >
                <CardContent style={{ padding: "2px", position: "relative" }}>
                  {/* Shot image */}
                  {shotImage && (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "4/3",
                        borderRadius: "4px",
                        overflow: "hidden",
                        marginBottom: "2px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        position: "relative",
                      }}
                    >
                      <img
                        src={shotImage}
                        alt={shortName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          filter:isSelected?  "opacity(1)" : "opacity(0.6)",
                        }}
                      />
                      
                      {/* Status indicator */}
                      {status !== 'empty' && (
                        <div
                          style={{
                            position: "absolute",
                            top: "2px",
                            right: "2px",
                            zIndex: 1,
                          }}
                        >
                          {getStatusIcon(status)}
                        </div>
                      )}
                      
                      {/* Info icon for selected shot */}
                      {isSelected && onInfoClick && (
                        <div
                          style={{
                            position: "absolute",
                            top: "2px",
                            right: status !== 'empty' ? "18px" : "2px", // Position based on status icon
                            zIndex: 2,
                            cursor: "pointer",
                            backgroundColor: "#4a90e2",
                            borderRadius: "50%",
                            width: "16px",
                            height: "16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s ease",
                          }}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent shot selection when clicking info
                            onInfoClick(shotType);
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#357abd";
                            e.target.style.transform = "scale(1.1)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "#4a90e2";
                            e.target.style.transform = "scale(1)";
                          }}
                        >
                          <Info size={10} color="#ffffff" />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Shot name with number */}
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: "8px",
                      textAlign: "center",
                      display: "block",
                      lineHeight: "1.2",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontWeight: isSelected ? "bold" : "normal",
                    }}
                  >
                    {shotNumber}. {shortName}
                  </Text>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
      </div>
    </>
  );
};

export default ShotTypeSelector;
