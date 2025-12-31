#!/usr/bin/env node

/**
 * Robust web server startup script for Expo
 * Handles port conflicts automatically and ensures reliable web serving
 * Designed for GitHub Codespaces but works everywhere
 */

const { execSync, spawn } = require("child_process");
const net = require("net");

// Set environment variables to disable all interactive prompts
process.env.EXPO_NO_GIT_STATUS = "1";
process.env.CI = "true";
process.env.EXPO_NO_TELEMETRY = "1";

/**
 * Check if a port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once("close", () => resolve(true));
      server.close();
    });
    server.on("error", () => resolve(false));
  });
}

/**
 * Find an available port starting from the given port
 */
async function findAvailablePort(startPort = 8081) {
  let port = startPort;
  const maxPort = 8100;

  while (port <= maxPort) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    console.log(`⚠️  Port ${port} is in use, trying ${port + 1}...`);
    port++;
  }

  throw new Error(
    `Could not find available port (tried ${startPort}-${maxPort})`
  );
}

/**
 * Kill any processes using the specified port
 */
function killPortProcesses(port) {
  try {
    // Try to find and kill processes on the port
    if (process.platform === "win32") {
      execSync(`netstat -ano | findstr :${port}`, { stdio: "ignore" });
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
        stdio: "ignore",
      });
    }
  } catch (error) {
    // Ignore errors - port might not be in use
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const startPort = parseInt(
    args.find((arg) => arg.startsWith("--port="))?.split("=")[1] || "8081",
    10
  );

  console.log("🚀 Starting Expo Web Server...");
  console.log(`   Checking port availability starting from ${startPort}...`);

  // Try to clean up any existing Expo processes on the port
  killPortProcesses(startPort);

  // Wait a moment for ports to be released
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Find an available port
  const port = await findAvailablePort(startPort);

  if (port !== startPort) {
    console.log(`✅ Port ${startPort} was in use, using port ${port} instead`);
  } else {
    console.log(`✅ Port ${port} is available`);
  }

  console.log(`🌐 Starting Expo web server on port ${port}...`);
  console.log(`   The web app will be available once the server starts.`);
  console.log(
    `   In Codespaces, check the 'Ports' tab to see the forwarded port.`
  );
  console.log("");

  // Start Expo with the determined port
  const expoProcess = spawn(
    "npx",
    [
      "expo",
      "start",
      "--web",
      "--port",
      port.toString(),
      "--non-interactive",
      "--clear",
    ],
    {
      stdio: "inherit",
      env: process.env,
    }
  );

  // Handle process termination
  process.on("SIGINT", () => {
    console.log("\n🛑 Stopping Expo web server...");
    expoProcess.kill("SIGINT");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    expoProcess.kill("SIGTERM");
    process.exit(0);
  });

  expoProcess.on("exit", (code) => {
    process.exit(code || 0);
  });
}

main().catch((error) => {
  console.error("❌ Error starting Expo web server:", error.message);
  process.exit(1);
});
