export const emitDataRefresh = (reason = "change") => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent("duelacred:data-refresh", { detail: { reason } }));
  window.localStorage.setItem("duelacred:data-refresh", `${Date.now()}:${reason}`);
};

export const subscribeToDataRefresh = (listener: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  const onCustomEvent = () => listener();
  const onStorageEvent = (event: StorageEvent) => {
    if (event.key === "duelacred:data-refresh") {
      listener();
    }
  };

  window.addEventListener("duelacred:data-refresh", onCustomEvent);
  window.addEventListener("storage", onStorageEvent);

  return () => {
    window.removeEventListener("duelacred:data-refresh", onCustomEvent);
    window.removeEventListener("storage", onStorageEvent);
  };
};
