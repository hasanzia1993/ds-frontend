import { loadOpenCV } from './loadOpenCV.js';

export class WheelDetector {
  constructor() {
    this.cv = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('Loading OpenCV...');
      this.cv = await loadOpenCV();
      console.log('OpenCV loaded successfully:', this.cv ? 'yes' : 'no');
      
      if (!this.cv) {
        throw new Error('OpenCV failed to load');
      }
      
      this.initialized = true;
      console.log('WheelDetector initialized with OpenCV');
    } catch (error) {
      console.error('Failed to initialize WheelDetector:', error);
      throw error;
    }
  }

  // Convert canvas to OpenCV Mat
  canvasToMat(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const mat = this.cv.matFromImageData(imageData);
    return mat;
  }

  // Detect wheels using multiple techniques
  detectWheels(imageData, width, height) {
    console.log('detectWheels called with dimensions:', width, 'x', height);
    
    if (!this.initialized) {
      throw new Error('WheelDetector not initialized');
    }

    if (!this.cv) {
      throw new Error('OpenCV not available');
    }

    // Create canvas and draw image data
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);

    // Convert to OpenCV Mat
    const src = this.canvasToMat(canvas);
    const gray = new this.cv.Mat();
    const blurred = new this.cv.Mat();
    const edges = new this.cv.Mat();
    const circles = new this.cv.Mat();

    try {
      // Convert to grayscale
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

      // Apply Gaussian blur to reduce noise
      this.cv.GaussianBlur(gray, blurred, new this.cv.Size(9, 9), 2, 2);

      // Detect circles using Hough Circle Transform
      this.cv.HoughCircles(
        blurred,
        circles,
        this.cv.HOUGH_GRADIENT,
        1,
        height / 8, // Minimum distance between circles
        100, // Upper threshold for edge detection
        30, // Threshold for center detection
        20, // Minimum radius
        100 // Maximum radius
      );

      const wheelCandidates = [];

      // Process detected circles
      for (let i = 0; i < circles.cols; i++) {
        const x = circles.data32F[i * 3];
        const y = circles.data32F[i * 3 + 1];
        const radius = circles.data32F[i * 3 + 2];

        // Filter circles based on position (wheels are typically in lower half)
        if (y > height * 0.4 && radius > 15 && radius < 80) {
          // Additional validation: check if the circle area has appropriate characteristics
          const isValidWheel = this.validateWheelCandidate(gray, x, y, radius);
          
          if (isValidWheel) {
            wheelCandidates.push({
              x: Math.round(x),
              y: Math.round(y),
              radius: Math.round(radius),
              confidence: this.calculateWheelConfidence(gray, x, y, radius)
            });
          }
        }
      }

      // Sort by confidence and return top candidates
      wheelCandidates.sort((a, b) => b.confidence - a.confidence);
      
      return wheelCandidates.slice(0, 4); // Return top 4 candidates

    } finally {
      // Clean up OpenCV Mat objects
      src.delete();
      gray.delete();
      blurred.delete();
      edges.delete();
      circles.delete();
    }
  }

  // Validate if a detected circle is likely a wheel
  validateWheelCandidate(grayMat, x, y, radius) {
    try {
      // Create a mask for the circle area
      const mask = new this.cv.Mat.zeros(grayMat.rows, grayMat.cols, this.cv.CV_8UC1);
      this.cv.circle(mask, new this.cv.Point(x, y), radius, new this.cv.Scalar(255), -1);

      // Calculate mean intensity inside the circle
      const meanIntensity = this.cv.mean(grayMat, mask);
      
      // Calculate standard deviation (texture measure)
      const stdDev = this.calculateStdDev(grayMat, mask, meanIntensity[0]);

      // Wheel characteristics:
      // - Should have moderate to low intensity (dark center)
      // - Should have some texture variation (rim details)
      const isValid = meanIntensity[0] < 120 && stdDev > 15;

      mask.delete();
      return isValid;

    } catch (error) {
      console.error('Error validating wheel candidate:', error);
      return false;
    }
  }

  // Calculate standard deviation for texture analysis
  calculateStdDev(grayMat, mask, meanValue) {
    try {
      const diff = new this.cv.Mat();
      this.cv.subtract(grayMat, new this.cv.Scalar(meanValue), diff);
      
      const squared = new this.cv.Mat();
      this.cv.multiply(diff, diff, squared);
      
      const meanSquared = this.cv.mean(squared, mask);
      const stdDev = Math.sqrt(meanSquared[0]);
      
      diff.delete();
      squared.delete();
      
      return stdDev;
    } catch (error) {
      console.error('Error calculating std dev:', error);
      return 0;
    }
  }

  // Calculate confidence score for a wheel candidate
  calculateWheelConfidence(grayMat, x, y, radius) {
    try {
      // Create annular mask (ring shape for wheel rim)
      const outerMask = new this.cv.Mat.zeros(grayMat.rows, grayMat.cols, this.cv.CV_8UC1);
      const innerMask = new this.cv.Mat.zeros(grayMat.rows, grayMat.cols, this.cv.CV_8UC1);
      
      this.cv.circle(outerMask, new this.cv.Point(x, y), radius, new this.cv.Scalar(255), -1);
      this.cv.circle(innerMask, new this.cv.Point(x, y), radius * 0.7, new this.cv.Scalar(255), -1);
      
      const annularMask = new this.cv.Mat();
      this.cv.subtract(outerMask, innerMask, annularMask);
      
      // Calculate contrast between rim and center
      const centerMean = this.cv.mean(grayMat, innerMask);
      const rimMean = this.cv.mean(grayMat, annularMask);
      
      const contrast = Math.abs(rimMean[0] - centerMean[0]);
      const confidence = Math.min(100, contrast / 2); // Normalize to 0-100
      
      // Clean up
      outerMask.delete();
      innerMask.delete();
      annularMask.delete();
      
      return confidence;
      
    } catch (error) {
      console.error('Error calculating confidence:', error);
      return 50; // Default confidence
    }
  }

  // Alternative method using contour detection
  detectWheelsByContours(imageData, width, height) {
    if (!this.initialized) {
      throw new Error('WheelDetector not initialized');
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);

    const src = this.canvasToMat(canvas);
    const gray = new this.cv.Mat();
    const binary = new this.cv.Mat();
    const contours = new this.cv.MatVector();
    const hierarchy = new this.cv.Mat();

    try {
      // Convert to grayscale
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

      // Apply threshold to create binary image
      this.cv.threshold(gray, binary, 50, 255, this.cv.THRESH_BINARY);

      // Find contours
      this.cv.findContours(binary, contours, hierarchy, this.cv.RETR_EXTERNAL, this.cv.CHAIN_APPROX_SIMPLE);

      const wheelCandidates = [];

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = this.cv.contourArea(contour);
        
        // Filter by area (wheels should be reasonably sized)
        if (area > 500 && area < 10000) {
          // Calculate circularity
          const perimeter = this.cv.arcLength(contour, true);
          const circularity = (4 * Math.PI * area) / (perimeter * perimeter);
          
          // Check if contour is roughly circular
          if (circularity > 0.6) {
            const moments = this.cv.moments(contour);
            const centerX = moments.m10 / moments.m00;
            const centerY = moments.m01 / moments.m00;
            
            // Only consider wheels in lower half of image
            if (centerY > height * 0.4) {
              wheelCandidates.push({
                x: Math.round(centerX),
                y: Math.round(centerY),
                radius: Math.round(Math.sqrt(area / Math.PI)),
                confidence: circularity * 100
              });
            }
          }
        }
      }

      return wheelCandidates.slice(0, 4);

    } finally {
      src.delete();
      gray.delete();
      binary.delete();
      contours.delete();
      hierarchy.delete();
    }
  }
}

// Create a singleton instance
const wheelDetector = new WheelDetector();
export default wheelDetector;
