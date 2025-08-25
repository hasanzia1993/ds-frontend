import React from "react";
import { Button, Typography, Row, Col, Modal } from "antd";
import { CameraOutlined } from "@ant-design/icons";
import { Card, CardContent } from "./ui/card";
import { Button as ShadCNButton } from "./ui/button";
import { Badge } from "./ui/badge";
import { Camera, SkipForward } from "lucide-react";

const { Title, Text } = Typography;

function ImageCaptureInstructionCard({
  shotType,
  exampleImage,
  currentIndex,
  totalShots,
  onStartShooting,
  existingImage,
  onViewExistingImage,
  onSkip,
}) {
  const getExampleImage = (shotType) => {
    const mapping = {
      "Front Quarter Shot": "https://images.edealer.ca/13/77340/155937384.jpeg",
      "Front Shot": "https://images.edealer.ca/13/77340/155937385.jpeg",
      "Side Shot": "https://images.edealer.ca/13/77340/155937387.jpeg",
      "Back Quarter Shot": "https://images.edealer.ca/13/77340/155937388.jpeg",
      "Back Shot": "https://images.edealer.ca/13/77340/155937390.jpeg",
      "Wheel Shot": "https://images.edealer.ca/13/77340/155937392.jpeg",
      "Tire Tread Shot": "https://images.edealer.ca/13/77340/155937393.jpeg",
      "Head Light Shot": "https://images.edealer.ca/13/77340/155937395.jpeg",
      "Emblem Shot": "https://images.edealer.ca/13/77340/155937396.jpeg",
      "Engine Shot": "https://images.edealer.ca/13/77340/155937398.jpeg",
      "Tail light Shot": "https://images.edealer.ca/13/77340/155937400.jpeg",
      "Trunk Shot": "https://images.edealer.ca/13/77340/155937401.jpeg",
      "Side Dash Shot": "https://images.edealer.ca/13/77340/155937402.jpeg",
      "Steering Wheel Shot":
        "https://images.edealer.ca/13/77340/155937403.jpeg",
      "Guages Shot": "https://images.edealer.ca/13/77340/155937405.jpeg",
      "Steering Buttons Shot":
        "https://images.edealer.ca/13/77340/155937406.jpeg",
      "Door Shot": "https://images.edealer.ca/13/77340/155937408.jpeg",
      "Shifter Shot": "https://images.edealer.ca/13/77340/155937409.jpeg",
      "Centre Dash Shot": "https://images.edealer.ca/13/77340/155937410.jpeg",
      "Fabric Shot": "https://images.edealer.ca/13/77340/155937412.jpeg",
      "Rear Mirror Shot": "https://images.edealer.ca/13/77340/155937413.jpeg",
      "Passanger Cabin Shot":
        "https://images.edealer.ca/13/77340/155937414.jpeg",
      "Back Seat Shot": "https://images.edealer.ca/13/77340/155937415.jpeg",
      "Panoramic Shot": "https://images.edealer.ca/13/77340/155937417.jpeg",
      "Passanger Seat Shot":
        "https://images.edealer.ca/13/77340/155937418.jpeg",
    };
    return (
      mapping[shotType] ||
      "https://cdn-icons-png.flaticon.com/512/10157/10157938.png"
    );
  };

  const imageUrl = exampleImage || getExampleImage(shotType);

  const getInstructions = (shotType) => {
    // Default instructions for most shots
    const defaultInstructions = [
      "DO NOT PARK close to obstructions (curbs, grass, and other cars)",
      "Walk back until wheels are aligned with orange stencil",
      "Crouch down for the shot"
    ];

    // Special instructions for specific shots
    const specialInstructions = {
      "Engine Shot": [
        "Open the hood completely",
        "Position camera above the engine bay",
        "Ensure all engine components are visible"
      ],
      "Trunk Shot": [
        "Open the trunk/hatch completely",
        "Position camera to capture entire trunk space",
        "Ensure good lighting inside the trunk"
      ],
      "Door Shot": [
        "Open the door completely",
        "Position camera to capture door panel",
        "Ensure interior elements are visible"
      ],
      "Panoramic Shot": [
        "Position yourself for a wide-angle view",
        "Ensure the entire vehicle is in frame",
        "Capture the full vehicle from a distance"
      ]
    };

    return specialInstructions[shotType] || defaultInstructions;
  };

  const instructions = getInstructions(shotType);

  return (
    <div
      style={{
        backgroundColor: "#2c2c2c",
        color: "#fff",
        padding: "0",
        borderRadius: "0",
        minHeight: "100vh",
        height: "100vh",
        width: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <Row style={{ height: "100%", padding: "16px" }}>
        {/* Left Column */}
        <Col
          span={12}
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            paddingTop: "16px",
            paddingBottom: "16px",
          }}
        >
          {/* Content area with proper spacing */}
          <div
            className="image-adjustor-container"
            style={{
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
   
              minHeight: 0,
            }}
          >
            {/* Header row with shot name and progress */}
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-500/30 text-sm px-3 py-1">
                {shotType}
              </Badge>
              <span className="text-gray-400 text-sm">
                {currentIndex} / {totalShots}
              </span>
            </div>
            
            <div className="space-y-4 mb-3">
              <h3 className="text-xl font-semibold text-white">Instructions</h3>
              <ol className="space-y-2 text-sm text-gray-300 pl-6">
                {instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-400 font-bold text-base">{index + 1}.</span>
                    <span className="leading-relaxed">{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
            
           
          </div>

          {/* Action buttons positioned higher up */}
          <div className="space-y-3 flex-shrink-0 mt-4">
            <div className="flex gap-3">
              <ShadCNButton
                onClick={onStartShooting}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700 h-10 text-sm font-semibold"
              >
                <Camera className="h-4 w-4 mr-2" />
                START SHOOTING
              </ShadCNButton>
              <ShadCNButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  onSkip();
                  e.target.blur();
                }}
                className="text-gray-400 hover:text-white hover:bg-gray-600/20 h-10 px-3"
              >
                Skip
                <SkipForward className="h-4 w-4 ml-2" />
              </ShadCNButton>
            </div>
          </div>
          {existingImage && (
              <div className="p-3 bg-amber-900/30 border border-amber-600/50 rounded-lg mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                    <span className="text-sm text-amber-300">
                      Photo already exists for this shot
                    </span>
                  </div>
                  <ShadCNButton
                    variant="link"
                    size="sm"
                    onClick={onViewExistingImage}
                    className="p-0 h-auto text-blue-400 hover:text-blue-300 flex items-center space-x-1 text-sm"
                  >
                    <span>View</span>
                    <span>→</span>
                  </ShadCNButton>
                </div>
              </div>
            )}
        </Col>

        {/* Right Column */}
        <Col
          span={12}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: "16px",
            textAlign: "center",
            position: "relative",
            height: "100vh",
          }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={imageUrl}
                alt="Example shot"
                style={{
                  width: "100%",
                  maxHeight: "100%",
                  maxWidth: "100%",
                  objectFit: "contain",
                  borderRadius: "12px",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
                }}
              />
     {/* Blur patch pinned to top-left of the image box */}
  <div
    style={{
      position: "absolute",
      top: 52,
      left: 0,
      width: "86px",
      height: "22px",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)", // Safari
      borderTopLeftRadius: "12px", // optional to match image corner
      pointerEvents: "none",
    }}
  />
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default ImageCaptureInstructionCard;
