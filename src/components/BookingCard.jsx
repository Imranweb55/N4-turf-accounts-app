import { Badge } from "./ui";
import { fmtMoney, payMode } from "../utils/helpers";

/**
 * BookingCard — single row in the day's timeline
 * Props:
 *   booking  — booking object
 *   onClick  — open detail drawer
 */
export function BookingCard({ booking: b, onClick }) {
  const mode = payMode(b);
  const finalAmt  = b.finalAmount || b.amount || 0;
  const totalPaid = (b.payGpay || 0) + (b.payCash || 0) + (b.payAdvance || 0);
  const pending   = Math.max(0, finalAmt - totalPaid);

  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "13px 14px",
        margin: "0 14px 10px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        cursor: "pointer",
        borderLeft: pending > 0 ? "3px solid #e74c3c" : "3px solid #1a472a",
      }}
    >
      {/* Top row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:"#1a1a1a" }}>{b.customerName}</div>
          <div style={{ fontSize:11, color:"#aaa", marginTop:1 }}>
            {b.slotTime}{b.isBlock ? ` – ${b.slotTimeEnd}` : ""}
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:16, fontWeight:800, color: pending > 0 ? "#c0392b" : "#1a6b38" }}>
            {fmtMoney(finalAmt)}
          </div>
          {pending > 0 && (
            <div style={{ fontSize:10, color:"#e74c3c", fontWeight:700, marginTop:1 }}>
              Due {fmtMoney(pending)}
            </div>
          )}
        </div>
      </div>

      {/* Badges row */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        <Badge type={mode}>{mode === "gpay" ? "📱 GPay" : mode === "cash" ? "💵 Cash" : mode === "advance" ? "🗓 Advance" : mode === "mix" ? "Mix" : "Pending"}</Badge>
        {b.sport && <Badge type="free">{b.sport}</Badge>}
        {b.isBlock && <Badge type="block">Block</Badge>}
        {b.discount > 0 && <Badge type="disc">Disc {fmtMoney(b.discount)}</Badge>}
      </div>
    </div>
  );
}
