import React, { useRef, useState, useEffect } from "react";
import { Button, InputNumber, Typography, Modal } from "antd";
import { BugOutlined, CloseOutlined } from "@ant-design/icons";
import simpleWheelDetector from "../utils/simpleWheelDetector";

const { Text } = Typography;

export const StencilDebugViewer = ({
  imageUrl,
  markerSrc,
  markerStyle = {},
  visible = false,
  onClose = null,
}) => {
  const imageContainerRef = useRef(null);
  const [internalVisible, setInternalVisible] = useState(false);
  
  // Use external visible prop if provided, otherwise use internal state
  const isVisible = visible !== undefined ? visible : internalVisible;
  const handleClose = onClose || (() => setInternalVisible(false));

  const [topPercent, setTopPercent] = useState(
    parseFloat(markerStyle.top) || 50
  );
  const [leftPercent, setLeftPercent] = useState(
    parseFloat(markerStyle.left) || 50
  );
  const [widthPercent, setWidthPercent] = useState(
    parseFloat(markerStyle.width) || 30
  );
  const [rotationDeg, setRotationDeg] = useState(
    parseFloat(markerStyle.rotate) || 0
  );

  // Wheel alignment state
  const [wheelAlignment, setWheelAlignment] = useState({
    frontWheelAlignment: 0,
    rearWheelAlignment: 0,
    overallAlignment: 0,
    detectedWheels: 0,
    message: "Analyzing wheels..."
  });

  // Wheel detection and alignment calculation using OpenCV
  const calculateWheelAlignment = async () => {
    if (!imageUrl || !markerSrc) return;

    console.log('Starting wheel alignment calculation...');
    
    try {
      // Initialize simple wheel detector if not already done
      if (!simpleWheelDetector.initialized) {
        console.log('Initializing simple wheel detector...');
        await simpleWheelDetector.initialize();
        console.log('Simple wheel detector initialized successfully');
      } else {
        console.log('Simple wheel detector already initialized');
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = async () => {
        console.log('Image loaded, dimensions:', img.naturalWidth, 'x', img.naturalHeight);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        console.log('Image data extracted, size:', imageData.data.length);

        // Calculate stencil wheel positions based on current markerStyle
        const stencilWidth = widthPercent / 100;
        const stencilLeft = leftPercent / 100;
        const stencilTop = topPercent / 100;

        // Define wheel regions in the stencil (approximate positions)
        const frontWheelRegion = {
          x: stencilLeft + (stencilWidth * 0.2),
          y: stencilTop + (stencilWidth * 0.5),
          radius: stencilWidth * 0.15
        };

        const rearWheelRegion = {
          x: stencilLeft + (stencilWidth * 0.8),
          y: stencilTop + (stencilWidth * 0.5),
          radius: stencilWidth * 0.15
        };

        // Use simple wheel detection
        let detectedWheels = [];
        try {
          console.log('Starting simple wheel detection...');
          detectedWheels = simpleWheelDetector.detectWheels(imageData, canvas.width, canvas.height);
          console.log('Simple detection completed, found:', detectedWheels.length, 'wheels');
        } catch (error) {
          console.error('Wheel detection error:', error);
          detectedWheels = [];
        }

        // Calculate alignment using car-based approach
        const stencilRegions = {
          front: {
            x: frontWheelRegion.x * canvas.width,
            y: frontWheelRegion.y * canvas.height,
            radius: frontWheelRegion.radius * canvas.width
          },
          rear: {
            x: rearWheelRegion.x * canvas.width,
            y: rearWheelRegion.y * canvas.height,
            radius: rearWheelRegion.radius * canvas.width
          }
        };

        const alignments = simpleWheelDetector.calculateAlignment(
          detectedWheels, 
          stencilRegions, 
          canvas.width, 
          canvas.height
        );

        const frontWheelAlignment = alignments.frontWheelAlignment;
        const rearWheelAlignment = alignments.rearWheelAlignment;
        const overallAlignment = alignments.overallAlignment;

        // Determine message based on alignment
        let message = "Analyzing wheels...";
        if (detectedWheels.length === 0) {
          message = "No wheels detected - check image quality";
        } else if (detectedWheels.length < 2) {
          message = `Only ${detectedWheels.length} wheel(s) found`;
        } else if (overallAlignment < 30) {
          message = "Poor alignment - adjust stencil position";
        } else if (overallAlignment < 70) {
          message = "Partial alignment - fine-tune position";
        } else {
          message = "Good alignment!";
        }

        // Add comprehensive debugging information
        console.log('Simple Wheel Detection Debug:', {
          imageSize: { width: canvas.width, height: canvas.height },
          detectedWheels: detectedWheels.length,
          wheels: detectedWheels,
          frontWheelAlignment,
          rearWheelAlignment,
          overallAlignment,
          frontWheelRegion,
          rearWheelRegion,
          stencilRegions
        });
        
        console.log('Detailed wheel positions:', detectedWheels.map(wheel => ({
          x: wheel.x,
          y: wheel.y,
          confidence: wheel.confidence,
          method: wheel.method
        })));

        setWheelAlignment({
          frontWheelAlignment: Math.round(frontWheelAlignment),
          rearWheelAlignment: Math.round(rearWheelAlignment),
          overallAlignment: Math.round(overallAlignment),
          detectedWheels: detectedWheels.length,
          message
        });
      };
      
      img.src = imageUrl;
    } catch (error) {
      console.error('Error in calculateWheelAlignment:', error);
      
      // Fallback to simple detection if OpenCV fails
      console.log('Trying fallback wheel detection...');
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Simple fallback detection
          const wheelCandidates = [];
          for (let y = Math.floor(canvas.height * 0.5); y < canvas.height - 50; y += 10) {
            for (let x = 50; x < canvas.width - 50; x += 10) {
              const idx = (y * canvas.width + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              
              // Look for dark circular areas
              if (r < 80 && g < 80 && b < 80) {
                wheelCandidates.push({ x, y, radius: 30, confidence: 50 });
              }
            }
          }

          console.log('Fallback detection found:', wheelCandidates.length, 'candidates');
          
          setWheelAlignment({
            frontWheelAlignment: wheelCandidates.length > 0 ? 30 : 0,
            rearWheelAlignment: wheelCandidates.length > 1 ? 30 : 0,
            overallAlignment: wheelCandidates.length > 1 ? 30 : 0,
            detectedWheels: wheelCandidates.length,
            message: wheelCandidates.length > 0 ? "Fallback detection active" : "No wheels detected"
          });
        };
        img.src = imageUrl;
      } catch (fallbackError) {
        console.error('Fallback detection also failed:', fallbackError);
        setWheelAlignment({
          frontWheelAlignment: 0,
          rearWheelAlignment: 0,
          overallAlignment: 0,
          detectedWheels: 0,
          message: "Detection failed - check console"
        });
      }
    }
  };

  // Recalculate wheel alignment when stencil position changes
  useEffect(() => {
    if (imageUrl && markerSrc) {
      calculateWheelAlignment().catch(error => {
        console.error('Error in wheel alignment calculation:', error);
      });
    }
  }, [imageUrl, markerSrc, topPercent, leftPercent, widthPercent, rotationDeg]);

  const ViewerContent = (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#2c2c2c",
        color: "#fff",
        fontSize: "16px",
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      {/* Left Controls */}
      <div
        style={{
          width: 120,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          marginRight: 16,
          gap: 8,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Stencil Position</Text>
        <Text style={{ color: "#fff" }}>Top (%)</Text>
        <InputNumber
          min={0}
          max={100}
          value={topPercent}
          onChange={(v) => setTopPercent(v)}
        />
        <Text style={{ color: "#fff" }}>Left (%)</Text>
        <InputNumber
          min={0}
          max={100}
          value={leftPercent}
          onChange={(v) => setLeftPercent(v)}
        />
        <Text style={{ color: "#fff" }}>Width (%)</Text>
        <InputNumber
          min={1}
          max={100}
          value={widthPercent}
          onChange={(v) => setWidthPercent(v)}
        />
        <Text style={{ color: "#fff" }}>Tilt (°)</Text>
        <InputNumber
          min={-180}
          max={180}
          value={rotationDeg}
          onChange={(v) => setRotationDeg(v)}
        />
      </div>

      {/* Image Container */}
      <div
        ref={imageContainerRef}
        style={{
          height: "85vh",
          aspectRatio: "4 / 3",
          backgroundColor: "#000",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <img
          src={imageUrl}
          alt="Captured"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        {markerSrc && (
          <div
            style={{
              position: "absolute",
              top: `${topPercent}%`,
              left: `${leftPercent}%`,
              width: `${widthPercent}%`,
              transform: `rotate(${rotationDeg}deg)`,
              transformOrigin: "center",
              pointerEvents: "none",
              zIndex: 2,
              textAlign: "center",
            }}
          >
            <img
              src={markerSrc}
              alt="Stencil"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "contain",
              }}
            />
            
            {/* Wheel alignment zones overlay */}
            <div
              style={{
                position: "absolute",
                top: "0",
                left: "0",
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 3,
              }}
            >
              {/* Front wheel zone */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "20%",
                  width: "30%",
                  height: "30%",
                  border: `2px solid ${wheelAlignment.frontWheelAlignment > 70 ? "#4CAF50" : 
                                     wheelAlignment.frontWheelAlignment > 30 ? "#FF9800" : "#F44336"}`,
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: `${wheelAlignment.frontWheelAlignment > 70 ? "rgba(76, 175, 80, 0.2)" : 
                                   wheelAlignment.frontWheelAlignment > 30 ? "rgba(255, 152, 0, 0.2)" : "rgba(244, 67, 54, 0.2)"}`,
                }}
              />
              
              {/* Rear wheel zone */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "80%",
                  width: "30%",
                  height: "30%",
                  border: `2px solid ${wheelAlignment.rearWheelAlignment > 70 ? "#4CAF50" : 
                                     wheelAlignment.rearWheelAlignment > 30 ? "#FF9800" : "#F44336"}`,
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: `${wheelAlignment.rearWheelAlignment > 70 ? "rgba(76, 175, 80, 0.2)" : 
                                   wheelAlignment.rearWheelAlignment > 30 ? "rgba(255, 152, 0, 0.2)" : "rgba(244, 67, 54, 0.2)"}`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right Controls - Wheel Alignment Stats */}
      <div
        style={{
          width: 120,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          marginLeft: 16,
          gap: 8,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Wheel Alignment</Text>
        <div style={{ marginBottom: "8px" }}>
          <Text style={{ color: "#fff", fontSize: 12 }}>
            Front: {wheelAlignment.frontWheelAlignment}%
          </Text>
          <div style={{ 
            width: "100%", 
            height: "6px", 
            backgroundColor: "#333", 
            borderRadius: "3px",
            marginTop: "4px",
            overflow: "hidden"
          }}>
            <div style={{
              width: `${wheelAlignment.frontWheelAlignment}%`,
              height: "100%",
              backgroundColor: wheelAlignment.frontWheelAlignment > 70 ? "#4CAF50" : 
                             wheelAlignment.frontWheelAlignment > 30 ? "#FF9800" : "#F44336"
            }} />
          </div>
        </div>
        <div style={{ marginBottom: "8px" }}>
          <Text style={{ color: "#fff", fontSize: 12 }}>
            Rear: {wheelAlignment.rearWheelAlignment}%
          </Text>
          <div style={{ 
            width: "100%", 
            height: "6px", 
            backgroundColor: "#333", 
            borderRadius: "3px",
            marginTop: "4px",
            overflow: "hidden"
          }}>
            <div style={{
              width: `${wheelAlignment.rearWheelAlignment}%`,
              height: "100%",
              backgroundColor: wheelAlignment.rearWheelAlignment > 70 ? "#4CAF50" : 
                             wheelAlignment.rearWheelAlignment > 30 ? "#FF9800" : "#F44336"
            }} />
          </div>
        </div>
        <div style={{ marginBottom: "8px" }}>
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>
            Overall: {wheelAlignment.overallAlignment}%
          </Text>
          <div style={{ 
            width: "100%", 
            height: "8px", 
            backgroundColor: "#333", 
            borderRadius: "4px",
            marginTop: "4px",
            overflow: "hidden"
          }}>
            <div style={{
              width: `${wheelAlignment.overallAlignment}%`,
              height: "100%",
              backgroundColor: wheelAlignment.overallAlignment > 70 ? "#4CAF50" : 
                             wheelAlignment.overallAlignment > 30 ? "#FF9800" : "#F44336"
            }} />
          </div>
        </div>
        <div style={{ marginBottom: "4px" }}>
          <Text style={{ color: "#fff", fontSize: 11, opacity: 0.8 }}>
            Wheels: {wheelAlignment.detectedWheels}
          </Text>
        </div>
        <div>
          <Text style={{ 
            color: "#fff", 
            fontSize: 11, 
            opacity: 0.9,
            fontStyle: "italic"
          }}>
            {wheelAlignment.message}
          </Text>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {!visible && (
        <Button
          type="primary"
          icon={<BugOutlined />}
          onClick={() => setInternalVisible(true)}
          style={{ width: 18, height: 18 }}
        ></Button>
      )}
      <Modal
        open={isVisible}
        onCancel={handleClose}
        footer={null}
        width="100vw"
        closeIcon={<CloseOutlined style={{ color: "white" }} />}
        style={{ top: 0, padding: 0 }}
        bodyStyle={{ padding: 0, height: "100vh" }}
        centered
        destroyOnClose
        styles={{
          content: {
            padding: 0,
          },
        }}
      >
        {ViewerContent}
      </Modal>
    </>
  );
};

export default StencilDebugViewer;
