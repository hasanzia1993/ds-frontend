import React, { useRef, useState, useCallback, useEffect } from "react";
import { BarcodeScanner } from "react-barcode-scanner";
import "react-barcode-scanner/polyfill";

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i;

const extractVinFromPayload = (rawValue) => {
  if (!rawValue.includes(",")) {
    return VIN_REGEX.test(rawValue.trim())
      ? rawValue.trim().toUpperCase()
      : null;
  }
  return (
    rawValue
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .find((t) => VIN_REGEX.test(t)) ?? null
  );
};

const createProcessedImage = (originalCanvas) => {
  const processedCanvas = document.createElement("canvas");
  processedCanvas.width = originalCanvas.width;
  processedCanvas.height = originalCanvas.height;
  const ctx = processedCanvas.getContext("2d");
  ctx.drawImage(originalCanvas, 0, 0);
  const imageData = ctx.getImageData(
    0,
    0,
    originalCanvas.width,
    originalCanvas.height
  );
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const luminance =
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const value = luminance > 80 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
  return processedCanvas;
};

const createEnhancedImage = (originalCanvas) => {
  const enhancedCanvas = document.createElement("canvas");
  enhancedCanvas.width = originalCanvas.width;
  enhancedCanvas.height = originalCanvas.height;
  const ctx = enhancedCanvas.getContext("2d");
  ctx.filter = "contrast(300%) brightness(130%) saturate(0%) blur(0.5px)";
  ctx.drawImage(originalCanvas, 0, 0);
  return enhancedCanvas;
};

const createInvertedImage = (originalCanvas) => {
  const invertedCanvas = document.createElement("canvas");
  invertedCanvas.width = originalCanvas.width;
  invertedCanvas.height = originalCanvas.height;
  const ctx = invertedCanvas.getContext("2d");
  ctx.filter = "invert(1) contrast(200%) brightness(130%) saturate(0%)";
  ctx.drawImage(originalCanvas, 0, 0);
  return invertedCanvas;
};

const performOCR = async (canvas) => {
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHJKLMNPRSTUVWXYZ0123456789",
      tessedit_pageseg_mode: "7",
      preserve_interword_spaces: "0",
    });
    const {
      data: { text },
    } = await worker.recognize(canvas);
    console.log("OCR text:", text);
    await worker.terminate();

    const strategies = [
      () => {
        const matches = text.match(/[A-HJ-NPR-Z0-9]{17}/gi);
        return matches?.[0]?.toUpperCase() ?? null;
      },
      () => {
        const cleaned = text.replace(/[^A-HJ-NPR-Z0-9]/gi, "").toUpperCase();
        return VIN_REGEX.test(cleaned) && cleaned.length === 17
          ? cleaned
          : null;
      },
      () => {
        const lines = text.split(/[\s]+/);
        for (const line of lines) {
          const cleanLine = line
            .replace(/[^A-HJ-NPR-Z0-9]/gi, "")
            .toUpperCase();
          if (VIN_REGEX.test(cleanLine) && cleanLine.length === 17) {
            return cleanLine;
          }
        }
        return null;
      },
      () => {
        const words = text
          .replace(/[^A-HJ-NPR-Z0-9\s]/gi, "")
          .toUpperCase()
          .split(/\s+/);
        for (let i = 0; i < words.length - 1; i++) {
          const combined = words[i] + words[i + 1];
          const cleaned = combined.replace(/[^A-HJ-NPR-Z0-9]/gi, "");
          if (cleaned.length >= 17) {
            for (let j = 0; j <= cleaned.length - 17; j++) {
              const candidate = cleaned.substr(j, 17);
              if (VIN_REGEX.test(candidate)) return candidate;
            }
          }
        }
        return null;
      },
      () => {
        const chars = text.match(/[A-HJ-NPR-Z0-9]/gi);
        if (chars?.length >= 17) {
          const reconstructed = chars.join("").toUpperCase();
          for (let i = 0; i <= reconstructed.length - 17; i++) {
            const candidate = reconstructed.substr(i, 17);
            if (VIN_REGEX.test(candidate)) return candidate;
          }
        }
        return null;
      },
    ];

    for (let i = 0; i < strategies.length; i++) {
      const result = strategies[i]();
      if (result) return result;
    }
    return null;
  } catch (err) {
    console.error("OCR Error:", err);
    return null;
  }
};

export default function BarcodeScannerWrapper({
  onVinDetected,
  scanLock,
  setScanning,
  paused,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [textScanMode, setTextScanMode] = useState(false);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!textScanMode || scanLock.current) return;
    const interval = setInterval(() => {
      handleTextScan();
    }, 1500);
    return () => clearInterval(interval);
  }, [textScanMode, scanLock]);

  const handleBarcodeCapture = useCallback(
    (barcodes) => {
      if (!barcodes.length || scanLock.current) return;
      const { rawValue, format } = barcodes[0];
      let vin =
        format === "qr_code"
          ? extractVinFromPayload(rawValue)
          : rawValue.trim();
      if (!vin) return;
      if (vin[0] === "l" || vin[0] === "I") vin = vin.slice(1);
      if (VIN_REGEX.test(vin)) {
        scanLock.current = true;
        onVinDetected(vin.toUpperCase());
        setScanning(false);
      }
    },
    [onVinDetected, setScanning, scanLock]
  );

  const getVideoElement = () => {
    // Look for video element within the container
    if (containerRef.current) {
      const video = containerRef.current.querySelector("video");
      if (video && video.readyState >= 2) {
        return video;
      }
    }
    return null;
  };

  const handleTextScan = useCallback(async () => {
    if (scanLock.current || isProcessing) return;
    setIsProcessing(true);

    try {
      const video = getVideoElement();
      if (!video) {
        console.log("Video element not found or not ready");
        return;
      }

      const canvas = canvasRef.current || document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Get the container dimensions to calculate the overlay area
      const containerRect = containerRef.current.getBoundingClientRect();
      const videoRect = video.getBoundingClientRect();

      // Calculate the actual video dimensions (accounting for object-fit)
      const videoAspectRatio = video.videoWidth / video.videoHeight;
      const containerAspectRatio = containerRect.width / containerRect.height;

      let actualVideoWidth, actualVideoHeight;
      if (videoAspectRatio > containerAspectRatio) {
        // Video is wider - height fills container
        actualVideoHeight = containerRect.height;
        actualVideoWidth = actualVideoHeight * videoAspectRatio;
      } else {
        // Video is taller - width fills container
        actualVideoWidth = containerRect.width;
        actualVideoHeight = actualVideoWidth / videoAspectRatio;
      }

      // Calculate the overlay dimensions based on text scan mode
      let overlayWidth, overlayHeight, overlayX, overlayY;

      if (textScanMode) {
        // Small horizontal rectangle for text scanning
        overlayWidth = actualVideoWidth * 0.8;
        overlayHeight = actualVideoHeight * 0.15;
      } else {
        // Large rectangle for barcode scanning
        overlayWidth = actualVideoWidth * 0.9;
        overlayHeight = actualVideoHeight * 0.8;
      }

      overlayX = (actualVideoWidth - overlayWidth) / 2;
      overlayY = (actualVideoHeight - overlayHeight) / 2;

      // Map overlay coordinates to video coordinates
      const scaleX = video.videoWidth / actualVideoWidth;
      const scaleY = video.videoHeight / actualVideoHeight;

      const cropX = overlayX * scaleX;
      const cropY = overlayY * scaleY;
      const cropWidth = overlayWidth * scaleX;
      const cropHeight = overlayHeight * scaleY;

      // Set canvas size to match the cropped area
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      // Draw the cropped portion of the video
      ctx.drawImage(
        video,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      // Perform OCR on different processed versions of the image
      let vin =
        (await performOCR(canvas)) ||
        (await performOCR(createProcessedImage(canvas))) ||
        (await performOCR(createEnhancedImage(canvas))) ||
        (await performOCR(createInvertedImage(canvas)));

      if (vin && VIN_REGEX.test(vin)) {
        scanLock.current = true;
        onVinDetected(vin);
        setScanning(false);
      }
    } catch (e) {
      console.error("Text scan failed:", e);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, scanLock, onVinDetected, setScanning, textScanMode]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        marginTop: 10,
        height: 300,
        overflow: "hidden",
      }}
    >
      <BarcodeScanner
        paused={paused}
        options={{ formats: ["code_39", "code_128", "qr_code"], delay: 500 }}
        onCapture={handleBarcodeCapture}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Overlay with cutout for the scanning area */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: textScanMode ? "80%" : "90%",
          height: textScanMode ? "15%" : "80%",
          pointerEvents: "none",
          border: "2px dashed white",
          boxShadow: "0 0 0 1000px rgba(0,0,0,0.5)",
        }}
      />

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setTextScanMode(!textScanMode)}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          padding: "5px 10px",
          backgroundColor: textScanMode ? "#dc3545" : "#28a745",
          color: "white",
          border: "none",
          borderRadius: "5px",
          fontSize: "12px",
          zIndex: 10,
        }}
      >
        {textScanMode ? "Stop Text Scan" : "Start Text Scan"}
      </button>

      {/* Instructions */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          right: 50,
          backgroundColor: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "8px",
          borderRadius: "4px",
          fontSize: "12px",
          textAlign: "center",
        }}
      >
        {textScanMode
          ? `Text scan mode active${
              isProcessing ? " (processing...)" : ""
            } — hold VIN in the small box`
          : "Point at barcode or tap 'Start Text Scan'"}
      </div>
    </div>
  );
}
