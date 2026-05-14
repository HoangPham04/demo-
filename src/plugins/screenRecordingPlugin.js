const SUPPORTED_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=h264,opus",
  "video/webm",
];

function getSupportedMimeType() {
  if (!window.MediaRecorder) return "";

  return (
    SUPPORTED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ||
    ""
  );
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function buildRecordingFileName(prefix = "screen-recording") {
  const now = new Date();

  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
  ].join("-");

  const safePrefix = String(prefix || "screen-recording")
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${safePrefix || "screen-recording"}-${timestamp}.webm`;
}

function formatBytes(bytes) {
  if (!bytes || Number.isNaN(bytes)) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[unitIndex]}`;
}

async function getMicrophoneStream() {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
}

function mixAudioStreams(streams) {
  const audioTracks = streams.flatMap((stream) => stream.getAudioTracks());

  if (audioTracks.length === 0) {
    return {
      audioStream: null,
      audioContext: null,
    };
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();
  const destination = audioContext.createMediaStreamDestination();

  streams.forEach((stream) => {
    if (stream.getAudioTracks().length === 0) return;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(destination);
  });

  return {
    audioStream: destination.stream,
    audioContext,
  };
}

function getBrowserSupport() {
  const hasMediaDevices = Boolean(navigator.mediaDevices);
  const hasDisplayMedia = Boolean(navigator.mediaDevices?.getDisplayMedia);
  const hasUserMedia = Boolean(navigator.mediaDevices?.getUserMedia);
  const hasMediaRecorder = Boolean(window.MediaRecorder);
  const supportedMimeType = getSupportedMimeType();

  return {
    hasMediaDevices,
    hasDisplayMedia,
    hasUserMedia,
    hasMediaRecorder,
    supportedMimeType,
    isSupported:
      hasMediaDevices &&
      hasDisplayMedia &&
      hasMediaRecorder &&
      Boolean(supportedMimeType),
  };
}

export class ScreenRecordingPlugin {
  constructor() {
    this.mediaRecorder = null;
    this.displayStream = null;
    this.microphoneStream = null;
    this.mixedAudioContext = null;
    this.finalStream = null;

    this.recordedChunks = [];
    this.status = "idle";

    this.startedAt = null;
    this.stoppedAt = null;
    this.pausedAt = null;

    this.fileName = "";
    this.blob = null;
    this.previewUrl = "";

    this.error = "";
    this.durationSeconds = 0;
    this.fileSizeBytes = 0;
    this.fileSizeLabel = "0 B";

    this.timer = null;
    this.autoStopTimer = null;

    this.onStatusChange = null;
  }

  setStatusListener(listener) {
    this.onStatusChange = listener;
  }

  emitStatus() {
    if (typeof this.onStatusChange === "function") {
      this.onStatusChange(this.getStatus());
    }
  }

  isSupported() {
    return getBrowserSupport().isSupported;
  }

  getSupportInfo() {
    return getBrowserSupport();
  }

  getStatus() {
    return {
      status: this.status,
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      pausedAt: this.pausedAt,
      fileName: this.fileName,
      previewUrl: this.previewUrl,
      hasBlob: Boolean(this.blob),
      error: this.error,
      durationSeconds: this.durationSeconds,
      fileSizeBytes: this.fileSizeBytes,
      fileSizeLabel: this.fileSizeLabel,
      support: this.getSupportInfo(),
    };
  }

  async start(options = {}) {
    const support = this.getSupportInfo();

    if (!support.isSupported) {
      throw new Error(
        "This browser does not fully support screen recording. Please use Chrome or Edge."
      );
    }

    if (this.status === "recording" || this.status === "paused") {
      throw new Error("Recording is already running.");
    }

    this.resetInternalStateBeforeStart();

    const {
      includeMicrophone = true,
      includeSystemAudio = true,
      fileNamePrefix = "screen-recording",
      maxDurationSeconds = 0,
    } = options;

    this.fileName = buildRecordingFileName(fileNamePrefix);

    this.displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "always",
        frameRate: 30,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: includeSystemAudio,
    });

    if (includeMicrophone) {
      try {
        this.microphoneStream = await getMicrophoneStream();
      } catch (error) {
        console.warn("Microphone permission was not granted.", error);
        this.microphoneStream = null;
      }
    }

    const streamsToMix = [this.displayStream, this.microphoneStream].filter(
      Boolean
    );

    const { audioStream, audioContext } = mixAudioStreams(streamsToMix);
    this.mixedAudioContext = audioContext;

    this.finalStream = new MediaStream();

    this.displayStream.getVideoTracks().forEach((track) => {
      this.finalStream.addTrack(track);
    });

    if (audioStream) {
      audioStream.getAudioTracks().forEach((track) => {
        this.finalStream.addTrack(track);
      });
    }

    const mimeType = support.supportedMimeType;

    this.mediaRecorder = new MediaRecorder(this.finalStream, {
      mimeType,
      videoBitsPerSecond: 3500000,
      audioBitsPerSecond: 128000,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onerror = (event) => {
      this.error =
        event.error?.message || "MediaRecorder failed while recording.";
      this.status = "failed";
      this.clearTimers();
      this.stopAllTracks();
      this.emitStatus();
    };

    this.mediaRecorder.onstop = () => {
      this.blob = new Blob(this.recordedChunks, {
        type: this.mediaRecorder?.mimeType || "video/webm",
      });

      this.fileSizeBytes = this.blob.size;
      this.fileSizeLabel = formatBytes(this.blob.size);
      this.previewUrl = URL.createObjectURL(this.blob);

      if (this.status !== "failed") {
        this.status = "stopped";
      }

      this.stoppedAt = new Date().toISOString();

      this.clearTimers();
      this.stopAllTracks();
      this.emitStatus();
    };

    const videoTrack = this.displayStream.getVideoTracks()[0];

    if (videoTrack) {
      videoTrack.addEventListener("ended", () => {
        if (this.status === "recording" || this.status === "paused") {
          this.stop();
        }
      });
    }

    this.mediaRecorder.start(1000);

    this.status = "recording";
    this.startedAt = new Date().toISOString();
    this.stoppedAt = null;
    this.pausedAt = null;

    this.startDurationTimer();

    if (maxDurationSeconds && Number(maxDurationSeconds) > 0) {
      this.autoStopTimer = window.setTimeout(() => {
        if (this.status === "recording" || this.status === "paused") {
          this.stop();
        }
      }, Number(maxDurationSeconds) * 1000);
    }

    this.emitStatus();
    return this.getStatus();
  }

  stop() {
    if (
      !this.mediaRecorder ||
      (this.status !== "recording" && this.status !== "paused")
    ) {
      throw new Error("No active recording to stop.");
    }

    if (this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }

    this.status = "stopping";
    this.emitStatus();

    return this.getStatus();
  }

  pause() {
    if (!this.mediaRecorder || this.status !== "recording") {
      throw new Error("No active recording to pause.");
    }

    if (this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause();
    }

    this.status = "paused";
    this.pausedAt = new Date().toISOString();
    this.emitStatus();

    return this.getStatus();
  }

  resume() {
    if (!this.mediaRecorder || this.status !== "paused") {
      throw new Error("No paused recording to resume.");
    }

    if (this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume();
    }

    this.status = "recording";
    this.pausedAt = null;
    this.emitStatus();

    return this.getStatus();
  }

  download() {
    if (!this.blob) {
      throw new Error("No recording file is available to download.");
    }

    const url = URL.createObjectURL(this.blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = this.fileName || buildRecordingFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  getBlob() {
    return this.blob;
  }

  async upload(uploadUrl, extraFields = {}) {
    if (!this.blob) {
      throw new Error("No recording file is available to upload.");
    }

    const formData = new FormData();

    formData.append("file", this.blob, this.fileName);
    formData.append("fileName", this.fileName);
    formData.append("durationSeconds", String(this.durationSeconds));
    formData.append("fileSizeBytes", String(this.fileSizeBytes));

    Object.entries(extraFields).forEach(([key, value]) => {
      formData.append(key, String(value ?? ""));
    });

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Upload failed with status ${response.status}`);
    }

    return response.json();
  }

  reset() {
    if (this.status === "recording" || this.status === "paused") {
      this.stop();
      return this.getStatus();
    }

    this.cleanupPreviewUrl();
    this.stopAllTracks();
    this.clearTimers();

    this.mediaRecorder = null;
    this.finalStream = null;
    this.recordedChunks = [];
    this.status = "idle";
    this.startedAt = null;
    this.stoppedAt = null;
    this.pausedAt = null;
    this.fileName = "";
    this.blob = null;
    this.error = "";
    this.durationSeconds = 0;
    this.fileSizeBytes = 0;
    this.fileSizeLabel = "0 B";

    this.emitStatus();
    return this.getStatus();
  }

  resetInternalStateBeforeStart() {
    this.cleanupPreviewUrl();
    this.stopAllTracks();
    this.clearTimers();

    this.mediaRecorder = null;
    this.finalStream = null;
    this.recordedChunks = [];
    this.status = "idle";
    this.startedAt = null;
    this.stoppedAt = null;
    this.pausedAt = null;
    this.blob = null;
    this.previewUrl = "";
    this.error = "";
    this.durationSeconds = 0;
    this.fileSizeBytes = 0;
    this.fileSizeLabel = "0 B";
  }

  startDurationTimer() {
    this.clearDurationTimer();

    this.timer = window.setInterval(() => {
      if (this.status === "recording" && this.startedAt) {
        this.durationSeconds = Math.floor(
          (Date.now() - new Date(this.startedAt).getTime()) / 1000
        );

        this.emitStatus();
      }
    }, 1000);
  }

  clearDurationTimer() {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  clearAutoStopTimer() {
    if (this.autoStopTimer) {
      window.clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }
  }

  clearTimers() {
    this.clearDurationTimer();
    this.clearAutoStopTimer();
  }

  stopAllTracks() {
    if (this.displayStream) {
      this.displayStream.getTracks().forEach((track) => track.stop());
    }

    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((track) => track.stop());
    }

    if (this.finalStream) {
      this.finalStream.getTracks().forEach((track) => track.stop());
    }

    if (this.mixedAudioContext) {
      this.mixedAudioContext.close().catch(() => {});
    }

    this.displayStream = null;
    this.microphoneStream = null;
    this.finalStream = null;
    this.mixedAudioContext = null;
  }

  cleanupPreviewUrl() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }

    this.previewUrl = "";
  }
}

export function formatRecordingDuration(seconds) {
  const safeSeconds = Number(seconds || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${pad(minutes)}:${pad(remainingSeconds)}`;
}