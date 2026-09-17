(function () {
  const CONSENT_KEY =
    "orinayaAnalyticsConsentV1";

  const SESSION_KEY =
    "orinayaVisitSessionV2";

  let data = null;
  let visibleSince = null;
  let started = false;

  function hasConsent() {
    return (
      localStorage.getItem(CONSENT_KEY) ===
      "accepted"
    );
  }

  function load() {
    try {
      data = JSON.parse(
        sessionStorage.getItem(SESSION_KEY)
      );
    } catch {
      data = null;
    }

    if (!data) {
      data = {
        messageId: null,
        journey: [],
        activeMs: 0
      };
    }
  }

  function save() {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify(data)
    );
  }

  function addCurrentPage() {
    const path = location.pathname || "/";

    if (
      data.journey[data.journey.length - 1] !==
      path
    ) {
      data.journey.push(path);

      if (data.journey.length > 10) {
        data.journey =
          data.journey.slice(-10);
      }

      save();
    }
  }

  function startClock() {
    if (
      document.visibilityState === "visible" &&
      visibleSince === null
    ) {
      visibleSince = Date.now();
    }
  }

  function stopClock() {
    if (visibleSince !== null) {
      data.activeMs +=
        Date.now() - visibleSince;

      visibleSince = null;

      save();
    }
  }

  function activeSeconds() {
    let ms = data.activeMs;

    if (visibleSince !== null) {
      ms += Date.now() - visibleSince;
    }

    return Math.round(ms / 1000);
  }

  async function send(action) {
    if (
      action === "update" &&
      !data.messageId
    ) {
      return;
    }

    try {
      const response = await fetch(
        "/api/visit-alert",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            action,
            path: location.pathname || "/",
            journey: data.journey,
            messageId: data.messageId,
            seconds: activeSeconds()
          }),
          keepalive: true
        }
      );

      const result =
        await response.json();

      if (
        result &&
        result.ok &&
        result.messageId
      ) {
        data.messageId =
          result.messageId;

        save();
      }

    } catch {}
  }

  async function start() {
    if (started || !hasConsent()) {
      return;
    }

    started = true;

    load();
    addCurrentPage();
    startClock();

    if (!data.messageId) {
      await send("enter");
    } else {
      await send("update");
    }

    setInterval(function () {
      if (
        document.visibilityState ===
        "visible"
      ) {
        send("update");
      }
    }, 30000);
  }

  document.addEventListener(
    "visibilitychange",
    function () {
      if (
        document.visibilityState ===
        "hidden"
      ) {
        stopClock();
        send("update");
      } else {
        startClock();
      }
    }
  );

  window.addEventListener(
    "pagehide",
    function () {
      stopClock();
      send("update");
    }
  );

  start();

  const consentWatcher =
    setInterval(function () {
      if (hasConsent()) {
        clearInterval(consentWatcher);
        start();
      }
    }, 500);
})();
