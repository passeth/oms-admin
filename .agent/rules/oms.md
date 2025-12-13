---
trigger: always_on
glob: "**/*"
description: Core project rules for OMS Admin (Data structure, UI/UX standards)
---

# Project Rules & Guidelines

## 1. Project Overview

This project is a Commerce Order Management System (OMS) built using Supabase as the data backend.
**Key Functions:**

- Order Consolidation (주문 취합)
- Delivery Management (배송 관리)
- Inventory Management (재고 관리)
- Sales Data Analysis Dashboard (매출 분석 대시보드)

## 2. Data Design Philosophy

- **Structure First**: Before starting any task, prioritize understanding the data structure, table fields, relationships, and data connectivity.
- **Flexibility**: While table relationships should be flawless, the design must allow for "exceptions" (freedom of data) to handle real-world irregularities.
- **Data Integrity**: Ensure connections between tables are logical and robust.

## 3. Core Data Structure & Relationships

**The "Item Code" (품목코드) is the central hub of all data operations.**

### A. Operational Connectivity

The flow of data revolves around matching external identifiers to internal Item Codes:

1. **Order Consolidation**:
    - Incoming `Option Name` (from Order) → Matches to `Item Code` based on specific conditions.
2. **Delivery Management**:
    - `Kit Name` → Maps to `Item Code`.
3. **Sales Data Aggregation**:
    - `Site Product Code` (Sales Source) → `Item Set Name` (Hierarchy/Group) → `Item Code`.

### B. Sales Analysis Relationships (Example Scenario)

*Scenario: Product Code `1111` is "Rosemine Hand Cream 11 Types".*

- **Product Code (`1111`)**: Represents a specific sale listing.
- **Item Set**: "Rosemine Hand Cream" (The conceptual collection).
- **Item Codes**: The 11 specific individual items (SKUs) contained in the set.

**Analysis Dimensions:**

1. **By Item Code**: Revenue analysis for each of the 11 specific items.
2. **By Item Set (Collection)**: Analysis of "Rosemine Hand Cream" as a whole group (aggregating sales from various sites and product codes that sell this set).
3. **By Site**: Aggregation of all Product Codes sold on a specific site.

*Crucial Requirement: accurately manage the many-to-many and one-to-many relationships between Sites, Product Codes, Item Names (Sets), and Item Codes.*

## 4. UI/UX Development Standards

All frontend development must adhere to these usability rules:

1. **Table Functionality**:
    - **Sorting**: Every table must support sorting on all relevant columns.
    - **Search**: Every table must have search capabilities.
2. **Column Layout**:
    - **Resizable Columns**: Columns containing long text (e.g., Product Names, Option Names) must have adjustable (resizable) widths to ensure readability.
