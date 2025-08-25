// Simple but effective wheel detection using TensorFlow.js
// This approach uses image processing techniques that work well for wheel detection

export class TensorFlowWheelDetector {
  constructor() {
    this.initialized = false;
    this.tf = null;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Dynamically import TensorFlow.js
      this.tf = await import('@tensorflow/tfjs');
      this.initialized = true;
      console.log('TensorFlow Wheel Detector initialized');
    } catch (error) {
      console.error('Failed to initialize TensorFlow:', error);
      // Fallback to pure JavaScript implementation
      this.initialized = true;
      console.log('Using fallback wheel detection');
    }
  }

  // Convert image data to tensor
  imageDataToTensor(imageData, width, height) {
    if (this.tf) {
      // Use TensorFlow.js for processing
      const data = new Uint8Array(imageData.data);
      const tensor = this.tf.tensor3d(data, [height, width, 4]);
      return tensor;
    } else {
      // Fallback to regular array
      return imageData.data;
    }
  }

  // Detect wheels using multiple techniques
  detectWheels(imageData, width, height) {
    console.log('Detecting wheels with dimensions:', width, 'x', height);
    
    if (!this.initialized) {
      throw new Error('Detector not initialized');
    }

    const wheelCandidates = [];
    const data = imageData.data;

    // Technique 1: Edge-based circle detection
    const edgeWheels = this.detectWheelsByEdges(data, width, height);
    wheelCandidates.push(...edgeWheels);

    // Technique 2: Color-based detection
    const colorWheels = this.detectWheelsByColor(data, width, height);
    wheelCandidates.push(...colorWheels);

    // Technique 3: Template matching for wheel patterns
    const templateWheels = this.detectWheelsByTemplate(data, width, height);
    wheelCandidates.push(...templateWheels);

    // Remove duplicates and sort by confidence
    const uniqueWheels = this.removeDuplicateWheels(wheelCandidates);
    uniqueWheels.sort((a, b) => b.confidence - a.confidence);

    console.log('Total wheel candidates found:', uniqueWheels.length);
    return uniqueWheels.slice(0, 6); // Return top 6 candidates
  }

  // Detect wheels by looking for circular edge patterns
  detectWheelsByEdges(data, width, height) {
    const wheels = [];
    const step = 3; // Smaller step for more precision
    
    // Focus on lower half of image where wheels are - more restrictive
    const startY = Math.floor(height * 0.6); // Start from 60% down instead of 40%
    const endY = height - 20;
    
    for (let y = startY; y < endY; y += step) {
      for (let x = 20; x < width - 20; x += step) {
        const centerIdx = (y * width + x) * 4;
        const centerR = data[centerIdx];
        const centerG = data[centerIdx + 1];
        const centerB = data[centerIdx + 2];
        
        // More strict dark pixel detection for wheel centers
        if (centerR < 70 && centerG < 70 && centerB < 70) {
          const circleScore = this.calculateCircleScore(data, width, height, x, y, 20);
          
          if (circleScore > 0.7) { // Higher threshold
            wheels.push({
              x,
              y,
              radius: 20,
              confidence: circleScore * 100,
              method: 'edge'
            });
          }
        }
      }
    }
    
    return wheels;
  }

  // Calculate how circular a region is
  calculateCircleScore(data, width, height, centerX, centerY, radius) {
    let edgePixels = 0;
    let totalPixels = 0;
    let darkPixels = 0;
    
    // Sample points around the circle
    for (let angle = 0; angle < 360; angle += 8) { // More precise sampling
      const rad = (angle * Math.PI) / 180;
      const x = Math.round(centerX + radius * Math.cos(rad));
      const y = Math.round(centerY + radius * Math.sin(rad));
      
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        totalPixels++;
        
        // Check for dark pixels (wheel characteristics)
        if (r < 80 && g < 80 && b < 80) {
          darkPixels++;
        }
        
        // Check for edge (contrast with center)
        const centerIdx = (centerY * width + centerX) * 4;
        const centerR = data[centerIdx];
        const centerG = data[centerIdx + 1];
        const centerB = data[centerIdx + 2];
        
        const contrast = Math.abs(r - centerR) + Math.abs(g - centerG) + Math.abs(b - centerB);
        if (contrast > 60) { // Higher contrast threshold
          edgePixels++;
        }
      }
    }
    
    const edgeRatio = totalPixels > 0 ? edgePixels / totalPixels : 0;
    const darkRatio = totalPixels > 0 ? darkPixels / totalPixels : 0;
    
    // Combine edge detection with dark pixel ratio for better accuracy
    return (edgeRatio * 0.6) + (darkRatio * 0.4);
  }

  // Detect wheels by color characteristics
  detectWheelsByColor(data, width, height) {
    const wheels = [];
    const step = 6; // Smaller step for more precision
    
    // Look for dark circular regions with specific color characteristics
    // Focus more on the bottom area where wheels actually are
    for (let y = Math.floor(height * 0.65); y < height - 30; y += step) {
      for (let x = 30; x < width - 30; x += step) {
        const centerIdx = (y * width + x) * 4;
        const r = data[centerIdx];
        const g = data[centerIdx + 1];
        const b = data[centerIdx + 2];
        
        // More strict dark pixel detection for wheels
        if (r < 60 && g < 60 && b < 60) {
          const colorVariation = this.calculateColorVariation(data, width, height, x, y, 15);
          
          if (colorVariation > 0.4) { // Higher threshold
            wheels.push({
              x,
              y,
              radius: 15,
              confidence: colorVariation * 70,
              method: 'color'
            });
          }
        }
      }
    }
    
    return wheels;
  }

  // Calculate color variation in a region
  calculateColorVariation(data, width, height, centerX, centerY, radius) {
    let totalVariation = 0;
    let sampleCount = 0;
    
    for (let angle = 0; angle < 360; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      const x = Math.round(centerX + radius * Math.cos(rad));
      const y = Math.round(centerY + radius * Math.sin(rad));
      
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        const centerIdx = (centerY * width + centerX) * 4;
        const centerR = data[centerIdx];
        const centerG = data[centerIdx + 1];
        const centerB = data[centerIdx + 2];
        
        const variation = Math.abs(r - centerR) + Math.abs(g - centerG) + Math.abs(b - centerB);
        totalVariation += variation;
        sampleCount++;
      }
    }
    
    return sampleCount > 0 ? totalVariation / (sampleCount * 255) : 0;
  }

  // Detect wheels using template matching approach
  detectWheelsByTemplate(data, width, height) {
    const wheels = [];
    const step = 8;
    
    // Look for wheel-like patterns - focus on bottom area
    for (let y = Math.floor(height * 0.7); y < height - 25; y += step) {
      for (let x = 25; x < width - 25; x += step) {
        const patternScore = this.calculateWheelPatternScore(data, width, height, x, y);
        
        if (patternScore > 0.6) { // Higher threshold
          wheels.push({
            x,
            y,
            radius: 25,
            confidence: patternScore * 80,
            method: 'template'
          });
        }
      }
    }
    
    return wheels;
  }

  // Calculate how much a region looks like a wheel pattern
  calculateWheelPatternScore(data, width, height, centerX, centerY) {
    let darkPixels = 0;
    let totalPixels = 0;
    let rimPixels = 0;
    
    // Check multiple concentric circles - focus on smaller radii for actual wheels
    for (let radius = 10; radius <= 25; radius += 3) {
      for (let angle = 0; angle < 360; angle += 6) {
        const rad = (angle * Math.PI) / 180;
        const x = Math.round(centerX + radius * Math.cos(rad));
        const y = Math.round(centerY + radius * Math.sin(rad));
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          totalPixels++;
          
          // Dark center - more strict
          if (r < 70 && g < 70 && b < 70) {
            darkPixels++;
          }
          
          // Rim detection (contrast with center)
          const centerIdx = (centerY * width + centerX) * 4;
          const centerR = data[centerIdx];
          const centerG = data[centerIdx + 1];
          const centerB = data[centerIdx + 2];
          
          const contrast = Math.abs(r - centerR) + Math.abs(g - centerG) + Math.abs(b - centerB);
          if (contrast > 70) { // Higher contrast threshold
            rimPixels++;
          }
        }
      }
    }
    
    const darkRatio = totalPixels > 0 ? darkPixels / totalPixels : 0;
    const rimRatio = totalPixels > 0 ? rimPixels / totalPixels : 0;
    
    // Wheel should have dark center and some rim contrast
    return (darkRatio * 0.8) + (rimRatio * 0.2);
  }

  // Remove duplicate wheels that are too close to each other
  removeDuplicateWheels(wheels) {
    const uniqueWheels = [];
    
    for (const wheel of wheels) {
      let isDuplicate = false;
      
      for (const existing of uniqueWheels) {
        const distance = Math.sqrt(
          Math.pow(wheel.x - existing.x, 2) + 
          Math.pow(wheel.y - existing.y, 2)
        );
        
        if (distance < 30) { // If wheels are within 30 pixels
          isDuplicate = true;
          // Keep the one with higher confidence
          if (wheel.confidence > existing.confidence) {
            const index = uniqueWheels.indexOf(existing);
            uniqueWheels[index] = wheel;
          }
          break;
        }
      }
      
      if (!isDuplicate) {
        uniqueWheels.push(wheel);
      }
    }
    
    return uniqueWheels;
  }
}

// Create singleton instance
const tensorFlowWheelDetector = new TensorFlowWheelDetector();
export default tensorFlowWheelDetector;
