---
type: cases
title: Experience · applied AI in regulated healthcare
display: Case files from *regulated healthcare.*
nav: Experience
---

Five years at Medtronic and now Medtronic MiniMed, embedded with clinical, support, regulatory and platform teams in a regulated medical-device environment (HIPAA, IEC 62304). *Details are generalized for confidentiality; deeper walkthroughs in conversation.*

# Medtronic MiniMed
id: minimed
short: Senior AI
meta: Senior AI Engineer · Cloud R&D · Jul 2026 →
badge: Current

I lead the AI Excellence Center within the CareLink platform, setting technical direction and reusable standards for LLM and agent development across teams.

## Grounded support assistant
subtitle: RAG that can't invent device instructions
badge: Patient support
status: In production
problem: A diabetes-device app generates thousands of safety-sensitive support questions. A chatbot that invents device instructions is a patient-safety incident, not a UX bug.
shipped: A production RAG assistant on AWS Bedrock (Claude Sonnet 4.5, Haiku 4.5, Titan Embed v2, Cohere Rerank v3.5) over OpenSearch hybrid search, with reranking, parent-document expansion, verbatim citations and a novel-number hallucination filter. A **129-question golden-set eval** (ROUGE-L 0.556, 88.4% retrieval pass) gates every deployment, backed by 92% test coverage. Model routing (~30% to Haiku), context compression (−34% input tokens), prompt caching and a DynamoDB semantic cache (~800 ms saved per hit) cut cost and latency. Guardrails: Comprehend PII detection, prompt-injection blocking, out-of-scope refusal, rate limiting and an inline relevancy judge at zero added LLM calls.
proof: −173 ms P50 latency · ~19% lower cost per 1K tokens · 88.4% retrieval pass rate
tags: Bedrock, OpenSearch, Cohere Rerank, DynamoDB, Comprehend

## Release automation at scale
subtitle: from one team's tool to 60+ users
badge: Regulated QA
status: In use
problem: CareLink releases were slow and paperwork-heavy, and the automation suite needed to serve far more people than the team that built it.
shipped: Scaled the suite to **16 tools used by 60+ people** over 1,273 runs at 93.4% success. Redesigned the release process itself: the software impact assessment went from 23 to 10 pages, and removing the pre-production milestone-build dependency for formal test runs cut end-to-end time by 70%.
proof: 1,117 hours returned (Feb to Aug 2026) · 60+ users, 1,273 runs, 93.4% success · 70% faster releases
tags: React 18, FastAPI, Jira, Bedrock

## LLM on-call investigator
subtitle: alerts in, root cause out, no SQL written by the model
badge: Ops AI
status: Built
problem: Investigating cloud data-pipeline alerts means digging through logs and checking data freshness by hand. It is slow, repetitive and easy to get wrong at 3am.
shipped: An LLM investigator that turns alerts into cases and drives a provider-neutral tool-calling loop over **read-only, allow-listed tools**: CloudWatch logs, S3 freshness checks, Athena/Redshift counts. The model picks target keys and never writes SQL; log-fingerprint dedup cut cost per investigation by ~97%.
proof: ~97% lower cost per investigation · read-only, allow-listed tools · model never writes SQL
tags: CloudWatch, S3, Athena, Redshift, Python

## AI-enabled companion-app concept
subtitle: one app that adapts to the whole diabetes journey
badge: Product concept
status: Concept build
problem: Diabetes apps ship one static UI for every patient: overwhelming for newcomers, limiting for advanced users. The concept had to adapt to the whole journey without ever touching PHI.
shipped: A stage-adaptive Flutter + FastAPI app: terminology, settings and insights that follow the patient's journey stage, plus meal-detection ML and frictionless meal logging. A **synthetic-data generator** keeps development and demos realistic with zero PHI.
proof: 4 journey stages · ~26 API endpoints · zero-PHI synthetic data end-to-end
tags: Flutter, FastAPI, Apple HealthKit, Pandas, Material 3

## Autonomous-agent enablement
subtitle: letting an external coding agent in without opening the doors
badge: Agent enablement
status: Shipped design
problem: Bringing an autonomous coding agent in meant exposing an internal Bitbucket to an external agent cloud. No PrivateLink or IPSec option, and no appetite for weakening security.
shipped: A source-IP-preserving L4 proxy exposing Bitbucket over HTTPS, **locked to 10 static IPs**, with least-privilege PATs and WAF. Plus a one-command installer provisioning skills, rules and MCP servers for three teams.
proof: no PrivateLink or IPSec needed · locked to 10 static IPs · installer rolled out to 3 teams
tags: AWS NLB, WAF, Bitbucket, MCP

# Medtronic
id: medtronic-cloud
short: Cloud R&D
meta: AI / Data Science Engineer II · Diabetes Cloud R&D · Mar 2025 → Jun 2026

Forward-deployed applied AI across the CareLink platform: AI microservices, release engineering, PHI-safe LLM services, and the governance that lets AI ship in a medical-device org.

- Two FDA-committed deliverables for proactive sensor replacement
- Agentic-coding enablement across ~9 teams / 253 engineers
- LLM test-case extraction for V&V (est. −70% effort)
- A WAF-hardened public status page

## Release-engineering automation platform
subtitle: GenAI drafts, humans sign off
badge: Regulated QA
status: In use
problem: A CareLink release means generating regulated documents, linking Jira tickets, and reconciling Jira and the PLM system by hand. One missed inconsistency surfaces late, in an audit.
shipped: Led development of the CareLink automation suite, a full-stack release-engineering platform (React 18, FastAPI, WebSocket streaming) integrating Jira, R4J and Windchill PLM, with **GenAI drafting, AI verifiers and human sign-off**. Cut release documentation from 315 to ~30 hours per release and automated **15 of 21 QC steps** with AI checks for change-record completeness and inconsistencies between Jira and the PLM system.
proof: 315 → ~30 hours per release · 90% less end-to-end time · 15 of 21 QC steps automated
tags: React 18, FastAPI, WebSockets, Jira · R4J, Windchill PLM

## Regulatory-intelligence platform
subtitle: watching eight regulators so humans don't have to
badge: Regulatory intel
status: Deployed
problem: Quality teams monitored eight international regulators by hand for recalls and safety communications that carry legal weight. Slow, inconsistent, and easy to miss.
shipped: A serverless pipeline scraping all **8 sources in parallel**, with an LLM relevance classifier under a deterministic keyword override: the model never gets the last word. A React SPA behind enterprise SSO serves the on-demand report.
proof: 8 regulators → one on-demand report · manual sweep ~hours/week → on-demand (est.)
tags: Step Functions, Bedrock, React 19, DynamoDB, Azure AD

## Privacy-safe clinical LLM services
subtitle: AI where PHI usually stops it
badge: Clinical data
status: Deployed
problem: Clinicians drown in raw device telemetry and can't ask simple cohort questions in plain English. PHI makes most AI approaches a non-starter.
shipped: Turned an ambiguous, HIPAA-constrained clinical request into **two deployed Lambda AI services** with PHI redaction, customer-managed KMS encryption and a sanitized audit trail. Added a natural-language to structured-filter DSL so clinicians query cohorts in plain English.
proof: 2 deployed AI services · PHI redaction + customer-managed KMS on every request · sanitized audit trail
tags: Bedrock, Lambda, KMS, API Gateway

## Governed knowledge assistant
subtitle: retrieval behind enterprise sign-in
badge: Internal AI
status: Built
problem: Teams needed reliable answers from an internal knowledge base without bypassing access controls or leaking data.
shipped: A retrieval-grounded assistant over a **23-document knowledge base**, wired to enterprise Entra ID OAuth and a governed Bedrock gateway, with retry/backoff and keyword fallback.
proof: 23-document knowledge base · Entra ID OAuth · governed Bedrock gateway
tags: Bedrock, Entra ID, Python

## Device-issue root-cause timeline
subtitle: three log systems, one answer
badge: Support ops
status: Built
problem: Explaining one device issue meant cross-referencing three disjoint log systems. Even then, the sequence of events stayed invisible.
shipped: Reverse-engineered **three undocumented device data sources** into a root-cause tool: Glue ETL to Parquet behind a Lambda API, with Azure AD JWT auth and hashed patient IDs throughout.
proof: 3 undocumented data sources → one root-cause tool · Azure AD JWT auth · hashed patient IDs
tags: Glue ETL, Parquet, Lambda, Azure AD

## AI IDE validation and adoption
subtitle: getting AI coding tools approved for regulated work
badge: AI enablement
status: Shipped
problem: Regulated teams cannot just install AI coding tools; someone has to prove they are safe and then get people actually using them.
shipped: Authored a **17-protocol validation package** sanctioning an AI IDE for regulated use. Drove adoption through Windsurf office hours for 300+ enterprise users and 15 published agent skills for Windsurf and Cursor.
proof: 17 validation protocols · 300+ enterprise users in office hours · 15 published agent skills
tags: Windsurf, Cursor, MCP

# Medtronic
id: medtronic-ds
short: Data Science
meta: AI / Data Science Engineer II · Diabetes Data Science · Oct 2021 → Mar 2025

The classical-ML and data foundation the later AI systems stand on: predictive glucose modeling at scale, closed-loop simulation, and clinical-study data engineering.

- Closed-loop insulin simulation with announcement-free meal detection
- A patient data lake
- An XGBoost attrition model
- Training dashboards for ~800 learners
- AWS platform enablement (~$8K/month saved)

## Predictive glucose alerts
subtitle: seeing hypo and hyper events before they happen
badge: Clinical ML
status: Models shipped
problem: Hypo and hyperglycemia events are preventable if you see them coming. Naive prediction drowns patients in alarms until they switch the feature off.
shipped: Multi-class **XGBoost models on ~13.6M CGM samples** for predictive hypo and hyperglycemia alerting, with the alerts-per-day operating point tuned against alarm fatigue.
proof: ~13.6M CGM samples · multi-class XGBoost · alerts-per-day tuned against alarm fatigue
tags: Python, XGBoost, CGM time-series

## Glucose insights engine
subtitle: from raw telemetry to a daily "so what"
badge: Clinical ML
status: Built
problem: Patients generate abundant glucose and insulin data but get little daily, personalized insight from it.
shipped: A Redshift SQL to Parquet to inference pipeline producing a **72-feature vector**, including pharmacokinetic insulin modeling, that drives **four device-specific glucose insights**.
proof: 72-feature vector · pharmacokinetic insulin modeling · 4 device-specific insights
tags: Python, Redshift, Parquet
