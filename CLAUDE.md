# CLAUDE.md

Inherits root rules from `/Users/daverobertson/Desktop/Code/AGENTS.md`.

## Project Overview

Catering is a premium service site for Act Two Catering. It is a marketing and lead generation surface with branded storytelling, service pages, and quote capture.

## Stack

- Static site shell
- JavaScript app bundle
- Web manifest and service worker
- Static hosting

## Key Decisions

- Preserve a premium hospitality visual language rather than generic SaaS patterns
- Keep the site deployable as a static package
- Favor trust and conversion clarity over novelty in primary flows

## Documentation Maintenance

- **Issues**: Track in the issue tracker table below
- **Session log**: Append to `/Users/daverobertson/Desktop/Code/95-docs-personal/today.csv` after each meaningful change

## Issue Tracker

| ID | Severity | Status | Title | Notes |
|----|----------|--------|-------|-------|
| 001 | P1 | blocked | Deploy quote persistence backend | UI and function now fail closed and are covered by contract tests; production activation requires Netlify authentication plus a Notion integration shared to the canonical Leads database |
| 002 | P2 | open | Navigation semantics need cleanup | Click only anchor patterns weaken accessibility and fallback behavior |

## Session Log

[2026-03-18] [Catering] [docs] Add AGENTS baseline
[2026-08-06] [Catering] [fix] Replace false quote success with validated Notion persistence contract and truthful failure UI; Netlify activation blocked on credentials
