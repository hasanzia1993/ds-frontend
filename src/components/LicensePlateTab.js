import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Loader2, 
  Upload,
  ImageIcon,
  X,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { BACKEND_URL } from '../constants';
import axiosInstance from '../axiosInstance';

const LicensePlateTab = ({ dealershipData }) => {
  // License plate logo state
  const [uploadedLogo, setUploadedLogo] = useState(null);
  const [logoSize, setLogoSize] = useState(50);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logos, setLogos] = useState([]);
  const [loadingLogos, setLoadingLogos] = useState(false);
  const [logoError, setLogoError] = useState(null);

  // Handle logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingLogo(true);
      setLogoError(null);
      
      try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('logo', file);
        formData.append('notes', 'Uploaded from Settings page');
        
        // Upload logo to backend
        const response = await axiosInstance.post(
          `/dealerships/${dealershipData.id}/logos`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        
        // Add new logo to list
        setLogos(prevLogos => [response.data.logo, ...prevLogos]);
        
        // Set as current logo
        setUploadedLogo({
          id: response.data.logo.id,
          url: `${BACKEND_URL}/uploads/${response.data.logo.imagePath}`,
          name: response.data.logo.originalName,
          notes: response.data.logo.notes
        });
        
        // Reset file input
        e.target.value = '';
        
      } catch (error) {
        console.error('Error uploading logo:', error);
        setLogoError(error.response?.data?.error || 'Failed to upload logo');
      } finally {
        setUploadingLogo(false);
      }
    }
  };

  // Fetch logos for dealership
  const fetchLogos = async () => {
    if (!dealershipData.id) return;
    
    setLoadingLogos(true);
    setLogoError(null);
    
    try {
      const response = await axiosInstance.get(`/dealerships/${dealershipData.id}/logos`);
      setLogos(response.data);
      
      // Set first logo as current if none selected
      if (response.data.length > 0 && !uploadedLogo) {
        const firstLogo = response.data[0];
        setUploadedLogo({
          id: firstLogo.id,
          url: `${BACKEND_URL}/uploads/${firstLogo.imagePath}`,
          name: firstLogo.originalName,
          notes: firstLogo.notes
        });
      }
    } catch (error) {
      console.error('Error fetching logos:', error);
      setLogoError(error.response?.data?.error || 'Failed to fetch logos');
    } finally {
      setLoadingLogos(false);
    }
  };

  // Delete logo
  const handleDeleteLogo = async (logoId) => {
    if (!dealershipData.id) return;
    
    try {
      await axiosInstance.delete(`/dealerships/${dealershipData.id}/logos/${logoId}`);
      
      // Remove from logos list
      setLogos(prevLogos => prevLogos.filter(logo => logo.id !== logoId));
      
      // If deleted logo was current, clear selection
      if (uploadedLogo && uploadedLogo.id === logoId) {
        setUploadedLogo(null);
        setLogoSize(50);
      }
      
    } catch (error) {
      console.error('Error deleting logo:', error);
      setLogoError(error.response?.data?.error || 'Failed to delete logo');
    }
  };

  // Update logo metadata
  const handleUpdateLogo = async (logoId, updates) => {
    if (!dealershipData.id) return;
    
    try {
      const response = await axiosInstance.put(`/dealerships/${dealershipData.id}/logos/${logoId}`, updates);
      
      // Update in logos list
      setLogos(prevLogos => 
        prevLogos.map(logo => 
          logo.id === logoId ? response.data.logo : logo
        )
      );
      
      // Update current logo if it's the one being edited
      if (uploadedLogo && uploadedLogo.id === logoId) {
        setUploadedLogo(prev => ({
          ...prev,
          notes: response.data.logo.notes
        }));
      }
      
    } catch (error) {
      console.error('Error updating logo:', error);
      setLogoError(error.response?.data?.error || 'Failed to update logo');
    }
  };

  // Reorder logos
  const handleReorderLogo = async (logoId, newSortOrder) => {
    if (!dealershipData.id) return;
    
    try {
      await axiosInstance.post(`/dealerships/${dealershipData.id}/logos/${logoId}/reorder`, {
        newSortOrder
      });
      
      // Refresh logos to get updated order
      fetchLogos();
      
    } catch (error) {
      console.error('Error reordering logo:', error);
      setLogoError(error.response?.data?.error || 'Failed to reorder logo');
    }
  };

  // Fetch logos when component mounts
  useEffect(() => {
    if (dealershipData?.id) {
      fetchLogos();
    }
  }, [dealershipData?.id]);

  // Don't render until dealershipData is fully loaded
  if (!dealershipData || !dealershipData.id) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading license plate configuration...</p>
        </div>
      </div>
    );
  }

  return (
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

      {/* Error Display */}
      {logoError && (
        <Alert className="mb-6 border-red-500 bg-red-50 dark:bg-red-950">
          <AlertDescription className="text-red-700 dark:text-red-200">
            {logoError}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
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
                  disabled={uploadingLogo || !dealershipData.id}
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
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLogos}
                  disabled={loadingLogos}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                
                {uploadedLogo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadedLogo(null);
                      setLogoSize(50);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Remove Logo
                  </Button>
                )}
              </div>
            </div>

            {/* License Plate Preview */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">License Plate Preview</Label>
              <div className="w-full max-w-md mx-auto">
                <div className="relative aspect-[3/1] flex items-center justify-center">
                  {/* License Plate Background Image */}
                  <img
                    src="/license-plate-template.svg"
                    alt="License plate template"
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Logo Overlay - Only show when logo is uploaded */}
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
                          cursor: uploadedLogo ? 'move' : 'default'
                        }}
                        draggable={false}
                      />
                    </div>
                  ) : (
                    /* Logo Upload Prompt */
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center bg-black/50 text-white p-4 rounded-lg">
                        <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Upload a logo to preview</p>
                        <p className="text-xs opacity-75 mt-1">Logo will appear centered on the plate</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Logo Size Slider - Only show when logo is uploaded */}
                  {uploadedLogo && (
                    <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Label className="text-xs text-white">Logo Size:</Label>
                        <input
                          type="range"
                          min="20"
                          max="80"
                          value={logoSize}
                          onChange={(e) => setLogoSize(parseInt(e.target.value))}
                          className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <span className="text-xs w-12 text-center">{logoSize}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Uploaded Logos */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Uploaded Logos</Label>
              
              {loadingLogos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading logos...</span>
                </div>
              ) : logos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {logos.map((logo) => (
                    <div
                      key={logo.id}
                      className={cn(
                        "border-2 rounded-lg p-4 text-center transition-all",
                        uploadedLogo?.id === logo.id
                          ? "border-primary bg-primary/10"
                          : "border-muted-foreground/30 hover:border-primary/50"
                      )}
                    >
                      <img
                        src={`${BACKEND_URL}/uploads/${logo.imagePath}`}
                        alt={`Logo: ${logo.originalName}`}
                        className="w-16 h-16 object-contain mx-auto mb-2 rounded cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => {
                          setUploadedLogo({
                            id: logo.id,
                            url: `${BACKEND_URL}/uploads/${logo.imagePath}`,
                            name: logo.originalName,
                            notes: logo.notes
                          });
                        }}
                        title={`Click to select ${logo.originalName}`}
                      />
                      <p className="text-xs text-muted-foreground truncate mb-1">
                        {logo.originalName}
                      </p>
                      {logo.notes ? (
                        <p className="text-xs text-muted-foreground mb-2">
                          {logo.notes}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mb-2 text-gray-400">
                          No notes
                        </p>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Size: {logoSize}%</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLogo(logo.id)}
                            className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {/* Notes Input */}
                        <div className="flex items-center space-x-2">
                          <Input
                            type="text"
                            placeholder="Add notes..."
                            value={logo.notes || ''}
                            onChange={(e) => handleUpdateLogo(logo.id, { notes: e.target.value })}
                            className="h-6 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No logos uploaded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload your first logo to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default LicensePlateTab;
