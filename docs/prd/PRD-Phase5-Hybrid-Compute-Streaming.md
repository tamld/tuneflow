# PRD — Phase 5: Hybrid Client-Server Compute & WebAssembly Audio Offloading

## 1. Product Goal
Maximize container host resource efficiency by clearly establishing compute boundaries between server and client: The server bypasses CORS constraints and decodes media ciphers, while the client receives direct audio chunk streams and handles post-processing (trimming, loudness normalization, metadata tagging) via WebAssembly (WASM).

## 2. Problem Statement
- Clarifies architectural compute flow: Media streams must be resolved and brokered server-side due to browser CORS policies, but heavy media manipulation should not unnecessarily strain host hardware.
- Shifting post-mux processing to client CPUs prevents server bottlenecking during concurrent downloads.

## 3. Key Features
- **Zero-Disk Streaming Mode**: The server streams live audio chunks directly from CDN sources to the client browser via `ReadableStream` without writing intermediate files to host SSD storage.
- **Client WebAudio Player & Visualizer**: Renders interactive audio waveforms, oversized volume sliders, and bass/treble EQ filters directly within the browser using the Web Audio API.
- **Client-Side Audio Trimming (WASM)**: Enables 30-second ringtone trimming executed 100% on the client machine via `ffmpeg.wasm`.
