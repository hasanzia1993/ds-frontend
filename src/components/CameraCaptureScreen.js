// CameraCaptureScreen.js
import React, { useEffect, useRef, useState } from "react";
import { Button, Typography, Slider } from "antd";
import { openRearCamera } from "./RearCamera";
import { PlusOutlined, MinusOutlined } from "@ant-design/icons";
import { TiltIndicator } from "./TiltIndicator";

const { Text } = Typography;

const CameraCaptureScreen = ({
  shotType,
  currentIndex,
  totalShots,
  onCapture,
  onSkip,
  onBack,
  onExampleClick,
  isUploading,
  markerSrc,
  markerStyle,
}) => {
  const videoRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);

  // Zoom state (if you still need it)
  const [zoom, setZoom] = useState(1);
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
    setCapturedImage(imageUrl);
    onCapture(imageUrl);
  };

  useEffect(() => {
    let activeStream;
    (async () => {
      try {
        const stream = await openRearCamera(); // request high res in RearCamera.js
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () =>
            videoRef.current.play().catch(console.error);
        }
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities();
        if (caps.zoom && track.applyConstraints) {
          const initZoom = Math.min(Math.max(1, caps.zoom.min), caps.zoom.max);
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
      } catch (err) {
        console.error("Camera error:", err);
      }
    })();
    return () => activeStream?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    const requestPermission = async () => {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        try {
          const response = await DeviceOrientationEvent.requestPermission();
          if (response === "granted") {
            window.addEventListener(
              "deviceorientation",
              handleOrientation,
              true
            );
          }
        } catch (err) {
          console.error("Device orientation permission denied", err);
        }
      } else {
        window.addEventListener("deviceorientation", handleOrientation, true);
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

  // When upload finishes, clear the captured image and resume stream
  useEffect(() => {
    console.log("isUploading:", isUploading);
    console.log("capturedImage:", capturedImage);
    if (!isUploading && capturedImage) {
      console.log("Resuming video stream...");
      setCapturedImage(null);
      videoRef.current?.play().catch((e) => {
        console.error("Error resuming video stream:", e);
      });
      console.log("after isUploading:", isUploading);
      console.log("capturedImage:", capturedImage);
    }
  }, [isUploading]);

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
          style={{ color: "#fff", fontSize: "24px", padding: 0 }}
        >
          ←
        </Button>
        {!capturedImage && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              height: 200,
              justifyContent: "space-between",
            }}
          >
            <Button
              shape="circle"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                handleZoomChange(zoom + zoomStep);
                handleZoomCommit(zoom + zoomStep);
              }}
              // style={{ color: "#fff" }}
            />
            <Slider
              vertical
              min={minZoom}
              max={maxZoom}
              step={zoomStep}
              value={zoom}
              onChange={handleZoomChange}
              onAfterChange={handleZoomCommit}
              style={{ height: 140 }}
            />
            <Button
              shape="circle"
              size="small"
              icon={<MinusOutlined />}
              onClick={() => {
                handleZoomChange(zoom - zoomStep);
                handleZoomCommit(zoom - zoomStep);
              }}
              // style={{ color: "#fff" }}
            />
          </div>
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
          {/* always render video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          {!capturedImage && markerSrc && (
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
          {/* on top, show the capturedImage only when set */}
          {capturedImage && (
            <img
              src={capturedImage}
              alt="captured"
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
          {isUploading && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 18,
                fontWeight: "bold",
                zIndex: 2,
              }}
            >
              Uploading image...
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
          <TiltIndicator tiltY={tilt.y} />
          {/* <div
            style={{
              position: "absolute",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              width: 100,
              height: 24,
              borderRadius: 12,
              background: "#2c2c2c",
              border: "2px solid #666",
              overflow: "hidden",
              zIndex: 10,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: isLevel ? "limegreen" : "red",
                transform: `translate(-50%, -50%) translateX(${Math.max(
                  -40,
                  Math.min(40, tilt.y * 2)
                )}px)`,
                boxShadow: isLevel ? "0 0 8px limegreen" : "none",
                transition: "transform 0.1s ease, background 0.3s ease",
              }}
            />
          </div> */}
          <Text style={{ color: "#fff" }}>
            <strong>{currentIndex}</strong>/{totalShots} <br />
            {/* y:{Math.abs(tilt.y)?.toFixed(1)}
            <br />
            x:{Math.abs(tilt.x)?.toFixed(1)}
            <br />
            adjusted x:{Math.abs(tilt.x + 87)?.toFixed(1)}
            <br />
            {isLevel ? "Level" : "Tilted"} */}
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
        <Button
          type="text"
          onClick={onExampleClick}
          style={{ color: "#f5c518", fontWeight: "bold", padding: 0 }}
        >
          EXAMPLE
        </Button>
        <Button
          color="danger"
          shape="circle"
          size="large"
          variant="solid"
          loading={isUploading}
          onClick={handleCapture}
          style={{ border: "3px solid #fff", width: "64px", height: "64px" }}
        />
        <Button
          type="text"
          onClick={onSkip}
          style={{ color: "#fff", fontSize: 14, padding: 0 }}
        >
          SKIP
        </Button>
      </div>
    </div>
  );
};

export default CameraCaptureScreen;
