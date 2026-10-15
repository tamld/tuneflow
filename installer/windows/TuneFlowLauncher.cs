using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
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
        private static string nodeExePath = null;
        private static string scriptPathResolved = null;
        private static string baseDirResolved = null;

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string stateDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "TuneFlow"
            );
            string activePortFile = Path.Combine(stateDir, "active_port.txt");

            // 0. Single-instance guard: focus/re-open window if already running
            bool isNewInstance = false;
            singleInstanceMutex = new Mutex(true, "com.tamld.tuneflow.singleinstance", out isNewInstance);
            if (!isNewInstance)
            {
                if (File.Exists(activePortFile))
                {
                    int savedPort;
                    if (int.TryParse(File.ReadAllText(activePortFile).Trim(), out savedPort) && savedPort > 0)
                    {
                        port = savedPort;
                    }
                }
                OpenAppWindow();
                return;
            }

            AppDomain.CurrentDomain.ProcessExit += delegate { Cleanup(); };

            baseDirResolved = AppDomain.CurrentDomain.BaseDirectory;
            port = FindAvailablePort(3000, 10);

            try
            {
                if (!Directory.Exists(stateDir)) Directory.CreateDirectory(stateDir);
                File.WriteAllText(activePortFile, port.ToString());
            }
            catch { }

            // 1. Locate Node.js runtime executable
            nodeExePath = Path.Combine(baseDirResolved, "node.exe");
            if (!File.Exists(nodeExePath))
            {
                nodeExePath = Path.Combine(baseDirResolved, "TuneFlowBackend.exe");
            }
            if (!File.Exists(nodeExePath))
            {
                nodeExePath = "node";
            }

            scriptPathResolved = Path.Combine(baseDirResolved, "bin", "tuneflow.js");
            if (!File.Exists(scriptPathResolved))
            {
                // Fallback for development workspace layout
                scriptPathResolved = Path.Combine(baseDirResolved, "..", "..", "bin", "tuneflow.js");
            }

            if (!File.Exists(scriptPathResolved))
            {
                MessageBox.Show(
                    "TuneFlow entrypoint script not found at: " + scriptPathResolved,
                    "TuneFlow Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // 2. Start Node.js backend silently with NO black command window
            if (!StartBackend())
            {
                return;
            }

            // 3. Wait for HTTP /api/health to be ready (up to 15 seconds)
            WaitForHealth();

            // 4. Setup Windows Notification Area (System Tray) Icon & Menu
            trayIcon = new NotifyIcon();
            string iconPath = Path.Combine(baseDirResolved, "public", "icons", "favicon.ico");
            if (!File.Exists(iconPath))
            {
                iconPath = Path.Combine(baseDirResolved, "..", "..", "public", "icons", "favicon.ico");
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

            trayIcon.Text = string.Format("TuneFlow v2.5.0 (127.0.0.1:{0})", port);
            trayIcon.Visible = true;

            ContextMenuStrip menu = new ContextMenuStrip();
            ToolStripMenuItem openItem = new ToolStripMenuItem("Open TuneFlow", null, delegate { OpenAppWindow(); });
            openItem.Font = new Font(openItem.Font, FontStyle.Bold);
            menu.Items.Add(openItem);

            menu.Items.Add("Open Downloads Folder", null, delegate { OpenDownloadsFolder(); });
            menu.Items.Add("Restart Engine", null, delegate { RestartBackend(); });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Exit TuneFlow", null, delegate
            {
                if (trayIcon != null) trayIcon.Visible = false;
                Application.Exit();
            });

            trayIcon.ContextMenuStrip = menu;
            trayIcon.DoubleClick += delegate { OpenAppWindow(); };

            try
            {
                trayIcon.ShowBalloonTip(
                    3000,
                    "TuneFlow v2.5.0",
                    string.Format("TuneFlow engine is running in the background (port {0}). Double-click the tray icon anytime to open.", port),
                    ToolTipIcon.Info
                );
            }
            catch { }

            // 5. Open Standalone Window (Zero Browser Residue) immediately on start
            OpenAppWindow();

            // 6. Run Windows Forms Message Loop to service Tray Icon & keep backend alive
            Application.Run();

            Cleanup();
        }

        private static int FindAvailablePort(int startPort, int maxAttempts)
        {
            for (int p = startPort; p < startPort + maxAttempts; p++)
            {
                TcpListener listener = null;
                try
                {
                    listener = new TcpListener(IPAddress.Loopback, p);
                    listener.Start();
                    listener.Stop();
                    return p;
                }
                catch
                {
                    if (listener != null)
                    {
                        try { listener.Stop(); } catch { }
                    }
                }
            }
            return startPort;
        }

        private static bool StartBackend()
        {
            ProcessStartInfo backendInfo = new ProcessStartInfo
            {
                FileName = nodeExePath,
                Arguments = string.Format("\"{0}\" --daemon --no-browser --port {1}", scriptPathResolved, port),
                WorkingDirectory = baseDirResolved,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                UseShellExecute = false
            };

            try
            {
                backendProcess = Process.Start(backendInfo);
                return true;
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Failed to launch TuneFlow backend engine: " + ex.Message,
                    "TuneFlow Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return false;
            }
        }

        private static void RestartBackend()
        {
            if (backendProcess != null && !backendProcess.HasExited)
            {
                try
                {
                    backendProcess.Kill();
                    backendProcess.Dispose();
                }
                catch { }
            }
            if (StartBackend())
            {
                WaitForHealth();
                OpenAppWindow();
            }
        }

        private static void OpenDownloadsFolder()
        {
            string downloadsDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "TuneFlow",
                "downloads"
            );
            if (!Directory.Exists(downloadsDir))
            {
                try { Directory.CreateDirectory(downloadsDir); } catch { }
            }
            try
            {
                Process.Start("explorer.exe", "\"" + downloadsDir + "\"");
            }
            catch { }
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
                    "--app=\"{0}\" --window-size=1140,780 --user-data-dir=\"{1}\" --no-first-run --no-default-browser-check",
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