import React from "react";
import { Button, Typography, Modal } from "antd"; // use Modal here
import { CheckOutlined, EditFilled } from "@ant-design/icons";

const { Text } = Typography;

const CameraCapturePreviewScreen = ({
  imageData,
  onRetake,
  onContinue,
  shotType,
  currentIndex,
  totalShots,
  onAdjust,
}) => {

  const handleRetake = () => {
    Modal.confirm({
      title: "Retake Photo?",
      content: "Are you sure you want to retake this photo?",
      okText: "Yes",
      cancelText: "No",
      onOk: onRetake,
    });
  };

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        backgroundColor: "#2c2c2c",
        color: "#fff",

        borderRadius: 8,
      }}
    >
      {/* Left - Snapshot Preview */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <img
          src={imageData}
          alt="Preview"
          style={{
            maxWidth: "100%",
            maxHeight: "85vh",
            border: "2px solid #fff",
            borderRadius: "8px",
            objectFit: "contain",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
            padding: "0 16px",
            width: "100%",
            maxWidth: "600px",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          <Text style={{ color: "#fff" }}>{shotType}</Text>
          <Text style={{ color: "#fff" }}>
            {currentIndex} / {totalShots}
          </Text>
        </div>
      </div>

      {/* Right - Actions */}
      <div
        style={{
          width: "200px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-around",
          alignItems: "center",
          gap: 12,
          padding: 16,
        }}
      >
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

        <Button
          type="default"
          onClick={onContinue}
          icon={<CheckOutlined style={{ color: "#fff" }} />}
          style={{
            background: "linear-gradient(135deg, #00D084 0%, #00A86B 100%)",
            border: "none",
            borderRadius: "50%",
            width: "56px",
            height: "56px",
            boxShadow: "0 4px 12px rgba(0, 168, 107, 0.4)",
            transition: "all 0.3s ease",
          }}
        />
        <Button
          type="text"
          onClick={handleRetake}
          style={{ color: "#ff922b" }}
          block
        >
          Retake
        </Button>
      </div>
    </div>
  );
};

export default CameraCapturePreviewScreen;
