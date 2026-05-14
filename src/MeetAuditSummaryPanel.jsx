import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createCalendarEvent,
  exportMeetAuditSummaryCsv,
  exportMeetAuditSummaryXlsx,
  getMeetAuditSummary,
} from "./api";

const CLASS_CONFIG = {
  BFTZRNGDZP: {
    className: "Demo Test Class - Google Meet",
    expectedStudents: [
      { name: "Kevin", email: "kevin.nguyen@algo.edu.vn" },
      { name: "Tim", email: "tim.tran@algo.edu.vn" },
      { name: "Jay", email: "jay.pham@algo.edu.vn" },
    ],
  },
};

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isMaskedEmail(email) {
  const value = String(email || "").trim();
  return !value || value.includes("*");
}

function getSafeDisplayEmail(person) {
  const rawEmail = person?.studentEmail || person?.email || "";

  if (!isMaskedEmail(rawEmail)) {
    return rawEmail;
  }

  return "Unknown external participant";
}

function getStudentKey(item) {
  const safeEmail = getSafeDisplayEmail(item);

  return (
    normalizeEmail(safeEmail) ||
    String(item.studentName || "").trim().toLowerCase() ||
    `${item.meetingCode}-${item.joinedAt}`
  );
}

function toLocalIsoWithOffset(datetimeLocalValue) {
  const date = new Date(datetimeLocalValue);

  const pad = (number) => String(number).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absOffsetMinutes / 60));
  const offsetMins = pad(absOffsetMinutes % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMins}`;
}

function mergeStudentRecords(records) {
  const map = new Map();

  records.forEach((item) => {
    const key = getStudentKey(item);
    const safeEmail = getSafeDisplayEmail(item);

    if (!map.has(key)) {
      map.set(key, {
        ...item,
        studentKey: key,
        studentEmail: safeEmail,
        firstJoin: item.joinedAt || "-",
        lastLeave: item.leftAt || "-",
        totalDurationMinutes: Number(item.durationMinutes || 0),
        micUsed: Boolean(item.micUsed),
        cameraUsed: Boolean(item.cameraUsed),
        screenShared: Boolean(item.screenShared),
        recordCount: 1,
        devices: new Set([item.deviceType || "-"]),
      });

      return;
    }

    const existing = map.get(key);

    if (item.joinedAt) {
      if (existing.firstJoin === "-" || item.joinedAt < existing.firstJoin) {
        existing.firstJoin = item.joinedAt;
      }
    }

    if (item.leftAt) {
      if (existing.lastLeave === "-" || item.leftAt > existing.lastLeave) {
        existing.lastLeave = item.leftAt;
      }
    }

    existing.totalDurationMinutes += Number(item.durationMinutes || 0);
    existing.micUsed = existing.micUsed || Boolean(item.micUsed);
    existing.cameraUsed = existing.cameraUsed || Boolean(item.cameraUsed);
    existing.screenShared = existing.screenShared || Boolean(item.screenShared);
    existing.recordCount += 1;

    if (item.deviceType) {
      existing.devices.add(item.deviceType);
    }
  });

  return Array.from(map.values()).map((item) => ({
    ...item,
    deviceType: Array.from(item.devices).join(", "),
  }));
}

export default function MeetAuditSummaryPanel() {
  const [logs, setLogs] = useState([]);
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [auditMeetingCode, setAuditMeetingCode] = useState("");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
  const [auditAttendeeEmail, setAuditAttendeeEmail] = useState("");

  const [createForm, setCreateForm] = useState({
    summary: "Calendar Web Create Test",
    start: "",
    end: "",
    attendees:
      "ame.nguyen@algo.edu.vn\njay.pham@algo.edu.vn\nphamhoang1061@gmail.com\nhoangnekk104@gmail.com",
  });

  const [creatingEvent, setCreatingEvent] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdEvent, setCreatedEvent] = useState(null);

  const detailRef = useRef(null);

  const buildAuditFilters = useCallback(
    () => ({
      meetingCode: auditMeetingCode.trim().toUpperCase(),
      dateFrom: auditDateFrom,
      dateTo: auditDateTo,
      attendeeEmail: auditAttendeeEmail.trim(),
    }),
    [auditMeetingCode, auditDateFrom, auditDateTo, auditAttendeeEmail]
  );

  const loadLogs = useCallback(
    async (silent = false, overrideFilters = null) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        setError("");

        const filters = overrideFilters || buildAuditFilters();
        const result = await getMeetAuditSummary(filters);

        setLogs(Array.isArray(result.data) ? result.data : []);
        setSelectedClassKey((currentKey) => {
          if (!currentKey) return currentKey;

          const stillExists = (result.data || []).some((item) => {
            const key = item.conferenceId || item.meetingCode || "UNKNOWN";
            return key === currentKey;
          });

          return stillExists ? currentKey : "";
        });
      } catch (err) {
        console.error(err);

        if (!silent) {
          setError("Cannot load Google Meet audit summary.");
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [buildAuditFilters]
  );

  useEffect(() => {
    loadLogs(false);

    const intervalId = setInterval(() => {
      loadLogs(true);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [loadLogs]);

  const handleSearchAuditLogs = () => {
    loadLogs(false);
  };

  const handleClearAuditFilters = () => {
    const emptyFilters = {
      meetingCode: "",
      dateFrom: "",
      dateTo: "",
      attendeeEmail: "",
    };

    setAuditMeetingCode("");
    setAuditDateFrom("");
    setAuditDateTo("");
    setAuditAttendeeEmail("");
    setSearchText("");
    setSelectedClassKey("");

    loadLogs(false, emptyFilters);
  };

  const handleExportCsv = () => {
    exportMeetAuditSummaryCsv(buildAuditFilters());
  };

  const handleExportXlsx = () => {
    exportMeetAuditSummaryXlsx(buildAuditFilters());
  };

  const classGroups = useMemo(() => {
    const map = new Map();

    logs.forEach((item) => {
      const meetingCode = item.meetingCode || "UNKNOWN";
      const conferenceId = item.conferenceId || "";
      const key = conferenceId || meetingCode;

      if (!map.has(key)) {
        const config = CLASS_CONFIG[meetingCode] || {};

        map.set(key, {
          key,
          meetingCode,
          conferenceId,
          className:
            config.className ||
            item.calendarSummary ||
            `Google Meet Class - ${meetingCode}`,
          expectedStudents: config.expectedStudents || [],
          organizerEmail: item.organizerEmail || "-",
          rawRecords: [],
        });
      }

      map.get(key).rawRecords.push(item);
    });

    return Array.from(map.values())
      .map((group) => {
        const joinedPeople = mergeStudentRecords(group.rawRecords);

        const calendarRosterEmails = Array.from(
          new Set(
            (group.rawRecords || [])
              .flatMap((record) => record.calendarRosterEmails || [])
              .filter(Boolean)
              .map((email) => normalizeEmail(email))
          )
        );

        const calendarExpectedStudents = calendarRosterEmails.map((email) => ({
          name: email,
          email,
        }));

        const sourceExpectedStudents =
          calendarExpectedStudents.length > 0
            ? calendarExpectedStudents
            : group.expectedStudents;

        const expectedStudents = sourceExpectedStudents.map((student) => ({
          ...student,
          studentKey: normalizeEmail(student.email),
        }));

        const hasRoster = expectedStudents.length > 0;

        const joinedEmailSet = new Set(
          joinedPeople.map((item) => normalizeEmail(getSafeDisplayEmail(item)))
        );

        const expectedEmailSet = new Set(
          expectedStudents.map((student) => student.studentKey)
        );

        const joinedExpectedStudents = hasRoster
          ? expectedStudents
              .map((student) => {
                const joinedRecord = joinedPeople.find(
                  (person) =>
                    normalizeEmail(getSafeDisplayEmail(person)) ===
                    student.studentKey
                );

                if (!joinedRecord) return null;

                return {
                  ...joinedRecord,
                  name: joinedRecord.studentName || student.name || student.email,
                  email: student.email,
                  studentEmail: student.email,
                };
              })
              .filter(Boolean)
          : joinedPeople;

        const absentStudents = hasRoster
          ? expectedStudents.filter(
              (student) => !joinedEmailSet.has(student.studentKey)
            )
          : [];

        const extraParticipants = hasRoster
          ? joinedPeople.filter(
              (item) =>
                !expectedEmailSet.has(normalizeEmail(getSafeDisplayEmail(item)))
            )
          : [];

        const startTime =
          joinedPeople.length > 0
            ? joinedPeople.reduce((min, item) => {
                if (!item.firstJoin || item.firstJoin === "-") return min;
                return item.firstJoin < min ? item.firstJoin : min;
              }, joinedPeople[0].firstJoin || "-")
            : "-";

        const endTime =
          joinedPeople.length > 0
            ? joinedPeople.reduce((max, item) => {
                if (!item.lastLeave || item.lastLeave === "-") return max;
                return item.lastLeave > max ? item.lastLeave : max;
              }, joinedPeople[0].lastLeave || "-")
            : "-";

        return {
          ...group,
          hasRoster,
          joinedPeople,
          joinedExpectedStudents,
          absentStudents,
          extraParticipants,
          startTime,
          endTime,

          expectedCount: hasRoster ? expectedStudents.length : joinedPeople.length,
          joinedCount: hasRoster
            ? joinedExpectedStudents.length
            : joinedPeople.length,
          absentCount: absentStudents.length,
          extraCount: extraParticipants.length,

          totalRecords: group.rawRecords.length,
          micUsed: joinedPeople.filter((item) => item.micUsed).length,
          cameraUsed: joinedPeople.filter((item) => item.cameraUsed).length,
          screenShared: joinedPeople.filter((item) => item.screenShared).length,
        };
      })
      .sort((a, b) => {
        if (a.startTime < b.startTime) return 1;
        if (a.startTime > b.startTime) return -1;
        return 0;
      });
  }, [logs]);

  const selectedClass = useMemo(() => {
    if (!selectedClassKey) return null;

    return classGroups.find((group) => group.key === selectedClassKey) || null;
  }, [classGroups, selectedClassKey]);

  const selectedTimeline = useMemo(() => {
    if (!selectedClass) return [];

    return selectedClass.joinedPeople
      .map((student) => {
        const issues = [];

        if (!student.micUsed) issues.push("Mic not used");
        if (!student.cameraUsed) issues.push("Camera not used");
        if (!student.screenShared) issues.push("No screen share");

        return {
          name: student.studentName || "-",
          email: getSafeDisplayEmail(student),
          firstJoin: student.firstJoin || "-",
          lastLeave: student.lastLeave || "-",
          duration: Math.round(student.totalDurationMinutes * 10) / 10,
          micUsed: student.micUsed,
          cameraUsed: student.cameraUsed,
          screenShared: student.screenShared,
          issues,
        };
      })
      .sort((a, b) => {
        if (a.firstJoin < b.firstJoin) return -1;
        if (a.firstJoin > b.firstJoin) return 1;
        return 0;
      });
  }, [selectedClass]);

  const selectedRawActivityLogs = useMemo(() => {
    if (!selectedClass) return [];

    return [...(selectedClass.rawRecords || [])]
      .sort((a, b) => {
        const aTime = a.joinedAt || "";
        const bTime = b.joinedAt || "";

        if (aTime < bTime) return -1;
        if (aTime > bTime) return 1;
        return 0;
      })
      .map((item, index) => {
        const safeEmail = getSafeDisplayEmail(item);

        return {
          id: `${safeEmail || item.studentName || "unknown"}-${
            item.joinedAt || index
          }-${index}`,
          studentName: item.studentName || "-",
          studentEmail: safeEmail,
          joinedAt: item.joinedAt || "-",
          leftAt: item.leftAt || "-",
          durationMinutes: Number(item.durationMinutes || 0),
          micUsed: Boolean(item.micUsed),
          cameraUsed: Boolean(item.cameraUsed),
          screenShared: Boolean(item.screenShared),
          audioSendSeconds: Number(item.audioSendSeconds || 0),
          videoSendSeconds: Number(item.videoSendSeconds || 0),
          screenSendSeconds: Number(item.screenSendSeconds || 0),
          deviceType: item.deviceType || "-",
          ipAddress: item.ipAddress || "-",
          networkRttMs: item.networkRttMs ?? "-",
        };
      });
  }, [selectedClass]);

  const filteredActivityLogs = useMemo(() => {
    if (!selectedClass) return [];

    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return selectedRawActivityLogs;

    return selectedRawActivityLogs.filter((item) => {
      return (
        item.studentName.toLowerCase().includes(keyword) ||
        item.studentEmail.toLowerCase().includes(keyword)
      );
    });
  }, [selectedClass, selectedRawActivityLogs, searchText]);

  const allStats = useMemo(() => {
    return {
      totalClasses: classGroups.length,
      expectedStudents: classGroups.reduce(
        (sum, group) => sum + group.expectedCount,
        0
      ),
      joinedStudents: classGroups.reduce(
        (sum, group) => sum + group.joinedCount,
        0
      ),
      absentStudents: classGroups.reduce(
        (sum, group) => sum + group.absentCount,
        0
      ),
    };
  }, [classGroups]);

  const renderStatus = (value) => {
    return (
      <span className={value ? "audit-pill ok" : "audit-pill no"}>
        {value ? "Yes" : "No"}
      </span>
    );
  };

  const handleCreateCalendarEvent = async (event) => {
    event.preventDefault();

    try {
      setCreatingEvent(true);
      setCreateError("");
      setCreatedEvent(null);

      const attendees = createForm.attendees
        .split(/[\n,;]/)
        .map((email) => email.trim())
        .filter(Boolean);

      if (!createForm.summary.trim()) {
        setCreateError("Please enter class/event name.");
        return;
      }

      if (!createForm.start || !createForm.end) {
        setCreateError("Please select start and end time.");
        return;
      }

      if (attendees.length === 0) {
        setCreateError("Please enter at least one attendee email.");
        return;
      }

      const result = await createCalendarEvent({
        summary: createForm.summary.trim(),
        description: "Created from web for Calendar + Meet audit test",
        start: toLocalIsoWithOffset(createForm.start),
        end: toLocalIsoWithOffset(createForm.end),
        timeZone: "Asia/Ho_Chi_Minh",
        attendees,
      });

      setCreatedEvent(result);

      if (result?.meetingCode) {
        setAuditMeetingCode(result.meetingCode);
      }
    } catch (err) {
      console.error(err);
      setCreateError("Cannot create Calendar event.");
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleSelectClass = (groupKey) => {
    setSelectedClassKey(groupKey);

    setTimeout(() => {
      detailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  return (
    <div className="audit-panel">
      <div className="audit-header">
        <div>
          <div className="kicker">Google Admin Meet Logs</div>
          <h3>Live Class Audit Summary</h3>
          <p>
            Grouped by class/session. Data is refreshed automatically every 30
            seconds.
          </p>
        </div>
      </div>

      <div className="class-detail-panel">
        <div className="selected-class-header">
          <div>
            <div className="kicker">Search Toolbar</div>
            <h4>Search / Filter Report</h4>
            <p>
              Filter by event date, meeting code, or attendee email, then export
              the current result to CSV or XLSX.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={handleSearchAuditLogs}
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={handleClearAuditFilters}
              disabled={loading}
            >
              Clear
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={handleExportCsv}
            >
              Export CSV
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={handleExportXlsx}
            >
              Export XLSX
            </button>
          </div>
        </div>

        <div className="class-action-summary compact">
          <div className="action-summary-card">
            <span>Meeting Code</span>
            <input
              className="audit-input"
              value={auditMeetingCode}
              onChange={(event) =>
                setAuditMeetingCode(
                  event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                )
              }
              placeholder="Example: XJWGYMVFGW"
            />
          </div>

          <div className="action-summary-card">
            <span>Event Date From</span>
            <input
              className="audit-input"
              type="date"
              value={auditDateFrom}
              onChange={(event) => setAuditDateFrom(event.target.value)}
            />
          </div>

          <div className="action-summary-card">
            <span>Event Date To</span>
            <input
              className="audit-input"
              type="date"
              value={auditDateTo}
              onChange={(event) => setAuditDateTo(event.target.value)}
            />
          </div>

          <div className="action-summary-card">
            <span>Attendee Email</span>
            <input
              className="audit-input"
              value={auditAttendeeEmail}
              onChange={(event) => setAuditAttendeeEmail(event.target.value)}
              placeholder="Search attendee email"
            />
          </div>
        </div>
      </div>

      <form className="class-detail-panel" onSubmit={handleCreateCalendarEvent}>
        <div className="selected-class-header">
          <div>
            <div className="kicker">Google Calendar</div>
            <h4>Create Calendar Event + Meet Link</h4>
            <p>Create a test class session directly from the web.</p>
          </div>

          <button type="submit" className="secondary-button" disabled={creatingEvent}>
            {creatingEvent ? "Creating..." : "Create Event"}
          </button>
        </div>

        <div className="class-action-summary compact">
          <div className="action-summary-card">
            <span>Class/Event Name</span>
            <input
              className="audit-input"
              value={createForm.summary}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  summary: event.target.value,
                }))
              }
              placeholder="Calendar Web Create Test"
            />
          </div>

          <div className="action-summary-card">
            <span>Start Time</span>
            <input
              className="audit-input"
              type="datetime-local"
              value={createForm.start}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  start: event.target.value,
                }))
              }
            />
          </div>

          <div className="action-summary-card">
            <span>End Time</span>
            <input
              className="audit-input"
              type="datetime-local"
              value={createForm.end}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  end: event.target.value,
                }))
              }
            />
          </div>

          <div className="action-summary-card">
            <span>Attendee Emails</span>
            <textarea
              className="audit-input"
              rows={5}
              value={createForm.attendees}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  attendees: event.target.value,
                }))
              }
              placeholder="One email per line"
            />
          </div>
        </div>

        {createError && <div className="error-state">{createError}</div>}

        {createdEvent?.success && (
          <div className="success-state">
            <strong>Calendar event created successfully.</strong>

            <div>Meeting Code: {createdEvent.meetingCode}</div>

            <div>
              Meet Link:{" "}
              <a href={createdEvent.meetLink} target="_blank" rel="noreferrer">
                {createdEvent.meetLink}
              </a>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "12px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigator.clipboard.writeText(createdEvent.meetingCode || "")
                }
              >
                Copy Meeting Code
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigator.clipboard.writeText(createdEvent.meetLink || "")
                }
              >
                Copy Meet Link
              </button>

              <a
                className="secondary-button"
                href={createdEvent.meetLink}
                target="_blank"
                rel="noreferrer"
              >
                Open Meet
              </a>

              {createdEvent.htmlLink && (
                <a
                  className="secondary-button"
                  href={createdEvent.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Calendar Event
                </a>
              )}
            </div>
          </div>
        )}
      </form>

      <div className="audit-stats-grid">
        <div className="audit-stat-card">
          <span>Total Meet Sessions</span>
          <strong>{allStats.totalClasses}</strong>
        </div>

        <div className="audit-stat-card">
          <span>Expected Students</span>
          <strong>{allStats.expectedStudents}</strong>
        </div>

        <div className="audit-stat-card">
          <span>Joined Students</span>
          <strong>{allStats.joinedStudents}</strong>
        </div>

        <div className="audit-stat-card">
          <span>Absent Students</span>
          <strong>{allStats.absentStudents}</strong>
        </div>
      </div>

      {loading && <div className="loading-state">Loading Meet logs...</div>}

      {error && <div className="error-state">{error}</div>}

      {!loading && !error && classGroups.length === 0 && (
        <div className="empty-state">No Meet audit logs found.</div>
      )}

      {!loading && !error && classGroups.length > 0 && (
        <>
          <div className="audit-section-title">Classes / Meet Sessions</div>

          <div className="class-card-grid">
            {classGroups.map((group) => {
              const active = selectedClass && selectedClass.key === group.key;

              const joinedList = group.hasRoster
                ? group.joinedExpectedStudents
                : group.joinedPeople;

              const absentList = group.absentStudents || [];
              const extraList = group.extraParticipants || [];

              return (
                <button
                  key={group.key}
                  type="button"
                  className={active ? "class-card active" : "class-card"}
                  onClick={() => handleSelectClass(group.key)}
                >
                  <div className="class-card-top">
                    <div>
                      <div className="class-name">{group.className}</div>
                      <div className="class-code">{group.meetingCode}</div>
                    </div>

                    <span className="class-count">
                      {group.joinedCount}/{group.expectedCount} joined
                    </span>
                  </div>

                  <div className="class-meta">
                    <div>
                      <span>Organizer</span>
                      <strong>{group.organizerEmail}</strong>
                    </div>

                    <div>
                      <span>Time</span>
                      <strong>
                        {group.startTime} → {group.endTime}
                      </strong>
                    </div>
                  </div>

                  <div className="class-mini-stats">
                    <span>Expected: {group.expectedCount}</span>
                    <span>Joined: {group.joinedCount}</span>
                    <span>Absent: {group.absentCount}</span>
                    <span>Extra: {group.extraCount}</span>
                    <span>Mic: {group.micUsed}</span>
                    <span>Cam: {group.cameraUsed}</span>
                    <span>Screen: {group.screenShared}</span>
                  </div>

                  <div className="class-attendance-preview">
                    <div className="attendance-column joined">
                      <div className="attendance-title">Joined</div>

                      {joinedList.length === 0 ? (
                        <div className="attendance-empty">No joined students</div>
                      ) : (
                        joinedList.map((student) => (
                          <div
                            key={
                              student.email ||
                              student.studentEmail ||
                              student.studentName
                            }
                            className="attendance-person"
                          >
                            <div>
                              {student.name ||
                                student.studentName ||
                                student.studentEmail ||
                                "-"}
                            </div>
                            <div>{student.email || student.studentEmail}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="attendance-column absent">
                      <div className="attendance-title">Absent</div>

                      {absentList.length === 0 ? (
                        <div className="attendance-empty">No absent students</div>
                      ) : (
                        absentList.map((student) => (
                          <div key={student.email} className="attendance-person">
                            <div>{student.name || student.email}</div>
                            <div>{student.email}</div>
                          </div>
                        ))
                      )}
                    </div>

                    {extraList.length > 0 && (
                      <div className="attendance-column extra">
                        <div className="attendance-title">Extra</div>

                        {extraList.map((person) => (
                          <div
                            key={`${getSafeDisplayEmail(person)}-${person.firstJoin}`}
                            className="attendance-person"
                          >
                            <div>{person.studentName || "-"}</div>
                            <div>{getSafeDisplayEmail(person)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!group.hasRoster && (
                    <div className="roster-warning">
                      Roster not set. Absence cannot be calculated.
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedClass && (
            <div ref={detailRef} className="class-detail-panel">
              <div className="selected-class-header">
                <div>
                  <div className="kicker">Selected Class</div>
                  <h4>{selectedClass.className}</h4>
                  <p>
                    Meeting Code: <strong>{selectedClass.meetingCode}</strong> ·{" "}
                    Organizer: <strong>{selectedClass.organizerEmail}</strong>
                  </p>
                </div>

                <input
                  className="audit-input selected-search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search student name or email..."
                />
              </div>

              <div className="class-action-summary compact">
                <div className="action-summary-card">
                  <span>Attendance</span>
                  <strong>
                    {selectedClass.joinedCount}/{selectedClass.expectedCount} joined
                  </strong>
                  <p>
                    {selectedClass.absentCount === 0
                      ? "All expected students joined."
                      : `${selectedClass.absentCount} student(s) absent.`}
                  </p>
                </div>

                <div className="action-summary-card">
                  <span>Mic / Camera</span>
                  <strong>
                    Mic {selectedClass.micUsed} · Cam {selectedClass.cameraUsed}
                  </strong>
                  <p>Participants who used mic or camera.</p>
                </div>

                <div className="action-summary-card">
                  <span>Screen Share</span>
                  <strong>{selectedClass.screenShared}</strong>
                  <p>Participants who shared screen.</p>
                </div>

                <div className="action-summary-card">
                  <span>Extra Participants</span>
                  <strong>{selectedClass.extraCount}</strong>
                  <p>Joined but not in roster.</p>
                </div>
              </div>

              <div className="audit-section-title">Class Timeline</div>

              <div className="class-timeline">
                {selectedTimeline.map((item, index) => (
                  <div key={`${item.email}-${index}`} className="timeline-item">
                    <div className="timeline-dot" />

                    <div className="timeline-content">
                      <div className="timeline-top">
                        <div>
                          <strong>{item.name}</strong>
                          <span>{item.email}</span>
                        </div>

                        <div className="timeline-time">
                          {item.firstJoin} → {item.lastLeave}
                        </div>
                      </div>

                      <div className="timeline-meta">
                        <span>Duration: {item.duration} min</span>
                        <span>Mic: {item.micUsed ? "Yes" : "No"}</span>
                        <span>Camera: {item.cameraUsed ? "Yes" : "No"}</span>
                        <span>Screen: {item.screenShared ? "Yes" : "No"}</span>
                      </div>

                      {item.issues.length > 0 && (
                        <div className="timeline-warning">
                          {item.issues.join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="audit-section-title">Activity Logs</div>

              <div className="audit-table-wrap">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Email</th>
                      <th className="datetime-col">Joined At</th>
                      <th className="datetime-col">Left At</th>
                      <th>Duration</th>
                      <th>Mic</th>
                      <th>Camera</th>
                      <th>Screen</th>
                      <th>Audio Sent</th>
                      <th>Video Sent</th>
                      <th>Screen Sent</th>
                      <th>Device</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredActivityLogs.map((item) => (
                      <tr key={item.id}>
                        <td>{item.studentName}</td>
                        <td>{item.studentEmail}</td>
                        <td className="datetime-col">{item.joinedAt}</td>
                        <td className="datetime-col">{item.leftAt}</td>
                        <td>{Math.round(item.durationMinutes * 10) / 10} min</td>
                        <td>{renderStatus(item.micUsed)}</td>
                        <td>{renderStatus(item.cameraUsed)}</td>
                        <td>{renderStatus(item.screenShared)}</td>
                        <td>{item.audioSendSeconds}s</td>
                        <td>{item.videoSendSeconds}s</td>
                        <td>{item.screenSendSeconds}s</td>
                        <td>{item.deviceType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedClass.absentStudents.length > 0 && (
                <>
                  <div className="audit-section-title">Absent</div>

                  <div className="absent-list">
                    {selectedClass.absentStudents.map((student) => (
                      <div key={student.email} className="absent-item">
                        <div>
                          <strong>{student.name}</strong>
                          <span>{student.email}</span>
                        </div>

                        <span className="audit-pill no">Absent</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {selectedClass.extraParticipants.length > 0 && (
                <>
                  <div className="audit-section-title">Extra Participants</div>

                  <div className="absent-list">
                    {selectedClass.extraParticipants.map((person) => (
                      <div
                        key={`${getSafeDisplayEmail(person)}-${person.firstJoin}`}
                        className="absent-item extra"
                      >
                        <div>
                          <strong>{person.studentName || "-"}</strong>
                          <span>{getSafeDisplayEmail(person)}</span>
                        </div>

                        <span className="audit-pill ok">Extra</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}