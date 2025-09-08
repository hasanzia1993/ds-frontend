import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { 
  Loader2, 
  Upload,
  Eye,
  EyeOff,
  ImageIcon
} from 'lucide-react';
import { BACKEND_URL } from '../../constants';

const LogoManagement = ({
  logos,
  filteredLogos,
  uploadingLogo,
  fetchingLogos,
  deletingLogo,
  updatingLogo,
  handleLogoUpload,
  fetchLogos,
  deleteLogo,
  handleLogoToggleActive,
  reorderLogo,
  setPreviewLogo,
  setShowLogoPreview,
  setUploadedLogo,
  setLogoSize,
  setLogoPosition,
  setSuccess
}) => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-3">
          <ImageIcon className="h-5 w-5 text-primary" />
          <span className="text-base font-semibold">Logo Management</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload and manage your dealership logos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Logo Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload Section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Upload New Logo</Label>
            <p className="text-xs text-muted-foreground">
              Upload a logo for your dealership branding.
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
            
            {fetchingLogos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading logos...</span>
              </div>
            ) : filteredLogos.length > 0 ? (
              <div className="space-y-3">
                {filteredLogos.map((logo, index) => (
                  <div key={logo.id} className="flex flex-col space-y-3 p-4 border rounded-lg">
                    <div className="flex flex-col space-y-3 p-4 pb-0">
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
                              // Set up for license plate use if those functions are available
                              if (setUploadedLogo && setLogoSize && setLogoPosition && setSuccess) {
                                setUploadedLogo({
                                  id: logo.id,
                                  url: `${BACKEND_URL}/logos/${logo.filename}`,
                                  name: logo.originalName,
                                  backendData: logo
                                });
                                setLogoSize(50);
                                setLogoPosition({ x: 50, y: 50 });
                                setSuccess('Logo selected for license plate use.');
                              }
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
                    <div className="ml-20">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogoManagement;
