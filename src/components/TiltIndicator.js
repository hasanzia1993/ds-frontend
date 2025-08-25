export const TiltIndicator = ({ tiltY }) => {
  const isLevel = Math.abs(tiltY) < 0.9;
  const lineAngle = Math.max(-10, Math.min(10, tiltY * 0.5)); // subtle tilt

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        width: 120,
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Left half bracket */}
      <div
        style={{
          width: 6,
          height: 12,
          borderLeft: `2px solid ${isLevel ? "limegreen" : "red"}`,
          borderBottom: `2px solid ${isLevel ? "limegreen" : "red"}`,
          borderTop: `2px solid ${isLevel ? "limegreen" : "red"}`,
          marginRight: 4,
        }}
      />

      {/* Line with rotation */}
      <div
        style={{
          width: 100,
          height: 2,
          backgroundColor: isLevel ? "limegreen" : "red",
          transform: `rotate(${lineAngle}deg)`,
          transformOrigin: "center center",
          position: "relative",
          transition: "transform 0.2s ease",
        }}
      >
        {/* Bubble */}
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            backgroundColor: isLevel ? "limegreen" : "red",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: isLevel ? "0 0 10px 2px limegreen" : "none",
            transition:
              "background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
          }}
        />
      </div>

      {/* Right half bracket */}
      <div
        style={{
          width: 6,
          height: 12,
          borderRight: `2px solid ${isLevel ? "limegreen" : "red"}`,
          borderTop: `2px solid ${isLevel ? "limegreen" : "red"}`,
          borderBottom: `2px solid ${isLevel ? "limegreen" : "red"}`,
          marginLeft: 4,
        }}
      />
    </div>
  );
};
