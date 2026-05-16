const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5014"
).replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;

    try {
      const errorData = await response.json();

      errorMessage =
        errorData?.message ||
        errorData?.error ||
        errorData?.details ||
        errorMessage;

      console.error("API error details:", errorData);
    } catch {
      const errorText = await response.text();
      if (errorText) {
        errorMessage = errorText;
      }
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export function getCourses() {
  return request("/api/courses");
}

export function getLogs() {
  return request("/api/logs");
}

export function syncClassroom() {
  return request("/api/sync", {
    method: "POST",
  });
}

export function submitQuizAttempt(payload) {
  return request("/api/quiz-attempt", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getQuizAttempts() {
  return request("/api/quiz-attempts");
}

export function getGoogleMappedCourses() {
  return request("/api/google/classroom/mapped-courses");
}

/* =========================
   LIVE CLASS TRACKING
   ========================= */

export function liveClassLogin(payload) {
  return request("/api/live-class/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function liveClassLogout(payload) {
  return request("/api/live-class/logout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function liveClassDeviceCheck(payload) {
  return request("/api/live-class/device-check", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function liveClassScreenCheck(payload) {
  return request("/api/live-class/screen-check", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function liveClassJoinMeet(payload) {
  return request("/api/live-class/join-meet", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getLiveClassMonitor() {
  return request("/api/live-class/monitor");
}

export function clearLiveClassTracking() {
  return request("/api/live-class/clear", {
    method: "POST",
  });
}

/* =========================
   GOOGLE MEET ADMIN LOGS
   ========================= */

export function getMeetAuditSummary(meetingCode = "") {
  const query = meetingCode
    ? `?meetingCode=${encodeURIComponent(meetingCode)}`
    : "";

  return request(`/api/google/meet-audit-summary${query}`);
}

/* =========================
   GOOGLE CALENDAR
   ========================= */

export function createCalendarEvent(payload) {
  return request("/api/google/calendar/events/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCalendarEvents(meetingCode = "") {
  const query = meetingCode
    ? `?meetingCode=${encodeURIComponent(meetingCode)}`
    : "";

  return request(`/api/google/calendar/events${query}`);
}

/* =========================
   RECORDING DB SESSION
   ========================= */
export function checkMeetAutoStop({
  meetingCode = "",
  teacherEmail = "",
  recordingStartedAtUtc = "",
  quietMinutes = 2,
}) {
  const params = new URLSearchParams();

  if (meetingCode) {
    params.set("meetingCode", meetingCode);
  }

  if (teacherEmail) {
    params.set("teacherEmail", teacherEmail);
  }

  if (recordingStartedAtUtc) {
    params.set("recordingStartedAtUtc", recordingStartedAtUtc);
  }

  params.set("quietMinutes", String(quietMinutes || 2));

  return request(`/api/google/meet-auto-stop-check?${params.toString()}`);
}
export function startRecordingSession(payload) {
  return request("/api/recordings/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getRecordingSessions() {
  return request("/api/recordings/sessions");
}

export function runRecordingCron() {
  return request("/api/recordings/cron/run", {
    method: "POST",
  });
}

export function getRecordingCronReports() {
  return request("/api/recordings/cron/reports");
}

/* =========================
   GOOGLE DRIVE RECORDING UPLOAD
   ========================= */

export async function uploadRecordingToDrive({
  blob,
  fileName,
  recordingSessionId = "",
  meetingCode = "",
  teacherEmail = "",
  className = "",
  durationSeconds = 0,
  fileSizeBytes = 0,
}) {
  const formData = new FormData();

  formData.append("file", blob, fileName || "meet-recording.webm");
  formData.append("fileName", fileName || "meet-recording.webm");
  formData.append("recordingSessionId", recordingSessionId || "");
  formData.append("meetingCode", meetingCode || "");
  formData.append("teacherEmail", teacherEmail || "");
  formData.append("className", className || "");
  formData.append("durationSeconds", String(durationSeconds || 0));
  formData.append("fileSizeBytes", String(fileSizeBytes || 0));

  const response = await fetch(
    `${API_BASE_URL}/api/google/drive/upload-recording`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    let errorMessage = `Upload failed: ${response.status}`;

    try {
      const errorData = await response.json();
      errorMessage =
        errorData?.message ||
        errorData?.error ||
        errorData?.details ||
        errorMessage;

      console.error("Upload error details:", errorData);
    } catch {
      const text = await response.text();
      if (text) {
        errorMessage = text;
      }
    }

    throw new Error(errorMessage);
  }

  return response.json();
}
/* =========================
   GOOGLE MEET AUDIT EXPORT
   ========================= */

function buildMeetAuditSummaryQuery(filters = {}) {
  const params = new URLSearchParams();

  const meetingCode =
    typeof filters === "string" ? filters : filters.meetingCode || "";

  const eventDateFrom = filters.eventDateFrom || filters.dateFrom || "";
  const eventDateTo = filters.eventDateTo || filters.dateTo || "";
  const attendeeEmail = filters.attendeeEmail || "";

  if (meetingCode) {
    params.set("meetingCode", meetingCode);
  }

  if (eventDateFrom) {
    params.set("eventDateFrom", eventDateFrom);
  }

  if (eventDateTo) {
    params.set("eventDateTo", eventDateTo);
  }

  if (attendeeEmail) {
    params.set("attendeeEmail", attendeeEmail);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function getFileNameFromContentDisposition(contentDisposition, fallbackFileName) {
  if (!contentDisposition) {
    return fallbackFileName;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ""));
  }

  const normalMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (normalMatch?.[1]) {
    return normalMatch[1];
  }

  return fallbackFileName;
}

async function downloadMeetAuditExport(path, fallbackFileName) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    let errorMessage = `Export failed: ${response.status}`;

    try {
      const errorData = await response.json();
      errorMessage =
        errorData?.message ||
        errorData?.error ||
        errorData?.details ||
        errorMessage;

      console.error("Export error details:", errorData);
    } catch {
      const text = await response.text();
      if (text) {
        errorMessage = text;
      }
    }

    throw new Error(errorMessage);
  }

  const blob = await response.blob();

  const fileName = getFileNameFromContentDisposition(
    response.headers.get("content-disposition"),
    fallbackFileName
  );

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);

  return {
    success: true,
    fileName,
  };
}

export function exportMeetAuditSummaryCsv(filters = {}) {
  const query = buildMeetAuditSummaryQuery(filters);

  return downloadMeetAuditExport(
    `/api/google/meet-audit-summary/export/csv${query}`,
    "meet-audit-summary.csv"
  );
}

export function exportMeetAuditSummaryXlsx(filters = {}) {
  const query = buildMeetAuditSummaryQuery(filters);

  return downloadMeetAuditExport(
    `/api/google/meet-audit-summary/export/xlsx${query}`,
    "meet-audit-summary.xlsx"
  );
}