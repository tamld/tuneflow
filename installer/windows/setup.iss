; Script generated for TuneFlow Native Windows Setup Wizard
; Requires Inno Setup 6.x (https://jrsoftware.org/isdl.php)

#define MyAppName "TuneFlow"
#define MyAppVersion "2.5.0"
#define MyAppPublisher "Tam Le Duc (anh Tam)"
#define MyAppURL "https://github.com/tamld/tuneflow"
#define MyAppExeName "TuneFlow.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
AppId={{E58F4B3C-9A82-4E19-88F4-A46D54B733D1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/issues
AppUpdatesURL={#MyAppURL}/releases
DefaultDirName={localappdata}\Programs\{#MyAppName}
DisableProgramGroupPage=yes
; Zero-Admin User-Level Installation: No UAC elevation required
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=dist\installer
OutputBaseFilename=TuneFlow-Setup-{#MyAppVersion}
SetupIconFile=public\icons\favicon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\public\icons\favicon.ico
VersionInfoVersion={#MyAppVersion}.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=TuneFlow - Elderly-Friendly YouTube Music Downloader
VersionInfoCopyright=Copyright (C) 2026 Tam Le Duc
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Parameters: "bin\tuneflow.js"; IconFilename: "{app}\public\icons\favicon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Parameters: "bin\tuneflow.js"; Tasks: desktopicon; IconFilename: "{app}\public\icons\favicon.ico"

[Run]
Filename: "{app}\{#MyAppExeName}"; Parameters: "bin\tuneflow.js"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent
