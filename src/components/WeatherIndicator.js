import React from "react";
import { Button, Modal } from "antd";
import WeatherSelector from "./WeatherSelector";

const WeatherIndicator = ({ selectedWeather, onWeatherChange }) => {
  const [showWeatherModal, setShowWeatherModal] = React.useState(false);

  const weatherOptions = [
    {
      key: "sunny",
      icon: require("../assets/weather_icons/sunny.png"),
    },
    {
      key: "cloudy", 
      icon: require("../assets/weather_icons/cloudy.png"),
    },
    {
      key: "mixed",
      icon: require("../assets/weather_icons/mixed.png"),
    },
  ];

  const currentWeather = weatherOptions.find(w => w.key === selectedWeather);

  const handleWeatherSelect = (weatherKey) => {
    onWeatherChange(weatherKey);
    setShowWeatherModal(false);
  };

  return (
    <>
      <Button
        type="text"
        onClick={() => setShowWeatherModal(true)}
        style={{
          color: "#fff",
          padding: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "40px",
          height: "40px",
        }}
      >
        {currentWeather ? (
          <img
            src={currentWeather.icon}
            alt={selectedWeather}
            style={{
              width: "24px",
              height: "24px",
              objectFit: "contain",
            }}
          />
        ) : (
          <span style={{ fontSize: "16px" }}>🌤️</span>
        )}
      </Button>

      <Modal
        open={showWeatherModal}
        onCancel={() => setShowWeatherModal(false)}
        footer={null}
        width="100vw"
        style={{
          top: 0,
          padding: 0,
        }}
        styles={{
          body: {
            padding: 0,
            margin: 0,
          },
        }}
        destroyOnClose
      >
        <WeatherSelector
          selectedWeather={selectedWeather}
          onWeatherSelect={handleWeatherSelect}
          onContinue={() => setShowWeatherModal(false)}
        />
      </Modal>
    </>
  );
};

export default WeatherIndicator;
