#!/usr/bin/env python3
"""
scripts/generate_icons.py - Authoritative Icon Generator & Branding Packager

Authority: SPEC-0010 (Packaging & Desktop Integration)
Purpose: Programmatically generate multi-resolution Windows ICO, macOS assets,
and PWA icons from the master 512x512 branding image.
"""

import argparse
import os
import shutil
import struct
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

try:
    from PIL import Image
except ImportError:
    sys.stderr.write("❌ Error: Pillow is required. Install via 'pip install Pillow'.\n")
    sys.exit(1)

# Standard Windows and Desktop Icon Resolutions
ICO_SIZES = [
    (16, 16),
    (24, 24),
    (32, 32),
    (48, 48),
    (64, 64),
    (128, 128),
    (256, 256),
]


def verify_ico_file(ico_path: Path) -> bool:
    """Verify ICO header magic bytes and image directory structure."""
    if not ico_path.exists() or ico_path.stat().st_size == 0:
        return False
    with open(ico_path, "rb") as f:
        header = f.read(6)
        if len(header) < 6:
            return False
        reserved, image_type, count = struct.unpack("<HHH", header)
        return reserved == 0 and image_type == 1 and count >= len(ICO_SIZES)


def generate_branding_assets(source_path: Path, repo_root: Path, dry_run: bool = False) -> dict:
    """Generate all target icons and synchronization targets."""
    if not source_path.exists():
        raise FileNotFoundError(f"Source icon not found at: {source_path}")

    results = {
        "generated": [],
        "verified": []
    }

    print(f"🎨 Loading master icon from: {source_path}")
    img = Image.open(source_path).convert("RGBA")
    print(f"   Original size: {img.size[0]}x{img.size[1]}, Mode: {img.mode}")

    target_ico = repo_root / "public" / "icons" / "favicon.ico"
    target_root_ico = repo_root / "public" / "favicon.ico"
    branding_dir = repo_root / "assets" / "branding"
    branding_ico = branding_dir / "icon.ico"
    branding_512 = branding_dir / "icon-512.png"
    branding_192 = branding_dir / "icon-192.png"
    branding_readme = branding_dir / "README.md"

    if dry_run:
        print("🔍 [DRY-RUN] Would create the following files:")
        print(f"   - {target_ico} (7 embedded resolutions)")
        print(f"   - {target_root_ico}")
        print(f"   - {branding_ico}")
        print(f"   - {branding_512}")
        print(f"   - {branding_192}")
        print(f"   - {branding_readme}")
        return results

    # 1. Generate multi-resolution Windows / Web favicon.ico
    target_ico.parent.mkdir(parents=True, exist_ok=True)
    img.save(target_ico, format="ICO", sizes=ICO_SIZES)
    results["generated"].append(str(target_ico))
    print(f"✅ Generated {target_ico} ({target_ico.stat().st_size} bytes)")

    # 2. Mirror to public/favicon.ico for direct root requests
    shutil.copy2(target_ico, target_root_ico)
    results["generated"].append(str(target_root_ico))
    print(f"✅ Mirrored {target_root_ico}")

    # 3. Create assets/branding directory
    branding_dir.mkdir(parents=True, exist_ok=True)

    # 4. Copy branding assets
    shutil.copy2(target_ico, branding_ico)
    results["generated"].append(str(branding_ico))

    img.save(branding_512, format="PNG")
    results["generated"].append(str(branding_512))

    img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save(branding_192, format="PNG")
    results["generated"].append(str(branding_192))

    # 5. Author Branding README SSoT
    readme_content = """# TuneFlow Branding Assets & Icon Master Pack

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
"""
    with open(branding_readme, "w", encoding="utf-8") as f:
        f.write(readme_content)
    results["generated"].append(str(branding_readme))
    print(f"✅ Generated {branding_readme}")

    # Verification Gate
    if verify_ico_file(target_ico) and verify_ico_file(branding_ico):
        results["verified"].append(str(target_ico))
        results["verified"].append(str(branding_ico))
        print("🔒 Verification Gate: ICO binary headers and multi-size tables PASS")
    else:
        raise ValueError("Generated ICO file failed binary header validation!")

    return results


def main():
    parser = argparse.ArgumentParser(description="Generate multi-resolution icons for TuneFlow desktop and web.")
    parser.add_argument("--source", default=None, help="Path to master 512x512 PNG source")
    parser.add_argument("--dry-run", action="store_true", help="Simulate icon generation without writing files")
    parser.add_argument("--check", action="store_true", help="Verify that all required icon assets exist and are valid")

    args = parser.parse_args()
    repo_root = Path(__file__).resolve().parent.parent

    source_path = Path(args.source) if args.source else repo_root / "public" / "icons" / "icon-512.png"

    if args.check:
        target_ico = repo_root / "public" / "icons" / "favicon.ico"
        branding_ico = repo_root / "assets" / "branding" / "icon.ico"
        if verify_ico_file(target_ico) and verify_ico_file(branding_ico):
            print("✅ All branding and ICO assets are present and valid.")
            sys.exit(0)
        else:
            sys.stderr.write("❌ Required branding assets are missing or invalid. Run 'python scripts/generate_icons.py'.\n")
            sys.exit(1)

    try:
        generate_branding_assets(source_path, repo_root, dry_run=args.dry_run)
        print("🎉 Icon generation completed successfully.")
    except Exception as e:
        sys.stderr.write(f"❌ Icon generation failed: {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
