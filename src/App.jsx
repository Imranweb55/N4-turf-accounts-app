import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { DashboardPage } from "./pages/DashboardPage";
import { AddBookingPage } from "./pages/AddBookingPage";
import { HistoryPage }    from "./pages/HistoryPage";
import { SettingsPage }   from "./pages/SettingsPage";
import { BottomNav }      from "./components/BottomNav";
import { Toast }          from "./components/ui";

function Router() {
  const [page, setPage] = useState("dashboard");
  const { toast } = useApp();

  function navigate(id) { setPage(id); window.scrollTo(0, 0); }

  return (
    <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh", background:"#f5f6f8", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {page === "dashboard" && <DashboardPage />}
      {page === "add"       && <AddBookingPage onDone={() => navigate("dashboard")} />}
      {page === "history"   && <HistoryPage />}
      {page === "settings"  && <SettingsPage />}

      <BottomNav page={page} onNav={navigate} />
      <Toast message={toast.msg} visible={toast.visible} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
