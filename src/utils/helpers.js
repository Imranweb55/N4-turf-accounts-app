// ─── Date helpers ────────────────────────────────────────────────────────────

export const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun",
                            "Jul","Aug","Sep","Oct","Nov","Dec"];

/** Returns today as "YYYY-MM-DD" in LOCAL time (avoids UTC midnight bug) */
export function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
}

/** "YYYY-MM-DD" → true if Saturday or Sunday */
export function isWeekend(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.getDay() === 0 || d.getDay() === 6;
}

/** Date object → "Jun 2026" (locale-independent, matches Apps Script tab name) */
export function toMonthKey(dateObj) {
  return MONTH_NAMES[dateObj.getMonth()] + " " + dateObj.getFullYear();
}

/** "Jun 2026" → Date object (1st of that month) */
export function monthKeyToDate(mk) {
  const [mon, year] = mk.split(" ");
  return new Date(parseInt(year), MONTH_NAMES.indexOf(mon), 1);
}

/**
 * Normalise any date format coming from Google Sheets to "YYYY-MM-DD"
 * Sheet stores "dd/MM/yyyy" — JS Date("06/11/2026") wrongly reads as MM/DD
 */
export function sheetDateToISO(val) {
  if (!val) return "";
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;                // already ISO
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split("/");
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  if (val instanceof Date && !isNaN(val)) {
    return `${val.getFullYear()}-${String(val.getMonth()+1).padStart(2,"0")}-${String(val.getDate()).padStart(2,"0")}`;
  }
  return s;
}

/** "YYYY-MM-DD" → "Wed, 11 Jun 2026" */
export function prettyDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Money ───────────────────────────────────────────────────────────────────

/** 1500 → "₹1,500" */
export function fmtMoney(n) {
  return "₹" + Math.round(n || 0).toLocaleString("en-IN");
}

/** Rate based on weekday/weekend setting */
export function rateForDate(dateStr, settings) {
  return isWeekend(dateStr)
    ? parseInt(settings.wePrice) || 1000
    : parseInt(settings.wdPrice) || 800;
}

// ─── Slots ───────────────────────────────────────────────────────────────────

const fmtHM = (h, m) => {
  const p = h < 12 ? "AM" : "PM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2,"0")} ${p}`;
};

/** Returns array of { label, startMinutes } for every slot in the day */
export function generateSlots(slotDur = 60) {
  const dur = parseInt(slotDur) || 60;
  const slots = [];
  for (let m = 0; m < 1440; m += dur) {
    const h1 = Math.floor(m / 60), m1 = m % 60;
    const m2 = m + dur;
    const h2 = Math.floor(m2 / 60) % 24, mm2 = m2 % 60;
    slots.push({ label: `${fmtHM(h1,m1)} – ${fmtHM(h2,mm2)}`, startMinutes: m });
  }
  return slots;
}

/** "12:00 PM – 1:00 PM" → 720 (start in minutes from midnight) */
export function timeToMinutes(timeStr) {
  const part = timeStr.split("–")[0].trim();
  const [timePart, period] = part.split(" ");
  let [h, m] = timePart.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

// ─── Booking helpers ─────────────────────────────────────────────────────────

/** "gpay" | "cash" | "advance" | "mix" | "pending" */
export function payMode(b) {
  const g = parseFloat(b.payGpay) || 0;
  const c = parseFloat(b.payCash) || 0;
  const a = parseFloat(b.payAdvance) || 0;
  const count = (g > 0 ? 1 : 0) + (c > 0 ? 1 : 0) + (a > 0 ? 1 : 0);
  if (count > 1) return "mix";
  if (g > 0) return "gpay";
  if (c > 0) return "cash";
  if (a > 0) return "advance";
  return "pending";
}

/** Google Sheet row object → clean booking object */
export function rowToBooking(row) {
  return {
    id:            row["Booking ID"] || "BK" + Date.now() + Math.random(),
    date:          sheetDateToISO(row["Date"] || ""),
    slotTime:      row["Slot Time"] || "",
    slotTimeEnd:   row["Slot End Time"] || "",
    isBlock:       row["Block Booking"] === "Yes",
    customerName:  row["Customer Name"] || "",
    phone:         row["Phone"] || "",
    sport:         row["Sport"] || "",
    amount:        parseFloat(row["Total Amount (₹)"]) || 0,
    discount:      parseFloat(row["Discount (₹)"]) || 0,
    discountReason:row["Discount Reason"] || "",
    finalAmount:   parseFloat(row["Final Amount (₹)"]) || 0,
    payGpay:       parseFloat(row["GPay (₹)"]) || 0,
    payCash:       parseFloat(row["Cash (₹)"]) || 0,
    payAdvance:    parseFloat(row["Advance (₹)"]) || 0,
    advanceMode:   String(row["Advance Mode"] || "").toLowerCase(),
    notes:         row["Notes"] || "",
    synced:        true,
  };
}
