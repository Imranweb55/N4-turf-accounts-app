import { useState } from "react";
import { fmtMoney, prettyDate } from "../utils/helpers";
import { inputCss } from "./ui";

/**
 * BookingDrawer — bottom sheet showing booking details.
 * Supports "Collect More Payment" sub-mode.
 *
 * Props:
 *   booking   — booking object (required)
 *   onClose   — close the drawer
 *   onDelete  — cancel/delete the booking
 *   onCollect — called with (booking, { gpay, cash }) to add payment
 */
export function BookingDrawer({ booking: b, onClose, onDelete, onCollect }) {
  const [collectMode, setCollectMode] = useState(false);
  const [moreGpay,    setMoreGpay]    = useState(0);
  const [moreCash,    setMoreCash]    = useState(0);

  const finalAmt  = parseFloat(b.finalAmount) || parseFloat(b.amount) || 0;
  const g = parseFloat(b.payGpay) || 0;
  const c = parseFloat(b.payCash) || 0;
  const a = parseFloat(b.payAdvance) || 0;
  const paid    = g + c + a;
  const pending = Math.max(0, finalAmt - paid);

  function handleSubmitMore() {
    onCollect(b, { gpay: moreGpay, cash: moreCash });
    setCollectMode(false);
    setMoreGpay(0);
    setMoreCash(0);
  }

  const DetailRow = ({ label, value, color }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
      <div style={{ fontSize:12, color:"#888", fontWeight:500 }}>{label}</div>
      <div style={{
        fontSize:13, fontWeight:700,
        color: color==="green"?"#1a6b38": color==="red"?"#c0392b": color==="blue"?"#1565c0":"#1a1a1a",
        textAlign:"right",
      }}>{value}</div>
    </div>
  );

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
    >
      <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, maxHeight:"94vh", overflowY:"auto" }}>
        {/* Handle */}
        <div style={{ width:36, height:4, background:"#ddd", borderRadius:2, margin:"10px auto 0" }} />

        {/* Header */}
        <div style={{ padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #f0f0f0", position:"sticky", top:0, background:"#fff" }}>
          <h3 style={{ fontSize:16, fontWeight:700, margin:0 }}>
            {collectMode ? "Collect Payment" : b.slotTime}
          </h3>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%", background:"#f5f5f5", border:"none", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#888" }}>✕</button>
        </div>

        <div style={{ padding:"14px 18px" }}>
          {collectMode ? (
            <>
              <div style={{ background:"#fff3cd", borderRadius:10, padding:"10px 12px", marginBottom:14, fontSize:13, color:"#856404" }}>
                Pending: <strong>{fmtMoney(pending)}</strong> from {b.customerName}
              </div>
              {[
                { label:"📱 GPay", val:moreGpay, set:setMoreGpay },
                { label:"💵 Cash", val:moreCash, set:setMoreCash },
              ].map(({ label, val, set }) => (
                <div key={label} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <div style={{ fontSize:12, color:"#777", fontWeight:600, minWidth:60 }}>{label}</div>
                  <input type="number" value={val || ""} onChange={(e) => set(parseFloat(e.target.value)||0)}
                    placeholder="0" style={{ ...inputCss, flex:1 }} />
                </div>
              ))}
              <button onClick={handleSubmitMore} style={{ width:"100%", padding:14, background:"#1a472a", color:"#fff", border:"none", borderRadius:12, fontSize:16, fontWeight:700, cursor:"pointer" }}>
                ✅ Add Payment
              </button>
              <button onClick={() => setCollectMode(false)} style={{ width:"100%", padding:11, marginTop:8, background:"transparent", color:"#888", border:"none", fontSize:13, cursor:"pointer" }}>
                ← Back
              </button>
            </>
          ) : (
            <>
              {/* Customer info */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                <div style={{ width:46, height:46, borderRadius:12, background:"#e8f5e9", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>👤</div>
                <div>
                  <div style={{ fontSize:17, fontWeight:800 }}>{b.customerName}</div>
                  <div style={{ fontSize:12, color:"#999" }}>{b.phone || "No phone"} · {b.sport}</div>
                </div>
              </div>

              {/* Payment pills */}
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                {[
                  { label:"GPay",    val:g, bg:"#e3f2fd", color:"#1565c0" },
                  { label:"Cash",    val:c, bg:"#fffde7", color:"#b45309" },
                  { label:"Advance", val:a, bg:"#ede7f6", color:"#5b21b6" },
                ].map(({ label, val, bg, color }) => (
                  <div key={label} style={{ flex:1, borderRadius:10, padding:8, textAlign:"center", background:bg }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color }}>{label}</div>
                    <div style={{ fontSize:15, fontWeight:800, marginTop:2, color }}>{fmtMoney(val)}</div>
                  </div>
                ))}
              </div>

              {/* Detail rows */}
              <div style={{ background:"#f8f8f8", borderRadius:12, padding:14, marginBottom:14 }}>
                <DetailRow label="Date"            value={prettyDate(b.date)} />
                <DetailRow label="Slot"            value={b.slotTime} />
                <DetailRow label="Original Amount" value={fmtMoney(b.amount)} />
                {b.discount > 0 && <DetailRow label="Discount" value={`−${fmtMoney(b.discount)}`} color="red" />}
                <DetailRow label="Final Amount"    value={fmtMoney(finalAmt)} color="green" />
                <DetailRow label="Total Paid"      value={fmtMoney(paid)}     color="blue" />
                {pending > 0 && <DetailRow label="Balance Due" value={fmtMoney(pending)} color="red" />}
                {b.notes && <DetailRow label="Notes" value={b.notes} />}
              </div>

              <button onClick={() => setCollectMode(true)} style={{ width:"100%", padding:14, background:"#1a472a", color:"#fff", border:"none", borderRadius:12, fontSize:16, fontWeight:700, cursor:"pointer", marginBottom:8 }}>
                💰 Collect More Payment
              </button>
              <button onClick={() => onDelete(b)} style={{ width:"100%", padding:12, background:"#fff", color:"#c0392b", border:"1.5px solid #eee", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer" }}>
                🗑 Cancel Booking
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
