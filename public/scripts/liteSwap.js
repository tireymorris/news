document.addEventListener("DOMContentLoaded", () => {
  const handleRequest = (element) => {
    const method = element.getAttribute("method") || "GET";
    const href = element.getAttribute("href");
    const targetSelector = element.getAttribute("target");
    const trigger = element.getAttribute("trigger") || "click";

    if (!method || !href) return;

    const targetElement = targetSelector
      ? document.querySelector(targetSelector)
      : element;

    if (!targetElement) return;

    const requestOptions = {
      method: method.toUpperCase(),
      headers: { "Content-Type": "application/json" },
    };

    element.addEventListener(trigger, async (event) => {
      event.preventDefault();
      const response = await fetch(href, requestOptions);
      const data = await response.text();
      targetElement.innerHTML = data;
    });
  };

  document.querySelectorAll("[method][href]").forEach(handleRequest);
});
