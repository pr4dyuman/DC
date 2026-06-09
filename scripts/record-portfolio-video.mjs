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

function frameCursor(x = width * 0.72, y = height * 0.18, click = false) {
  return {
    cursorX: Math.round(clamp(x, 22, width - 22)),
    cursorY: Math.round(clamp(y, 22, height - 22)),
    click,
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

async function captureScroll(client, frames, frameCount, maxScrollCap, cursor) {
  const pageInfo = await evaluate(
    client,
    `(() => ({
      maxScroll: Math.max(0, Math.min(${maxScrollCap}, document.documentElement.scrollHeight - window.innerHeight))
    }))()`,
  );
  const maxScroll = pageInfo?.maxScroll || 0;

  for (let index = 0; index < frameCount; index += 1) {
    const progress = frameCount <= 1 ? 0 : index / (frameCount - 1);
    const y = Math.round(maxScroll * easeInOut(progress));
    await evaluate(client, `window.scrollTo({ top: ${y}, behavior: "instant" })`);
    await sleep(80);
    await captureFrame(client, frames, cursor);
  }
}

async function selectorCenter(client, selector, fallback = frameCursor()) {
  return evaluate(
    client,
    `(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return ${JSON.stringify(fallback)};
      const rect = node.getBoundingClientRect();
      return {
        cursorX: Math.round(rect.left + rect.width / 2),
        cursorY: Math.round(rect.top + rect.height / 2)
      };
    })()`,
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

async function clickSelector(client, frames, selector, cursor, expectedPath) {
  const destination = await selectorCenter(client, selector, cursor);
  await moveCursor(client, frames, cursor, destination, 10);
  const clickCursor = frameCursor(destination.cursorX, destination.cursorY, true);
  await captureHold(client, frames, 5, clickCursor);
  await evaluate(
    client,
    `(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (node) node.click();
    })()`,
  );
  await sleep(2200);

  if (expectedPath) {
    const currentPath = await evaluate(client, "window.location.pathname");
    if (currentPath !== expectedPath) {
      await navigate(client, new URL(expectedPath, targetUrl).toString());
    }
  }

  return frameCursor(destination.cursorX, destination.cursorY);
}

async function clickVisibleLinkByHref(client, frames, href, cursor, expectedPath) {
  await evaluate(
    client,
    `(() => {
      const node = document.querySelector(${JSON.stringify(`a[href="${href}"]`)});
      if (node) node.scrollIntoView({ block: "center", inline: "center" });
    })()`,
  );
  await sleep(700);
  return clickSelector(client, frames, `a[href="${href}"]`, cursor, expectedPath);
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
        if (frame.click) {
          context.beginPath();
          context.arc(x + 6, y + 6, 30, 0, Math.PI * 2);
          context.strokeStyle = "rgba(245,238,48,.95)";
          context.lineWidth = 5;
          context.stroke();
          context.beginPath();
          context.arc(x + 6, y + 6, 18, 0, Math.PI * 2);
          context.fillStyle = "rgba(245,238,48,.22)";
          context.fill();
        }
        context.shadowColor = "rgba(0,0,0,.8)";
        context.shadowBlur = 6;
        context.shadowOffsetX = 1;
        context.shadowOffsetY = 2;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x, y + 34);
        context.lineTo(x + 9, y + 26);
        context.lineTo(x + 17, y + 43);
        context.lineTo(x + 25, y + 39);
        context.lineTo(x + 17, y + 23);
        context.lineTo(x + 31, y + 23);
        context.closePath();
        context.fillStyle = "#ffffff";
        context.fill();
        context.lineWidth = 2.5;
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
  await evaluate(client, "window.scrollTo(0, 0)");
  await sleep(900);
  const posterBase64 = await captureFrame(client, frames, cursor);
  await captureHold(client, frames, 20, cursor);
  await captureScroll(client, frames, 52, 1750, frameCursor(width * 0.82, height * 0.72));

  await evaluate(client, "window.scrollTo(0, 0)");
  await sleep(700);
  cursor = await clickSelector(client, frames, 'a[data-nav-path="/services"]', cursor, "/services");
  await captureHold(client, frames, 24, cursor);
  await captureScroll(client, frames, 48, 1550, frameCursor(width * 0.82, height * 0.72));

  cursor = await clickVisibleLinkByHref(client, frames, "/services/web-development", cursor, "/services/web-development");
  await captureHold(client, frames, 20, cursor);
  await captureScroll(client, frames, 46, 1700, frameCursor(width * 0.82, height * 0.72));

  await evaluate(client, "window.scrollTo(0, 0)");
  await sleep(700);
  cursor = await clickSelector(client, frames, 'a[data-nav-path="/blog"]', cursor, "/blog");
  await captureHold(client, frames, 24, cursor);
  await captureScroll(client, frames, 34, 1100, frameCursor(width * 0.82, height * 0.72));

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
    "--hide-scrollbars",
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
    await client.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const frames = [];
    const posterBase64 = await recordWalkthrough(client, frames);

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
