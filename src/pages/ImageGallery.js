// src/components/ImageGallery.js
import React, { useEffect, useState } from "react";
import { Card, Row, Col, Button } from "antd";
import axios from "../axiosInstance";
import { BACKEND_URL } from "../constants";

function ImageGallery({ vehicleId }) {
  const [images, setImages] = useState([]);

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  const fetchImages = () => {
    axios
      .get(`/images?vehicleId=${vehicleId}`, { withCredentials: true })
      .then((res) => {
        setImages(res.data);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  return (
    <div>
      <h2>Image Gallery</h2>
      <Row gutter={[16, 16]}>
        {images.map((img) => (
          <Col key={img.id} xs={24} sm={12} md={8} lg={6}>
            <Card
              cover={
                <img alt="vehicle" src={`${BACKEND_URL}/uploads/${img.path}`} />
              }
            >
              <Card.Meta title={img.Label ? img.Label.name : "No Label"} />
              <Button
                href={`${BACKEND_URL}/uploads/${img.path}`}
                download
                style={{ marginTop: "10px" }}
              >
                Download
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

export default ImageGallery;
