const DEBUG = true;

const log = (type, ...args) => DEBUG && console[type](`hyperwave:`, ...args);

const createDebouncedFunction = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

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
  attachHyperwave(targetElement);
};

const handlePagination = (element, requestOptions) => {
  let offset = parseInt(element.getAttribute("offset") || "0", 10);
  const limit = parseInt(element.getAttribute("limit") || "10", 10);
  const totalArticles = parseInt(
    element.getAttribute("data-total") || "999999999",
    10,
  );

  const getNextPageUrl = () => {
    const url = new URL(element.getAttribute("href"), window.location.origin);
    url.searchParams.set("offset", offset);
    url.searchParams.set("limit", limit);
    return url;
  };

  const loadNextPage = async () => {
    if (offset >= totalArticles) {
      return;
    }
    const url = getNextPageUrl();
    const data = await fetchContent(url.toString(), requestOptions);
    if (data) {
      updateTarget(
        document.querySelector(element.getAttribute("target")),
        data,
      );
      offset += limit;
      element.setAttribute("offset", offset);
    }
  };

  return loadNextPage;
};

const handleInfiniteScroll = (element, loadNextPage, debounceTime) => {
  let isLoading = false;
  const threshold = 200; // Pixels from the bottom to trigger loading

  const onScroll = createDebouncedFunction(async () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const clientHeight = window.innerHeight;
    const scrollHeight = document.documentElement.scrollHeight;

    log(
      "log",
      `Scroll Position: scrollTop=${scrollTop}, clientHeight=${clientHeight}, scrollHeight=${scrollHeight}`,
    );

    if (scrollTop + clientHeight >= scrollHeight - threshold && !isLoading) {
      log(
        "log",
        "User is very close to the bottom of the page. Loading more content...",
      );
      isLoading = true;
      await loadNextPage();
      isLoading = false;
    }
  }, debounceTime);

  window.addEventListener("scroll", onScroll);

  // Load initial content if the initial height is less than the viewport height
  loadNextPage();
};

const handleRequest = (element) => {
  const method = element.getAttribute("method") || "GET";
  const trigger = element.getAttribute("trigger") || "click";
  const debounceTime = parseInt(element.getAttribute("debounce") || "50", 10);

  if (!element.getAttribute("href")) {
    log("warn", `Missing href for element:`, element);
    return;
  }

  const requestOptions = {
    method: method.toUpperCase(),
    headers: { Accept: "text/html" },
  };

  const loadNextPage = handlePagination(element, requestOptions);

  if (trigger.includes("scroll")) {
    handleInfiniteScroll(element, loadNextPage, debounceTime);
  } else if (trigger.includes("DOMContentLoaded")) {
    loadNextPage();
  } else {
    const eventHandler = createDebouncedFunction((event) => {
      event.preventDefault();
      loadNextPage();
    }, debounceTime);

    element.addEventListener(trigger, eventHandler);
    element._hyperwaveHandler = eventHandler;
  }
};

const attachHyperwave = (root) => {
  const elements = [...root.querySelectorAll("[href]")].filter(
    (element) => !["A", "LINK"].includes(element.tagName),
  );
  log("log", `Found ${elements.length} elements with [href] attr`);
  elements.forEach(handleRequest);
};

document.addEventListener("DOMContentLoaded", () => {
  attachHyperwave(document);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          attachHyperwave(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
});
