import { useApp } from "../context/AppContext";
import { sheetFetch } from "../utils/sheetsApi";
import { AddBookingForm } from "../components/AddBookingForm";

/**
 * AddBookingPage
 * Props: onDone() — navigate back to dashboard after save
 */
export function AddBookingPage({ onDone }) {
  const { settings, setCache, showToast } = useApp();

  async function handleSave(booking) {
    // 1. Optimistic: add to cache immediately
    setCache((prev) => ({
      ...prev,
      [booking.date]: [...(prev[booking.date] || []), booking],
    }));
    showToast("✅ Booking saved!");
    onDone();

    // 2. Sync to sheet in background
    try {
      await sheetFetch(settings.scriptUrl, {
        action:         "addBooking",
        id:             booking.id,
        date:           booking.date,
        slotTime:       booking.slotTime,
        slotTimeEnd:    booking.slotTimeEnd || "",
        isBlock:        booking.isBlock ? "1" : "0",
        customerName:   booking.customerName,
        phone:          booking.phone || "",
        sport:          booking.sport || "",
        amount:         booking.amount || 0,
        discount:       booking.discount || 0,
        discountReason: booking.discountReason || "",
        finalAmount:    booking.finalAmount || 0,
        payGpay:        booking.payGpay || 0,
        payCash:        booking.payCash || 0,
        payAdvance:     booking.payAdvance || 0,
        advanceMode:    booking.advanceMode || "",
        notes:          booking.notes || "",
      });
      setCache((prev) => {
        const list = (prev[booking.date] || []).map((x) =>
          x.id === booking.id ? { ...x, synced: true } : x
        );
        return { ...prev, [booking.date]: list };
      });
    } catch (e) {
      showToast("⚠️ Saved locally. Will sync when online.");
    }
  }

  return (
    <div>
      <div style={{ background:"#1a472a", padding:"16px 14px 14px", color:"#fff", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ fontSize:11, opacity:0.7, textTransform:"uppercase", letterSpacing:0.5 }}>{settings.turfName}</div>
        <div style={{ fontSize:20, fontWeight:800 }}>New Booking</div>
      </div>
      <div style={{ height:12 }} />
      <AddBookingForm settings={settings} onSave={handleSave} onCancel={onDone} />
    </div>
  );
}
