export function renderUiHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenClaw Session Platform</title>
    <link rel="stylesheet" href="/ui/styles.css" />
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <p class="eyebrow">OpenClaw Session Platform</p>
        <h1>Tenant Runtime Console</h1>
        <p class="lede">
          Minimal browser UI for preparing runtimes, checking readiness, sending chat messages,
          and inspecting session history.
        </p>
      </section>

      <section class="panel controls">
        <div class="field-grid">
          <label class="field">
            <span>Tenant ID</span>
            <input id="tenantId" type="text" placeholder="alex-demo" />
          </label>
          <label class="field">
            <span>Session Key</span>
            <input id="sessionKey" type="text" value="main" />
          </label>
        </div>

        <div class="button-row">
          <button id="prepareBtn" type="button">Prepare</button>
          <button id="startBtn" type="button">Start</button>
          <button id="statusBtn" type="button">Refresh Status</button>
          <button id="stopBtn" type="button" class="danger">Stop</button>
          <button id="historyBtn" type="button" class="secondary">Load History</button>
        </div>
      </section>

      <section class="grid">
        <article class="panel">
          <div class="panel-head">
            <h2>Runtime Status</h2>
            <span id="statusBadge" class="badge">idle</span>
          </div>
          <pre id="statusOutput" class="output">No runtime request yet.</pre>
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2>Request Log</h2>
            <span id="requestBadge" class="badge muted">waiting</span>
          </div>
          <pre id="requestOutput" class="output">No requests yet.</pre>
        </article>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Chat</h2>
          <span class="muted-label">Uses <code>/openclaw/chat/send</code> and <code>/chat/history</code></span>
        </div>
        <label class="field">
          <span>Message</span>
          <textarea id="messageInput" rows="5" placeholder="Ask something in the current session."></textarea>
        </label>
        <div class="button-row">
          <button id="sendBtn" type="button">Send Message</button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Session History</h2>
          <span id="historyBadge" class="badge muted">empty</span>
        </div>
        <pre id="historyOutput" class="output">No history loaded.</pre>
      </section>
    </main>
    <script type="module" src="/ui/app.js"></script>
  </body>
</html>`;
}

export const uiStylesCss = `:root {
  --bg: #f2ecdf;
  --bg-strong: #e5dac6;
  --panel: rgba(255, 252, 245, 0.86);
  --panel-border: rgba(68, 49, 27, 0.18);
  --ink: #20160e;
  --muted: #6f5d4b;
  --accent: #9f3d22;
  --accent-strong: #7d2711;
  --accent-soft: #ead2c9;
  --ok: #215f45;
  --warn: #7b5b10;
  --danger: #7e1d1d;
  --shadow: 0 18px 40px rgba(57, 37, 18, 0.12);
  --radius: 18px;
  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  color: var(--ink);
  background:
    radial-gradient(circle at top left, rgba(159, 61, 34, 0.16), transparent 28%),
    radial-gradient(circle at top right, rgba(33, 95, 69, 0.15), transparent 24%),
    linear-gradient(180deg, var(--bg), #efe6d6 52%, #e8dcc8);
}

.shell {
  width: min(1120px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 32px 0 56px;
}

.hero {
  padding: 12px 4px 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--accent);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin: 0;
}

h1,
h2 {
  font-family: "IBM Plex Serif", Georgia, serif;
}

h1 {
  font-size: clamp(2rem, 6vw, 3.8rem);
  line-height: 0.96;
  max-width: 12ch;
}

.lede {
  max-width: 64ch;
  margin-top: 14px;
  color: var(--muted);
  line-height: 1.5;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.panel {
  backdrop-filter: blur(6px);
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 18px;
}

.controls {
  margin-bottom: 18px;
}

.panel + .panel,
.grid + .panel,
.panel + .grid {
  margin-top: 18px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field {
  display: grid;
  gap: 8px;
}

.field span,
.muted-label {
  color: var(--muted);
  font-size: 0.92rem;
}

input,
textarea,
button {
  font: inherit;
}

input,
textarea {
  width: 100%;
  border: 1px solid rgba(68, 49, 27, 0.18);
  background: rgba(255, 255, 255, 0.76);
  color: var(--ink);
  border-radius: 14px;
  padding: 12px 14px;
}

textarea {
  resize: vertical;
  min-height: 132px;
}

input:focus,
textarea:focus,
button:focus {
  outline: 2px solid rgba(159, 61, 34, 0.25);
  outline-offset: 2px;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

button {
  border: 0;
  border-radius: 999px;
  padding: 11px 16px;
  color: #fff8f2;
  background: linear-gradient(180deg, var(--accent), var(--accent-strong));
  cursor: pointer;
  transition: transform 140ms ease, opacity 140ms ease;
}

button.secondary {
  color: var(--ink);
  background: linear-gradient(180deg, #efe6d8, #ded0bc);
}

button.danger {
  background: linear-gradient(180deg, #923030, #6e1616);
}

button:hover {
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.55;
  cursor: wait;
  transform: none;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 0.84rem;
  font-weight: 700;
}

.badge.ok {
  background: rgba(33, 95, 69, 0.14);
  color: var(--ok);
}

.badge.warn {
  background: rgba(123, 91, 16, 0.14);
  color: var(--warn);
}

.badge.error {
  background: rgba(126, 29, 29, 0.14);
  color: var(--danger);
}

.badge.muted {
  background: rgba(111, 93, 75, 0.12);
  color: var(--muted);
}

.output {
  margin: 0;
  min-height: 200px;
  border-radius: 16px;
  padding: 14px;
  overflow: auto;
  background: rgba(38, 26, 16, 0.95);
  color: #f9f3ea;
  font-size: 0.9rem;
  line-height: 1.45;
}

code {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.92em;
}

@media (max-width: 820px) {
  .grid,
  .field-grid {
    grid-template-columns: 1fr;
  }

  .shell {
    width: min(100vw - 20px, 1120px);
    padding-top: 22px;
  }

  .panel {
    padding: 16px;
  }

  h1 {
    max-width: none;
  }
}`;

export const uiAppJs = `const tenantInput = document.getElementById("tenantId");
const sessionInput = document.getElementById("sessionKey");
const messageInput = document.getElementById("messageInput");

const statusOutput = document.getElementById("statusOutput");
const requestOutput = document.getElementById("requestOutput");
const historyOutput = document.getElementById("historyOutput");

const statusBadge = document.getElementById("statusBadge");
const requestBadge = document.getElementById("requestBadge");
const historyBadge = document.getElementById("historyBadge");

const buttons = {
  prepare: document.getElementById("prepareBtn"),
  start: document.getElementById("startBtn"),
  status: document.getElementById("statusBtn"),
  stop: document.getElementById("stopBtn"),
  history: document.getElementById("historyBtn"),
  send: document.getElementById("sendBtn")
};

function tenantId() {
  return tenantInput.value.trim();
}

function sessionKey() {
  return sessionInput.value.trim() || "main";
}

function requireTenant() {
  const value = tenantId();
  if (!value) {
    throw new Error("Tenant ID is required.");
  }
  return value;
}

function setBusy(busy) {
  Object.values(buttons).forEach((button) => {
    button.disabled = busy;
  });
}

function setBadge(node, text, tone = "muted") {
  node.textContent = text;
  node.className = "badge";
  if (tone) {
    node.classList.add(tone);
  }
}

function writePre(node, value) {
  node.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

async function api(path, init = {}) {
  const response = await fetch(path, init);
  const text = await response.text();
  let payload = text;
  try {
    payload = JSON.parse(text);
  } catch {}

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
    throw new Error(message || ("Request failed with HTTP " + response.status));
  }

  return payload;
}

function renderStatus(payload) {
  const tone =
    payload.readiness === "ready" ? "ok" :
    payload.readiness === "warming" ? "warn" :
    payload.readiness === "error" ? "error" :
    "muted";
  setBadge(statusBadge, payload.readiness || payload.state || "unknown", tone);
  writePre(statusOutput, payload);
}

function renderRequest(label, payload, tone = "ok") {
  setBadge(requestBadge, label, tone);
  writePre(requestOutput, payload);
}

function renderHistory(payload) {
  const messages = payload && payload.result && Array.isArray(payload.result.messages)
    ? payload.result.messages.length
    : 0;
  setBadge(historyBadge, messages + " messages", messages > 0 ? "ok" : "muted");
  writePre(historyOutput, payload);
}

async function refreshStatus() {
  const value = requireTenant();
  const payload = await api("/tenants/" + encodeURIComponent(value) + "/openclaw/status");
  renderStatus(payload);
  return payload;
}

async function run(label, work) {
  setBusy(true);
  try {
    const payload = await work();
    renderRequest(label, payload, "ok");
    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    renderRequest("request failed", message, "error");
    throw error;
  } finally {
    setBusy(false);
  }
}

buttons.prepare.addEventListener("click", async () => {
  await run("prepare ok", async () => {
    const payload = await api("/tenants/" + encodeURIComponent(requireTenant()) + "/openclaw/prepare", {
      method: "POST"
    });
    renderStatus(payload);
    return payload;
  });
});

buttons.start.addEventListener("click", async () => {
  await run("start ok", async () => {
    const payload = await api("/tenants/" + encodeURIComponent(requireTenant()) + "/openclaw/start", {
      method: "POST"
    });
    renderStatus(payload);
    return payload;
  });
});

buttons.status.addEventListener("click", async () => {
  await run("status ok", refreshStatus);
});

buttons.stop.addEventListener("click", async () => {
  await run("stop ok", async () => {
    const payload = await api("/tenants/" + encodeURIComponent(requireTenant()) + "/openclaw/stop", {
      method: "POST"
    });
    renderStatus(payload);
    return payload;
  });
});

buttons.history.addEventListener("click", async () => {
  await run("history ok", async () => {
    const payload = await api("/tenants/" + encodeURIComponent(requireTenant()) + "/openclaw/chat/history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionKey: sessionKey(), limit: 50 })
    });
    renderHistory(payload);
    return payload;
  });
});

buttons.send.addEventListener("click", async () => {
  await run("send ok", async () => {
    const message = messageInput.value.trim();
    if (!message) {
      throw new Error("Message is required.");
    }
    const payload = await api("/tenants/" + encodeURIComponent(requireTenant()) + "/openclaw/chat/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionKey: sessionKey(),
        message,
        idempotencyKey: "ui-" + Date.now()
      })
    });
    messageInput.value = "";
    await refreshStatus().catch(() => {});
    const history = await api("/tenants/" + encodeURIComponent(requireTenant()) + "/openclaw/chat/history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionKey: sessionKey(), limit: 50 })
    });
    renderHistory(history);
    return payload;
  });
});
`;
