const { execFile } = require("child_process");

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      (error) => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
}

function getNativeHwnd(window) {
  if (!window || window.isDestroyed()) return null;
  const handle = window.getNativeWindowHandle();
  if (!handle?.length) return null;
  if (handle.length >= 8) {
    return handle.readBigInt64LE(0);
  }
  return BigInt(handle.readUInt32LE(0));
}

function hideNativeTitleBar(window) {
  if (process.platform !== "win32") return Promise.resolve();

  const hwnd = getNativeHwnd(window);
  if (hwnd === null) return Promise.resolve();

  return runPowerShell(`
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Chrome {
  [StructLayout(LayoutKind.Sequential)]
  public struct MARGINS {
    public int cxLeftWidth, cxRightWidth, cyTopHeight, cyBottomHeight;
  }
  [DllImport("dwmapi.dll")] public static extern int DwmExtendFrameIntoClientArea(IntPtr hWnd, ref MARGINS pMarInset);
  public static void HideTitleBar(IntPtr hWnd) {
    var margins = new MARGINS { cxLeftWidth = -1, cxRightWidth = -1, cyTopHeight = -1, cyBottomHeight = -1 };
    DwmExtendFrameIntoClientArea(hWnd, ref margins);
  }
}
"@
    [Win32Chrome]::HideTitleBar([IntPtr]${hwnd})
  `).catch(() => {});
}

module.exports = { hideNativeTitleBar };
