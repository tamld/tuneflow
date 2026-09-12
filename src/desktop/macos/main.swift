import Cocoa
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var serverProcess: Process?
    var healthCheckTimer: Timer?
    var healthAttempts = 0
    var currentServerUrl = "http://127.0.0.1:3000"

    func applicationDidFinishLaunching(_ notification: Notification) {
        setupMenuBar()

        let screenRect = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1200, height: 800)
        let windowWidth: CGFloat = min(1200, screenRect.width * 0.85)
        let windowHeight: CGFloat = min(800, screenRect.height * 0.85)
        let rect = NSRect(
            x: screenRect.origin.x + (screenRect.width - windowWidth) / 2,
            y: screenRect.origin.y + (screenRect.height - windowHeight) / 2,
            width: windowWidth,
            height: windowHeight
        )

        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.center()
        window.title = "TuneFlow"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.backgroundColor = NSColor(red: 14.0/255.0, green: 16.0/255.0, blue: 23.0/255.0, alpha: 1.0)
        window.delegate = self
        window.minSize = NSSize(width: 480, height: 600)

        // WebKit Configuration optimized for Audio/Video playback and Desktop UX
        let config = WKWebViewConfiguration()
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsAirPlayForMediaPlayback = true
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        if #available(macOS 10.15, *) {
            config.defaultWebpagePreferences.allowsContentJavaScript = true
        }

        webView = WKWebView(frame: rect, configuration: config)
        webView.autoresizingMask = [.width, .height]
        if #available(macOS 13.3, *) {
            webView.isInspectable = true
        }
        window.contentView = webView

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        // Resolve active target server URL (Env > client-config.json > UserDefaults > 127.0.0.1:3000)
        currentServerUrl = resolveTargetServerUrl()

        // Bootstrap backend / connect remote server
        bootstrapAndLoad()
    }

    func setupMenuBar() {
        let mainMenu = NSMenu()

        // 1. Application Menu
        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)
        let appMenu = NSMenu()
        appMenuItem.submenu = appMenu

        let aboutItem = NSMenuItem(title: "Giới thiệu TuneFlow", action: #selector(showAbout), keyEquivalent: "")
        appMenu.addItem(aboutItem)
        appMenu.addItem(NSMenuItem.separator())

        let prefItem = NSMenuItem(title: "Cài đặt máy chủ (Preferences)...", action: #selector(openPreferences), keyEquivalent: ",")
        appMenu.addItem(prefItem)
        appMenu.addItem(NSMenuItem.separator())

        appMenu.addItem(withTitle: "Ẩn TuneFlow", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        let hideOthersItem = NSMenuItem(title: "Ẩn các ứng dụng khác", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        hideOthersItem.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(hideOthersItem)
        appMenu.addItem(withTitle: "Hiện tất cả", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())

        appMenu.addItem(withTitle: "Thoát TuneFlow", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")

        // 2. Edit Menu (Standard macOS Copy, Cut, Paste, Select All for WebKit text inputs)
        let editMenuItem = NSMenuItem()
        mainMenu.addItem(editMenuItem)
        let editMenu = NSMenu(title: "Edit")
        editMenuItem.submenu = editMenu
        editMenu.addItem(withTitle: "Undo", action: #selector(UndoManager.undo), keyEquivalent: "z")
        editMenu.addItem(withTitle: "Redo", action: #selector(UndoManager.redo), keyEquivalent: "Z")
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")

        // 3. View Menu
        let viewMenuItem = NSMenuItem()
        mainMenu.addItem(viewMenuItem)
        let viewMenu = NSMenu(title: "View")
        viewMenuItem.submenu = viewMenu
        let reloadItem = NSMenuItem(title: "Tải lại giao diện", action: #selector(reloadUI), keyEquivalent: "r")
        viewMenu.addItem(reloadItem)

        NSApp.mainMenu = mainMenu
    }

    func normalizeUrl(_ str: String) -> String {
        var s = str.trimmingCharacters(in: .whitespacesAndNewlines)
        if !s.lowercased().hasPrefix("http://") && !s.lowercased().hasPrefix("https://") {
            s = "http://\(s)"
        }
        if s.hasSuffix("/") {
            s = String(s.dropLast())
        }
        return s
    }

    func isRemoteServer(_ urlStr: String) -> Bool {
        guard let url = URL(string: urlStr), let host = url.host?.lowercased() else { return false }
        return host != "localhost" && host != "127.0.0.1" && host != "::1"
    }

    func resolveTargetServerUrl() -> String {
        // Priority 1: Environment variable
        if let env = ProcessInfo.processInfo.environment["TUNEFLOW_SERVER_URL"], !env.isEmpty {
            return normalizeUrl(env)
        }

        // Priority 2: client-config.json
        let configPath = (NSHomeDirectory() as NSString).appendingPathComponent("Library/Application Support/TuneFlow/client-config.json")
        if let data = try? Data(contentsOf: URL(fileURLWithPath: configPath)),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let profiles = json["profiles"] as? [String: Any] {
            let activeKey = (json["activeProfile"] as? String) ?? "default"
            if let activeProfile = profiles[activeKey] as? [String: Any],
               let profileUrl = activeProfile["url"] as? String, !profileUrl.isEmpty {
                return normalizeUrl(profileUrl)
            }
        }

        // Priority 3: UserDefaults
        if let saved = UserDefaults.standard.string(forKey: "serverUrl"), !saved.isEmpty {
            return normalizeUrl(saved)
        }

        // Priority 4: Default local server
        return "http://127.0.0.1:3000"
    }

    func saveServerConfig(urlStr: String) {
        let normalized = normalizeUrl(urlStr)
        UserDefaults.standard.set(normalized, forKey: "serverUrl")

        // Persist to client-config.json
        let supportDir = (NSHomeDirectory() as NSString).appendingPathComponent("Library/Application Support/TuneFlow")
        let configPath = (supportDir as NSString).appendingPathComponent("client-config.json")
        try? FileManager.default.createDirectory(atPath: supportDir, withIntermediateDirectories: true, attributes: nil)

        let isRemote = isRemoteServer(normalized)
        let configDict: [String: Any] = [
            "version": "1.0.0",
            "activeProfile": isRemote ? "remote" : "default",
            "profiles": [
                "default": [
                    "name": "Local Standalone",
                    "url": "http://127.0.0.1:3000",
                    "isLocalDaemon": true
                ],
                "remote": [
                    "name": "Dedicated Remote Server",
                    "url": normalized,
                    "isLocalDaemon": false
                ]
            ],
            "behavior": [
                "autoReconnect": true,
                "maxReconnectAttempts": 3,
                "fallbackToStandalone": false
            ]
        ]

        if let jsonData = try? JSONSerialization.data(withJSONObject: configDict, options: [.prettyPrinted]) {
            try? jsonData.write(to: URL(fileURLWithPath: configPath))
        }
    }

    func bootstrapAndLoad() {
        if isRemoteServer(currentServerUrl) {
            // Thin Client Mode: Check remote health directly without local node process
            checkServerHealth(targetUrl: currentServerUrl) { [weak self] isRunning in
                guard let self = self else { return }
                if isRunning {
                    self.loadTuneFlowUI(urlStr: self.currentServerUrl)
                } else {
                    self.showRemoteConnectionFailureAlert()
                }
            }
        } else {
            // Local Standalone Mode: Ensure local backend server is running
            checkServerHealth(targetUrl: currentServerUrl) { [weak self] isRunning in
                guard let self = self else { return }
                if isRunning {
                    self.loadTuneFlowUI(urlStr: self.currentServerUrl)
                } else {
                    self.startLocalServer()
                }
            }
        }
    }

    func checkServerHealth(targetUrl: String, completion: @escaping (Bool) -> Void) {
        guard let url = URL(string: "\(targetUrl)/api/health") else {
            completion(false)
            return
        }
        var req = URLRequest(url: url)
        req.timeoutInterval = 2.0
        let task = URLSession.shared.dataTask(with: req) { _, response, error in
            DispatchQueue.main.async {
                if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                    completion(true)
                } else {
                    completion(false)
                }
            }
        }
        task.resume()
    }

    func resolveNodePath() -> String? {
        let candidates = [
            "/opt/homebrew/bin/node",
            "/usr/local/bin/node",
            "/usr/bin/node"
        ]
        for path in candidates {
            if FileManager.default.fileExists(atPath: path) {
                return path
            }
        }
        let pipe = Pipe()
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/usr/bin/which")
        proc.arguments = ["node"]
        proc.standardOutput = pipe
        try? proc.run()
        proc.waitUntilExit()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        let result = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
        if let result = result, !result.isEmpty, FileManager.default.fileExists(atPath: result) {
            return result
        }
        return nil
    }

    func startLocalServer() {
        var appDir = FileManager.default.currentDirectoryPath
        if let resourcePath = Bundle.main.resourcePath {
            let bundleAppDir = "\(resourcePath)/app"
            if FileManager.default.fileExists(atPath: "\(bundleAppDir)/bin/tuneflow.js") {
                appDir = bundleAppDir
            }
        }

        let scriptPath = "\(appDir)/bin/tuneflow.js"
        if !FileManager.default.fileExists(atPath: scriptPath) {
            let alert = NSAlert()
            alert.messageText = "Chưa kết nối máy chủ TuneFlow"
            alert.informativeText = "Ứng dụng đang hoạt động ở chế độ Thin Client hoặc chưa cài đặt máy chủ nội bộ.\nVui lòng nhập địa chỉ máy chủ TuneFlow từ xa (IP mạng nội bộ hoặc Tên miền) để bắt đầu thưởng thức âm nhạc."
            alert.alertStyle = .informational
            alert.addButton(withTitle: "Cài đặt máy chủ (Preferences)")
            alert.addButton(withTitle: "Đóng")
            let resp = alert.runModal()
            if resp == .alertFirstButtonReturn {
                openPreferences()
            }
            return
        }

        guard let nodePath = resolveNodePath() else {
            showErrorAlert(
                title: "Yêu cầu cài đặt Node.js",
                message: "TuneFlow cần Node.js (>= 20.0.0) để chạy máy chủ nội bộ trong chế độ Standalone.\nVui lòng cài đặt từ https://nodejs.org hoặc thông qua 'brew install node', hoặc cấu hình kết nối tới máy chủ từ xa."
            )
            return
        }

        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: nodePath)
        proc.arguments = [scriptPath, "--no-browser", "--port", "3000"]
        proc.currentDirectoryURL = URL(fileURLWithPath: appDir)
        proc.standardInput = Pipe()

        var env = ProcessInfo.processInfo.environment
        let home = NSHomeDirectory()
        let extraPaths = "/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:\(home)/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
        env["PATH"] = "\(extraPaths):\(env["PATH"] ?? "")"
        proc.environment = env

        do {
            try proc.run()
            self.serverProcess = proc
            self.pollForServerReadiness()
        } catch {
            showErrorAlert(
                title: "Lỗi khởi chạy",
                message: "Không thể chạy máy chủ TuneFlow: \(error.localizedDescription)"
            )
        }
    }

    func pollForServerReadiness() {
        healthAttempts = 0
        healthCheckTimer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] timer in
            guard let self = self else { return }
            self.healthAttempts += 1
            self.checkServerHealth(targetUrl: self.currentServerUrl) { isRunning in
                if isRunning {
                    timer.invalidate()
                    self.healthCheckTimer = nil
                    self.loadTuneFlowUI(urlStr: self.currentServerUrl)
                } else if self.healthAttempts > 40 {
                    timer.invalidate()
                    self.healthCheckTimer = nil
                    self.showErrorAlert(
                        title: "Quá thời gian khởi động",
                        message: "Máy chủ TuneFlow cục bộ không phản hồi trong 10 giây. Vui lòng kiểm tra lại cấu hình."
                    )
                }
            }
        }
    }

    func loadTuneFlowUI(urlStr: String) {
        guard let url = URL(string: urlStr) else { return }
        let websiteDataTypes = Set([
            WKWebsiteDataTypeDiskCache,
            WKWebsiteDataTypeMemoryCache,
            WKWebsiteDataTypeServiceWorkerRegistrations,
            WKWebsiteDataTypeOfflineWebApplicationCache
        ])
        WKWebsiteDataStore.default().removeData(ofTypes: websiteDataTypes, modifiedSince: Date(timeIntervalSince1970: 0)) { [weak self] in
            DispatchQueue.main.async {
                guard let self = self else { return }
                var req = URLRequest(url: url)
                req.cachePolicy = .reloadIgnoringLocalCacheData
                self.webView.load(req)
            }
        }
    }

    func showRemoteConnectionFailureAlert() {
        let alert = NSAlert()
        alert.messageText = "Không thể kết nối máy chủ TuneFlow"
        alert.informativeText = "Không nhận được phản hồi từ máy chủ tại địa chỉ:\n\(currentServerUrl)\n\nVui lòng kiểm tra kết nối mạng, địa chỉ IP/Tên miền, hoặc chuyển về chế độ Standalone."
        alert.alertStyle = .warning
        alert.addButton(withTitle: "Thử lại")
        alert.addButton(withTitle: "Cài đặt máy chủ...")
        alert.addButton(withTitle: "Dùng Standalone Cục bộ")

        let resp = alert.runModal()
        if resp == .alertFirstButtonReturn {
            bootstrapAndLoad()
        } else if resp == .alertSecondButtonReturn {
            openPreferences()
        } else if resp == .alertThirdButtonReturn {
            currentServerUrl = "http://127.0.0.1:3000"
            saveServerConfig(urlStr: currentServerUrl)
            bootstrapAndLoad()
        }
    }

    @objc func showAbout() {
        let alert = NSAlert()
        alert.messageText = "TuneFlow v2.5.0"
        alert.informativeText = "Trình phát và tải nhạc YouTube chất lượng cao cho người cao tuổi và gia đình.\nChế độ hiện tại: \(isRemoteServer(currentServerUrl) ? "Remote Thin Client" : "Standalone Local Engine")\nMáy chủ mục tiêu: \(currentServerUrl)"
        alert.alertStyle = .informational
        alert.addButton(withTitle: "Đóng")
        alert.runModal()
    }

    @objc func reloadUI() {
        loadTuneFlowUI(urlStr: currentServerUrl)
    }

    @objc func openPreferences() {
        let alert = NSAlert()
        alert.messageText = "Cài đặt máy chủ TuneFlow"
        alert.informativeText = "Nhập URL máy chủ (IPv4, Tên miền mDNS hoặc HTTPS FQDN):\nVí dụ: http://192.168.1.100:3000 hoặc https://music.example.com"
        alert.alertStyle = .informational
        alert.addButton(withTitle: "Lưu & Kết nối")
        alert.addButton(withTitle: "Hủy")
        alert.addButton(withTitle: "Chuyển về Local Standalone")

        let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 340, height: 24))
        input.stringValue = currentServerUrl
        alert.accessoryView = input

        let response = alert.runModal()
        if response == .alertFirstButtonReturn {
            let text = input.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
            if !text.isEmpty {
                currentServerUrl = normalizeUrl(text)
                saveServerConfig(urlStr: currentServerUrl)
                bootstrapAndLoad()
            }
        } else if response == .alertThirdButtonReturn {
            currentServerUrl = "http://127.0.0.1:3000"
            saveServerConfig(urlStr: currentServerUrl)
            bootstrapAndLoad()
        }
    }

    func showErrorAlert(title: String, message: String) {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.alertStyle = .critical
        alert.addButton(withTitle: "Đóng")
        alert.runModal()
    }

    func windowWillClose(_ notification: Notification) {
        if let proc = serverProcess, proc.isRunning {
            proc.terminate()
        }
        NSApp.terminate(nil)
    }

    func applicationWillTerminate(_ notification: Notification) {
        if let proc = serverProcess, proc.isRunning {
            proc.terminate()
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
