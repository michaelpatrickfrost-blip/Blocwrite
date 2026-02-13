const { app, BrowserWindow, shell, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

// ── Config ──────────────────────────────────────────────────────────
const PORT = 3199;
const DEV = process.argv.includes("--dev");

const IS_PACKAGED = app.isPackaged;
const APP_ROOT = IS_PACKAGED
  ? path.join(process.resourcesPath, "app")
  : path.join(__dirname, "..");

let mainWindow = null;
let serverReady = false;

function log(msg) {
  console.log(`[PilotWriter] ${msg}`);
}

// ── Wait for server ─────────────────────────────────────────────────
function waitForServer(url, timeout = 90000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) resolve();
          else retry();
        })
        .on("error", retry);
    };
    const retry = () => {
      if (Date.now() - start > timeout) {
        reject(new Error("Server did not start within timeout."));
      } else {
        setTimeout(check, 500);
      }
    };
    check();
  });
}

// ── Start Next.js server in-process ─────────────────────────────────
async function startServer() {
  if (DEV) {
    // Dev mode: spawn next dev as child process
    const { spawn } = require("child_process");
    const nextBin = path.join(APP_ROOT, "node_modules", ".bin", "next");
    const child = spawn(nextBin, ["dev", "-p", String(PORT)], {
      cwd: APP_ROOT,
      env: { ...process.env, NODE_ENV: "development", PORT: String(PORT) },
      shell: true,
      stdio: "pipe",
    });
    child.stdout?.on("data", (d) => log(d.toString().trim()));
    child.stderr?.on("data", (d) => log(d.toString().trim()));
  } else {
    // Production: run standalone server in-process
    const standalonePath = path.join(APP_ROOT, ".next", "standalone");
    const serverPath = path.join(standalonePath, "server.js");

    log(`App root: ${APP_ROOT}`);
    log(`Server path: ${serverPath}`);

    if (!fs.existsSync(serverPath)) {
      throw new Error(`server.js not found at:\n${serverPath}`);
    }

    // Set environment for the Next.js server
    process.env.PORT = String(PORT);
    process.env.HOSTNAME = "localhost";
    process.env.NODE_ENV = "production";
    process.chdir(standalonePath);

    // Run the server in this process
    require(serverPath);
  }

  log(`Waiting for server on port ${PORT}...`);
  await waitForServer(`http://localhost:${PORT}/`);
  log("Server is ready!");
  serverReady = true;
}

// ── Create window ───────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#0a0a0a",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${PORT}/studio`);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http") && !url.includes(`localhost:${PORT}`)) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── App menu (macOS) ────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: "PilotWriter",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "close" }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Lifecycle ───────────────────────────────────────────────────────
app.setName("PilotWriter");

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on("ready", async () => {
    buildMenu();
    try {
      await startServer();
      createWindow();
    } catch (err) {
      log(`Failed to start: ${err.message}`);
      dialog.showErrorBox(
        "PilotWriter could not start",
        `The internal server failed to start.\n\n${err.message}\n\nPlease try reopening the app.`
      );
      app.quit();
    }
  });

  app.on("activate", () => {
    if (mainWindow === null && serverReady) createWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
