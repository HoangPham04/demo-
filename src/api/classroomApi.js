const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5014";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
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
export const DEFAULT_GOOGLE_MEET_LINK = "https://meet.google.com/jti-mggj-zro";

export function openGoogleMeet(meetLink = DEFAULT_GOOGLE_MEET_LINK) {
  window.open(meetLink, "_blank", "noopener,noreferrer");
}