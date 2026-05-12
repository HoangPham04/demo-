import React, { useState } from "react";
import MeetAuditSummaryPanel from "./MeetAuditSummaryPanel";

const DEFAULT_GOOGLE_MEET_LINK = "https://meet.google.com/bft-zrng-dzp";

export default function App() {
  const [cameraReady, setCameraReady] = useState(false);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [deviceMessage, setDeviceMessage] = useState("");

  const handleCheckCameraMic = async () => {
    setDeviceMessage("");

    let cameraOk = false;
    let micOk = false;

    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      cameraStream.getTracks().forEach((track) => track.stop());
      cameraOk = true;
    } catch (error) {
      console.warn("Camera check failed:", error);
      cameraOk = false;
    }

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      micStream.getTracks().forEach((track) => track.stop());
      micOk = true;
    } catch (error) {
      console.warn("Microphone check failed:", error);
      micOk = false;
    }

    setCameraReady(cameraOk);
    setMicrophoneReady(micOk);

    if (cameraOk && micOk) {
      setDeviceMessage("Camera and microphone are ready. You can join the class.");
    } else {
      setDeviceMessage(
        "Please allow both camera and microphone before joining the class."
      );
    }
  };

  const handleJoinGoogleMeet = () => {
    if (!cameraReady || !microphoneReady) {
      setDeviceMessage(
        "You must allow both camera and microphone before joining Google Meet."
      );
      return;
    }

    window.open(DEFAULT_GOOGLE_MEET_LINK, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="classroom-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f4f7fb;
          color: #111827;
          font-family: Inter, Arial, sans-serif;
        }

        button,
        input {
          font-family: inherit;
        }

        .classroom-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 34%),
            linear-gradient(180deg, #f8fafc 0%, #eef3f9 100%);
          padding: 24px;
        }

        .main {
          max-width: 1280px;
          margin: 0 auto;
        }

        .meet-page-card {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid #e5e7eb;
          border-radius: 28px;
          padding: 26px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
        }

        .kicker {
          color: #2563eb;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 900;
        }

        .meet-card {
          background: white;
          border: 1px solid #dbeafe;
          border-radius: 24px;
          padding: 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
        }

        .meet-title {
          color: #0f172a;
          font-size: 24px;
          font-weight: 950;
          margin: 8px 0;
        }

        .meet-link {
          color: #667085;
          font-size: 15px;
          word-break: break-word;
        }

        .meet-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .meet-button,
        .secondary-button {
          border: none;
          border-radius: 15px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .meet-button {
          color: white;
          background: #2563eb;
          box-shadow: 0 12px 22px rgba(37, 99, 235, 0.18);
        }

        .meet-button:hover {
          background: #1d4ed8;
        }

        .meet-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }

        .secondary-button {
          color: #344054;
          background: #f8fafc;
          border: 1px solid #d0d5dd;
        }

        .secondary-button:hover {
          color: #2563eb;
          border-color: #2563eb;
        }

        .device-status-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .device-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 900;
        }

        .device-pill.ok {
          background: #dcfce7;
          color: #166534;
        }

        .device-pill.fail {
          background: #fee2e2;
          color: #b42318;
        }

        .device-message {
          margin-top: 10px;
          color: #344054;
          font-size: 13px;
          font-weight: 750;
          line-height: 1.5;
        }

        .empty-state,
        .loading-state,
        .error-state {
          border: 1px dashed #d0d5dd;
          border-radius: 20px;
          padding: 24px;
          text-align: center;
          color: #667085;
          background: white;
        }

        .error-state {
          border-color: #fecdd3;
          background: #fff1f2;
          color: #be123c;
          font-weight: 800;
        }

        .audit-panel {
          margin-top: 24px;
          border: 1px solid #e6ebf2;
          border-radius: 24px;
          background: #ffffff;
          padding: 24px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
        }

        .audit-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .audit-header h3 {
          margin: 6px 0 8px;
          font-size: 20px;
          line-height: 1.3;
          font-weight: 900;
          color: #0f172a;
        }

        .audit-header p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          color: #667085;
          max-width: 760px;
        }

        .audit-section-title {
          margin: 22px 0 12px;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #1d4ed8;
        }

        .audit-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .audit-stat-card {
          border: 1px solid #e8edf5;
          border-radius: 18px;
          background: #f8fbff;
          padding: 16px 18px;
        }

        .audit-stat-card span {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 800;
          color: #667085;
        }

        .audit-stat-card strong {
          font-size: 30px;
          font-weight: 950;
          color: #0f172a;
          line-height: 1;
        }

        .class-card-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .class-card {
          display: block;
          width: 100%;
          text-align: left;
          border: 1px solid #dbe5f0;
          border-radius: 20px;
          background: #ffffff;
          padding: 18px;
          cursor: pointer;
          transition: all 0.18s ease;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
        }

        .class-card:hover {
          transform: translateY(-2px);
          border-color: #93c5fd;
          box-shadow: 0 14px 28px rgba(37, 99, 235, 0.1);
        }

        .class-card.active {
          border-color: #2563eb;
          background: #eff6ff;
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.12);
        }

        .class-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 14px;
        }

        .class-name {
          font-size: 19px;
          line-height: 1.35;
          font-weight: 950;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .class-code {
          font-size: 13px;
          line-height: 1.4;
          font-weight: 900;
          letter-spacing: 0.05em;
          color: #2563eb;
          text-transform: uppercase;
        }

        .class-count {
          white-space: nowrap;
          padding: 7px 12px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 900;
        }

        .class-meta {
          display: grid;
          gap: 12px;
          margin-bottom: 14px;
        }

        .class-meta > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .class-meta span {
          font-size: 12px;
          font-weight: 800;
          color: #667085;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .class-meta strong {
          font-size: 14px;
          line-height: 1.5;
          font-weight: 850;
          color: #111827;
          word-break: break-word;
        }

        .class-mini-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .class-mini-stats span {
          display: inline-flex;
          align-items: center;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid #e5eaf3;
          background: #f8fafc;
          font-size: 12px;
          font-weight: 900;
          color: #334155;
        }

        .class-attendance-preview {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }

        .attendance-column {
          border-radius: 16px;
          padding: 12px;
          border: 1px solid #e5eaf3;
          background: #ffffff;
        }

        .attendance-column.joined {
          background: #ecfdf3;
          border-color: #bbf7d0;
        }

        .attendance-column.absent {
          background: #fff7ed;
          border-color: #fed7aa;
        }

        .attendance-column.extra {
          background: #eff6ff;
          border-color: #bfdbfe;
          grid-column: 1 / -1;
        }

        .attendance-title {
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #475467;
        }

        .attendance-person {
          margin-top: 6px;
          color: #0f172a;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.4;
        }

        .attendance-empty {
          color: #667085;
          font-size: 13px;
          font-weight: 750;
          line-height: 1.4;
        }

        .roster-warning {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #c2410c;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.5;
        }

        .selected-class-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          margin: 24px 0 14px;
        }

        .selected-class-header h4 {
          margin: 5px 0 6px;
          font-size: 24px;
          line-height: 1.3;
          font-weight: 950;
          color: #0f172a;
        }

        .selected-class-header p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          color: #667085;
        }

        .audit-input,
        .selected-search {
          width: 100%;
          max-width: 360px;
          border: 1px solid #d9e2ec;
          border-radius: 14px;
          background: #fff;
          padding: 12px 14px;
          font-size: 14px;
          color: #0f172a;
          outline: none;
        }

        .audit-input:focus,
        .selected-search:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
        }

        .class-detail-panel {
          margin-top: 24px;
          border: 1px solid #e5eaf3;
          border-radius: 22px;
          padding: 20px;
          background: #ffffff;
        }

        .class-action-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin: 12px 0 18px;
        }

        .action-summary-card {
          border: 1px solid #e8edf5;
          border-radius: 18px;
          background: #fbfdff;
          padding: 14px;
        }

        .action-summary-card span {
          display: block;
          margin-bottom: 8px;
          color: #667085;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .action-summary-card strong {
          display: block;
          color: #0f172a;
          font-size: 20px;
          font-weight: 950;
          line-height: 1.3;
          margin-bottom: 8px;
        }

        .action-summary-card p {
          margin: 0;
          color: #667085;
          font-size: 13px;
          line-height: 1.45;
        }

        .class-timeline {
          display: grid;
          gap: 12px;
          margin-bottom: 20px;
        }

        .timeline-item {
          display: grid;
          grid-template-columns: 18px 1fr;
          gap: 12px;
          align-items: flex-start;
        }

        .timeline-dot {
          width: 12px;
          height: 12px;
          margin-top: 18px;
          border-radius: 999px;
          background: #2563eb;
          box-shadow: 0 0 0 5px #dbeafe;
        }

        .timeline-content {
          border: 1px solid #e8edf5;
          border-radius: 16px;
          background: #fbfdff;
          padding: 14px 16px;
        }

        .timeline-top {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .timeline-top strong {
          display: block;
          color: #0f172a;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.4;
        }

        .timeline-top span {
          display: block;
          color: #667085;
          font-size: 13px;
          line-height: 1.5;
        }

        .timeline-time {
          color: #344054;
          font-size: 13px;
          font-weight: 850;
          white-space: nowrap;
        }

        .timeline-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .timeline-meta span {
          border: 1px solid #e5eaf3;
          background: #ffffff;
          color: #344054;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 12px;
          font-weight: 850;
        }

        .timeline-warning {
          margin-top: 10px;
          border-radius: 12px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #c2410c;
          padding: 9px 10px;
          font-size: 13px;
          font-weight: 850;
        }

        .audit-table-wrap {
          overflow-x: auto;
          border: 1px solid #e8edf5;
          border-radius: 18px;
          background: #ffffff;
          margin-bottom: 20px;
        }

        .audit-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 980px;
        }
.audit-table .datetime-col {
  white-space: nowrap;
  min-width: 180px;
  width: 180px;
}
        .audit-table thead th {
          background: #f8fafc;
          color: #475467;
          font-size: 13px;
          font-weight: 900;
          text-align: left;
          padding: 14px 16px;
          border-bottom: 1px solid #e8edf5;
          white-space: nowrap;
        }

        .audit-table tbody td {
          padding: 14px 16px;
          border-bottom: 1px solid #edf2f7;
          font-size: 14px;
          line-height: 1.5;
          color: #101828;
          vertical-align: top;
        }
                   .audit-table thead th:nth-child(n + 6),
        .audit-table tbody td:nth-child(n + 6) {
          text-align: center !important;
          vertical-align: middle !important;
          white-space: nowrap !important;
          padding-left: 6px !important;
          padding-right: 6px !important;
        }

        .audit-table thead th:nth-child(6),
        .audit-table tbody td:nth-child(6) {
          width: 76px !important;
          min-width: 76px !important;
          max-width: 76px !important;
        }

        .audit-table thead th:nth-child(7),
        .audit-table tbody td:nth-child(7) {
          width: 92px !important;
          min-width: 92px !important;
          max-width: 92px !important;
        }

        .audit-table thead th:nth-child(8),
        .audit-table tbody td:nth-child(8) {
          width: 86px !important;
          min-width: 86px !important;
          max-width: 86px !important;
        }

        .audit-table thead th:nth-child(9),
        .audit-table tbody td:nth-child(9),
        .audit-table thead th:nth-child(10),
        .audit-table tbody td:nth-child(10) {
          width: 104px !important;
          min-width: 104px !important;
          max-width: 104px !important;
        }

        .audit-table thead th:nth-child(11),
        .audit-table tbody td:nth-child(11) {
          width: 120px !important;
          min-width: 120px !important;
          max-width: 120px !important;
        }

        .audit-table thead th:nth-child(12),
        .audit-table tbody td:nth-child(12) {
          width: 76px !important;
          min-width: 76px !important;
          max-width: 76px !important;
        }

        .audit-table tbody td:nth-child(6) .audit-pill,
        .audit-table tbody td:nth-child(7) .audit-pill,
        .audit-table tbody td:nth-child(8) .audit-pill {
          min-width: 58px !important;
          padding: 5px 9px !important;
          margin: 0 auto !important;
        }

        .audit-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 64px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
        }

        .audit-pill.ok {
          background: #dcfce7;
          color: #166534;
        }

        .audit-pill.no {
          background: #fee2e2;
          color: #b42318;
        }

        .absent-list {
          display: grid;
          gap: 10px;
          margin-bottom: 18px;
        }

        .absent-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid #fed7aa;
          background: #fff7ed;
        }

        .absent-item.extra {
          border-color: #bbf7d0;
          background: #ecfdf3;
        }

        .absent-item strong {
          display: block;
          font-size: 15px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 3px;
        }

        .absent-item span {
          display: block;
          font-size: 13px;
          line-height: 1.5;
          color: #667085;
        }

        @media (max-width: 1100px) {
          .audit-stats-grid,
          .class-card-grid,
          .class-action-summary {
            grid-template-columns: 1fr;
          }

          .selected-class-header,
          .audit-header,
          .meet-card {
            flex-direction: column;
            align-items: stretch;
          }

          .selected-search {
            max-width: 100%;
          }

          .meet-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 760px) {
          .classroom-page {
            padding: 14px;
          }
        }
      `}</style>

      <main className="main">
        <section className="meet-page-card">
          <div className="meet-card">
            <div>
              <div className="kicker">Google Meet</div>
              <div className="meet-title">Class Meeting Room</div>

              <div className="meet-link">{DEFAULT_GOOGLE_MEET_LINK}</div>

              <div className="device-status-row">
                <span
                  className={cameraReady ? "device-pill ok" : "device-pill fail"}
                >
                  Camera: {cameraReady ? "OK" : "Required"}
                </span>

                <span
                  className={
                    microphoneReady ? "device-pill ok" : "device-pill fail"
                  }
                >
                  Microphone: {microphoneReady ? "OK" : "Required"}
                </span>
              </div>

              {deviceMessage && (
                <div className="device-message">{deviceMessage}</div>
              )}
            </div>

            <div className="meet-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={handleCheckCameraMic}
              >
                Check Camera & Mic
              </button>

              <button
                type="button"
                className="meet-button"
                onClick={handleJoinGoogleMeet}
                disabled={!cameraReady || !microphoneReady}
              >
                Go to online lesson
              </button>
            </div>
          </div>

          <MeetAuditSummaryPanel />
        </section>
      </main>
    </div>
  );
}
