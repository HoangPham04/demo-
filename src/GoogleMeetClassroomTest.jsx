import React, { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/api/live-class/monitor";

export default function LiveClassMonitorTest() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");

  const fetchMonitorData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "API returned success = false");
      }

      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError(err.message || "Cannot load monitor data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitorData();

    const interval = setInterval(() => {
      fetchMonitorData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const students = data?.students || [];
  const summary = data?.summary || {
    totalStudents: 0,
    online: 0,
    cameraReady: 0,
    microphoneReady: 0,
    screenReady: 0,
    joinedMeet: 0,
  };

  const onlinePercent = useMemo(() => {
    if (!summary.totalStudents) return 0;
    return Math.round((summary.online / summary.totalStudents) * 100);
  }, [summary]);

  const formatTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const StatusPill = ({ active, label }) => {
    return (
      <span className={`status-pill ${active ? "active" : "inactive"}`}>
        <span className="status-dot" />
        {label}
      </span>
    );
  };

  return (
    <div className="live-monitor-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .live-monitor-page {
          min-height: 100vh;
          background: #f5f7fb;
          padding: 28px;
          font-family: Inter, Arial, sans-serif;
          color: #182033;
        }

        .monitor-container {
          max-width: 1180px;
          margin: 0 auto;
        }

        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 22px;
        }

        .monitor-title-block {
          min-width: 0;
        }

        .monitor-title {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          line-height: 1.2;
          color: #111827;
        }

        .monitor-subtitle {
          margin: 8px 0 0;
          font-size: 15px;
          color: #667085;
          line-height: 1.5;
        }

        .header-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          flex-shrink: 0;
        }

        .refresh-btn {
          border: none;
          background: #2563eb;
          color: white;
          padding: 11px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.18);
        }

        .refresh-btn:hover {
          background: #1d4ed8;
        }

        .refresh-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .last-updated {
          font-size: 12px;
          color: #667085;
          white-space: nowrap;
        }

        .alert-error {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #be123c;
          padding: 14px 16px;
          border-radius: 14px;
          margin-bottom: 18px;
          font-size: 14px;
          font-weight: 600;
        }

        .loading-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 28px;
          text-align: center;
          color: #667085;
          box-shadow: 0 10px 28px rgba(16, 24, 40, 0.06);
        }

        .class-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 22px;
          margin-bottom: 20px;
          box-shadow: 0 10px 28px rgba(16, 24, 40, 0.06);
        }

        .class-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }

        .class-name {
          margin: 0;
          font-size: 21px;
          font-weight: 800;
          color: #111827;
          line-height: 1.3;
        }

        .class-label {
          display: inline-flex;
          align-items: center;
          padding: 7px 12px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 14px;
        }

        .summary-box {
          border: 1px solid #edf0f5;
          background: #fbfcff;
          border-radius: 16px;
          padding: 15px;
          min-height: 96px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }

        .summary-label {
          font-size: 13px;
          color: #667085;
          font-weight: 650;
          line-height: 1.35;
          min-height: 34px;
        }

        .summary-value {
          font-size: 28px;
          font-weight: 850;
          color: #111827;
          line-height: 1;
          margin-top: 10px;
        }

        .summary-note {
          font-size: 12px;
          color: #98a2b3;
          margin-top: 8px;
          line-height: 1.35;
        }

        .progress-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 20px 22px;
          margin-bottom: 20px;
          box-shadow: 0 10px 28px rgba(16, 24, 40, 0.06);
        }

        .progress-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .progress-title {
          font-size: 15px;
          font-weight: 800;
          color: #111827;
        }

        .progress-percent {
          font-size: 14px;
          font-weight: 800;
          color: #2563eb;
        }

        .progress-bar {
          width: 100%;
          height: 12px;
          background: #eef2f7;
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #2563eb;
          border-radius: 999px;
          transition: width 0.25s ease;
        }

        .students-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 22px;
          box-shadow: 0 10px 28px rgba(16, 24, 40, 0.06);
        }

        .students-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .students-title {
          margin: 0;
          font-size: 19px;
          font-weight: 850;
          color: #111827;
        }

        .students-count {
          color: #667085;
          font-size: 14px;
          font-weight: 650;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #edf0f5;
          border-radius: 16px;
        }

        .students-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
          background: white;
        }

        .students-table thead {
          background: #f8fafc;
        }

        .students-table th {
          text-align: left;
          padding: 14px 16px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #667085;
          font-weight: 850;
          border-bottom: 1px solid #edf0f5;
          white-space: nowrap;
        }

        .students-table td {
          padding: 15px 16px;
          border-bottom: 1px solid #edf0f5;
          vertical-align: middle;
          font-size: 14px;
          color: #344054;
        }

        .students-table tbody tr:last-child td {
          border-bottom: none;
        }

        .students-table tbody tr:hover {
          background: #fbfcff;
        }

        .student-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 220px;
        }

        .student-name {
          font-weight: 800;
          color: #111827;
          line-height: 1.3;
        }

        .student-email {
          color: #667085;
          font-size: 13px;
          line-height: 1.35;
          word-break: break-word;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          line-height: 1;
        }

        .status-pill.active {
          background: #ecfdf3;
          color: #027a48;
        }

        .status-pill.inactive {
          background: #f2f4f7;
          color: #667085;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
          flex-shrink: 0;
        }

        .empty-state {
          padding: 34px 18px;
          text-align: center;
          color: #667085;
          background: #fbfcff;
          border: 1px dashed #d0d5dd;
          border-radius: 16px;
        }

        @media (max-width: 1050px) {
          .summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .live-monitor-page {
            padding: 18px;
          }

          .monitor-header {
            flex-direction: column;
            align-items: stretch;
          }

          .header-actions {
            align-items: stretch;
          }

          .refresh-btn {
            width: 100%;
          }

          .class-top {
            flex-direction: column;
            align-items: flex-start;
          }

          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .summary-box {
            min-height: 92px;
          }

          .monitor-title {
            font-size: 24px;
          }
        }

        @media (max-width: 460px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="monitor-container">
        <div className="monitor-header">
          <div className="monitor-title-block">
            <h1 className="monitor-title">Google Meet Live Class Monitor</h1>
            <p className="monitor-subtitle">
              Theo dõi tình trạng học viên trong lớp: online, camera, microphone,
              screen sharing và Google Meet.
            </p>
          </div>

          <div className="header-actions">
            <button
              className="refresh-btn"
              onClick={fetchMonitorData}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>

            <div className="last-updated">
              Last updated: {lastUpdated ? formatTime(lastUpdated) : "-"}
            </div>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {loading && !data ? (
          <div className="loading-card">Loading live class data...</div>
        ) : (
          <>
            <div className="class-card">
              <div className="class-top">
                <h2 className="class-name">
                  {data?.groupCode || "No group selected"}
                </h2>

                <span className="class-label">Live monitoring</span>
              </div>

              <div className="summary-grid">
                <div className="summary-box">
                  <div className="summary-label">Total Students</div>
                  <div className="summary-value">{summary.totalStudents}</div>
                  <div className="summary-note">All students in class</div>
                </div>

                <div className="summary-box">
                  <div className="summary-label">Online</div>
                  <div className="summary-value">{summary.online}</div>
                  <div className="summary-note">Currently online</div>
                </div>

                <div className="summary-box">
                  <div className="summary-label">Camera Ready</div>
                  <div className="summary-value">{summary.cameraReady}</div>
                  <div className="summary-note">Camera is available</div>
                </div>

                <div className="summary-box">
                  <div className="summary-label">Microphone Ready</div>
                  <div className="summary-value">
                    {summary.microphoneReady}
                  </div>
                  <div className="summary-note">Mic is available</div>
                </div>

                <div className="summary-box">
                  <div className="summary-label">Screen Ready</div>
                  <div className="summary-value">{summary.screenReady}</div>
                  <div className="summary-note">Screen sharing ready</div>
                </div>

                <div className="summary-box">
                  <div className="summary-label">Joined Meet</div>
                  <div className="summary-value">{summary.joinedMeet}</div>
                  <div className="summary-note">Inside Google Meet</div>
                </div>
              </div>
            </div>

            <div className="progress-card">
              <div className="progress-title-row">
                <div className="progress-title">Online attendance rate</div>
                <div className="progress-percent">{onlinePercent}%</div>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${onlinePercent}%` }}
                />
              </div>
            </div>

            <div className="students-card">
              <div className="students-header">
                <h2 className="students-title">Student Status</h2>
                <div className="students-count">{students.length} students</div>
              </div>

              {students.length === 0 ? (
                <div className="empty-state">
                  Chưa có dữ liệu học viên trong lớp này.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Online</th>
                        <th>Camera</th>
                        <th>Microphone</th>
                        <th>Screen</th>
                        <th>Google Meet</th>
                        <th>Login Time</th>
                      </tr>
                    </thead>

                    <tbody>
                      {students.map((student) => (
                        <tr key={student.userId || student.email}>
                          <td>
                            <div className="student-info">
                              <div className="student-name">
                                {student.userName || "Unnamed Student"}
                              </div>
                              <div className="student-email">
                                {student.email || "-"}
                              </div>
                            </div>
                          </td>

                          <td>
                            <StatusPill
                              active={student.isOnline}
                              label={student.isOnline ? "Online" : "Offline"}
                            />
                          </td>

                          <td>
                            <StatusPill
                              active={student.cameraReady}
                              label={student.cameraReady ? "Ready" : "Not ready"}
                            />
                          </td>

                          <td>
                            <StatusPill
                              active={student.microphoneReady}
                              label={
                                student.microphoneReady ? "Ready" : "Not ready"
                              }
                            />
                          </td>

                          <td>
                            <StatusPill
                              active={student.screenReady}
                              label={student.screenReady ? "Ready" : "Not ready"}
                            />
                          </td>

                          <td>
                            <StatusPill
                              active={student.joinedMeet}
                              label={
                                student.joinedMeet ? "Joined" : "Not joined"
                              }
                            />
                          </td>

                          <td>{formatTime(student.loginAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}