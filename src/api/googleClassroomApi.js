const BACKEND_URL = "http://localhost:5014";

export async function createMeetAnnouncement({
  courseId,
  title,
  text,
}) {
  const response = await fetch(
    `${BACKEND_URL}/api/google/classroom/create-meet-announcement`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        courseId,
        title,
        text,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to create Meet announcement");
  }

  return data;
}