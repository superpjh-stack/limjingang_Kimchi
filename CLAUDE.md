# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This workspace belongs to **임진강김치(주) (Imjingang Kimchi Co., Ltd.)**, a Korean kimchi company. It is currently a business planning workspace, not yet a software project.

**Current contents:**
- `1. 2026년 정부일반형 사업계획서_임진강김치(주)_V1.0.pdf` — 2026 Korean government general-type business plan document
- `docs/` — bkit PDCA metadata (pipeline status, session memory)

**bkit pipeline status:** Phase 1 (Schema/Terminology), Dynamic level — no implementation has started yet.

## Development Context

When software development begins for this project, it will follow the **bkit Dynamic level** pipeline. Key things to establish in early phases:

- **Phase 1 (Schema):** Define domain terminology — kimchi product types, order flow, inventory, distribution channels, customer segments
- **Phase 2 (Convention):** Agree on coding standards before writing code
- **Phase 3 (Mockup):** UI prototype before backend work
- **Phase 4 (API):** Backend API design for any e-commerce, inventory, or B2B ordering system
- **Phase 5 (Design System):** Component library if building a customer-facing storefront

## Working with the Business Plan PDF

To reference content from the PDF, read it with:
```
Read tool → file: "1. 2026년 정부일반형 사업계획서_임진강김치(주)_V1.0.pdf"
```

Use page ranges (e.g., `pages: "1-5"`) since it may be multi-page. The document informs product scope, target market, and business goals that should drive any software requirements.
