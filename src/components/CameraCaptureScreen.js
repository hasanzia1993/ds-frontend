// CameraCaptureScreen.js
import React, { useEffect, useRef, useState } from "react";
import { Button, Typography, Slider } from "antd";
import { openRearCamera } from "./RearCamera";
import { PlusOutlined, MinusOutlined, EditFilled } from "@ant-design/icons";
import { TiltIndicator } from "./TiltIndicator";
import WeatherIndicator from "./WeatherIndicator";
import ShotTypeSelector from "./ShotTypeSelector";
import { BACKEND_URL } from "../constants";

const { Text } = Typography;

const CameraCaptureScreen = ({
  shotType,
  currentIndex,
  totalShots,
  onCapture,
  onSkip,
  onBack,
  markerSrc,
  markerStyle,
  selectedWeather,
  onWeatherChange,
  allShotTypes,
  onShotTypeChange,
  shotStatuses = {},
  uploadingShots = new Set(),
  selectedRecord,
  onAdjust,
  onDelete,
  isDeletingImage,
  onShowInstructions, // Function to show instructions screen
}) => {
  const videoRef = useRef(null);
  const activeStreamRef = useRef(null);
  const [capturedImages, setCapturedImages] = useState({}); // Store captured images per shot

  // Define the first 5 shot types that should have fixed zoom of 1.6
  const fixedZoomShots = [
    "Front Quarter Shot",
    "Front Shot", 
    "Side Shot",
    "Back Quarter Shot",
    "Back Shot"
  ];

  // Check if current shot should have fixed zoom
  const shouldUseFixedZoom = fixedZoomShots.includes(shotType);
  const fixedZoomValue = 1.6;

  // Zoom state (if you still need it)
  const [zoom, setZoom] = useState(shouldUseFixedZoom ? fixedZoomValue : 1);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(3);
  const [hwZoomSupported, setHwZoomSupported] = useState(false);
  const zoomStep = 0.05;
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleZoomChange = (value) => {
    if (value < minZoom || value > maxZoom) return;
    setZoom(value);
  };

  const handleZoomCommit = async (value) => {
    const video = videoRef.current;
    if (!video || !hwZoomSupported) return;
    const track = video.srcObject?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: value }] });
      video.play().catch(console.error);
    } catch (err) {
      console.error("Zoom applyConstraints error:", err);
    }
  };

  const initializeCamera = async () => {
    try {
      console.log("Reinitializing camera for shot:", shotType);
      
      // Stop any existing stream before creating a new one
      if (activeStreamRef.current) {
        console.log("Stopping existing stream before reinitializing");
        activeStreamRef.current.getTracks().forEach(track => {
          console.log("Stopping existing track:", track.label);
          track.stop();
        });
        activeStreamRef.current = null;
      }
      
      const stream = await openRearCamera();
      activeStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            console.log("Camera stream reinitialized for shot:", shotType);
            videoRef.current.play().catch((err) => {
              console.error("Video play error after reinit:", err);
            });
          }
        };
      }
    } catch (error) {
      console.error("Error reinitializing camera:", error);
    }
  };

  const handleInfoClick = (shotType) => {
    if (onShowInstructions) {
      onShowInstructions(shotType);
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const targetAspect = 4 / 3; // enforce 4:3 output regardless of stream aspect
    const videoAspect = vw / vh;

    let sx, sy, sw, sh;
    if (videoAspect > targetAspect) {
      // Video is wider → crop left/right
      sh = vh;
      sw = Math.round(vh * targetAspect);
      sx = Math.round((vw - sw) / 2);
      sy = 0;
    } else {
      // Video is taller → crop top/bottom
      sw = vw;
      sh = Math.round(vw / targetAspect);
      sx = 0;
      sy = Math.round((vh - sh) / 2);
    }

    // Output canvas matches the 4:3 crop area at native resolution (no downscale)
    canvas.width = sw;
    canvas.height = sh;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

    const imageUrl = canvas.toDataURL("image/jpeg", 1.0);
    console.log("Captured image URL:", imageUrl.substring(0, 50) + "...");
    setCapturedImages(prev => ({
      ...prev,
      [shotType]: imageUrl
    }));
    onCapture(imageUrl);
  };

  useEffect(() => {
    let isMounted = true;
    
    (async () => {
      try {
        console.log("Initializing camera for shot:", shotType);
        const stream = await openRearCamera(); // request high res in RearCamera.js
        
        // Check if component is still mounted before proceeding
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        
        activeStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (isMounted && videoRef.current) {
              console.log("Camera stream loaded for shot:", shotType);
              videoRef.current.play().catch((err) => {
                console.error("Video play error:", err);
              });
            }
          };
        }
        
        const track = stream.getVideoTracks()[0];
        if (track) {
          const caps = track.getCapabilities();
          if (caps.zoom && track.applyConstraints) {
            // Use fixed zoom for first 5 shots, otherwise use default
            const initZoom = shouldUseFixedZoom 
              ? Math.min(Math.max(fixedZoomValue, caps.zoom.min), caps.zoom.max)
              : Math.min(Math.max(1, caps.zoom.min), caps.zoom.max);
            setMinZoom(caps.zoom.min);
            setMaxZoom(3);
            setZoom(initZoom);
            setHwZoomSupported(true);
            try {
              await track.applyConstraints({ advanced: [{ zoom: initZoom }] });
            } catch (err) {
              console.error("Initial zoom applyConstraints error:", err);
            }
          }
        }
      } catch (err) {
        console.error("Camera initialization error:", err);
        // Don't throw the error to prevent crashes
      }
    })();
    
    return () => {
      isMounted = false;
      if (activeStreamRef.current) {
        console.log("Cleaning up camera stream on component unmount");
        activeStreamRef.current.getTracks().forEach((t) => {
          console.log("Stopping track on unmount:", t.label);
          t.stop();
        });
        activeStreamRef.current = null;
      }
    };
  }, []);

  // Handle zoom changes when shot type changes
  useEffect(() => {
    if (hwZoomSupported && videoRef.current) {
      const video = videoRef.current;
      const track = video.srcObject?.getVideoTracks()[0];
      if (track && track.readyState === 'live') {
        try {
          const targetZoom = shouldUseFixedZoom ? fixedZoomValue : 1;
          setZoom(targetZoom);
          handleZoomCommit(targetZoom);
        } catch (err) {
          console.error("Zoom change error:", err);
        }
      }
    }
  }, [shotType, hwZoomSupported, shouldUseFixedZoom, fixedZoomValue]);

  useEffect(() => {
    const requestPermission = async () => {
      try {
        if (
          typeof DeviceOrientationEvent !== "undefined" &&
          typeof DeviceOrientationEvent.requestPermission === "function"
        ) {
          const response = await DeviceOrientationEvent.requestPermission();
          if (response === "granted") {
            window.addEventListener(
              "deviceorientation",
              handleOrientation,
              true
            );
          }
        } else {
          window.addEventListener("deviceorientation", handleOrientation, true);
        }
      } catch (err) {
        console.error("Device orientation permission check failed", err);
        // Don't throw the error, just log it and continue
      }
    };

    const handleOrientation = (e) => {
      const { gamma, beta } = e;
      setTilt({ x: gamma, y: beta });
    };

    requestPermission();

    return () =>
      window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  // Ensure camera stream is active when switching to a shot that should show camera
  useEffect(() => {
    const currentShotStatus = shotStatuses[shotType];
    const currentCapturedImage = capturedImages[shotType];
    
    // If this shot should show camera (no captured image and not completed), ensure video is playing
    if (!currentCapturedImage && currentShotStatus !== 'completed' && videoRef.current) {
      console.log("Ensuring camera stream is active for shot:", shotType);
      
      // Check if video has a valid stream
      if (videoRef.current.srcObject) {
        videoRef.current.play().catch((e) => {
          console.error("Error resuming video stream for shot:", shotType, e);
        });
      } else {
        console.log("No video stream found, reinitializing camera for shot:", shotType);
        // Reinitialize camera if no stream is found
        initializeCamera();
      }
    }
  }, [shotType, shotStatuses, capturedImages]);

  // Cleanup effect to ensure camera is stopped when component unmounts
  useEffect(() => {
    return () => {
      console.log("Component unmounting, cleaning up camera stream");
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((t) => {
          console.log("Stopping track on component unmount:", t.label);
          t.stop();
        });
        activeStreamRef.current = null;
      }
    };
  }, []);

  // When upload finishes for this shot, clear the captured image and resume stream
  useEffect(() => {
    const currentShotStatus = shotStatuses[shotType];
    const currentCapturedImage = capturedImages[shotType];
    console.log("Current shot status:", currentShotStatus);
    console.log("capturedImage for", shotType, ":", currentCapturedImage ? "exists" : "none");
    
    // Clear captured image when shot becomes completed (to show database image instead)
    if (currentShotStatus === 'completed' && currentCapturedImage) {
      console.log("Clearing captured image for completed shot:", shotType);
      setCapturedImages(prev => {
        const updated = { ...prev };
        delete updated[shotType];
        return updated;
      });
    }
    
    // Clear captured image when this shot is no longer uploading/processing AND not completed
    if (currentShotStatus !== 'uploading' && currentShotStatus !== 'processing' && currentShotStatus !== 'completed' && currentCapturedImage) {
      console.log("Resuming video stream for shot:", shotType);
      setCapturedImages(prev => {
        const updated = { ...prev };
        delete updated[shotType];
        return updated;
      });
      videoRef.current?.play().catch((e) => {
        console.error("Error resuming video stream:", e);
      });
    }
  }, [shotStatuses, shotType, capturedImages]);

  const isLevel = Math.abs(tilt.y) <= 1;

  return (
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
        borderRadius: "8px",
      }}
    >
      {/* Left Panel */}
      <div
        style={{
          flex: "0 0 60px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 0",
          justifyContent: "space-between",
        }}
      >
        <Button
          type="text"
          onClick={onBack}
          style={{ color: "#fff", fontSize: "24px", paddingLeft: 4, alignSelf: "flex-start" }}
        >
          ×
        </Button>
        {allShotTypes && (
          <ShotTypeSelector
            shotTypes={allShotTypes}
            currentShotType={shotType}
            onShotTypeChange={onShotTypeChange}
            shotStatuses={shotStatuses}
            onInfoClick={handleInfoClick}
          />
        )}
        <div></div>
      </div>

      {/* Center – fixed 4:3 preview */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          padding: "16px 0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            // width: "100%",
            // maxWidth: 500,
            height: "85vh",
            aspectRatio: "4 / 3",
            backgroundColor: "#000",
            border: "2px solid #fff",
            borderRadius: 8,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* render video only when no captured image for this shot and not completed */}
          {!capturedImages[shotType] && shotStatuses[shotType] !== 'completed' && (() => {
            console.log("Rendering video for shot:", shotType, {
              hasCapturedImage: !!capturedImages[shotType],
              shotStatus: shotStatuses[shotType],
              videoRef: !!videoRef.current,
              hasStream: videoRef.current?.srcObject ? true : false
            });
            return true;
          })() && (
            <video
              key={`video-${shotType}`}
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => {
                console.log("Video metadata loaded for shot:", shotType);
                if (videoRef.current) {
                  videoRef.current.play().catch((err) => {
                    console.error("Video play error on metadata load:", err);
                  });
                }
              }}
              onError={(e) => {
                console.error("Video error for shot:", shotType, e);
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}
          {!capturedImages[shotType] && markerSrc && (
            <img
              src={markerSrc}
              alt="marker"
              style={{
                position: "absolute",
                top: "50%", // will be overridden by markerStyle.top
                left: "50%", // will be overridden by markerStyle.left
                width: "30%", // will be overridden by markerStyle.width
                height: "auto",
                objectFit: "contain",
                pointerEvents: "none",
                zIndex: 1,
                ...markerStyle,
              }}
            />
          )}
          {/* on top, show the capturedImage only when set and shot is not completed */}
          {capturedImages[shotType] && shotStatuses[shotType] !== 'completed' && (() => {
            console.log("Showing captured image:", { capturedImage: capturedImages[shotType].substring(0, 50) + "...", shotType, status: shotStatuses[shotType] });
            return true;
          })() && (
            <img
              src={capturedImages[shotType]}
              alt="captured"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 10,
              }}
              onLoad={() => {
                console.log("Captured image loaded successfully for", shotType);
              }}
              onError={(e) => {
                console.error("Captured image failed to load for", shotType, ":", e);
                console.error("Image src:", capturedImages[shotType].substring(0, 100) + "...");
              }}
            />
          )}

          {/* Show existing image with buttons when there's an existing image for the current shot */}
          {selectedRecord?.Images?.[0] && shotStatuses[shotType] === 'completed' && (() => {
            console.log("Showing completed image for shot:", shotType);
            console.log("Image data:", selectedRecord.Images[0]);
            console.log("Shot status:", shotStatuses[shotType]);
            return true;
          })() && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 5,
              }}
            >
              <img
                src={`${BACKEND_URL}/uploads/${selectedRecord?.Images?.[0]?.path || selectedRecord?.Images?.[0]?.imageUrl || selectedRecord?.Images?.[0]}`}
                alt="completed shot"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
                onError={(e) => {
                  console.error('Image failed to load:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
          {(shotStatuses[shotType] === 'uploading' || shotStatuses[shotType] === 'processing') && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "transparent",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 18,
                fontWeight: "bold",
                zIndex: 15,
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <div style={{ marginBottom: "16px" }}>
                {shotStatuses[shotType] === 'uploading' && "Uploading image..."}
                {shotStatuses[shotType] === 'processing' && "Processing image..."}
                {shotStatuses[shotType] === 'error' && "Upload failed. Please try again."}
              </div>
              {shotStatuses[shotType] === 'uploading' && (
                <div style={{
                  width: "40px",
                  height: "40px",
                  border: "4px solid #f59e0b",
                  borderTop: "4px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
              )}
              {shotStatuses[shotType] === 'processing' && (
                <div style={{
                  width: "40px",
                  height: "40px",
                  border: "4px solid #3b82f6",
                  borderTop: "4px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
              )}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "70%",
            // maxWidth: 600,
            marginTop: 8,
            fontWeight: "bold",
            padding: "0 16px",
          }}
        >
          <Text style={{ color: "#fff" }}>{shotType}</Text>
          <Text style={{ color: "#fff" }}>
            <strong>{currentIndex}</strong>/{totalShots}
          </Text>
        </div>
      </div>

      {/* Right Panel */}
      <div
        style={{
          flex: "0 0 60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 16px",
        }}
      >
        {/* Show different buttons based on whether there's an existing image for the current shot */}
        {selectedRecord?.Images?.[0] && shotStatuses[shotType] === 'completed' ? (
          // Show Adjust, Delete, and Retake buttons for completed shots
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", justifyContent: "space-between", height: "100%" }}>
            {/* Adjust Button (at top) */}
            {currentIndex <= 5 && (
              <Button
                type="primary"
                icon={<EditFilled />}
                onClick={onAdjust}
                style={{ backgroundColor: "transparent" }}
              >
                Adjust
              </Button>
            )}

            {/* Delete Button (in center) */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Button
                type="text"
                onClick={onDelete}
                loading={isDeletingImage === selectedRecord?.Images?.[0]?.id}
                disabled={isDeletingImage === selectedRecord?.Images?.[0]?.id}
                style={{
                  color: "#ef4444",
                  fontSize: "24px",
                  padding: "8px",
                  border: "none",
                  background: "transparent",
                  transition: "all 0.3s ease",
                }}
              >
                🗑️
              </Button>
            </div>

            {/* Retake Button (at bottom) */}
            <Button
              type="text"
              onClick={handleCapture}
              style={{ color: "#ff922b" }}
            >
              Retake
            </Button>
          </div>
        ) : (
          // Show normal weather/capture/skip buttons for non-completed shots
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <WeatherIndicator 
                selectedWeather={selectedWeather}
                onWeatherChange={onWeatherChange}
              />
            </div>
            {!(shotStatuses[shotType] === 'uploading' || shotStatuses[shotType] === 'processing') && (
              <Button
                color="danger"
                shape="circle"
                size="large"
                variant="solid"
                loading={shotStatuses[shotType] === 'uploading'}
                onClick={handleCapture}
                style={{ border: "3px solid #fff", width: "64px", height: "64px" }}
              />
            )}
            {!(shotStatuses[shotType] === 'uploading' || shotStatuses[shotType] === 'processing') && (
              <Button
                type="text"
                onClick={onSkip}
                style={{ color: "#fff", fontSize: 14, padding: 0 }}
              >
                SKIP
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CameraCaptureScreen;
