import React, { useEffect, useState, useContext, useRef } from "react";
import axiosInstance from "../axiosInstance";
import {
  Table,
  Alert,
  Form,
  Popconfirm,
  message,
  Modal,
  Empty,
  List,
  Spin,
  Input as AntInput,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  CameraOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { Car, Search, X, Loader2, Camera } from "lucide-react";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { cn } from "../lib/utils";
import dayjs from "dayjs";
import { Link, useNavigate } from "react-router-dom";
import JwtContext from "../JwtContext";
import DealershipContext from "../contexts/DealershipContext";
import {
  isDesktop,
  isMobile,
  isMobile as isMobileDevice,
  isTablet,
} from "react-device-detect";
import BarcodeScannerWrapper from "../components/BarcodeScanner";
import { BACKEND_URL } from "../constants";

const { Meta } = Card;

/* ────────────────────────────────────────────────────────────────── */
/* component                                                          */
/* ────────────────────────────────────────────────────────────────── */
function VehicleList() {
  /* existing state / context **************************************** */
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const { jwtToken } = useContext(JwtContext);
  const { selectedDealership } = useContext(DealershipContext);
  const navigate = useNavigate();

  const [searchText, setSearchText] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const searchInputRef = useRef(null);

  /* add-vehicle modal ************************************************ */
  const [newVehicle, setNewVehicle] = useState({
    make: "",
    model: "",
    year: "",
    stock: "",
    vin: "",
    trim: "",
  });
  const [adding, setAdding] = useState(false);
  const [isAddVehicleModalVisible, setIsAddVehicleModalVisible] =
    useState(false);
  const [scanning, setScanning] = useState(false);
  const [vinValidated, setVinValidated] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const scanLock = useRef(false);
  const [lookingUpVIN, setLookingUpVIN] = useState(false);
  const [userDealership, setUserDealership] = useState(
    () => localStorage.getItem("userDealership") || null
  );

  /* responsive helpers *********************************************** */
  const [viewMode, setViewMode] = useState(() => {
    // Auto-detect view mode based on device type and orientation
    if (isMobile) {
      // Check if mobile is in landscape mode
      const isLandscape = window.innerWidth > window.innerHeight;
      return isLandscape ? "cards" : "tiles"; // Card view for landscape, tiles for portrait
    } else {
      return "cards"; // Card view for tablet and desktop
    }
  });

  // Handle window resize and orientation change to update view mode
  useEffect(() => {
    const handleResize = () => {
      let newViewMode;
      if (isMobile) {
        // Check if mobile is in landscape mode
        const isLandscape = window.innerWidth > window.innerHeight;
        newViewMode = isLandscape ? "cards" : "tiles";
      } else {
        newViewMode = "cards"; // Always cards for tablet and desktop
      }
      setViewMode(newViewMode);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isMobile]);

  /* Cache management functions **************************************** */
  const getCacheKey = () => `vehicles_${selectedDealership}`;
  
  const saveToCache = (data) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        dealership: selectedDealership
      };
      localStorage.setItem(getCacheKey(), JSON.stringify(cacheData));
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Cache save error:", error);
    }
  };

  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (cached) {
        const cacheData = JSON.parse(cached);
        // Cache valid for 5 minutes
        if (Date.now() - cacheData.timestamp < 300000 && cacheData.dealership === selectedDealership) {
          setVehicles(cacheData.data);
          setFilteredVehicles(cacheData.data);
          setLastUpdated(new Date(cacheData.timestamp));
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
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  };

  /* VIN helpers ****************************************************** */
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

  /* fetch vehicle list *********************************************** */
  const fetchVehicles = async (showRefreshLoader = false) => {
    if (!jwtToken || !selectedDealership) {
      setLoading(false);
      return;
    }

    if (showRefreshLoader) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data } = await axiosInstance.get("/vehicles", { 
        params: { dealership: selectedDealership } 
      });
      console.log("Fetched vehicles:", data);
      setVehicles(data);
      setFilteredVehicles(data);
      saveToCache(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load vehicles.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!jwtToken || !selectedDealership) {
      setLoading(false);
      return;
    }

    // Try to load from cache first
    const cachedData = loadFromCache();
    if (cachedData) {
      console.log("Loaded from cache:", cachedData);
      setLoading(false);
      // Fetch fresh data in background without showing loading
      fetchVehicles(true);
    } else {
      setLoading(true);
      // Fetch fresh data with loading indicator
      fetchVehicles(false);
    }
  }, [jwtToken, selectedDealership]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!jwtToken || !selectedDealership) return;

    const interval = setInterval(() => {
      console.log("Auto-refreshing vehicles...");
      fetchVehicles(true);
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [jwtToken, selectedDealership]);

  /* ────────────────────────────────────────────────────────────────── */
  /* CRUD helpers (unchanged logic)                                    */
  /* ────────────────────────────────────────────────────────────────── */

  const handleAddVehicle = () => {
    const { stock, make, model, year, vin, trim } = newVehicle;

    // Check for empty required fields and set individual field errors
    const errors = {};
    if (!vin?.trim()) errors.vin = "VIN is required";
    if (!stock?.trim()) errors.stock = "Stock is required";
    if (!make?.trim()) errors.make = "Make is required";
    if (!model?.trim()) errors.model = "Model is required";
    if (!year?.trim()) errors.year = "Year is required";
    if (!trim?.trim()) errors.trim = "Trim is required";

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const vinExists =
      vin &&
      vehicles.some(
        (v) => (v.vin || "").trim().toLowerCase() === vin.trim().toLowerCase()
      );
    const stockExists = vehicles.some(
      (v) => (v.stock || "").trim().toLowerCase() === stock.trim().toLowerCase()
    );
    if (vinExists) {
      setFieldErrors({ vin: `VIN ${vin} already exists` });
      return;
    }
    if (stockExists) {
      setFieldErrors({ stock: `Stock ${stock} already exists` });
      return;
    }

    setAdding(true);
    axiosInstance
      .post("/vehicles", { ...newVehicle, dealership: selectedDealership })
      .then(({ data }) => {
        const updated = [...vehicles, data];
        setVehicles(updated);
        setFilteredVehicles(updated);
        saveToCache(updated); // Update cache with new data
        setNewVehicle({
          make: "",
          model: "",
          year: "",
          stock: "",
          vin: "",
          trim: "",
        });
        setAdding(false);
        setIsAddVehicleModalVisible(false);
        setFieldErrors({});
        navigate(`/inventory/${data.id}`);
      })
      .catch((err) => {
        console.error("Failed to add vehicle:", err);
        setModalError("Failed to add vehicle.");
        setAdding(false);
      });
  };

  const handleDeleteVehicle = (id) => {
    axiosInstance
      .delete(`/vehicles/${id}`)
      .then(() => {
        const updated = vehicles.filter((v) => v.id !== id);
        setVehicles(updated);
        setFilteredVehicles(updated);
        saveToCache(updated); // Update cache with new data
        message.success("Vehicle deleted successfully");
      })
      .catch((err) => {
        console.error("Failed to delete vehicle:", err);
        setError("Failed to delete vehicle.");
      });
  };

  const openAddVehicleModal = () => setIsAddVehicleModalVisible(true);

  const closeAddVehicleModal = () => {
    setIsAddVehicleModalVisible(false);
    setNewVehicle({
      make: "",
      model: "",
      year: "",
      stock: "",
      vin: "",
      trim: "",
    });
    setScanning(false);
    setVinValidated(false); // Reset VIN validation state
    setModalError(null); // Clear modal error
    setFieldErrors({}); // Clear field errors
  };

  /* VIN lookup ******************************************************** */
  const fetchVinDetails = async (vin) => {
    setLookingUpVIN(true);
    try {
      const { data } = await axiosInstance.get("/vehicles/lookup-vin", {
        params: { vin, dealership: selectedDealership },
      });
      setNewVehicle((prev) => ({
        vin,
        make: data.make,
        model: data.model,
        trim: data.trim,
        year: data.year,
        stock: data.stock,
      }));
      setVinValidated(true); // Mark VIN as successfully validated
    } catch (err) {
      console.error("VIN lookup error:", err);
      message.error(`Failed to find vehicle with VIN: ${vin}`);
      setVinValidated(false); // Reset on failure
    } finally {
      setLookingUpVIN(false);
    }
  };

  const handleVinChange = (e) => {
    const vin = e.target.value;
    setNewVehicle({ ...newVehicle, vin });
    setVinValidated(false); // Reset validation when VIN changes
    setModalError(null); // Clear modal error when user starts typing
    setFieldErrors(prev => ({ ...prev, vin: null })); // Clear VIN field error
    if (vin.length === 17) fetchVinDetails(vin);
  };

  /* search handler **************************************************** */
  const handleSearch = (e) => {
    const txt = e.target.value.toLowerCase();
    setSearchText(txt);
    setFilteredVehicles(
      vehicles.filter((v) =>
        `${v.make} ${v.model} ${v.year} ${v.stock}`.toLowerCase().includes(txt)
      )
    );
  };

  const toggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (!searchVisible) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  /* table columns ***************************************************** */
  const columns = [
    {
      title: "VIN",
      dataIndex: "vin",
      key: "vin",
      render: (text, r) => <Link to={`/inventory/${r.id}`}>{text}</Link>,
    },
    { title: "Make", dataIndex: "make", key: "make" },
    { title: "Stock", dataIndex: "stock", key: "stock" },
    { title: "Model", dataIndex: "model", key: "model" },
    { title: "Year", dataIndex: "year", key: "year" },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Popconfirm
          title="Delete this vehicle?"
          onConfirm={() => handleDeleteVehicle(r.id)}
        >
          <Button type="link" danger>
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];
  /* tile renderer ─────────────────────────────────────────────── */
  const renderTiles = () =>
    filteredVehicles.length === 0 ? (
      <Empty description="No vehicles found" />
    ) : (
      <div className="space-y-2">
        {filteredVehicles.map((v) => {
          const hasPhotos = !!v.Images?.length;
          const imgPath = hasPhotos ? `${BACKEND_URL}/uploads/${v.Images[0].path}` : null;

          return (
            <Card
              key={v.id}
              className="group cursor-pointer transition-all duration-200 hover:shadow-md border-border"
              onClick={() => navigate(`/inventory/${v.id}`, { 
                state: { 
                  vehicleData: {
                    id: v.id,
                    stock: v.stock,
                    year: v.year,
                    make: v.make,
                    model: v.model,
                    vin: v.vin
                  }
                }
              })}
            >
              <CardContent className="pr-2 pl-0 pb-0">
                <div className="flex items-center space-x-3">
                  {/* Image */}
                  <div className="relative flex-shrink-0">
                    <div className="w-32 h-24 rounded-l-lg overflow-hidden bg-muted">
                      {imgPath ? (
                        <img
                          src={imgPath}
                          alt="vehicle"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <CameraOutlined className="text-2xl text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Vehicle info */}
                    <div className="flex items-center justify-between mb-1">
                      <Car className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-sm text-foreground truncate text-right">
                        {v.year || ""} {v.make || ""} {v.model || ""}
                      </span>
                    </div>
                    
                    {/* VIN */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground font-mono">VIN:</span>
                      <span className="text-xs text-muted-foreground font-mono text-right">
                        {v.vin || "No VIN"}
                      </span>
                    </div>
                    
                    {/* Stock and date */}
                    <div className="flex items-center justify-between">
                      <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md font-medium">
                        #{v.stock || "—"}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {hasPhotos && (
                          <span className="text-xs text-muted-foreground">
                            {dayjs(v.updatedAt).format("MMM DD")}
                          </span>
                        )}
                        
                        {/* Arrow indicator */}
                        <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );

  /* card renderer ***************************************************** */
  const renderCards = () =>
    filteredVehicles.length === 0 ? (
      <Empty description="No vehicles found" />
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {filteredVehicles.map((v) => {
          const hasPhotos = !!v.Images?.length;
          const imgPath = hasPhotos ? `${BACKEND_URL}/uploads/${v.Images[0].path}` : null;
          
          return (
            <Card
              key={v.id}
              className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-border"
              onClick={() => navigate(`/inventory/${v.id}`, { 
                state: { 
                  vehicleData: {
                    id: v.id,
                    stock: v.stock,
                    year: v.year,
                    make: v.make,
                    model: v.model,
                    vin: v.vin
                  }
                }
              })}
            >
              {/* 4:3 Aspect Ratio Image Container */}
              <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-muted">
                {imgPath ? (
                  <img
                    src={imgPath}
                    alt="vehicle"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <CameraOutlined className="text-4xl text-muted-foreground" />
                  </div>
                )}
                
                {/* Stock number badge */}
                <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md border">
                  <span className="text-sm font-semibold text-foreground">
                    #{v.stock || "—"}
                  </span>
                </div>
              </div>

              {/* Card Content */}
              <CardContent className="p-4">
                {/* Vehicle info with car icon */}
                <div className="flex items-center space-x-2 mb-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm text-foreground">
                    {v.year || ""} {v.make || ""} {v.model || ""}
                  </span>
                </div>
                
                {/* VIN */}
                <div className="text-xs text-muted-foreground font-mono">
                 VIN {v.vin || "No VIN"}
                </div>
                
                {/* Status indicator */}
                {/* <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      hasPhotos 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    )}>
                      {hasPhotos ? "Has Photos" : "No Photos"}
                    </span>
                  </div>
                </div> */}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );

  /* render ************************************************************ */
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500">Loading vehicles...</p>
        </div>
      </div>
    );



  return (
    <div className="px-6 py-3">
      {/* search bar - mobile */}
      <div className="block sm:hidden mb-4">
        {searchVisible && (
          <div className="relative mb-4">
            <SearchOutlined className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search vehicles by make, model, year, or stock"
              value={searchText}
              onChange={handleSearch}
              className="pl-10 pr-10"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* controls row */}
      <div className="flex items-center justify-between mb-5 mt-0">
        {/* Left side - Vehicle total and refresh info */}
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">
              {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''}
            </span>
            {lastUpdated && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
                {/* Refresh button - subtle, no border */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => fetchVehicles(true)}
                  disabled={isRefreshing}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                >
                  {isRefreshing ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* {userDealership === "Demo" && (
            <Button
              size="icon"
              variant="outline"
              onClick={() => navigate("/stats")}
            >
              <BarChartOutlined className="h-4 w-4" />
            </Button>
          )} */}
        </div>

        {/* Center - Search bar (always visible on desktop/tablet) */}
        <div className="hidden sm:block">
          <div className="relative">
            <SearchOutlined className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search vehicles by make, model, year, or stock"
              value={searchText}
              onChange={handleSearch}
              className="w-96 pl-10"
            />
          </div>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center space-x-2">
          {/* search button - mobile only (only show when search is not visible) */}
          <div className="block sm:hidden">
            {!searchVisible && (
              <Button
                size="icon"
                variant="outline"
                onClick={toggleSearch}
                className="h-9 w-9"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Add button - responsive: full button on desktop/tablet, icon-only on mobile */}
          <Button
            variant="default"
            className="h-10 md:px-4 md:rounded-md md:w-auto w-10 rounded-full"
            onClick={openAddVehicleModal}
          >
            <PlusOutlined className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Add</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 20 }}
        />
      )}

      {viewMode === "cards" ? (
        renderCards()
      ) : viewMode === "tiles" ? (
        renderTiles()
      ) : (
        <Table
          columns={columns}
          dataSource={filteredVehicles}
          rowKey="id"
          pagination={{ pageSize: 50 }}
          scroll={{ x: "max-content" }}
        />
      )}

      {/* add-vehicle modal (original markup, unchanged) */}
      <Modal
        title="Add Stock"
        open={isAddVehicleModalVisible}
        onCancel={closeAddVehicleModal}
        destroyOnClose
        centered
        afterClose={() => {
          setScanning(false);
          scanLock.current = false;
        }}
        footer={[
          <div key="footer" className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeAddVehicleModal}>
              Cancel
            </Button>
            {vinValidated && (
              <Button
                onClick={handleAddVehicle}
                disabled={adding}
              >
                {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            )}
          </div>,
        ]}
      >
        {modalError && (
          <Alert
            message="Error"
            description={modalError}
            type="error"
            showIcon
            closable
            onClose={() => setModalError(null)}
            style={{ marginBottom: 10 }}
          />
        )}
        <Form layout="vertical">
          <Form.Item 
            label={<span>VIN <span className="text-red-500">*</span></span>}
            validateStatus={fieldErrors.vin ? "error" : ""}
            help={fieldErrors.vin || ""}
          >
            <div className="flex">
              {/* Loading indicator */}
              {lookingUpVIN && (
                <div className="flex items-center justify-center px-3 border border-r-0 border-input bg-muted rounded-l-md h-10">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              
              {/* VIN Input */}
              <Input
                id="vin"
                placeholder="VIN"
                value={newVehicle.vin}
                onChange={handleVinChange}
                required
                className={cn(
                  "rounded-none h-10",
                  lookingUpVIN ? "rounded-none" : "rounded-l-md",
                  "border-r-0",
                  fieldErrors.vin && "border-red-500 focus:border-red-500"
                )}
              />
              
              {/* Scan VIN Button */}
              <Button
                type="button"
                variant={scanning ? "destructive" : "outline"}
                className="rounded-l-none border-l-0 px-3 whitespace-nowrap h-10"
                onClick={() => {
                  scanLock.current = false;
                  setScanning((prev) => !prev);
                }}
              >
                <Camera className="h-4 w-4 mr-1" />
                {scanning ? "Close Scanner" : "Scan VIN"}
              </Button>
            </div>
            {scanning && (
              <div className="mt-4">
                <BarcodeScannerWrapper
                  paused={!scanning}
                  scanLock={scanLock}
                  setScanning={setScanning}
                  onVinDetected={(vin) => {
                    setNewVehicle((p) => ({ ...p, vin }));
                    fetchVinDetails(vin);
                  }}
                />
              </div>
            )}
          </Form.Item>

          {/* remaining form fields - only show after VIN is validated */}
          {vinValidated && ["make", "model", "year", "trim", "stock"].map((field) => (
            <Form.Item
              key={field}
              label={<span>{field[0].toUpperCase() + field.slice(1)} <span className="text-red-500">*</span></span>}
              validateStatus={fieldErrors[field] ? "error" : ""}
              help={fieldErrors[field] || ""}
            >
              <Input
                required
                placeholder={field[0].toUpperCase() + field.slice(1)}
                value={newVehicle[field]}
                onChange={(e) => {
                  setNewVehicle({ ...newVehicle, [field]: e.target.value });
                  setModalError(null); // Clear modal error when user starts typing
                  setFieldErrors(prev => ({ ...prev, [field]: null })); // Clear field-specific error
                }}
                className={cn(fieldErrors[field] && "border-red-500 focus:border-red-500")}
              />
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </div>
  );
}

export default VehicleList;
