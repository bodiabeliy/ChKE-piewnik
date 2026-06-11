import { useEffect } from "react";

export function useBackgroundPrefetch(songs: { id: string }[]) {
  useEffect(() => {
    if (!songs || songs.length === 0) return;

    // Check if we already prefetched recently
    const lastPrefetch = localStorage.getItem("last-prefetch");
    const now = Date.now();

    // Refresh cache once every 7 days
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    if (lastPrefetch && now - parseInt(lastPrefetch) < ONE_WEEK) {
      return;
    }

    let currentIndex = 0;
    let isCancelled = false;

    const fetchNext = () => {
      if (isCancelled) return;

      if (currentIndex >= songs.length) {
        localStorage.setItem("last-prefetch", now.toString());
        return;
      }

      const songId = songs[currentIndex].id;

      // The service worker will intercept this and cache the response
      fetch(`/api/songs/${encodeURIComponent(songId)}`, {
        headers: {
          // We can optionally add a header to tell the server this is a prefetch,
          // but standard headers are fine.
          Purpose: "prefetch",
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Fetch failed");
          currentIndex++;
          if (!isCancelled) setTimeout(fetchNext, 1000); // Wait 1 second before next request to avoid spamming
        })
        .catch(() => {
          // Error or offline - wait 10 seconds before trying again
          if (!isCancelled) setTimeout(fetchNext, 10000);
        });
    };

    // Wait 5 seconds after mount before starting the background sync
    const initialDelay = setTimeout(fetchNext, 5000);

    return () => {
      isCancelled = true;
      clearTimeout(initialDelay);
    };
  }, [songs]);
}
