using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace TuneFlow
{
    static class Program
    {
        private static Process backendProcess = null;
        private static Mutex singleInstanceMutex = null;
        private static NotifyIcon trayIcon = null;
        private static int port = 3000;

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // 0. Single-instance guard: focus/re-open window if already running
            bool isNewInstance = false;
            singleInstanceMutex = new Mutex(true, "com.tamld.tuneflow.singleinstance", out isNewInstance);
            if (!isNewInstance)
            {
                OpenAppWindow();
                return;
            }

            AppDomain.CurrentDomain.ProcessExit += delegate { Cleanup(); };

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            // 1. Locate Node.js runtime executable
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
                // Fallback for development workspace layout
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
                Arguments = string.Format("\"{0}\" --daemon --no-browser --port {1}", scriptPath, port),
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

            // 3. Wait for HTTP /api/health to be ready (up to 15 seconds)
            WaitForHealth();

            // 4. Setup Windows Notification Area (System Tray) Icon & Menu
            trayIcon = new NotifyIcon();
            string iconPath = Path.Combine(baseDir, "public", "icons", "favicon.ico");
            if (!File.Exists(iconPath))
            {
                iconPath = Path.Combine(baseDir, "..", "..", "public", "icons", "favicon.ico");
            }

            if (File.Exists(iconPath))
            {
                try
                {
                    trayIcon.Icon = new Icon(iconPath);
                }
                catch
                {
                    trayIcon.Icon = SystemIcons.Application;
                }
            }
            else
            {
                trayIcon.Icon = SystemIcons.Application;
            }

            trayIcon.Text = "TuneFlow - YouTube Music Player";
            trayIcon.Visible = true;

            ContextMenuStrip menu = new ContextMenuStrip();
            ToolStripMenuItem openItem = new ToolStripMenuItem("Open TuneFlow", null, delegate { OpenAppWindow(); });
            openItem.Font = new Font(openItem.Font, FontStyle.Bold);
            menu.Items.Add(openItem);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Exit TuneFlow", null, delegate
            {
                if (trayIcon != null) trayIcon.Visible = false;
                Application.Exit();
            });

            trayIcon.ContextMenuStrip = menu;
            trayIcon.DoubleClick += delegate { OpenAppWindow(); };

            // 5. Open Standalone Window (Zero Browser Residue) immediately on start
            OpenAppWindow();

            // 6. Run Windows Forms Message Loop to service Tray Icon & keep backend alive
            Application.Run();

            Cleanup();
        }

        private static void WaitForHealth()
        {
            string healthUrl = string.Format("http://127.0.0.1:{0}/api/health", port);
            for (int i = 0; i < 75; i++)
            {
                if (backendProcess != null && backendProcess.HasExited) return;

                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create(healthUrl);
                    req.Timeout = 400;
                    using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                    {
                        if ((int)resp.StatusCode >= 200 && (int)resp.StatusCode < 400)
                        {
                            break;
                        }
                    }
                }
                catch { }

                Thread.Sleep(200);
            }
        }

        private static void OpenAppWindow()
        {
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

            string targetUrl = string.Format("http://127.0.0.1:{0}", port);
            string profileDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "TuneFlow",
                "AppProfile"
            );

            if (appRunner != null)
            {
                string appArgs = string.Format(
                    "--app=\"{0}\" --window-size=1080,750 --user-data-dir=\"{1}\" --no-first-run --no-default-browser-check",
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
                    Process.Start(guiInfo);
                }
                catch
                {
                    Process.Start(targetUrl);
                }
            }
            else
            {
                Process.Start(targetUrl);
            }
        }

        private static void Cleanup()
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

            if (trayIcon != null)
            {
                try
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                    trayIcon = null;
                }
                catch { }
            }

            if (singleInstanceMutex != null)
            {
                try
                {
                    singleInstanceMutex.ReleaseMutex();
                    singleInstanceMutex.Dispose();
                    singleInstanceMutex = null;
                }
                catch { }
            }
        }
    }
}