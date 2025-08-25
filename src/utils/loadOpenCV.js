let opencvLoaded = false;

export const loadOpenCV = () => {
  return new Promise((resolve, reject) => {
    if (opencvLoaded && window.cv) {
      resolve(window.cv);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.5.5/opencv.js";
    script.async = true;
    script.onload = () => {
      const checkReady = () => {
        if (window.cv && window.cv.Mat) {
          opencvLoaded = true;
          resolve(window.cv);
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    };
    script.onerror = reject;

    document.body.appendChild(script);
  });
};
