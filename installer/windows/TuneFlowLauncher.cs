using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace TuneFlow
{
    static class Program
    {
        // Win32 & DWM P/Invoke for Native Dark Titlebar & Window Styling (SPEC-0016)
        private const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;
        private const int DWMWA_BORDER_COLOR = 34;
        private const int DWMWA_CAPTION_COLOR = 35;
        private const int DWMWA_TEXT_COLOR = 36;

        // COLORREF format: 0x00BBGGRR
        // Warm Obsidian (#121316) => R=0x12, G=0x13, B=0x16 => 0x00161312
        private const int CAPTION_COLOR_OBSIDIAN = 0x00161312;
        // Warm Cream Text (#F5F0E6) => R=0xF5, G=0xF0, B=0xE6 => 0x00E6F0F5
        private const int TEXT_COLOR_CREAM = 0x00E6F0F5;
        // Border Subtle (#262A34) => R=0x26, G=0x2A, B=0x34 => 0x00342A26
        private const int BORDER_COLOR_SUBTLE = 0x00342A26;

        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("dwmapi.dll", PreserveSig = true)]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        [DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        private static extern bool IsWindowVisible(IntPtr hWnd);

        private static Process backendProcess = null;
        private static Mutex singleInstanceMutex = null;
        private static NotifyIcon trayIcon = null;
        private static System.Windows.Forms.Timer dwmStyleTimer = null;
        private static int dwmStyleTicks = 0;
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
                for (int i = 0; i < 8; i++)
                {
                    Thread.Sleep(250);
                    ApplyDwmDarkTitlebarToTuneFlowWindows();
                }
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
                scriptPathResolved = Path.Combine(baseDirResolved, "..", "..", "bin", "tuneflow.js");
            }

            if (!File.Exists(scriptPathResolved))
            {
                MessageBox.Show(
                    "Không tìm thấy tệp khởi động TuneFlow tại: " + scriptPathResolved,
                    "TuneFlow",
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

            // 4. Setup Windows Notification Area (System Tray) Icon & Vietnamese Menu
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

            trayIcon.Text = string.Format("TuneFlow Desktop (127.0.0.1:{0})", port);
            trayIcon.Visible = true;

            ContextMenuStrip menu = new ContextMenuStrip();
            ToolStripMenuItem openItem = new ToolStripMenuItem("Mở Cửa Sổ TuneFlow", null, delegate { OpenAppWindow(); });
            openItem.Font = new Font(openItem.Font, FontStyle.Bold);
            menu.Items.Add(openItem);

            menu.Items.Add("Mở Thư Mục Nhạc Đã Tải", null, delegate { OpenDownloadsFolder(); });
            menu.Items.Add("Kiểm Tra Hệ Thống (Doctor)", null, delegate
            {
                try { Process.Start(string.Format("http://127.0.0.1:{0}/api/system/doctor", port)); } catch { }
            });
            menu.Items.Add("Khởi Động Lại Máy Chủ Nhạc", null, delegate { RestartBackend(); });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Thoát Hoàn Toàn TuneFlow", null, delegate
            {
                if (trayIcon != null) trayIcon.Visible = false;
                Application.Exit();
            });

            trayIcon.ContextMenuStrip = menu;
            trayIcon.DoubleClick += delegate { OpenAppWindow(); };

            // 5. Open Standalone Desktop Window & Apply Win32 DWM Dark Titlebar
            OpenAppWindow();
            StartDwmWindowStyler();

            // 6. Run Windows Forms Message Loop to service Tray Icon & keep backend alive
            Application.Run();

            Cleanup();
        }

        private static void StartDwmWindowStyler()
        {
            dwmStyleTicks = 0;
            if (dwmStyleTimer != null)
            {
                try { dwmStyleTimer.Stop(); dwmStyleTimer.Dispose(); } catch { }
            }
            dwmStyleTimer = new System.Windows.Forms.Timer();
            dwmStyleTimer.Interval = 350;
            dwmStyleTimer.Tick += delegate
            {
                dwmStyleTicks++;
                ApplyDwmDarkTitlebarToTuneFlowWindows();
                if (dwmStyleTicks > 40 && dwmStyleTimer != null)
                {
                    dwmStyleTimer.Interval = 1000;
                }
            };
            dwmStyleTimer.Start();
            ApplyDwmDarkTitlebarToTuneFlowWindows();
        }

        private static void ApplyDwmDarkTitlebarToTuneFlowWindows()
        {
            try
            {
                string portToken = "127.0.0.1:" + port.ToString();
                EnumWindows(delegate(IntPtr hWnd, IntPtr lParam)
                {
                    if (!IsWindowVisible(hWnd)) return true;
                    StringBuilder sb = new StringBuilder(256);
                    if (GetWindowText(hWnd, sb, sb.Capacity) > 0)
                    {
                        string title = sb.ToString();
                        if (title.IndexOf("TuneFlow", StringComparison.OrdinalIgnoreCase) >= 0 ||
                            title.IndexOf("Nghe Thử", StringComparison.OrdinalIgnoreCase) >= 0 ||
                            title.IndexOf(portToken, StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            int darkMode = 1;
                            int captionColor = CAPTION_COLOR_OBSIDIAN;
                            int textColor = TEXT_COLOR_CREAM;
                            int borderColor = BORDER_COLOR_SUBTLE;
                            try { DwmSetWindowAttribute(hWnd, DWMWA_USE_IMMERSIVE_DARK_MODE, ref darkMode, sizeof(int)); } catch { }
                            try { DwmSetWindowAttribute(hWnd, DWMWA_CAPTION_COLOR, ref captionColor, sizeof(int)); } catch { }
                            try { DwmSetWindowAttribute(hWnd, DWMWA_TEXT_COLOR, ref textColor, sizeof(int)); } catch { }
                            try { DwmSetWindowAttribute(hWnd, DWMWA_BORDER_COLOR, ref borderColor, sizeof(int)); } catch { }
                        }
                    }
                    return true;
                }, IntPtr.Zero);
            }
            catch { }
        }

        private static void PurgeStaleBrowserCache(string profileDir)
        {
            if (string.IsNullOrEmpty(profileDir) || !Directory.Exists(profileDir)) return;

            string[] staleCachePaths = new string[]
            {
                Path.Combine(profileDir, "Default", "Service Worker"),
                Path.Combine(profileDir, "Default", "Cache"),
                Path.Combine(profileDir, "Default", "Code Cache"),
                Path.Combine(profileDir, "ShaderCache")
            };

            foreach (string target in staleCachePaths)
            {
                if (Directory.Exists(target))
                {
                    try { Directory.Delete(target, true); } catch { }
                }
            }
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
                    "Không thể khởi chạy máy chủ TuneFlow: " + ex.Message,
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

            string targetUrl = string.Format("http://127.0.0.1:{0}/?desktop=1", port);
            string profileDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "TuneFlow",
                "AppProfile"
            );

            // Sanitize stale Service Worker & HTTP cache so latest UI always loads cleanly
            PurgeStaleBrowserCache(profileDir);

            if (appRunner != null)
            {
                string appArgs = string.Format(
                    "--app=\"{0}\" --window-size=1220,800 --user-data-dir=\"{1}\" --force-dark-mode --enable-features=WebUIDarkMode,OverlayScrollbar --disable-http-cache --no-first-run --no-default-browser-check",
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
                    ApplyDwmDarkTitlebarToTuneFlowWindows();
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
            if (dwmStyleTimer != null)
            {
                try { dwmStyleTimer.Stop(); dwmStyleTimer.Dispose(); dwmStyleTimer = null; } catch { }
            }

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