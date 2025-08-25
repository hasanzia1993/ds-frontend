import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  Loader2, 
  Save, 
  Upload,
  Camera,
  Copy,
  Minus,
  Plus,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { BACKEND_URL } from '../constants';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Custom slider styles
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  .slider::-moz-range-thumb {
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;

const StudioTab = ({ 
  dealershipData, 
  vehicleSamples, 
  selectedSample, 
  setSelectedSample,
  onSave,
  saving,
  error,
  success
}) => {
  // State management
  const [activeShot, setActiveShot] = useState('frontQuarter');
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [currentShotForUpload, setCurrentShotForUpload] = useState(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [imgRef, setImgRef] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Interactive adjustor state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Shot types configuration
  const shotTypes = [
    { key: 'frontQuarter', label: 'Front Quarter' },
    { key: 'front', label: 'Front' },
    { key: 'side', label: 'Side' },
    { key: 'backQuarter', label: 'Back Quarter' },
    { key: 'back', label: 'Back' }
  ];

  // Handle mouse/touch events for dragging
  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    
    setIsDragging(true);
    const containerRect = containerRef.current.getBoundingClientRect();
    const currentPos = getCurrentPosition();
    
    // Calculate the current display position for drag calculation
    const dimensions = getVehicleDimensions();
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    
    const defaultLeft = Math.floor((containerWidth - dimensions.displayWidth) / 2);
    const defaultTop = containerHeight - dimensions.displayHeight;
    
    const currentDisplayLeft = defaultLeft + currentPos.left;
    const currentDisplayTop = defaultTop + currentPos.top;
    
    setDragStart({ 
      x: e.clientX - containerRect.left - currentDisplayLeft, 
      y: e.clientY - containerRect.top - currentDisplayTop
    });
  };

  const handleTouchStart = (e) => {
    if (!containerRef.current) return;
    
    setIsDragging(true);
    const containerRect = containerRef.current.getBoundingClientRect();
    const currentPos = getCurrentPosition();
    const touch = e.touches[0];
    
    // Calculate the current display position for drag calculation
    const dimensions = getVehicleDimensions();
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    
    const defaultLeft = Math.floor((containerWidth - dimensions.displayWidth) / 2);
    const defaultTop = containerHeight - dimensions.displayHeight;
    
    const currentDisplayLeft = defaultLeft + currentPos.left;
    const currentDisplayTop = defaultTop + currentPos.top;
    
    setDragStart({ 
      x: touch.clientX - containerRect.left - currentDisplayLeft, 
      y: touch.clientY - containerRect.top - currentDisplayTop
    });
  };

  // Handle mouse/touch move
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current || !dealershipData?.adjustments) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newX = e.clientX - containerRect.left - dragStart.x;
      const newY = e.clientY - containerRect.top - dragStart.y;
      
      // Calculate the adjustment offset from the default position
      const dimensions = getVehicleDimensions();
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;
      
      const defaultLeft = Math.floor((containerWidth - dimensions.displayWidth) / 2);
      const defaultTop = containerHeight - dimensions.displayHeight;
      
      const adjustmentLeft = Math.round(newX - defaultLeft);
      const adjustmentTop = Math.round(newY - defaultTop);
      
      handleAdjustmentChange('left', adjustmentLeft);
      handleAdjustmentChange('top', adjustmentTop);
    };

    const handleTouchMove = (e) => {
      if (!isDragging || !containerRef.current || !dealershipData?.adjustments) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const newX = touch.clientX - containerRect.left - dragStart.x;
      const newY = touch.clientY - containerRect.top - dragStart.y;
      
      // Calculate the adjustment offset from the default position
      const dimensions = getVehicleDimensions();
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;
      
      const defaultLeft = Math.floor((containerWidth - dimensions.displayWidth) / 2);
      const defaultTop = containerHeight - dimensions.displayHeight;
      
      const adjustmentLeft = Math.round(newX - defaultLeft);
      const adjustmentTop = Math.round(newY - defaultTop);
      
      handleAdjustmentChange('left', adjustmentLeft);
      handleAdjustmentChange('top', adjustmentTop);
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleTouchEnd = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragStart, activeShot, dealershipData?.adjustments]);

  // Get current position for the active shot
  const getCurrentPosition = () => {
    // Early return if no data
    if (!dealershipData || !dealershipData.adjustments) {
      return { left: 0, top: 0, scale: 0.8 };
    }
    
    const adjustments = dealershipData.adjustments[activeShot] || {};
    return {
      left: adjustments.left || 0,
      top: adjustments.top || 0,
      scale: adjustments.scale || 0.8
    };
  };

  // Get vehicle dimensions - exactly like ImageAdjustor
  const getVehicleDimensions = () => {
    if (!naturalSize.width || !naturalSize.height) {
      return { displayWidth: 0, displayHeight: 0 };
    }
    
    const scaleAdjustment = getCurrentPosition().scale;
    
    // Use the same logic as ImageAdjustor
    const BACKGROUND_WIDTH = 1024;
    const BACKGROUND_HEIGHT = 768;
    
    // Calculate canvasScale like ImageAdjustor does
    const canvasScale = Math.min(
      (containerRef.current?.offsetWidth || 800) / BACKGROUND_WIDTH,
      (containerRef.current?.offsetHeight || 600) / BACKGROUND_HEIGHT,
      1
    );
    
    const heightRatio = BACKGROUND_HEIGHT / naturalSize.height;
    const widthRatio = BACKGROUND_WIDTH / naturalSize.width;
    const base = Math.min(heightRatio, widthRatio, 1);
    const finalScale = base * scaleAdjustment * canvasScale;
    
    return {
      displayWidth: Math.round(naturalSize.width * finalScale),
      displayHeight: Math.round(naturalSize.height * finalScale)
    };
  };

  // Get current shot image from selected sample
  const getCurrentShotImage = () => {
    if (!selectedSample?.images) return null;
    return selectedSample.images.find(img => img.viewType === activeShot);
  };

  // Get background image URL
  const getBackgroundImageUrl = () => {
    if (!dealershipData?.backgrounds) return null;
    const background = dealershipData.backgrounds[activeShot];
    if (!background) return null;
    return `${BACKEND_URL}/uploads/backgrounds/${background}`;
  };

  // Get vehicle image style - use same positioning logic as Image Upload component
  const getVehicleImageStyle = () => {
    const position = getCurrentPosition();
    const dimensions = getVehicleDimensions();
    
    // The saved values are ADJUSTMENT OFFSETS, not absolute coordinates
    // Use the same logic as Image Upload component:
    // top = outputHeight - vehicleHeight + adjustmentTop
    // left = (outputWidth - vehicleWidth) / 2 + adjustmentLeft
    
    const containerWidth = containerRef.current?.offsetWidth || 800;
    const containerHeight = containerRef.current?.offsetHeight || 600;
    
    // Calculate default positions (like Image Upload component does)
    const defaultLeft = Math.floor((containerWidth - dimensions.displayWidth) / 2);
    const defaultTop = containerHeight - dimensions.displayHeight;
    
    // Apply the saved adjustment offsets
    const finalLeft = defaultLeft + position.left;
    const finalTop = defaultTop + position.top;
    
    return {
      position: 'absolute',
      left: `${finalLeft}px`,
      top: `${finalTop}px`,
      width: `${dimensions.displayWidth}px`,
      height: `${dimensions.displayHeight}px`,
      cursor: isDragging ? 'grabbing' : 'grab',
      userSelect: 'none',
      touchAction: 'none',
      zIndex: 10
    };
  };

  // Handle adjustment changes
  const handleAdjustmentChange = (type, value) => {
    if (!dealershipData?.adjustments) return;
    
    const currentAdjustments = dealershipData.adjustments[activeShot] || {};
    const newAdjustments = {
      ...dealershipData.adjustments,
      [activeShot]: {
        ...currentAdjustments,
        [type]: value
      }
    };
    
    // Update local state immediately for smooth UI updates
    dealershipData.adjustments = newAdjustments;
    // Force re-render
    setActiveShot(activeShot);
  };

  // Handle scale changes
  const handleScaleChange = (newScale) => {
    const clampedScale = Math.max(0.3, Math.min(2.0, newScale));
    handleAdjustmentChange('scale', clampedScale);
  };

  // Handle zoom in/out
  const handleZoomIn = () => {
    const currentScale = getCurrentPosition().scale;
    handleScaleChange(currentScale + 0.1);
  };

  const handleZoomOut = () => {
    const currentScale = getCurrentPosition().scale;
    handleScaleChange(currentScale - 0.1);
  };

  // Handle image load
  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
  };

  // Handle background upload
  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Handle background upload logic here
      console.log('Background file selected:', file);
    }
  };

  // Get available background shots for copying
  const getAvailableBackgroundShots = () => {
    if (!dealershipData?.backgrounds) return [];
    return shotTypes.filter(shot => 
      shot.key !== activeShot && 
      dealershipData.backgrounds[shot.key]
    );
  };

  // Handle copy background
  const handleCopyBackground = (sourceShot) => {
    // Handle copy background logic here
    console.log('Copying background from:', sourceShot);
  };

  // Handle crop and upload
  const handleCropAndUpload = () => {
    // Handle crop and upload logic here
    console.log('Crop and upload');
  };

  // Validate crop
  const validateCrop = (crop) => {
    if (!crop) return crop;
    
    const minSize = 100;
    const minHeight = (minSize * 3) / 4;
    
    return {
      ...crop,
      width: Math.max(crop.width, minSize),
      height: Math.max(crop.height, minHeight)
    };
  };

  // On image load for cropping
  const onImageLoad = (e) => {
    setImgRef(e.target);
    setImageLoading(false);
  };

  // Don't render until dealershipData is fully loaded with all required properties
  if (!dealershipData || !dealershipData.adjustments || !dealershipData.backgrounds) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading studio configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{sliderStyles}</style>
      
      {/* Vehicle Samples Selection - More Prominent */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-3">
          <Camera className="h-5 w-5 text-primary" />
          <span className="text-base font-semibold">Vehicle Samples</span>
        </div>
        <div className="flex space-x-3 overflow-x-auto pb-2">
          {vehicleSamples.map((sample) => (
            <div
              key={sample.id}
              className={cn(
                "flex-shrink-0 flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all min-w-[120px]",
                selectedSample?.id === sample.id
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border hover:bg-muted/50 hover:border-primary/30"
              )}
              onClick={() => setSelectedSample(sample)}
            >
              {sample.images && sample.images.length > 0 && (
                <img
                  src={`${BACKEND_URL}${sample.images[0].imageUrl.startsWith('/') ? '' : '/'}${sample.images[0].imageUrl}`}
                  alt={sample.name}
                  className="w-10 h-8 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{sample.name}</p>
                <p className="text-xs text-muted-foreground">
                  {sample.images?.length || 0} shots
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Studio Configuration */}
      <Card>
        <CardContent className="p-6">
          {/* Shot Type Tabs */}
          <Tabs value={activeShot} onValueChange={setActiveShot} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {shotTypes.map((shot) => (
                <TabsTrigger
                  key={shot.key}
                  value={shot.key}
                  className="text-xs"
                >
                  <span>{shot.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {shotTypes.map((shot) => (
              <TabsContent key={shot.key} value={shot.key} className="mt-6">
                <div className="space-y-6">
                  {/* Background Upload - Matching Production Layout */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Background Image</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current: {dealershipData.backgrounds[shot.key] || 'None'}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBackgroundUpload}
                        className="hidden"
                        id={`bg-upload-${shot.key}`}
                      />
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => document.getElementById(`bg-upload-${shot.key}`)?.click()}
                        disabled={uploadingBackground}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {uploadingBackground && currentShotForUpload === shot.key ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Background
                          </>
                        )}
                      </Button>
                      
                      {/* Copy Background Button */}
                      {dealershipData?.backgrounds && Object.keys(dealershipData.backgrounds).some(key => 
                        dealershipData.backgrounds[key] && key !== shot.key
                      ) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentShotForUpload(shot.key);
                            setShowCopyModal(true);
                          }}
                          disabled={uploadingBackground}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Visual Preview & Adjustment */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Position & Scale Adjustment</Label>
                    
                    {/* Preview Container - Fixed 4:3 Ratio */}
                    <div className="w-full max-w-4xl mx-auto">
                      <div 
                        ref={containerRef}
                        className="image-adjustor-container relative border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-muted/20"
                        style={{
                          backgroundImage: getBackgroundImageUrl() ? `url(${getBackgroundImageUrl()})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          width: '100%',
                          aspectRatio: '4/3'
                        }}
                      >
                        {/* Vehicle Image - Only show when background exists */}
                        {selectedSample && getCurrentShotImage() && getBackgroundImageUrl() && (
                          <img
                            key={`${selectedSample.id}-${shot.key}-stable`}
                            ref={imageRef}
                            src={`${BACKEND_URL}${getCurrentShotImage().imageUrl.startsWith('/') ? '' : '/'}${getCurrentShotImage().imageUrl}`}
                            alt={`${selectedSample.name} - ${shot.label}`}
                            style={getVehicleImageStyle()}
                            onLoad={handleImageLoad}
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleTouchStart}
                            draggable={false}
                          />
                        )}
                        
                        {/* Overlay Info */}
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {shot.label} View
                        </div>
                        
                        {/* No background message */}
                        {!getBackgroundImageUrl() && (
                          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Upload a background image</p>
                              <p className="text-xs opacity-75 mt-1">Vehicle will appear here once background is uploaded</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Controls Below Image - All in One Line */}
                    <div className="flex items-center space-x-6">
                      {/* Scale Slider */}
                      <div className="flex items-center space-x-3">
                        <Label className="text-sm font-medium whitespace-nowrap">Adjust Vehicle Size (1.0 = normal)</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleZoomOut}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        
                        <div className="w-32">
                          <input
                            type="range"
                            min="0.3"
                            max="2.0"
                            step="0.01"
                            value={getCurrentPosition().scale}
                            onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleZoomIn}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        
                        <span className="text-sm text-muted-foreground w-12 text-center">
                          {getCurrentPosition().scale.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Position Controls - Smaller Inputs */}
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Label className="text-sm font-medium whitespace-nowrap">Left/Right (px)</Label>
                          <Input
                            type="number"
                            value={getCurrentPosition().left}
                            onChange={(e) => handleAdjustmentChange('left', parseInt(e.target.value) || 0)}
                            className="h-8 w-20 text-sm"
                            title="Backend pixel coordinates (0-1024)"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Label className="text-sm font-medium whitespace-nowrap">Up/Down (px)</Label>
                          <Input
                            type="number"
                            value={getCurrentPosition().top}
                            onChange={(e) => handleAdjustmentChange('top', parseInt(e.target.value) || 0)}
                            className="h-8 w-20 text-sm"
                            title="Backend pixel coordinates (0-768)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <Button
          onClick={onSave}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save
            </>
          )}
        </Button>
      </div>

      {/* Copy Background Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Copy Background & Positioning</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select a background to copy to {shotTypes.find(s => s.key === currentShotForUpload)?.label}. 
              This will also copy the vehicle positioning and scale from the source shot.
            </p>
            
            <div className="space-y-2 mb-6">
              {getAvailableBackgroundShots().map((shot) => (
                <Button
                  key={shot.key}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleCopyBackground(shot.key)}
                  disabled={uploadingBackground}
                >
                  Copy from {shot.label}
                </Button>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCopyModal(false);
                  setCurrentShotForUpload(null);
                }}
                disabled={uploadingBackground}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {showCropModal && imageToCrop && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-7xl h-full max-h-[90vh] rounded-lg flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">Crop Image to 4:3 Ratio</h3>
                <p className="text-sm text-muted-foreground">
                  Your image needs to be cropped to a 4:3 aspect ratio to work properly as a background.
                  Drag the corners to adjust the crop area.
                </p>
              </div>
              <button
                onClick={() => {
                  if (imageToCrop && imageToCrop.url) {
                    URL.revokeObjectURL(imageToCrop.url);
                  }
                  setShowCropModal(false);
                  setImageToCrop(null);
                  setCurrentShotForUpload(null);
                  setCrop(null);
                  setCompletedCrop(null);
                  setImgRef(null);
                  setImageLoading(false);
                }}
                className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 flex p-4 gap-6">
              {/* Left Side - Image Cropping */}
              <div className="flex-1 flex items-center justify-center relative">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(validateCrop(c))}
                  onComplete={(c) => setCompletedCrop(validateCrop(c))}
                  aspect={4/3}
                  minWidth={100}
                  minHeight={75}
                  keepSelection={true}
                >
                  <img
                    src={imageToCrop.url}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%', 
                      objectFit: 'contain' 
                    }}
                  />
                </ReactCrop>
              </div>
              
              {/* Right Side - Controls */}
              <div className="w-80 space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Crop Controls</h4>
                  
                  <Button 
                    onClick={() => {
                      if (imgRef && crop) {
                        const { naturalWidth, naturalHeight } = imgRef;
                        const { width, height } = imgRef;
                        
                        let naturalCropWidth, naturalCropHeight, naturalCropX, naturalCropY;
                        
                        if (naturalWidth / naturalHeight > 4/3) {
                          naturalCropHeight = naturalHeight;
                          naturalCropWidth = (naturalCropHeight * 4) / 3;
                          
                          if (naturalCropWidth > naturalWidth) {
                            naturalCropWidth = naturalWidth;
                            naturalCropHeight = (naturalCropWidth * 3) / 4;
                          }
                        } else {
                          naturalCropWidth = naturalWidth;
                          naturalCropHeight = (naturalCropWidth * 3) / 4;
                          
                          if (naturalCropHeight > naturalHeight) {
                            naturalCropHeight = naturalHeight;
                            naturalCropWidth = (naturalCropHeight * 4) / 3;
                          }
                        }
                        
                        naturalCropX = (naturalWidth - naturalCropWidth) / 2;
                        naturalCropY = (naturalHeight - naturalCropHeight) / 2;
                        
                        const scaleX = width / naturalWidth;
                        const scaleY = height / naturalHeight;
                        
                        setCrop({
                          unit: 'px',
                          width: Math.round(naturalCropWidth * scaleX),
                          height: Math.round(naturalCropHeight * scaleY),
                          x: Math.round(naturalCropX * scaleX),
                          y: Math.round(naturalCropY * scaleY),
                          aspect: 4/3
                        });
                      }
                    }}
                    className="text-xs"
                  >
                    Reset to Maximum 4:3
                  </Button>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (imageToCrop && imageToCrop.url) {
                          URL.revokeObjectURL(imageToCrop.url);
                        }
                        setShowCropModal(false);
                        setImageToCrop(null);
                        setCurrentShotForUpload(null);
                        setCrop(null);
                        setCompletedCrop(null);
                        setImgRef(null);
                        setImageLoading(false);
                      }}
                      disabled={uploadingBackground}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      onClick={handleCropAndUpload}
                      disabled={uploadingBackground || !completedCrop}
                      className="w-full"
                    >
                      {uploadingBackground ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Crop & Upload
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudioTab;
