document.addEventListener("DOMContentLoaded", () => {
  const handleRequest = (element) => {
    const method = element.getAttribute("method") || "GET";
    const href = element.getAttribute("href");
    const targetSelector = element.getAttribute("target");
    const trigger = element.getAttribute("trigger") || "click";

    if (!method || !href) {
      console.warn(`liteSwap: Missing method or href for element:`, element);
      return;
    }

    const targetElement = targetSelector
      ? document.querySelector(targetSelector)
      : element;

    if (!targetElement) {
      console.warn(
        `liteSwap: Target element not found for selector: ${targetSelector}`,
      );
      return;
    }

    const requestOptions = {
      method: method.toUpperCase(),
      headers: { "Content-Type": "application/json" },
    };

    console.log(
      `liteSwap: Attaching ${trigger} event to element with method: ${method}, href: ${href}, target: ${targetSelector}`,
    );

    const makeRequest = async () => {
      console.log(
        `liteSwap: Triggered ${trigger} event, making request to ${href}`,
      );
      try {
        const response = await fetch(href, requestOptions);
        console.log(`liteSwap: Fetch request made to ${href}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.text();
        console.log(`liteSwap: Response received from ${href}`);
        targetElement.innerHTML += data;
        console.log(`liteSwap: Content appended to target element`);
      } catch (error) {
        console.error(`liteSwap: Error fetching from ${href}:`, error);
      }
    };

    if (trigger === "DOMContentLoaded") {
      makeRequest();
    } else {
      element.addEventListener(trigger, (event) => {
        event.preventDefault();
        console.log(
          `liteSwap: ${trigger} event triggered on element:`,
          element,
        );
        makeRequest();
      });
    }
  };

  const elements = document.querySelectorAll("[method][href]");
  console.log(
    `liteSwap: Found ${elements.length} elements with [method][href] attributes`,
  );
  elements.forEach(handleRequest);
});
