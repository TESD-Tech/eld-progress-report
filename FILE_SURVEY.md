# File Survey Report

> Auto-generated file analysis and descriptions

## Overview

This document provides a comprehensive overview of all analyzed files in the codebase, with AI-generated descriptions of purpose, functionality, and key features.

**Generated:** Thu Apr 23 16:00:18 EDT 2026
**Directory:** src
**Patterns:** *.svelte *.ts

**Files Found:** 26 | **Analyzed:** 17 | **Failed:** 0

---

### `src/Dashboard.svelte`

This is the main dashboard component for an ELD (English Language Development) Progress Report system that displays student data in a filterable table format. It exports as a custom web component "eld-dashboard" and provides core functionality including student data loading, filtering by search/grade/room, summary statistics, and batch report printing. The component serves as the primary interface that orchestrates child components (SummaryStats, FilterBar, StudentTable) and handles different portal views for administrators versus teachers. 

---

### `src/components/DebugBar.svelte`

DebugBar is a development-only floating debug panel that provides real-time monitoring of application events and environment information. It creates a global eldDebug logging system with error/warn/info methods and displays the last 12 events in an expandable flyout with copy functionality. The component serves as a diagnostic tool for developers, positioning itself as a fixed overlay in the bottom-right corner with visual indicators for error states. 

---

### `src/components/DebugToolbar.svelte`

This is a development debugging toolbar component that provides runtime navigation and context inspection for an ELD (English Language Development) application. It displays a collapsible overlay showing current URL parameters, application state, and offers role-based navigation controls with student selection capabilities. The component serves as a developer tool for testing different views (dashboard, report, print) and user roles (admin, teacher, guardian) during development. 

---

### `src/components/DevToolbar.svelte`

This is a development navigation toolbar for a PowerSchool plugin that provides quick switching between different portal views (admin, teachers, guardian) and pages (dashboard, report). The component includes a collapsible interface with portal/page selectors, student search functionality for report pages, and a navigation button that redirects to the appropriate PowerSchool URLs. It serves as a developer utility overlay positioned at the bottom-left of the screen to facilitate testing different user contexts and student-specific views during development. 

---

### `src/components/ProgressBar.svelte`

This is a reusable Svelte 5 component that renders a visual progress bar with percentage and fraction displays. It accepts three optional props (percent, meets, total) and displays a green-filled progress bar alongside the percentage value and a "meets/total" detail count. The component serves as a compact progress indicator for tracking completion rates or achievement metrics in the application UI. 

---

### `src/components/StudentTable.svelte`

StudentTable is a Svelte 5 component that displays student data in a tabular format with selection capabilities and progress tracking. It renders student information (name, grade, room, assessments) with checkboxes for bulk operations, progress bars showing achievement metrics, and navigation links to detailed reports. The component serves as the primary data visualization interface in what appears to be a student achievement tracking application, supporting both traditional href navigation and SPA routing through callback props. 

---

### `src/components/SummaryStats.svelte`

This is a Svelte 5 component that displays key statistics for English Language Development (ELD) student data in a responsive grid layout. It accepts four optional props (totalStudents, studentsWithData, studentsWithoutData, avgProgress) and renders them as styled metric cards showing totals, data availability, and average progress percentage. The component serves as a dashboard summary widget for tracking ELD program metrics and student assessment status. 

---

### `src/lib/components/EldLayout.svelte`

EldLayout.svelte is the main layout component for the ELD (English Language Development) system that handles client-side routing and role-based view management. It exports navigation functionality and conditionally renders Dashboard, Report, or PrintPage components based on URL parameters and user roles (admin, teacher, guardian). The component serves as the application shell, managing URL state synchronization and enforcing role-based access controls where guardians bypass the dashboard and go directly to reports. 

---

### `src/lib/data.ts`

This file serves as the core data layer for a student progress tracking application, defining TypeScript interfaces for student records and form responses. It exports data fetching functions that handle environment-specific JSON loading (dev vs production paths) and student filtering capabilities by name, grade, and homeroom. The file also provides dashboard analytics functionality that calculates progress percentages based on marking period completion checkmarks. 

---

### `src/lib/printUtils.ts`

This utility module handles printing functionality for student reports by opening a dedicated print page in a new window. It exports two main functions - printReport for single students and printMultipleReports for multiple students - that intelligently pass data either via URL parameters (for small datasets) or sessionStorage (for larger datasets exceeding 2000 characters). The module serves as a bridge between the main application and a separate print.html page, managing data transfer and URL generation for the printing workflow. 

---

### `src/lib/stores/userRoleStore.ts`

This store manages user role state for the ELD Progress Report application, supporting admin, teacher, and guardian roles with a default of admin. It exports a writable store and two helper functions: updateUserRole for programmatic role updates and getUserRoleFromUrl for extracting role from URL parameters as a fallback mechanism. The store serves as a central point for role-based access control and UI customization throughout the application. 

---

### `src/lib/utils.ts`

This utility file provides core data formatting and calculation functions for a student assessment tracking system. It exports functions for name/date formatting, progress calculation based on assessment symbols (✓, ●, /), and data organization helpers for grouping assessment fields by marking periods and containers. The file serves as the primary data processing layer, handling student records, assessment parsing, and progress metrics throughout the application. 

---

### `src/lib/utils/environment.ts`

The Environment class provides centralized utilities for detecting runtime environment state and application context within the ELD Progress Report system. It exports static methods for checking development vs production mode, retrieving URL components (host, base path, pathname), and determining user context (admin/teacher/guardian) based on URL paths. This utility serves as a foundation for environment-aware behavior throughout the application, following established patterns from the tesd-field-trips project. 

---

### `src/test/StudentTable.test.ts`

This is a comprehensive test suite for the StudentTable component that specifically addresses and prevents URL routing issues in a PowerSchool plugin. The tests verify that the component correctly renders student data, generates proper "View Report" links using centralized linkHelpers instead of hardcoded paths, and maintains consistent URL generation across different portals (admin, teachers, guardian). The file serves as both functional testing and regression protection, with dedicated tests ensuring the component never generates broken "/src/" paths that were previously causing link failures. 

---

### `src/test/html-compliance.test.ts`

This is a compliance test suite that validates HTML files in a PowerSchool plugin to prevent hardcoded path issues and ensure proper BASE_URL handling. The tests check for specific anti-patterns like hardcoded "/src/" paths in script imports, verify BASE_URL-aware dynamic imports, and validate dev/prod switching logic with proper cache-busting. It serves as a regression prevention mechanism to catch routing errors that occurred during plugin development, ensuring all HTML templates use relative or BASE_URL-aware paths instead of absolute hardcoded ones. 

---

### `src/test/routing.test.ts`

This is a comprehensive test suite that validates URL routing and environment detection for a PowerSchool ELD Progress Report plugin. It tests the Environment utility class and linkHelpers functions to ensure BASE_URL consistency across development and production environments, preventing hardcoded path issues that previously caused routing errors. The tests specifically focus on regression prevention by validating that URLs are properly prefixed with the base path and never contain problematic `/src/` patterns, while also testing portal context detection (admin/teacher/guardian) and parameter handling. 

---

### `src/test/setup.ts`

This is a test setup configuration file that initializes the testing environment for the application. It imports Jest DOM matchers for enhanced assertion capabilities and mocks the window.location object with localhost development server values. The file ensures consistent browser environment behavior during test execution, particularly for components that depend on location properties. 

---

## Summary

**Total Files:** 26
**Successfully Analyzed:** 17
**Failed:** 0
**Database:** file_survey.db
**Generated:** Thu Apr 23 16:00:18 EDT 2026

---

*This survey was auto-generated by file-survey-sqlite.sh. Re-run the script to update with new files or retry failed analyses.*
