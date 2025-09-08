import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Loader2, 
  ImageIcon,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { BACKEND_URL } from '../constants';
import axiosInstance from '../axiosInstance';

const LicensePlateTab = ({ dealershipData }) => {
  const navigate = useNavigate();
  
  // License plate logo state
  const [uploadedLogo, setUploadedLogo] = useState(null);
  const [logoSize, setLogoSize] = useState(50);
  const [logos, setLogos] = useState([]);
  const [loadingLogos, setLoadingLogos] = useState(false);
  const [logoError, setLogoError] = useState(null);


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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ImageIcon className="h-5 w-5 text-primary" />
            <div>
              <span className="text-base font-semibold">License Plate Management</span>
              <p className="text-sm text-muted-foreground mt-1">
                Select a logo and preview how it will appear on the license plate.
              </p>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/settings')}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Add Logo
          </Button>
        </div>
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
            {/* Available Logos List */}
            {logos.length > 0 && (
              <div className="mb-6">
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {logos.map((logo) => (
                    <div
                      key={logo.id}
                      className={cn(
                        "flex-shrink-0 w-20 h-20 border-2 rounded-lg cursor-pointer transition-all p-2",
                        uploadedLogo?.id === logo.id
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : "border-muted-foreground/30 hover:border-primary/50"
                      )}
                      onClick={() => {
                        setUploadedLogo({
                          id: logo.id,
                          url: `${BACKEND_URL}/uploads/${logo.imagePath}`,
                          name: logo.originalName,
                          notes: logo.notes
                        });
                      }}
                    >
                      <img
                        src={`${BACKEND_URL}/uploads/${logo.imagePath}`}
                        alt={logo.originalName}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* License Plate Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">License Plate Preview</Label>
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
                    <X className="mr-2 h-4 w-4" />
                    Clear Logo
                  </Button>
                )}
              </div>
              <div className="w-full max-w-2xl mx-auto flex justify-center">
                <div className="relative aspect-[3/1] w-full max-w-lg flex items-center justify-center">
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

            {/* Help Text */}
            {logos.length === 0 && (
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No logos available</p>
                <p className="text-xs text-muted-foreground">
                  Go to Settings Branding to upload your first logo
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default LicensePlateTab;
