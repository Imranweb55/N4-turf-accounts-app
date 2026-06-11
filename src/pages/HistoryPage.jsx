import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useWeekBookings } from "../hooks";
import { fmtMoney, todayStr } from "../utils/helpers";
import { BookingCard } from "../components/BookingCard";
import { BookingDrawer } from "../components/BookingDrawer";
import { Spinner, EmptyState } from "../components/ui";
import { sheetFetch } from "../utils/sheetsApi";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** "YYYY-MM-DD" → "Mon, 9 Jun" */
function prettyShort(d) {
  const dt = new Date(d + "T00:00:00");
  return (
    DAY_NAMES[dt.getDay()] +
    ", " +
    dt.getDate() +
    " " +
    [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][dt.getMonth()]
  );
}

/** Move anchorDate by ±7 days */
function shiftWeek(isoDate, dir) {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + dir * 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Summary totals for a list of bookings */
function totals(list) {
  return list.reduce(
    (acc, b) => {
      acc.rev += parseFloat(b.finalAmount) || parseFloat(b.amount) || 0;
      acc.gpay += parseFloat(b.payGpay) || 0;
      acc.cash += parseFloat(b.payCash) || 0;
      acc.adv += parseFloat(b.payAdvance) || 0;
      acc.due += Math.max(
        0,
        (parseFloat(b.finalAmount) || parseFloat(b.amount) || 0) -
          (parseFloat(b.payGpay) || 0) -
          (parseFloat(b.payCash) || 0) -
          (parseFloat(b.payAdvance) || 0),
      );
      return acc;
    },
    { rev: 0, gpay: 0, cash: 0, adv: 0, due: 0 },
  );
}

// ─── PDF Generator (pure JS, no external library) ───────────────────────────
function downloadWeekPDF(weekDates, dayMap, turfName) {
  // Build HTML table, then use print API with a hidden iframe
  const rows = weekDates.map((d) => {
    const list = dayMap[d] || [];
    const t = totals(list);
    const dt = new Date(d + "T00:00:00");
    const dayLabel =
      DAY_FULL[dt.getDay()] +
      ", " +
      dt.getDate() +
      " " +
      [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ][dt.getMonth()];
    return { dayLabel, list, t };
  });

  const grandTotal = totals(weekDates.flatMap((d) => dayMap[d] || []));

  const bookingRows = weekDates
    .flatMap((d) =>
      (dayMap[d] || []).map((b) => {
        const dt = new Date(d + "T00:00:00");
        return `<tr>
        <td>${dt.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dt.getMonth()]}</td>
        <td>${b.slotTime || ""}</td>
        <td>${b.customerName || ""}</td>
        <td>${b.sport || ""}</td>
        <td style="text-align:right">₹${Math.round(b.finalAmount || b.amount || 0).toLocaleString("en-IN")}</td>
        <td style="text-align:right;color:#1565c0">₹${Math.round(b.payGpay || 0).toLocaleString("en-IN")}</td>
        <td style="text-align:right;color:#b45309">₹${Math.round(b.payCash || 0).toLocaleString("en-IN")}</td>
        <td style="text-align:right;color:#5b21b6">₹${Math.round(b.payAdvance || 0).toLocaleString("en-IN")}</td>
        <td style="text-align:right;color:${parseFloat(b.finalAmount || b.amount || 0) - (b.payGpay || 0) - (b.payCash || 0) - (b.payAdvance || 0) > 0 ? "#c0392b" : "#aaa"}">
          ₹${Math.round(Math.max(0, parseFloat(b.finalAmount || b.amount || 0) - (b.payGpay || 0) - (b.payCash || 0) - (b.payAdvance || 0))).toLocaleString("en-IN")}
        </td>
      </tr>`;
      }),
    )
    .join("");

  const daySummaryRows = rows
    .map(
      ({ dayLabel, list, t }) => `
    <tr style="background:#f8f8f8">
      <td colspan="4" style="font-weight:700">${dayLabel} <span style="font-weight:400;color:#888">(${list.length} booking${list.length !== 1 ? "s" : ""})</span></td>
      <td style="text-align:right;font-weight:700">₹${Math.round(t.rev).toLocaleString("en-IN")}</td>
      <td style="text-align:right;font-weight:700;color:#1565c0">₹${Math.round(t.gpay).toLocaleString("en-IN")}</td>
      <td style="text-align:right;font-weight:700;color:#b45309">₹${Math.round(t.cash).toLocaleString("en-IN")}</td>
      <td style="text-align:right;font-weight:700;color:#5b21b6">₹${Math.round(t.adv).toLocaleString("en-IN")}</td>
      <td style="text-align:right;font-weight:700;color:#c0392b">₹${Math.round(t.due).toLocaleString("en-IN")}</td>
    </tr>`,
    )
    .join("");

  const weekLabel =
    prettyShort(weekDates[0]) + " – " + prettyShort(weekDates[6]);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${turfName} — Weekly Report</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #222; padding: 20px; }
  h1   { color: #1a472a; font-size: 20px; margin-bottom: 4px; }
  h2   { color: #555; font-size: 13px; font-weight: normal; margin-bottom: 20px; }
  table{ border-collapse: collapse; width: 100%; margin-bottom: 24px; }
  th   { background: #1a472a; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; }
  td   { padding: 7px 10px; border-bottom: 1px solid #eee; }
  .summary-box { display: inline-block; background: #f0f7f2; border: 1px solid #c8e6c9; border-radius: 8px; padding: 12px 18px; margin-right: 10px; margin-bottom: 10px; min-width: 120px; }
  .summary-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-value { font-size: 20px; font-weight: bold; color: #1a472a; }
  tfoot td { background: #1a472a; color: #fff; font-weight: bold; padding: 9px 10px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>🏟 ${turfName}</h1>
<h2>Weekly Report — ${weekLabel}</h2>

<!-- Grand total summary boxes -->
<div style="margin-bottom:20px">
  <div class="summary-box">
    <div class="summary-label">Total Revenue</div>
    <div class="summary-value">₹${Math.round(grandTotal.rev).toLocaleString("en-IN")}</div>
  </div>
  <div class="summary-box" style="border-color:#bbdefb;background:#e3f2fd">
    <div class="summary-label">📱 GPay</div>
    <div class="summary-value" style="color:#1565c0">₹${Math.round(grandTotal.gpay).toLocaleString("en-IN")}</div>
  </div>
  <div class="summary-box" style="border-color:#fff176;background:#fffde7">
    <div class="summary-label">💵 Cash</div>
    <div class="summary-value" style="color:#b45309">₹${Math.round(grandTotal.cash).toLocaleString("en-IN")}</div>
  </div>
  <div class="summary-box" style="border-color:#ce93d8;background:#ede7f6">
    <div class="summary-label">🗓 Advance</div>
    <div class="summary-value" style="color:#5b21b6">₹${Math.round(grandTotal.adv).toLocaleString("en-IN")}</div>
  </div>
  ${
    grandTotal.due > 0
      ? `<div class="summary-box" style="border-color:#ef9a9a;background:#fff3f3">
    <div class="summary-label">⚠️ Balance Due</div>
    <div class="summary-value" style="color:#c0392b">₹${Math.round(grandTotal.due).toLocaleString("en-IN")}</div>
  </div>`
      : ""
  }
</div>

<!-- Day-by-day summary table -->
<h3 style="color:#1a472a;margin-bottom:8px">Day-wise Summary</h3>
<table>
  <thead>
    <tr>
      <th colspan="4">Day</th>
      <th>Revenue</th><th>GPay</th><th>Cash</th><th>Advance</th><th>Due</th>
    </tr>
  </thead>
  <tbody>${daySummaryRows}</tbody>
  <tfoot>
    <tr>
      <td colspan="4">WEEK TOTAL</td>
      <td style="text-align:right">₹${Math.round(grandTotal.rev).toLocaleString("en-IN")}</td>
      <td style="text-align:right">₹${Math.round(grandTotal.gpay).toLocaleString("en-IN")}</td>
      <td style="text-align:right">₹${Math.round(grandTotal.cash).toLocaleString("en-IN")}</td>
      <td style="text-align:right">₹${Math.round(grandTotal.adv).toLocaleString("en-IN")}</td>
      <td style="text-align:right">₹${Math.round(grandTotal.due).toLocaleString("en-IN")}</td>
    </tr>
  </tfoot>
</table>

<!-- All bookings detail table -->
<h3 style="color:#1a472a;margin-bottom:8px">All Bookings</h3>
<table>
  <thead>
    <tr><th>Date</th><th>Slot</th><th>Customer</th><th>Sport</th><th>Amount</th><th>GPay</th><th>Cash</th><th>Advance</th><th>Due</th></tr>
  </thead>
  <tbody>${bookingRows || '<tr><td colspan="9" style="text-align:center;color:#aaa;padding:20px">No bookings this week</td></tr>'}</tbody>
</table>

<div style="margin-top:30px;font-size:10px;color:#aaa">Generated by ${turfName} Turf Manager on ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:none";
  document.body.appendChild(iframe);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, 400);
}

// ─── HistoryPage ─────────────────────────────────────────────────────────────

export function HistoryPage() {
  const { settings, cache, setCache, showToast } = useApp();
  const [anchor, setAnchor] = useState(todayStr());
  const [drawer, setDrawer] = useState(null);
  const [expand, setExpand] = useState(null); // expanded day ISO string

  const { dayMap, weekDates, loading, refresh } = useWeekBookings({
    anchorDate: anchor,
    scriptUrl: settings.scriptUrl,
    cache,
    setCache,
    onToast: showToast,
  });

  const allThisWeek = weekDates.flatMap((d) => dayMap[d] || []);
  const gt = totals(allThisWeek);

  const weekLabel = weekDates.length
    ? prettyShort(weekDates[0]) + " – " + prettyShort(weekDates[6])
    : "";

  async function handleDelete(b) {
    if (!window.confirm(`Cancel booking for ${b.customerName}?`)) return;
    try {
      await sheetFetch(settings.scriptUrl, {
        action: "deleteBooking",
        bookingId: b.id,
      });
    } catch {}
    setCache((prev) => ({
      ...prev,
      [b.date]: (prev[b.date] || []).filter((x) => x.id !== b.id),
    }));
    setDrawer(null);
    showToast("🗑 Booking cancelled");
  }

  async function handleCollect(b, { gpay: moreG, cash: moreC }) {
    const newG = (parseFloat(b.payGpay) || 0) + moreG;
    const newC = (parseFloat(b.payCash) || 0) + moreC;
    const updated = { ...b, payGpay: newG, payCash: newC };
    try {
      await sheetFetch(settings.scriptUrl, {
        action: "updateBooking",
        bookingId: b.id,
        payGpay: newG,
        payCash: newC,
      });
    } catch {}
    setCache((prev) => ({
      ...prev,
      [b.date]: (prev[b.date] || []).map((x) => (x.id === b.id ? updated : x)),
    }));
    setDrawer(updated);
    showToast("✅ Payment updated");
  }

  return (
    <div>
      {/* Header */}
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
            <div style={{ fontSize: 20, fontWeight: 800 }}>Weekly History</div>
          </div>
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
            ↻
          </button>
        </div>

        {/* Week navigator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
          }}
        >
          <button
            onClick={() => setAnchor((a) => shiftWeek(a, -1))}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#fff",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            ‹
          </button>
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {weekLabel}
          </div>
          <button
            onClick={() => setAnchor((a) => shiftWeek(a, +1))}
            disabled={anchor >= todayStr()}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: anchor >= todayStr() ? "rgba(255,255,255,0.3)" : "#fff",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 16,
              cursor: anchor >= todayStr() ? "default" : "pointer",
            }}
          >
            ›
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* Weekly totals */}
          <div style={{ padding: "12px 14px 4px" }}>
            {/* Big revenue banner */}
            <div
              style={{
                background: "#1a472a",
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.6)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 4,
                  }}
                >
                  Week Revenue
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>
                  {fmtMoney(gt.rev)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.6)",
                    marginBottom: 4,
                  }}
                >
                  Bookings
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>
                  {allThisWeek.length}
                </div>
              </div>
            </div>

            {/* GPay / Cash / Advance */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
                marginBottom: 8,
              }}
            >
              {[
                {
                  label: "📱 GPay",
                  val: gt.gpay,
                  bg: "#e3f2fd",
                  color: "#1565c0",
                },
                {
                  label: "💵 Cash",
                  val: gt.cash,
                  bg: "#fffde7",
                  color: "#b45309",
                },
                {
                  label: "🗓 Advance",
                  val: gt.adv,
                  bg: "#ede7f6",
                  color: "#5b21b6",
                },
              ].map(({ label, val, bg, color }) => (
                <div
                  key={label}
                  style={{
                    background: bg,
                    borderRadius: 12,
                    padding: "10px 10px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color }}>
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color,
                      marginTop: 3,
                    }}
                  >
                    {fmtMoney(val)}
                  </div>
                </div>
              ))}
            </div>

            {gt.due > 0 && (
              <div
                style={{
                  background: "#fff3f3",
                  borderRadius: 12,
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{ fontSize: 12, fontWeight: 700, color: "#c0392b" }}
                >
                  ⚠️ Balance Due
                </div>
                <div
                  style={{ fontSize: 18, fontWeight: 800, color: "#c0392b" }}
                >
                  {fmtMoney(gt.due)}
                </div>
              </div>
            )}

            {/* PDF Download */}
            <button
              onClick={() =>
                downloadWeekPDF(weekDates, dayMap, settings.turfName || "Turf")
              }
              style={{
                width: "100%",
                padding: 12,
                background: "#fff",
                color: "#1a472a",
                border: "1.5px solid #c8e6c9",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              📄 Download Weekly PDF Report
            </button>
          </div>

          {/* Day-by-day breakdown */}
          <div
            style={{
              padding: "8px 14px 4px",
              fontSize: 12,
              fontWeight: 700,
              color: "#aaa",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            Day Breakdown
          </div>

          {weekDates.map((d) => {
            const list = dayMap[d] || [];
            const t = totals(list);
            const isToday = d === todayStr();
            const isExpanded = expand === d;
            const dt = new Date(d + "T00:00:00");
            const isPast = d < todayStr();

            return (
              <div key={d} style={{ margin: "0 14px 8px" }}>
                {/* Day header row */}
                <div
                  onClick={() => setExpand(isExpanded ? null : d)}
                  style={{
                    background: "#fff",
                    borderRadius: isExpanded ? "12px 12px 0 0" : 12,
                    padding: "12px 14px",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderLeft: `3px solid ${isToday ? "#1a472a" : list.length > 0 ? "#81c784" : "#e0e0e0"}`,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#1a1a1a",
                        }}
                      >
                        {DAY_NAMES[dt.getDay()]}
                        {isToday && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 9,
                              background: "#1a472a",
                              color: "#fff",
                              borderRadius: 4,
                              padding: "1px 5px",
                              fontWeight: 700,
                            }}
                          >
                            TODAY
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>
                        {dt.getDate()}{" "}
                        {
                          [
                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dec",
                          ][dt.getMonth()]
                        }
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: "#1a472a",
                        }}
                      >
                        {fmtMoney(t.rev)}
                      </div>
                      <div style={{ fontSize: 10, color: "#aaa" }}>
                        {list.length} booking{list.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, color: "#ccc" }}>
                      {isExpanded ? "▲" : "▼"}
                    </div>
                  </div>
                </div>

                {/* Expanded: payment breakdown + bookings */}
                {isExpanded && (
                  <div
                    style={{
                      background: "#fafafa",
                      border: "1px solid #f0f0f0",
                      borderTop: "none",
                      borderRadius: "0 0 12px 12px",
                      padding: "10px 14px",
                    }}
                  >
                    {list.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          color: "#ccc",
                          padding: "16px 0",
                          fontSize: 13,
                        }}
                      >
                        No bookings
                      </div>
                    ) : (
                      <>
                        {/* Mini payment row */}
                        <div
                          style={{ display: "flex", gap: 6, marginBottom: 10 }}
                        >
                          {[
                            {
                              label: "GPay",
                              val: t.gpay,
                              bg: "#e3f2fd",
                              color: "#1565c0",
                            },
                            {
                              label: "Cash",
                              val: t.cash,
                              bg: "#fffde7",
                              color: "#b45309",
                            },
                            {
                              label: "Advance",
                              val: t.adv,
                              bg: "#ede7f6",
                              color: "#5b21b6",
                            },
                          ].map(({ label, val, bg, color }) => (
                            <div
                              key={label}
                              style={{
                                flex: 1,
                                background: bg,
                                borderRadius: 8,
                                padding: "6px 8px",
                                textAlign: "center",
                              }}
                            >
                              <div
                                style={{ fontSize: 9, fontWeight: 700, color }}
                              >
                                {label}
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color,
                                  marginTop: 1,
                                }}
                              >
                                {fmtMoney(val)}
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Individual bookings */}
                        {list.map((b) => (
                          <BookingCard
                            key={b.id}
                            booking={b}
                            onClick={() => setDrawer(b)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {allThisWeek.length === 0 && !loading && (
            <EmptyState
              icon="📊"
              title="No bookings this week"
              subtitle="Navigate to a past week or add new bookings"
            />
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
