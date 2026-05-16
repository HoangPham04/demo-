import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  checkMeetAutoStop,
  startRecordingSession,
  uploadRecordingToDrive,
} from "./api";
import {
  ScreenRecordingPlugin,
  formatRecordingDuration,
} from "./plugins/screenRecordingPlugin";

export default function ScreenRecordingPanel() {
  const recorder = useMemo(() => new ScreenRecordingPlugin(), []);
  const countdownTimerRef = useRef(null);
  const uploadAttemptedRef = useRef(false);
  const recordingSessionIdRef = useRef("");
const meetAutoStopTimerRef = useRef(null);
  const [status, setStatus] = useState(recorder.getStatus());
  const [includeMicrophone, setIncludeMicrophone] = useState(true);
  const [includeSystemAudio, setIncludeSystemAudio] = useState(true);

  const [meetingCode, setMeetingCode] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("ame.nguyen@algo.edu.vn");
  const [className, setClassName] = useState("");
  const [recordingSessionId, setRecordingSessionId] = useState("");

  const [maxDurationMinutes, setMaxDurationMinutes] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const [uploadingToDrive, setUploadingToDrive] = useState(false);
  const [driveUploadError, setDriveUploadError] = useState("");
  const [driveFile, setDriveFile] = useState(null);
const [autoStopOnMeetEnd, setAutoStopOnMeetEnd] = useState(true);
const [recordingStartedAtUtc, setRecordingStartedAtUtc] = useState("");
const [meetAutoStopNote, setMeetAutoStopNote] = useState("");
  useEffect(() => {
    recorder.setStatusListener((nextStatus) => {
      setStatus({ ...nextStatus });
    });

    return () => {
      recorder.setStatusListener(null);
if (meetAutoStopTimerRef.current) {
  window.clearInterval(meetAutoStopTimerRef.current);
  meetAutoStopTimerRef.current = null;
}
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [recorder]);

  const support = status.support || recorder.getSupportInfo();

  const isRecording = status.status === "recording";
  const isPaused = status.status === "paused";
  const isStopping = status.status === "stopping";
  const hasRecording = Boolean(status.previewUrl);

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    setCountdown(0);
  }, []);

  const handleUploadToDrive = useCallback(async () => {
    try {
      uploadAttemptedRef.current = true;

      setDriveUploadError("");
      setDriveFile(null);
      setUploadingToDrive(true);

      const blob = recorder.getBlob();

      if (!blob) {
        throw new Error("No recording file is available to upload.");
      }

      const finalRecordingSessionId =
        recordingSessionIdRef.current || recordingSessionId || "";

      const result = await uploadRecordingToDrive({
        blob,
        fileName: status.fileName || "meet-recording.webm",
        recordingSessionId: finalRecordingSessionId,
        meetingCode,
        teacherEmail,
        className,
        durationSeconds: status.durationSeconds || 0,
        fileSizeBytes: status.fileSizeBytes || blob.size || 0,
      });

      if (!result?.success) {
        throw new Error(result?.message || "Upload to Google Drive failed.");
      }

      if (result?.recordingSessionId) {
        recordingSessionIdRef.current = result.recordingSessionId;
        setRecordingSessionId(result.recordingSessionId);
      }

      setDriveFile(result.file);
    } catch (err) {
      console.error(err);
      setDriveUploadError(
        err instanceof Error
          ? err.message
          : "Cannot upload recording to Google Drive."
      );
    } finally {
      setUploadingToDrive(false);
    }
  }, [
    recorder,
    status.fileName,
    status.durationSeconds,
    status.fileSizeBytes,
    recordingSessionId,
    meetingCode,
    teacherEmail,
    className,
  ]);

  useEffect(() => {
    if (
      status.status === "stopped" &&
      status.hasBlob &&
      !driveFile &&
      !uploadingToDrive &&
      !uploadAttemptedRef.current
    ) {
      handleUploadToDrive();
    }
  }, [
    status.status,
    status.hasBlob,
    driveFile,
    uploadingToDrive,
    handleUploadToDrive,
  ]);
  useEffect(() => {
    if (
      !autoStopOnMeetEnd ||
      status.status !== "recording" ||
      !meetingCode ||
      !teacherEmail
    ) {
      if (meetAutoStopTimerRef.current) {
        window.clearInterval(meetAutoStopTimerRef.current);
        meetAutoStopTimerRef.current = null;
      }

      return;
    }

    const checkMeetEnded = async () => {
      try {
        const result = await checkMeetAutoStop({
          meetingCode,
          teacherEmail,
          recordingStartedAtUtc,
          quietMinutes: 2,
        });

        if (!result?.success) {
          setMeetAutoStopNote(
            result?.message || "Meet auto-stop check is not available."
          );
          return;
        }

        setMeetAutoStopNote(result.reason || "");

        if (result.shouldStop) {
          setNote(
            "Meet appears ended from audit logs. Recording will stop automatically."
          );

          const stopResult = recorder.stop();
          setStatus({ ...stopResult });

          if (meetAutoStopTimerRef.current) {
            window.clearInterval(meetAutoStopTimerRef.current);
            meetAutoStopTimerRef.current = null;
          }
        }
      } catch (err) {
        console.error(err);
        setMeetAutoStopNote(
          err instanceof Error
            ? err.message
            : "Cannot check Meet auto-stop status."
        );
      }
    };

    if (meetAutoStopTimerRef.current) {
      window.clearInterval(meetAutoStopTimerRef.current);
      meetAutoStopTimerRef.current = null;
    }

    meetAutoStopTimerRef.current = window.setInterval(checkMeetEnded, 60000);

    const firstCheckTimer = window.setTimeout(checkMeetEnded, 90000);

    return () => {
      window.clearTimeout(firstCheckTimer);

      if (meetAutoStopTimerRef.current) {
        window.clearInterval(meetAutoStopTimerRef.current);
        meetAutoStopTimerRef.current = null;
      }
    };
  }, [
    autoStopOnMeetEnd,
    status.status,
    meetingCode,
    teacherEmail,
    recordingStartedAtUtc,
    recorder,
  ]);
  const actuallyStartRecording = async () => {
    const maxDurationSeconds = maxDurationMinutes
      ? Number(maxDurationMinutes) * 60
      : 0;

    try {
      const sessionResult = await startRecordingSession({
        meetingCode,
        teacherEmail,
        className,
      });

      if (sessionResult?.success && sessionResult?.recording?.recordingSessionId) {
        recordingSessionIdRef.current = sessionResult.recording.recordingSessionId;
        setRecordingSessionId(sessionResult.recording.recordingSessionId);
                const startedAt =
          sessionResult.recording.startedAt || new Date().toISOString();

        setRecordingStartedAtUtc(startedAt);
      }
    } catch (sessionError) {
      console.error(sessionError);
            setRecordingStartedAtUtc(new Date().toISOString());
      setDriveUploadError(
        "Recording started, but DB session could not be created. Upload will still try to continue."
      );
    }

    const result = await recorder.start({
      includeMicrophone,
      includeSystemAudio,
      maxDurationSeconds,
      fileNamePrefix: meetingCode ? `meet-${meetingCode}` : "screen-recording",
    });

    setStatus({ ...result });
    setNote(
      "Recording started. If you want Meet audio, choose the Chrome tab and enable tab audio in the browser sharing popup."
    );
  };

  const handleStart = async () => {
    try {
      uploadAttemptedRef.current = false;
      recordingSessionIdRef.current = "";

      setError("");
      setNote("");
      setDriveUploadError("");
      setDriveFile(null);
      setRecordingSessionId("");

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
      setDriveUploadError("");
      setDriveFile(null);

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
      uploadAttemptedRef.current = false;
      recordingSessionIdRef.current = "";

      setError("");
      setNote("");
      setDriveUploadError("");
      setDriveFile(null);
      setRecordingSessionId("");
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
            disabled={isRecording || isPaused || isStopping || uploadingToDrive}
          />
        </div>

        <div className="action-summary-card">
          <span>Teacher Email</span>
          <input
            className="audit-input"
            value={teacherEmail}
            onChange={(event) => setTeacherEmail(event.target.value)}
            placeholder="ame.nguyen@algo.edu.vn"
            disabled={isRecording || isPaused || isStopping || uploadingToDrive}
          />
        </div>

        <div className="action-summary-card">
          <span>Class Name</span>
          <input
            className="audit-input"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
            placeholder="Optional class/session name"
            disabled={isRecording || isPaused || isStopping || uploadingToDrive}
          />
        </div>

        <div className="action-summary-card">
          <span>Audio Options</span>

          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={includeMicrophone}
              onChange={(event) => setIncludeMicrophone(event.target.checked)}
              disabled={isRecording || isPaused || isStopping || uploadingToDrive}
            />
            Microphone audio
          </label>

          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={includeSystemAudio}
              onChange={(event) => setIncludeSystemAudio(event.target.checked)}
              disabled={isRecording || isPaused || isStopping || uploadingToDrive}
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
            disabled={isRecording || isPaused || isStopping || uploadingToDrive}
          />
          <p>Leave empty for manual stop.</p>
                    <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={autoStopOnMeetEnd}
              onChange={(event) => setAutoStopOnMeetEnd(event.target.checked)}
              disabled={uploadingToDrive}
            />
            Auto stop when Meet ends, using audit logs
          </label>

          <p>Audit logs may be delayed by a few minutes.</p>
        </div>

        <div className="action-summary-card">
          <span>Recording File</span>
          <strong>{status.fileName || "-"}</strong>
          <p>
            Size: {status.fileSizeLabel || "0 B"}
            <br />
            Format: WEBM
            <br />
            Session: {recordingSessionId || "-"}
          </p>
        </div>
      </div>

      {countdown > 0 && (
        <div className="success-state">
          Recording will start in <strong>{countdown}</strong>...
        </div>
      )}

      {note && <div className="success-state">{note}</div>}
      {meetAutoStopNote && (
        <div className="success-state">{meetAutoStopNote}</div>
      )}
      {error && <div className="error-state">{error}</div>}

      {uploadingToDrive && (
        <div className="success-state">
          Uploading recording to Google Drive...
        </div>
      )}

      {driveUploadError && <div className="error-state">{driveUploadError}</div>}

      {driveFile?.webViewLink && (
        <div className="success-state">
          <strong>Recording uploaded to Google Drive successfully.</strong>
          <div style={{ marginTop: "8px" }}>
            <a href={driveFile.webViewLink} target="_blank" rel="noreferrer">
              Open Recording in Google Drive
            </a>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {!isRecording && !isPaused && !isStopping && (
          <button
            type="button"
            className="secondary-button"
            onClick={handleStart}
            disabled={!support.isSupported || countdown > 0 || uploadingToDrive}
          >
            Start Recording
          </button>
        )}

        {isRecording && (
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={handlePause}
            >
              Pause
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={handleStop}
            >
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

            <button
              type="button"
              className="secondary-button"
              onClick={handleStop}
            >
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
              disabled={uploadingToDrive}
            >
              Download Recording
            </button>

            {!driveFile?.webViewLink && driveUploadError && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  uploadAttemptedRef.current = false;
                  handleUploadToDrive();
                }}
                disabled={uploadingToDrive}
              >
                Retry Upload to Drive
              </button>
            )}

            <button
              type="button"
              className="secondary-button"
              onClick={handleClear}
              disabled={uploadingToDrive}
            >
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