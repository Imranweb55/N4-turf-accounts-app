import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useDayBookings } from "../hooks";
import { sheetFetch } from "../utils/sheetsApi";
import { todayStr } from "../utils/helpers";
import { BookingCard } from "../components/BookingCard";
import { BookingDrawer } from "../components/BookingDrawer";
import { DaySummary, WeekSummary } from "../components/Summaries";
import { Spinner, EmptyState } from "../components/ui";

export function DashboardPage() {
  const { settings, cache, setCache, showToast } = useApp();
  const [date, setDate] = useState(todayStr);
  const [drawer, setDrawer] = useState(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugData, setDebugData] = useState(null);
  const [debugging, setDebugging] = useState(false);

  const { bookings, setBookings, loading, refresh } = useDayBookings({
    date,
    scriptUrl: settings.scriptUrl,
    cache,
    setCache,
    onToast: showToast,
  });

  const allCached = Object.values(cache).flat();

  async function runDebug() {
    if (!settings.scriptUrl) {
      setDebugData({ error: "No Apps Script URL set in Settings" });
      setDebugOpen(true);
      return;
    }
    setDebugging(true);
    setDebugOpen(true);
    setDebugData(null);
    try {
      const raw = await sheetFetch(settings.scriptUrl, {
        action: "getBookings",
        date,
      });
      setDebugData(raw);
    } catch (e) {
      setDebugData({ error: e.message });
    }
    setDebugging(false);
  }

  async function handleDelete(b) {
    if (!window.confirm(`Cancel booking for ${b.customerName}?`)) return;
    try {
      await sheetFetch(settings.scriptUrl, {
        action: "deleteBooking",
        bookingId: b.id,
      });
    } catch {}
    setBookings((prev) => prev.filter((x) => x.id !== b.id));
    setCache((prev) => ({
      ...prev,
      [date]: (prev[date] || []).filter((x) => x.id !== b.id),
    }));
    setDrawer(null);
    showToast("🗑 Booking cancelled");
  }

  async function handleCollect(b, { gpay, cash }) {
    const newGpay = (parseFloat(b.payGpay) || 0) + gpay;
    const newCash = (parseFloat(b.payCash) || 0) + cash;
    const updated = { ...b, payGpay: newGpay, payCash: newCash };
    try {
      await sheetFetch(settings.scriptUrl, {
        action: "updateBooking",
        bookingId: b.id,
        payGpay: newGpay,
        payCash: newCash,
      });
    } catch {}
    const upd = (list) => list.map((x) => (x.id === b.id ? updated : x));
    setBookings(upd);
    setCache((prev) => ({ ...prev, [date]: upd(prev[date] || []) }));
    setDrawer(updated);
    showToast("✅ Payment updated");
  }

  // ── render diagRows from Apps Script diagnostic response ────────────────
  function renderDiagRows(diagRows) {
    if (!diagRows || diagRows.length === 0) return null;
    return (
      <div style={{ marginTop: 10 }}>
        <div
          style={{
            fontSize: 11,
            color: "#f39c12",
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          📋 First {diagRows.length} rows in sheet (date column):
        </div>
        {diagRows.map((r, i) => (
          <div
            key={i}
            style={{
              background: "#2d2d2d",
              borderRadius: 8,
              padding: "8px 10px",
              marginBottom: 6,
              fontSize: 10,
            }}
          >
            <div style={{ color: "#74b9ff" }}>
              Row {r.row} — type:{" "}
              <span style={{ color: "#fd79a8" }}>{r.rawType}</span> value:{" "}
              <span style={{ color: "#55efc4" }}>"{r.rawValue}"</span>
            </div>
            <div style={{ color: "#dfe6e9", marginTop: 3 }}>
              Parsed → day:
              <span style={{ color: "#ffeaa7" }}>{r.parsedDay}</span> month:
              <span style={{ color: "#ffeaa7" }}>{r.parsedMonth}</span> year:
              <span style={{ color: "#ffeaa7" }}>{r.parsedYear}</span>
            </div>
            <div style={{ color: "#dfe6e9", marginTop: 3 }}>
              Filter → day:
              <span style={{ color: "#a29bfe" }}>{r.filterDay}</span> month:
              <span style={{ color: "#a29bfe" }}>{r.filterMonth}</span> year:
              <span style={{ color: "#a29bfe" }}>{r.filterYear}</span>
            </div>
            <div
              style={{
                marginTop: 4,
                fontWeight: 700,
                color: r.wouldMatch ? "#2ecc71" : "#e74c3c",
              }}
            >
              {r.wouldMatch
                ? "✅ WOULD MATCH"
                : "❌ NO MATCH — this is why bookings return empty"}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          background: "#1a472a",
          padding: "16px 14px 14px",
          color: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                opacity: 0.7,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {settings.turfName}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Dashboard</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={runDebug}
              style={{
                background: "rgba(255,165,0,0.3)",
                border: "none",
                color: "#fff",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              🔍 Debug
            </button>
            <button
              onClick={refresh}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                color: "#fff",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            marginTop: 10,
            width: "100%",
            border: "none",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 14,
            color: "#1a1a1a",
            background: "rgba(255,255,255,0.92)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div
        style={{
          background: "#e8f5e9",
          padding: "6px 14px",
          fontSize: 11,
          color: "#1a6b38",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#2ecc71",
            animation: "pulse 2s infinite",
          }}
        />
        Live · auto-refreshes every 30 s
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>

      {debugOpen && (
        <div
          style={{
            margin: "10px 14px",
            background: "#1a1a1a",
            borderRadius: 12,
            padding: 14,
            fontFamily: "monospace",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f39c12" }}>
              🔍 Debug — Raw API Response
            </div>
            <button
              onClick={() => setDebugOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#aaa",
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {debugging && (
            <div style={{ color: "#aaa", fontSize: 12 }}>
              Fetching from sheet…
            </div>
          )}

          {debugData &&
            !debugging &&
            (() => {
              const bookingsArr = debugData.bookings || [];
              return (
                <>
                  <div style={{ fontSize: 11, marginBottom: 4 }}>
                    <span
                      style={{
                        color:
                          debugData.status === "ok" ? "#2ecc71" : "#e74c3c",
                        fontWeight: 700,
                      }}
                    >
                      status: "{debugData.status}"
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>
                    bookings returned:{" "}
                    <span
                      style={{
                        color: bookingsArr.length > 0 ? "#2ecc71" : "#e74c3c",
                        fontWeight: 700,
                      }}
                    >
                      {bookingsArr.length}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>
                    tab name:{" "}
                    <span style={{ color: "#f39c12" }}>
                      "{debugData.monthKey}"
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>
                    date sent:{" "}
                    <span style={{ color: "#74b9ff" }}>"{date}"</span>
                  </div>
                  {debugData.debug && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#e74c3c",
                        marginBottom: 4,
                      }}
                    >
                      server debug: {debugData.debug}
                    </div>
                  )}

                  {/* diagRows — shows exactly what Apps Script sees in the Date column */}
                  {debugData.diagRows
                    ? renderDiagRows(debugData.diagRows)
                    : bookingsArr.length === 0 && (
                        <div
                          style={{
                            background: "#2d2d2d",
                            borderRadius: 8,
                            padding: "10px 12px",
                            marginTop: 8,
                            fontSize: 10,
                            color: "#e74c3c",
                          }}
                        >
                          ⚠️ No diagRows in response — make sure you redeployed
                          with the latest Apps Script code (New version →
                          Deploy)
                        </div>
                      )}

                  {/* First booking row if found */}
                  {bookingsArr.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#2ecc71",
                          fontWeight: 700,
                          marginBottom: 4,
                        }}
                      >
                        ✅ First booking row keys:
                      </div>
                      {Object.entries(bookingsArr[0]).map(([k, v]) => (
                        <div
                          key={k}
                          style={{
                            fontSize: 10,
                            color: "#dfe6e9",
                            marginBottom: 2,
                          }}
                        >
                          <span style={{ color: "#fd79a8" }}>"{k}"</span>:{" "}
                          <span style={{ color: "#55efc4" }}>
                            "{String(v)}"
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div style={{ height: 10 }} />
          <DaySummary bookings={bookings} />
          <WeekSummary allBookings={allCached} />
          <div
            style={{
              padding: "4px 14px 8px",
              fontSize: 12,
              fontWeight: 700,
              color: "#aaa",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {bookings.length} Booking{bookings.length !== 1 ? "s" : ""}
          </div>
          {bookings.length === 0 ? (
            <EmptyState
              icon="🏟"
              title="No bookings today"
              subtitle="Tap 🔍 Debug to diagnose"
            />
          ) : (
            bookings
              .slice()
              .sort((a, b) => a.slotTime.localeCompare(b.slotTime))
              .map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onClick={() => setDrawer(b)}
                />
              ))
          )}
          <div style={{ height: 88 }} />
        </>
      )}

      {drawer && (
        <BookingDrawer
          booking={drawer}
          onClose={() => setDrawer(null)}
          onDelete={handleDelete}
          onCollect={handleCollect}
        />
      )}
    </div>
  );
}
