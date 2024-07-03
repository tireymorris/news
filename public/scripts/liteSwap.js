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

    console.log(
      `Attaching ${trigger} event to element with method: ${method}, href: ${href}, target: ${targetSelector}`,
    );

    const makeRequest = async () => {
      console.log(`Triggered ${trigger} event, making request to ${href}`);
      const response = await fetch(href, requestOptions);
      const data = await response.text();
      console.log(`Response received from ${href}`);
      targetElement.innerHTML = data;
    };

    if (trigger === "DOMContentLoaded") {
      makeRequest();
    } else {
      element.addEventListener(trigger, (event) => {
        event.preventDefault();
        makeRequest();
      });
    }
  };

  const elements = document.querySelectorAll("[method][href]");
  console.log(
    `Found ${elements.length} elements with [method][href] attributes`,
  );

  elements.forEach(handleRequest);
});
