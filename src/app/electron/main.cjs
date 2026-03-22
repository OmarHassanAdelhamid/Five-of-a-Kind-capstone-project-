const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const crypto = require('crypto')
const { spawn } = require('child_process')
const net = require('net')
const http = require('http')
const fs = require('fs')

/** @type {import('child_process').ChildProcess | null} */
let backendProcess = null
/** @type {import('http').Server | null} */
let uiServer = null

const isDev =
  process.env.NODE_ENV === 'development' || !app.isPackaged

const BACKEND_PORT = isDev
  ? Number(process.env.FOAK_API_PORT) || 8000
  : 8765

const BACKEND_START_TIMEOUT_MS = isDev ? 90000 : 180000

/** GUI-launched apps on macOS often lack Homebrew on PATH — add common locations. */
function backendProcessEnv() {
  const delimiter = path.delimiter
  const extra =
    process.platform === 'darwin'
      ? ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin']
      : process.platform === 'win32'
        ? []
        : ['/usr/local/bin', '/usr/bin', '/bin']
  const basePath = process.env.PATH || ''
  const PATH = [...extra, basePath].filter(Boolean).join(delimiter)
  return {
    ...process.env,
    PATH,
    PYTHONUNBUFFERED: '1',
  }
}

function findPythonExecutable() {
  if (process.platform === 'win32') {
    return process.env.PYTHON_EXE || 'python'
  }
  if (process.env.PYTHON_EXE && fs.existsSync(process.env.PYTHON_EXE)) {
    return process.env.PYTHON_EXE
  }
  const candidates = [
    '/opt/homebrew/bin/python3',
    '/usr/local/bin/python3',
    '/usr/bin/python3',
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p
    }
  }
  return 'python3'
}

function venvRootDir() {
  return path.join(app.getPath('userData'), 'python-runtime')
}

function venvInterpreterPath() {
  const root = venvRootDir()
  if (process.platform === 'win32') {
    return path.join(root, 'Scripts', 'python.exe')
  }
  const py3 = path.join(root, 'bin', 'python3')
  if (fs.existsSync(py3)) {
    return py3
  }
  return path.join(root, 'bin', 'python')
}

/** Packaged app: dedicated venv with auto pip install. Dev: system Python. */
function resolveBackendPython() {
  if (isDev) {
    return findPythonExecutable()
  }
  const venvPy = venvInterpreterPath()
  if (fs.existsSync(venvPy)) {
    return venvPy
  }
  return findPythonExecutable()
}

function hashRequirementsFile(reqPath) {
  if (!fs.existsSync(reqPath)) {
    return 'missing'
  }
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(reqPath))
    .digest('hex')
    .slice(0, 24)
}

/** @type {BrowserWindow | null} */
let splashWin = null

function closeSplash() {
  if (splashWin && !splashWin.isDestroyed()) {
    splashWin.close()
  }
  splashWin = null
}

function showSplash(lines) {
  closeSplash()
  const body = lines
    .map((l) => `<p>${String(l).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:28px;margin:0;background:#1a1a1a;color:#eee;font-size:14px;line-height:1.45}h1{font-size:17px;margin:0 0 14px;font-weight:600}</style></head><body><h1>Five of a Kind</h1>${body}</body></html>`
  splashWin = new BrowserWindow({
    width: 460,
    height: 200,
    frame: false,
    center: true,
    resizable: false,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  splashWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
}

function runCommand(cmd, args, { cwd, env, timeoutMs }) {
  const mergedEnv = env || backendProcessEnv()
  return new Promise((resolve, reject) => {
    const chunks = []
    const proc = spawn(cmd, args, {
      cwd: cwd ?? undefined,
      env: mergedEnv,
      shell: false,
    })
    proc.stdout?.on('data', (d) => chunks.push(d))
    proc.stderr?.on('data', (d) => chunks.push(d))
    const t = setTimeout(() => {
      proc.kill('SIGTERM')
      reject(new Error(`Timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    proc.on('error', (err) => {
      clearTimeout(t)
      reject(err)
    })
    proc.on('exit', (code) => {
      clearTimeout(t)
      const out = Buffer.concat(chunks).toString()
      if (code !== 0) {
        reject(new Error(out.trim() || `Process exited with code ${code}`))
      } else {
        resolve(out)
      }
    })
  })
}

/**
 * Packaged builds: create a venv under userData and pip install bundled requirements.
 * Requires network on first install. Dev mode skips this (use your own venv / global pip).
 */
async function ensurePackagedPythonEnv() {
  if (isDev || process.env.FOAK_SKIP_AUTO_VENV === '1') {
    return
  }

  const basePy = findPythonExecutable()
  const venvDir = venvRootDir()
  const venvPy = venvInterpreterPath()
  const backend = backendRoot()
  const reqApp = path.join(backend, 'requirements-app.txt')
  const reqFull = path.join(backend, 'requirements.txt')
  const reqFile = fs.existsSync(reqApp) ? reqApp : reqFull
  const markerPath = path.join(venvDir, '.foak-deps')

  const reqHash = hashRequirementsFile(reqFile)
  const needsInstall =
    !fs.existsSync(venvPy) ||
    !fs.existsSync(markerPath) ||
    (() => {
      try {
        return fs.readFileSync(markerPath, 'utf8').trim() !== reqHash
      } catch {
        return true
      }
    })()

  if (!needsInstall) {
    return
  }

  showSplash([
    'Setting up the Python environment…',
    'First launch downloads packages (internet required). This may take a few minutes.',
  ])

  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true })

    if (!fs.existsSync(venvPy)) {
      await runCommand(basePy, ['-m', 'venv', venvDir], {
        timeoutMs: 120000,
      })
    }

    if (!fs.existsSync(venvPy)) {
      throw new Error(
        `Python venv is missing at ${venvPy}. Is "${basePy}" a valid Python 3?`,
      )
    }

    await runCommand(venvPy, ['-m', 'pip', 'install', '--upgrade', 'pip'], {
      timeoutMs: 180000,
    })

    await runCommand(
      venvPy,
      ['-m', 'pip', 'install', '-r', reqFile],
      {
        cwd: backend,
        timeoutMs: 600000,
      },
    )

    fs.writeFileSync(markerPath, reqHash, 'utf8')
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    appendBackendLog(`ensurePackagedPythonEnv failed:\n${detail}`)
    throw new Error(
      `Could not install Python dependencies.\n\n${detail}\n\n` +
        'You need Python 3 installed and a working internet connection for the first run.',
    )
  } finally {
    closeSplash()
  }
}

function backendRoot() {
  if (isDev) {
    return path.join(__dirname, '..', '..', 'backend')
  }
  return path.join(process.resourcesPath, 'backend')
}

function frontendDist() {
  if (isDev) {
    return path.join(__dirname, '..', '..', 'frontend', 'dist')
  }
  return path.join(process.resourcesPath, 'frontend')
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address()
      const p = typeof addr === 'object' && addr ? addr.port : 0
      s.close(() => resolve(p))
    })
    s.on('error', reject)
  })
}

function waitForBackend(port, timeoutMs = 90000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error('Backend did not become ready in time'))
        return
      }
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/openapi.json',
          method: 'GET',
          timeout: 2000,
        },
        (res) => {
          res.resume()
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
            resolve()
          } else {
            setTimeout(tick, 400)
          }
        },
      )
      req.on('error', () => setTimeout(tick, 400))
      req.on('timeout', () => {
        req.destroy()
        setTimeout(tick, 400)
      })
      req.end()
    }
    tick()
  })
}

function appendBackendLog(text) {
  try {
    const dir = app.getPath('userData')
    fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(
      path.join(dir, 'backend.log'),
      `\n--- ${new Date().toISOString()}\n${text}\n`,
    )
  } catch {
    /* ignore */
  }
}

function startBackend() {
  const cwd = backendRoot()
  const mainPy = path.join(cwd, 'app', 'main.py')
  if (!fs.existsSync(mainPy)) {
    return Promise.reject(
      new Error(`Backend not found at ${mainPy}. Did you install dependencies?`),
    )
  }

  const pythonExe = resolveBackendPython()
  let stderrBuf = ''
  const onStderr = (chunk) => {
    const s = chunk.toString()
    stderrBuf += s
    if (stderrBuf.length > 12000) {
      stderrBuf = stderrBuf.slice(-12000)
    }
  }

  backendProcess = spawn(
    pythonExe,
    [
      '-m',
      'uvicorn',
      'app.main:app',
      '--host',
      '127.0.0.1',
      '--port',
      String(BACKEND_PORT),
    ],
    {
      cwd,
      env: backendProcessEnv(),
      stdio: isDev ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    },
  )

  if (!isDev && backendProcess.stderr) {
    backendProcess.stderr.on('data', onStderr)
  }
  if (!isDev && backendProcess.stdout) {
    backendProcess.stdout.on('data', onStderr)
  }

  backendProcess.on('error', (err) => {
    console.error('Failed to start Python backend', err)
    appendBackendLog(`spawn error: ${err.message}\nexe: ${pythonExe}\ncwd: ${cwd}`)
  })

  backendProcess.on('exit', (code, signal) => {
    if (code && code !== 0 && signal !== 'SIGTERM') {
      console.error('Backend exited with code', code)
      appendBackendLog(
        `exit ${code} signal ${signal}\nexe: ${pythonExe}\n${stderrBuf}`,
      )
    }
    backendProcess = null
  })

  const crashed = new Promise((_, reject) => {
    const fail = (msg) => {
      appendBackendLog(msg)
      reject(new Error(msg))
    }
    backendProcess.once('error', (err) => {
      fail(
        `Could not start Python (${pythonExe}): ${err.message}\n\n` +
          'Install Python 3, or set PYTHON_EXE to the full path to python3.',
      )
    })
    backendProcess.once('exit', (code, signal) => {
      if (signal === 'SIGTERM') {
        return
      }
      if (code !== 0 && code !== null) {
        const tail = stderrBuf.trim() ? `\n\n${stderrBuf.trim()}` : ''
        fail(`Backend exited with code ${code}.${tail}`)
      }
    })
  })

  const ready = waitForBackend(BACKEND_PORT, BACKEND_START_TIMEOUT_MS).catch(
    (err) => {
      const tail = stderrBuf.trim() ? `\n\n${stderrBuf.trim()}` : ''
      appendBackendLog(`timeout: ${err.message}\n${stderrBuf}`)
      throw new Error(
        `${err.message}.${tail}\n\n` +
          `Python used: ${pythonExe}\n` +
          (isDev
            ? `In a terminal run:\n  cd "${cwd}"\n  ${path.basename(pythonExe)} -m pip install -r requirements.txt\n  ${path.basename(pythonExe)} -m uvicorn app.main:app --host 127.0.0.1 --port ${BACKEND_PORT}`
            : 'If this keeps happening, delete the app data folder python-runtime and try again (first launch will reinstall packages).'),
      )
    },
  )

  return Promise.race([ready, crashed]).then(() => undefined)
}

async function startUiServer() {
  const dist = frontendDist()
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    throw new Error(
      `Frontend build missing at ${dist}. Run npm run build:frontend from src/app.`,
    )
  }
  const express = require('express')
  const ex = express()
  ex.use(express.static(dist))
  ex.get('*', (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'))
  })
  const port = await findFreePort()
  await new Promise((resolve, reject) => {
    uiServer = http.createServer(ex)
    uiServer.listen(port, '127.0.0.1', () => resolve())
    uiServer.on('error', reject)
  })
  return port
}

function stopChildProcesses() {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM')
    backendProcess = null
  }
  if (uiServer) {
    uiServer.close()
    uiServer = null
  }
}

function backendChildAlive() {
  return (
    backendProcess != null &&
    backendProcess.exitCode === null &&
    backendProcess.signalCode === null
  )
}

/** Start API if needed (first launch, or after crash / macOS reopen window). */
async function ensureBackendRunning() {
  if (backendChildAlive()) {
    try {
      await waitForBackend(BACKEND_PORT, 8000)
      return
    } catch {
      try {
        backendProcess.kill('SIGTERM')
      } catch {
        /* ignore */
      }
      backendProcess = null
    }
  }
  await startBackend()
}

async function createWindow() {
  let loadUrl
  if (isDev) {
    loadUrl = 'http://127.0.0.1:5173'
  } else {
    const uiPort = await startUiServer()
    loadUrl = `http://127.0.0.1:${uiPort}`
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  await win.loadURL(loadUrl)
  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' })
  }
}

app.whenReady().then(async () => {
  try {
    await ensurePackagedPythonEnv()
    await ensureBackendRunning()
    await createWindow()
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const logHint = isDev
      ? ''
      : `\n\nFull backend output is appended to:\n${path.join(app.getPath('userData'), 'backend.log')}`
    await dialog.showErrorBox(
      'Five of a Kind',
      `Could not start the application.\n\n${message}\n\n` +
        (isDev
          ? 'Ensure Python 3 is installed and run: pip install -r src/backend/requirements.txt'
          : 'The packaged app needs Python 3 on your Mac (e.g. from python.org or Homebrew) for the first-time setup. It then installs its own libraries under Application Support.') +
        logHint,
    )
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopChildProcesses()
    app.quit()
  }
})

app.on('before-quit', () => {
  stopChildProcesses()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    ;(async () => {
      try {
        await ensurePackagedPythonEnv()
        await ensureBackendRunning()
        await createWindow()
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        await dialog.showErrorBox('Five of a Kind', message)
      }
    })()
  }
})
