import React, { useEffect, useMemo, useState } from "react";

const BASE_API_URL = "http://localhost:5000/api/live-class";

const DEFAULT_MEET_LINK = "https://meet.google.com/wqd-eskv-mbm";

const DEFAULT_STUDENTS = [
  {
    userId: "student-demo-001",
    userName: "Student Demo",
    email: "student.demo@test.com",
    groupCode: "API Demo Test Class",
    isOnline: false,
    cameraReady: false,
    microphoneReady: false,
    screenReady: false,
    joinedMeet: false,
    loginAt: null,
  },
];

export default function LiveClassMonitorTest() {
  const [groupCode, setGroupCode] = useState("API Demo Test Class");
  const [students, setStudents] = useState(DEFAULT_STUDENTS);
  const [selectedUserId, setSelectedUserId] = useState(DEFAULT_STUDENTS[0].userId);
  const [meetLink, setMeetLink] = useState(DEFAULT_MEET_LINK);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [message, setMessage] = useState("");

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.userId === selectedUserId) || students[0];
  }, [students, selectedUserId]);

  const summary = useMemo(() => {
    return {
      totalStudents: students.length,
      online: students.filter((s) => s.isOnline).length,
      cameraReady: students.filter((s) => s.cameraReady).length,
      microphoneReady: students.filter((s) => s.microphoneReady).length,
      screenReady: students.filter((s) => s.screenReady).length,
      joinedMeet: students.filter((s) => s.joinedMeet).length,
    };
  }, [students]);

  const onlinePercent = useMemo(() => {
    if (!summary.totalStudents) return 0;
    return Math.round((summary.online / summary.totalStudents) * 100);
  }, [summary]);

  const normalizeStudent = (student) => {
    return {
      userId: student.userId || student.id || student.email || "unknown-user",
      userName: student.userName || student.name || "Unnamed Student",
      email: student.email || "-",
      groupCode: student.groupCode || groupCode,
      isOnline: Boolean(student.isOnline ?? student.online),
      cameraReady: Boolean(student.cameraReady ?? student.cameraOk),
      microphoneReady: Boolean(
        student.microphoneReady ?? student.micReady ?? student.microphoneOk
      ),
      screenReady: Boolean(student.screenReady ?? student.screenOk),
      joinedMeet: Boolean(student.joinedMeet ?? student.meetJoined),
      loginAt: student.loginAt || student.lastLoginAt || null,
    };
  };

  const refreshMonitor = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${BASE_API_URL}/monitor`);

      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }

      const result = await response.json();

      const nextStudents = Array.isArray(result.students)
        ? result.students.map(normalizeStudent)
        : DEFAULT_STUDENTS;

      setGroupCode(result.groupCode || "API Demo Test Class");
      setStudents(nextStudents);
      setSelectedUserId((current) => {
        const stillExists = nextStudents.some((s) => s.userId === current);
        return stillExists ? current : nextStudents[0]?.userId;
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.warn("Monitor API not available, using demo UI only:", error);
      setMessage("Frontend đang chạy. Nếu số liệu không sync backend, kiểm tra lại port API.");
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMonitor();

    const interval = setInterval(() => {
      refreshMonitor();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const updateStudentLocally = (changes) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.userId === selectedUserId
          ? {
              ...student,
              ...changes,
            }
          : student
      )
    );

    setLastUpdated(new Date());
  };

  const postAction = async (endpoint, body, localChanges, successMessage) => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${BASE_API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }

      updateStudentLocally(localChanges);
      await refreshMonitor();
      setMessage(successMessage);
    } catch (error) {
      console.warn("Action API not available, updating demo UI only:", error);
      updateStudentLocally(localChanges);
      setMessage(`${successMessage} Demo UI đã cập nhật. Nếu backend chưa đổi, kiểm tra API endpoint.`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!selectedStudent) return;

    postAction(
      "/login",
      {
        userId: selectedStudent.userId,
        userName: selectedStudent.userName,
        email: selectedStudent.email,
        groupCode,
      },
      {
        isOnline: true,
        loginAt: new Date().toISOString(),
      },
      "Đã ghi nhận học viên login."
    );
  };

  const handleLogout = () => {
    if (!selectedStudent) return;

    postAction(
      "/logout",
      {
        userId: selectedStudent.userId,
        email: selectedStudent.email,
        groupCode,
      },
      {
        isOnline: false,
        joinedMeet: false,
      },
      "Đã ghi nhận học viên logout."
    );
  };

  const handleCheckCameraMic = async () => {
    let cameraReady = true;
    let microphoneReady = true;

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      console.warn("Camera/Mic permission failed:", error);
      cameraReady = false;
      microphoneReady = false;
    }

    postAction(
      "/device-check",
      {
        userId: selectedStudent.userId,
        email: selectedStudent.email,
        groupCode,
        cameraReady,
        microphoneReady,
      },
      {
        cameraReady,
        microphoneReady,
      },
      cameraReady && microphoneReady
        ? "Camera và microphone đã sẵn sàng."
        : "Không lấy được quyền camera/microphone."
    );
  };

  const handleCheckScreenShare = async () => {
    let screenReady = true;

    try {
      if (navigator.mediaDevices?.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      console.warn("Screen share permission failed:", error);
      screenReady = false;
    }

    postAction(
      "/screen-check",
      {
        userId: selectedStudent.userId,
        email: selectedStudent.email,
        groupCode,
        screenReady,
      },
      {
        screenReady,
      },
      screenReady ? "Screen share đã sẵn sàng." : "Chưa cấp quyền screen share."
    );
  };

  const handleJoinMeet = () => {
    if (!selectedStudent) return;

    postAction(
      "/join-meet",
      {
        userId: selectedStudent.userId,
        email: selectedStudent.email,
        groupCode,
        meetLink,
        joinedMeet: true,
      },
      {
        joinedMeet: true,
        isOnline: true,
        loginAt: selectedStudent.loginAt || new Date().toISOString(),
      },
      "Đã ghi nhận học viên click Join Meet."
    );
  };

  const handleClearDemoTracking = async () => {
    try {
      setLoading(true);
      setMessage("");

      await fetch(`${BASE_API_URL}/clear-demo-tracking`, {
        method: "POST",
      });
    } catch (error) {
      console.warn("Clear API not available, clearing demo UI only:", error);
    } finally {
      setStudents(
        DEFAULT_STUDENTS.map((s) => ({
          ...s,
          isOnline: false,
          cameraReady: false,
          microphoneReady: false,
          screenReady: false,
          joinedMeet: false,
          loginAt: null,
        }))
      );
      setSelectedUserId(DEFAULT_STUDENTS[0].userId);
      setLastUpdated(new Date());
      setMessage("Đã clear demo tracking.");
      setLoading(false);
    }
  };

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

  const StatusPill = ({ active, activeLabel, inactiveLabel }) => {
    return (
      <span className={`status-pill ${active ? "active" : "inactive"}`}>
        <span className="status-dot" />
        {active ? activeLabel : inactiveLabel}
      </span>
    );
  };

  return (
    <div className="live-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f4f7fb;
        }

        .live-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 32%),
            linear-gradient(180deg, #f7f9fd 0%, #eef3f9 100%);
          padding: 28px;
          color: #111827;
          font-family: Inter, Arial, sans-serif;
        }

        .live-container {
          max-width: 1180px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 22px;
        }

        .title-kicker {
          color: #2563eb;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
        }

        .title {
          margin: 0;
          font-size: 30px;
          line-height: 1.2;
          font-weight: 900;
          color: #0f172a;
        }

        .subtitle {
          margin: 10px 0 0;
          font-size: 15px;
          color: #667085;
          line-height: 1.5;
          max-width: 720px;
        }

        .header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          flex-shrink: 0;
        }

        .refresh-button {
          border: none;
          border-radius: 14px;
          background: #2563eb;
          color: white;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.18);
        }

        .refresh-button:hover {
          background: #1d4ed8;
        }

        .refresh-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .updated {
          font-size: 12px;
          color: #667085;
          white-space: nowrap;
        }

        .message {
          margin-bottom: 18px;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 16px;
          padding: 13px 15px;
          font-size: 14px;
          font-weight: 700;
        }

        .panel {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
          padding: 22px;
          margin-bottom: 20px;
        }

        .class-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }

        .class-name {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          color: #0f172a;
        }

        .live-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: #ecfdf3;
          color: #027a48;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #12b76a;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field label {
          font-size: 13px;
          font-weight: 850;
          color: #344054;
        }

        .field select,
        .field input {
          width: 100%;
          border: 1px solid #d0d5dd;
          border-radius: 14px;
          padding: 12px 13px;
          font-size: 14px;
          outline: none;
          color: #111827;
          background: white;
        }

        .field select:focus,
        .field input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 6px;
        }

        .action-button {
          border: 1px solid #d0d5dd;
          background: white;
          color: #344054;
          padding: 10px 13px;
          border-radius: 13px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .action-button:hover {
          border-color: #2563eb;
          color: #2563eb;
          transform: translateY(-1px);
        }

        .action-button.primary {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .action-button.primary:hover {
          background: #1d4ed8;
          color: white;
        }

        .action-button.danger {
          background: #fff1f2;
          color: #be123c;
          border-color: #fecdd3;
        }

        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 14px;
        }

        .summary-card {
          background: #fbfcff;
          border: 1px solid #edf0f5;
          border-radius: 18px;
          padding: 16px;
          min-height: 105px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .summary-label {
          font-size: 13px;
          color: #667085;
          line-height: 1.35;
          font-weight: 800;
        }

        .summary-value {
          margin-top: 10px;
          font-size: 30px;
          line-height: 1;
          color: #0f172a;
          font-weight: 950;
        }

        .summary-note {
          margin-top: 8px;
          font-size: 12px;
          color: #98a2b3;
          line-height: 1.35;
        }

        .progress-block {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid #edf0f5;
        }

        .progress-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }

        .progress-label {
          font-size: 14px;
          font-weight: 850;
          color: #344054;
        }

        .progress-number {
          color: #2563eb;
          font-size: 14px;
          font-weight: 900;
        }

        .progress-bar {
          height: 12px;
          background: #eef2f7;
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #2563eb;
          border-radius: 999px;
          transition: width 0.2s ease;
        }

        .students-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .students-title {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
        }

        .students-count {
          color: #667085;
          font-size: 14px;
          font-weight: 750;
        }

        .table-wrap {
          overflow-x: auto;
          border: 1px solid #edf0f5;
          border-radius: 18px;
          background: white;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 920px;
        }

        thead {
          background: #f8fafc;
        }

        th {
          text-align: left;
          padding: 14px 16px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #667085;
          font-weight: 900;
          border-bottom: 1px solid #edf0f5;
          white-space: nowrap;
        }

        td {
          padding: 15px 16px;
          border-bottom: 1px solid #edf0f5;
          vertical-align: middle;
          font-size: 14px;
          color: #344054;
        }

        tbody tr:last-child td {
          border-bottom: none;
        }

        tbody tr:hover {
          background: #fbfcff;
        }

        .student-info {
          min-width: 230px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .student-name {
          font-size: 14px;
          font-weight: 900;
          color: #0f172a;
        }

        .student-email {
          font-size: 13px;
          color: #667085;
          word-break: break-word;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
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

        @media (max-width: 1050px) {
          .summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .live-page {
            padding: 18px;
          }

          .header {
            flex-direction: column;
          }

          .header-right {
            align-items: stretch;
            width: 100%;
          }

          .refresh-button {
            width: 100%;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .class-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .title {
            font-size: 25px;
          }
        }

        @media (max-width: 480px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="live-container">
        <div className="header">
          <div>
            <div className="title-kicker">Live Class Monitor</div>
            <h1 className="title">Login / Device / Meet Tracking</h1>
            <p className="subtitle">
              Track who logged in, checked camera / microphone / screen share,
              and clicked Join Meet.
            </p>
          </div>

          <div className="header-right">
            <button
              className="refresh-button"
              onClick={refreshMonitor}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh Monitor"}
            </button>
            <div className="updated">
              Last updated: {lastUpdated ? formatTime(lastUpdated) : "-"}
            </div>
          </div>
        </div>

        {message && <div className="message">{message}</div>}

        <div className="panel">
          <div className="class-row">
            <h2 className="class-name">{groupCode}</h2>
            <div className="live-badge">
              <span className="live-dot" />
              Live monitoring
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Selected student</label>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                {students.map((student) => (
                  <option key={student.userId} value={student.userId}>
                    {student.userName} - {student.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Meet link</label>
              <input
                value={meetLink}
                onChange={(event) => setMeetLink(event.target.value)}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
              />
            </div>
          </div>

          <div className="actions">
            <button className="action-button primary" onClick={handleLogin}>
              Login
            </button>
            <button className="action-button" onClick={handleLogout}>
              Logout
            </button>
            <button className="action-button" onClick={handleCheckCameraMic}>
              Check Camera & Mic
            </button>
            <button className="action-button" onClick={handleCheckScreenShare}>
              Check Screen Share
            </button>
            <button className="action-button primary" onClick={handleJoinMeet}>
              Join Meet
            </button>
            <button className="action-button" onClick={refreshMonitor}>
              Refresh Monitor
            </button>
            <button
              className="action-button danger"
              onClick={handleClearDemoTracking}
            >
              Clear Demo Tracking
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">Total tracked</div>
              <div className="summary-value">{summary.totalStudents}</div>
              <div className="summary-note">All students in class</div>
            </div>

            <div className="summary-card">
              <div className="summary-label">Online</div>
              <div className="summary-value">{summary.online}</div>
              <div className="summary-note">Currently logged in</div>
            </div>

            <div className="summary-card">
              <div className="summary-label">Camera OK</div>
              <div className="summary-value">{summary.cameraReady}</div>
              <div className="summary-note">Camera permission ready</div>
            </div>

            <div className="summary-card">
              <div className="summary-label">Mic OK</div>
              <div className="summary-value">{summary.microphoneReady}</div>
              <div className="summary-note">Microphone ready</div>
            </div>

            <div className="summary-card">
              <div className="summary-label">Screen OK</div>
              <div className="summary-value">{summary.screenReady}</div>
              <div className="summary-note">Screen sharing ready</div>
            </div>

            <div className="summary-card">
              <div className="summary-label">Joined Meet</div>
              <div className="summary-value">{summary.joinedMeet}</div>
              <div className="summary-note">Clicked Join Meet</div>
            </div>
          </div>

          <div className="progress-block">
            <div className="progress-row">
              <div className="progress-label">Online attendance rate</div>
              <div className="progress-number">{onlinePercent}%</div>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${onlinePercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="students-head">
            <h2 className="students-title">Student Status</h2>
            <div className="students-count">{students.length} student(s)</div>
          </div>

          <div className="table-wrap">
            <table>
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
                  <tr key={student.userId}>
                    <td>
                      <div className="student-info">
                        <div className="student-name">{student.userName}</div>
                        <div className="student-email">{student.email}</div>
                      </div>
                    </td>

                    <td>
                      <StatusPill
                        active={student.isOnline}
                        activeLabel="Online"
                        inactiveLabel="Offline"
                      />
                    </td>

                    <td>
                      <StatusPill
                        active={student.cameraReady}
                        activeLabel="Ready"
                        inactiveLabel="Not ready"
                      />
                    </td>

                    <td>
                      <StatusPill
                        active={student.microphoneReady}
                        activeLabel="Ready"
                        inactiveLabel="Not ready"
                      />
                    </td>

                    <td>
                      <StatusPill
                        active={student.screenReady}
                        activeLabel="Ready"
                        inactiveLabel="Not ready"
                      />
                    </td>

                    <td>
                      <StatusPill
                        active={student.joinedMeet}
                        activeLabel="Joined"
                        inactiveLabel="Not joined"
                      />
                    </td>

                    <td>{formatTime(student.loginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}   