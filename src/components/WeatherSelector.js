import React from "react";
import { Button, Typography, Row, Col } from "antd";
import { Card, CardContent } from "./ui/card";
import { Button as ShadCNButton } from "./ui/button";

const { Title, Text } = Typography;

const WeatherSelector = ({ onWeatherSelect, selectedWeather, onContinue }) => {
  const weatherOptions = [
    {
      key: "sunny",
      label: "Sunny",
      icon: require("../assets/weather_icons/sunny.png"),
    },
    {
      key: "cloudy", 
      label: "Cloudy",
      icon: require("../assets/weather_icons/cloudy.png"),
    },
    {
      key: "mixed",
      label: "Mixed",
      icon: require("../assets/weather_icons/mixed.png"),
    },
  ];

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
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <Title level={2} style={{ color: "#fff", marginBottom: "16px" }}>
          Select Weather Condition
        </Title>
        <Text style={{ color: "#ccc", fontSize: "16px" }}>
          Choose the current weather condition for your photo session
        </Text>
      </div>

      <Row gutter={[24, 24]} justify="center" style={{ width: "100%", maxWidth: "600px" }}>
        {weatherOptions.map((weather) => (
          <Col xs={24} sm={8} key={weather.key}>
            <Card
              style={{
                backgroundColor: selectedWeather === weather.key ? "#4a90e2" : "#3a3a3a",
                border: selectedWeather === weather.key ? "2px solid #4a90e2" : "2px solid #555",
                cursor: "pointer",
                transition: "all 0.3s ease",
                height: "200px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
              onClick={() => {
                onWeatherSelect(weather.key);
                onContinue();
              }}
              hoverable
            >
              <CardContent style={{ textAlign: "center", padding: "20px" }}>
                <img
                  src={weather.icon}
                  alt={weather.label}
                  style={{
                    width: "80px",
                    height: "80px",
                    objectFit: "contain",
                    marginBottom: "16px",
                  }}
                />
                <Text
                  style={{
                    color: "#fff",
                    fontSize: "18px",
                    fontWeight: "bold",
                    display: "block",
                  }}
                >
                  {weather.label}
                </Text>
              </CardContent>
            </Card>
          </Col>
        ))}
      </Row>


    </div>
  );
};

export default WeatherSelector;
