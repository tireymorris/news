const DEBUG = true;

const log = (level, ...messages) =>
  DEBUG && console[level](`hyperwave:`, ...messages);

const createDebouncedFunction = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

const fetchContent = async (url, fetchOptions) => {
  try {
    log("log", `Fetching content from ${url}`);
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const content = await response.text();
    log("log", `Content fetched from ${url}`, content.length);
    return content;
  } catch (error) {
    log("error", `Error fetching from ${url}:`, error);
    return null;
  }
};

const updateTargetElement = (targetElement, content) => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = content;
  while (tempDiv.firstChild) {
    targetElement.appendChild(tempDiv.firstChild);
  }
  log("log", `Content appended to target element`);
  attachHyperwaveHandlers(targetElement);
};

const buildPaginationUrl = (triggerElement, offset, limit) => {
  const url = new URL(
    triggerElement.getAttribute("href"),
    window.location.origin,
  );
  url.searchParams.set("offset", offset);
  url.searchParams.set("limit", limit);
  return url.toString();
};

const handlePagination = (triggerElement, fetchOptions) => {
  let offset = parseInt(triggerElement.getAttribute("offset") || "0", 10);
  const limit = parseInt(triggerElement.getAttribute("limit") || "10", 10);
  const totalItems = parseInt(
    triggerElement.getAttribute("data-total") || "999999999",
    10,
  );

  return async () => {
    if (offset >= totalItems) return;

    const url = buildPaginationUrl(triggerElement, offset, limit);
    const content = await fetchContent(url, fetchOptions);
    if (content) {
      updateTargetElement(
        document.querySelector(triggerElement.getAttribute("target")),
        content,
      );
      offset += limit;
      triggerElement.setAttribute("offset", offset);
    }
  };
};

const setupEventHandlers = (triggerElement) => {
  const method = triggerElement.getAttribute("method") || "GET";
  const trigger = triggerElement.getAttribute("trigger") || "click";
  const debounceDelay = parseInt(
    triggerElement.getAttribute("debounce") || "50",
    10,
  );

  if (!triggerElement.getAttribute("href")) {
    log("warn", `Missing href for element:`, triggerElement);
    return;
  }

  const fetchOptions = {
    method: method.toUpperCase(),
    headers: { Accept: "text/html" },
  };

  const loadNextPage = handlePagination(triggerElement, fetchOptions);

  if (trigger.includes("DOMContentLoaded")) {
    loadNextPage();
  } else {
    if (triggerElement._hyperwaveHandler) {
      triggerElement.removeEventListener(
        trigger,
        triggerElement._hyperwaveHandler,
      );
    }

    const eventHandler = createDebouncedFunction((event) => {
      event.preventDefault();
      loadNextPage();
    }, debounceDelay);

    triggerElement.addEventListener(trigger, eventHandler);
    triggerElement._hyperwaveHandler = eventHandler;
  }
};

const setupInfiniteScroll = (triggerElement, loadNextPage, debounceDelay) => {
  let isLoading = false;
  const threshold = 200;

  const onScroll = createDebouncedFunction(async () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const clientHeight = window.innerHeight;
    const scrollHeight = document.documentElement.scrollHeight;

    if (scrollTop + clientHeight >= scrollHeight - threshold && !isLoading) {
      isLoading = true;
      await loadNextPage();
      isLoading = false;
    }
  }, debounceDelay);

  window.addEventListener("scroll", onScroll);
  loadNextPage();

  triggerElement._hyperwaveScrollHandler = onScroll;
};

const attachHyperwaveHandlers = (rootElement) => {
  const elements = Array.from(rootElement.querySelectorAll("[href]")).filter(
    (element) => !["A", "LINK"].includes(element.tagName),
  );
  elements.forEach((element) => {
    setupEventHandlers(element);

    const trigger = element.getAttribute("trigger") || "click";
    if (trigger.includes("scroll")) {
      const debounceDelay = parseInt(
        element.getAttribute("debounce") || "50",
        10,
      );
      const loadNextPage = handlePagination(element, {
        method: element.getAttribute("method") || "GET",
        headers: { Accept: "text/html" },
      });

      if (element._hyperwaveScrollHandler) {
        window.removeEventListener("scroll", element._hyperwaveScrollHandler);
      }
      setupInfiniteScroll(element, loadNextPage, debounceDelay);
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  attachHyperwaveHandlers(document);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          attachHyperwaveHandlers(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
});
