# USB Exporter Specification

**Status**: `ACCEPTED`

## Overview
The USB Exporter domain governs formatting and exporting audio tracks to FAT32 external drives and SD cards.

## Requirements

### Requirement: FAT32 Compatibility and Indexing
The exporter MUST organize exported audio tracks with 3-digit numerical prefixes on FAT32 storage devices.

#### Scenario: Export Tracks with Three-Digit Indexing
<!-- tests: usb-exporter.test.js -->
Given a set of downloaded audio files and a target USB device,
When the export process is initiated,
Then filenames are formatted with 3-digit indices (e.g. 001 - Track.mp3).

### Requirement: Filesystem Path Sanitization
The exporter SHALL sanitize track names and folder paths to comply with FAT32 restricted character rules.

#### Scenario: Sanitize Special Characters for FAT32
<!-- tests: engine.test.js -->
When a track title contains illegal filesystem characters,
Then the exporter replaces invalid characters with safe alternatives.
