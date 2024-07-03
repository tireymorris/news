DEBUG = true;

document.addEventListener("DOMContentLoaded", () => {
  const log = (type, ...args) => DEBUG && console[type](`liteSwap:`, ...args);

  const fetchContent = async (href, requestOptions) => {
    try {
      log("log", `Fetching content from ${href}`);
      const response = await fetch(href, requestOptions);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.text();
      log("log", `Content fetched from ${href}`, data.length);
      return data;
    } catch (error) {
      log("error", `Error fetching from ${href}:`, error);
    }
  };

  const updateTarget = (targetElement, data) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = data;
    while (tempDiv.firstChild) {
      targetElement.appendChild(tempDiv.firstChild);
    }
    log("log", `Content appended to target element`);
    attachLiteSwap(targetElement);
  };

  const createRequestHandler = (
    element,
    { href, method, targetElement, limit, offset, paginationEnabled },
  ) => {
    const requestOptions = {
      method: method.toUpperCase(),
      headers: { Accept: "text/html" },
    };

    const makeRequest = async () => {
      let url = href;
      if (paginationEnabled) {
        const urlObj = new URL(href, window.location.origin);
        urlObj.searchParams.set("offset", offset);
        urlObj.searchParams.set("limit", limit);
        url = urlObj.toString();
      }
      log("log", `Making request to ${url} with method: ${method}`);
      const data = await fetchContent(url, requestOptions);
      if (data) {
        updateTarget(targetElement, data);
        if (paginationEnabled) {
          offset += limit;
          element.setAttribute("offset", offset);
        }
      }
    };

    return makeRequest;
  };

  const handleRequest = (element) => {
    const method = element.getAttribute("method") || "GET";
    const href = element.getAttribute("href");
    const targetSelector = element.getAttribute("target");
    const trigger = element.getAttribute("trigger") || "click";
    const paginationEnabled = element.hasAttribute("pagination");
    const limit = parseInt(element.getAttribute("limit") || "10", 10);
    let offset = parseInt(element.getAttribute("offset") || "0", 10);

    if (!href) {
      log("warn", `Missing href for element:`, element);
      return;
    }

    const targetElement = targetSelector
      ? document.querySelector(targetSelector)
      : element;

    if (!targetElement) {
      log("warn", `Target element not found for selector: ${targetSelector}`);
      return;
    }

    const makeRequest = createRequestHandler(element, {
      href,
      method,
      targetElement,
      limit,
      offset,
      paginationEnabled,
    });

    log("log", `Attaching ${trigger} event to element`, element);

    element.removeEventListener(trigger, element._liteSwapHandler);
    element._liteSwapHandler = (event) => {
      event.preventDefault();
      log("log", `${trigger} event triggered on element`, element);
      makeRequest();
    };

    if (trigger === "scroll") {
      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } =
          document.documentElement;
        if (scrollTop + clientHeight >= scrollHeight - 5) {
          makeRequest();
        }
      };
      window.addEventListener("scroll", handleScroll);
    } else if (trigger === "DOMContentLoaded") {
      makeRequest();
    } else {
      element.addEventListener(trigger, element._liteSwapHandler);
    }
  };

  const attachLiteSwap = (root) => {
    const elements = root.querySelectorAll("[method][href]");
    log(
      "log",
      `Found ${elements.length} elements with [method][href] attributes`,
    );
    elements.forEach(handleRequest);
  };

  attachLiteSwap(document);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          attachLiteSwap(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
});
