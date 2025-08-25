// src/msalConfig.js
const clientId = "15f2e72d-9ff6-4b1a-9730-a5d26e7b0b38";
const tenantId = "e6ff897b-e53e-4774-b058-ef58de238d1b";
export const msalConfig = {
  auth: {
    clientId: clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`, // Authority URL for Azure AD
    redirectUri:
      process.env.NODE_ENV === "development" || process.env.NODE_ENV === "beta"
        ? "http://localhost:3000"
        : "https://dealersnap-cccqa9decdhfh5gg.canadacentral-01.azurewebsites.net",
  },
  cache: {
    cacheLocation: "localStorage", // survives reloads in a PWA
    storeAuthStateInCookie: true, // critical for Safari/PWA mode
  },
  system: {
    allowRedirectInIframe: false, // PWA window is effectively an iframe-less shell
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "email"], // Scopes required for authentication
};
