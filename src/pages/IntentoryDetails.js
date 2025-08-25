import React, { useEffect, useState, useContext } from "react";
import { Button, Popconfirm, message, Modal } from "antd";
import axios from "../axiosInstance";
import JSZip from "jszip";
import { useParams, useNavigate, useLocation } from "react-router-dom"; // Import useParams, useNavigate, and useLocation
import ImageUploader from "../components/ImageUploader";
import JwtContext from "../JwtContext"; // Import JwtContext
import {
  ArrowLeftOutlined,
  CameraOutlined,
  EditFilled,
  ArrowRightOutlined,
} from "@ant-design/icons";
import ImageCaptureInstructionCard from "../components/ImageCaptureInstructionCard";
import CameraCaptureScreen from "../components/CameraCaptureScreen";
import CameraCapturePreviewScreen from "../components/CameraCapturePreviewScreen";
import { isMobile as isMobileDevice, isTablet } from "react-device-detect";
import DealershipContext from "../contexts/DealershipContext";
import { handleUploadImage } from "../components/ImageUploader";
import ImageAdjustor from "./ImageAdjustor";
import StencilDebugViewer from "../components/ImageDebugger";
import { BACKEND_URL } from "../constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button as ShadCNButton } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  ArrowLeft,
  Camera,
  Trash2,
  Car,
  Hash,
  FileText,
  Download,
  MoreVertical,
  Edit,
  Bug,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Upload,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import ImageGallerySkeleton from "../components/ImageGallerySkeleton";

// Import marker images
import markerFrontQuarter from "../assets/marker_front_quarter.png";
import markerFront from "../assets/marker_front.png";
import markerSide from "../assets/marker_side.png";
import markerBackQuarter from "../assets/marker_back_quarter.png";
import markerBack from "../assets/marker_back.png";

// Dynamic device detection that accounts for orientation
const useDynamicDeviceDetection = () => {
  const [isMobile, setIsMobile] = useState(isMobileDevice);
  const [isTabletMode, setIsTabletMode] = useState(isTablet);

  useEffect(() => {
    const updateDeviceType = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isMobileLandscape = isMobileDevice && isLandscape;

      // If mobile is in landscape, treat it as tablet
      setIsMobile(isMobileDevice && !isLandscape);
      setIsTabletMode(isTablet || isMobileLandscape);
    };

    updateDeviceType();

    window.addEventListener("resize", updateDeviceType);
    window.addEventListener("orientationchange", updateDeviceType);

    return () => {
      window.removeEventListener("resize", updateDeviceType);
      window.removeEventListener("orientationchange", updateDeviceType);
    };
  }, []);

  return { isMobile, isTabletMode };
};

function VehicleDetail() {
  const { isMobile, isTabletMode } = useDynamicDeviceDetection();
  const [userDealership, setUserDealership] = useState(
    () => localStorage.getItem("userDealership") || null
  );
  const { id: vehicleId } = useParams(); // Use useParams to get vehicleId
  const location = useLocation(); // Get location to access passed state
  const { jwtToken } = useContext(JwtContext); // Use JwtContext for authentication

  // Initialize vehicle state with passed data if available
  const [vehicle, setVehicle] = useState(() => {
    const passedVehicleData = location.state?.vehicleData;
    console.log("Initial vehicle data from location state:", passedVehicleData);
    return passedVehicleData || {};
  });
  const [labels, setLabels] = useState([]); // To store labels and associated images
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showRotateOverlay, setShowRotateOverlay] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [viewExistingImage, setViewExistingImage] = useState(false);
  const [viewImageModal, setViewImageModal] = useState(false);
  const [selectedImagePath, setSelectedImagePath] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(-1);
  const [adjustingImage, setAdjustingImage] = useState(null); // store image object to adjust
  const [debugImage, setDebugImage] = useState(null); // store image object for debug viewer
  const [currentImageIndex, setCurrentImageIndex] = useState(null); // index into labels[]
  const [deleting, setDeleting] = useState(false); // for delete button loading state
  const [isDeletingImage, setIsDeletingImage] = useState(null); // track specific image being deleted (imageId)
  const [selectedImageModal, setSelectedImageModal] = useState(null); // for image preview modal
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0); // current shot index in gallery
  const [cachedLabels, setCachedLabels] = useState([]); // cached labels for faster loading
  const [isLoadingLabels, setIsLoadingLabels] = useState(true); // loading state for labels
  const [isLoadingVehicle, setIsLoadingVehicle] = useState(false); // loading state for vehicle
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false); // track if auto-capture was already triggered
  const { selectedDealership } = useContext(DealershipContext);

  // Auto-trigger capture all photos on mobile landscape
  useEffect(() => {
    const checkOrientationAndTriggerCapture = () => {
      // Only trigger on mobile devices (not tablets) and if not already triggered
      if (isMobile && !isTabletMode && labels.length > 0 && !hasAutoTriggered) {
        // Check if in landscape orientation
        const isLandscape = window.innerHeight < window.innerWidth;
        
        if (isLandscape && !selectedRecord && !isCapturing && !isPreviewing) {
          // Auto-trigger capture all photos
          setSelectedRecord(labels[0]);
          setIsCapturing(false); // show instructions first
          setHasAutoTriggered(true); // prevent multiple auto-triggers
        }
      }
    };

    // Check on component mount with a brief delay to ensure everything is loaded
    const mountTimeout = setTimeout(checkOrientationAndTriggerCapture, 500);

    // Listen for orientation changes
    const handleOrientationChange = () => {
      // Small delay to ensure window dimensions are updated
      setTimeout(checkOrientationAndTriggerCapture, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      clearTimeout(mountTimeout);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, [isMobile, isTabletMode, labels, selectedRecord, isCapturing, isPreviewing, hasAutoTriggered]);

  // Gallery navigation functions
  const openGallery = (label) => {
    const index = labels.findIndex(l => l.id === label.id);
    setCurrentGalleryIndex(index);
    setSelectedImageModal(label);
  };

  const navigateGallery = (direction) => {
    const newIndex = direction === 'next' 
      ? (currentGalleryIndex + 1) % labels.length 
      : (currentGalleryIndex - 1 + labels.length) % labels.length;
    
    setCurrentGalleryIndex(newIndex);
    setSelectedImageModal(labels[newIndex]);
  };

  const getCurrentShot = () => {
    return labels[currentGalleryIndex];
  };

  const hasCurrentImage = () => {
    const currentShot = getCurrentShot();
    return currentShot?.Images && currentShot.Images.length > 0;
  };

  // Keyboard navigation
  const handleKeyPress = (event) => {
    if (!selectedImageModal) return;
    
    if (event.key === 'ArrowLeft') {
      navigateGallery('prev');
    } else if (event.key === 'ArrowRight') {
      navigateGallery('next');
    } else if (event.key === 'Escape') {
      setSelectedImageModal(null);
    }
  };

  // Add keyboard event listener when modal is open
  useEffect(() => {
    if (selectedImageModal) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [selectedImageModal, currentGalleryIndex]);

  // Cache management functions
  const getCacheKey = () => `vehicle_${vehicleId}_labels`;

  const saveToCache = (data) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        vehicleId,
      };
      localStorage.setItem(getCacheKey(), JSON.stringify(cacheData));
      setCachedLabels(data);
    } catch (error) {
      console.error("Cache save error:", error);
    }
  };

  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (cached) {
        const cacheData = JSON.parse(cached);
        // Cache valid for 1 hour
        if (
          Date.now() - cacheData.timestamp < 3600000 &&
          cacheData.vehicleId === vehicleId
        ) {
          setCachedLabels(cacheData.data);
          setLabels(cacheData.data);
          setIsLoadingLabels(false);
          return cacheData.data;
        }
      }
    } catch (error) {
      console.error("Cache load error:", error);
    }
    return null;
  };

  const clearCache = () => {
    try {
      localStorage.removeItem(getCacheKey());
      setCachedLabels([]);
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  };

  // Helper function to download a single image properly
  const downloadSingleImage = async (imagePath, fileName) => {
    try {
      const imageUrl = `${BACKEND_URL}/uploads/${imagePath}`;
      const response = await fetch(imageUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the object URL
        URL.revokeObjectURL(link.href);
        
        message.success("Image downloaded successfully");
      } else {
        message.error("Failed to download image");
      }
    } catch (error) {
      console.error("Download error:", error);
      message.error("Failed to download image");
    }
  };

  // Download all images as zip function
  const downloadAllImages = async () => {
    try {
      const imagesWithLabels = labels.filter(
        (label) => label.Images?.length > 0
      );
      if (imagesWithLabels.length === 0) {
        message.warning("No images to download");
        return;
      }

      // Show loading message
      const loadingMessage = message.loading("Creating zip file...", 0);

      // Create a new JSZip instance
      const zip = new JSZip();
      let imageCount = 0;

      // Fetch and add each image to the zip
      for (const label of imagesWithLabels) {
        for (const image of label.Images) {
          try {
            const imageUrl = `${BACKEND_URL}/uploads/${image.path}`;
            const response = await fetch(imageUrl);
            
            if (response.ok) {
              const blob = await response.blob();
              const fileName = `${vehicle?.year}_${vehicle?.make}_${vehicle?.model}_${label.name}_${imageCount + 1}.jpg`;
              zip.file(fileName, blob);
              imageCount++;
            } else {
              console.warn(`Failed to fetch image: ${imageUrl}`);
            }
          } catch (fetchError) {
            console.warn(`Error fetching image ${image.path}:`, fetchError);
          }
        }
      }

      if (imageCount === 0) {
        loadingMessage();
        message.error("No images could be downloaded");
        return;
      }

      // Generate the zip file
      loadingMessage();
      message.loading("Generating zip file...", 0);
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Create download link
      const zipFileName = `${vehicle?.year}_${vehicle?.make}_${vehicle?.model}_Images.zip`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the object URL
      URL.revokeObjectURL(link.href);

      message.destroy();
      message.success(`Downloaded ${imageCount} images as ${zipFileName}`);
    } catch (error) {
      console.error("Download error:", error);
      message.destroy();
      message.error("Failed to create zip file");
    }
  };
  const shotMarkers = {
    "Front Quarter Shot": {
      src: require("../assets/marker_front_quarter.png"),
      style: { width: "62%", left: "26%", top: "54%" },
    },
    "Front Shot": {
      src: require("../assets/marker_front.png"),
      style: { width: "60%", left: "21%", top: "68%" },
    },
    "Side Shot": {
      src: require("../assets/marker_side.png"),
      style: { width: "94%", left: "3%", top: "54%" },
    },
    "Back Quarter Shot": {
      src: require("../assets/marker_back_quarter.png"),
      style: { width: "75%", left: "15%", top: "55%" },
    },
    "Back Shot": {
      src: require("../assets/marker_back.png"),
      style: { width: "55%", left: "25%", top: "62%" },
    },
  };

  // Helper function to determine if a shot requires background removal
  // Background removal is required for the first 5 shots: frontQuarter, front, back, backQuarter, side
  const requiresBgRemoval = (labelName) => {
    const bgRemovalShots = [
      "Front Quarter Shot",
      "Front Shot", 
      "Back Shot",
      "Back Quarter Shot",
      "Side Shot"
    ];
    return bgRemovalShots.includes(labelName);
  };

  function useIsPortrait() {
    const [isPortrait, setIsPortrait] = useState(
      () => window.matchMedia("(orientation: portrait)").matches
    );

    useEffect(() => {
      const mq = window.matchMedia("(orientation: portrait)");
      const handler = (e) => setIsPortrait(e.matches); // e.matches === true ⇒ portrait

      // modern & legacy support
      mq.addEventListener
        ? mq.addEventListener("change", handler)
        : mq.addListener(handler);

      return () =>
        mq.removeEventListener
          ? mq.removeEventListener("change", handler)
          : mq.removeListener(handler);
    }, []);

    return isPortrait;
  }

  const isPortrait = useIsPortrait();

  useEffect(() => {
    setShowRotateOverlay(Boolean(selectedRecord && isPortrait));
  }, [selectedRecord, isPortrait]);

  useEffect(() => {
    if (jwtToken) {
      // Check if we have vehicle data from navigation state
      const passedVehicleData = location.state?.vehicleData;
      console.log("Location state vehicle data:", passedVehicleData);
      console.log("Current vehicleId:", vehicleId);
      console.log("Current vehicle state:", vehicle);

      // If we have passed data and it matches the current vehicleId, use it immediately
      if (passedVehicleData && passedVehicleData.id === vehicleId) {
        setVehicle(passedVehicleData);
        console.log("Using passed vehicle data:", passedVehicleData);
      } else if (vehicle.id && vehicle.id === vehicleId) {
        // We already have the correct vehicle data
        console.log("Using existing vehicle data:", vehicle);
      } else if (!vehicle.id || vehicle.id !== vehicleId) {
        // Only fetch vehicle details if we don't already have them
        setIsLoadingVehicle(true);
        axios
          .get(`/vehicles/${vehicleId}`, {})
          .then((res) => {
            setVehicle(res.data);
            setIsLoadingVehicle(false);
          })
          .catch((err) => {
            message.error("Error fetching vehicle details");
            setIsLoadingVehicle(false);
          });
      }

      // Try to load from cache first
      const cachedData = loadFromCache();
      if (cachedData) {
        console.log("Loaded from cache:", cachedData);
      } else {
        // If no cache, show loading state
        setIsLoadingLabels(true);
      }

      // Fetch labels and associated images for this vehicle
      axios
        .get(`/labels`, {
          params: { vehicleId },
        })
        .then((res) => {
          //sort labels by id
          res.data.sort((a, b) => a.id - b.id);
          setLabels(res.data);
          saveToCache(res.data); // Save to cache
          setIsLoadingLabels(false);
          console.log("labels", res.data);
        })
        .catch((err) => {
          message.error("Error fetching labels");
          setIsLoadingLabels(false);
        });
    }
  }, [vehicleId, jwtToken, vehicle.id, location.state]);

  useEffect(() => {
    if (selectedRecord && !isCapturing) {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedRecord, isCapturing]);

  // Using async/await
  const getLabels = async () => {
    try {
      setIsLoadingLabels(true);
      const { data } = await axios.get("/labels", { params: { vehicleId } });
      data.sort((a, b) => a.id - b.id);
      console.log("Fetched labels:", data);
      setLabels(data); // updates state
      saveToCache(data); // Save to cache
      setIsLoadingLabels(false);
      return data; // log fresh data (state update is async)
    } catch (err) {
      message.error("Error fetching labels");
      setIsLoadingLabels(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "Are you sure you want to delete this vehicle?",
      content: "This action cannot be undone.",
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      async onOk() {
        try {
          setDeleting(true);
          await axios.delete(`/vehicles/${vehicleId}`);
          setDeleting(false);
          window.history.back();
          message.success("Vehicle deleted successfully");
        } catch (err) {
          setDeleting(false);
          console.error("Delete error:", err);
          const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to delete vehicle";
          message.error(errorMessage);
        }
      },
    });
  };

  const handleDeleteImage = (imageId, labelId) => {
    setIsDeletingImage(imageId); // Set loading state for this specific image
    
    axios
      .delete(`/images/${imageId}/${labelId}`, {})
      .then(() => {
        // Remove the image from the label
        setLabels((prevLabels) =>
          prevLabels.map((label) =>
            label.id === labelId ? { ...label, Images: [] } : label
          )
        );
        message.success("Image deleted successfully");

        return axios.get(`/labels`, {
          params: { vehicleId },
        });
      })
      .catch((err) => {
        const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to delete image";
        message.error(errorMessage);
        console.error("Error deleting image: ", err);
      })
      .finally(() => {
        setIsDeletingImage(null); // Clear loading state
      });
  };
  const enhanceImage = (imageId, labelId) => {
    setIsEnhancing(labelId);
    axios
      .post(`/images/enhance`, { imageId, labelId })
      .then((result) => {
        console.log("Enhance result:", result);
        message.success("Image enhanced successfully");
        setIsEnhancing(-1);
        // Refresh the labels after enhancing
        axios.get(`/labels`, { params: { vehicleId } }).then((res) => {
          res.data.sort((a, b) => a.id - b.id);
          setLabels(res.data);
        });
      })
      .catch((err) => {
        const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to enhance image";
        message.error(errorMessage);
        console.error("Error enhancing image: ", err);
        setIsEnhancing(-1);
      });
  };

  const handleImageUploadSuccess = () => {
    setIsLoadingLabels(true);
    axios
      .get(`/labels`, { params: { vehicleId } })
      .then((res) => {
        res.data.sort((a, b) => a.id - b.id);
        setLabels(res.data);
        saveToCache(res.data);
        setIsLoadingLabels(false);
      })
      .catch((err) => {
        message.error("Failed to refresh labels");
        console.error("Label refresh error:", err);
        setIsLoadingLabels(false);
      });
  };

  const dataURLtoFile = (dataUrl, filename) => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const columns = [
    {
      title: "Label Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Image",
      key: "image",
      render: (_, record, idx) => {
        const img = record.Images?.[0];
        const originalPath = img?.originalPath;
        console.log("originalPath", originalPath);
        console.log("Image for record:", record);
        const canAdjust =
          img?.scaleAdjustment != null && img?.transparentPath != null;
        const uploaderObj = record.Images?.[0]?.Uploader || {};
        return img ? (
          <div
            style={{
              position: "relative",
              display: "inline-block",
              width: 80,
              overflow: "visible", // allow the badge to overflow
            }}
          >
            <img
              alt={record.name}
              src={`${BACKEND_URL}/uploads/${img.path}`}
              style={{
                width: "100%",
                borderRadius: 4,
                cursor: "pointer",
                display: "block",
              }}
              onClick={() => {
                // const idx = labels.findIndex((l) => l.id === record.id);
                setCurrentImageIndex(idx);

                setViewImageModal(true);
              }}
            />
            {/* Delete spinner overlay */}
            {isDeletingImage === img.id && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4
              }}>
                <Loader2 style={{ width: 20, height: 20, color: 'white' }} className="animate-spin" />
              </div>
            )}
            {uploaderObj?.username ? (
              <small style={{ whiteSpace: "nowrap" }}>
                by {uploaderObj?.username}
              </small>
            ) : (
              ""
            )}
            {canAdjust && (
              <Button
                type="primary"
                shape="circle"
                size="small"
                icon={<EditFilled />}
                onClick={() => setAdjustingImage(img)}
                style={{
                  position: "absolute",
                  top: 0, // halfway down the container
                  right: -8, // 8px outside the right edge
                  transform: "translateY(-50%)",
                  padding: 0,
                  lineHeight: 1,
                }}
              />
            )}

            {canAdjust && (
              <div
                style={{
                  position: "absolute",
                  top: 0, // halfway down the container
                  left: -8, // 8px outside the right edge
                  transform: "translateY(-50%)",
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                <StencilDebugViewer
                  imageUrl={`${BACKEND_URL}/uploads/${originalPath}`}
                  markerSrc={shotMarkers[record.name]?.src}
                  markerStyle={shotMarkers[record.name]?.style}
                />
              </div>
            )}
          </div>
        ) : (
          <span style={{ color: "grey" }}>No Image</span>
        );
      },
    },

    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        const captureHandler = () => {
          console.log("Capture button clicked for label:", record.name);
          setSelectedRecord(record);
        };

        return (
          <>
            {record.Images?.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  maxWidth: "100px",
                }}
              >
                {/* {
                  //
                  <Button
                    onClick={() => enhanceImage(record.Images[0].id, record.id)}
                    loading={isEnhancing === record.id}
                  >
                    Enhance
                  </Button>
                } */}
                <Popconfirm
                  title="Are you sure you want to delete this image?"
                  onConfirm={() =>
                    handleDeleteImage(record.Images[0].id, record.id)
                  }
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="default" danger>
                    Remove
                  </Button>
                </Popconfirm>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div>
                  <ImageUploader
                    vehicleId={vehicleId}
                    labelId={record.id}
                    requireBgRemoval={record.requireBgRemoval}
                    onUploadSuccess={handleImageUploadSuccess}
                  />
                </div>

                <div>
                  {(isMobile || isTabletMode) && (
                    <Button
                      icon={<CameraOutlined />}
                      type="primary"
                      onClick={captureHandler}
                    >
                      Capture
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        );
      },
    },
  ];

  const selectedLabel = labels[currentImageIndex] ?? {};
  const imageSource = selectedLabel.Images?.[0]?.path
    ? `${BACKEND_URL}/uploads/${selectedLabel.Images[0].path}`
    : null;

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-6">
        {/* Header Section */}
        <div className="mb-6">
          {/* Back Button */}
          <div className="mb-4">
            <ShadCNButton
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inventory
            </ShadCNButton>
          </div>

          {/* Vehicle Info Card */}
          <Card className="border-border">
            <CardHeader className="pb-3 pt-2">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-2xl font-semibold">
                    {vehicle?.year} {vehicle?.make} {vehicle?.model}
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>VIN: {vehicle?.vin || "N/A"}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Hash className="h-4 w-4" />
                      <span>Stock: {vehicle?.stock || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div
                  className={`flex items-center gap-3 ${
                    isTabletMode ? "justify-between w-full" : ""
                  }`}
                >
                  {/* Left side buttons - Download and Delete */}
                  <div className="flex items-center gap-3">
                    {/* Download button - text on desktop, icon on mobile/tablet */}
                    <div className="hidden lg:block">
                      <ShadCNButton
                        variant="outline"
                        onClick={downloadAllImages}
                        className="border-border hover:bg-accent px-4"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download All
                      </ShadCNButton>
                    </div>

                    <div className="block lg:hidden">
                      <ShadCNButton
                        variant="outline"
                        size="icon"
                        onClick={downloadAllImages}
                        className="h-10 w-10 border-border hover:bg-accent"
                      >
                        <Download className="h-4 w-4" />
                      </ShadCNButton>
                    </div>

                    <ShadCNButton
                      variant="destructive"
                      size="icon"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="h-10 w-10 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </ShadCNButton>
                  </div>

                  {/* Right side - Capture All Photos button (iPad only) */}
                  {isTabletMode && (
                    <ShadCNButton
                      onClick={() => {
                        if (labels.length > 0) {
                          setSelectedRecord(labels[0]);
                          setIsCapturing(false); // show instructions first
                        }
                      }}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 px-6"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Capture All Photos
                    </ShadCNButton>
                  )}

                  {/* Mobile only - Capture All Photos button */}
                  {isMobile && !isTabletMode && (
                    <ShadCNButton
                      onClick={() => {
                        if (labels.length > 0) {
                          setSelectedRecord(labels[0]);
                          setIsCapturing(false); // show instructions first
                        }
                      }}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 px-6"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Capture All Photos
                    </ShadCNButton>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Content Section */}
        <div className="space-y-6">
          {/* Image Gallery */}
          <Card className="border-border">
            <CardContent className="pt-6">
              {isLoadingLabels ? (
                <ImageGallerySkeleton count={10} />
              ) : labels.length === 0 && !isMobile && !isTabletMode ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No photos captured yet</p>
                  <p className="text-xs mt-1">
                    Use the capture button to add photos
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {labels.map((label, index) => {
                    const hasImage = label.Images?.[0]?.path;

                    return (
                      <Card
                        key={label.id}
                        className="overflow-hidden group relative"
                      >
                        <CardContent className="p-0">
                          <div className="relative">
                            {hasImage ? (
                              <>
                                <img
                                  src={`${BACKEND_URL}/uploads/${label.Images[0].path}`}
                                  alt={label.name}
                                  className="w-full aspect-[4/3] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => openGallery(label)}
                                />
                                {/* Delete spinner overlay */}
                                {isDeletingImage === label.Images[0].id && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                                  </div>
                                )}
                              </>
                            ) : (
                              <div
                                className="w-full aspect-[4/3] bg-muted/50 flex items-center justify-center cursor-pointer hover:bg-muted/70 transition-colors border-dashed border-2 border-muted-foreground/20"
                                onClick={() => {
                                  setSelectedRecord(label);
                                  setIsCapturing(false); // show instructions first
                                }}
                              >
                                <div className="text-center">
                                  <Camera className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                                  <p className="text-xs text-muted-foreground">
                                    Capture
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Badge - Always show, positioned relative to card */}
                          <div className="absolute top-2 left-2 z-10">
                            <Badge
                              variant="secondary"
                              className="bg-background/80"
                            >
                              {label.name}
                            </Badge>
                          </div>

                          {/* Upload Button - Only show if no image, positioned at bottom right */}
                          {!hasImage && (
                            <div className="absolute bottom-2 right-2 opacity-100 z-10">
                              <ImageUploader
                                vehicleId={vehicleId}
                                labelId={label.id}
                                requireBgRemoval={requiresBgRemoval(label.name)}
                                onUploadSuccess={handleImageUploadSuccess}
                                trigger={
                                  <ShadCNButton
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 w-8 p-0 bg-background/80 hover:bg-background/90"
                                    title="Upload Image"
                                  >
                                    <Upload className="h-4 w-4" />
                                  </ShadCNButton>
                                }
                              />
                            </div>
                          )}

                          {/* Menu Button - Only show if there's an image */}
                          {hasImage && (
                            <div className="absolute top-2 right-2 opacity-100 z-10">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <ShadCNButton
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 w-8 p-0 bg-background/80 hover:bg-background/90"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </ShadCNButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const image = label.Images[0];
                                      const fileName = `${vehicle?.year}_${vehicle?.make}_${vehicle?.model}_${label.name}.jpg`;
                                      downloadSingleImage(image.path, fileName);
                                    }}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const image = label.Images[0];
                                      setAdjustingImage({
                                        id: image.id,
                                        labelId: label.id,
                                        path: image.path,
                                        transparentPath: image.transparentPath,
                                        xAxis: image.xAxis,
                                        yAxis: image.yAxis,
                                        scaleAdjustment: image.scaleAdjustment,
                                        tiltAdjustment: image.tiltAdjustment,
                                      });
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedRecord(label);
                                      setIsCapturing(false); // Show instructions first
                                    }}
                                  >
                                    <Camera className="h-4 w-4 mr-2" />
                                    Recapture
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const image = label.Images[0];
                                      console.log("image", image);
                                      console.log("label", label);
                                      console.log(
                                        "shotMarkers for label:",
                                        shotMarkers[label.name]
                                      );
                                      console.log(
                                        "markerSrc:",
                                        shotMarkers[label.name]?.src
                                      );
                                      console.log(
                                        "markerStyle:",
                                        shotMarkers[label.name]?.style
                                      );
                                      setDebugImage({
                                        imageUrl: `${BACKEND_URL}/uploads/${
                                          image.originalPath || image.path
                                        }`,
                                        markerSrc: shotMarkers[label.name]?.src,
                                        markerStyle:
                                          shotMarkers[label.name]?.style,
                                        shotName: label.name,
                                      });
                                    }}
                                  >
                                    <Bug className="h-4 w-4 mr-2" />
                                    Debug
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeleteImage(
                                        label.Images[0].id,
                                        label.id
                                      )
                                    }
                                    className="text-destructive focus:text-destructive w-full"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals and other components remain the same */}
      {isCapturing && selectedRecord ? (
        <Modal
          open={true}
          footer={null}
          closable={false}
          onCancel={() => {
            Modal.confirm({
              title: "Exit Capture?",
              content:
                "Are you sure you want to exit? Your progress will be lost.",
              okText: "Yes",
              cancelText: "No",
              onOk: () => {
                setIsCapturing(false);
                setSelectedRecord(null);
              setHasAutoTriggered(false); // reset auto-trigger flag
                setHasAutoTriggered(false); // reset auto-trigger flag
              },
            });
          }}
          destroyOnClose
          maskClosable={false}
          centered
          width="100vw"
          styles={{
            header: {
              backgroundColor: "white",
              borderBottom: "none",
              margin: 0,
              padding: 16,
            },

            content: {
              backgroundColor: "transparent",
              margin: 0,
              display: "flex",
              flexDirection: "column",
              padding: 0,
            },
            mask: {
              backgroundColor: "rgba(0, 0, 0, 0.95)",
            },
          }}
        >
          <CameraCaptureScreen
            markerSrc={shotMarkers[selectedRecord.name]?.src}
            markerStyle={shotMarkers[selectedRecord.name]?.style}
            shotType={selectedRecord.name}
            isUploading={isUploading}
            currentIndex={
              labels.findIndex((label) => label.id === selectedRecord.id) + 1
            }
            totalShots={labels.length}
            styles={{
              container: {
                margin: 0,
                maxWidth: "100vw",
                boxShadow: "none",
              },
              mask: {
                backgroundColor: "rgba(0, 0, 0, 0.95)",
              },
            }}
            modalRender={(node) => (
              <div style={{ background: "#1a1a1a" }}>{node}</div>
            )}
            onCapture={async (imageData) => {
              const file = dataURLtoFile(imageData, "snapshot.png");

              try {
                setIsUploading(true);
                // Step 1: Delete all images associated with this label
                const deleteAllImagesForLabel = async () => {
                  let hasImages = true;

                  while (hasImages) {
                    // Refetch latest label data
                    const res = await axios.get("/labels", {
                      params: { vehicleId },
                    });
                    const updatedLabels = res.data.sort((a, b) => a.id - b.id);
                    setLabels(updatedLabels); // update UI
                    const label = updatedLabels.find(
                      (l) => l.id === selectedRecord.id
                    );

                    const images = label?.Images || [];
                    if (images.length > 0) {
                      for (const img of images) {
                        try {
                          await axios.delete(`/images/${img.id}/${label.id}`);
                          console.log(
                            `Deleted image ${img.id} from label ${label.id}`
                          );
                        } catch (err) {
                          console.warn(`Failed to delete image ${img.id}`, err);
                        }
                      }
                    } else {
                      hasImages = false; // all cleared
                    }
                  }
                };

                await deleteAllImagesForLabel();

                const imageUrl = await handleUploadImage({
                  file,
                  vehicleId,
                  labelId: selectedRecord.id,
                  dealership: selectedDealership,
                  jwtToken,
                });

                message.success("Image uploaded successfully");

                handleImageUploadSuccess(); // Refresh label list again after upload
                setSelectedRecord((prev) => ({
                  ...prev,
                  Images: [{ path: imageUrl }],
                }));

                setSnapshot(`${BACKEND_URL}/uploads${imageUrl}`);
                setIsUploading(false);
                setIsPreviewing(true);
              } catch (err) {
                message.error("Failed during image capture flow");
                setIsUploading(false);
                console.error(err);
              }
            }}
            onSkip={() => {
              console.log("Skipped!");
              const currentIndex = labels.findIndex(
                (label) => label.id === selectedRecord.id
              );
              const nextRecord = labels[currentIndex + 1]; // Get the next record

              if (nextRecord) {
                setSelectedRecord(nextRecord); // set the new label
                setIsCapturing(false); // go back to instructions modal
              } else {
                // no more labels
                setSelectedRecord(null);
              setHasAutoTriggered(false); // reset auto-trigger flag
                setIsCapturing(false);
                setHasAutoTriggered(false); // reset auto-trigger flag
              }
            }}
            onBack={() => {
              setIsCapturing(false); // Go back to instruction modal
            }}
            onExampleClick={() => {
              setIsCapturing(false);
            }}
          />
        </Modal>
      ) : (
        selectedRecord && (
          <Modal
            open={!!selectedRecord}
            onCancel={() => {
              if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen();
              }
              setSelectedRecord(null);
              setHasAutoTriggered(false); // reset auto-trigger flag
            }}
            footer={null}
            destroyOnClose
            width="100vw"
            height="100vh"
            maskClosable={false}
            closeIcon={
              <span
                style={{
                  fontSize: 16,
                  color: "#fff",
                  marginRight: 24,
                  marginTop: 8,
                }}
              >
                ✕
              </span>
            }
            styles={{
              header: {
                padding: 16,
                margin: 0,
                borderBottom: "none",
                backgroundColor: "black",
                color: "white",
              },
              body: {
                margin: 0,
                backgroundColor: "black",
                borderRadius: 0,
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                padding: 0,
                color: "white",
              },
              content: {
                backgroundColor: "black",
                boxShadow: "none",
                margin: 0,
                maxWidth: "100vw",
                maxHeight: "100vh",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                position: "fixed",
                borderRadius: 0,
              },
              mask: {
                backgroundColor: "rgba(0, 0, 0, 0.95)",
              },
            }}
          >
            <ImageCaptureInstructionCard
              shotType={selectedRecord.name}
              currentIndex={
                labels.findIndex((label) => label.id === selectedRecord.id) + 1
              }
              totalShots={labels.length}
              onStartShooting={() => {
                setIsCapturing(true);
              }}
              existingImage={
                selectedRecord.Images?.[0]?.path
                  ? `${BACKEND_URL}/uploads/${selectedRecord.Images[0].path}`
                  : null
              }
              onViewExistingImage={() => {
                setViewExistingImage(true);
              }}
              onSkip={() => {
                console.log("Skipped!");
                const currentIndex = labels.findIndex(
                  (label) => label.id === selectedRecord.id
                );
                const nextRecord = labels[currentIndex + 1]; // Get the next record

                if (nextRecord) {
                  setSelectedRecord(nextRecord); // set the new label
                  setIsCapturing(false); // go back to instructions modal
                } else {
                  // no more labels
                  setSelectedRecord(null);
              setHasAutoTriggered(false); // reset auto-trigger flag
                  setIsCapturing(false);
                }
              }}
            />
          </Modal>
        )
      )}

      {showRotateOverlay && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            color: "#fff",
            zIndex: 100000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "20px",
          }}
        >
          <button
            onClick={() => {
              setShowRotateOverlay(false);
              setSelectedRecord(null);
              setHasAutoTriggered(false); // reset auto-trigger flag
            }}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "transparent",
              color: "#fff",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              zIndex: 100001,
            }}
            aria-label="Close overlay"
          >
            ✕
          </button>

          <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>
            Rotate Your Device
          </h2>
          <p style={{ fontSize: "18px", maxWidth: "400px" }}>
            Please rotate your screen to <strong>landscape</strong> to continue
            (ensure your rotation lock is off).
          </p>
          <div style={{ fontSize: "40px", marginTop: "20px" }}>📱🔄</div>
        </div>
      )}

      {isPreviewing && snapshot && selectedRecord && (
        <Modal
          transitionName=""
          open={true}
          footer={null}
          closable={false}
          destroyOnClose
          maskClosable={true}
          centered
          width="100vw"
          styles={{
            header: {
              backgroundColor: "white",
              padding: 16,
              margin: 0,
              borderBottom: "none",
              color: "#fff",
            },
            content: {
              display: "flex",
              flexDirection: "column",
              backgroundColor: "transparent",
              boxShadow: "none",
              padding: 0,
            },

            body: {
              backgroundColor: "transparent",
            },
            mask: {
              backgroundColor: "rgba(0, 0, 0, 0.95)",
            },
          }}
        >
          <CameraCapturePreviewScreen
            imageData={snapshot}
            shotType={selectedRecord.name}
            currentIndex={selectedRecord.id}
            totalShots={labels.length}
            onAdjust={() => {
              //find the label
              const label = labels.find(
                (label) => label.id === selectedRecord.id
              );
              console.log("Label found:", label);
              setAdjustingImage(label?.Images[0]);
            }}
            onRetake={() => {
              setIsPreviewing(false);
              setSnapshot(null);
              setIsCapturing(true); // back to camera
            }}
            onContinue={() => {
              const currentIndex = labels.findIndex(
                (label) => label.id === selectedRecord.id
              );
              const nextRecord = labels[currentIndex + 1];

              setIsPreviewing(false);
              setSnapshot(null);

              if (nextRecord) {
                setSelectedRecord(nextRecord); // go to next
                setIsCapturing(false);
              } else {
                setSelectedRecord(null);
              setHasAutoTriggered(false); // reset auto-trigger flag // done
              }
            }}
            onExit={() => {
              if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen();
              }
              setIsPreviewing(false);
              setSnapshot(null);
              setIsCapturing(false);
              setSelectedRecord(null);
              setHasAutoTriggered(false); // reset auto-trigger flag
            }}
          />
        </Modal>
      )}
      {/* Existing image preview modal */}
      <Modal
        open={viewExistingImage}
        title={`Existing Image for ${selectedRecord?.name}`}
        footer={null}
        onCancel={() => setViewExistingImage(false)}
        centered
        closable={true}
        maskClosable={false}
        destroyOnClose
        styles={{
          header: {
            padding: 16,
            margin: 0,
            borderBottom: "none",
          },
          body: {
            backgroundColor: "transparent",
          },
          content: {
            backgroundColor: "transparent",
            boxShadow: "none",
            padding: 0,
          },
          mask: {
            backgroundColor: "rgba(0, 0, 0, 0.95)",
          },
        }}
      >
        {selectedRecord?.Images?.[0]?.path ? (
          <div className="relative w-full h-full">
            <img
              alt="Existing Shot"
              src={`${BACKEND_URL}/uploads/${selectedRecord.Images[0].path}`}
              style={{ width: "100%", height: "100%", borderRadius: 0 }}
            />
            {/* Delete spinner overlay */}
            {isDeletingImage === selectedRecord.Images[0].id && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-white" />
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: "#fff", textAlign: "center" }}>
            No image available.
          </p>
        )}
      </Modal>
      <Modal
        open={viewImageModal}
        footer={null}
        onCancel={() => {
          setViewImageModal(false);
          setCurrentImageIndex(null);
        }}
        closable={true}
        destroyOnClose
        centered
        width="100vw"
        wrapClassName="fullscreen-fix"
        closeIcon={
          <span
            style={{
              fontSize: 20,
              color: "#fff",
              marginRight: 24,
              marginTop: 16,
              cursor: "pointer",
            }}
          >
            ✕
          </span>
        }
        styles={{
          content: {
            backgroundColor: "#000",
            padding: 0,
            margin: 0,
            height: "100vh",
            maxWidth: "100vw",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
          body: {
            backgroundColor: "#000",
            margin: 0,
            padding: 0,
            height: "100%",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
          mask: {
            backgroundColor: "rgba(0, 0, 0, 0.95)",
          },
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined style={{ fontSize: 28, color: "#fff" }} />}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
          }}
          disabled={currentImageIndex === 0}
          onClick={() => setCurrentImageIndex((i) => i - 1)}
        />

        <Button
          type="text"
          icon={<ArrowRightOutlined style={{ fontSize: 28, color: "#fff" }} />}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
          }}
          disabled={currentImageIndex === labels.length - 1}
          onClick={() => setCurrentImageIndex((i) => i + 1)}
        />

        {imageSource ? (
          <img
            src={imageSource}
            alt="Full view"
            style={{
              maxWidth: "100vw",
              maxHeight: "100vh",
              objectFit: "contain",
            }}
          />
        ) : (
          <p style={{ color: "grey" }}>No image found.</p>
        )}
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justiyContent: "start",
            color: "#fff",
            padding: "8px 4px",
            // fontSize: 12,
            top: 18,
            position: "absolute",
          }}
        >
          <span>{selectedLabel.name ?? ""}</span>
          <span>
            {currentImageIndex + 1}/{labels.length}
          </span>
          <small style={{ marginTop: 8 }}>
            By {selectedLabel?.Images?.[0]?.Uploader?.username}
          </small>
        </div>
      </Modal>
      {adjustingImage && (
        <Modal
          open={true}
          footer={null}
          closable={false}
          onCancel={() => setAdjustingImage(null)}
          destroyOnClose
          centered
          width="100vw"
          styles={{
            body: { padding: 0, margin: 0 },
            content: { padding: 0 },
            mask: { backgroundColor: "rgba(0, 0, 0, 0.95)" },
          }}
        >
          <ImageAdjustor
            vehicleId={vehicleId}
            imageId={adjustingImage.id}
            labelId={adjustingImage.labelId}
            transparentUrl={`${BACKEND_URL}/uploads/${adjustingImage.transparentPath}`}
            initialX={adjustingImage.xAxis}
            initialY={adjustingImage.yAxis}
            initialScale={adjustingImage.scaleAdjustment}
            initialTilt={adjustingImage.tiltAdjustment}
            onClose={() => setAdjustingImage(null)}
            onSaveSuccess={async () => {
              console.log("path before getting labels", adjustingImage?.path);
              const newLabels = await getLabels();
              if (isPreviewing) {
                console.log("Saving image after adjustment");
                // setSnapshot("/loader.webp");
                //find the label
                const label = newLabels.find(
                  (label) => label.id === selectedRecord.id
                );
                console.log("Label found:", label.Images[0]?.path);
                console.log(label.Images[0]?.path);
                setSnapshot(null);

                setSnapshot(`${BACKEND_URL}/uploads/${label.Images[0]?.path}`);
                setTimeout(() => {}, 1000); // wait for the image to be saved
              }
            }}
          />
        </Modal>
      )}

      {/* Image Preview Modal */}
      {selectedImageModal && (
        <Modal
          open={!!selectedImageModal}
          onCancel={() => setSelectedImageModal(null)}
          footer={null}
          destroyOnClose
          centered
          width="90vw"
          styles={{
            header: {
              backgroundColor: "transparent",
              borderBottom: "none",
              margin: 0,
              padding: 16,
            },
            content: {
              backgroundColor: "transparent",
              margin: 0,
              padding: 0,
            },
            mask: {
              backgroundColor: "rgba(0, 0, 0, 0.9)",
            },
          }}
        >
          <div className="relative">
            {/* Close Button - Always top-right */}
            <button
              onClick={() => setSelectedImageModal(null)}
              className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Navigation Arrows */}
            {labels.length > 1 && (
              <>
                {/* Previous Button */}
                <button
                  onClick={() => navigateGallery('prev')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Next Button */}
                <button
                  onClick={() => navigateGallery('next')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Gallery Counter */}
            {labels.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentGalleryIndex + 1} / {labels.length}
              </div>
            )}

            {/* Desktop Top Info Bar - Only visible on desktop */}
            <div className="hidden md:block absolute top-4 left-4 right-16 z-10">
              <div className="bg-black/50 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <h3 className="text-lg font-semibold">
                      {getCurrentShot()?.name}
                    </h3>
                    <span className="text-sm opacity-75">
                      {vehicle?.year} {vehicle?.make} {vehicle?.model}
                    </span>
                  </div>

                  {/* Desktop Action Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <ShadCNButton
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0 bg-white/20 hover:bg-white/30 text-white border-white/30"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </ShadCNButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[9999]">
                      <DropdownMenuItem
                        disabled={!hasCurrentImage()}
                        onClick={() => {
                          if (hasCurrentImage()) {
                            const image = getCurrentShot().Images[0];
                            const fileName = `${vehicle?.year}_${vehicle?.make}_${vehicle?.model}_${getCurrentShot().name}.jpg`;
                            downloadSingleImage(image.path, fileName);
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!hasCurrentImage()}
                        onClick={() => {
                          if (hasCurrentImage()) {
                            const image = getCurrentShot().Images[0];
                            setAdjustingImage({
                              id: image.id,
                              labelId: getCurrentShot().id,
                              path: image.path,
                              transparentPath: image.transparentPath,
                              xAxis: image.xAxis,
                              yAxis: image.yAxis,
                              scaleAdjustment: image.scaleAdjustment,
                              tiltAdjustment: image.tiltAdjustment,
                            });
                            setSelectedImageModal(null);
                          }
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!hasCurrentImage()}
                        onClick={() => {
                          if (hasCurrentImage()) {
                            handleDeleteImage(
                              getCurrentShot().Images[0].id,
                              getCurrentShot().id
                            );
                            setSelectedImageModal(null);
                          }
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Image - Adjusted padding for desktop top bar */}
            <div className="flex justify-center items-center min-h-[60vh] md:pt-24">
              {hasCurrentImage() ? (
                <div className="relative">
                  <img
                    src={`${BACKEND_URL}/uploads/${getCurrentShot().Images[0].path}`}
                    alt={getCurrentShot().name}
                    className="max-w-full max-h-[80vh] md:max-h-[70vh] object-contain"
                  />
                  {/* Delete spinner overlay */}
                  {isDeletingImage === getCurrentShot().Images[0].id && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                      <Loader2 className="h-12 w-12 animate-spin text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-white/70 p-8">
                  <ImageIcon className="w-24 h-24 mb-4 text-white/40" />
                  <h3 className="text-xl font-medium mb-2">No Image Available</h3>
                  <p className="text-sm text-center opacity-75">
                    This shot hasn't been captured yet
                  </p>
                </div>
              )}
            </div>

            {/* Mobile Bottom Info Bar - Only visible on mobile */}
            <div className="md:hidden absolute bottom-0 left-0 right-0 bg-black/50 text-white p-4 rounded-t-lg rounded-b-lg">
              <div className="flex items-center justify-between">
                <div className="flex flex-col space-y-1">
                  <h3 className="text-lg font-semibold">
                    {getCurrentShot()?.name}
                  </h3>
                  <span className="text-sm opacity-75">
                    {vehicle?.year} {vehicle?.make} {vehicle?.model}
                  </span>
                </div>

                {/* Mobile Action Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <ShadCNButton
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0 bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </ShadCNButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[9999]">
                    <DropdownMenuItem
                      disabled={!hasCurrentImage()}
                      onClick={() => {
                        if (hasCurrentImage()) {
                          const image = getCurrentShot().Images[0];
                          const fileName = `${vehicle?.year}_${vehicle?.make}_${vehicle?.model}_${getCurrentShot().name}.jpg`;
                          downloadSingleImage(image.path, fileName);
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!hasCurrentImage()}
                      onClick={() => {
                        if (hasCurrentImage()) {
                          const image = getCurrentShot().Images[0];
                          setAdjustingImage({
                            id: image.id,
                            labelId: getCurrentShot().id,
                            path: image.path,
                            transparentPath: image.transparentPath,
                            xAxis: image.xAxis,
                            yAxis: image.yAxis,
                            scaleAdjustment: image.scaleAdjustment,
                            tiltAdjustment: image.tiltAdjustment,
                          });
                          setSelectedImageModal(null);
                        }
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!hasCurrentImage()}
                      onClick={() => {
                        if (hasCurrentImage()) {
                          handleDeleteImage(
                            getCurrentShot().Images[0].id,
                            getCurrentShot().id
                          );
                          setSelectedImageModal(null);
                        }
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Debug Viewer */}
      {debugImage && (
        <StencilDebugViewer
          imageUrl={debugImage.imageUrl}
          markerSrc={debugImage.markerSrc}
          markerStyle={debugImage.markerStyle}
          visible={true}
          onClose={() => setDebugImage(null)}
        />
      )}
    </div>
  );
}

export default VehicleDetail;
