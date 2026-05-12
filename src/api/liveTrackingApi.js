import React, { useEffect, useMemo, useState } from "react";
import {
  clearLiveClassTracking,
  getLiveClassMonitor,
  liveClassDeviceCheck,
  liveClassJoinMeet,
  liveClassLogin,
  liveClassLogout,
  liveClassScreenCheck,
} from "./api";

export default function LiveClassTrackingPanel({
  groupCode = "API Demo Test Class",
  meetLink = "https://meet.google.com/jti-mggj-zro",
  student = {
    userId: "student-demo-001",
    userName: "Student Demo",
    email: "student.demo@test.com",
  },
}) {
  const [monitor, setMonitor] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const payload = useMemo(
    () => ({
      userId: student.userId,
      userName: student.userName,
      email: student.email,
      groupCode,
      meetLink,
      clientTimestamp: new Date().toISOString(),
    }),
    [student, groupCode, meetLink]
  );

  const loadMonitor = async () => {
    try {
      const data = await getLiveClassMonitor();
      setMonitor(data);
    } catch (error) {
      console.error(error);
      setMessage("Cannot load live class monitor. Please check backend.");
    }
  };

  useEffect(() => {
    loadMonitor();

    const interval = setInterval(() => {
      loadMonitor();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const runAction = async (action, successMessage) => {
    try {
      setLoading(true);
      setMessage("");

      await action();
      await loadMonitor();

      setMessage(successMessage);
    } catch (error) {
      console.error(error);
      setMessage("Action failed. Please check backend/API.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    runAction(() => liveClassLogin(payload), "Login tracked.");
  };

  const handleLogout = () => {
    runAction(() => liveClassLogout(payload), "Logout tracked.");
  };

  const handleDeviceCheck = async () => {
    let cameraReady = false;
    let microphoneReady = false;

    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraReady = true;
    } catch (error) {
      console.warn("Camera check failed:", error);
    }

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      micStream.getTracks().forEach((track) => track.stop());
      microphoneReady = true;
    } catch (error) {
      console.warn("Microphone check failed:", error);
    }

    runAction(
      () =>
        liveClassDeviceCheck({
          ...payload,
          cameraReady,
          microphoneReady,
        }),
      `Device checked. Camera: ${cameraReady ? "OK" : "Failed"}, Mic: ${
        microphoneReady ? "OK" : "Failed"
      }.`
    );
  };

  const handleScreenCheck = async () => {
    let screenReady = false;

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      screenStream.getTracks().forEach((track) => track.stop());
      screenReady = true;
    } catch (error) {
      console.warn("Screen share check failed:", error);
    }

    runAction(
      () =>
        liveClassScreenCheck({
          ...payload,
          screenReady,
        }),
      `Screen share checked. Result: ${screenReady ? "OK" : "Failed"}.`
    );
  };

  const handleJoinMeet = async () => {
    await runAction(
      () =>
        liveClassJoinMeet({
          ...payload,
          joinedMeet: true,
        }),
      "Join Google Meet tracked."
    );

    window.open(meetLink, "_blank", "noopener,noreferrer");
  };

  const handleClear = () => {
    runAction(() => clearLiveClassTracking(), "Tracking data cleared.");
  };

  const formatTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const summary = monitor?.summary || {
    totalStudents: 0,
    online: 0,
    cameraReady: 0,
    microphoneReady: 0,
    screenReady: 0,
    joinedMeet: 0,
  };

  const students = monitor?.students || [];
  const timeline = monitor?.timeline || [];

  return (
    <div className="live-tracking-panel">
      <style>{`
        .live-tracking-panel {
          margin-top: 20px;
          background: white;
          border: 1px solid #dbeafe;
          border-radius: 22px;
          padding: 18px;
        }

        .tracking-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 16px;
        }

        .tracking-kicker {
          color: #2563eb;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 900;
        }

        .tracking-title {
          margin: 6px 0 4px;
          color: #0f172a;
          font-size: 20px;
          font-weight: 950;
        }

        .tracking-description {
          margin: 0;
          color: #667085;
          font-size: 14px;
          line-height: 1.5;
        }

        .tracking-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }

        .tracking-button {
          border: 1px solid #d0d5dd;
          background: #f8fafc;
          color: #344054;
          border-radius: 13px;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .tracking-button:hover {
          border-color: #2563eb;
          color: #2563eb;
        }

        .tracking-button.primary {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .tracking-button.danger {
          background: #fff1f2;
          color: #be123c;
          border-color: #fecdd3;
        }

        .tracking-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .tracking-message {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          border-radius: 14px;
          padding: 11px 13px;
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 14px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }

        .summary-card {
          border: 1px solid #edf0f5;
          background: #fbfcff;
          border-radius: 16px;
          padding: 13px;
        }

        .summary-label {
          color: #667085;
          font-size: 12px;
          font-weight: 850;
          margin-bottom: 8px;
        }

        .summary-value {
          color: #0f172a;
          font-size: 24px;
          font-weight: 950;
        }

        .tracking-section-title {
          margin: 18px 0 10px;
          color: #0f172a;
          font-size: 16px;
          font-weight: 950;
        }

        .tracking-table-wrap {
          overflow-x: auto;
          border: 1px solid #edf0f5;
          border-radius: 16px;
          margin-bottom: 16px;
        }

        .tracking-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1050px;
        }

        .tracking-table th {
          background: #f8fafc;
          color: #667085;
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 12px;
          border-bottom: 1px solid #edf0f5;
        }

        .tracking-table td {
          padding: 12px;
          border-bottom: 1px solid #edf0f5;
          color: #344054;
          font-size: 13px;
          vertical-align: top;
        }

        .tracking-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .tracking-pill.ok {
          background: #ecfdf3;
          color: #027a48;
        }

        .tracking-pill.fail {
          background: #f2f4f7;
          color: #667085;
        }

        .timeline-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .timeline-item {
          border: 1px solid #edf0f5;
          background: #fbfcff;
          border-radius: 16px;
          padding: 13px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .timeline-main {
          color: #0f172a;
          font-size: 14px;
          font-weight: 850;
        }

        .timeline-sub {
          color: #667085;
          font-size: 13px;
          margin-top: 4px;
        }

        .timeline-time {
          color: #667085;
          font-size: 12px;
          white-space: nowrap;
        }

        @media (max-width: 1100px) {
          .summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .tracking-header {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="tracking-header">
        <div>
          <div className="tracking-kicker">Live Class Tracking</div>
          <div className="tracking-title">Student Login / Device Monitor</div>
          <p className="tracking-description">
            Xem học viên login/logout lúc mấy giờ, camera/mic/screen share OK
            hay failed, và ai đã bấm Join Google Meet.
          </p>
        </div>

        <button
          type="button"
          className="tracking-button"
          onClick={loadMonitor}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="tracking-actions">
        <button
          type="button"
          className="tracking-button primary"
          onClick={handleLogin}
          disabled={loading}
        >
          Login
        </button>

        <button
          type="button"
          className="tracking-button"
          onClick={handleLogout}
          disabled={loading}
        >
          Logout
        </button>

        <button
          type="button"
          className="tracking-button"
          onClick={handleDeviceCheck}
          disabled={loading}
        >
          Check Camera & Mic
        </button>

        <button
          type="button"
          className="tracking-button"
          onClick={handleScreenCheck}
          disabled={loading}
        >
          Check Screen Share
        </button>

        <button
          type="button"
          className="tracking-button primary"
          onClick={handleJoinMeet}
          disabled={loading}
        >
          Join Google Meet
        </button>

        <button
          type="button"
          className="tracking-button danger"
          onClick={handleClear}
          disabled={loading}
        >
          Clear Tracking
        </button>
      </div>

      {message && <div className="tracking-message">{message}</div>}

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">Total Students</div>
          <div className="summary-value">{summary.totalStudents}</div>
        </div>

        <div className="summary-card">
          <div className="summary-label">Online</div>
          <div className="summary-value">{summary.online}</div>
        </div>

        <div className="summary-card">
          <div className="summary-label">Camera OK</div>
          <div className="summary-value">{summary.cameraReady}</div>
        </div>

        <div className="summary-card">
          <div className="summary-label">Mic OK</div>
          <div className="summary-value">{summary.microphoneReady}</div>
        </div>

        <div className="summary-card">
          <div className="summary-label">Screen OK</div>
          <div className="summary-value">{summary.screenReady}</div>
        </div>

        <div className="summary-card">
          <div className="summary-label">Joined Meet</div>
          <div className="summary-value">{summary.joinedMeet}</div>
        </div>
      </div>

      <div className="tracking-section-title">Student Status</div>

      <div className="tracking-table-wrap">
        <table className="tracking-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Online</th>
              <th>Login At</th>
              <th>Logout At</th>
              <th>Camera</th>
              <th>Mic</th>
              <th>Screen</th>
              <th>Joined Meet</th>
              <th>Last Seen</th>
            </tr>
          </thead>

          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="9">No tracking data yet.</td>
              </tr>
            ) : (
              students.map((item) => (
                <tr key={item.userId}>
                  <td>
                    <strong>{item.userName}</strong>
                    <br />
                    {item.email}
                  </td>

                  <td>
                    <span
                      className={`tracking-pill ${
                        item.isOnline ? "ok" : "fail"
                      }`}
                    >
                      {item.isOnline ? "Online" : "Offline"}
                    </span>
                  </td>

                  <td>{formatTime(item.lastLoginAt)}</td>
                  <td>{formatTime(item.lastLogoutAt)}</td>

                  <td>
                    <span
                      className={`tracking-pill ${
                        item.cameraReady ? "ok" : "fail"
                      }`}
                    >
                      {item.cameraReady ? "OK" : "Failed"}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`tracking-pill ${
                        item.microphoneReady ? "ok" : "fail"
                      }`}
                    >
                      {item.microphoneReady ? "OK" : "Failed"}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`tracking-pill ${
                        item.screenReady ? "ok" : "fail"
                      }`}
                    >
                      {item.screenReady ? "OK" : "Failed"}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`tracking-pill ${
                        item.joinedMeet ? "ok" : "fail"
                      }`}
                    >
                      {item.joinedMeet ? "Joined" : "Not joined"}
                    </span>
                  </td>

                  <td>{formatTime(item.lastSeenAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="tracking-section-title">Activity Timeline</div>

      <div className="timeline-list">
        {timeline.length === 0 ? (
          <div className="timeline-item">
            <div>
              <div className="timeline-main">No timeline yet.</div>
              <div className="timeline-sub">
                Login, logout, device check, screen check, and Join Meet events
                will appear here.
              </div>
            </div>
          </div>
        ) : (
          timeline.map((item, index) => (
            <div
              key={`${item.userId}-${item.time}-${index}`}
              className="timeline-item"
            >
              <div>
                <div className="timeline-main">
                  {item.action} · {item.userName}
                </div>
                <div className="timeline-sub">{item.message}</div>
              </div>

              <div className="timeline-time">{formatTime(item.time)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}