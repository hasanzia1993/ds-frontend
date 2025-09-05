(function () {
  const APP_NAME = "Dealersnap"; // ✅ Change this per app
  const BASE_URL = "#";
  const CHECK_URL = `${BASE_URL}/api/apps/${APP_NAME}/check`;
  const VERSION_KEY = `app_version_${APP_NAME}`;
  const DEFAULT_VERSION = "0.0.0";

  const getStoredVersion = () =>
    localStorage.getItem(VERSION_KEY) || DEFAULT_VERSION;
  const setStoredVersion = (version) =>
    localStorage.setItem(VERSION_KEY, version);

  const displayVersionText = (version) => {
    const versionText = document.createElement("div");
    versionText.textContent = `v${version}`;
    versionText.style.cssText = `
      position: fixed;
      bottom: 0px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      color: grey;
      opacity: 0.7;
      z-index: 100;
    `;
    document.body.appendChild(versionText);
  };

  const showUpdateDialog = (logHtml, latestVersion) => {
    const dialog = document.createElement("div");
    dialog.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                  background: rgba(0,0,0,0.5); z-index: 9999; display: flex;
                  justify-content: center; align-items: center;">
        <div style="background: white; padding: 20px;width:90%; max-width: 500px;
                    border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.2);">
          <h3>New Update Available (v${latestVersion})</h3>
          <div style="max-height: 200px; overflow-y: auto; margin-top: 10px;">${logHtml}</div>
          <p style="margin-top: 10px;">Please refresh the page to use the latest version.</p>
          <div style="text-align: right;">
            <button id="refresh-btn" style="margin-right: 10px;">Refresh Now</button>
            <button id="cancel-btn">Later</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    dialog.querySelector("#refresh-btn").onclick = () => {
      setStoredVersion(latestVersion);
      window.location.reload();
    };

    dialog.querySelector("#cancel-btn").onclick = () => {
      setStoredVersion(latestVersion);
      dialog.remove();
    };
  };

  const checkVersion = async () => {
    const storedVersion = getStoredVersion();
    try {
      const res = await fetch(`${CHECK_URL}?currentVersion=${storedVersion}`);
      if (!res.ok) return;
      const data = await res.json();

      const { latestVersion, requiredUpdate, logs } = data;

      if (storedVersion === DEFAULT_VERSION || requiredUpdate) {
        const combinedLogs = logs
          .map((l) => {
            const formattedLog = l.log
              .replace(/\n/g, "<br /><br />") // ← this is the key fix
              .replace(/- /g, "• "); // optional: replace dashes with bullets for cleaner look

            return `<div style="margin-bottom: 1rem;">
        <strong>v${l.version}</strong> - ${
              l.required ? "🔒 Required" : "Optional"
            }<br /><br />
        <div style="white-space: normal; word-break: break-word; font-family: monospace;">
          ${formattedLog}
        </div>
      </div>`;
          })
          .join("<hr />");

        showUpdateDialog(combinedLogs, latestVersion);
      } else if (latestVersion !== storedVersion) {
        setStoredVersion(latestVersion);
      }

      // Always show current version
      displayVersionText(storedVersion);
    } catch (err) {
      console.error("Version check failed", err);
    }
  };

  // Initial check
  checkVersion();

  // Re-check every 15 minutes
  setInterval(checkVersion, 15 * 60 * 1000);
})();
