import React, { useRef, useState, useCallback, useEffect } from "react";
import { BarcodeScanner } from "react-barcode-scanner";
import "react-barcode-scanner/polyfill";

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i;

// Character correction mapping for common OCR mistakes
const CHAR_CORRECTIONS = {
  0: ["O", "D", "Q"],
  1: ["I", "L", "|"],
  2: ["Z"],
  3: ["B"],
  4: ["A"],
  5: ["S"],
  6: ["G"],
  7: ["T"],
  8: ["B", "E"],
  9: ["Q"],
  A: ["4"],
  B: ["8", "3"],
  C: ["G"],
  D: ["0"],
  E: ["8", "F"],
  F: ["E", "P"],
  G: ["6", "C"],
  H: ["N"],
  J: ["I"],
  K: ["X"],
  L: ["1", "I"],
  M: ["N"],
  N: ["M", "H"],
  P: ["F", "R"],
  R: ["P"],
  S: ["5"],
  T: ["7"],
  U: ["V"],
  V: ["U"],
  W: ["V"],
  X: ["K"],
  Y: ["V"],
  Z: ["2"],
};

// VIN position validation - certain positions have restricted characters
const VIN_POSITION_RULES = {
  9: [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "J",
    "K",
    "L",
    "M",
    "N",
    "P",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ], // Check digit
  10: [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "J",
    "K",
    "L",
    "M",
    "N",
    "P",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
  ], // Model year
};

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

// Enhanced image processing functions
const createProcessedImage = (originalCanvas, options = {}) => {
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

  // Adaptive thresholding with configurable threshold
  const threshold = options.threshold || 80;

  for (let i = 0; i < data.length; i += 4) {
    const luminance =
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const value = luminance > threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);
  return processedCanvas;
};

const createEnhancedImage = (originalCanvas, options = {}) => {
  const enhancedCanvas = document.createElement("canvas");
  enhancedCanvas.width = originalCanvas.width;
  enhancedCanvas.height = originalCanvas.height;
  const ctx = enhancedCanvas.getContext("2d");

  const contrast = options.contrast || 300;
  const brightness = options.brightness || 130;
  const blur = options.blur || 0.5;

  ctx.filter = `contrast(${contrast}%) brightness(${brightness}%) saturate(0%) blur(${blur}px)`;
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

// Create scaled up image for better OCR accuracy
const createScaledImage = (originalCanvas, scale = 2) => {
  const scaledCanvas = document.createElement("canvas");
  scaledCanvas.width = originalCanvas.width * scale;
  scaledCanvas.height = originalCanvas.height * scale;
  const ctx = scaledCanvas.getContext("2d");

  ctx.imageSmoothingEnabled = false; // Preserve sharp edges
  ctx.drawImage(originalCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
  return scaledCanvas;
};

// VIN check digit validation
const calculateVinCheckDigit = (vin) => {
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const values = {
    A: 1,
    B: 2,
    C: 3,
    D: 4,
    E: 5,
    F: 6,
    G: 7,
    H: 8,
    J: 1,
    K: 2,
    L: 3,
    M: 4,
    N: 5,
    P: 7,
    R: 9,
    S: 2,
    T: 3,
    U: 4,
    V: 5,
    W: 6,
    X: 7,
    Y: 8,
    Z: 9,
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
  };

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    if (i === 8) continue; // Skip check digit position
    const char = vin[i];
    if (values[char] !== undefined) {
      sum += values[char] * weights[i];
    }
  }

  const remainder = sum % 11;
  return remainder === 10 ? "X" : remainder.toString();
};

// Validate VIN with check digit
const isValidVin = (vin) => {
  if (!VIN_REGEX.test(vin) || vin.length !== 17) return false;

  const checkDigit = calculateVinCheckDigit(vin);
  return checkDigit === vin[8];
};

// Generate character correction candidates
const generateCorrectionCandidates = (text) => {
  const candidates = [text];

  // Generate single character corrections
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const corrections = CHAR_CORRECTIONS[char];

    if (corrections) {
      corrections.forEach((correction) => {
        const candidate =
          text.substring(0, i) + correction + text.substring(i + 1);
        if (!candidates.includes(candidate)) {
          candidates.push(candidate);
        }
      });
    }
  }

  return candidates;
};

// Advanced OCR with multiple strategies and validation
const performOCR = async (canvas, attempt = 1) => {
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");

    // More restrictive OCR parameters for better accuracy
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHJKLMNPRSTUVWXYZ0123456789",
      tessedit_pageseg_mode: "7", // Single text line
      preserve_interword_spaces: "0",
      tessedit_do_invert: "0",
      classify_enable_learning: "0",
      classify_enable_adaptive_matcher: "1",
      textord_really_old_xheight: "1",
      textord_min_xheight: "10",
      tessedit_rejection_debug: "0",
    });

    const {
      data: { text, confidence },
    } = await worker.recognize(canvas);
    console.log(
      `OCR attempt ${attempt} - text: "${text}", confidence: ${confidence}`
    );
    await worker.terminate();

    // Multiple extraction strategies with character correction
    const strategies = [
      // Strategy 1: Direct regex match
      () => {
        const matches = text.match(/[A-HJ-NPR-Z0-9]{17}/gi);
        if (matches) {
          for (const match of matches) {
            const candidates = generateCorrectionCandidates(
              match.toUpperCase()
            );
            for (const candidate of candidates) {
              if (isValidVin(candidate)) {
                console.log(`Strategy 1 success: ${candidate} (from ${match})`);
                return candidate;
              }
            }
          }
        }
        return null;
      },

      // Strategy 2: Clean and validate
      () => {
        const cleaned = text.replace(/[^A-HJ-NPR-Z0-9]/gi, "").toUpperCase();
        if (cleaned.length >= 17) {
          for (let i = 0; i <= cleaned.length - 17; i++) {
            const candidate = cleaned.substr(i, 17);
            const candidates = generateCorrectionCandidates(candidate);
            for (const corrected of candidates) {
              if (isValidVin(corrected)) {
                console.log(
                  `Strategy 2 success: ${corrected} (from ${candidate})`
                );
                return corrected;
              }
            }
          }
        }
        return null;
      },

      // Strategy 3: Line by line processing
      () => {
        const lines = text.split(/[\r\n]+/);
        for (const line of lines) {
          const cleanLine = line
            .replace(/[^A-HJ-NPR-Z0-9]/gi, "")
            .toUpperCase();
          if (cleanLine.length >= 17) {
            for (let i = 0; i <= cleanLine.length - 17; i++) {
              const candidate = cleanLine.substr(i, 17);
              const candidates = generateCorrectionCandidates(candidate);
              for (const corrected of candidates) {
                if (isValidVin(corrected)) {
                  console.log(
                    `Strategy 3 success: ${corrected} (from ${candidate})`
                  );
                  return corrected;
                }
              }
            }
          }
        }
        return null;
      },

      // Strategy 4: Character reconstruction
      () => {
        const chars = text.match(/[A-HJ-NPR-Z0-9]/gi);
        if (chars?.length >= 17) {
          const reconstructed = chars.join("").toUpperCase();
          for (let i = 0; i <= reconstructed.length - 17; i++) {
            const candidate = reconstructed.substr(i, 17);
            const candidates = generateCorrectionCandidates(candidate);
            for (const corrected of candidates) {
              if (isValidVin(corrected)) {
                console.log(
                  `Strategy 4 success: ${corrected} (from ${candidate})`
                );
                return corrected;
              }
            }
          }
        }
        return null;
      },
    ];

    // Try each strategy
    for (let i = 0; i < strategies.length; i++) {
      const result = strategies[i]();
      if (result) return result;
    }

    return null;
  } catch (err) {
    console.error(`OCR Error (attempt ${attempt}):`, err);
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
  const [scanAttempts, setScanAttempts] = useState([]);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Slower, more thorough scanning interval
  useEffect(() => {
    if (!textScanMode || scanLock.current) return;

    const interval = setInterval(() => {
      handleTextScan();
    }, 3000); // Increased from 1500ms to 3000ms for more thorough processing

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
      if (isValidVin(vin.toUpperCase())) {
        scanLock.current = true;
        onVinDetected(vin.toUpperCase());
        setScanning(false);
      }
    },
    [onVinDetected, setScanning, scanLock]
  );

  const getVideoElement = () => {
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
    setCurrentAttempt((prev) => prev + 1);

    try {
      const video = getVideoElement();
      if (!video) {
        console.log("Video element not found or not ready");
        return;
      }

      const canvas = canvasRef.current || document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Get video dimensions and calculate crop area
      const containerRect = containerRef.current.getBoundingClientRect();
      const videoAspectRatio = video.videoWidth / video.videoHeight;
      const containerAspectRatio = containerRect.width / containerRect.height;

      let actualVideoWidth, actualVideoHeight;
      if (videoAspectRatio > containerAspectRatio) {
        actualVideoHeight = containerRect.height;
        actualVideoWidth = actualVideoHeight * videoAspectRatio;
      } else {
        actualVideoWidth = containerRect.width;
        actualVideoHeight = actualVideoWidth / videoAspectRatio;
      }

      // Enhanced overlay dimensions for text scanning
      const overlayWidth = actualVideoWidth * 0.85;
      const overlayHeight = actualVideoHeight * 0.2; // Slightly larger for better capture
      const overlayX = (actualVideoWidth - overlayWidth) / 2;
      const overlayY = (actualVideoHeight - overlayHeight) / 2;

      const scaleX = video.videoWidth / actualVideoWidth;
      const scaleY = video.videoHeight / actualVideoHeight;

      const cropX = overlayX * scaleX;
      const cropY = overlayY * scaleY;
      const cropWidth = overlayWidth * scaleX;
      const cropHeight = overlayHeight * scaleY;

      canvas.width = cropWidth;
      canvas.height = cropHeight;

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

      // Try multiple image processing approaches with different parameters
      const imageVariations = [
        createScaledImage(canvas, 3), // Scale up 3x for better OCR
        createScaledImage(createProcessedImage(canvas, { threshold: 100 }), 2),
        createScaledImage(createProcessedImage(canvas, { threshold: 60 }), 2),
        createScaledImage(
          createEnhancedImage(canvas, {
            contrast: 400,
            brightness: 140,
            blur: 0.3,
          }),
          2
        ),
        createScaledImage(
          createEnhancedImage(canvas, {
            contrast: 250,
            brightness: 120,
            blur: 0.7,
          }),
          2
        ),
        createScaledImage(createInvertedImage(canvas), 2),
      ];

      console.log(
        `Starting OCR attempt ${currentAttempt} with ${imageVariations.length} image variations`
      );

      // Try OCR on each image variation
      for (let i = 0; i < imageVariations.length; i++) {
        console.log(
          `Trying image variation ${i + 1}/${imageVariations.length}`
        );
        const vin = await performOCR(imageVariations[i], currentAttempt);

        if (vin && isValidVin(vin)) {
          console.log(`✅ VIN found: ${vin} (variation ${i + 1})`);
          scanLock.current = true;
          onVinDetected(vin);
          setScanning(false);
          setScanAttempts((prev) => [
            ...prev,
            { attempt: currentAttempt, success: true, vin },
          ]);
          return;
        }
      }

      console.log(
        `❌ OCR attempt ${currentAttempt} failed - no valid VIN found`
      );
      setScanAttempts((prev) => [
        ...prev,
        { attempt: currentAttempt, success: false },
      ]);
    } catch (e) {
      console.error("Text scan failed:", e);
      setScanAttempts((prev) => [
        ...prev,
        { attempt: currentAttempt, success: false, error: e.message },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, scanLock, onVinDetected, setScanning, currentAttempt]);

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

      {/* Enhanced overlay with more precise scanning area */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: textScanMode ? "85%" : "90%",
          height: textScanMode ? "20%" : "80%",
          pointerEvents: "none",
          border: "2px dashed white",
          boxShadow: "0 0 0 1000px rgba(0,0,0,0.5)",
        }}
      />

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => {
          setTextScanMode(!textScanMode);
          setScanAttempts([]);
          setCurrentAttempt(0);
        }}
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

      {/* Enhanced instructions with attempt counter */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          right: 120,
          backgroundColor: "rgba(0,0,0,0.8)",
          color: "white",
          padding: "8px",
          borderRadius: "4px",
          fontSize: "11px",
          textAlign: "center",
        }}
      >
        {textScanMode ? (
          <div>
            <div>Enhanced text scan mode active</div>
            <div style={{ fontSize: "10px", marginTop: "2px" }}>
              {isProcessing
                ? "🔍 Deep scanning..."
                : `Attempt ${currentAttempt} | Hold VIN steady in box`}
            </div>
            {scanAttempts.length > 0 && (
              <div style={{ fontSize: "9px", marginTop: "2px" }}>
                Success: {scanAttempts.filter((a) => a.success).length}/
                {scanAttempts.length}
              </div>
            )}
          </div>
        ) : (
          "Point at barcode or tap 'Start Text Scan'"
        )}
      </div>
    </div>
  );
}
