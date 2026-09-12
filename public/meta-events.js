(() => {
  const PIXEL_ID = "915934768257865";

  const loadPixel = () => {
    if (window.fbq) return;
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
    fbq("init", PIXEL_ID);
  };

  const cookie = (name) => document.cookie.split("; ").find((value) => value.startsWith(`${name}=`))?.split("=")[1];
  const eventId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const sendConversion = (eventName, id) => {
    fetch("/api/meta/conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        eventName,
        eventId: id,
        eventSourceUrl: window.location.href,
        fbp: cookie("_fbp"),
        fbc: cookie("_fbc"),
      }),
    }).catch(() => undefined);
  };

  const track = (eventName) => {
    const id = eventId();
    window.fbq?.("track", eventName, {}, { eventID: id });
    sendConversion(eventName, id);
  };

  loadPixel();
  track("PageView");
  document.addEventListener("click", (event) => {
    if (event.target.closest(".checkout-link")) track("InitiateCheckout");
  });
})();
