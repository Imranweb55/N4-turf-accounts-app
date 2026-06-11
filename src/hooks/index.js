import { useState, useCallback, useEffect, useRef } from "react";
import { sheetFetch } from "../utils/sheetsApi";
import { rowToBooking, toMonthKey } from "../utils/helpers";
import { POLL_INTERVAL_MS } from "../utils/constants";

// ─── useLocalStorage ─────────────────────────────────────────────────────────

export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback(
    (newValue) => {
      setValue((prev) => {
        const resolved =
          typeof newValue === "function" ? newValue(prev) : newValue;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {}
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}

// ─── useToast ────────────────────────────────────────────────────────────────

export function useToast() {
  const [toast, setToast] = useState({ msg: "", visible: false });
  const timerRef = useRef(null);

  const show = useCallback((msg) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ msg, visible: true });
    timerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, 3000);
  }, []);

  return { toast, show };
}

// ─── useDayBookings ──────────────────────────────────────────────────────────
/**
 * BUG FIX: Previously `cache` was NOT in the useCallback dependency array,
 * causing stale closure — the fetch function captured an old `cache` reference
 * and the fallback always showed empty data.
 *
 * Also: scriptUrl was always "" due to the Settings auto-save bug (now fixed),
 * which made every call hit the early-return `if (!scriptUrl)` branch.
 *
 * FIX: Use a ref for cache (avoids recreating fetch on every cache update)
 * and check scriptUrl before the ref read so polling is stable.
 */
export function useDayBookings({ date, scriptUrl, cache, setCache, onToast }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Keep a ref to latest cache so the fetch closure always reads fresh data
  // without needing cache in the dependency array (which would restart poll)
  const cacheRef = useRef(cache);
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  const fetch = useCallback(async () => {
    if (!scriptUrl) {
      // No URL configured — show whatever is in cache
      setBookings(cacheRef.current[date] || []);
      return;
    }
    setLoading(true);
    try {
      const res = await sheetFetch(scriptUrl, { action: "getBookings", date });
      if (res.status === "ok" && Array.isArray(res.bookings)) {
        const parsed = res.bookings.map(rowToBooking);
        setBookings(parsed);
        setCache((prev) => ({ ...prev, [date]: parsed }));
      } else {
        setBookings(cacheRef.current[date] || []);
        onToast?.("⚠️ " + (res.message || "Sheet error"));
      }
    } catch (err) {
      const cached = cacheRef.current[date] || [];
      setBookings(cached);
      onToast?.(
        cached.length
          ? "⚠️ Offline — showing cached data"
          : "❌ Could not load. Check Script URL in Settings.",
      );
    }
    setLoading(false);
  }, [date, scriptUrl, setCache, onToast]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetch]);

  return { bookings, setBookings, loading, refresh: fetch };
}

// ─── useWeekBookings ─────────────────────────────────────────────────────────
/**
 * Fetches all bookings for the Mon–Sun week containing `anchorDate`.
 * Fetches each day individually so we reuse the same getBookings?date= endpoint.
 */
export function useWeekBookings({
  anchorDate,
  scriptUrl,
  cache,
  setCache,
  onToast,
}) {
  const [dayMap, setDayMap] = useState({}); // { "2026-06-09": [booking,...], ... }
  const [loading, setLoading] = useState(false);

  const cacheRef = useRef(cache);
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  // Build the 7 ISO date strings for the week
  const weekDates = useCallback(() => {
    const d = new Date(anchorDate + "T00:00:00");
    const day = d.getDay(); // 0=Sun
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(monday);
      dd.setDate(monday.getDate() + i);
      return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
    });
  }, [anchorDate]);

  const fetch = useCallback(async () => {
    const dates = weekDates();
    setLoading(true);

    if (!scriptUrl) {
      // Fallback: read from cache for each day
      const map = {};
      dates.forEach((d) => {
        map[d] = cacheRef.current[d] || [];
      });
      setDayMap(map);
      setLoading(false);
      return;
    }

    // Fetch all 7 days in parallel
    const results = await Promise.allSettled(
      dates.map((d) =>
        sheetFetch(scriptUrl, { action: "getBookings", date: d }),
      ),
    );

    const map = {};
    results.forEach((r, i) => {
      const d = dates[i];
      if (
        r.status === "fulfilled" &&
        r.value.status === "ok" &&
        Array.isArray(r.value.bookings)
      ) {
        const parsed = r.value.bookings.map(rowToBooking);
        map[d] = parsed;
        setCache((prev) => ({ ...prev, [d]: parsed }));
      } else {
        map[d] = cacheRef.current[d] || [];
      }
    });
    setDayMap(map);
    setLoading(false);
  }, [scriptUrl, weekDates, setCache]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { dayMap, weekDates: weekDates(), loading, refresh: fetch };
}

// ─── useMonthBookings ────────────────────────────────────────────────────────

export function useMonthBookings({
  monthKey,
  scriptUrl,
  cache,
  setCache,
  onToast,
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const cacheRef = useRef(cache);
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  const fetch = useCallback(async () => {
    if (!monthKey) return;
    setLoading(true);
    setBookings([]);

    if (!scriptUrl) {
      // Rebuild from local cache
      const fallback = [];
      Object.entries(cacheRef.current).forEach(([d, bkgs]) => {
        if (toMonthKey(new Date(d + "T00:00:00")) === monthKey)
          bkgs.forEach((b) => fallback.push({ ...b, date: d }));
      });
      fallback.sort((a, b) => b.date.localeCompare(a.date));
      setBookings(fallback);
      setLoading(false);
      return;
    }

    try {
      const res = await sheetFetch(scriptUrl, {
        action: "getBookings",
        month: monthKey,
      });
      if (res.status === "ok" && Array.isArray(res.bookings)) {
        const parsed = res.bookings.map(rowToBooking);
        parsed.sort((a, b) => b.date.localeCompare(a.date));
        setBookings(parsed);
        const byDate = {};
        parsed.forEach((b) => {
          (byDate[b.date] = byDate[b.date] || []).push(b);
        });
        setCache((prev) => ({ ...prev, ...byDate }));
      }
    } catch {
      onToast?.("⚠️ Offline — showing cached data");
      const fallback = [];
      Object.entries(cacheRef.current).forEach(([d, bkgs]) => {
        if (toMonthKey(new Date(d + "T00:00:00")) === monthKey)
          bkgs.forEach((b) => fallback.push({ ...b, date: d }));
      });
      fallback.sort((a, b) => b.date.localeCompare(a.date));
      setBookings(fallback);
    }
    setLoading(false);
  }, [monthKey, scriptUrl, setCache, onToast]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { bookings, loading, refresh: fetch };
}
