import { StatCard } from "./ui";
import { fmtMoney } from "../utils/helpers";

/**
 * DaySummary — 6-stat grid including Advance box
 * Props: bookings[]
 */
export function DaySummary({ bookings }) {
  let rev = 0,
    gpay = 0,
    cash = 0,
    adv = 0,
    due = 0;
  bookings.forEach((b) => {
    const fin = parseFloat(b.finalAmount) || parseFloat(b.amount) || 0;
    const g = parseFloat(b.payGpay) || 0;
    const c = parseFloat(b.payCash) || 0;
    const a = parseFloat(b.payAdvance) || 0;
    rev += fin;
    gpay += g;
    cash += c;
    adv += a;
    due += Math.max(0, fin - g - c - a);
  });

  const pendingCount = bookings.filter((b) => {
    const fin = parseFloat(b.finalAmount) || parseFloat(b.amount) || 0;
    return (
      Math.max(
        0,
        fin - (b.payGpay || 0) - (b.payCash || 0) - (b.payAdvance || 0),
      ) > 0
    );
  }).length;

  return (
    <div style={{ padding: "0 14px", marginBottom: 4 }}>
      {/* Revenue full width */}
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
            Today's Revenue
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>
            {fmtMoney(rev)}
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
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>
            {bookings.length}
          </div>
        </div>
      </div>

      {/* 3-col payment grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <StatCard label="📱 GPay" value={fmtMoney(gpay)} color="blue" />
        <StatCard label="💵 Cash" value={fmtMoney(cash)} color="amber" />
        <StatCard label="🗓 Advance" value={fmtMoney(adv)} color="purple" />
      </div>

      {/* Balance due — only shows when there's pending money */}
      {due > 0 && (
        <div
          style={{
            background: "#fff3f3",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#c0392b" }}>
            ⚠️ Balance Due
          </div>
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#c0392b",
                textAlign: "right",
              }}
            >
              {fmtMoney(due)}
            </div>
            <div style={{ fontSize: 10, color: "#e57373", textAlign: "right" }}>
              {pendingCount} booking{pendingCount !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * WeekSummary — Mon–Sun totals (used in Dashboard)
 */
export function WeekSummary({ allBookings }) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  let wGpay = 0,
    wCash = 0,
    wAdv = 0;
  allBookings.forEach((b) => {
    if (!b.date) return;
    const d = new Date(b.date + "T00:00:00");
    if (d >= monday && d <= sunday) {
      wGpay += parseFloat(b.payGpay) || 0;
      wCash += parseFloat(b.payCash) || 0;
      wAdv += parseFloat(b.payAdvance) || 0;
    }
  });

  const monStr = monday.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  const sunStr = sunday.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <div
      style={{
        margin: "4px 14px 8px",
        background: "#fff",
        borderRadius: 13,
        padding: "13px 14px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#888",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          📅 This Week
        </div>
        <div style={{ fontSize: 10, color: "#bbb" }}>
          {monStr} – {sunStr}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "📱 GPay", val: wGpay, bg: "#e3f2fd", color: "#1565c0" },
          { label: "💵 Cash", val: wCash, bg: "#fffde7", color: "#b45309" },
          { label: "🗓 Advance", val: wAdv, bg: "#ede7f6", color: "#5b21b6" },
        ].map(({ label, val, bg, color }) => (
          <div
            key={label}
            style={{
              flex: 1,
              background: bg,
              borderRadius: 10,
              padding: 10,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color, marginTop: 3 }}>
              {fmtMoney(val)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
