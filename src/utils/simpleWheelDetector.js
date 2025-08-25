// Simple and Direct Wheel Detection for Car Images
// Focuses on detecting dark circular patterns (wheels/tires)

export class SimpleWheelDetector {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
    console.log('Simple Wheel Detector initialized');
  }

  // Main detection function - simplified approach
  detectWheels(imageData, width, height) {
    console.log('Starting simple wheel detection...');
    
    if (!this.initialized) {
      throw new Error('Detector not initialized');
    }

    const wheels = [];
    const data = imageData.data;
    
    // Search in the bottom half of the image where wheels typically are
    const searchStartY = Math.floor(height * 0.5);
    const searchEndY = height - 20;
    
    console.log(`Searching for wheels from Y=${searchStartY} to Y=${searchEndY}`);
    
    // Grid search with reasonable spacing
    for (let y = searchStartY; y < searchEndY; y += 8) {
      for (let x = 20; x < width - 20; x += 8) {
        const wheelScore = this.calculateSimpleWheelScore(data, width, height, x, y);
        
        if (wheelScore > 0.4) {
          wheels.push({
            x,
            y,
            radius: 25,
            confidence: Math.min(99, wheelScore * 100),
            method: 'simple'
          });
        }
      }
    }
    
    console.log(`Found ${wheels.length} potential wheels before filtering`);
    
    // Remove overlapping detections
    const filteredWheels = this.filterOverlappingWheels(wheels);
    
    console.log(`Final wheel count: ${filteredWheels.length}`);
    return filteredWheels;
  }

  // Simple wheel scoring based on dark circular patterns
  calculateSimpleWheelScore(data, width, height, centerX, centerY) {
    let darkCount = 0;
    let totalCount = 0;
    let circularityScore = 0;
    
    // Check multiple radii to find circular dark patterns
    const radii = [12, 16, 20, 24, 28];
    
    radii.forEach(radius => {
      let radiusDarkCount = 0;
      let radiusTotal = 0;
      
      // Check points around the circle
      for (let angle = 0; angle < 360; angle += 12) {
        const rad = (angle * Math.PI) / 180;
        const x = Math.round(centerX + radius * Math.cos(rad));
        const y = Math.round(centerY + radius * Math.sin(rad));
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const brightness = (r + g + b) / 3;
          
          totalCount++;
          radiusTotal++;
          
          // Look for dark areas (tires are typically very dark)
          if (brightness < 80) {
            darkCount++;
            radiusDarkCount++;
          }
        }
      }
      
      // Calculate how circular the dark pattern is at this radius
      if (radiusTotal > 0) {
        const darkRatio = radiusDarkCount / radiusTotal;
        if (darkRatio > 0.4) { // Good dark circle
          circularityScore += darkRatio;
        }
      }
    });
    
    const overallDarkRatio = totalCount > 0 ? darkCount / totalCount : 0;
    const normalizedCircularity = circularityScore / radii.length;
    
    // Combine dark ratio with circularity
    const finalScore = (overallDarkRatio * 0.7) + (normalizedCircularity * 0.3);
    
    // Log detailed scoring for debugging
    if (finalScore > 0.3) {
      console.log(`Potential wheel at (${centerX}, ${centerY}): dark=${overallDarkRatio.toFixed(2)}, circular=${normalizedCircularity.toFixed(2)}, final=${finalScore.toFixed(2)}`);
    }
    
    return finalScore;
  }

  // Remove overlapping wheel detections
  filterOverlappingWheels(wheels) {
    // Sort by confidence (highest first)
    wheels.sort((a, b) => b.confidence - a.confidence);
    
    const filtered = [];
    const minDistance = 40; // Minimum distance between wheels
    
    wheels.forEach(wheel => {
      let isOverlapping = false;
      
      filtered.forEach(existing => {
        const distance = Math.sqrt(
          Math.pow(wheel.x - existing.x, 2) + 
          Math.pow(wheel.y - existing.y, 2)
        );
        
        if (distance < minDistance) {
          isOverlapping = true;
        }
      });
      
      if (!isOverlapping) {
        filtered.push(wheel);
      }
    });
    
    return filtered.slice(0, 4); // Maximum 4 wheels
  }

  // Calculate alignment between detected wheels and stencil positions
  calculateAlignment(wheels, stencilRegions, imageWidth, imageHeight) {
    console.log('Calculating alignment with stencil regions:', stencilRegions);
    console.log('Available wheels:', wheels);
    
    const alignments = {
      frontWheelAlignment: 0,
      rearWheelAlignment: 0,
      overallAlignment: 0
    };

    if (wheels.length === 0) {
      console.log('No wheels detected for alignment calculation');
      return alignments;
    }

    // Find best matching wheels for front and rear positions
    const frontWheel = this.findClosestWheel(wheels, stencilRegions.front);
    const rearWheel = this.findClosestWheel(wheels, stencilRegions.rear);

    console.log('Front wheel match:', frontWheel);
    console.log('Rear wheel match:', rearWheel);

    // Calculate alignment percentages
    if (frontWheel) {
      alignments.frontWheelAlignment = this.calculateWheelAlignmentPercentage(
        frontWheel, stencilRegions.front
      );
    }

    if (rearWheel) {
      alignments.rearWheelAlignment = this.calculateWheelAlignmentPercentage(
        rearWheel, stencilRegions.rear
      );
    }

    alignments.overallAlignment = (alignments.frontWheelAlignment + alignments.rearWheelAlignment) / 2;

    console.log('Final alignments:', alignments);
    return alignments;
  }

  // Find the closest wheel to a stencil region
  findClosestWheel(wheels, stencilRegion) {
    let closest = null;
    let minDistance = Infinity;

    wheels.forEach(wheel => {
      const distance = Math.sqrt(
        Math.pow(wheel.x - stencilRegion.x, 2) + 
        Math.pow(wheel.y - stencilRegion.y, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closest = wheel;
      }
    });

    return closest;
  }

  // Calculate alignment percentage between wheel and stencil
  calculateWheelAlignmentPercentage(wheel, stencilRegion) {
    const distance = Math.sqrt(
      Math.pow(wheel.x - stencilRegion.x, 2) + 
      Math.pow(wheel.y - stencilRegion.y, 2)
    );

    // Use stencil radius as tolerance
    const tolerance = stencilRegion.radius * 0.8; // 80% of stencil radius
    
    console.log(`Distance: ${distance.toFixed(1)}, Tolerance: ${tolerance.toFixed(1)}`);

    if (distance <= tolerance) {
      const percentage = 100 - (distance / tolerance) * 100;
      return Math.max(0, Math.min(100, percentage));
    }

    return 0;
  }
}

// Create and export singleton
const simpleWheelDetector = new SimpleWheelDetector();
export default simpleWheelDetector;

