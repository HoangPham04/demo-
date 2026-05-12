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