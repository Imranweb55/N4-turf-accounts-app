// ─── Toast ───────────────────────────────────────────────────────────────────
export function Toast({ message, visible }) {
  return (
    <div style={{
      position:"fixed", bottom:88, left:"50%", transform:"translateX(-50%)",
      background:"#1a1a1a", color:"#fff", padding:"10px 18px", borderRadius:10,
      fontSize:13, zIndex:999, opacity: visible ? 1 : 0, transition:"opacity 0.3s",
      pointerEvents:"none", whiteSpace:"nowrap", maxWidth:"90vw", textAlign:"center",
    }}>
      {message}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
const BADGE_STYLES = {
  gpay:    { background:"#e3f2fd", color:"#1565c0" },
  cash:    { background:"#fffde7", color:"#b45309" },
  advance: { background:"#ede7f6", color:"#5b21b6" },
  mix:     { background:"#e8f5e9", color:"#1a6b38" },
  disc:    { background:"#fce4ec", color:"#c2185b" },
  block:   { background:"#e8f5e9", color:"#1a472a" },
  pending: { background:"#f5f5f5", color:"#999" },
};
export function Badge({ type, children }) {
  const s = BADGE_STYLES[type] || BADGE_STYLES.pending;
  return (
    <span style={{
      display:"inline-block", padding:"2px 6px", borderRadius:4,
      fontSize:9, fontWeight:700, ...s,
    }}>
      {children}
    </span>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────
const STAT_COLORS = {
  green:"#1a6b38", blue:"#1565c0", amber:"#b45309",
  purple:"#5b21b6", red:"#c0392b", gray:"#444",
};
export function StatCard({ label, value, color = "gray", sub, progress }) {
  const c = STAT_COLORS[color] || STAT_COLORS.gray;
  return (
    <div style={{
      background:"#fff", borderRadius:14, padding:"14px 15px",
      boxShadow:"0 1px 4px rgba(0,0,0,0.07)", flex:1, minWidth:0,
    }}>
      <div style={{ fontSize:10, fontWeight:700, color:"#aaa", textTransform:"uppercase", letterSpacing:0.4, marginBottom:6 }}>
        {label}
      </div>
      <div style={{ fontSize:22, fontWeight:800, color:c }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#aaa", marginTop:3 }}>{sub}</div>}
      {progress != null && (
        <div style={{ marginTop:8, height:4, background:"#f0f0f0", borderRadius:2, overflow:"hidden" }}>
          <div style={{ width:`${Math.min(100, progress)}%`, height:"100%", background:c, borderRadius:2, transition:"width 0.4s" }} />
        </div>
      )}
    </div>
  );
}

// ─── FieldGroup ──────────────────────────────────────────────────────────────
export function FieldGroup({ label, children }) {
  return (
    <div style={{ marginBottom:13 }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#888", marginBottom:5, textTransform:"uppercase", letterSpacing:0.4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ─── Input / Select styles (shared) ─────────────────────────────────────────
export const inputCss = {
  width:"100%", border:"1.5px solid #e5e5e5", borderRadius:10,
  padding:"10px 12px", fontSize:15, color:"#1a1a1a",
  background:"#fafafa", outline:"none", boxSizing:"border-box",
};

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:32 }}>
      <div style={{
        width:28, height:28, border:"3px solid #e0e0e0",
        borderTopColor:"#1a472a", borderRadius:"50%",
        animation:"spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ textAlign:"center", padding:"40px 20px", color:"#bbb" }}>
      <div style={{ fontSize:42, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:16, fontWeight:700, color:"#999", marginBottom:6 }}>{title}</div>
      {subtitle && <div style={{ fontSize:13 }}>{subtitle}</div>}
    </div>
  );
}
