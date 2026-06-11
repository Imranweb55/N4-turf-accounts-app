import { useState, useEffect, useMemo } from "react";
import { FieldGroup, inputCss } from "./ui";
import { todayStr, rateForDate, generateSlots, timeToMinutes, fmtMoney } from "../utils/helpers";
import { SPORTS } from "../utils/constants";

/**
 * AddBookingForm
 *
 * Props:
 *   settings   — app settings (rates, slotDur)
 *   onSave(booking) — called with complete booking object
 *   onCancel   — go back without saving
 */
export function AddBookingForm({ settings, onSave, onCancel }) {
  const slots = useMemo(() => generateSlots(settings.slotDur), [settings.slotDur]);

  const [date,       setDate]       = useState(todayStr);
  const [slot,       setSlot]       = useState(slots[0]?.label || "");
  const [slotEnd,    setSlotEnd]    = useState(slots[1]?.label || slots[0]?.label || "");
  const [name,       setName]       = useState("");
  const [phone,      setPhone]      = useState("");
  const [sport,      setSport]      = useState(SPORTS[0]);
  const [amount,     setAmount]     = useState(0);
  const [discount,   setDiscount]   = useState(0);
  const [discReason, setDiscReason] = useState("");
  const [gpay,       setGpay]       = useState(0);
  const [cash,       setCash]       = useState(0);
  const [advance,    setAdvance]    = useState(0);
  const [advMode,    setAdvMode]    = useState("");
  const [notes,      setNotes]      = useState("");

  // Auto-calculate amount when slot / date changes
  const autoAmount = useMemo(() => {
    if (!slot || !slotEnd) return 0;
    const rate = rateForDate(date, settings);
    const startMins = timeToMinutes(slot);
    let endMins = timeToMinutes(slotEnd) + (parseInt(settings.slotDur) || 60);
    let dur = endMins - startMins;
    if (dur <= 0) dur += 1440;
    return Math.round((dur / 60) * rate);
  }, [slot, slotEnd, date, settings]);

  useEffect(() => { if (autoAmount > 0) setAmount(autoAmount); }, [autoAmount]);

  const isBlock    = slot !== slotEnd;
  const finalAmount = Math.max(0, (parseFloat(amount)||0) - (parseFloat(discount)||0));
  const totalPaid   = (parseFloat(gpay)||0) + (parseFloat(cash)||0) + (parseFloat(advance)||0);
  const balanceDue  = Math.max(0, finalAmount - totalPaid);

  function handleSave() {
    if (!date || !name.trim() || !slot) return;
    onSave({
      id:            "BK" + Date.now(),
      date,
      slotTime:      slot,
      slotTimeEnd:   slotEnd,
      isBlock,
      customerName:  name.trim(),
      phone,
      sport,
      amount:        parseFloat(amount) || 0,
      discount:      parseFloat(discount) || 0,
      discountReason: discReason,
      finalAmount,
      payGpay:       parseFloat(gpay) || 0,
      payCash:       parseFloat(cash) || 0,
      payAdvance:    parseFloat(advance) || 0,
      advanceMode:   advMode,
      notes,
      synced:        false,
    });
  }

  const sel = (val, set) => (
    <select value={val} onChange={(e) => set(e.target.value)} style={{ ...inputCss }}>
      {slots.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
    </select>
  );

  return (
    <div style={{ padding:"0 14px 30px" }}>
      <FieldGroup label="Date">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputCss }} />
      </FieldGroup>

      <FieldGroup label="Slot Start">{sel(slot, setSlot)}</FieldGroup>
      <FieldGroup label="Slot End  ">{sel(slotEnd, setSlotEnd)}</FieldGroup>

      {isBlock && (
        <div style={{ background:"#e8f5e9", borderRadius:8, padding:"7px 10px", fontSize:12, color:"#1a6b38", fontWeight:600, marginBottom:12 }}>
          📦 Block booking ({slot} → {slotEnd})
        </div>
      )}

      <FieldGroup label="Customer Name">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ravi Kumar" style={{ ...inputCss }} />
      </FieldGroup>

      <FieldGroup label="Phone">
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" style={{ ...inputCss }} />
      </FieldGroup>

      <FieldGroup label="Sport">
        <select value={sport} onChange={(e) => setSport(e.target.value)} style={{ ...inputCss }}>
          {SPORTS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </FieldGroup>

      {/* Financials */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:13 }}>
        {[
          { label:"Amount (₹)",   val:amount,   set:setAmount },
          { label:"Discount (₹)", val:discount, set:setDiscount },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <div style={{ fontSize:11, fontWeight:700, color:"#888", marginBottom:5, textTransform:"uppercase", letterSpacing:0.4 }}>{label}</div>
            <input type="number" value={val||""} onChange={(e) => set(e.target.value)} placeholder="0" style={{ ...inputCss }} />
          </div>
        ))}
      </div>

      {discount > 0 && (
        <FieldGroup label="Discount Reason">
          <input value={discReason} onChange={(e) => setDiscReason(e.target.value)} placeholder="e.g. Regular customer" style={{ ...inputCss }} />
        </FieldGroup>
      )}

      {/* Summary pill */}
      <div style={{ background:"#1a472a", borderRadius:12, padding:"12px 14px", marginBottom:13, display:"flex", justifyContent:"space-between" }}>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)" }}>Final Amount</div>
        <div style={{ fontSize:18, fontWeight:800, color:"#fff" }}>{fmtMoney(finalAmount)}</div>
      </div>

      {/* Payment */}
      <FieldGroup label="Payment Received">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            { label:"📱 GPay", val:gpay,    set:setGpay },
            { label:"💵 Cash", val:cash,    set:setCash },
            { label:"🗓 Adv",  val:advance, set:setAdvance },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <div style={{ fontSize:10, color:"#888", fontWeight:700, marginBottom:4 }}>{label}</div>
              <input type="number" value={val||""} onChange={(e) => set(e.target.value)} placeholder="0" style={{ ...inputCss, fontSize:13, padding:"8px 10px" }} />
            </div>
          ))}
        </div>
      </FieldGroup>

      {advance > 0 && (
        <FieldGroup label="Advance Mode">
          <select value={advMode} onChange={(e) => setAdvMode(e.target.value)} style={{ ...inputCss }}>
            {["","gpay","cash","upi","bank"].map((m) => <option key={m} value={m}>{m || "Select..."}</option>)}
          </select>
        </FieldGroup>
      )}

      {balanceDue > 0 && (
        <div style={{ background:"#fff3cd", borderRadius:8, padding:"8px 12px", fontSize:13, color:"#856404", fontWeight:600, marginBottom:12 }}>
          Balance Due: {fmtMoney(balanceDue)}
        </div>
      )}

      <FieldGroup label="Notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" rows={2}
          style={{ ...inputCss, resize:"none" }} />
      </FieldGroup>

      <button onClick={handleSave} disabled={!name.trim()}
        style={{ width:"100%", padding:15, background: name.trim() ? "#1a472a" : "#ccc", color:"#fff", border:"none", borderRadius:13, fontSize:16, fontWeight:700, cursor: name.trim() ? "pointer" : "default", marginBottom:8 }}>
        💾 Save Booking
      </button>
      <button onClick={onCancel} style={{ width:"100%", padding:12, background:"transparent", color:"#888", border:"none", fontSize:14, cursor:"pointer" }}>
        Cancel
      </button>
    </div>
  );
}
