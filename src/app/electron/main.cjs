const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const { spawn } = require("child_process");
const net = require("net");
const http = require("http");
const fs = require("fs");

/** @type {import('child_process').ChildProcess | null} */
let backendProcess = null;
/** @type {import('http').Server | null} */
let uiServer = null;

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

const BACKEND_PORT = isDev
  ? Number(process.env.DESKTOP_API_PORT) || 8000
  : 8765;

const BACKEND_START_TIMEOUT_MS = isDev ? 90000 : 180000;

/**
 * Env for Python subprocesses. Strip Electron/Node vars — they can confuse tooling
 * or alter behavior when spawning `python` / `uvicorn` from the GUI main process.
 */
function backendProcessEnv() {
  const delimiter = path.delimiter;
  const extra =
    process.platform === "darwin"
      ? ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"]
      : process.platform === "win32"
        ? []
        : ["/usr/local/bin", "/usr/bin", "/bin"];

  const base = { ...process.env };
  for (const key of Object.keys(base)) {
    if (key.startsWith("ELECTRON_")) delete base[key];
  }
  delete base.NODE_OPTIONS;
  delete base.ELECTRON_RUN_AS_NODE;

  const basePath = base.PATH || "";
  const PATH = [...extra, basePath].filter(Boolean).join(delimiter);
  return {
    ...base,
    PATH,
    PYTHONUNBUFFERED: "1",
  };
}

function pythonInterpreterFile() {
  return path.join(app.getPath("userData"), "python-interpreter.txt");
}

function loadSavedPythonPath() {
  try {
    const p = fs.readFileSync(pythonInterpreterFile(), "utf8").trim();
    if (p && fs.existsSync(p)) return p;
  } catch {
    /* ignore */
  }
  return null;
}

function savePythonPath(p) {
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(pythonInterpreterFile(), p, "utf8");
}

function findPythonExecutable() {
  const saved = loadSavedPythonPath();
  if (saved) return saved;
  if (process.platform === "win32") {
    return process.env.PYTHON_EXE || "python";
  }
  if (process.env.PYTHON_EXE && fs.existsSync(process.env.PYTHON_EXE)) {
    return process.env.PYTHON_EXE;
  }
  const candidates = [
    "/opt/homebrew/bin/python3",
    "/usr/local/bin/python3",
    "/usr/bin/python3",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return "python3";
}

function venvRootDir() {
  return path.join(app.getPath("userData"), "python-runtime");
}

function venvInterpreterPath() {
  const root = venvRootDir();
  if (process.platform === "win32") {
    return path.join(root, "Scripts", "python.exe");
  }
  const py3 = path.join(root, "bin", "python3");
  if (fs.existsSync(py3)) {
    return py3;
  }
  return path.join(root, "bin", "python");
}

/** Packaged app: dedicated venv with auto pip install. Dev: system Python. */
function resolveBackendPython() {
  if (isDev) {
    return findPythonExecutable();
  }
  const venvPy = venvInterpreterPath();
  if (fs.existsSync(venvPy)) {
    return venvPy;
  }
  return findPythonExecutable();
}

function hashRequirementsFile(reqPath) {
  if (!fs.existsSync(reqPath)) {
    return "missing";
  }
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(reqPath))
    .digest("hex")
    .slice(0, 24);
}

/** @type {BrowserWindow | null} */
let splashWin = null;

/** @type {((v: string) => void) | null} */
let pythonPathResolver = null;

function closeSplash() {
  if (splashWin && !splashWin.isDestroyed()) {
    splashWin.close();
  }
  splashWin = null;
}

ipcMain.on("setup-continue-python", (_e, value) => {
  if (pythonPathResolver) {
    pythonPathResolver(value);
    pythonPathResolver = null;
  }
});

function waitForPythonPathFromUser() {
  return new Promise((resolve) => {
    pythonPathResolver = resolve;
  });
}

function createSetupWindow() {
  closeSplash();
  splashWin = new BrowserWindow({
    width: 520,
    height: 460,
    title: "AutoVox — Setup",
    show: true,
    center: true,
    resizable: true,
    minWidth: 480,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, "setup-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  splashWin.on("closed", () => {
    if (pythonPathResolver) {
      pythonPathResolver("CANCEL");
      pythonPathResolver = null;
    }
  });
  splashWin.loadFile(path.join(__dirname, "setup-window.html"));
  return splashWin;
}

function sendSetupUpdate(win, payload) {
  if (win && !win.isDestroyed()) {
    win.webContents.send("setup-update", payload);
  }
}

function probePython(exe) {
  return new Promise((resolve) => {
    const proc = spawn(
      exe,
      [
        "-c",
        "import sys; assert sys.version_info >= (3, 9); print(sys.version.split()[0]); print(sys.executable)",
      ],
      { env: backendProcessEnv(), shell: false },
    );
    let out = "";
    proc.stdout?.on("data", (d) => {
      out += d.toString();
    });
    proc.stderr?.on("data", (d) => {
      out += d.toString();
    });
    proc.on("error", () => {
      resolve({
        ok: false,
        triedPath: exe,
        error: `Cannot run "${exe}". Install Python 3.9+ or pick the executable with Browse.`,
      });
    });
    proc.on("exit", (code) => {
      if (code !== 0) {
        resolve({
          ok: false,
          triedPath: exe,
          error: out.trim() || `Exited with code ${code}`,
        });
        return;
      }
      const lines = out.trim().split("\n").filter(Boolean);
      const versionLine = lines[0] || "";
      const resolvedPath = lines[lines.length - 1] || exe;
      resolve({
        ok: true,
        triedPath: exe,
        versionLine: `Python ${versionLine}`,
        resolvedPath,
      });
    });
  });
}

function packageListFromRequirements(reqPath) {
  if (!fs.existsSync(reqPath)) return [];
  const text = fs.readFileSync(reqPath, "utf8");
  const names = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const cut = t.search(/[<>=[\s@!]/);
    const base = (cut === -1 ? t : t.slice(0, cut)).trim();
    if (base) names.push(base);
  }
  return names;
}

function runCommandStreaming(cmd, args, { cwd, env, timeoutMs, onChunk }) {
  const mergedEnv = env || backendProcessEnv();
  return new Promise((resolve, reject) => {
    const chunks = [];
    const proc = spawn(cmd, args, {
      cwd: cwd ?? undefined,
      env: mergedEnv,
      shell: false,
    });
    proc.stdout?.on("data", (d) => {
      chunks.push(d);
      onChunk?.(d.toString());
    });
    proc.stderr?.on("data", (d) => {
      chunks.push(d);
      onChunk?.(d.toString());
    });
    const t = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    proc.on("error", (err) => {
      clearTimeout(t);
      reject(err);
    });
    proc.on("exit", (code) => {
      clearTimeout(t);
      const out = Buffer.concat(chunks).toString();
      if (code !== 0) {
        reject(new Error(out.trim() || `Process exited with code ${code}`));
      } else {
        resolve(out);
      }
    });
  });
}

function runCommand(cmd, args, { cwd, env, timeoutMs }) {
  const mergedEnv = env || backendProcessEnv();
  return new Promise((resolve, reject) => {
    const chunks = [];
    const proc = spawn(cmd, args, {
      cwd: cwd ?? undefined,
      env: mergedEnv,
      shell: false,
    });
    proc.stdout?.on("data", (d) => chunks.push(d));
    proc.stderr?.on("data", (d) => chunks.push(d));
    const t = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    proc.on("error", (err) => {
      clearTimeout(t);
      reject(err);
    });
    proc.on("exit", (code) => {
      clearTimeout(t);
      const out = Buffer.concat(chunks).toString();
      if (code !== 0) {
        reject(new Error(out.trim() || `Process exited with code ${code}`));
      } else {
        resolve(out);
      }
    });
  });
}

/** True if the venv can import backend runtime deps (avoids “marker OK” but missing trimesh). */
async function venvImportsBackendDeps(venvPy) {
  try {
    await runCommand(
      venvPy,
      ["-c", "import trimesh, numpy, fastapi, uvicorn"],
      { timeoutMs: 30000 },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Packaged builds: create a venv under userData and pip install bundled requirements.
 * Requires network on first install. Dev mode skips this (use your own venv / global pip).
 */
async function ensurePackagedPythonEnv() {
  if (isDev || process.env.DESKTOP_SKIP_AUTO_VENV === "1") {
    return;
  }

  const venvDir = venvRootDir();
  const venvPy = venvInterpreterPath();
  const backend = backendRoot();
  const reqApp = path.join(backend, "requirements-app.txt");
  const reqFull = path.join(backend, "requirements.txt");
  const reqFile = fs.existsSync(reqApp) ? reqApp : reqFull;
  const markerPath = path.join(venvDir, ".desktop-python-deps");

  const reqHash = hashRequirementsFile(reqFile);
  let needsInstall =
    !fs.existsSync(venvPy) ||
    !fs.existsSync(markerPath) ||
    (() => {
      try {
        return fs.readFileSync(markerPath, "utf8").trim() !== reqHash;
      } catch {
        return true;
      }
    })();

  if (!needsInstall && !(await venvImportsBackendDeps(venvPy))) {
    try {
      fs.unlinkSync(markerPath);
    } catch {
      /* ignore */
    }
    needsInstall = true;
  }

  if (!needsInstall) {
    appendBackendLog(
      "ensurePackagedPythonEnv: reusing venv (requirements marker + import check OK).",
    );
    return;
  }

  const setupWin = createSetupWindow();
  await new Promise((resolve) => {
    if (setupWin.webContents.isLoading()) {
      setupWin.webContents.once("did-finish-load", resolve);
    } else {
      resolve();
    }
  });

  const packages = packageListFromRequirements(reqFile);
  const preview =
    packages.length > 0
      ? `Will install: ${packages.slice(0, 14).join(", ")}${packages.length > 14 ? ", …" : ""}`
      : "";

  sendSetupUpdate(setupWin, {
    packageListPreview: preview,
    progress: 2,
    phase: "Checking Python…",
    pythonProbe: { checking: true, triedPath: findPythonExecutable() },
  });

  let probe = await probePython(findPythonExecutable());
  sendSetupUpdate(setupWin, { pythonProbe: probe, progress: probe.ok ? 8 : 4 });

  while (!probe.ok) {
    sendSetupUpdate(setupWin, { suggestedPath: probe.triedPath });
    const userPath = await waitForPythonPathFromUser();
    if (userPath === "CANCEL") {
      closeSplash();
      throw new Error("Setup cancelled.");
    }
    const trimmed = userPath != null ? String(userPath).trim() : "";
    if (trimmed) {
      savePythonPath(trimmed);
    } else {
      try {
        fs.unlinkSync(pythonInterpreterFile());
      } catch {
        /* ignore */
      }
    }
    probe = await probePython(findPythonExecutable());
    sendSetupUpdate(setupWin, {
      pythonProbe: probe,
      progress: probe.ok ? 8 : 4,
    });
  }

  const basePy = findPythonExecutable();

  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });

    sendSetupUpdate(setupWin, {
      progress: 10,
      phase: "Creating virtual environment…",
    });

    if (!fs.existsSync(venvPy)) {
      await runCommandStreaming(basePy, ["-m", "venv", venvDir], {
        timeoutMs: 120000,
        onChunk: (t) => sendSetupUpdate(setupWin, { logChunk: t }),
      });
    }

    if (!fs.existsSync(venvPy)) {
      throw new Error(
        `Python venv is missing at ${venvPy}. Is "${basePy}" a valid Python 3?`,
      );
    }

    sendSetupUpdate(setupWin, { progress: 22, phase: "Upgrading pip…" });
    await runCommandStreaming(
      venvPy,
      ["-m", "pip", "install", "--upgrade", "pip"],
      {
        timeoutMs: 180000,
        onChunk: (t) => sendSetupUpdate(setupWin, { logChunk: t }),
      },
    );

    let pipProgress = 28;
    sendSetupUpdate(setupWin, {
      progress: pipProgress,
      phase: "Installing packages (internet required)…",
    });

    await runCommandStreaming(venvPy, ["-m", "pip", "install", "-r", reqFile], {
      cwd: backend,
      timeoutMs: 600000,
      onChunk: (text) => {
        const m =
          text.match(/Collecting ([^\s]+)/) ||
          text.match(/Installing ([^\s]+)/) ||
          text.match(/Using cached ([^\s]+)/);
        pipProgress = Math.min(
          97,
          pipProgress + Math.min(2.5, 0.08 * text.length),
        );
        sendSetupUpdate(setupWin, {
          logChunk: text,
          currentPackage: m ? `Installing: ${m[1]}` : undefined,
          progress: pipProgress,
        });
      },
    });

    sendSetupUpdate(setupWin, { progress: 96, phase: "Verifying install…" });
    if (!(await venvImportsBackendDeps(venvPy))) {
      try {
        fs.unlinkSync(markerPath);
      } catch {
        /* ignore */
      }
      throw new Error(
        "pip reported success but trimesh/numpy (or FastAPI) could not be imported. " +
          "Try again with a stable network, or use Python 3.11–3.13 if problems persist.",
      );
    }

    fs.writeFileSync(markerPath, reqHash, "utf8");
    sendSetupUpdate(setupWin, {
      progress: 100,
      phase: "Done.",
      currentPackage: "",
    });
    await new Promise((r) => setTimeout(r, 450));
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    appendBackendLog(`ensurePackagedPythonEnv failed:\n${detail}`);
    throw new Error(
      `Could not install Python dependencies.\n\n${detail}\n\n` +
        "You need Python 3.9+ and a working internet connection for the first run.",
    );
  } finally {
    closeSplash();
  }
}

function backendRoot() {
  if (isDev) {
    return path.join(__dirname, "..", "..", "backend");
  }
  return path.join(process.resourcesPath, "backend");
}

function backendSpawnEnv() {
  const env = { ...backendProcessEnv() };
  if (!isDev) {
    const ws = path.join(app.getPath("userData"), "workspace");
    fs.mkdirSync(ws, { recursive: true });
    env.DESKTOP_WORKSPACE_DIR = ws;
  }
  return env;
}

function frontendDist() {
  if (isDev) {
    return path.join(__dirname, "..", "..", "frontend", "dist");
  }
  return path.join(process.resourcesPath, "frontend");
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      const p = typeof addr === "object" && addr ? addr.port : 0;
      s.close(() => resolve(p));
    });
    s.on("error", reject);
  });
}

function waitForBackend(port, timeoutMs = 90000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error("Backend did not become ready in time"));
        return;
      }
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/openapi.json",
          method: "GET",
          timeout: 2000,
        },
        (res) => {
          res.resume();
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
            resolve();
          } else {
            setTimeout(tick, 400);
          }
        },
      );
      req.on("error", () => setTimeout(tick, 400));
      req.on("timeout", () => {
        req.destroy();
        setTimeout(tick, 400);
      });
      req.end();
    };
    tick();
  });
}

function backendLogFilePath() {
  return path.join(app.getPath("userData"), "backend.log");
}

/**
 * Append to ~/Library/Application Support/autovox-desktop/backend.log (macOS).
 * Not inside python-runtime/ — that folder is only the venv.
 */
function appendBackendLog(text) {
  const stamp = `\n--- ${new Date().toISOString()}\n${text}\n`;
  const primary = backendLogFilePath();
  try {
    const dir = app.getPath("userData");
    fs.mkdirSync(dir, { recursive: true });
    const st = fs.existsSync(primary) ? fs.statSync(primary) : null;
    if (st && st.isDirectory()) {
      throw new Error(`backend.log is a directory, not a file: ${primary}`);
    }
    fs.appendFileSync(primary, stamp);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[AutoVox] backend.log write failed:", primary, msg);
    try {
      const fallback = path.join(os.tmpdir(), "autovox-desktop-backend.log");
      fs.appendFileSync(fallback, stamp);
      console.error("[AutoVox] wrote same entry to fallback log:", fallback);
    } catch (err2) {
      console.error("[AutoVox] fallback log write failed:", err2);
    }
  }
}

function startBackend() {
  const cwd = backendRoot();
  const mainPy = path.join(cwd, "app", "main.py");
  if (!fs.existsSync(mainPy)) {
    const msg = `Backend not found at ${mainPy}. Did you install dependencies?`;
    appendBackendLog(`startBackend aborted: ${msg}`);
    return Promise.reject(new Error(msg));
  }

  const pythonExe = resolveBackendPython();
  appendBackendLog(
    `startBackend: spawning uvicorn | python=${pythonExe} | cwd=${cwd} | port=${BACKEND_PORT}`,
  );
  let stderrBuf = "";
  const onStderr = (chunk) => {
    const s = chunk.toString();
    stderrBuf += s;
    if (stderrBuf.length > 12000) {
      stderrBuf = stderrBuf.slice(-12000);
    }
  };

  backendProcess = spawn(
    pythonExe,
    [
      "-m",
      "uvicorn",
      "app.main:app",
      "--host",
      "127.0.0.1",
      "--port",
      String(BACKEND_PORT),
      ...(isDev ? ["--reload"] : []),
    ],
    {
      cwd,
      env: backendSpawnEnv(),
      stdio: isDev ? "inherit" : ["ignore", "pipe", "pipe"],
    },
  );

  if (!isDev && backendProcess.stderr) {
    backendProcess.stderr.on("data", onStderr);
  }
  if (!isDev && backendProcess.stdout) {
    backendProcess.stdout.on("data", onStderr);
  }

  backendProcess.on("error", (err) => {
    console.error("Failed to start Python backend", err);
    appendBackendLog(
      `spawn error: ${err.message}\nexe: ${pythonExe}\ncwd: ${cwd}`,
    );
  });

  backendProcess.on("exit", (code, signal) => {
    if (code && code !== 0 && signal !== "SIGTERM") {
      console.error("Backend exited with code", code);
      appendBackendLog(
        `exit ${code} signal ${signal}\nexe: ${pythonExe}\n${stderrBuf}`,
      );
    }
    backendProcess = null;
  });

  const crashed = new Promise((_, reject) => {
    const fail = (msg) => {
      appendBackendLog(msg);
      reject(new Error(msg));
    };
    backendProcess.once("error", (err) => {
      fail(
        `Could not start Python (${pythonExe}): ${err.message}\n\n` +
          "Install Python 3, or set PYTHON_EXE to the full path to python3.",
      );
    });
    backendProcess.once("exit", (code, signal) => {
      if (signal === "SIGTERM") {
        return;
      }
      if (code !== 0 && code !== null) {
        const tail = stderrBuf.trim() ? `\n\n${stderrBuf.trim()}` : "";
        fail(`Backend exited with code ${code}.${tail}`);
      }
    });
  });

  const ready = waitForBackend(BACKEND_PORT, BACKEND_START_TIMEOUT_MS).catch(
    (err) => {
      const tail = stderrBuf.trim() ? `\n\n${stderrBuf.trim()}` : "";
      appendBackendLog(`timeout: ${err.message}\n${stderrBuf}`);
      throw new Error(
        `${err.message}.${tail}\n\n` +
          `Python used: ${pythonExe}\n` +
          (isDev
            ? `In a terminal run:\n  cd "${cwd}"\n  ${path.basename(pythonExe)} -m pip install -r requirements.txt\n  ${path.basename(pythonExe)} -m uvicorn app.main:app --host 127.0.0.1 --port ${BACKEND_PORT}`
            : "If this keeps happening, delete the app data folder python-runtime and try again (first launch will reinstall packages)."),
      );
    },
  );

  return Promise.race([ready, crashed]).then(() => undefined);
}

async function startUiServer() {
  const dist = frontendDist();
  if (!fs.existsSync(path.join(dist, "index.html"))) {
    throw new Error(
      `Frontend build missing at ${dist}. Run npm run build:frontend from src/app.`,
    );
  }
  const express = require("express");
  const ex = express();
  ex.use(express.static(dist));
  ex.get("*", (_req, res) => {
    res.sendFile(path.join(dist, "index.html"));
  });
  const port = await findFreePort();
  await new Promise((resolve, reject) => {
    uiServer = http.createServer(ex);
    uiServer.listen(port, "127.0.0.1", () => resolve());
    uiServer.on("error", reject);
  });
  return port;
}

function stopChildProcesses() {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill("SIGTERM");
    backendProcess = null;
  }
  if (uiServer) {
    uiServer.close();
    uiServer = null;
  }
}

function backendChildAlive() {
  return (
    backendProcess != null &&
    backendProcess.exitCode === null &&
    backendProcess.signalCode === null
  );
}

/** Start API if needed (first launch, or after crash / macOS reopen window). */
async function ensureBackendRunning() {
  if (backendChildAlive()) {
    try {
      await waitForBackend(BACKEND_PORT, 8000);
      return;
    } catch {
      try {
        backendProcess.kill("SIGTERM");
      } catch {
        /* ignore */
      }
      backendProcess = null;
    }
  }
  await startBackend();
}

async function createWindow() {
  let loadUrl;
  if (isDev) {
    loadUrl = "http://127.0.0.1:5173";
  } else {
    const uiPort = await startUiServer();
    loadUrl = `http://127.0.0.1:${uiPort}`;
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    title: "AutoVox",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await win.loadURL(loadUrl);
  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
  }
}

app.whenReady().then(async () => {
  appendBackendLog(
    `session start | userData=${app.getPath("userData")} | logFile=${backendLogFilePath()} | isDev=${isDev} | isPackaged=${app.isPackaged}`,
  );
  try {
    ipcMain.removeHandler("setup-browse-python");
  } catch {
    /* no prior handler */
  }
  ipcMain.handle("setup-browse-python", async () => {
    const w =
      splashWin && !splashWin.isDestroyed()
        ? splashWin
        : BrowserWindow.getFocusedWindow();
    const r = await dialog.showOpenDialog(w || undefined, {
      title: "Select Python 3",
      properties: ["openFile"],
      message: "Choose python3 or python.exe (version 3.9 or newer).",
    });
    if (r.canceled || !r.filePaths[0]) return null;
    return r.filePaths[0];
  });

  try {
    await ensurePackagedPythonEnv();
    await ensureBackendRunning();
    await createWindow();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const logHint = isDev
      ? `\n\nIf the API failed to start, check Terminal output (dev mode uses inherited stdio).\nLog file (if used): ${backendLogFilePath()}`
      : `\n\nFull backend log:\n${backendLogFilePath()}\n\n(Not inside python-runtime — that is only the venv.)`;
    await dialog.showErrorBox(
      "AutoVox",
      `Could not start the application.\n\n${message}\n\n` +
        (isDev
          ? "Ensure Python 3 is installed and run: pip install -r src/backend/requirements.txt"
          : "The packaged app needs Python 3 on your Mac (e.g. from python.org or Homebrew) for the first-time setup. It then installs its own libraries under Application Support.") +
        logHint,
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    stopChildProcesses();
    app.quit();
  }
});

app.on("before-quit", () => {
  stopChildProcesses();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    (async () => {
      try {
        await ensurePackagedPythonEnv();
        await ensureBackendRunning();
        await createWindow();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        appendBackendLog(`activate → ensure backend failed:\n${message}`);
        await dialog.showErrorBox(
          "AutoVox",
          `${message}\n\nLog: ${backendLogFilePath()}`,
        );
      }
    })();
  }
});
