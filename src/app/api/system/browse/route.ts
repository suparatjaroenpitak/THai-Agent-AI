import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execAsync = promisify(exec);

export async function GET() {
  try {
    let path = "";
    if (process.platform === "win32") {
      const script = `
Add-Type -AssemblyName System.windows.forms
$folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
$folderBrowser.Description = 'Select Project Folder'
if ($folderBrowser.ShowDialog() -eq 'OK') {
  Write-Host $folderBrowser.SelectedPath
}
      `.trim();
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${script.replace(/\n/g, '; ')}"`);
      path = stdout.trim();
    } else if (process.platform === "darwin") {
      const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to return POSIX path of (choose folder)'`);
      path = stdout.trim();
    } else {
      const { stdout } = await execAsync(`zenity --file-selection --directory`);
      path = stdout.trim();
    }

    if (!path) {
      return NextResponse.json({ error: "No folder selected" }, { status: 400 });
    }

    return NextResponse.json({ path });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
