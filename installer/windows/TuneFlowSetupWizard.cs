using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace TuneFlowSetup
{
    public class SetupForm : Form
    {
        private TextBox txtInstallDir;
        private CheckBox chkDesktopShortcut;
        private CheckBox chkStartMenuShortcut;
        private CheckBox chkRegisterProtocol;
        private CheckBox chkLaunchAfter;
        private ProgressBar progressBar;
        private TextBox txtLog;
        private Button btnInstall;
        private Button btnCancel;
        private Button btnBrowse;
        private bool isInstalling = false;

        public SetupForm(string initialDir)
        {
            this.Text = "TuneFlow v2.5.0 Setup Wizard";
            this.Size = new Size(640, 520);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            try
            {
                this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            }
            catch { }

            // Header Panel
            Panel headerPanel = new Panel
            {
                Dock = DockStyle.Top,
                Height = 86,
                BackColor = Color.FromArgb(15, 23, 42)
            };

            PictureBox picIcon = new PictureBox
            {
                Location = new Point(22, 19),
                Size = new Size(48, 48),
                SizeMode = PictureBoxSizeMode.StretchImage
            };
            try
            {
                Icon appIcon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                if (appIcon != null) picIcon.Image = appIcon.ToBitmap();
            }
            catch { }
            headerPanel.Controls.Add(picIcon);

            Label lblTitle = new Label
            {
                Text = "TuneFlow v2.5.0 — Native Desktop Setup",
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 14f, FontStyle.Bold),
                Location = new Point(82, 16),
                AutoSize = true
            };
            headerPanel.Controls.Add(lblTitle);

            Label lblSub = new Label
            {
                Text = "Self-contained YouTube Music Player & Downloader (Zero-Admin, No Docker Required)",
                ForeColor = Color.FromArgb(148, 163, 184),
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                Location = new Point(84, 48),
                AutoSize = true
            };
            headerPanel.Controls.Add(lblSub);
            this.Controls.Add(headerPanel);

            // Install Directory Section
            Label lblDir = new Label
            {
                Text = "Installation Directory (Zero-Admin User Scope):",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(30, 41, 59),
                Location = new Point(24, 104),
                AutoSize = true
            };
            this.Controls.Add(lblDir);

            txtInstallDir = new TextBox
            {
                Text = initialDir,
                Location = new Point(24, 130),
                Size = new Size(468, 28),
                Font = new Font("Consolas", 9.5f)
            };
            this.Controls.Add(txtInstallDir);

            btnBrowse = new Button
            {
                Text = "Browse...",
                Location = new Point(502, 128),
                Size = new Size(98, 29),
                BackColor = Color.White,
                FlatStyle = FlatStyle.System
            };
            btnBrowse.Click += delegate
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.SelectedPath = txtInstallDir.Text;
                    fbd.Description = "Select destination folder for TuneFlow v2.5.0";
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        txtInstallDir.Text = fbd.SelectedPath;
                    }
                }
            };
            this.Controls.Add(btnBrowse);

            // Options Group
            GroupBox grpOptions = new GroupBox
            {
                Text = "Setup Options & System Integration",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(30, 41, 59),
                Location = new Point(24, 170),
                Size = new Size(576, 136)
            };

            chkDesktopShortcut = new CheckBox
            {
                Text = "Create Desktop Icon (Biểu tượng TuneFlow ngoài màn hình nền)",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                Checked = true,
                Location = new Point(16, 26),
                AutoSize = true
            };
            grpOptions.Controls.Add(chkDesktopShortcut);

            chkStartMenuShortcut = new CheckBox
            {
                Text = "Create Start Menu Program Shortcut (Biểu tượng trong Start Menu)",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                Checked = true,
                Location = new Point(16, 52),
                AutoSize = true
            };
            grpOptions.Controls.Add(chkStartMenuShortcut);

            chkRegisterProtocol = new CheckBox
            {
                Text = "Register Win+R 'tuneflow' command & tuneflow:// URL Protocol",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                Checked = true,
                Location = new Point(16, 78),
                AutoSize = true
            };
            grpOptions.Controls.Add(chkRegisterProtocol);

            chkLaunchAfter = new CheckBox
            {
                Text = "Launch TuneFlow immediately after installation completes",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(5, 150, 105),
                Checked = true,
                Location = new Point(16, 104),
                AutoSize = true
            };
            grpOptions.Controls.Add(chkLaunchAfter);
            this.Controls.Add(grpOptions);

            // Progress Bar & Log
            progressBar = new ProgressBar
            {
                Location = new Point(24, 318),
                Size = new Size(576, 22),
                Minimum = 0,
                Maximum = 100,
                Value = 0
            };
            this.Controls.Add(progressBar);

            txtLog = new TextBox
            {
                Location = new Point(24, 348),
                Size = new Size(576, 74),
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.FromArgb(15, 23, 42),
                ForeColor = Color.FromArgb(226, 232, 240),
                Font = new Font("Consolas", 8.75f),
                Text = "Ready to install TuneFlow v2.5.0 (bundled Node.js runtime + native desktop launcher).\r\n"
            };
            this.Controls.Add(txtLog);

            // Bottom Action Buttons
            btnInstall = new Button
            {
                Text = "Install Now",
                Location = new Point(368, 434),
                Size = new Size(124, 36),
                BackColor = Color.FromArgb(16, 185, 129),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 10f, FontStyle.Bold)
            };
            btnInstall.FlatAppearance.BorderSize = 0;
            btnInstall.Click += OnInstallClick;
            this.Controls.Add(btnInstall);

            btnCancel = new Button
            {
                Text = "Close",
                Location = new Point(502, 434),
                Size = new Size(98, 36),
                BackColor = Color.White,
                FlatStyle = FlatStyle.System
            };
            btnCancel.Click += delegate
            {
                if (!isInstalling) this.Close();
            };
            this.Controls.Add(btnCancel);
        }

        private void AppendLog(string message)
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action<string>(AppendLog), message);
                return;
            }
            txtLog.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + message + "\r\n");
        }

        private void UpdateProgress(int val)
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action<int>(UpdateProgress), val);
                return;
            }
            if (val < 0) val = 0;
            if (val > 100) val = 100;
            progressBar.Value = val;
        }

        private void OnInstallClick(object sender, EventArgs e)
        {
            if (isInstalling) return;
            isInstalling = true;
            btnInstall.Enabled = false;
            btnBrowse.Enabled = false;
            txtInstallDir.ReadOnly = true;

            string targetDir = txtInstallDir.Text.Trim();
            bool createDesktop = chkDesktopShortcut.Checked;
            bool createStartMenu = chkStartMenuShortcut.Checked;
            bool registerProtocol = chkRegisterProtocol.Checked;
            bool launchAfter = chkLaunchAfter.Checked;

            Thread worker = new Thread(delegate()
            {
                try
                {
                    InstallerEngine.RunInstall(
                        targetDir,
                        createDesktop,
                        createStartMenu,
                        registerProtocol,
                        AppendLog,
                        UpdateProgress
                    );

                    this.BeginInvoke(new Action(delegate()
                    {
                        isInstalling = false;
                        btnInstall.Text = "Installed";
                        btnCancel.Text = "Finish";

                        if (launchAfter)
                        {
                            string exePath = Path.Combine(targetDir, "TuneFlow.exe");
                            if (File.Exists(exePath))
                            {
                                try
                                {
                                    Process.Start(new ProcessStartInfo
                                    {
                                        FileName = exePath,
                                        WorkingDirectory = targetDir,
                                        UseShellExecute = true
                                    });
                                }
                                catch { }
                            }
                            this.Close();
                        }
                        else
                        {
                            MessageBox.Show(
                                "TuneFlow v2.5.0 has been installed to:\n" + targetDir,
                                "TuneFlow Setup Complete",
                                MessageBoxButtons.OK,
                                MessageBoxIcon.Information
                            );
                        }
                    }));
                }
                catch (Exception ex)
                {
                    AppendLog("ERROR: " + ex.Message);
                    this.BeginInvoke(new Action(delegate()
                    {
                        isInstalling = false;
                        btnInstall.Enabled = true;
                        MessageBox.Show(
                            "Installation failed: " + ex.Message,
                            "TuneFlow Setup Error",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error
                        );
                    }));
                }
            });
            worker.IsBackground = true;
            worker.Start();
        }
    }

    public static class InstallerEngine
    {
        public static void StopRunningInstances()
        {
            foreach (string procName in new string[] { "TuneFlow", "TuneFlowBackend" })
            {
                try
                {
                    foreach (Process p in Process.GetProcessesByName(procName))
                    {
                        try
                        {
                            p.Kill();
                            p.WaitForExit(2000);
                        }
                        catch { }
                    }
                }
                catch { }
            }
        }

        public static void RunInstall(
            string targetDir,
            bool createDesktopShortcut,
            bool createStartMenuShortcut,
            bool registerShellContracts,
            Action<string> log,
            Action<int> progress
        )
        {
            log("Stopping any running TuneFlow instances...");
            progress(5);
            StopRunningInstances();

            if (!Directory.Exists(targetDir))
            {
                Directory.CreateDirectory(targetDir);
            }

            log("Extracting embedded TuneFlow v2.5.0 payload to " + targetDir + "...");
            progress(15);

            Assembly asm = Assembly.GetExecutingAssembly();
            using (Stream resStream = asm.GetManifestResourceStream("TuneFlow.Payload.zip"))
            {
                if (resStream == null)
                {
                    throw new InvalidOperationException("Embedded resource TuneFlow.Payload.zip not found.");
                }

                using (ZipArchive archive = new ZipArchive(resStream, ZipArchiveMode.Read))
                {
                    int total = archive.Entries.Count;
                    int count = 0;
                    foreach (ZipArchiveEntry entry in archive.Entries)
                    {
                        count++;
                        string fullPath = Path.GetFullPath(Path.Combine(targetDir, entry.FullName));
                        if (!fullPath.StartsWith(Path.GetFullPath(targetDir), StringComparison.OrdinalIgnoreCase))
                        {
                            continue;
                        }

                        if (string.IsNullOrEmpty(entry.Name))
                        {
                            Directory.CreateDirectory(fullPath);
                            continue;
                        }

                        string parentDir = Path.GetDirectoryName(fullPath);
                        if (!string.IsNullOrEmpty(parentDir) && !Directory.Exists(parentDir))
                        {
                            Directory.CreateDirectory(parentDir);
                        }

                        entry.ExtractToFile(fullPath, true);
                        if (count % 40 == 0 || count == total)
                        {
                            int pct = 15 + (int)((count * 65.0) / Math.Max(1, total));
                            progress(pct);
                        }
                    }
                }
            }

            // Copy setup binary as Uninstall-TuneFlow.exe
            string uninstallerPath = Path.Combine(targetDir, "Uninstall-TuneFlow.exe");
            try
            {
                File.Copy(Application.ExecutablePath, uninstallerPath, true);
            }
            catch { }

            string appExe = Path.Combine(targetDir, "TuneFlow.exe");
            string iconPath = Path.Combine(targetDir, "public", "icons", "favicon.ico");

            progress(85);
            if (createDesktopShortcut)
            {
                log("Creating Desktop shortcut...");
                string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                CreateShortcut(
                    Path.Combine(desktopDir, "TuneFlow.lnk"),
                    appExe,
                    targetDir,
                    "TuneFlow - Elderly-Friendly YouTube Music Downloader & Player",
                    iconPath
                );
            }

            if (createStartMenuShortcut)
            {
                log("Creating Start Menu shortcuts...");
                string startMenuDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.Programs),
                    "TuneFlow"
                );
                if (!Directory.Exists(startMenuDir)) Directory.CreateDirectory(startMenuDir);

                CreateShortcut(
                    Path.Combine(startMenuDir, "TuneFlow.lnk"),
                    appExe,
                    targetDir,
                    "TuneFlow - Elderly-Friendly YouTube Music Downloader & Player",
                    iconPath
                );
                CreateShortcut(
                    Path.Combine(startMenuDir, "Uninstall TuneFlow.lnk"),
                    uninstallerPath,
                    targetDir,
                    "Uninstall TuneFlow",
                    iconPath,
                    "--uninstall"
                );
            }

            progress(92);
            if (registerShellContracts)
            {
                log("Registering HKCU App Paths, tuneflow:// URL protocol, and Windows Uninstall entry...");
                RegisterRegistryEntries(targetDir, appExe, uninstallerPath, iconPath);
            }

            progress(100);
            log("Installation completed successfully!");
        }

        private static void CreateShortcut(
            string shortcutPath,
            string targetPath,
            string workingDir,
            string description,
            string iconLocation,
            string arguments = ""
        )
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;
                object shell = Activator.CreateInstance(shellType);
                object shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { shortcutPath });
                Type scType = shortcut.GetType();
                scType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { targetPath });
                scType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { workingDir });
                scType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { description });
                if (!string.IsNullOrEmpty(arguments))
                {
                    scType.InvokeMember("Arguments", BindingFlags.SetProperty, null, shortcut, new object[] { arguments });
                }
                if (!string.IsNullOrEmpty(iconLocation) && File.Exists(iconLocation))
                {
                    scType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { iconLocation });
                }
                scType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
            }
            catch { }
        }

        private static void RegisterRegistryEntries(string targetDir, string appExe, string uninstallerPath, string iconPath)
        {
            try
            {
                using (RegistryKey k = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\App Paths\TuneFlow.exe"))
                {
                    if (k != null)
                    {
                        k.SetValue("", appExe);
                        k.SetValue("Path", targetDir);
                    }
                }
                using (RegistryKey k = Registry.CurrentUser.CreateSubKey(@"Software\Classes\tuneflow"))
                {
                    if (k != null)
                    {
                        k.SetValue("", "URL:TuneFlow Protocol");
                        k.SetValue("URL Protocol", "");
                    }
                }
                using (RegistryKey k = Registry.CurrentUser.CreateSubKey(@"Software\Classes\tuneflow\DefaultIcon"))
                {
                    if (k != null) k.SetValue("", iconPath);
                }
                using (RegistryKey k = Registry.CurrentUser.CreateSubKey(@"Software\Classes\tuneflow\shell\open\command"))
                {
                    if (k != null) k.SetValue("", "\"" + appExe + "\" \"%1\"");
                }
                using (RegistryKey k = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\TuneFlow"))
                {
                    if (k != null)
                    {
                        k.SetValue("DisplayName", "TuneFlow v2.5.0");
                        k.SetValue("DisplayVersion", "2.5.0");
                        k.SetValue("Publisher", "Tam Le Duc (anh Tam)");
                        k.SetValue("DisplayIcon", iconPath);
                        k.SetValue("InstallLocation", targetDir);
                        k.SetValue("UninstallString", "\"" + uninstallerPath + "\" --uninstall");
                        k.SetValue("NoModify", 1, RegistryValueKind.DWord);
                        k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                    }
                }
            }
            catch { }
        }

        public static void RunUninstall(string installDir, bool silent)
        {
            if (!silent)
            {
                DialogResult dr = MessageBox.Show(
                    "Do you want to uninstall TuneFlow v2.5.0 from your computer?\n(Your downloaded MP3/MP4 files in AppData\\Local\\TuneFlow\\downloads will be preserved.)",
                    "Uninstall TuneFlow",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question
                );
                if (dr != DialogResult.Yes) return;
            }

            StopRunningInstances();

            try
            {
                string desktopShortcut = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "TuneFlow.lnk");
                if (File.Exists(desktopShortcut)) File.Delete(desktopShortcut);

                string startMenuDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "TuneFlow");
                if (Directory.Exists(startMenuDir)) Directory.Delete(startMenuDir, true);

                Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\App Paths\TuneFlow.exe", false);
                Registry.CurrentUser.DeleteSubKeyTree(@"Software\Classes\tuneflow", false);
                Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\TuneFlow", false);
            }
            catch { }

            if (!silent)
            {
                MessageBox.Show("TuneFlow has been uninstalled.", "TuneFlow Uninstaller", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }
    }

    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string defaultDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs",
                "TuneFlow"
            );

            bool silent = false;
            bool uninstall = false;
            string customDir = null;

            foreach (string arg in args)
            {
                string upper = arg.ToUpperInvariant();
                if (upper == "/VERYSILENT" || upper == "/SILENT" || upper == "--SILENT" || upper == "-S")
                {
                    silent = true;
                }
                else if (upper == "--UNINSTALL" || upper == "/UNINSTALL")
                {
                    uninstall = true;
                }
                else if (upper.StartsWith("/DIR="))
                {
                    customDir = arg.Substring(5).Trim('"');
                }
            }

            string targetDir = !string.IsNullOrEmpty(customDir) ? customDir : defaultDir;

            if (uninstall)
            {
                InstallerEngine.RunUninstall(AppDomain.CurrentDomain.BaseDirectory, silent);
                return;
            }

            if (silent)
            {
                InstallerEngine.RunInstall(targetDir, true, true, true, delegate { }, delegate { });
                return;
            }

            Application.Run(new SetupForm(targetDir));
        }
    }
}
