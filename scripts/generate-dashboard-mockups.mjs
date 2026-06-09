import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import WebSocket from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const outputDir = path.join(repoRoot, "public");

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
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
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

  socket.on("message", (data) => {
    const message = JSON.parse(data.toString());
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
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

  return {
    async ready() {
      await new Promise((resolve) => socket.on("open", resolve));
    },
    send,
    close() {
      socket.close();
    },
  };
}

function dashboardHtml() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        width: 1600px;
        height: 1000px;
        overflow: hidden;
        background:
          radial-gradient(circle at 20% 20%, rgba(245,238,48,.14), transparent 28%),
          radial-gradient(circle at 86% 80%, rgba(245,238,48,.08), transparent 26%),
          #030303;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #fff;
      }
      .stage {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 70px;
      }
      .shell {
        width: 1460px;
        height: 820px;
        display: grid;
        grid-template-columns: 230px 1fr;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 22px;
        background: #101010;
        box-shadow: 0 38px 110px rgba(0,0,0,.78), 0 0 70px rgba(245,238,48,.10);
      }
      .sidebar {
        padding: 34px 28px;
        border-right: 1px solid rgba(255,255,255,.08);
        background: linear-gradient(180deg, #151515, #090909);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 36px;
      }
      .brand-mark {
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border-radius: 9px;
        background: #F5EE30;
        color: #050505;
        font-weight: 950;
        letter-spacing: -.08em;
        font-size: 24px;
      }
      .brand-text {
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: .08em;
        font-size: 18px;
        line-height: 1.05;
      }
      .nav {
        display: grid;
        gap: 10px;
      }
      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        height: 46px;
        padding: 0 14px;
        color: rgba(255,255,255,.64);
        border-radius: 10px;
        font-size: 15px;
        font-weight: 750;
      }
      .nav-item.active {
        background: rgba(245,238,48,.16);
        color: #F5EE30;
        border-left: 4px solid #F5EE30;
      }
      .dot {
        width: 15px;
        height: 15px;
        border-radius: 4px;
        border: 2px solid currentColor;
        opacity: .88;
      }
      .main {
        padding: 34px;
        background:
          linear-gradient(180deg, rgba(255,255,255,.035), transparent 38%),
          #0B0B0B;
      }
      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 28px;
      }
      .eyebrow {
        color: rgba(255,255,255,.58);
        font-size: 16px;
        font-weight: 700;
      }
      h1 {
        margin: 2px 0 0;
        font-size: 31px;
        letter-spacing: -.02em;
      }
      .top-actions {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .search {
        width: 250px;
        height: 44px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 10px;
        background: rgba(255,255,255,.06);
        color: rgba(255,255,255,.54);
        display: flex;
        align-items: center;
        padding: 0 16px;
        font-weight: 650;
      }
      .avatar {
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ffe56f, #9b6b2b);
        border: 3px solid rgba(255,255,255,.18);
      }
      .projects {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 18px;
        margin-bottom: 24px;
      }
      .project {
        min-height: 152px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 15px;
        background: rgba(255,255,255,.055);
        padding: 20px;
      }
      .project.hot {
        background: #F5EE30;
        color: #050505;
      }
      .project-title {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 18px;
        font-weight: 900;
      }
      .progress {
        height: 9px;
        border-radius: 999px;
        margin: 18px 0 17px;
        background: rgba(255,255,255,.14);
        overflow: hidden;
      }
      .hot .progress { background: rgba(0,0,0,.20); }
      .bar {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: #F5EE30;
      }
      .hot .bar { background: #050505; }
      .project-meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        font-size: 13px;
        color: rgba(255,255,255,.66);
        font-weight: 700;
      }
      .hot .project-meta { color: rgba(0,0,0,.68); }
      .dashboard-grid {
        display: grid;
        grid-template-columns: 1.34fr .8fr;
        gap: 18px;
      }
      .panel {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 15px;
        background: rgba(255,255,255,.055);
        padding: 20px;
      }
      .panel h2 {
        margin: 0 0 14px;
        font-size: 18px;
        text-transform: uppercase;
        letter-spacing: .08em;
        color: rgba(255,255,255,.78);
      }
      .chart {
        height: 214px;
        position: relative;
        border-radius: 12px;
        background: linear-gradient(180deg, rgba(245,238,48,.08), rgba(255,255,255,.02));
        overflow: hidden;
      }
      .chart svg {
        position: absolute;
        inset: 0;
      }
      .finance {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .metric {
        border-bottom: 1px solid rgba(255,255,255,.1);
        padding-bottom: 15px;
      }
      .metric-label {
        color: rgba(255,255,255,.50);
        font-size: 14px;
        font-weight: 750;
      }
      .metric-value {
        margin-top: 5px;
        font-size: 28px;
        font-weight: 950;
      }
      .green { color: #9CFF8F; }
      .team-row {
        display: flex;
        justify-content: space-between;
        gap: 14px;
      }
      .person {
        text-align: center;
        font-size: 13px;
        color: rgba(255,255,255,.62);
        font-weight: 700;
      }
      .face {
        width: 62px;
        height: 62px;
        margin: 0 auto 9px;
        border-radius: 50%;
        border: 3px solid rgba(255,255,255,.12);
        background: linear-gradient(135deg, #f7d9b5, #724332);
        position: relative;
      }
      .face::after {
        content: "";
        position: absolute;
        right: 1px;
        bottom: 2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #4CEA76;
        border: 3px solid #101010;
      }
      .status-grid {
        display: grid;
        grid-template-columns: .84fr 1fr;
        gap: 18px;
        margin-top: 18px;
      }
      .donut {
        width: 142px;
        height: 142px;
        border-radius: 50%;
        background: conic-gradient(#F5EE30 0 42%, #f4f4f4 42% 64%, rgba(255,255,255,.16) 64% 100%);
        margin: 8px auto;
        position: relative;
      }
      .donut::after {
        content: "";
        position: absolute;
        inset: 34px;
        border-radius: 50%;
        background: #111;
      }
      .activity {
        display: grid;
        gap: 12px;
      }
      .activity-item {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255,255,255,.08);
        color: rgba(255,255,255,.68);
        font-weight: 700;
        font-size: 14px;
      }
      .assistant {
        margin-top: 18px;
        border: 1px solid rgba(245,238,48,.35);
        border-radius: 14px;
        background: rgba(245,238,48,.08);
        padding: 16px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: rgba(255,255,255,.82);
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    <div class="stage">
      <div class="shell">
        <aside class="sidebar">
          <div class="brand">
            <div class="brand-mark">DC</div>
            <div class="brand-text">Agency<br />OS</div>
          </div>
          <div class="nav">
            <div class="nav-item active"><span class="dot"></span>Dashboard</div>
            <div class="nav-item"><span class="dot"></span>Projects</div>
            <div class="nav-item"><span class="dot"></span>Finance</div>
            <div class="nav-item"><span class="dot"></span>Team</div>
            <div class="nav-item"><span class="dot"></span>AI Assistant</div>
            <div class="nav-item"><span class="dot"></span>Reports</div>
          </div>
        </aside>
        <main class="main">
          <div class="topbar">
            <div>
              <div class="eyebrow">Agency Overview</div>
              <h1>Welcome back, Sarah</h1>
            </div>
            <div class="top-actions">
              <div class="search">Search projects, tasks, reports</div>
              <div class="avatar"></div>
            </div>
          </div>
          <section class="projects">
            <article class="project hot">
              <div class="project-title"><span>Nebula App</span><span>75%</span></div>
              <div class="progress"><span class="bar" style="width:75%"></span></div>
              <div class="project-meta"><span>28 tasks</span><span>8 members</span><span>Due Oct 28</span><span>Active</span></div>
            </article>
            <article class="project">
              <div class="project-title"><span>Quantum Web</span><span>40%</span></div>
              <div class="progress"><span class="bar" style="width:40%"></span></div>
              <div class="project-meta"><span>15 tasks</span><span>5 members</span><span>Due Nov 15</span><span>Review</span></div>
            </article>
            <article class="project">
              <div class="project-title"><span>Solar Rebrand</span><span>95%</span></div>
              <div class="progress"><span class="bar" style="width:95%"></span></div>
              <div class="project-meta"><span>42 tasks</span><span>10 members</span><span>Due Oct 10</span><span>Launch</span></div>
            </article>
            <article class="project">
              <div class="project-title"><span>Luna Marketing</span><span>60%</span></div>
              <div class="progress"><span class="bar" style="width:60%"></span></div>
              <div class="project-meta"><span>20 tasks</span><span>6 members</span><span>Due Nov 05</span><span>Active</span></div>
            </article>
          </section>
          <section class="dashboard-grid">
            <article class="panel">
              <h2>Finance Overview</h2>
              <div class="chart">
                <svg viewBox="0 0 760 214" preserveAspectRatio="none">
                  <path d="M0 170 C90 130 128 120 190 150 C260 188 318 98 390 122 C462 145 506 54 575 82 C642 106 674 72 760 28" fill="none" stroke="#F5EE30" stroke-width="8" stroke-linecap="round" />
                  <path d="M0 170 C90 130 128 120 190 150 C260 188 318 98 390 122 C462 145 506 54 575 82 C642 106 674 72 760 28 L760 214 L0 214 Z" fill="rgba(245,238,48,.10)" />
                </svg>
              </div>
            </article>
            <article class="panel">
              <h2>Revenue & Invoices</h2>
              <div class="finance">
                <div class="metric"><div class="metric-label">Monthly revenue</div><div class="metric-value">$54.2K</div><div class="green">+12%</div></div>
                <div class="metric"><div class="metric-label">Expenses</div><div class="metric-value">$18.8K</div><div class="green">-4%</div></div>
                <div class="metric"><div class="metric-label">Net profit</div><div class="metric-value">$35.4K</div><div class="green">+16%</div></div>
                <div class="metric"><div class="metric-label">Pending invoices</div><div class="metric-value">08</div><div class="green">2 due today</div></div>
              </div>
            </article>
          </section>
          <section class="status-grid">
            <article class="panel">
              <h2>Team Overview</h2>
              <div class="team-row">
                <div class="person"><div class="face"></div>Sarah<br />Online</div>
                <div class="person"><div class="face"></div>James<br />Away</div>
                <div class="person"><div class="face"></div>Aisha<br />17 minutes</div>
                <div class="person"><div class="face"></div>Michael<br />5 days ago</div>
                <div class="person"><div class="face"></div>Chloe<br />Recent</div>
              </div>
            </article>
            <article class="panel">
              <h2>Task Status</h2>
              <div class="dashboard-grid" style="grid-template-columns: 170px 1fr; gap: 22px;">
                <div class="donut"></div>
                <div class="activity">
                  <div class="activity-item"><span>Pending</span><strong>64</strong></div>
                  <div class="activity-item"><span>Done</span><strong>132</strong></div>
                  <div class="activity-item"><span>Total</span><strong>196</strong></div>
                </div>
              </div>
              <div class="assistant">AI Assistant ready <span>Ask</span></div>
            </article>
          </section>
        </main>
      </div>
    </div>
  </body>
</html>`;
}

async function captureMockup(client, width, height, outputName) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.send("Page.navigate", {
    url: `data:text/html;charset=utf-8,${encodeURIComponent(dashboardHtml())}`,
  });
  await sleep(1200);
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "webp",
    quality: 92,
    captureBeyondViewport: false,
    fromSurface: true,
  });
  const filePath = path.join(outputDir, outputName);
  await fs.writeFile(filePath, Buffer.from(screenshot.data, "base64"));
  return filePath;
}

async function main() {
  const chromePath = await findChrome();
  const port = 9400 + Math.floor(Math.random() * 400);
  const userDataDir = path.join(process.env.TEMP || outputDir, `dc-dashboard-chrome-${Date.now()}`);
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    "--window-size=1600,1000",
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

    const mainMockup = await captureMockup(client, 1600, 1000, "dashboard-mockup-1600-q92.webp");
    const serviceMockup = await captureMockup(client, 1200, 860, "dashboard-mockup-service-1200-q92.webp");
    client.close();
    console.log(JSON.stringify({ ok: true, mainMockup, serviceMockup }, null, 2));
  } finally {
    chrome.kill();
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
