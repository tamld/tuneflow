using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

namespace TuneFlow
{
    static class Program
    {
        private static Process backendProcess = null;

        [STAThread]
        static void Main(string[] args)
        {
            AppDomain.CurrentDomain.ProcessExit += OnProcessExit;

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            // 1. Locate Node.js executable
            string nodeExe = Path.Combine(baseDir, "node.exe");
            if (!File.Exists(nodeExe))
            {
                nodeExe = Path.Combine(baseDir, "TuneFlowBackend.exe");
            }
            if (!File.Exists(nodeExe))
            {
                nodeExe = "node";
            }

            string scriptPath = Path.Combine(baseDir, "bin", "tuneflow.js");
            if (!File.Exists(scriptPath))
            {
                // Fallback for dev repository layout
                scriptPath = Path.Combine(baseDir, "..", "..", "bin", "tuneflow.js");
            }

            if (!File.Exists(scriptPath))
            {
                MessageBox.Show(
                    "TuneFlow entrypoint script not found at: " + scriptPath,
                    "TuneFlow Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // 2. Start Node.js backend silently with NO black command window
            ProcessStartInfo backendInfo = new ProcessStartInfo
            {
                FileName = nodeExe,
                Arguments = "\"" + scriptPath + "\" --daemon",
                WorkingDirectory = baseDir,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                UseShellExecute = false
            };

            try
            {
                backendProcess = Process.Start(backendInfo);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Failed to launch TuneFlow backend engine: " + ex.Message,
                    "TuneFlow Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // 3. Wait for port 3000 to listen (up to 15 seconds)
            int port = 3000;
            bool ready = false;
            for (int i = 0; i < 75; i++)
            {
                if (backendProcess != null && backendProcess.HasExited)
                {
                    MessageBox.Show(
                        "TuneFlow backend engine exited unexpectedly (Exit Code: " + backendProcess.ExitCode + ").",
                        "TuneFlow Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                try
                {
                    using (TcpClient client = new TcpClient())
                    {
                        IAsyncResult ar = client.BeginConnect("127.0.0.1", port, null, null);
                        if (ar.AsyncWaitHandle.WaitOne(200))
                        {
                            client.EndConnect(ar);
                            ready = true;
                            break;
                        }
                    }
                }
                catch { }

                Thread.Sleep(100);
            }

            if (!ready)
            {
                MessageBox.Show(
                    "TuneFlow backend engine did not respond on port " + port + " within 15 seconds.",
                    "TuneFlow Warning",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
            }

            // 4. Launch Standalone Desktop Application Window (Zero Browser Residue)
            string appRunner = null;
            string[] candidates = new string[]
            {
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe")
            };

            foreach (string c in candidates)
            {
                if (File.Exists(c))
                {
                    appRunner = c;
                    break;
                }
            }

            string targetUrl = "http://127.0.0.1:" + port;
            string profileDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "TuneFlow",
                "AppProfile"
            );

            Process guiProcess = null;
            if (appRunner != null)
            {
                // App Mode: Opens standalone window with NO tabs, NO URL bar, and custom 1080x750 frame
                string appArgs = string.Format(
                    "--app=\"{0}\" --window-size=1080,750 --user-data-dir=\"{1}\" --app-id=com.tamld.tuneflow",
                    targetUrl,
                    profileDir
                );

                ProcessStartInfo guiInfo = new ProcessStartInfo
                {
                    FileName = appRunner,
                    Arguments = appArgs,
                    UseShellExecute = true
                };

                try
                {
                    guiProcess = Process.Start(guiInfo);
                }
                catch
                {
                    Process.Start(targetUrl);
                }
            }
            else
            {
                // Fallback to default browser if no Chromium/Edge runtime found
                Process.Start(targetUrl);
            }

            // 5. Wait for standalone window to close, then cleanly terminate backend
            if (guiProcess != null)
            {
                try
                {
                    guiProcess.WaitForExit();
                }
                catch { }
            }

            CleanupBackend();
        }

        private static void OnProcessExit(object sender, EventArgs e)
        {
            CleanupBackend();
        }

        private static void CleanupBackend()
        {
            if (backendProcess != null && !backendProcess.HasExited)
            {
                try
                {
                    backendProcess.Kill();
                    backendProcess.Dispose();
                    backendProcess = null;
                }
                catch { }
            }
        }
    }
}
