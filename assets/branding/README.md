# TuneFlow Branding Assets & Icon Master Pack

> **Single Source of Truth (SSoT)** for TuneFlow desktop and mobile application icons.

## Specifications
- **Master Resolution**: 512x512 RGBA
- **Color Palette**: Dark Obsidian (`#0e1017`) and Golden Amber (`#f39c12`)
- **Supported Multi-Resolution ICO Sizes**: 16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256

## Asset Inventory
- `icon.ico`: Multi-resolution Windows application icon for Inno Setup installer (`setup.iss`) and executable resource tables.
- `icon-512.png`: High-resolution master icon for Linux FreeDesktop (`tuneflow.desktop`), macOS bundle assets, and web manifest.
- `icon-192.png`: Standard mobile launcher icon for Android PWA home screen.

## Generation Script
To regenerate all assets from master:
```bash
python scripts/generate_icons.py
```
