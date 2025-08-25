import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosInstance';
import JwtContext from '../JwtContext';
import DealershipContext from '../contexts/DealershipContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  Loader2, 
  Save, 
  Building2, 
  Upload,
  Bug,
  Eye,
  EyeOff,
  Settings as SettingsIcon,
  Camera,
  Move,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Minus,
  Plus,
  Copy,
  Image as ImageIcon,
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

function Settings() {
  const { jwtToken } = useContext(JwtContext);
  const { selectedDealership, selectedDealershipData, updateDealershipData } = useContext(DealershipContext);
  const navigate = useNavigate();

  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isJustSaved, setIsJustSaved] = useState(false);
  
  // Background upload state
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [currentShotForUpload, setCurrentShotForUpload] = useState(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [imgRef, setImgRef] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Vehicle samples state
  const [vehicleSamples, setVehicleSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);
  const [activeShot, setActiveShot] = useState('frontQuarter');

  // Dealership data state
  const [dealershipData, setDealershipData] = useState({
    id: '',
    name: '',
    backgrounds: {
      front: '',
      frontQuarter: '',
      side: '',
      backQuarter: '',
      back: ''
    },
            adjustments: {}
  });

  // Interactive adjustor state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  const imageRef = useRef(null);

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
      if (!isDragging || !containerRef.current) return;
      
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
      if (!isDragging || !containerRef.current) return;
      
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
  }, [isDragging, dragStart]);

  // Canvas dimensions (matching ImageAdjustor)
  const BACKGROUND_WIDTH = 1024;
  const BACKGROUND_HEIGHT = 768;

  // Shot types configuration
  const shotTypes = [
    { key: 'frontQuarter', label: 'Front Quarter' },
    { key: 'front', label: 'Front' },
    { key: 'side', label: 'Side' },
    { key: 'backQuarter', label: 'Back Quarter' },
    { key: 'back', label: 'Back' }
  ];

  // Initialize data
  useEffect(() => {
    if (!jwtToken || !selectedDealership) {
      navigate('/inventory');
      return;
    }

    const initializeData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [samplesResponse, dealershipDataResult] = await Promise.all([
          axiosInstance.get('/vehicles/samples'),
          getDealershipData()
        ]);

        setVehicleSamples(samplesResponse.data || []);
        
        if (samplesResponse.data && samplesResponse.data.length > 0) {
          setSelectedSample(samplesResponse.data[0]);
        }

        console.log('Loaded dealership data:', dealershipDataResult);
        console.log('Adjustments loaded:', dealershipDataResult.adjustments);
        setDealershipData(dealershipDataResult);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.error || 'Failed to load settings data');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [jwtToken, selectedDealership, selectedDealershipData, navigate]);

  // Apply saved positioning when shot changes or dealership data loads
  useEffect(() => {
    if (dealershipData.id && activeShot && imageRef.current) {
      const savedAdjustments = dealershipData.adjustments[activeShot];
      if (savedAdjustments) {
        console.log(`Applying saved position for ${activeShot}:`, savedAdjustments);
        // The positioning will be applied through the getCurrentPosition() function
        // which reads from dealershipData.adjustments
      }
    }
  }, [activeShot, dealershipData.adjustments, dealershipData.id]);

  // Reset natural size when sample changes to ensure proper positioning
  useEffect(() => {
    if (selectedSample) {
      setNaturalSize({ width: 0, height: 0 });
      // Force image reload when sample changes
      if (imageRef.current) {
        imageRef.current.src = imageRef.current.src;
      }
    }
  }, [selectedSample?.id]);

  // Get dealership data from context or API
  const getDealershipData = async () => {
    let data;
    
    if (selectedDealershipData && selectedDealershipData.id) {
      console.log('Using context dealership data:', selectedDealershipData);
      console.log('Context adjustments:', selectedDealershipData.adjustments);
      data = selectedDealershipData;
    } else {
      const dealershipsResponse = await axiosInstance.get('/dealerships');
      const dealerships = dealershipsResponse.data;
      
      const targetDealership = dealerships.find(d => d.name === selectedDealership);
      if (!targetDealership) {
        throw new Error(`Dealership "${selectedDealership}" not found`);
      }

      const response = await axiosInstance.get(`/dealerships/${targetDealership.id}`);
      data = response.data;
      
      console.log('Raw dealership response:', data);
      console.log('Raw adjustments from backend:', data.adjustments);
      
      updateDealershipData(data);
    }
    
    const adjustments = data.adjustments || {};
    
    return {
      id: data.id,
      name: data.name || '',
      backgrounds: data.backgrounds || {
        front: '',
        frontQuarter: '',
        back: '',
        backQuarter: '',
        side: ''
      },
      adjustments: adjustments
    };
  };

  // Handle background file upload
  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      checkAspectRatio(file);
    }
    e.target.value = '';
  };

  // Check image aspect ratio and show cropper if needed
  const checkAspectRatio = (file) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const targetRatio = 4/3;
      
      if (Math.abs(aspectRatio - targetRatio) > 0.1) {
        // Image needs cropping
        setImageToCrop({ file, url: objectUrl });
        setCurrentShotForUpload(activeShot);
        setShowCropModal(true);
        setImageLoading(true);
      } else {
        // Image is already 4:3, upload directly
        uploadBackgroundFile(file, activeShot);
      }
    };
    
    img.onerror = () => {
      setError('Failed to load image');
      URL.revokeObjectURL(objectUrl);
    };
    
    img.src = objectUrl;
  };

  // Upload background file to server
  const uploadBackgroundFile = async (file, shotType) => {
    setUploadingBackground(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('background', file);

      const response = await axiosInstance.post(
        `/dealerships/${dealershipData.id}/backgrounds/${shotType}`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      const { background, dealershipBackgrounds } = response.data;
      
      setDealershipData(prev => ({
        ...prev,
        backgrounds: dealershipBackgrounds
      }));

      setSuccess(`Background uploaded for ${shotTypes.find(s => s.key === shotType)?.label}`);
      
      // Close modals
      setShowCropModal(false);
      setImageToCrop(null);
      setImageLoading(false);
      
    } catch (err) {
      console.error('Error uploading background:', err);
      setError(err.response?.data?.error || 'Failed to upload background image');
    } finally {
      setUploadingBackground(false);
      setCurrentShotForUpload(null);
    }
  };

  // Handle copying background from another shot
  const handleCopyBackground = async (sourceShotType) => {
    if (!dealershipData.id || !currentShotForUpload) return;

    setUploadingBackground(true);
    setError(null);

    try {
      const response = await axiosInstance.post(
        `/dealerships/${dealershipData.id}/backgrounds/${sourceShotType}/copy`,
        { targetShotType: currentShotForUpload }
      );
      
      const { background, dealershipBackgrounds } = response.data;
      
      // Copy both background AND positioning from source shot
      setDealershipData(prev => ({
        ...prev,
        backgrounds: dealershipBackgrounds,
        adjustments: {
          ...prev.adjustments,
          [currentShotForUpload]: {
            ...prev.adjustments[sourceShotType] // Copy position and scale
          }
        }
      }));

      setSuccess(`Background and positioning copied to ${shotTypes.find(s => s.key === currentShotForUpload)?.label}`);
      setShowCopyModal(false);
      
    } catch (err) {
      console.error('Error copying background:', err);
      setError(err.response?.data?.error || 'Failed to copy background');
    } finally {
      setUploadingBackground(false);
      setCurrentShotForUpload(null);
    }
  };

  // Get available shot types that have backgrounds for copying
  const getAvailableBackgroundShots = () => {
    if (!dealershipData.backgrounds) return [];
    
    return shotTypes.filter(shot => 
      dealershipData.backgrounds[shot.key] && 
      shot.key !== currentShotForUpload
    );
  };

  // Initialize crop area with maximum 4:3 aspect ratio from the image
  const onImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const { width, height } = e.currentTarget;
    
    // Calculate the maximum possible 4:3 crop area
    let naturalCropWidth, naturalCropHeight, naturalCropX, naturalCropY;
    
    if (naturalWidth / naturalHeight > 4/3) {
      naturalCropHeight = naturalHeight;
      naturalCropWidth = (naturalCropHeight * 4) / 3;
      naturalCropX = (naturalWidth - naturalCropWidth) / 2;
      naturalCropY = 0;
    } else {
      naturalCropWidth = naturalWidth;
      naturalCropHeight = (naturalCropWidth * 3) / 4;
      naturalCropX = 0;
      naturalCropY = (naturalHeight - naturalCropHeight) / 2;
    }
    
    // Scale the crop coordinates to match the displayed image size
    const scaleX = width / naturalWidth;
    const scaleY = height / naturalHeight;
    
    const crop = {
      unit: 'px',
      width: Math.round(naturalCropWidth * scaleX),
      height: Math.round(naturalCropHeight * scaleY),
      x: Math.round(naturalCropX * scaleX),
      y: Math.round(naturalCropY * scaleY),
      aspect: 4/3
    };
    setCrop(crop);
    setImgRef(e.currentTarget);
    setImageLoading(false);
  };

  // Validate crop boundaries
  const validateCrop = (crop) => {
    if (!crop) return crop;
    
    const maxWidth = imgRef?.width || 0;
    const maxHeight = imgRef?.height || 0;
    
    return {
      ...crop,
      x: Math.max(0, Math.min(crop.x, maxWidth - crop.width)),
      y: Math.max(0, Math.min(crop.y, maxHeight - crop.height))
    };
  };

  // Get cropped image
  const getCroppedImg = (image, crop) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Convert display coordinates back to original image coordinates
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    const originalCropX = Math.round(crop.x * scaleX);
    const originalCropY = Math.round(crop.y * scaleY);
    const originalCropWidth = Math.round(crop.width * scaleX);
    const originalCropHeight = Math.round(crop.height * scaleY);

    canvas.width = originalCropWidth;
    canvas.height = originalCropHeight;

    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      originalCropX,
      originalCropY,
      originalCropWidth,
      originalCropHeight,
      0,
      0,
      originalCropWidth,
      originalCropHeight
    );

    return new Promise((resolve) => {
      canvas.toBlob((file) => {
        resolve(file);
      }, 'image/jpeg', 0.9);
    });
  };

  // Handle crop and upload
  const handleCropAndUpload = async () => {
    if (!imgRef || !completedCrop || !imageToCrop) return;

    try {
      const croppedFile = await getCroppedImg(imgRef, completedCrop);
      await uploadBackgroundFile(croppedFile, currentShotForUpload);
      
      // Clean up object URL after successful upload
      if (imageToCrop && imageToCrop.url) {
        URL.revokeObjectURL(imageToCrop.url);
      }
    } catch (err) {
      console.error('Error cropping image:', err);
      setError('Failed to crop image');
    }
  };

  // Handle adjustment changes
  const handleAdjustmentChange = (field, value) => {
    let numValue = parseFloat(value) || 0;
    
    // For position inputs, ensure we're working with backend coordinates
    if (field === 'left' || field === 'top') {
      // If the user is typing in the input field, the value is already in backend coordinates
      // (since the input shows backend coordinates)
      numValue = Math.round(numValue);
    }
    
    setDealershipData(prev => ({
      ...prev,
      adjustments: {
        ...prev.adjustments,
        [activeShot]: {
          ...prev.adjustments[activeShot],
          [field]: numValue
        }
      }
    }));
  };

  // Scale adjustment helpers - matching backend scaleAdjustment
  const handleScaleChange = (newScale) => {
    // Backend expects scaleAdjustment as a multiplier (0.5 = half size, 1.0 = normal, 1.5 = 50% larger)
    const clampedScale = Math.max(0.3, Math.min(2.0, newScale));
    handleAdjustmentChange('scale', clampedScale);
  };

  const handleZoomIn = () => {
    const currentScale = getCurrentPosition().scale;
    handleScaleChange(currentScale + 0.05);
  };

  const handleZoomOut = () => {
    const currentScale = getCurrentPosition().scale;
    handleScaleChange(currentScale - 0.05);
  };

  // Get current vehicle position
  const getCurrentPosition = () => {
    console.log(`Getting position for ${activeShot}:`, {
      allAdjustments: dealershipData.adjustments,
      activeShotAdjustments: dealershipData.adjustments?.[activeShot]
    });
    
    const adjustments = dealershipData.adjustments?.[activeShot];
    
    if (!adjustments) {
      console.log(`No adjustments found for ${activeShot}, using defaults`);
      // Return default values if no adjustments exist
      return { top: 0, left: 0, scale: 1.0 };
    }
    
    console.log(`Current position for ${activeShot}:`, { adjustments });
    return adjustments; // Return the adjustments directly
  };

  // Get vehicle dimensions - exactly like ImageAdjustor
  const getVehicleDimensions = () => {
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

  // Get container scale
  const getContainerScale = () => {
    if (!containerRef.current) return 1;
    const containerWidth = containerRef.current.offsetWidth;
    return containerWidth / BACKGROUND_WIDTH;
  };

  // Get current shot image from selected sample
  const getCurrentShotImage = () => {
    if (!selectedSample || !selectedSample.images) return null;
    return selectedSample.images.find(img => img.viewType === activeShot);
  };

  // Get background image URL
  const getBackgroundImageUrl = () => {
    const background = dealershipData.backgrounds[activeShot];
    if (!background) return null;
    return `${BACKEND_URL}/uploads/backgrounds/${background}`;
  };

  // Get vehicle image style
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
    
    console.log(`Vehicle positioning:`, {
      savedAdjustments: { left: position.left, top: position.top },
      defaultPositions: { left: defaultLeft, top: defaultTop },
      finalPositions: { left: finalLeft, top: finalTop },
      vehicleSize: { width: dimensions.displayWidth, height: dimensions.displayHeight }
    });
    
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

  // Handle save
  const handleSave = async () => {
    if (!dealershipData.id) {
      setError('No dealership selected');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData = {
        backgrounds: dealershipData.backgrounds,
        adjustments: dealershipData.adjustments
      };

      const response = await axiosInstance.put(`/dealerships/${dealershipData.id}`, updateData);
      
      setSuccess('Settings updated successfully!');
      
      if (response.data.dealership) {
        updateDealershipData(response.data.dealership);
      }

    } catch (err) {
      console.error('Error updating dealership:', err);
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  // Reset adjustments for current shot
  const handleReset = () => {
    setDealershipData(prev => ({
      ...prev,
      adjustments: {
        ...prev.adjustments,
        [activeShot]: { top: 0, left: 0, scale: 1.0 }
      }
    }));
  };

  // Track natural vehicle image size and apply saved positioning
  const handleImageLoad = (e) => {
    const newNaturalSize = {
      width: e.target.naturalWidth,
      height: e.target.naturalHeight,
    };
    
    if (naturalSize.width !== newNaturalSize.width || naturalSize.height !== newNaturalSize.height) {
      setNaturalSize(newNaturalSize);
    }
    
    // Apply saved positioning from dealership data
    const savedAdjustments = dealershipData.adjustments[activeShot];
    if (savedAdjustments) {
      console.log(`Loading saved position for ${activeShot}:`, savedAdjustments);
    }
  };

  // Apply saved positioning when activeShot or dealershipData changes
  useEffect(() => {
    if (dealershipData.adjustments && dealershipData.adjustments[activeShot]) {
      console.log(`Applying saved position for ${activeShot}:`, dealershipData.adjustments[activeShot]);
      
      // Force a re-render to ensure the vehicle is positioned correctly
      setNaturalSize(prev => ({ ...prev }));
    }
  }, [activeShot, dealershipData.adjustments]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading dealership settings...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{sliderStyles}</style>
      <div className="px-6 py-6 max-w-7xl mx-auto">
      {/* Messages */}
      {error && (
        <Alert className="mb-6 border-red-500 bg-red-50 dark:bg-red-950">
          <AlertDescription className="text-red-700 dark:text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <AlertDescription className="text-green-700 dark:text-green-200">
            {success}
          </AlertDescription>
        </Alert>
      )}

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
                      {Object.keys(dealershipData.backgrounds || {}).some(key => 
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
                            onChange={(e) => handleAdjustmentChange('left', e.target.value)}
                            className="h-8 w-20 text-sm"
                            title="Backend pixel coordinates (0-1024)"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Label className="text-sm font-medium whitespace-nowrap">Up/Down (px)</Label>
                          <Input
                            type="number"
                            value={getCurrentPosition().top}
                            onChange={(e) => handleAdjustmentChange('top', e.target.value)}
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
          onClick={handleSave}
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
                    alt="Image to crop"
                    onLoad={onImageLoad}
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </ReactCrop>
                {imageLoading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>
              
              {/* Right Side - Controls */}
              <div className="w-80 flex flex-col h-full">
                <div className="text-sm text-muted-foreground mb-6">
                  <p>Image will be cropped to 4:3 ratio and uploaded as background.</p>
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Tips:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Drag the crop area to position it</li>
                        <li>• Resize by dragging the corners</li>
                        <li>• Maintain 4:3 ratio for best results</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-4">
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
                          <ImageIcon className="mr-2 h-4 w-4" />
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
      </div>
    </>
  );
}

export default Settings;
