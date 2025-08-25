// rearCamera.js
const PRESETS = [
  // { width: 3840, height: 2880 }, // 4K+ (4:3)
  // { width: 3200, height: 2400 }, // QUXGA
  { width: 2560, height: 1920 }, // QXGA
  { width: 2048, height: 1536 }, // QXGA (Apple iPad 3+)
  { width: 1920, height: 1440 }, // 4:3 Full HD+
  { width: 1600, height: 1200 }, // UXGA
  { width: 1280, height: 960 }, // 4:3 HD+
  { width: 1024, height: 768 }, // XGA
  { width: 800, height: 600 }, // SVGA
  { width: 640, height: 480 }, // VGA
];

const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

/**
 * Get a media stream from the rear camera at the best possible resolution,
 * capped at 1920×1080.  Returns a Promise<MediaStream>.
 */
export async function openRearCamera() {
  // 1 ── First attempt: environment facingMode with ideal 1080p
  try {
    return await tryStream({ facingMode: "environment" });
  } catch (err) {
    if (err.name !== "OverconstrainedError") throw err;
    /* continue to generic fallback */
  }

  // 2 ── Unlock device labels with ANY camera (lowest res)
  const probing = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });

  // 3 ── Find a device whose label hints it's the back lens
  const devices = await navigator.mediaDevices.enumerateDevices();
  const rear = devices.find(
    (d) => d.kind === "videoinput" && /(rear|back|environment)/i.test(d.label)
  );

  if (!rear) return probing; // single‑lens device (laptops / some tablets)

  const currentId = probing.getVideoTracks()[0].getSettings().deviceId;
  if (rear.deviceId === currentId) {
    // already on the rear cam – just try to up‑res
    await upResTrack(probing.getVideoTracks()[0]);
    return probing;
  }

  // 4 ── Switch to the identified rear device
  probing.getTracks().forEach((t) => t.stop());
  return tryStream({ deviceId: rear.deviceId });
}

/* ---------- helpers ---------- */

async function tryStream(deviceConstraint) {
  for (const { width, height } of PRESETS) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...deviceConstraint,
          width: { ideal: width },
          height: { ideal: height },
        },
      });

      // On iOS PWAs we must *post‑apply* constraints or Safari caps at 640×480
      if (isiOS) await upResTrack(stream.getVideoTracks()[0]);

      return stream;
    } catch (err) {
      if (err.name !== "OverconstrainedError") throw err;
      // else: try next (smaller) preset
    }
  }

  // If every preset failed, fall back to “any size” with the same device
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: deviceConstraint,
  });
}

/**
 * Try to bump the given VideoTrack up to its maximum 4∶3 resolution,
 * then fall back through your PRESETS list if that fails.
 *
 * @param {MediaStreamTrack} track — the video track to up‐res
 */
async function upResTrack(track) {
  const caps = track.getCapabilities?.() || {};

  // 1) If the device reports width/height ranges, pick the largest 4∶3 that fits:
  if (caps.width && caps.height) {
    let maxW = caps.width.max;
    let maxH = caps.height.max;

    // Compute a 4∶3 resolution under (maxW, maxH)
    let targetW = maxW;
    let targetH = Math.round((targetW * 3) / 4);

    if (targetH > maxH) {
      targetH = maxH;
      targetW = Math.round((targetH * 4) / 3);
    }

    try {
      await track.applyConstraints({
        width: { exact: targetW },
        height: { exact: targetH },
      });
      return; // success at highest native 4∶3
    } catch (err) {
      // if exact fails, try ideal instead
      try {
        await track.applyConstraints({
          width: { ideal: targetW },
          height: { ideal: targetH },
        });
        return;
      } catch {
        // fall through to PRESETS loop
      }
    }
  }

  // 2) Fallback: try each preset in descending order
  for (const { width, height } of PRESETS) {
    try {
      await track.applyConstraints({
        width: { exact: width },
        height: { exact: height },
      });
      return; // first one that works wins
    } catch (err) {
      if (err.name !== "OverconstrainedError") {
        // some other error (e.g. SecurityError) – rethrow
        throw err;
      }
      // otherwise continue to next preset
    }
  }

  // 3) If nothing matched exactly, try the same presets as 'ideal'
  for (const { width, height } of PRESETS) {
    try {
      await track.applyConstraints({
        width: { ideal: width },
        height: { ideal: height },
      });
      return;
    } catch (err) {
      if (err.name !== "OverconstrainedError") {
        throw err;
      }
    }
  }
}

// async function upResTrack(track) {
//   for (const { width, height } of PRESETS) {
//     try {
//       await track.applyConstraints({ width, height });
//       return; // first one that sticks wins
//     } catch (err) {
//       if (err.name !== "OverconstrainedError") throw err;
//     }
//   }
// }
