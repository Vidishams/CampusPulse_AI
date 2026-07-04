import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { API_URL } from "../services/api";
import { useAuth } from "./useAuth";

/**
 * Opens one Socket.IO connection per logged-in session and joins the
 * user's private room (see backend/socket/manager.py). Returns the live
 * notification feed so the bell icon can update without a page refresh,
 * per spec requirement #9.
 */
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const [liveNotifications, setLiveNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;

    const socket = io(API_URL, { auth: { userId: user.id } });
    socket.on("notification", (payload) => {
      setLiveNotifications((prev) => [payload, ...prev].slice(0, 20));
    });

    return () => socket.disconnect();
  }, [user]);

  return liveNotifications;
}
