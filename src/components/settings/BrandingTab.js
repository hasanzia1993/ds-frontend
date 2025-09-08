import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Loader2, 
  Upload,
  ImageIcon,
  X,
  RefreshCw
} from 'lucide-react';
import { BACKEND_URL } from '../../constants';
import axiosInstance from '../../axiosInstance';

const BrandingTab = ({ dealershipData, onLogosUpdated }) => {
  // Logo management state
  const [logos, setLogos] = useState([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [fetchingLogos, setFetchingLogos] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(null);
  const [logoError, setLogoError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [previewLogo, setPreviewLogo] = useState(null);
  const [showLogoPreview, setShowLogoPreview] = useState(false);

  // Use all logos
  const filteredLogos = logos;

  // Fetch logos for dealership
  const fetchLogos = async () => {
    if (!dealershipData.id) return;
    
    setFetchingLogos(true);
    setLogoError(null);
    
    try {
      const response = await axiosInstance.get(`/dealerships/${dealershipData.id}/logos`);
      setLogos(response.data);
    } catch (error) {
      console.error('Error fetching logos:', error);
      setLogoError(error.response?.data?.error || 'Failed to fetch logos');
    } finally {
      setFetchingLogos(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingLogo(true);
      setLogoError(null);
      
      try {
        const formData = new FormData();
        formData.append('logo', file);
        formData.append('notes', 'Uploaded from Branding page');
        
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
        
        // If this is the first logo, set it as default
        if (logos.length === 0) {
          await setDefaultLogo(response.data.logo.id);
          setSuccess('Logo uploaded and set as default!');
        } else {
          setSuccess('Logo uploaded successfully!');
        }
        
        // Reset file input
        e.target.value = '';
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
        
        // Notify parent component to update its logos
        if (onLogosUpdated) {
          onLogosUpdated();
        }
        
      } catch (error) {
        console.error('Error uploading logo:', error);
        setLogoError(error.response?.data?.error || 'Failed to upload logo');
      } finally {
        setUploadingLogo(false);
      }
    }
  };

  // Set default logo
  const setDefaultLogo = async (logoId) => {
    if (!dealershipData.id) return;
    
    try {
      const response = await axiosInstance.put(`/dealerships/${dealershipData.id}/logos/${logoId}`, {
        isDefault: true
      });
      
      // Update logos list - remove default from others and set for this one
      setLogos(prevLogos => 
        prevLogos.map(logo => ({
          ...logo,
          isDefault: logo.id === logoId
        }))
      );
      
      setSuccess('Default logo updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error setting default logo:', error);
      setLogoError(error.response?.data?.error || 'Failed to set default logo');
    }
  };

  // Delete logo
  const deleteLogo = async (logoId) => {
    if (!dealershipData.id) return;
    
    setDeletingLogo(logoId);
    try {
      await axiosInstance.delete(`/dealerships/${dealershipData.id}/logos/${logoId}`);
      
      // Remove from logos list
      const updatedLogos = logos.filter(logo => logo.id !== logoId);
      setLogos(updatedLogos);
      
      // If we deleted the default logo and there are other logos, make the first one default
      const deletedLogo = logos.find(logo => logo.id === logoId);
      if (deletedLogo?.isDefault && updatedLogos.length > 0) {
        await setDefaultLogo(updatedLogos[0].id);
      }
      
      setSuccess('Logo deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Notify parent component to update its logos
      if (onLogosUpdated) {
        onLogosUpdated();
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
      setLogoError(error.response?.data?.error || 'Failed to delete logo');
    } finally {
      setDeletingLogo(null);
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
          <p className="text-muted-foreground">Loading branding configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ImageIcon className="h-5 w-5 text-primary" />
            <div>
              <span className="text-base font-semibold">Branding Management</span>
              <p className="text-sm text-muted-foreground mt-1">
                Upload and manage your dealership logos for use across the platform.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
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
              onClick={() => {
                fetchLogos();
                if (onLogosUpdated) {
                  onLogosUpdated();
                }
              }}
              disabled={fetchingLogos}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <AlertDescription className="text-green-700 dark:text-green-200">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {logoError && (
        <Alert className="mb-6 border-red-500 bg-red-50 dark:bg-red-950">
          <AlertDescription className="text-red-700 dark:text-red-200">
            {logoError}
          </AlertDescription>
        </Alert>
      )}

      {/* Logos Grid */}
      {fetchingLogos ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading logos...</span>
        </div>
      ) : filteredLogos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredLogos.map((logo, index) => (
            <Card key={logo.id} className={`relative group hover:shadow-lg transition-shadow ${
              logo.isDefault ? 'ring-2 ring-primary bg-primary/5' : ''
            }`}>
              <CardContent className="p-6">
                {/* Default Badge */}
                {logo.isDefault && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    Default
                  </div>
                )}
                
                <div className="aspect-square flex items-center justify-center mb-4 bg-gray-50 rounded-lg">
                  <img
                    src={`${BACKEND_URL}/logos/${logo.filename}`}
                    alt={logo.originalName}
                    className="max-w-full max-h-full object-contain cursor-pointer"
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
                
                <div className="text-center space-y-2">
                  <h3 className="font-medium text-sm truncate" title={logo.originalName}>
                    {logo.originalName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {logo.size ? `${(logo.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {logo.createdAt ? new Date(logo.createdAt).toLocaleDateString() : 'Unknown date'}
                  </p>
                </div>
                
                {/* Delete Button */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteLogo(logo.id)}
                  disabled={deletingLogo === logo.id}
                  className="w-full mt-4"
                >
                  {deletingLogo === logo.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Delete
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No logos uploaded yet</h3>
          <p className="text-muted-foreground mb-6">Upload your first logo to get started with your branding.</p>
        </div>
      )}

      {/* Logo Preview Modal */}
      {showLogoPreview && previewLogo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Logo Preview</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowLogoPreview(false);
                  setPreviewLogo(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-center mb-4">
              <img
                src={previewLogo.url}
                alt={previewLogo.name}
                className="max-w-full max-h-64 object-contain mx-auto rounded border"
              />
            </div>
            
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {previewLogo.name}</p>
              <p><strong>File Size:</strong> {previewLogo.fileSize ? `${(previewLogo.fileSize / 1024).toFixed(1)} KB` : 'Unknown'}</p>
              <p><strong>Uploaded by:</strong> {previewLogo.uploader?.name || 'Unknown'}</p>
              <p><strong>Upload Date:</strong> {previewLogo.createdAt ? new Date(previewLogo.createdAt).toLocaleDateString() : 'Unknown'}</p>
            </div>
            
            <div className="flex space-x-2 mt-6">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandingTab;
