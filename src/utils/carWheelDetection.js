// Car and Wheel Detection System
// First identifies the car, then finds wheels within the car boundaries

export class CarWheelDetector {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // For now, we'll use a simple but effective approach
      // In the future, this could use TensorFlow.js models for car detection
      this.initialized = true;
      console.log('Car Wheel Detector initialized');
    } catch (error) {
      console.error('Failed to initialize Car Wheel Detector:', error);
      throw error;
    }
  }

  // Main detection function
  detectCarAndWheels(imageData, width, height) {
    console.log('Detecting car and wheels...');
    
    if (!this.initialized) {
      throw new Error('Detector not initialized');
    }

    // Step 1: Detect car boundaries
    const carBounds = this.detectCarBoundaries(imageData, width, height);
    console.log('Car bounds detected:', carBounds);

    if (!carBounds) {
      return [];
    }

    // Step 2: Detect wheels within car boundaries
    const wheels = this.detectWheelsInCar(imageData, width, height, carBounds);
    console.log('Wheels detected in car:', wheels.length);

    return wheels;
  }

  // Detect car boundaries using edge detection and contour analysis
  detectCarBoundaries(imageData, width, height) {
    const data = imageData.data;
    
    // Try multiple approaches to find the car
    let carBounds = null;
    
    // Approach 1: Look for large non-background regions
    carBounds = this.findCarByColorDifference(data, width, height);
    if (carBounds) {
      console.log('Car found by color difference:', carBounds);
      return carBounds;
    }
    
    // Approach 2: Use simpler region growing
    carBounds = this.findCarByRegionGrowing(data, width, height);
    if (carBounds) {
      console.log('Car found by region growing:', carBounds);
      return carBounds;
    }
    
    // Approach 3: Fallback - assume the center portion contains the car
    console.log('Using fallback car detection');
    return {
      left: Math.floor(width * 0.1),
      right: Math.floor(width * 0.9),
      top: Math.floor(height * 0.2),
      bottom: Math.floor(height * 0.9),
      width: Math.floor(width * 0.8),
      height: Math.floor(height * 0.7)
    };
  }

  // Find a car region starting from a point
  findCarRegion(data, width, height, startX, startY) {
    // Look for a large dark region with rectangular shape
    let left = startX;
    let right = startX;
    let top = startY;
    let bottom = startY;
    
    // Expand right
    for (let x = startX; x < width - 10; x += 5) {
      if (this.isCarPixel(data, width, x, startY)) {
        right = x;
      } else {
        break;
      }
    }
    
    // Expand left
    for (let x = startX; x > 10; x -= 5) {
      if (this.isCarPixel(data, width, x, startY)) {
        left = x;
      } else {
        break;
      }
    }
    
    // Expand down
    for (let y = startY; y < height - 10; y += 5) {
      let hasCarPixel = false;
      for (let x = left; x <= right; x += 5) {
        if (this.isCarPixel(data, width, x, y)) {
          hasCarPixel = true;
          break;
        }
      }
      if (hasCarPixel) {
        bottom = y;
      } else {
        break;
      }
    }
    
    // Expand up
    for (let y = startY; y > 10; y -= 5) {
      let hasCarPixel = false;
      for (let x = left; x <= right; x += 5) {
        if (this.isCarPixel(data, width, x, y)) {
          hasCarPixel = true;
          break;
        }
      }
      if (hasCarPixel) {
        top = y;
      } else {
        break;
      }
    }
    
    // Check if the region is large enough to be a car
    const width_region = right - left;
    const height_region = bottom - top;
    const aspectRatio = width_region / height_region;
    
    if (width_region > 100 && height_region > 50 && aspectRatio > 1.5 && aspectRatio < 4) {
      return { left, right, top, bottom, width: width_region, height: height_region };
    }
    
    return null;
  }

  // New method: Find car by color difference from background
  findCarByColorDifference(data, width, height) {
    // Sample background color from edges
    const bgColor = this.sampleBackgroundColor(data, width, height);
    console.log('Background color sampled:', bgColor);
    
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let carPixelCount = 0;
    
    // Find pixels that are significantly different from background
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Calculate color difference from background
        const colorDiff = Math.abs(r - bgColor.r) + Math.abs(g - bgColor.g) + Math.abs(b - bgColor.b);
        
        if (colorDiff > 30) { // More sensitive for beige cars
          carPixelCount++;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    if (carPixelCount > 1000 && maxX > minX && maxY > minY) {
      return {
        left: minX,
        right: maxX,
        top: minY,
        bottom: maxY,
        width: maxX - minX,
        height: maxY - minY
      };
    }
    
    return null;
  }

  // Sample background color from image edges
  sampleBackgroundColor(data, width, height) {
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    
    // Sample from edges (top, bottom, left, right)
    const edgePixels = [];
    
    // Top edge
    for (let x = 0; x < width; x += 10) {
      edgePixels.push([x, 0]);
    }
    // Bottom edge
    for (let x = 0; x < width; x += 10) {
      edgePixels.push([x, height - 1]);
    }
    // Left edge
    for (let y = 0; y < height; y += 10) {
      edgePixels.push([0, y]);
    }
    // Right edge
    for (let y = 0; y < height; y += 10) {
      edgePixels.push([width - 1, y]);
    }
    
    edgePixels.forEach(([x, y]) => {
      const idx = (y * width + x) * 4;
      rSum += data[idx];
      gSum += data[idx + 1];
      bSum += data[idx + 2];
      count++;
    });
    
    return {
      r: Math.floor(rSum / count),
      g: Math.floor(gSum / count),
      b: Math.floor(bSum / count)
    };
  }

  // Simple region growing approach
  findCarByRegionGrowing(data, width, height) {
    // Start from center and grow outwards
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    let minX = centerX, maxX = centerX, minY = centerY, maxY = centerY;
    
    // Expand outwards looking for consistent regions
    for (let radius = 50; radius < Math.min(width, height) / 3; radius += 20) {
      let hasContent = false;
      
      // Check if there's content at this radius
      for (let angle = 0; angle < 360; angle += 30) {
        const rad = (angle * Math.PI) / 180;
        const x = Math.floor(centerX + radius * Math.cos(rad));
        const y = Math.floor(centerY + radius * Math.sin(rad));
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          if (this.hasObjectContent(data, width, x, y)) {
            hasContent = true;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }
      
      if (!hasContent) break;
    }
    
    const carWidth = maxX - minX;
    const carHeight = maxY - minY;
    
    if (carWidth > 100 && carHeight > 50) {
      return {
        left: minX,
        right: maxX,
        top: minY,
        bottom: maxY,
        width: carWidth,
        height: carHeight
      };
    }
    
    return null;
  }

  // Check if a pixel has object content (not background)
  hasObjectContent(data, width, x, y) {
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    
    // More flexible object detection
    // Check if it's significantly different from typical indoor backgrounds
    const isWhiteWall = r > 240 && g > 240 && b > 240;
    const isWindow = r > 200 && g > 220 && b > 240; // Blueish window light
    const isFloor = (r > 120 && r < 180) && (g > 100 && g < 160) && (b > 80 && b < 140); // Brown wood floor
    
    return !isWhiteWall && !isWindow && !isFloor;
  }

  // Check if a pixel is part of the car
  isCarPixel(data, width, x, y) {
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    
    // Car pixels are typically darker than background
    return r < 150 && g < 150 && b < 150;
  }

  // Detect wheels within the car boundaries
  detectWheelsInCar(imageData, width, height, carBounds) {
    const wheels = [];
    const data = imageData.data;
    
    // Focus on the bottom portion of the car where wheels are
    const wheelSearchArea = {
      left: carBounds.left + 20,
      right: carBounds.right - 20,
      top: carBounds.bottom - Math.floor(carBounds.height * 0.4), // Bottom 40% of car
      bottom: carBounds.bottom - 10
    };
    
    console.log('Searching for wheels in area:', wheelSearchArea);
    
    // Look for wheel patterns in the search area
    for (let y = wheelSearchArea.top; y < wheelSearchArea.bottom; y += 3) {
      for (let x = wheelSearchArea.left; x < wheelSearchArea.right; x += 3) {
        const wheelScore = this.calculateWheelScore(data, width, height, x, y, carBounds);
        
        if (wheelScore > 0.15) { // Very lenient threshold for black wheels
          wheels.push({
            x,
            y,
            radius: 20,
            confidence: wheelScore * 100,
            method: 'car-based'
          });
        }
      }
    }
    
    // Remove duplicates and keep best candidates
    const uniqueWheels = this.removeDuplicateWheels(wheels);
    return uniqueWheels.slice(0, 4); // Return top 4 wheels
  }

  // Calculate wheel score within car context
  calculateWheelScore(data, width, height, centerX, centerY, carBounds) {
    let veryDarkPixels = 0; // Black tire/wheel areas
    let darkPixels = 0;     // General dark areas
    let totalPixels = 0;
    let rimPixels = 0;      // Metallic rim areas
    let circularPattern = 0; // How circular the pattern is
    
    // Check circular pattern around the center with multiple radii
    for (let radius = 10; radius <= 35; radius += 3) {
      let radiusVeryDark = 0;
      let radiusTotal = 0;
      
      for (let angle = 0; angle < 360; angle += 10) {
        const rad = (angle * Math.PI) / 180;
        const x = Math.round(centerX + radius * Math.cos(rad));
        const y = Math.round(centerY + radius * Math.sin(rad));
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const brightness = (r + g + b) / 3;
          
          totalPixels++;
          radiusTotal++;
          
          // Look for very dark areas (black tires/wheels like in the image)
          if (brightness < 60) {
            veryDarkPixels++;
            radiusVeryDark++;
          } else if (brightness < 100) {
            darkPixels++;
          }
          
          // Look for metallic rim areas (moderate brightness with metallic properties)
          if (brightness > 80 && brightness < 150) {
            const rg_diff = Math.abs(r - g);
            const rb_diff = Math.abs(r - b);
            const gb_diff = Math.abs(g - b);
            
            // Metallic surfaces have low color variation
            if (rg_diff < 20 && rb_diff < 20 && gb_diff < 20) {
              rimPixels++;
            }
          }
        }
      }
      
      // Check how circular the dark pattern is at this radius
      if (radiusTotal > 0) {
        const darkRatioAtRadius = radiusVeryDark / radiusTotal;
        if (darkRatioAtRadius > 0.3) { // Good circular pattern
          circularPattern += darkRatioAtRadius;
        }
      }
    }
    
    const veryDarkRatio = totalPixels > 0 ? veryDarkPixels / totalPixels : 0;
    const darkRatio = totalPixels > 0 ? darkPixels / totalPixels : 0;
    const rimRatio = totalPixels > 0 ? rimPixels / totalPixels : 0;
    const circularScore = circularPattern / 10; // Normalize
    
    // For black wheels on light car, prioritize very dark areas
    const wheelScore = (veryDarkRatio * 0.6) + (darkRatio * 0.2) + (rimRatio * 0.1) + (circularScore * 0.1);
    
    // Extra bonus for being in the wheel area of the car
    const carWheelAreaY = carBounds.bottom - (carBounds.height * 0.25); // Bottom 25%
    if (centerY > carWheelAreaY) {
      return wheelScore * 1.5; // Strong boost for wheel area
    }
    
    console.log(`Wheel score at (${centerX}, ${centerY}):`, {
      veryDarkRatio: veryDarkRatio.toFixed(3),
      darkRatio: darkRatio.toFixed(3),
      rimRatio: rimRatio.toFixed(3),
      circularScore: circularScore.toFixed(3),
      finalScore: wheelScore.toFixed(3)
    });
    
    return wheelScore;
  }

  // Remove duplicate wheels
  removeDuplicateWheels(wheels) {
    const uniqueWheels = [];
    
    for (const wheel of wheels) {
      let isDuplicate = false;
      
      for (const existing of uniqueWheels) {
        const distance = Math.sqrt(
          Math.pow(wheel.x - existing.x, 2) + 
          Math.pow(wheel.y - existing.y, 2)
        );
        
        if (distance < 25) { // If wheels are within 25 pixels
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

  // Calculate alignment between detected wheels and stencil positions
  calculateAlignment(wheels, stencilRegions, imageWidth, imageHeight) {
    const alignments = {
      frontWheelAlignment: 0,
      rearWheelAlignment: 0,
      overallAlignment: 0
    };

    if (wheels.length === 0) {
      return alignments;
    }

    // Find best matching wheels for front and rear positions
    const frontWheel = this.findBestWheelMatch(wheels, stencilRegions.front);
    const rearWheel = this.findBestWheelMatch(wheels, stencilRegions.rear);

    // Calculate alignment percentages
    if (frontWheel) {
      alignments.frontWheelAlignment = this.calculateWheelAlignmentPercentage(
        frontWheel, stencilRegions.front, imageWidth, imageHeight
      );
    }

    if (rearWheel) {
      alignments.rearWheelAlignment = this.calculateWheelAlignmentPercentage(
        rearWheel, stencilRegions.rear, imageWidth, imageHeight
      );
    }

    alignments.overallAlignment = (alignments.frontWheelAlignment + alignments.rearWheelAlignment) / 2;

    return alignments;
  }

  // Find best matching wheel for a stencil region
  findBestWheelMatch(wheels, stencilRegion) {
    let bestMatch = null;
    let bestDistance = Infinity;

    wheels.forEach(wheel => {
      const distance = Math.sqrt(
        Math.pow(wheel.x - stencilRegion.x, 2) + 
        Math.pow(wheel.y - stencilRegion.y, 2)
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = wheel;
      }
    });

    return bestMatch;
  }

  // Calculate alignment percentage
  calculateWheelAlignmentPercentage(wheel, stencilRegion, imageWidth, imageHeight) {
    const distance = Math.sqrt(
      Math.pow(wheel.x - stencilRegion.x, 2) + 
      Math.pow(wheel.y - stencilRegion.y, 2)
    );

    // Use a reasonable tolerance based on wheel size
    const tolerance = stencilRegion.radius * 0.4; // 40% tolerance
    const maxDistance = tolerance;

    // Calculate percentage
    let percentage = 0;
    if (distance <= maxDistance) {
      percentage = 100 - (distance / maxDistance) * 100;
    }

    return Math.max(0, Math.min(100, percentage));
  }
}

// Create singleton instance
const carWheelDetector = new CarWheelDetector();
export default carWheelDetector;
