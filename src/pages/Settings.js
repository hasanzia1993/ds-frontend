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

  // Helper function to construct file URLs
  const constructFileUrl = (filePath) => {
    if (!filePath) return null;
    console.log('constructFileUrl input:', filePath);
    
    // If the path is already a full URL, return it as is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      console.log('constructFileUrl output (full URL):', filePath);
      return filePath;
    }
    
    // If it's a relative path, construct the full URL
    const normalizedPath = filePath.startsWith('/') ? filePath : '/' + filePath;
    const finalUrl = `${BACKEND_URL}${normalizedPath}`;
    console.log('constructFileUrl output (constructed):', finalUrl);
    return finalUrl;
  };



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

  // Add state for active tab
  const [activeTab, setActiveTab] = useState('studio');
  
  // License plate logo state
  const [uploadedLogo, setUploadedLogo] = useState(null);
  const [logoSize, setLogoSize] = useState(50);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // New state for backend logo management
  const [logos, setLogos] = useState([]);
  const [fetchingLogos, setFetchingLogos] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(null);
  const [updatingLogo, setUpdatingLogo] = useState(null);
  
  // License plate state
  const [licensePlate, setLicensePlate] = useState(null);
  const [originalLicensePlate, setOriginalLicensePlate] = useState(null);
  const [originalLicensePlateData, setOriginalLicensePlateData] = useState(null);
  const [uploadingLicensePlate, setUploadingLicensePlate] = useState(false);
  const [deletingLicensePlate, setDeletingLicensePlate] = useState(false);
  
  // Logo positioning state
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 50 });
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [logoDragStart, setLogoDragStart] = useState({ x: 0, y: 0 });
  
  // License plate configuration saving state
  const [savingLicensePlateConfig, setSavingLicensePlateConfig] = useState(false);
  
  // Canvas reference for generating composed image
  const canvasRef = useRef(null);
  
  // Logo preview modal state
  const [previewLogo, setPreviewLogo] = useState(null);
  const [showLogoPreview, setShowLogoPreview] = useState(false);



  // Use all logos since search is removed
  const filteredLogos = logos;

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

  // Logo drag handling functions
  const handleLogoDragStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDraggingLogo(true);
    // Get the license plate container (parent of the logo overlay)
    const licensePlateContainer = e.currentTarget.closest('.relative.flex.items-center.justify-center.border');
    if (!licensePlateContainer) return;
    
    const rect = licensePlateContainer.getBoundingClientRect();
    const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
    const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
    
    setLogoDragStart({
      x: clientX - rect.left,
      y: clientY - rect.top
    });
  };

  // Handle logo dragging
  useEffect(() => {
    const handleLogoMouseMove = (e) => {
      if (!isDraggingLogo) return;
      
      // Find the license plate container (updated selector)
      const licensePlateContainer = document.querySelector('.relative.flex.items-center.justify-center.border');
      if (!licensePlateContainer) return;
      
      const rect = licensePlateContainer.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;
      
      const deltaX = clientX - rect.left - logoDragStart.x;
      const deltaY = clientY - rect.top - logoDragStart.y;
      
      // Calculate new position
      let newX = logoPosition.x + (deltaX / rect.width) * 100;
      let newY = logoPosition.y + (deltaY / rect.height) * 100;
      
      // Allow logo to move freely within the license plate area
      // Only constrain to prevent logo from going completely outside the plate
      const logoSizePercent = logoSize / 100; // Convert percentage to decimal
      const maxX = 100; // Logo can go to the right edge
      const minX = -logoSizePercent * 100; // Logo can go slightly left of left edge
      const maxY = 100; // Logo can go to the bottom edge
      const minY = -logoSizePercent * 100; // Logo can go slightly above top edge
      
      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));
      
      setLogoPosition({ x: newX, y: newY });
      setLogoDragStart({ x: clientX - rect.left, y: clientY - rect.top });
    };

    const handleLogoTouchMove = (e) => {
      if (!isDraggingLogo) return;
      
      // Find the license plate container (updated selector)
      const licensePlateContainer = document.querySelector('.relative.flex.items-center.justify-center.border');
      if (!licensePlateContainer) return;
      
      const rect = licensePlateContainer.getBoundingClientRect();
      const touch = e.touches[0];
      
      const deltaX = touch.clientX - rect.left - logoDragStart.x;
      const deltaY = touch.clientY - rect.top - logoDragStart.y;
      
      // Calculate new position
      let newX = logoPosition.x + (deltaX / rect.width) * 100;
      let newY = logoPosition.y + (deltaY / rect.height) * 100;
      
      // Allow logo to move freely within the license plate area
      // Only constrain to prevent logo from going completely outside the plate
      const logoSizePercent = logoSize / 100; // Convert percentage to decimal
      const maxX = 100; // Logo can go to the right edge
      const minX = -logoSizePercent * 100; // Logo can go slightly left of left edge
      const maxY = 100; // Logo can go to the bottom edge
      const minY = -logoSizePercent * 100; // Logo can go slightly above top edge
      
      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));
      
      setLogoPosition({ x: newX, y: newY });
      setLogoDragStart({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    };

    const handleLogoMouseUp = () => setIsDraggingLogo(false);
    const handleLogoTouchEnd = () => setIsDraggingLogo(false);

    if (isDraggingLogo) {
      document.addEventListener('mousemove', handleLogoMouseMove);
      document.addEventListener('mouseup', handleLogoMouseUp);
      document.addEventListener('touchmove', handleLogoTouchMove, { passive: false });
      document.addEventListener('touchend', handleLogoTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleLogoMouseMove);
      document.removeEventListener('mouseup', handleLogoMouseUp);
      document.removeEventListener('touchmove', handleLogoTouchMove);
      document.removeEventListener('touchend', handleLogoTouchEnd);
    };
  }, [isDraggingLogo, logoDragStart, logoPosition]);

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

  // Fetch logos and license plate data when dealership data is available
  useEffect(() => {
    if (dealershipData.id) {
      console.log('Dealership data loaded, fetching logos and license plate...');
      fetchLogos();
      fetchLicensePlate();
    }
  }, [dealershipData.id]);

  // Cleanup object URLs when component unmounts or image changes
  useEffect(() => {
    let objectUrl = null;
    if (originalLicensePlate) {
      objectUrl = URL.createObjectURL(originalLicensePlate);
    }
    
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [originalLicensePlate]);

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
  
    
    const adjustments = dealershipData.adjustments?.[activeShot];
    
    if (!adjustments) {
      console.log(`No adjustments found for ${activeShot}, using defaults`);
      // Return default values if no adjustments exist
      return { top: 0, left: 0, scale: 1.0 };
    }
    
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

  // Handle logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a preview URL for immediate display
      const logoUrl = URL.createObjectURL(file);
      setUploadedLogo({
        file: file,
        url: logoUrl,
        name: file.name
      });
      
      // Reset logo position for new logo
      setLogoPosition({ x: 50, y: 50 });
      
      // Upload to backend
      await uploadLogoToBackend(file);
      
      // Reset file input
      e.target.value = '';
    }
  };

  // Backend logo management functions
  const fetchLogos = async () => {
    console.log('fetchLogos called with dealershipData.id:', dealershipData.id);
    if (!dealershipData.id) {
      console.log('No dealership ID, returning early');
      return;
    }
    
    setFetchingLogos(true);
    try {
      console.log('Fetching logos from:', `/dealerships/${dealershipData.id}/logos`);
      const response = await axiosInstance.get(`/dealerships/${dealershipData.id}/logos`);
      console.log('Logos response:', response.data);
      setLogos(response.data || []);
    } catch (error) {
      console.error('Error fetching logos:', error);
      setError('Failed to fetch logos');
    } finally {
      setFetchingLogos(false);
    }
  };

  const uploadLogoToBackend = async (file) => {
    if (!dealershipData.id) return;
    
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await axiosInstance.post(
        `/dealerships/${dealershipData.id}/logos`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      // Add new logo to the list
      setLogos(prev => [...prev, response.data.logo]);
      
      // Update the uploaded logo state with backend data
      setUploadedLogo({
        ...uploadedLogo,
        id: response.data.logo.id,
        backendData: response.data.logo
      });
      
      setSuccess('Logo uploaded successfully!');
      
      // Clean up local preview
      if (uploadedLogo && uploadedLogo.url) {
        URL.revokeObjectURL(uploadedLogo.url);
      }
      
    } catch (error) {
      console.error('Error uploading logo:', error);
      setError(error.response?.data?.error || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const deleteLogo = async (logoId) => {
    if (!dealershipData.id) return;
    
    setDeletingLogo(logoId);
    try {
      await axiosInstance.delete(`/dealerships/${dealershipData.id}/logos/${logoId}`);
      
      // Remove from local state
      setLogos(prev => prev.filter(logo => logo.id !== logoId));
      
      // If this was the currently displayed logo, clear it
      if (uploadedLogo && uploadedLogo.id === logoId) {
        setUploadedLogo(null);
        setLogoSize(50);
      }
      
      setSuccess('Logo deleted successfully!');
    } catch (error) {
      console.error('Error deleting logo:', error);
      setError(error.response?.data?.error || 'Failed to delete logo');
    } finally {
      setDeletingLogo(null);
    }
  };

  const updateLogo = async (logoId, updates) => {
    if (!dealershipData.id) return;
    
    setUpdatingLogo(logoId);
    try {
      const response = await axiosInstance.put(
        `/dealerships/${dealershipData.id}/logos/${logoId}`,
        updates
      );
      
      // Update local state
      setLogos(prev => prev.map(logo => 
        logo.id === logoId ? { ...logo, ...updates } : logo
      ));
      
      // Update uploaded logo if it's the current one
      if (uploadedLogo && uploadedLogo.id === logoId) {
        setUploadedLogo(prev => ({ ...prev, ...updates }));
      }
      
      setSuccess('Logo updated successfully!');
    } catch (error) {
      console.error('Error updating logo:', error);
      setError(error.response?.data?.error || 'Failed to update logo');
    } finally {
      setUpdatingLogo(null);
    }
  };

  const reorderLogo = async (logoId, newSortOrder) => {
    if (!dealershipData.id) return;
    
    try {
      await axiosInstance.post(
        `/dealerships/${dealershipData.id}/logos/${logoId}/reorder`,
        { newSortOrder }
      );
      
      // Refresh logos to get updated order
      await fetchLogos();
    } catch (error) {
      console.error('Error reordering logo:', error);
      setError(error.response?.data?.error || 'Failed to reorder logo');
    }
  };



  // Handle logo activation/deactivation
  const handleLogoToggleActive = async (logoId, isActive) => {
    await updateLogo(logoId, { isActive: !isActive });
  };

  // License plate management functions
  const fetchLicensePlate = async () => {
    if (!dealershipData.id) return;
    
    try {
      const response = await axiosInstance.get(`/dealerships/${dealershipData.id}/license-plate`);
      console.log('License plate response:', response.data);
      console.log('Response structure check:', {
        hasOriginal: !!response.data.originalLicensePlate,
        hasComposed: !!response.data.composedLicensePlate,
        hasConfiguration: !!response.data.configuration,
        originalPath: response.data.originalLicensePlate?.path,
        composedPath: response.data.composedLicensePlate?.path
      });
      
      // Set license plate data using the new response structure
      if (response.data.composedLicensePlate) {
        console.log('Setting composed license plate data:', response.data.composedLicensePlate);
        setLicensePlate({
          exists: true,
          filename: response.data.composedLicensePlate.filename,
          path: response.data.composedLicensePlate.path,
          mimeType: response.data.composedLicensePlate.mimeType,
          fileSize: response.data.composedLicensePlate.fileSize,
          width: response.data.composedLicensePlate.width,
          height: response.data.composedLicensePlate.height
        });
      } else {
        // If no composed license plate, set exists to false
        setLicensePlate({ exists: false });
        // Clear stored file data since no license plate exists
        setOriginalLicensePlate(null);
      }
      // Set original license plate data if available
      if (response.data.originalLicensePlate) {
        console.log('Setting original license plate data:', response.data.originalLicensePlate);
        setOriginalLicensePlateData({
          filename: response.data.originalLicensePlate.filename,
          path: response.data.originalLicensePlate.path,
          mimeType: response.data.originalLicensePlate.mimeType,
          fileSize: response.data.originalLicensePlate.fileSize,
          width: response.data.originalLicensePlate.width,
          height: response.data.originalLicensePlate.height,
          uploadedBy: response.data.originalLicensePlate.uploadedBy,
          uploadedAt: response.data.originalLicensePlate.uploadedAt
        });
        
        // Also fetch the actual image file for saving configuration
        try {
          // Use the path from metadata to construct the URL
          const imageUrl = constructFileUrl(response.data.originalLicensePlate.path);
          const imageResponse = await fetch(imageUrl);
          if (imageResponse.ok) {
            const imageBlob = await imageResponse.blob();
            setOriginalLicensePlate(imageBlob);
            console.log('Original license plate image loaded successfully from:', imageUrl);
          } else {
            console.error('Failed to fetch image from URL:', imageUrl);
          }
        } catch (error) {
          console.error('Error fetching original license plate image:', error);
          // Don't set error here, just log it - the metadata is still useful
        }
      } else {
        console.log('No original license plate data found in response');
      }
      
      // Set logo configuration if it exists
      if (response.data.configuration && response.data.configuration.logoId) {
        const logoConfig = response.data.configuration;
        setUploadedLogo({
          id: logoConfig.logoId,
          url: `${BACKEND_URL}/logos/${logoConfig.logo.filename}`,
          name: logoConfig.logo.originalName,
          backendData: logoConfig.logo
        });
        setLogoSize(logoConfig.logoSize || 50);
        setLogoPosition({
          x: logoConfig.logoPositionX || 50,
          y: logoConfig.logoPositionY || 50
        });
      }
      
    } catch (error) {
      if (error.response?.status === 404) {
        setLicensePlate({ exists: false });
      } else {
        console.error('Error fetching license plate:', error);
        setError('Failed to fetch license plate');
      }
    }
  };

  // Fetch original license plate image
  const fetchOriginalLicensePlate = async () => {
    if (!dealershipData.id) return;
    
    try {
      const response = await axiosInstance.get(`/dealerships/${dealershipData.id}/license-plate/original`, {
        responseType: 'blob'
      });
      
      if (response.status === 200) {
        setOriginalLicensePlate(response.data);
      } else {
        console.log('No original license plate found, will use default');
        setOriginalLicensePlate(null);
      }
    } catch (error) {
      console.error('Error fetching original license plate:', error);
      setOriginalLicensePlate(null);
    }
  };

  const uploadLicensePlate = async (file, notes = '') => {
    if (!dealershipData.id) return;
    
    setUploadingLicensePlate(true);
    try {
      const formData = new FormData();
      formData.append('licensePlate', file);
      if (notes) {
        formData.append('notes', notes);
      }
      
      const response = await axiosInstance.post(
        `/dealerships/${dealershipData.id}/license-plate`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      // Store the uploaded file data for later use
      setOriginalLicensePlate(file);
      
      // Handle the response based on the structure returned by the upload endpoint
      if (response.data.licensePlate) {
        setLicensePlate({
          exists: true,
          filename: response.data.licensePlate.filename,
          notes: response.data.licensePlate.notes
        });
      } else if (response.data.composedLicensePlate) {
        setLicensePlate({
          exists: true,
          filename: response.data.composedLicensePlate.filename,
          notes: response.data.notes || ''
        });
      }
      
      setSuccess('License plate uploaded successfully!');
      
      // Refresh dealership data to get updated license plate info
      await getDealershipData();
      
    } catch (error) {
      console.error('Error uploading license plate:', error);
      setError(error.response?.data?.error || 'Failed to upload license plate');
    } finally {
      setUploadingLicensePlate(false);
    }
  };

  const deleteLicensePlate = async () => {
    if (!dealershipData.id) return;
    
    setDeletingLicensePlate(true);
    try {
      await axiosInstance.delete(`/dealerships/${dealershipData.id}/license-plate`);
      
      setLicensePlate({ exists: false });
      setSuccess('License plate deleted successfully!');
      
      // Refresh dealership data
      await getDealershipData();
      
    } catch (error) {
      console.error('Error deleting license plate:', error);
      setError(error.response?.data?.error || 'Failed to delete license plate');
    } finally {
      setDeletingLicensePlate(false);
    }
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

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (imageToCrop && imageToCrop.url) {
        URL.revokeObjectURL(imageToCrop.url);
      }
      if (uploadedLogo && uploadedLogo.url) {
        URL.revokeObjectURL(uploadedLogo.url);
      }
    };
  }, [imageToCrop, uploadedLogo]);

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
      <div className="flex min-h-screen bg-background">
        {/* Left Sidebar */}
        <div className="w-64 bg-card border-r border-border flex-shrink-0">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <SettingsIcon className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Settings</h1>
            </div>
            
            {/* Sidebar Navigation */}
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('studio')}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                  activeTab === 'studio'
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Camera className="h-4 w-4" />
                <span className="font-medium">Studio</span>
              </button>
              
              <button
                onClick={() => setActiveTab('license-plate')}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                  activeTab === 'license-plate'
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <ImageIcon className="h-4 w-4" />
                <span className="font-medium">License Plate</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 px-6 py-6">
          <div className="max-w-6xl mx-auto">
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

          {/* Studio Tab Content */}
          {activeTab === 'studio' && (
            <>
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
            </>
          )}

          {/* License Plate Tab Content */}
          {activeTab === 'license-plate' && (
            <>
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <span className="text-base font-semibold">License Plate Management</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload and manage your dealership logos for license plate generation.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Logo Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Logo Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Logo Upload Section */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Upload New Logo</Label>
                      <p className="text-xs text-muted-foreground">
                        Upload a logo to see how it will appear on the license plate.
                      </p>
                      
                                              <div className="flex items-center space-x-4">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-upload"
                          />
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => document.getElementById('logo-upload')?.click()}
                            disabled={uploadingLogo}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            {uploadingLogo ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Logo
                              </>
                            )}
                          </Button>
                        </div>
                    </div>

                    {/* Uploaded Logos List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Uploaded Logos</Label>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">
                            {filteredLogos.length} of {logos.length} logo{logos.length !== 1 ? 's' : ''}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchLogos}
                            disabled={fetchingLogos}
                            className="h-6 px-2 text-xs"
                          >
                            {fetchingLogos ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              '↻'
                            )}
                          </Button>
                        </div>
                      </div>
                      
</div>
                      

                      

                      
                      {fetchingLogos ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="ml-2 text-sm text-muted-foreground">Loading logos...</span>
                        </div>
                      ) : filteredLogos.length > 0 ? (
                        <div className="space-y-3">
                          {filteredLogos.map((logo, index) => (
                            <div className="flex flex-col space-y-3 p-4 border rounded-lg">
                            <div key={logo.id} className="flex flex-col space-y-3 p-4 pb-0 ">
                              {/* Top Row: Badge, Logo, and Actions */}
                              <div className="flex items-center space-x-4">
                                {/* Sort Order Badge */}
                                <div className="flex-shrink-0">
                                  <Badge variant="secondary" className="text-xs">
                                    #{logo.sortOrder !== null && logo.sortOrder !== undefined ? logo.sortOrder + 1 : index + 1}
                                  </Badge>
                                </div>
                                
                                {/* Logo Preview - Clickable for preview */}
                                <div className="flex flex-col items-center space-y-1">
                                  <img
                                    src={`${BACKEND_URL}/logos/${logo.filename}`}
                                    alt={`Logo: ${logo.originalName}`}
                                    className="w-16 h-16 object-contain rounded border cursor-pointer hover:border-blue-300 transition-colors"
                                    onClick={() => {
                                      setPreviewLogo({
                                        id: logo.id,
                                        url: `${BACKEND_URL}/logos/${logo.filename}`,
                                        name: logo.originalName,
                                        fileSize: logo.fileSize,
                                        uploader: logo.uploader,
                                        createdAt: logo.createdAt
                                      });
                                      setShowLogoPreview(true);
                                    }}
                                  />
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex items-center space-x-2 ml-auto">
                                  <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Just set the logo locally, don't auto-save
                                    setUploadedLogo({
                                      id: logo.id,
                                      url: `${BACKEND_URL}/logos/${logo.filename}`,
                                      name: logo.originalName,
                                      backendData: logo
                                    });
                                    setLogoSize(50);
                                    setLogoPosition({ x: 50, y: 50 }); // Reset position for new logo
                                    setSuccess('Logo added to license plate. Adjust position/size and click Save Configuration to persist changes.');
                                  }}
                                  className="text-xs"
                                >
                                  Use on Plate
                                </Button>
                                
                                {/* Sort Order Controls */}
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => reorderLogo(logo.id, Math.max(0, (logo.sortOrder || 0) - 1))}
                                    disabled={(logo.sortOrder || 0) <= 0}
                                    className="h-6 w-6 p-0 text-xs"
                                  >
                                    ↑
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => reorderLogo(logo.id, (logo.sortOrder || 0) + 1)}
                                    disabled={(logo.sortOrder || 0) >= logos.length - 1}
                                    className="h-6 w-6 p-0 text-xs"
                                  >
                                    ↓
                                  </Button>
                                </div>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleLogoToggleActive(logo.id, logo.isActive)}
                                  disabled={updatingLogo === logo.id}
                                  className="text-xs"
                                >
                                  {logo.isActive ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteLogo(logo.id)}
                                  disabled={deletingLogo === logo.id}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                                >
                                  {deletingLogo === logo.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Delete'
                                  )}
                                </Button>
                              </div>
                              
                              
                            </div>
                            </div>
                            {/* Bottom Row: Logo Details */}
                            <div className="ml-20 ">
                                <p className="text-sm font-medium text-gray-900">{logo.originalName}</p>
                                <p className="text-xs text-gray-600">
                                  Size: {logo.size ? `${(logo.size / 1024).toFixed(1)} KB` : 'Unknown'}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Uploaded by {logo.uploader?.name || 'Unknown'} on {logo.createdAt ? new Date(logo.createdAt).toLocaleDateString() : 'Unknown date'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No logos uploaded yet</p>
                          <p className="text-xs opacity-75 mt-1">Upload your first logo to get started</p>
                        </div>
                      )}
                  </CardContent>
                </Card>

                {/* License Plate Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">License Plate Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* License Plate Upload */}
                    <div className="space-y-4">
                     
                      
                      <div className="flex items-center space-x-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              uploadLicensePlate(file);
                            }
                            e.target.value = '';
                          }}
                          className="hidden"
                          id="license-plate-upload"
                        />
                        {/* <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('license-plate-upload')?.click()}
                          disabled={uploadingLicensePlate}
                        >
                          {uploadingLicensePlate ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Template
                            </>
                          )}
                        </Button> */}
                        
                        {licensePlate?.exists && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={deleteLicensePlate}
                            disabled={deletingLicensePlate}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {deletingLicensePlate ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              'Delete Template'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="space-y-4">
                      
                     
                      

                      
                      <div className="w-full max-w-md mx-auto">
                        <div className="relative flex items-center justify-center border border-dashed border-gray-300 rounded-lg p-4">
                          {/* License Plate Background */}
                          <img
                            src={originalLicensePlateData?.path ? constructFileUrl(originalLicensePlateData.path) : require('../assets/license_plate.jpg')}
                            alt="License plate template"
                            className="max-w-full max-h-96 object-contain"
                            style={{
                              minHeight: '200px',
                              minWidth: '300px'
                            }}
                            onLoad={(e) => {
                              if (originalLicensePlateData?.path) {
                                console.log('Original license plate loaded successfully from:', constructFileUrl(originalLicensePlateData.path));
                                console.log('Image dimensions:', {
                                  natural: `${e.target.naturalWidth}x${e.target.naturalHeight}px`,
                                  displayed: `${e.target.offsetWidth}x${e.target.offsetHeight}px`,
                                  backend: `${originalLicensePlateData.width}x${originalLicensePlateData.height}px`
                                });

                              } else {
                                console.log('Default license plate image loaded');
                              }
                            }}
                            onError={(e) => {
                              console.error('License plate image failed to load from:', e.target.src);
                              console.error('originalLicensePlateData:', originalLicensePlateData);
                              // Fallback to default if original not found
                              e.target.src = require('../assets/license_plate.jpg');
                            }}
                          />
                          
                          {/* Logo Overlay - Only show when logo is selected */}
                          {uploadedLogo ? (
                            <div 
                              className="absolute inset-0 flex items-center justify-center"
                              style={{
                                padding: '20px',
                                pointerEvents: uploadedLogo ? 'auto' : 'none'
                              }}
                            >
                              <img
                                src={uploadedLogo.url}
                                alt="Dealership logo"
                                className="max-w-full max-h-full object-contain"
                                style={{
                                  width: `${logoSize}%`,
                                  height: 'auto',
                                  cursor: isDraggingLogo ? 'grabbing' : 'grab',
                                  position: 'absolute',
                                  left: `${logoPosition.x}%`,
                                  top: `${logoPosition.y}%`,
                                  transform: 'translate(-50%, -50%)',
                                  userSelect: 'none',
                                  touchAction: 'none',
                                  // Add visual indicator when logo is at boundary
                                  boxShadow: (() => {
                                    const logoSizePercent = logoSize / 100;
                                    const minX = -logoSizePercent * 100;
                                    const minY = -logoSizePercent * 100;
                                    const isAtBoundary = logoPosition.x <= minX || logoPosition.x >= 100 || 
                                                       logoPosition.y <= minY || logoPosition.y >= 100;
                                    return isAtBoundary ? '0 0 8px rgba(255, 0, 0, 0.3)' : 'none';
                                  })()
                                }}
                                draggable={false}
                                onMouseDown={handleLogoDragStart}
                                onTouchStart={handleLogoDragStart}
                                onLoad={(e) => {
                                  console.log('Logo loaded successfully:', uploadedLogo.url);
                                }}
                                onError={(e) => {
                                  console.error('Logo image failed to load:', uploadedLogo.url);
                                  console.error('Logo object:', uploadedLogo);
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            /* Logo Selection Prompt */
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center bg-black/50 text-white p-4 rounded-lg">
                                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Select a logo to preview</p>
                                <p className="text-xs opacity-75 mt-1">Choose from your uploaded logos</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Logo Size Slider - Only show when logo is selected */}
                      {uploadedLogo && (
                        <div className="mt-4 bg-black/70 text-white p-3 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Label className="text-xs text-white">Logo Size:</Label>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={logoSize}
                              onChange={(e) => setLogoSize(parseInt(e.target.value))}
                              className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <span className="text-xs w-12 text-center">{logoSize}%</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Save Button for License Plate */}
                    {uploadedLogo && (
                      <div className="pt-4 space-y-2">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              // Reset to center of the license plate
                              setLogoPosition({ x: 50, y: 50 });
                            }}
                            className="flex-1"
                          >
                            Reset Position
                          </Button>
                                                      <Button
                              variant="outline"
                              onClick={async () => {
                                setSavingLicensePlateConfig(true);
                                try {
                                  // Create FormData with license plate template but no logo
                                  const formData = new FormData();
                                
                                  // Use the stored original license plate image, fetch from backend path, or fall back to default
                                  let licensePlateFile;
                                  if (originalLicensePlate) {
                                    // Use stored file if available
                                    licensePlateFile = originalLicensePlate;
                                  } else if (originalLicensePlateData?.path) {
                                    // Try to construct URL from path and fetch, or fall back to default
                                    try {
                                      // Try to fetch from the constructed path URL
                                      const imageUrl = constructFileUrl(originalLicensePlateData.path);
                                      const imageResponse = await fetch(imageUrl);
                                      if (imageResponse.ok) {
                                        licensePlateFile = await imageResponse.blob();
                                      } else {
                                        throw new Error('Failed to fetch image from constructed URL');
                                      }
                                    } catch (error) {
                                      console.error('Failed to fetch image from path, using default:', error);
                                      // Fall back to default static image
                                      const defaultImageResponse = await fetch(require('../assets/license_plate.jpg'));
                                      licensePlateFile = await defaultImageResponse.blob();
                                    }
                                  } else {
                                    // Fall back to default static image
                                    const defaultImageResponse = await fetch(require('../assets/license_plate.jpg'));
                                    licensePlateFile = await defaultImageResponse.blob();
                                  }
                                  formData.append('licensePlate', licensePlateFile, 'license_plate.jpg');
                                
                                  // Clear logo configuration by setting all values to null
                                  formData.append('logoId', '');
                                  formData.append('logoSize', '');
                                  formData.append('logoPositionX', '');
                                  formData.append('logoPositionY', '');
                                  formData.append('logoConfig', '');
                                
                                  // Use POST route to upload license plate without logo
                                  const response = await axiosInstance.post(
                                    `/dealerships/${dealershipData.id}/license-plate`,
                                    formData,
                                    {
                                      headers: {
                                        'Content-Type': 'multipart/form-data',
                                      },
                                    }
                                  );
                                
                                  console.log('Logo configuration cleared:', response.data);
                                  setSuccess('Logo removed from license plate');
                                
                                  // Clear local state
                                  setUploadedLogo(null);
                                  setLogoSize(50);
                                  setLogoPosition({ x: 50, y: 50 });
                                
                                  // Refresh license plate data
                                  await fetchLicensePlate();
                                
                                } catch (error) {
                                  console.error('Error clearing logo configuration:', error);
                                  setError(error.response?.data?.error || 'Failed to remove logo');
                                } finally {
                                  setSavingLicensePlateConfig(false);
                                }
                              }}
                              disabled={savingLicensePlateConfig}
                              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {savingLicensePlateConfig ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Removing...
                                </>
                              ) : (
                                'Remove Logo'
                              )}
                            </Button>
                          <Button
                            onClick={async () => {
                              if (!uploadedLogo?.id) {
                                setError('No logo selected to save configuration');
                                return;
                              }
                              
                              setSavingLicensePlateConfig(true);
                              try {
                                // Create FormData with license plate template and logo configuration
                                const formData = new FormData();
                                
                                // Use the stored original license plate image, fetch from backend path, or fall back to default
                                let licensePlateFile;
                                if (originalLicensePlate) {
                                  // Use stored file if available
                                  licensePlateFile = originalLicensePlate;
                                                                  } else if (originalLicensePlateData?.path) {
                                    // Try to construct URL from path and fetch, or fall back to default
                                    try {
                                      // Try to fetch from the constructed path URL
                                      const imageUrl = constructFileUrl(originalLicensePlateData.path);
                                      const imageResponse = await fetch(imageUrl);
                                      if (imageResponse.ok) {
                                        licensePlateFile = await imageResponse.blob();
                                        console.log('Successfully fetched license plate from backend path:', imageUrl);
                                      } else {
                                        throw new Error('Failed to fetch image from constructed URL');
                                      }
                                    } catch (error) {
                                      console.error('Failed to fetch image from path, using default:', error);
                                      // Fall back to default static image
                                      const defaultImageResponse = await fetch(require('../assets/license_plate.jpg'));
                                      licensePlateFile = await defaultImageResponse.blob();
                                    }
                                  } else {
                                  // Fall back to default static image
                                  const defaultImageResponse = await fetch(require('../assets/license_plate.jpg'));
                                  licensePlateFile = await defaultImageResponse.blob();
                                }
                                formData.append('licensePlate', licensePlateFile, 'license_plate.jpg');
                                
                                // Add logo configuration - send all values as percentages
                                formData.append('logoId', uploadedLogo.id);
                                formData.append('logoSize', logoSize); // Send percentage directly (32%)
                                formData.append('logoPositionX', logoPosition.x); // Send percentage directly (50%)
                                formData.append('logoPositionY', logoPosition.y); // Send percentage directly (50%)
                                
                                // Send actual image dimensions so backend can calculate correct pixel values
                                if (originalLicensePlateData?.width && originalLicensePlateData?.height) {
                                  formData.append('imageWidth', originalLicensePlateData.width);
                                  formData.append('imageHeight', originalLicensePlateData.height);
                                }
                                
                                formData.append('logoConfig', JSON.stringify({
                                  lastUpdated: new Date().toISOString()
                                }));
                                
                                // Debug logging
                                console.log('Sending logo configuration to backend:', {
                                  logoId: uploadedLogo.id,
                                  logoSize: `${logoSize}% (percentage)`,
                                  logoPosition: `${logoPosition.x}%, ${logoPosition.y}% (percentage)`,
                                  imageDimensions: `${originalLicensePlateData?.width || 'unknown'}x${originalLicensePlateData?.height || 'unknown'}px`,
                                  actualDimensionsSent: originalLicensePlateData?.width && originalLicensePlateData?.height ? 
                                    `${originalLicensePlateData.width}x${originalLicensePlateData.height}` : 'Not sent'
                                });
                                
                                // Use POST route to upload composed license plate
                                const response = await axiosInstance.post(
                                  `/dealerships/${dealershipData.id}/license-plate`,
                                  formData,
                                  {
                                    headers: {
                                      'Content-Type': 'multipart/form-data',
                                    },
                                  }
                                );
                                
                                console.log('License plate composed and saved:', response.data);
                                setSuccess('License plate with logo configuration saved successfully!');
                                
                                // Refresh license plate data to get updated configuration
                                await fetchLicensePlate();
                                
                              } catch (error) {
                                console.error('Error saving configuration:', error);
                                setError(error.response?.data?.error || 'Failed to save configuration');
                              } finally {
                                setSavingLicensePlateConfig(false);
                              }
                            }}
                            disabled={savingLicensePlateConfig}
                            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            {savingLicensePlateConfig ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Composing...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Configuration
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Drag the logo to position it on the license plate
                        </p>
 {/* Current Logo Info */}
 {uploadedLogo && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <img
                              src={uploadedLogo.url}
                              alt="Selected logo"
                              className="w-8 h-8 object-contain rounded border"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{uploadedLogo.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Size: {logoSize}% • Position: {logoPosition.x.toFixed(1)}%, {logoPosition.y.toFixed(1)}%
                              </p>
                              <p className="text-xs text-blue-600 font-medium">
                                ⚠️ Adjust position/size and click Save Configuration to generate and save the composed license plate
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                💡 Logo is constrained to stay within license plate boundaries
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
          </div>
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

      {/* Logo Preview Modal */}
      {showLogoPreview && previewLogo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Logo Preview</h3>
              <button
                onClick={() => {
                  setShowLogoPreview(false);
                  setPreviewLogo(null);
                }}
                className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={previewLogo.url}
                  alt={`Logo: ${previewLogo.name}`}
                  className="max-w-full max-h-96 object-contain rounded border"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Name:</span>
                  <span className="text-sm text-muted-foreground">{previewLogo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Size:</span>
                  <span className="text-sm text-muted-foreground">
                    {previewLogo.fileSize ? `${Math.round(previewLogo.fileSize / 1024)}KB` : 'Unknown'}
                  </span>
                </div>
                {previewLogo.uploader && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Uploaded by:</span>
                    <span className="text-sm text-muted-foreground">{previewLogo.uploader.name}</span>
                  </div>
                )}
                {previewLogo.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Uploaded:</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(previewLogo.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowLogoPreview(false);
                    setPreviewLogo(null);
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setUploadedLogo({
                      id: previewLogo.id,
                      url: previewLogo.url,
                      name: previewLogo.name,
                      backendData: previewLogo
                    });
                    setLogoSize(50);
                    setLogoPosition({ x: 50, y: 50 }); // Reset position for new logo
                    setShowLogoPreview(false);
                    setPreviewLogo(null);
                  }}
                  className="flex-1"
                >
                  Use on License Plate
                </Button>
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
