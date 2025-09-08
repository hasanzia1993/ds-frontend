import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Loader2,
  ImageIcon
} from 'lucide-react';

const LicensePlatePreview = ({
  licensePlate,
  originalLicensePlateData,
  deletingLicensePlate,
  deleteLicensePlate,
  constructFileUrl,
  uploadedLogo,
  logoSize,
  logoPosition,
  isDraggingLogo,
  setIsDraggingLogo,
  setLogoDragStart,
  setLogoPosition,
  savingLicensePlateConfig,
  handleSaveLicensePlateConfiguration,
  setLogoSize
}) => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-3">
          <ImageIcon className="h-5 w-5 text-primary" />
          <span className="text-base font-semibold">License Plate Preview</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Preview how your logo will appear on the license plate template.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">License Plate Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
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

          {/* Preview */}
          <div className="space-y-4">
            <div className="w-full max-w-md mx-auto">
              <div className="relative flex items-center justify-center border border-dashed border-gray-300 rounded-lg p-4">
                {/* License Plate Background */}
                <img
                  src={originalLicensePlateData?.path ? constructFileUrl(originalLicensePlateData.path) : require('../../assets/license_plate.jpg')}
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
                  }}
                />
                
                {/* Overlay Logo */}
                {uploadedLogo && (
                  <img
                    src={uploadedLogo.url}
                    alt="Logo overlay"
                    className={`absolute object-contain cursor-move ${isDraggingLogo ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{
                      left: `${logoPosition.x}%`,
                      top: `${logoPosition.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: `${logoSize}px`,
                      height: 'auto',
                      maxWidth: '150px',
                      zIndex: 10,
                      userSelect: 'none'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsDraggingLogo(true);
                      setLogoDragStart({
                        x: e.clientX,
                        y: e.clientY
                      });
                    }}
                    onDragStart={(e) => e.preventDefault()}
                  />
                )}
              </div>
            </div>

            {/* Logo Controls */}
            {uploadedLogo && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium">Logo Size:</label>
                  <input
                    type="range"
                    min="20"
                    max="150"
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-12">{logoSize}px</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleSaveLicensePlateConfiguration}
                    disabled={savingLicensePlateConfig}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {savingLicensePlateConfig ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Configuration'
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground">
                    Drag the logo to position it, adjust size with the slider, then save.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LicensePlatePreview;
