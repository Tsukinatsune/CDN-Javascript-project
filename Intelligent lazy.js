(function () {
  const controller = new AbortController();
  const { signal } = controller;
  const eventListeners = new Map();
  const priorityQueue = { high: [], medium: [], low: [] };
  const retryQueue = new Map();
  const customCallbacks = [];
  const loadedState = JSON.parse(sessionStorage.getItem("lazyLoadState") || "{}");
  const groupTriggers = new Map();
  const dependencies = new Map();
  const metrics = { elementsLoaded: 0, totalLoadTime: 0, audits: [] };
  const debug = window.lazyLoadConfig?.debug || false;
  let performanceBudget = 0;
  let lastScrollY = window.scrollY;

  // Utility to add event listeners with AbortController signal
  const addListener = (element, event, handler, options = {}) => {
    element.addEventListener(event, handler, { ...options, signal });
    eventListeners.set(`${event}-${handler.toString()}`, { element, event, handler, options });
  };

  // Remove all event listeners
  const removeAllListeners = () => {
    eventListeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    eventListeners.clear();
  };

  // Debounce function to limit frequent calls (e.g., on scroll/resize)
  const debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  };

  // Add CSS for lazy-loaded elements (placeholders, transitions, etc.)
  const style = document.createElement("style");
  style.textContent = `
    [data-lazy-processed] {
      opacity: 0;
      transition: opacity 0.3s ease-in;
    }
    [data-lazy-loaded] {
      opacity: 1;
    }
    img[data-lazy-processed], video[data-lazy-processed] {
      aspect-ratio: attr(data-aspect-ratio);
    }
    [data-lazy-processed][aria-hidden="true"] {
      display: none;
    }
    img[data-placeholder="color"] {
      background-color: #f0f0f0;
    }
    img[data-placeholder="blur"] {
      filter: blur(10px);
    }
    [data-lazy-animation][data-lazy-loaded] {
      animation-play-state: running;
    }
    [data-lazy-animation-class][data-lazy-loaded] {
      animation: none;
    }
    noscript [data-lazy-processed] {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

  // Add noscript fallback to show elements if JavaScript is disabled
  const noscript = document.createElement("noscript");
  noscript.innerHTML = `<style>[data-lazy-processed][data-src],[data-lazy-processed][data-href],[data-lazy-processed][data-font]{display:block;}</style>`;
  document.head.appendChild(noscript);

  // Detect WebGPU and calculate device factor for performance adjustments
  const hasWebGPU = !!navigator.gpu;
  const deviceFactor = (navigator.deviceMemory || 4) < 4 || (navigator.hardwareConcurrency || 4) < 4 ? 1.5 : navigator.connection?.saveData ? 2 : 1;

  // Default configuration for lazy-loading
  let config = window.lazyLoadConfig || {
    rootMargins: { high: `${100 * deviceFactor}px`, medium: `${200 * deviceFactor}px`, low: `${300 * deviceFactor}px` },
    thresholds: { default: 0.1, script: 0.5, css: 0.3, font: 0.2 },
    maxRetries: 3,
    maxSize: 5 * 1024 * 1024, // 5MB limit
    errorPolicy: () => {},
    debug: false,
    strategies: { immediate: () => 0, staggered: i => i * 100 },
    weights: { high: 3, medium: 2, low: 1 },
    timeout: 30000, // 30s timeout
    policy: () => true,
    enableSW: true // Toggle Service Worker caching
  };

  // Fallback for browsers without IntersectionObserver
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll("[data-lazy-processed]").forEach(el => {
      try {
        const attr = el.dataset.lazyAttr || "src";
        if (el.dataset[attr]) el[attr] = el.dataset[attr];
        el.dataset.lazyLoaded = true;
      } catch (err) {
        console.error("Error loading resource:", err);
      }
    });
    return;
  }

  // Initialize IntersectionObservers for different resource types
  const observers = {
    default: new IntersectionObserver(handleObserver, { rootMargin: config.rootMargins.low, threshold: config.thresholds.default, signal }),
    script: new IntersectionObserver(handleObserver, { rootMargin: config.rootMargins.low, threshold: config.thresholds.script, signal }),
    css: new IntersectionObserver(handleObserver, { rootMargin: config.rootMargins.low, threshold: config.thresholds.css, signal }),
    font: new IntersectionObserver(handleObserver, { rootMargin: config.rootMargins.low, threshold: config.thresholds.font, signal })
  };

  // Handle IntersectionObserver entries
  function handleObserver(entries, obs) {
    const batch = { entries: [], frame: null, events: [] };
    batch.entries.push(...entries);
    cancelAnimationFrame(batch.frame);
    batch.frame = requestAnimationFrame(() => {
      // Sort entries by priority and viewport proximity
      batch.entries.sort((a, b) => {
        const aWeight = config.weights[a.target.dataset.priority || "low"] || 1;
        const bWeight = config.weights[b.target.dataset.priority || "low"] || 1;
        const aScore = aWeight + (a.target.tagName === "IMG" && hasWebGPU ? 1 : 0);
        const bScore = bWeight + (b.target.tagName === "IMG" && hasWebGPU ? 1 : 0);
        const aDist = Math.abs(a.boundingClientRect.top - window.innerHeight / 2);
        const bDist = Math.abs(b.boundingClientRect.top - window.innerHeight / 2);
        return bScore - aScore || aDist - bDist;
      });

      batch.entries.forEach(entry => {
        const el = entry.target;
        if (!el.dataset.observeStart) el.dataset.observeStart = Date.now();

        if (entry.isIntersecting && config.policy(el)) {
          try {
            // Enforce performance budget
            if (performanceBudget > 1000) return;
            performanceBudget += 10;

            // Check resource size limit
            const size = parseInt(el.dataset.size || "0", 10);
            if (size > config.maxSize) {
              if (debug) console.log(`Skipping oversized ${el.tagName.toLowerCase()} ${el.dataset.id}`);
              metrics.audits.push({ id: el.dataset.id, status: "skipped", reason: "oversized" });
              return;
            }

            // Apply loading strategy (immediate or staggered)
            const strategy = el.dataset.lazyStrategy || "immediate";
            const delay = config.strategies[strategy]?.(batch.entries.indexOf(entry)) || 0;

            setTimeout(() => {
              // Check dependencies
              if (el.dataset.dependsOn && !loadedState[el.dataset.dependsOn]) return;

              // Set resource attribute (e.g., src, href)
              const attr = el.dataset.lazyAttr || "src";
              if (el.dataset[attr]) {
                el[attr] = el.dataset[attr];
                if (el.dataset.crossorigin) el.crossOrigin = el.dataset.crossorigin;
              }
              if (el.dataset.bg) el.style.backgroundImage = `url(${el.dataset.bg})`;

              // Preload high-priority resources
              if (el.dataset.priority === "high") {
                const url = el.dataset[attr] || el.dataset.bg;
                if (url) {
                  const host = new URL(url, location.href).hostname;
                  const dns = document.createElement("link");
                  dns.rel = "dns-prefetch";
                  dns.href = `//${host}`;
                  document.head.appendChild(dns);
                  addListener(dns, "load", () => dns.remove(), { once: true });

                  const preload = document.createElement("link");
                  preload.rel = "preload";
                  preload.as = el.tagName === "IMG" ? "image" : el.tagName === "VIDEO" ? "video" : el.tagName === "LINK" ? "style" : "script";
                  preload.href = url;
                  document.head.appendChild(preload);
                  addListener(preload, "load", () => preload.remove(), { once: true });
                }
              }

              // Handle group loading
              if (el.dataset.lazyGroup) {
                groupTriggers.get(el.dataset.lazyGroup)?.forEach(groupEl => {
                  if (!groupEl.dataset.lazyLoaded) {
                    const groupUrl = groupEl.dataset[groupEl.dataset.lazyAttr || "src"] || groupEl.dataset.bg;
                    if (groupUrl) {
                      const preload = document.createElement("link");
                      preload.rel = "preload";
                      preload.as = groupEl.tagName === "IMG" ? "image" : groupEl.tagName === "VIDEO" ? "video" : groupEl.tagName === "LINK" ? "style" : "script";
                      preload.href = groupUrl;
                      document.head.appendChild(preload);
                      addListener(preload, "load", () => preload.remove(), { once: true });
                    }
                  }
                });
              }

              // Finalize element loading
              el.removeAttribute("data-lazy-placeholder");
              el.removeAttribute("aria-hidden");
              if (el.dataset.lazyAnimationClass) el.classList.add(el.dataset.lazyAnimationClass);
              el.dataset.lazyLoaded = true;

              // Record metrics
              const loadTime = performance.now();
              metrics.elementsLoaded++;
              metrics.totalLoadTime += loadTime;
              metrics.audits.push({ id: el.dataset.id, tag: el.tagName, loadTime, budget: performanceBudget });

              const event = { element: el, loadTime, performanceBudget, metrics };
              batch.events.push(event);
              if (debug) console.log(`Lazy-loaded ${el.tagName.toLowerCase()} ${el.dataset.id} in ${loadTime}ms, budget: ${performanceBudget}`);

              obs.unobserve(el);
              retryQueue.delete(el);
              loadedState[el.dataset.id] = true;
              sessionStorage.setItem("lazyLoadState", JSON.stringify(loadedState));

              // Load group elements
              if (el.dataset.lazyGroup) {
                groupTriggers.get(el.dataset.lazyGroup)?.forEach(groupEl => {
                  if (!groupEl.dataset.lazyLoaded && config.policy(groupEl)) {
                    const groupAttr = groupEl.dataset.lazyAttr || "src";
                    if (groupEl.dataset[groupAttr]) {
                      groupEl[groupAttr] = groupEl.dataset[groupAttr];
                      if (groupEl.dataset.crossorigin) groupEl.crossOrigin = groupEl.dataset.crossorigin;
                    }
                    if (groupEl.dataset.bg) groupEl.style.backgroundImage = `url(${groupEl.dataset.bg})`;
                    groupEl.dataset.lazyLoaded = true;
                    groupEl.removeAttribute("aria-hidden");
                    obs.unobserve(groupEl);
                  }
                });
              }

              // Trigger dependent elements
              dependencies.get(el.dataset.id)?.forEach(dep => observers[dep.dataset.lazyType || "default"].observe(dep));

              // Cache loaded resource
              if (config.enableSW && "caches" in window) {
                caches.open("lazyload-cache").then(cache => {
                  const url = el.dataset[attr] || el.dataset.bg;
                  if (url) cache.add(url).catch(err => console.warn("Cache add failed:", err));
                });
              }
            }, delay);
          } catch (err) {
            console.error("Error processing lazy-loaded element:", err);
            config.errorPolicy(err, el);
            metrics.audits.push({ id: el.dataset.id, status: "error", error: err.message });
            if (retryQueue.get(el)?.retries < config.maxRetries) {
              const retries = (retryQueue.get(el)?.retries || 0) + 1;
              retryQueue.set(el, { retries, timeout: setTimeout(() => observers[el.dataset.lazyType || "default"].observe(el), 1000 * retries) });
            }
          }
        } else if (Date.now() - parseInt(el.dataset.observeStart || "0", 10) > config.timeout) {
          obs.unobserve(el);
          if (debug) console.log(`Timeout for ${el.tagName.toLowerCase()} ${el.dataset.id}`);
          metrics.audits.push({ id: el.dataset.id, status: "timeout" });
        }
      });

      // Dispatch batch events
      if (batch.events.length) {
        document.dispatchEvent(new CustomEvent("lazyloadbatch", { detail: { events: batch.events } }));
        customCallbacks.forEach(cb => batch.events.forEach(event => cb(event)));
        batch.events = [];
      }
      batch.entries = [];
    });
  }

  // Process elements for lazy loading
  function lazyLoadElements() {
    const elements = document.querySelectorAll("[data-lazy-processed]:not([data-lazy-loaded])");
    elements.forEach(el => {
      try {
        if (el.dataset.lazyProcessed && !el.dataset.lazySkip && !loadedState[el.dataset.id]) {
          const attr = el.dataset.lazyAttr || "src";
          if (el[attr]) el.dataset[attr] = el[attr];
          el.removeAttribute(attr);
          if (el.dataset.bg) el.dataset.bg = el.style.backgroundImage?.match(/url\(["']?(.+?)["']?\)/)?.[1] || el.dataset.bg;
          el.style.backgroundImage = "";

          // Set placeholder for images/videos
          if ((el.tagName === "IMG" || el.tagName === "VIDEO") && !el.dataset[attr]) {
            el.dataset[attr] = el.dataset.placeholder === "color"
              ? "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
              : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
          }

          // Set aspect ratio and animation state
          if (el.tagName === "IMG" || el.tagName === "VIDEO") {
            const { width, height } = el.dataset;
            if (width && height) el.dataset.aspectRatio = `${width}/${height}`;
            if (el.dataset.lazyAnimation) el.style.animationPlayState = "paused";
          }

          // Handle group triggers
          if (el.dataset.lazyGroup) {
            if (!groupTriggers.has(el.dataset.lazyGroup)) groupTriggers.set(el.dataset.lazyGroup, []);
            groupTriggers.get(el.dataset.lazyGroup).push(el);
          }

          // Handle dependencies
          if (el.dataset.dependsOn) {
            if (!dependencies.has(el.dataset.dependsOn)) dependencies.set(el.dataset.dependsOn, []);
            dependencies.get(el.dataset.dependsOn).push(el);
            return;
          }

          // Assign unique ID
          if (!el.dataset.id) el.dataset.id = `lazy-${Math.random().toString(36).slice(2)}`;
          el.dataset.lazyProcessed = true;

          // Queue element by priority and type
          const priority = el.dataset.priority || "low";
          const type = el.tagName === "SCRIPT" ? "script" : el.tagName === "LINK" && el.dataset.href ? "css" : el.tagName === "LINK" && el.dataset.font ? "font" : "default";
          el.dataset.lazyType = type;
          priorityQueue[priority].push({ el, threshold: config.thresholds[type] });
          if (debug) console.log(`Queued ${el.tagName.toLowerCase()} ${el.dataset.id} with priority ${priority}`);
        }
      } catch (err) {
        console.error("Error processing element for lazy loading:", err);
        config.errorPolicy(err, el);
        metrics.audits.push({ id: el.dataset.id, status: "error", error: err.message });
      }
    });

    // Observe queued elements
    ["high", "medium", "low"].forEach(priority => {
      priorityQueue[priority].forEach(({ el, threshold }) => {
        observers[el.dataset.lazyType || "default"].rootMargin = config.rootMargins[priority];
        observers[el.dataset.lazyType || "default"].observe(el);
      });
      priorityQueue[priority] = [];
    });
  }

  // Initialize on DOMContentLoaded
  addListener(document, "DOMContentLoaded", lazyLoadElements);

  // Log batch events in debug mode
  addListener(document, "lazyloadbatch", e => {
    if (debug) e.detail.events.forEach(event => console.log(`Batch loaded ${event.element.tagName.toLowerCase()} ${event.element.dataset.id} in ${performance.now() - event.loadTime}ms, budget: ${performanceBudget}`));
  });

  // Observe DOM mutations for dynamic content
  const debouncedLazyLoad = debounce(lazyLoadElements, 100);
  const mutationObserver = new MutationObserver(debouncedLazyLoad);
  try {
    mutationObserver.observe(document.body, { childList: true, subtree: true, signal });
  } catch (err) {
    console.error("Error setting up MutationObserver:", err);
    config.errorPolicy(err);
    metrics.audits.push({ status: "error", error: err.message });
  }

  // Adjust weights on scroll for dynamic prioritization
  addListener(window, "scroll", () => {
    const scrollY = window.scrollY;
    const direction = scrollY > lastScrollY ? "down" : "up";
    lastScrollY = scrollY;
    if (direction === "down") {
      config.weights.medium = 2.5;
      config.weights.low = 1.5;
    } else {
      config.weights.medium = 2;
      config.weights.low = 1;
    }
    debouncedLazyLoad();
  }, { passive: true });

  // Re-run lazy loading on resize
  addListener(window, "resize", debouncedLazyLoad, { passive: true });

  // Modified cleanup function (removed audit log export)
  const cleanup = () => {
    try {
      Object.values(observers).forEach(obs => obs.disconnect());
      mutationObserver.disconnect();
      removeAllListeners();
      controller.abort();
      style.remove();
      noscript.remove();
      retryQueue.forEach(({ timeout }) => clearTimeout(timeout));
      retryQueue.clear();
      groupTriggers.clear();
      dependencies.clear();
      // Removed audit log export (no Blob, URL, or download)
      // Previously: Created and downloaded lazyload-audit-*.json
    } catch (err) {
      console.error("Error during cleanup:", err);
      config.errorPolicy(err);
      metrics.audits.push({ status: "error", error: err.message });
    }
  };

  // Expose public API
  window.lazyLoad = {
    pause: () => {
      Object.values(observers).forEach(obs => obs.disconnect());
      mutationObserver.disconnect();
    },
    resume: () => {
      lazyLoadElements();
      mutationObserver.observe(document.body, { childList: true, subtree: true, signal });
    },
    cleanup,
    onLazyLoad: cb => customCallbacks.push(cb),
    clearState: () => {
      sessionStorage.removeItem("lazyLoadState");
      Object.keys(loadedState).forEach(key => delete loadedState[key]);
    },
    updateConfig: newConfig => {
      config = { ...config, ...newConfig };
      Object.values(observers).forEach(obs => obs.disconnect());
      observers.default.rootMargin = config.rootMargins.low;
      observers.script.rootMargin = config.rootMargins.low;
      observers.css.rootMargin = config.rootMargins.low;
      observers.font.rootMargin = config.rootMargins.low;
      lazyLoadElements();
    },
    exportMetrics: () => ({ ...metrics })
  };

  // Cleanup on page unload
  addListener(window, "beforeunload", cleanup);

  // Adjust config for slow connections
  if (navigator.connection && (navigator.connection.effectiveType === "2g" || navigator.connection.saveData)) {
    config.rootMargins.low = `${300 * deviceFactor}px`;
    config.rootMargins.medium = `${200 * deviceFactor}px`;
    config.rootMargins.high = `${100 * deviceFactor}px`;
    config.maxRetries = 1;
    lazyLoadElements();
  }

  // Log inline caching status
  if (config.enableSW && "caches" in window) {
    console.log("Inline caching enabled (Service Worker not required)");
  }

  // Request client hints for device capabilities
  const meta = document.createElement("meta");
  meta.name = "accept-ch";
  meta.content = "Device-Memory, Save-Data";
  document.head.appendChild(meta);
})();
