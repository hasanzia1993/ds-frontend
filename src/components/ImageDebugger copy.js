import React, { useRef, useState } from "react";
import { Button, InputNumber, Typography, Modal } from "antd";
import { BugOutlined, CloseOutlined } from "@ant-design/icons";

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
          width: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          marginRight: 16,
          gap: 8,
        }}
      >
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
          </div>
        )}
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
