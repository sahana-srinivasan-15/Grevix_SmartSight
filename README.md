# SmartSight — Construction Safety Camera Reliability Monitor

## Overview
SmartSight is a prototype designed to improve the reliability of camera-based construction safety monitoring. It identifies stale, missing, offline, and duplicate camera feeds so that outdated visual data is not mistaken for current site conditions.

## Problem Statement
Construction safety systems depend on camera images to assess site conditions. If a camera stops working or sends outdated images, the system may make decisions using unreliable information.

## Proposed Solution
SmartSight validates camera feed freshness and displays clear status indicators. When a feed is unreliable, the system marks the current site risk as **UNKNOWN** and recommends manual inspection instead of assuming the site is safe.

## Key Features
- Camera feed freshness monitoring.
- Stale and offline feed alerts.
- Duplicate-frame validation.
- Historical hazard observations kept separate from current risk.
- Manual inspection request workflow.
- Camera recovery simulation.
- Dashboard status indicators and event logging.

## Technology Stack
- HTML5
- CSS3
- JavaScript

## How to Run
1. Clone or download this repository.
2. Open `index.html` in a modern web browser.
3. Use the dashboard controls to simulate fresh, stale, offline, duplicate, and recovered camera feeds.

## Safety Design
A stale, missing, invalid, or duplicate camera frame is not proof that a site is safe. SmartSight marks current risk as UNKNOWN when reliable current observations are unavailable.

## Project Limitations
This is a frontend demonstration prototype. Camera feeds, hazard detection, and inspection requests are simulated. It does not connect to real construction cameras or provide production-ready AI hazard detection.

## Hackathon
Built for the Grevix AfterCode hackathon challenge: The Unreliable Site Camera Feed.
