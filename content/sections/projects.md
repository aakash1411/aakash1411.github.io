---
type: projects
title: Open source & independent builds
display: Open source and *independent builds.*
nav: Projects
---

## ClinicSentry
subtitle: framework-agnostic compliance middleware for clinical AI agents
badge: OSS · Apache-2.0
cover: Cs
year: 2026 · v0.4.0
proof: ~0.7 ms p95 PHI scan on 3 KB notes · zero extra LLM calls on the hot path · 4 frameworks checked by clinicsentry report
links: [Code ↗](https://github.com/aakash1411/clinicsentry), [PyPI ↗](https://pypi.org/project/clinicsentry/)
chips: pip install clinicsentry
tags: Python, Pydantic, Presidio, OpenTelemetry, Docker

Framework-agnostic compliance middleware that wraps any agent framework (LangGraph, CrewAI, Google ADK, OpenAI Agents SDK, Claude SDK, MCP, A2A) without changing agent code. Four controls: a **PHI firewall** with adversarial normalization, a **fail-closed clinical escalation router**, a **tamper-evident HMAC-signed audit trail**, and a **MedDevice mode** for IEC 62304 class enforcement, dose-range checks and emergency stop. Controls are *aligned with* HIPAA, FDA TPLC, IEC 62304 and the EU AI Act. When an external team evaluated it for a healthcare RAG chatbot, I shipped fixes for every finding.

## Icarus
subtitle: a JARVIS-style assistant that runs entirely on my Mac
badge: Private build
cover: Ic
year: 2026
proof: ~0.3 s transcription · ~2 s speech synthesis warm · $0/month runtime
chips: Demo on request
tags: FastAPI, pgvector, Ollama, mlx-whisper, Next.js

A local-first, multi-agent personal assistant with a full voice loop: speech-to-text on the Apple Silicon GPU, an **orchestrator routing across specialist agents** on Ollama, and TTS answering in a JARVIS voice. **Five risk tiers gate every action**: risky operations pause for approval, destructive ones are hard-blocked.

## Agent Skills
subtitle: packaged judgment for AI coding agents
badge: Open source
cover: 15
year: 2026
proof: 15 skills across the SDLC · single-command install · for Windsurf and Cursor
links: [Code ↗](https://github.com/aakash1411/agent-skills)
tags: Markdown, Shell, GitHub Actions

A library of 15 reusable skills for Windsurf and Cursor: TDD enforcement, root-cause analysis, CI/CD generation, resilience patterns, secrets management. Each encodes a senior engineer's checklist as instructions an agent actually follows, installable with one command.

# Publications
meta: Peer-reviewed

**Only published, citable work is listed.** Before LLMs I worked on medical-device software, where I learned to treat software failure as a safety problem, not a bug ticket.

## Medical device shelf-life and recalls: navigating healthcare challenges
year: 2025
venue: Expert Review of Medical Devices
url: https://doi.org/10.1080/17434440.2025.2576140

## Software as Medical Devices: requirements and regulatory landscape in the United States
year: 2025
venue: Expert Review of Medical Devices
url: https://doi.org/10.1080/17434440.2025.2561918

## Using Continuous Glucose Monitoring Values for Bolus Size Calculation in Smart Multiple Daily Injection Systems: No Negative Impact on Post-bolus Glycemic Outcomes Found in Real-World Data
year: 2023
venue: Journal of Diabetes Science and Technology
url: https://doi.org/10.1177/19322968231202803
