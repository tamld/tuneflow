import Cocoa
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var serverProcess: Process?
    var healthCheckTimer: Timer?
    var healthAttempts = 0
    let targetPort = 3000

    func applicationDidFinishLaunching(_ notification: Notification) {
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

        webView = WKWebView(frame: rect, configuration: config)
        webView.autoresizingMask = [.width, .height]
        if #available(macOS 13.3, *) {
            webView.isInspectable = true
        }
        window.contentView = webView

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        // Ensure backend server is running, then load UI
        bootstrapAndLoad()
    }

    func bootstrapAndLoad() {
        checkServerHealth { [weak self] isRunning in
            guard let self = self else { return }
            if isRunning {
                self.loadTuneFlowUI()
            } else {
                self.startLocalServer()
            }
        }
    }

    func checkServerHealth(completion: @escaping (Bool) -> Void) {
        guard let url = URL(string: "http://localhost:\(targetPort)/api/health") else {
            completion(false)
            return
        }
        var req = URLRequest(url: url)
        req.timeoutInterval = 1.0
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
        // Fallback to checking which node
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
        guard let nodePath = resolveNodePath() else {
            showErrorAlert(
                title: "Yêu cầu cài đặt Node.js",
                message: "TuneFlow cần Node.js (>= 20.0.0) để khởi chạy máy chủ âm nhạc nội bộ.\nVui lòng cài đặt từ https://nodejs.org hoặc thông qua 'brew install node'."
            )
            return
        }

        // Determine app root
        var appDir = FileManager.default.currentDirectoryPath
        if let resourcePath = Bundle.main.resourcePath {
            let bundleAppDir = "\(resourcePath)/app"
            if FileManager.default.fileExists(atPath: "\(bundleAppDir)/bin/tuneflow.js") {
                appDir = bundleAppDir
            }
        }

        let scriptPath = "\(appDir)/bin/tuneflow.js"
        guard FileManager.default.fileExists(atPath: scriptPath) else {
            showErrorAlert(
                title: "Không tìm thấy tệp mã nguồn",
                message: "Không thể định vị \(scriptPath)."
            )
            return
        }

        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: nodePath)
        proc.arguments = [scriptPath, "--no-browser", "--port", "\(targetPort)"]
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
            self.checkServerHealth { isRunning in
                if isRunning {
                    timer.invalidate()
                    self.healthCheckTimer = nil
                    self.loadTuneFlowUI()
                } else if self.healthAttempts > 40 { // 10 seconds timeout
                    timer.invalidate()
                    self.healthCheckTimer = nil
                    self.showErrorAlert(
                        title: "Quá thời gian khởi động",
                        message: "Máy chủ TuneFlow không phản hồi trong 10 giây. Vui lòng kiểm tra lại cấu hình hệ thống."
                    )
                }
            }
        }
    }

    func loadTuneFlowUI() {
        let url = URL(string: "http://localhost:\(targetPort)")!
        webView.load(URLRequest(url: url))
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
