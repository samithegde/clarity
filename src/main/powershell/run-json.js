const { execFile } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

// PowerShell 5.1 ConvertTo-Json can emit raw control chars inside strings.
function parsePowerShellJson(raw) {
  const cleaned = String(raw)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[\u2028\u2029]/g, " ");
  return JSON.parse(cleaned);
}

function runPowerShellJson(script, { timeout = 15000, stdin, maxBuffer = 1024 * 1024 * 4 } = {}) {
  const scriptPath = path.join(
    os.tmpdir(),
    `clarity-${process.pid}-${Date.now()}.ps1`,
  );

  fs.writeFileSync(scriptPath, script, "utf8");

  return new Promise((resolve, reject) => {
    const child = execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
      { timeout, maxBuffer },
      (error, stdout, stderr) => {
        fs.unlink(scriptPath, () => {});

        if (error) {
          const hint = error.killed
            ? `PowerShell timed out after ${timeout}ms`
            : stderr?.trim() || error.message;
          reject(new Error(hint));
          return;
        }

        const trimmed = (stdout || "").trim();
        if (!trimmed) {
          resolve([]);
          return;
        }

        try {
          resolve(parsePowerShellJson(trimmed));
        } catch (parseError) {
          reject(
            new Error(`Invalid PowerShell JSON output: ${parseError.message}`),
          );
        }
      },
    );

    if (stdin != null) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

module.exports = { runPowerShellJson };
