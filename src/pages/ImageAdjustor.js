import React, { useRef, useState, useEffect } from "react";
import { isMobile as isMobileDevice, isTablet } from "react-device-detect";
import { Button, Slider, Spin, message, Dropdown, Menu } from "antd";
import {
  SettingOutlined,
  ArrowsAltOutlined,
  DragOutlined,
  SaveFilled,
  UndoOutlined,
  CameraOutlined,
  CheckOutlined,
  MinusOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import axios from "../axiosInstance";
import { openRearCamera } from "../components/RearCamera";
import { BACKEND_URL } from "../constants";

const ImageAdjustor = ({
  imageId,
  labelId,
  vehicleId,
  transparentUrl,
  initialX = 0,
  initialY = 0,
  initialScale = 1,
  initialTilt = 0, // ★ NEW
  onClose,
  onSaveSuccess,
}) => {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [userDealership, setUserDealership] = useState(
    () => localStorage.getItem("userDealership") || null
  );
  const [bgUrl, setBgUrl] = useState(null);
  const [x, setX] = useState(initialX);
  const [y, setY] = useState(initialY);
  const [scale, setScale] = useState(initialScale);
  // at the top, with the other useState hooks
  const [tilt, setTilt] = useState(initialTilt || 0); // ★ NEW  degrees (-15 … +15?)

  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pinching, setPinching] = useState(false);
  const [pinchStartDistance, setPinchStartDistance] = useState(0);
  const [initialPinchScale, setInitialPinchScale] = useState(scale);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [showArrows, setShowArrows] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forceLandscape, setForceLandscape] = useState(false);

  const BACKGROUND_WIDTH = 1024;
  const BACKGROUND_HEIGHT = 768;
  const isMobile = isMobileDevice || isTablet;
  const [showSlider, setShowSlider] = useState(!isMobile);

  const [useLiveBackground, setUseLiveBackground] = useState(false);
  const [liveStream, setLiveStream] = useState(null);
  const videoRef = useRef(null); // similar to CameraCaptureScreen
  const [snapshotPreview, setSnapshotPreview] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(3);
  const [showTilt, setShowTilt] = useState(false); // ★ NEW

  const [hwZoomSupported, setHwZoomSupported] = useState(false);

  // Canvas scaling
  const canvasScale = isMobile
    ? Math.min(
        window.innerWidth / BACKGROUND_WIDTH,
        window.innerHeight / BACKGROUND_HEIGHT,
        1
      )
    : 1;
  const canvasWidth = BACKGROUND_WIDTH * canvasScale;
  const canvasHeight = BACKGROUND_HEIGHT * canvasScale;

  // Reposition vehicle on scale change (for mobile placement)
  useEffect(() => {
    setX(initialX * canvasScale);
    setY(initialY * canvasScale);
  }, [canvasScale, initialX, initialY]);

  function useIsPortrait() {
    const [isPortrait, setIsPortrait] = useState(
      () => window.matchMedia("(orientation: portrait)").matches
    );

    useEffect(() => {
      const mq = window.matchMedia("(orientation: portrait)");
      const handler = (e) => setIsPortrait(e.matches); // e.matches === true ⇒ portrait

      // modern & legacy support
      mq.addEventListener
        ? mq.addEventListener("change", handler)
        : mq.addListener(handler);

      return () =>
        mq.removeEventListener
          ? mq.removeEventListener("change", handler)
          : mq.removeListener(handler);
    }, []);

    return isPortrait;
  }

  const isPortrait = useIsPortrait();

  useEffect(() => {
    setForceLandscape(Boolean(isPortrait));
  }, [isPortrait]);

  // Load background
  useEffect(() => {
    axios
      .get("/images/background", { params: { imageId, labelId } })
      .then((res) => setBgUrl(res.data.backgroundUrl))
      .catch(() => message.error("Failed to load background"))
      .finally(() => setLoading(false));
  }, [imageId, labelId]);

  // Track natural vehicle size
  const handleImageLoad = (e) =>
    setNaturalSize({
      width: e.target.naturalWidth,
      height: e.target.naturalHeight,
    });

  // Compute vehicle dimensions
  const { width: vehicleWidth, height: vehicleHeight } = (() => {
    const heightRatio = BACKGROUND_HEIGHT / naturalSize.height;
    const widthRatio = BACKGROUND_WIDTH / naturalSize.width;
    const base = Math.min(heightRatio, widthRatio, 1);
    const vs = base * scale * canvasScale;
    return { width: naturalSize.width * vs, height: naturalSize.height * vs };
  })();

  // Mouse down: start drag
  const onMouseDown = (e) => {
    e.preventDefault();
    if (isMobile) return; // ignore on mobile
    setDragging(true);
    setDragStart({ x: e.clientX - x, y: e.clientY - y });
  };

  // Touch start: either pinch or drag
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      // pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setPinchStartDistance(Math.hypot(dx, dy));
      setInitialPinchScale(scale);
      setPinching(true);
    } else if (e.touches.length === 1) {
      // drag start
      const t = e.touches[0];
      setDragging(true);
      setDragStart({ x: t.clientX - x, y: t.clientY - y });
    }
  };

  // Global move/end handlers
  useEffect(() => {
    const onMove = (e) => {
      if (pinching && e.touches && e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = dist / pinchStartDistance;
        setScale((prev) => {
          const newScale = initialPinchScale * factor;
          return Math.max(0.1, Math.min(newScale, 5));
        });
      } else if (dragging) {
        const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
        const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
        setX(clientX - dragStart.x);
        setY(clientY - dragStart.y);
      }
    };
    const onEnd = () => {
      setDragging(false);
      setPinching(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [dragging, dragStart, pinching, pinchStartDistance, initialPinchScale]);

  // Cleanup camera stream on component unmount
  useEffect(() => {
    return () => {
      if (liveStream) {
        liveStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [liveStream]);

  // Save adjustments
  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post("/images/adjust", {
        imageId,
        xAxis: Math.round(x / canvasScale),
        yAxis: Math.round(y / canvasScale),
        scaleAdjustment: parseFloat(scale.toFixed(3)),
        tiltAdjustment: tilt,
      });
      message.success("Image adjusted successfully");
      onSaveSuccess?.();
      onClose();
    } catch (e) {
      message.error("Adjustment failed");
      console.log(e);
    } finally {
      setSaving(false);
    }
  };

  const captureBackgroundImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 768;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const bgDataUrl = canvas.toDataURL("image/jpeg", 1.0);

    setSnapshotPreview(bgDataUrl); // trigger modal preview
  };

  const handleBackgroundSave = async () => {
    if (!snapshotPreview) return;

    setSaving(true);

    try {
      // Convert base64 to File
      const dataURLtoFile = (dataUrl, filename) => {
        const arr = dataUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        return new File([u8arr], filename, { type: mime });
      };

      const file = dataURLtoFile(snapshotPreview, "background.jpg");

      // Prepare form data if needed (depends on backend)
      const formData = new FormData();
      formData.append("vehicleId", vehicleId);
      formData.append("labelId", labelId);
      formData.append("background", file);

      // Send to backend
      await axios.post("/images/background", formData);
      handleSave(); // save adjustments first
      message.success("Background saved successfully");
    } catch (e) {
      message.error("Saving background failed");
      console.error(e);
    } finally {
      setSnapshotPreview(null); // close preview
      setSaving(false);

      // Stop the camera stream
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      setLiveStream(null);
      setUseLiveBackground(false);
    }
  };

  const handleZoomChange = (value) => {
    if (value < minZoom || value > maxZoom) return;
    setZoom(value);
  };

  const handleZoomCommit = async (value) => {
    if (!videoRef.current || !hwZoomSupported) return;
    const track = videoRef.current?.srcObject?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: value }] });
      videoRef.current.play().catch(console.error);
    } catch (err) {
      console.error("Zoom applyConstraints error:", err);
    }
  };

  if (loading) return <Spin fullscreen />;

  console.log("tilt value :", tilt);
  if (forceLandscape)
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div>
          <h2>Please rotate to landscape</h2>
          <p>Best in landscape orientation.</p>
        </div>
      </div>
    );

  // Options menu
  const menu = (
    <Menu>
      <Menu.Item
        key="toggleSlider"
        icon={<ArrowsAltOutlined />}
        onClick={() => {
          setShowSlider((s) => !s);
          setShowTilt(false);
        }}
      >
        Toggle Size
      </Menu.Item>
      <Menu.Item
        key="toggleTilt"
        icon={<UndoOutlined rotate={90} />} // reuse an icon
        onClick={() => {
          setShowSlider(false);
          setShowTilt((s) => !s);
        }} // ★ NEW (need a showTilt state)
      >
        Toggle Tilt
      </Menu.Item>
      <Menu.Item
        key="toggleArrows"
        icon={<DragOutlined />}
        onClick={() => setShowArrows((s) => !s)}
      >
        Toggle Arrows
      </Menu.Item>
      {/* {(isMobile || isTablet) &&
        userDealership === "Demo" && (
          <Menu.Item
            key="liveBackground"
            icon={<CameraOutlined />}
            onClick={async () => {
              try {
                const stream = await openRearCamera(); // reuse your existing function
                const track = stream.getVideoTracks()[0];
                const caps = track.getCapabilities();

                if (caps.zoom && track.applyConstraints) {
                  const initZoom = Math.min(
                    Math.max(1, caps.zoom.min),
                    caps.zoom.max
                  );
                  setMinZoom(caps.zoom.min);
                  setMaxZoom(4);
                  setZoom(initZoom);
                  setHwZoomSupported(true);
                  await track.applyConstraints({
                    advanced: [{ zoom: initZoom }],
                  });
                }

                setLiveStream(stream);
                setUseLiveBackground(true);
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  videoRef.current.play().catch(console.error);
                }
              } catch (err) {
                message.error("Failed to open camera");
                console.error("Live background camera error:", err);
              }
            }}
          >
            Live Background
          </Menu.Item>
        )} */}

      <Menu.Item
        key="reset"
        icon={<UndoOutlined />}
        onClick={() => {
          setX(initialX * canvasScale);
          setY(initialY * canvasScale);
          setScale(initialScale);
          setShowSlider(false);
          setShowArrows(false);
          setTilt(0);
        }}
      >
        Reset
      </Menu.Item>
    </Menu>
  );

  const containerStyle = {
    position: "relative",
    width: `${canvasWidth}px`,
    height: `${canvasHeight}px`,
    backgroundImage: `url(${BACKEND_URL}${bgUrl})`,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    border: "2px solid #333",
    overflow: "hidden",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#000",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      {!isMobile && !useLiveBackground && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 8,
            background: "#111",
            color: "#fff",
          }}
        >
          <Button onClick={onClose}>Cancel</Button>
          {showSlider && !showTilt ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
              }}
            >
              <span style={{ color: "#c0c0c0" }}>Adjust Vehicle Size</span>
              <Slider
                min={0.1}
                max={2.5}
                step={0.01}
                value={scale}
                onChange={setScale}
                style={{ width: 300, margin: 0 }}
              />
            </div>
          ) : showTilt ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
              }}
            >
              <span style={{ color: "#c0c0c0" }}>Adjust Tilt</span>
              <Slider
                autoFocus
                min={-15}
                max={15}
                step={0.5}
                value={tilt}
                onChange={(val) => setTilt(val)}
                style={{ width: 180, margin: 0 }}
              />
            </div>
          ) : (
            <span>Drag to adjust</span>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <Dropdown overlay={menu}>
              <Button icon={<SettingOutlined />}>Options</Button>
            </Dropdown>
            <Button
              loading={saving}
              icon={<SaveFilled />}
              type="primary"
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        </div>
      )}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "center",
        }}
      >
        <div
          ref={containerRef}
          className="image-adjustor-container"
          style={containerStyle}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          {snapshotPreview ? (
            // Show snapshot preview if available
            <img
              src={snapshotPreview}
              alt="Snapshot"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 1,
                pointerEvents: "none",
              }}
            />
          ) : (
            <></>
          )}
          {useLiveBackground && (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 0,
              }}
            />
          )}
          <img
            ref={imageRef}
            src={transparentUrl}
            alt="Vehicle"
            draggable={false}
            onLoad={handleImageLoad}
            style={{
              zIndex: 999,
              position: "absolute",
              left: x,
              top: y,
              width: `${vehicleWidth}px`,
              height: `${vehicleHeight}px`,
              transform: `rotate(${tilt}deg)`, // ★ NEW

              touchAction: isMobile ? "none" : "auto",
              cursor: dragging ? "grabbing" : "grab",
              userSelect: "none", // avoid accidental text selection
            }}
          />
          {!isMobile && showArrows && (
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <Button size="small" onClick={() => setY((p) => p - 5)}>
                🔼
              </Button>
              <div style={{ display: "flex", gap: 4 }}>
                <Button size="small" onClick={() => setX((p) => p - 5)}>
                  ◀️
                </Button>
                <Button size="small" onClick={() => setX((p) => p + 5)}>
                  ▶️
                </Button>
              </div>
              <Button size="small" onClick={() => setY((p) => p + 5)}>
                🔽
              </Button>
            </div>
          )}
        </div>
        {isMobile && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "30%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: 8,
              background: "rgba(0,0,0,0.0)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Dropdown overlay={menu}>
                <Button icon={<SettingOutlined />}>Options</Button>
              </Dropdown>
            </div>
            {!useLiveBackground && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                {/* Slider still available as fallback */}
                {showSlider && (
                  <Slider
                    min={0.1}
                    max={2}
                    step={0.01}
                    value={scale}
                    onChange={(val) => setScale(val)}
                    style={{ width: "100%" }}
                  />
                )}

                {showTilt && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexDirection: "column",
                    }}
                  >
                    <span style={{ color: "#c0c0c0" }}>Adjust Tilt</span>
                    <Slider
                      autoFocus
                      min={-15}
                      max={15}
                      step={0.5}
                      value={tilt}
                      onChange={(val) => setTilt(val)}
                      style={{ width: 180, margin: 0 }}
                    />
                  </div>
                )}

                {showArrows && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      alignItems: "center",
                    }}
                  >
                    <Button size="small" onClick={() => setY((p) => p - 5)}>
                      🔼
                    </Button>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button size="small" onClick={() => setX((p) => p - 5)}>
                        ◀️
                      </Button>
                      <Button size="small" onClick={() => setX((p) => p + 5)}>
                        ▶️
                      </Button>
                    </div>
                    <Button size="small" onClick={() => setY((p) => p + 5)}>
                      🔽
                    </Button>
                  </div>
                )}
              </div>
            )}
            {snapshotPreview ? (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "center",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <Button
                  loading={saving}
                  icon={<CheckOutlined />}
                  type="primary"
                  onClick={handleBackgroundSave}
                  color="primary"
                  shape="circle"
                  size="large"
                  variant="solid"
                ></Button>
                <Button
                  style={{ position: "absolute", bottom: 8, right: 8 }}
                  onClick={() => setSnapshotPreview(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : useLiveBackground ? (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "center",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <Button
                  loading={saving}
                  icon={<CameraOutlined />}
                  type="primary"
                  onClick={captureBackgroundImage}
                  color="danger"
                  shape="circle"
                  size="large"
                  variant="solid"
                  style={{
                    border: "3px solid #fff",
                    width: "64px",
                    height: "64px",
                  }}
                ></Button>
                {useLiveBackground && (
                  <div
                    style={{
                      position: "absolute",
                      left: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Button
                      shape="circle"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        handleZoomChange(zoom + 0.05);
                        handleZoomCommit(zoom + 0.05);
                      }}
                    />
                    <Slider
                      vertical
                      min={minZoom}
                      max={maxZoom}
                      step={0.05}
                      value={zoom}
                      onChange={handleZoomChange}
                      onAfterChange={handleZoomCommit}
                      style={{ height: 100 }}
                    />
                    <Button
                      shape="circle"
                      size="small"
                      icon={<MinusOutlined />}
                      onClick={() => {
                        handleZoomChange(zoom - 0.05);
                        handleZoomCommit(zoom - 0.05);
                      }}
                    />
                  </div>
                )}

                <Button
                  style={{ position: "absolute", bottom: 8, right: 8 }}
                  onClick={() => setUseLiveBackground(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div
                style={{ display: "flex", gap: 8, justifyContent: "center" }}
              >
                <Button style={{ flex: 1 }} onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  style={{ flex: 1 }}
                  loading={saving}
                  icon={<SaveFilled />}
                  type="primary"
                  onClick={handleSave}
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageAdjustor;
