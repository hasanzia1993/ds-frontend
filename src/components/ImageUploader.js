import React, { useState, useContext } from "react";
import { Modal, Upload, Button, Checkbox, Progress, message } from "antd";
import { UploadOutlined, InboxOutlined } from "@ant-design/icons";
import axios from "../axiosInstance";
import JwtContext from "../JwtContext";
import DealershipContext from "../contexts/DealershipContext";

//for capture image
export const handleUploadImage = async ({
  file,
  vehicleId,
  labelId,
  dealership,
  jwtToken,
  skipBGRemoval,
  onUploadProgress,
}) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("vehicleId", vehicleId);
  formData.append("labelId", labelId);
  formData.append("dealership", dealership);

  const { data } = await axios.post("/images", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${jwtToken}`,
    },
    onUploadProgress,
  });

  return data.imageUrl;
};

/* ── helper: single upload ─────────────────────────────── */
const handlerUploadImage = async ({
  file,
  vehicleId,
  labelId,
  dealership,
  jwtToken,
  skipBGRemoval, // 0 = remove / replace BG, 1 = skip BG removal
  onUploadProgress,
}) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("vehicleId", vehicleId);
  formData.append("labelId", labelId);
  formData.append("dealership", dealership);
  formData.append("skipBGRemoval", skipBGRemoval.toString());
  console.log("skipBGRemoval.toString", skipBGRemoval.toString());
  const { data } = await axios.post("/images", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${jwtToken}`,
    },
    onUploadProgress,
  });

  return data.imageUrl;
};

/* ── component ─────────────────────────────────────────── */
function ImageUploader({
  vehicleId,
  labelId,
  onUploadSuccess,
  requireBgRemoval = false,
  trigger = null, // Custom trigger component
}) {
  const { jwtToken } = useContext(JwtContext);
  const { selectedDealership } = useContext(DealershipContext);

  const [modalVisible, setModalVisible] = useState(false);
  const [removeBgChecked, setRemoveBgChecked] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /* open/close helpers */
  const openModal = () => setModalVisible(true);
  const closeModal = () => {
    setModalVisible(false);
    setUploadProgress(0);
    setRemoveBgChecked(false);
  };

  /* custom upload handler for Dragger */
  const customRequest = async ({ file, onError, onSuccess }) => {
    try {
      const imageUrl = await handlerUploadImage({
        file,
        vehicleId,
        labelId,
        dealership: selectedDealership,
        jwtToken,
        skipBGRemoval: !removeBgChecked,
        onUploadProgress: ({ loaded, total }) =>
          setUploadProgress(Math.round((loaded * 100) / total) - 1),
      });

      message.success("Image uploaded successfully");
      onUploadSuccess?.(imageUrl);
      onSuccess(null, file);
      closeModal();
    } catch (err) {
      message.error("Error uploading image");
      console.error("Upload failed:", err);
      onError(err);
      setUploadProgress(0);
    }
  };

  /* ── render ──────────────────────────────────────────── */
  return (
    <>
      {/* TRIGGER BUTTON */}
      {trigger ? (
        React.cloneElement(trigger, { onClick: openModal })
      ) : (
        <Button icon={<UploadOutlined />} onClick={openModal}>
          Upload
        </Button>
      )}

      {/* MODAL WITH DRAG & DROP */}
      <Modal
        title="Upload Image"
        open={modalVisible}
        onCancel={closeModal}
        footer={null}
        destroyOnClose
      >
        {requireBgRemoval && (
          <Checkbox
            style={{ marginBottom: 16 }}
            checked={removeBgChecked}
            onChange={(e) => setRemoveBgChecked(e.target.checked)}
          >
            Remove / replace background
          </Checkbox>
        )}

        <Upload.Dragger
          name="file"
          multiple={false}
          accept="image/*"
          showUploadList={false}
          customRequest={customRequest}
          style={{ padding: 20 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Click or drag image to this area to upload
          </p>
        </Upload.Dragger>

        {uploadProgress > 0 && (
          <Progress
            percent={uploadProgress}
            style={{ marginTop: 16 }}
            status={uploadProgress === 100 ? "success" : "active"}
          />
        )}
      </Modal>
    </>
  );
}

export default ImageUploader;
