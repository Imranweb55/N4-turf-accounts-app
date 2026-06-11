const TABS = [
  { id:"dashboard", icon:"🏟", label:"Today" },
  { id:"add",       icon:"＋", label:"Book" },
  { id:"history",   icon:"📊", label:"History" },
  { id:"settings",  icon:"⚙️", label:"Settings" },
];

/**
 * BottomNav — fixed bottom navigation bar
 * Props: page, onNav(id)
 */
export function BottomNav({ page, onNav }) {
  return (
    <nav style={{
      position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
      width:"100%", maxWidth:480,
      background:"rgba(255,255,255,0.97)",
      borderTop:"1px solid #eee",
      display:"flex", zIndex:100,
      paddingBottom:"env(safe-area-inset-bottom)",
    }}>
      {TABS.map(({ id, icon, label }) => {
        const active = page === id;
        return (
          <button key={id} onClick={() => onNav(id)} style={{
            flex:1, padding:"10px 4px 8px",
            background:"transparent", border:"none", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", gap:2,
          }}>
            <span style={{ fontSize: id === "add" ? 22 : 18, lineHeight:1 }}>{icon}</span>
            <span style={{ fontSize:10, fontWeight: active ? 700 : 500, color: active ? "#1a472a" : "#aaa" }}>
              {label}
            </span>
            {active && <div style={{ width:20, height:2, background:"#1a472a", borderRadius:1 }} />}
          </button>
        );
      })}
    </nav>
  );
}
