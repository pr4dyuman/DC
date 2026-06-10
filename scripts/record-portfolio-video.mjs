import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import WebSocket from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const targetUrl = process.argv[2] || "https://digitalcorvids.com";
const outputDir = path.resolve(repoRoot, process.argv[3] || "public/portfolio");
const slug = process.argv[4] || "digital-corvids-website";
const width = Number(process.argv[5] || 1280);
const height = Number(process.argv[6] || 800);
const fps = Number(process.argv[7] || 12);
const screenshotQuality = 88;
const videoBitrate = 6500000;
const ezyprepEmail = process.env.EZYPREP_EMAIL || "";
const ezyprepPassword = process.env.EZYPREP_PASSWORD || "";
const desktopUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findChrome() {
  for (const candidate of chromeCandidates) {
    if (await fileExists(candidate)) return candidate;
  }
  throw new Error("Chrome or Edge was not found. Set CHROME_PATH to a Chromium executable.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(port) {
  const url = `http://127.0.0.1:${port}/json`;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Chrome is still booting.
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools endpoint did not become ready.");
}

function createCdpClient(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const eventResolvers = new Map();

  socket.on("message", (data) => {
    const message = JSON.parse(data.toString());
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
      return;
    }

    if (message.method && eventResolvers.has(message.method)) {
      for (const resolve of eventResolvers.get(message.method)) {
        resolve(message);
      }
      eventResolvers.delete(message.method);
    }
  });

  function send(method, params = {}) {
    const callId = ++id;
    socket.send(JSON.stringify({ id: callId, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(callId, (message) => {
        if (message.error) reject(new Error(`${method}: ${message.error.message}`));
        else resolve(message.result);
      });
    });
  }

  function waitForEvent(method, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);

      const wrappedResolve = (message) => {
        clearTimeout(timeout);
        resolve(message);
      };

      if (!eventResolvers.has(method)) eventResolvers.set(method, []);
      eventResolvers.get(method).push(wrappedResolve);
    });
  }

  return {
    async ready() {
      await new Promise((resolve) => socket.on("open", resolve));
    },
    send,
    waitForEvent,
    close() {
      socket.close();
    },
  };
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function navigate(client, url) {
  const load = client.waitForEvent("Page.loadEventFired", 24000).catch(() => undefined);
  await client.send("Page.navigate", { url });
  await load;
  await sleep(1800);
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return result.result?.value;
}

function frameCursor(x = width * 0.72, y = height * 0.18, options = {}) {
  return {
    cursorX: Math.round(clamp(x, 22, width - 22)),
    cursorY: Math.round(clamp(y, 22, height - 22)),
    ...options,
  };
}

async function captureFrame(client, frames, options = {}) {
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "jpeg",
    quality: screenshotQuality,
    captureBeyondViewport: false,
    fromSurface: true,
  });
  frames.push({
    src: `data:image/jpeg;base64,${screenshot.data}`,
    ...options,
  });
  return screenshot.data;
}

async function captureHold(client, frames, count, cursor) {
  for (let index = 0; index < count; index += 1) {
    await captureFrame(client, frames, cursor);
    await sleep(65);
  }
}

async function captureScrollTo(client, frames, targetY, frameCount, cursor) {
  const startY = await evaluate(client, "window.scrollY");
  for (let index = 0; index < frameCount; index += 1) {
    const progress = frameCount <= 1 ? 1 : index / (frameCount - 1);
    const y = Math.round(startY + (targetY - startY) * easeInOut(progress));
    await evaluate(client, `window.scrollTo({ top: ${y}, behavior: "instant" })`);
    await sleep(70);
    await captureFrame(client, frames, cursor);
  }
}

async function captureScroll(client, frames, frameCount, maxScrollCap, cursor) {
  const pageInfo = await evaluate(
    client,
    `(() => ({
      maxScroll: Math.max(0, Math.min(${maxScrollCap}, document.documentElement.scrollHeight - window.innerHeight))
    }))()`,
  );
  const maxScroll = pageInfo?.maxScroll || 0;
  await captureScrollTo(client, frames, maxScroll, frameCount, cursor);
}

function visibleNodeExpression(selector, body) {
  return `(() => {
    const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
    const node = nodes.find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      const style = getComputedStyle(candidate);
      return rect.width > 2 &&
        rect.height > 2 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || 1) > 0;
    });
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    ${body}
  })()`;
}

async function selectorCenter(client, selector, fallback = frameCursor()) {
  const result = await evaluate(
    client,
    visibleNodeExpression(
      selector,
      `return {
        cursorX: Math.round(rect.left + rect.width / 2),
        cursorY: Math.round(rect.top + rect.height / 2)
      };`,
    ),
  );
  return result || fallback;
}

async function renderedNodeScrollTarget(client, selector) {
  return evaluate(
    client,
    visibleNodeExpression(
      selector,
      `return {
        targetY: Math.max(0, Math.round(window.scrollY + rect.top - (window.innerHeight - rect.height) / 2))
      };`,
    ),
  );
}

async function scrollRenderedNodeIntoView(client, frames, selector, cursor) {
  const result = await renderedNodeScrollTarget(client, selector);
  if (!result || typeof result.targetY !== "number") return false;
  await captureScrollTo(client, frames, result.targetY, 24, cursor);
  await captureHold(client, frames, 5, cursor);
  return true;
}

async function clickVisibleNode(client, selector) {
  return evaluate(
    client,
    visibleNodeExpression(
      selector,
      `node.click();
      return {
        clicked: true,
        text: (node.textContent || "").trim().slice(0, 80)
      };`,
    ),
  );
}

function visibleTextNodeExpression(text, body) {
  return `(() => {
    const expected = ${JSON.stringify(text.trim().toLowerCase())};
    const nodes = Array.from(document.querySelectorAll("a, button, [role='tab'], [role='button'], .tab-item"));
    const node = nodes.find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      const style = getComputedStyle(candidate);
      const candidateText = (candidate.textContent || "").trim().toLowerCase();
      return candidateText === expected &&
        rect.width > 2 &&
        rect.height > 2 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || 1) > 0;
    });
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    ${body}
  })()`;
}

async function visibleTextNodeCenter(client, text, fallback = frameCursor()) {
  const result = await evaluate(
    client,
    visibleTextNodeExpression(
      text,
      `return {
        cursorX: Math.round(rect.left + rect.width / 2),
        cursorY: Math.round(rect.top + rect.height / 2)
      };`,
    ),
  );
  return result || fallback;
}

async function clickVisibleTextNode(client, text) {
  return evaluate(
    client,
    visibleTextNodeExpression(
      text,
      `node.click();
      return {
        clicked: true,
        text: (node.textContent || "").trim().slice(0, 80)
      };`,
    ),
  );
}

async function moveCursor(client, frames, from, to, count = 10) {
  for (let index = 0; index < count; index += 1) {
    const progress = count <= 1 ? 1 : index / (count - 1);
    const eased = easeInOut(progress);
    const cursorX = from.cursorX + (to.cursorX - from.cursorX) * eased;
    const cursorY = from.cursorY + (to.cursorY - from.cursorY) * eased;
    await captureFrame(client, frames, frameCursor(cursorX, cursorY));
    await sleep(50);
  }
}

async function captureClickEffect(client, frames, destination) {
  const phases = [0, 0.12, 0.26, 0.42, 0.6, 0.78, 0.92, 1];
  for (const clickPhase of phases) {
    await captureFrame(
      client,
      frames,
      frameCursor(destination.cursorX, destination.cursorY, { clickPhase }),
    );
    await sleep(55);
  }
}

async function clickSelector(client, frames, selector, cursor, expectedPath) {
  const destination = await selectorCenter(client, selector, cursor);
  await moveCursor(client, frames, cursor, destination, 14);
  await captureHold(client, frames, 4, frameCursor(destination.cursorX, destination.cursorY, { hover: true }));
  await captureClickEffect(client, frames, destination);
  await clickVisibleNode(client, selector);
  await sleep(2200);

  if (expectedPath) {
    const currentPath = await evaluate(client, "window.location.pathname");
    if (currentPath !== expectedPath) {
      await navigate(client, new URL(expectedPath, targetUrl).toString());
    }
  }

  return frameCursor(destination.cursorX, destination.cursorY);
}

async function animateSelectorClick(client, frames, selector, cursor) {
  const destination = await selectorCenter(client, selector, cursor);
  await moveCursor(client, frames, cursor, destination, 14);
  await captureHold(
    client,
    frames,
    4,
    frameCursor(destination.cursorX, destination.cursorY, { hover: true }),
  );
  await captureClickEffect(client, frames, destination);
  return frameCursor(destination.cursorX, destination.cursorY);
}

async function clickTextNode(client, frames, text, cursor) {
  const destination = await visibleTextNodeCenter(client, text, cursor);
  await moveCursor(client, frames, cursor, destination, 14);
  await captureHold(
    client,
    frames,
    4,
    frameCursor(destination.cursorX, destination.cursorY, { hover: true }),
  );
  await captureClickEffect(client, frames, destination);
  await clickVisibleTextNode(client, text);
  await sleep(2600);
  return frameCursor(destination.cursorX, destination.cursorY);
}

async function waitForPath(client, expectedPath, fallbackUrl) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const currentPath = await evaluate(client, "window.location.pathname");
    if (currentPath === expectedPath) return;
    await sleep(300);
  }

  await navigate(client, fallbackUrl);
  await sleep(2200);
}

async function clickEzyPrepTab(client, frames, tab, expectedPath, cursor) {
  const nextCursor = await clickTextNode(client, frames, tab, cursor);
  await waitForPath(client, expectedPath, new URL(expectedPath, targetUrl).toString());
  await sleep(900);
  return nextCursor;
}

async function clickVisibleLinkByHref(client, frames, href, cursor, expectedPath) {
  const selector = `a[href="${href}"]`;
  await scrollRenderedNodeIntoView(client, frames, selector, cursor);
  return clickSelector(client, frames, selector, cursor, expectedPath);
}

async function dismissTransientAlerts(client) {
  await evaluate(
    client,
    `(() => {
      const styleId = "dc-capture-cleanup";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = \`
          [role="alert"],
          .Toastify,
          .Toastify__toast-container,
          [class*="toast-container"],
          [class*="ToastContainer"],
          [class*="toaster"],
          [class*="Toaster"] {
            display: none !important;
          }
        \`;
        document.head.appendChild(style);
      }
      const selectors = [
        '[role="alert"]',
        '.Toastify',
        '.Toastify__toast-container',
        '[class*="toast-container"]',
        '[class*="ToastContainer"]',
        '[class*="toaster"]',
        '[class*="Toaster"]'
      ];
      for (const selector of selectors) {
        for (const node of document.querySelectorAll(selector)) node.remove();
      }
      const cleanup = () => {
        for (const node of document.querySelectorAll('body *')) {
          const text = (node.textContent || '').trim();
          if (text === 'Network error. Please check your connection.') {
            (node.closest('[role="alert"]') || node.parentElement || node).remove();
          }
        }
      };
      cleanup();
      if (!window.__dcCaptureCleanupObserver) {
        window.__dcCaptureCleanupObserver = new MutationObserver(cleanup);
        window.__dcCaptureCleanupObserver.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
      return true;
    })()`,
  );
}

async function getCapturePageState(client) {
  return evaluate(
    client,
    `(() => ({
      text: (document.body?.innerText || "").trim().slice(0, 500),
      textLength: (document.body?.innerText || "").trim().length,
      imageCount: document.images?.length || 0,
      linkCount: document.links?.length || 0
    }))()`,
  );
}

function isHealthyCaptureState(state) {
  const isErrorState =
    !state ||
    state.text.startsWith("Oops, there is an error!") ||
    state.text.includes("Try again?");

  return (
    !isErrorState &&
    state.textLength > 100 &&
    state.imageCount > 2 &&
    state.linkCount > 3
  );
}

async function ensureHealthyPage(client, url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const state = await getCapturePageState(client);
    if (isHealthyCaptureState(state)) return;

    await navigate(client, url);
    await sleep(2500);
  }

  throw new Error(`The page at ${url} stayed in an error state; capture aborted.`);
}

async function loadCleanHealthyPage(client, url) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await navigate(client, url);
    await sleep(4200);
    await dismissTransientAlerts(client);
    const state = await getCapturePageState(client);
    if (isHealthyCaptureState(state)) return;
  }

  throw new Error(`The page at ${url} did not stay healthy for capture.`);
}

async function dismissDesignDwellersQuote(client) {
  const dismissed = await evaluate(
    client,
    `(() => {
      const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
      const closeButton = buttons.find((button) => {
        const rect = button.getBoundingClientRect();
        const text = (button.textContent || "").trim().toLowerCase();
        const label = (button.getAttribute("aria-label") || "").trim().toLowerCase();
        const looksClose = text === "x" ||
          text.charCodeAt(0) === 215 ||
          label.includes("close") ||
          label.includes("dismiss");

        return looksClose &&
          rect.width > 8 &&
          rect.height > 8 &&
          getComputedStyle(button).visibility !== "hidden";
      });

      if (closeButton) {
        closeButton.click();
        return true;
      }

      return false;
    })()`,
  );

  if (dismissed) await sleep(450);
}

async function loadDesignDwellersPage(client, pathOrUrl) {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : new URL(pathOrUrl, targetUrl).toString();

  await loadCleanHealthyPage(client, url);
  await dismissDesignDwellersQuote(client);
  await evaluate(client, "window.scrollTo(0, 0)");
  await sleep(700);
}

async function viewportClick(client, point) {
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.cursorX,
    y: point.cursorY,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.cursorX,
    y: point.cursorY,
    button: "left",
    clickCount: 1,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.cursorX,
    y: point.cursorY,
    button: "left",
    clickCount: 1,
  });
}

async function requiredSelectorCenter(client, selector) {
  const result = await evaluate(
    client,
    visibleNodeExpression(
      selector,
      `return {
        cursorX: Math.round(rect.left + rect.width / 2),
        cursorY: Math.round(rect.top + rect.height / 2)
      };`,
    ),
  );

  if (!result) throw new Error(`Could not find visible selector: ${selector}`);
  return result;
}

async function typeIntoSelector(client, selector, text) {
  const center = await requiredSelectorCenter(client, selector);
  await viewportClick(client, center);
  await client.send("Input.insertText", { text });
  await sleep(400);
}

async function getPageSummary(client) {
  return evaluate(
    client,
    `(() => ({
      href: location.href,
      path: location.pathname,
      text: (document.body?.innerText || "").trim().slice(0, 1600)
    }))()`,
  );
}

function isEzyPrepEditorReady(summary) {
  return Boolean(
    summary?.text?.includes("The Last Horizon") &&
      summary?.text?.includes("Script") &&
      summary?.path?.includes("/editor/demo/script"),
  );
}

async function loginToEzyPrepEditor(client) {
  if (!ezyprepEmail || !ezyprepPassword) {
    throw new Error("Set EZYPREP_EMAIL and EZYPREP_PASSWORD before recording EzyPrep.");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await navigate(client, targetUrl);
    await sleep(3500);

    let summary = await getPageSummary(client);
    if (isEzyPrepEditorReady(summary)) return;

    if (!summary.path.includes("/signin")) {
      await navigate(client, new URL("/signin", targetUrl).toString());
      await sleep(2500);
    }

    await typeIntoSelector(client, 'input[type="email"]', ezyprepEmail);
    await typeIntoSelector(client, 'input[type="password"]', ezyprepPassword);

    const signInCenter = await visibleTextNodeCenter(client, "Sign In");
    await viewportClick(client, signInCenter);
    await sleep(8500);

    await navigate(client, targetUrl);
    await sleep(4500);
    summary = await getPageSummary(client);
    if (isEzyPrepEditorReady(summary)) return;
  }

  throw new Error("EzyPrep login succeeded neither through redirect nor direct demo route.");
}

async function encodeWebm(client, frames) {
  const expression = `
    (async () => {
      const frames = ${JSON.stringify(frames)};
      const width = ${width};
      const height = ${height};
      const fps = ${fps};
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      document.body.innerHTML = "";
      document.body.style.margin = "0";
      document.body.appendChild(canvas);
      const context = canvas.getContext("2d");
      const stream = canvas.captureStream(fps);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm;codecs=vp8";
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: ${videoBitrate},
      });
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) chunks.push(event.data);
      };
      const stopped = new Promise((resolve) => {
        recorder.onstop = resolve;
      });
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const loadImage = (source) => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = source;
      });
      const drawCursor = (frame) => {
        if (typeof frame.cursorX !== "number" || typeof frame.cursorY !== "number") return;
        const x = frame.cursorX;
        const y = frame.cursorY;
        context.save();
        context.beginPath();
        context.arc(x + 7, y + 8, frame.hover ? 22 : 17, 0, Math.PI * 2);
        context.fillStyle = frame.hover ? "rgba(245,238,48,.18)" : "rgba(245,238,48,.10)";
        context.fill();
        context.strokeStyle = frame.hover ? "rgba(245,238,48,.75)" : "rgba(245,238,48,.38)";
        context.lineWidth = frame.hover ? 2.5 : 1.5;
        context.stroke();

        if (typeof frame.clickPhase === "number") {
          const phase = frame.clickPhase;
          const radius = 16 + phase * 34;
          context.beginPath();
          context.arc(x + 7, y + 8, radius, 0, Math.PI * 2);
          context.strokeStyle = \`rgba(245,238,48,\${0.95 - phase * 0.82})\`;
          context.lineWidth = 5 - phase * 2.5;
          context.stroke();

          context.beginPath();
          context.arc(x + 7, y + 8, Math.max(8, 17 - phase * 7), 0, Math.PI * 2);
          context.fillStyle = \`rgba(245,238,48,\${0.32 - phase * 0.2})\`;
          context.fill();
        }

        context.shadowColor = "rgba(245,238,48,.42)";
        context.shadowBlur = 8;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + 1, y + 32);
        context.lineTo(x + 10, y + 24);
        context.lineTo(x + 18, y + 41);
        context.lineTo(x + 27, y + 37);
        context.lineTo(x + 18, y + 21);
        context.lineTo(x + 32, y + 20);
        context.closePath();
        context.fillStyle = "#F5EE30";
        context.fill();
        context.lineWidth = 3;
        context.strokeStyle = "#050505";
        context.stroke();
        context.restore();
      };

      recorder.start();
      for (const frame of frames) {
        const image = await loadImage(frame.src);
        context.fillStyle = "#000";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        drawCursor(frame);
        await wait(1000 / fps);
      }
      await wait(240);
      recorder.stop();
      await stopped;
      const blob = new Blob(chunks, { type: mimeType });
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    })()
  `;

  const dataUrl = await evaluate(client, expression);
  if (!dataUrl?.startsWith("data:video/webm")) {
    throw new Error("Chrome did not return a WebM data URL.");
  }
  return dataUrl.split(",")[1];
}

async function recordWalkthrough(client, frames) {
  let cursor = frameCursor(width * 0.72, height * 0.16);

  await navigate(client, targetUrl);
  await ensureHealthyPage(client, targetUrl);
  await evaluate(client, "window.scrollTo(0, 0)");
  await sleep(900);
  const posterBase64 = await captureFrame(client, frames, cursor);
  await captureHold(client, frames, 20, cursor);
  await captureScroll(client, frames, 52, 1750, frameCursor(width * 0.82, height * 0.72));

  cursor = frameCursor(width * 0.82, height * 0.72);
  await captureScrollTo(client, frames, 0, 34, cursor);
  await captureHold(client, frames, 6, cursor);
  cursor = await clickSelector(client, frames, 'a[data-nav-path="/services"]', cursor, "/services");
  await captureHold(client, frames, 24, cursor);
  await captureScroll(client, frames, 48, 1550, frameCursor(width * 0.82, height * 0.72));

  cursor = await clickVisibleLinkByHref(client, frames, "/services/web-development", cursor, "/services/web-development");
  await captureHold(client, frames, 20, cursor);
  await captureScroll(client, frames, 46, 1700, frameCursor(width * 0.82, height * 0.72));

  cursor = frameCursor(width * 0.82, height * 0.72);
  await captureScrollTo(client, frames, 0, 34, cursor);
  await captureHold(client, frames, 6, cursor);
  cursor = await clickSelector(client, frames, 'a[data-nav-path="/blog"]', cursor, "/blog");
  await captureHold(client, frames, 24, cursor);
  await captureScroll(client, frames, 34, 1100, frameCursor(width * 0.82, height * 0.72));

  return posterBase64;
}

async function recordDriftingWoodWalkthrough(client, frames) {
  let cursor = frameCursor(width * 0.82, height * 0.72);
  const shopPath = "/shop";
  const collectionPath = "/collection";

  await loadCleanHealthyPage(client, targetUrl);
  await evaluate(client, "window.scrollTo(0, 0)");
  await sleep(900);
  const posterBase64 = await captureFrame(client, frames, cursor);
  await captureHold(client, frames, 18, cursor);
  await captureScrollTo(client, frames, 950, 36, cursor);
  await captureHold(client, frames, 8, cursor);
  await captureScrollTo(client, frames, 2100, 36, cursor);
  await captureHold(client, frames, 8, cursor);

  await captureScrollTo(client, frames, 0, 28, cursor);
  await captureHold(client, frames, 5, cursor);
  cursor = await animateSelectorClick(client, frames, `a[href="${shopPath}"]`, cursor);
  await loadCleanHealthyPage(client, new URL(shopPath, targetUrl).toString());
  await captureHold(client, frames, 18, cursor);
  cursor = frameCursor(width * 0.84, height * 0.72);
  await captureScrollTo(client, frames, 620, 34, cursor);
  await captureHold(client, frames, 12, cursor);

  await captureScrollTo(client, frames, 0, 28, cursor);
  cursor = await animateSelectorClick(
    client,
    frames,
    `a[href="${collectionPath}"]`,
    cursor,
  );
  await loadCleanHealthyPage(client, new URL(collectionPath, targetUrl).toString());
  await captureHold(client, frames, 18, cursor);
  cursor = frameCursor(width * 0.84, height * 0.72);
  await captureScrollTo(client, frames, 1250, 34, cursor);
  await captureHold(client, frames, 10, cursor);

  return posterBase64;
}

async function recordDesignDwellersWalkthrough(client, frames) {
  let cursor = frameCursor(width * 0.82, height * 0.72);

  await loadDesignDwellersPage(client, targetUrl);
  const posterBase64 = await captureFrame(client, frames, cursor);
  await captureHold(client, frames, 12, cursor);
  await captureScrollTo(client, frames, 1050, 24, cursor);
  await captureHold(client, frames, 5, cursor);
  await captureScrollTo(client, frames, 2200, 24, cursor);
  await captureHold(client, frames, 5, cursor);

  await captureScrollTo(client, frames, 0, 18, cursor);
  await captureHold(client, frames, 4, cursor);
  cursor = await animateSelectorClick(client, frames, 'a[href="/portfolio"]', cursor);
  await loadDesignDwellersPage(client, "/portfolio");
  await captureHold(client, frames, 12, cursor);
  cursor = frameCursor(width * 0.84, height * 0.72);
  await captureScrollTo(client, frames, 1100, 24, cursor);
  await captureHold(client, frames, 5, cursor);
  await captureScrollTo(client, frames, 2350, 22, cursor);
  await captureHold(client, frames, 5, cursor);

  await captureScrollTo(client, frames, 0, 18, cursor);
  await captureHold(client, frames, 4, cursor);
  cursor = await animateSelectorClick(client, frames, 'a[href="/service"]', cursor);
  await loadDesignDwellersPage(client, "/service");
  await captureHold(client, frames, 12, cursor);
  cursor = frameCursor(width * 0.84, height * 0.72);
  await captureScrollTo(client, frames, 1350, 24, cursor);
  await captureHold(client, frames, 7, cursor);

  await captureScrollTo(client, frames, 0, 18, cursor);
  await captureHold(client, frames, 4, cursor);
  cursor = await animateSelectorClick(client, frames, 'a[href="/contact"]', cursor);
  await loadDesignDwellersPage(client, "/contact");
  await captureHold(client, frames, 14, cursor);
  cursor = frameCursor(width * 0.84, height * 0.72);
  await captureScrollTo(client, frames, 900, 20, cursor);
  await captureHold(client, frames, 7, cursor);

  return posterBase64;
}

async function recordEzyPrepWalkthrough(client, frames) {
  let cursor = frameCursor(width * 0.83, height * 0.72);

  await loginToEzyPrepEditor(client);
  await evaluate(client, "window.scrollTo(0, 0)");
  await sleep(1300);

  const posterBase64 = await captureFrame(client, frames, cursor);
  await captureHold(client, frames, 24, cursor);

  const tabs = [
    ["Storyboard", "/editor/demo/storyboard"],
    ["Scheduling", "/editor/demo/scheduling"],
    ["DOOD", "/editor/demo/dood"],
  ];

  for (const [tab, expectedPath] of tabs) {
    cursor = await clickEzyPrepTab(client, frames, tab, expectedPath, cursor);
    await captureHold(client, frames, 32, cursor);
  }

  cursor = await clickEzyPrepTab(client, frames, "Script", "/editor/demo/script", cursor);
  await captureHold(client, frames, 18, cursor);

  return posterBase64;
}

async function main() {
  const chromePath = await findChrome();
  const port = 9233 + Math.floor(Math.random() * 400);
  const userDataDir = path.join(process.env.TEMP || outputDir, `dc-portfolio-chrome-${Date.now()}`);

  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-blink-features=AutomationControlled",
    "--hide-scrollbars",
    "--lang=en-US",
    `--user-agent=${desktopUserAgent}`,
    `--remote-debugging-port=${port}`,
    `--window-size=${width},${height}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ], {
    stdio: "ignore",
    windowsHide: true,
  });

  try {
    const targets = await waitForJson(port);
    const page = targets.find((target) => target.type === "page");
    if (!page) throw new Error("No Chrome page target was available.");

    const client = createCdpClient(page.webSocketDebuggerUrl);
    await client.ready();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");
    await client.send("Network.setUserAgentOverride", {
      userAgent: desktopUserAgent,
      acceptLanguage: "en-US,en;q=0.9",
      platform: "Windows",
    });
    await client.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const frames = [];
    const targetHost = new URL(targetUrl).hostname;
    let posterBase64;

    if (targetHost.includes("driftingwood")) {
      posterBase64 = await recordDriftingWoodWalkthrough(client, frames);
    } else if (targetHost.includes("design-dwellers")) {
      posterBase64 = await recordDesignDwellersWalkthrough(client, frames);
    } else if (targetHost.includes("ezyprep")) {
      posterBase64 = await recordEzyPrepWalkthrough(client, frames);
    } else {
      posterBase64 = await recordWalkthrough(client, frames);
    }

    await client.send("Emulation.setScriptExecutionDisabled", { value: false });
    await navigate(client, "about:blank");
    const webmBase64 = await encodeWebm(client, frames);

    await fs.mkdir(outputDir, { recursive: true });
    const videoPath = path.join(outputDir, `${slug}.webm`);
    const posterPath = path.join(outputDir, `${slug}-poster.jpg`);
    await fs.writeFile(videoPath, Buffer.from(webmBase64, "base64"));
    await fs.writeFile(posterPath, Buffer.from(posterBase64, "base64"));

    client.close();
    console.log(JSON.stringify({
      ok: true,
      targetUrl,
      frames: frames.length,
      seconds: Number((frames.length / fps).toFixed(1)),
      resolution: `${width}x${height}`,
      fps,
      videoPath,
      posterPath,
    }, null, 2));
  } finally {
    chrome.kill();
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
