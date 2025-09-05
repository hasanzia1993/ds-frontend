import React from "react";
import { Button, Typography, Row, Col, Modal } from "antd";
import { CameraOutlined, EditFilled } from "@ant-design/icons";
import { Card, CardContent } from "./ui/card";
import { Button as ShadCNButton } from "./ui/button";
import { Badge } from "./ui/badge";
import { Camera, SkipForward } from "lucide-react";

// No imports needed - we'll use require() for static images

const { Title, Text } = Typography;

function ImageCaptureInstructionCard({
  shotType,
  exampleImage,
  currentIndex,
  totalShots,
  onStartShooting,
  existingImage,
  onViewExistingImage,
  onDelete,
  onSkip,
}) {
  const getExampleImage = (shotType) => {
    // Map shot types to static image files using require()
    const mapping = {
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
      "Door Shot": require("../assets/shot_images/door.jpg"),
      "Shifter Shot": require("../assets/shot_images/shifter.jpg"),
      "Centre Dash Shot": require("../assets/shot_images/centre_dash.jpg"),
      "Fabric Shot": require("../assets/shot_images/fabric.jpg"),
      "Rear Mirror Shot": require("../assets/shot_images/rear_mirror.jpg"),
      "Passanger Cabin Shot": require("../assets/shot_images/passenger_cabin.jpg"),
      "Back Seat Shot": require("../assets/shot_images/back_seat.jpg"),
      "Panoramic Shot": require("../assets/shot_images/panoramic.jpg"),
      "Passanger Seat Shot": require("../assets/shot_images/passenger_seat.jpg"),
    };
    
    // Return the static image, or a fallback if the image doesn't exist
    return mapping[shotType] || require("../assets/shot_images/front.jpg");
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

  // Always show normal instructions layout

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
      <Row style={{ height: "100%", padding: "8px 16px" }}>
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
          <div className="space-y-3 flex-shrink-0 ">
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
          {/* {existingImage && (
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
            )} */}
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

            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default ImageCaptureInstructionCard;
