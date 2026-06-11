import { useState } from "react";
import { useApp } from "../context/AppContext";
import { sheetFetch } from "../utils/sheetsApi";
import { FieldGroup, inputCss } from "../components/ui";

export function SettingsPage() {
  const { settings, setSettings, showToast } = useApp();
  const [form, setForm] = useState({ ...settings });
  const [pinging, setPinging] = useState(false);

  // FIX: save to localStorage on every keystroke — not just on "Save" button.
  // Previously: user pasted URL → navigated away → component unmounted →
  // form state lost → URL gone. Now it persists immediately.
  function handleChange(key, value) {
    const next = { ...form, [key]: value };
    setForm(next);
    setSettings(next); // persists to localStorage immediately
  }

  async function handlePing() {
    if (!form.scriptUrl) {
      showToast("⚠️ Enter the Apps Script URL first");
      return;
    }
    setPinging(true);
    try {
      const res = await sheetFetch(form.scriptUrl, { action: "ping" });
      showToast(
        res.status === "ok"
          ? "✅ Connected: " + res.message
          : "❌ " + res.message,
      );
    } catch (e) {
      showToast("❌ " + e.message);
    }
    setPinging(false);
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
        <div style={{ fontSize: 20, fontWeight: 800 }}>Settings</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
          Changes save automatically
        </div>
      </div>

      <div style={{ padding: "16px 14px 30px" }}>
        {[
          {
            label: "Turf Name",
            key: "turfName",
            type: "text",
            placeholder: "My Turf",
          },
          {
            label: "Weekday Rate (₹/hr)",
            key: "wdPrice",
            type: "number",
            placeholder: "800",
          },
          {
            label: "Weekend Rate (₹/hr)",
            key: "wePrice",
            type: "number",
            placeholder: "1000",
          },
          {
            label: "Slot Duration (min)",
            key: "slotDur",
            type: "number",
            placeholder: "60",
          },
        ].map(({ label, key, type, placeholder }) => (
          <FieldGroup key={key} label={label}>
            <input
              type={type}
              value={form[key] || ""}
              placeholder={placeholder}
              onChange={(e) => handleChange(key, e.target.value)}
              style={{ ...inputCss }}
            />
          </FieldGroup>
        ))}

        <div
          style={{ margin: "20px 0 12px", height: 1, background: "#f0f0f0" }}
        />
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#1a472a",
            marginBottom: 4,
          }}
        >
          🔗 Google Sheets Connection
        </div>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 12 }}>
          Paste your Apps Script /exec URL below — it saves as you type
        </div>

        <FieldGroup label="Apps Script URL">
          <textarea
            value={form.scriptUrl || ""}
            placeholder="https://script.google.com/macros/s/YOUR_ID/exec"
            rows={3}
            onChange={(e) => handleChange("scriptUrl", e.target.value)}
            style={{ ...inputCss, resize: "none", fontSize: 12 }}
          />
        </FieldGroup>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: form.scriptUrl ? "#2ecc71" : "#ccc",
            }}
          />
          <div
            style={{ fontSize: 12, color: form.scriptUrl ? "#1a6b38" : "#aaa" }}
          >
            {form.scriptUrl ? "URL set — tap Test to verify" : "No URL set yet"}
          </div>
        </div>

        <button
          onClick={handlePing}
          disabled={pinging}
          style={{
            width: "100%",
            padding: 12,
            background: "#e8f5e9",
            color: "#1a6b38",
            border: "1.5px solid #c8e6c9",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 16,
          }}
        >
          {pinging ? "Testing…" : "🔌 Test Connection"}
        </button>

        <div
          style={{ background: "#f8f8f8", borderRadius: 12, padding: "14px" }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#555",
              marginBottom: 8,
            }}
          >
            📋 Apps Script Setup Steps
          </div>
          {[
            "Open your Google Sheet → Extensions → Apps Script",
            "Paste the provided Code.gs content",
            "Deploy → New deployment → Web App",
            'Set "Execute as: Me" and "Access: Anyone"',
            "Copy the /exec URL and paste above",
            "Tap Test Connection to verify ✅",
          ].map((step, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 8,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#1a472a",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>
                {step}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 88 }} />
    </div>
  );
}
