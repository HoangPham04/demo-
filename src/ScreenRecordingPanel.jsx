import React, { useMemo, useRef, useState } from "react";
import {
  ScreenRecordingPlugin,
  formatRecordingDuration,
} from "./plugins/screenRecordingPlugin";

export default function ScreenRecordingPanel() {
  const recorder = useMemo(() => new ScreenRecordingPlugin(), []);
  const countdownTimerRef = useRef(null);

  const [status, setStatus] = useState(recorder.getStatus());
  const [includeMicrophone, setIncludeMicrophone] = useState(true);
  const [includeSystemAudio, setIncludeSystemAudio] = useState(true);
  const [meetingCode, setMeetingCode] = useState("");
  const [maxDurationMinutes, setMaxDurationMinutes] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  recorder.setStatusListener((nextStatus) => {
    setStatus({ ...nextStatus });
  });

  const support = status.support || recorder.getSupportInfo();

  const isRecording = status.status === "recording";
  const isPaused = status.status === "paused";
  const isStopping = status.status === "stopping";
  const hasRecording = Boolean(status.previewUrl);

  const clearCountdown = () => {
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    setCountdown(0);
  };

  const actuallyStartRecording = async () => {
    const maxDurationSeconds = maxDurationMinutes
      ? Number(maxDurationMinutes) * 60
      : 0;

    const result = await recorder.start({
      includeMicrophone,
      includeSystemAudio,
      maxDurationSeconds,
      fileNamePrefix: meetingCode
        ? `meet-${meetingCode}`
        : "screen-recording",
    });

    setStatus({ ...result });
    setNote(
      "Recording started. If you want Meet audio, choose the Chrome tab and enable tab audio in the browser sharing popup."
    );
  };

  const handleStart = async () => {
    try {
      setError("");
      setNote("");

      if (!support.isSupported) {
        setError(
          "This browser does not fully support screen recording. Please use Chrome or Edge."
        );
        return;
      }

      setCountdown(3);

      let current = 3;

      countdownTimerRef.current = window.setInterval(async () => {
        current -= 1;
        setCountdown(current);

        if (current <= 0) {
          clearCountdown();

          try {
            await actuallyStartRecording();
          } catch (err) {
            console.error(err);
            setError(
              err instanceof Error
                ? err.message
                : "Cannot start screen recording."
            );
          }
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      clearCountdown();
      setError(
        err instanceof Error ? err.message : "Cannot start screen recording."
      );
    }
  };

  const handleStop = () => {
    try {
      setError("");
      setNote("");
      const result = recorder.stop();
      setStatus({ ...result });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Cannot stop screen recording."
      );
    }
  };

  const handlePause = () => {
    try {
      setError("");
      const result = recorder.pause();
      setStatus({ ...result });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Cannot pause screen recording."
      );
    }
  };

  const handleResume = () => {
    try {
      setError("");
      const result = recorder.resume();
      setStatus({ ...result });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Cannot resume screen recording."
      );
    }
  };

  const handleDownload = () => {
    try {
      setError("");
      recorder.download();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Cannot download screen recording."
      );
    }
  };

  const handleClear = () => {
    try {
      setError("");
      setNote("");
      clearCountdown();
      const result = recorder.reset();
      setStatus({ ...result });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Cannot clear screen recording."
      );
    }
  };

  return (
    <div className="class-detail-panel">
      <div className="selected-class-header">
        <div>
          <div className="kicker">Screen Recording Plugin</div>
          <h4>Record Screen / Chrome Tab</h4>
          <p>
            Best for manual class recording. User must choose which screen,
            window, or Chrome tab to record.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className={isRecording ? "audit-pill ok" : "audit-pill no"}>
            {status.status}
          </span>

          <strong style={{ fontSize: "20px" }}>
            {formatRecordingDuration(status.durationSeconds)}
          </strong>
        </div>
      </div>

      {!support.isSupported && (
        <div className="error-state">
          This browser does not fully support screen recording. Please use Chrome
          or Edge on desktop.
        </div>
      )}

      <div className="class-action-summary compact">
        <div className="action-summary-card">
          <span>Meeting Code / File Prefix</span>
          <input
            className="audit-input"
            value={meetingCode}
            onChange={(event) =>
              setMeetingCode(
                event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")
              )
            }
            placeholder="Example: XJWGYMVFGW"
            disabled={isRecording || isPaused || isStopping}
          />
        </div>

        <div className="action-summary-card">
          <span>Audio Options</span>

          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={includeMicrophone}
              onChange={(event) => setIncludeMicrophone(event.target.checked)}
              disabled={isRecording || isPaused || isStopping}
            />
            Microphone audio
          </label>

          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={includeSystemAudio}
              onChange={(event) => setIncludeSystemAudio(event.target.checked)}
              disabled={isRecording || isPaused || isStopping}
            />
            Tab/system audio if browser allows
          </label>
        </div>

        <div className="action-summary-card">
          <span>Auto Stop</span>
          <input
            className="audit-input"
            type="number"
            min="1"
            max="240"
            value={maxDurationMinutes}
            onChange={(event) => setMaxDurationMinutes(event.target.value)}
            placeholder="Minutes, optional"
            disabled={isRecording || isPaused || isStopping}
          />
          <p>Leave empty for manual stop.</p>
        </div>

        <div className="action-summary-card">
          <span>Recording File</span>
          <strong>{status.fileName || "-"}</strong>
          <p>
            Size: {status.fileSizeLabel || "0 B"}
            <br />
            Format: WEBM
          </p>
        </div>
      </div>

      {countdown > 0 && (
        <div className="success-state">
          Recording will start in <strong>{countdown}</strong>...
        </div>
      )}

      {note && <div className="success-state">{note}</div>}

      {error && <div className="error-state">{error}</div>}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {!isRecording && !isPaused && !isStopping && (
          <button
            type="button"
            className="secondary-button"
            onClick={handleStart}
            disabled={!support.isSupported || countdown > 0}
          >
            Start Recording
          </button>
        )}

        {isRecording && (
          <>
            <button type="button" className="secondary-button" onClick={handlePause}>
              Pause
            </button>

            <button type="button" className="secondary-button" onClick={handleStop}>
              Stop Recording
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={handleResume}
            >
              Resume
            </button>

            <button type="button" className="secondary-button" onClick={handleStop}>
              Stop Recording
            </button>
          </>
        )}

        {hasRecording && !isRecording && !isPaused && (
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={handleDownload}
            >
              Download Recording
            </button>

            <button type="button" className="secondary-button" onClick={handleClear}>
              Clear Recording
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: "14px", fontSize: "13px", color: "#6b7280" }}>
        Tip: For Google Meet, choose the Chrome tab where Meet is running and
        tick “Share tab audio” when Chrome asks what to share.
      </div>

      {hasRecording && (
        <div style={{ marginTop: "18px" }}>
          <div className="audit-section-title">Recording Preview</div>

          <video
            src={status.previewUrl}
            controls
            style={{
              width: "100%",
              maxHeight: "520px",
              borderRadius: "16px",
              background: "#000",
            }}
          />
        </div>
      )}
    </div>
  );
}