export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

/**
 * 3.2. 데이터 딕셔너리 (TypeScript Interfaces)
 * SQL 스키마와 1:1 매핑되는 타입 정의
 */

// A. 주문 원장 (Transaction Data)
export interface RawOrderLine {
    id: number;
    site_order_no: string;      // 판매처 주문번호
    platform_name: string | null;
    seller_id: string | null;
    order_unique_code: string | null;

    product_name: string | null; // 원본 상품명
    option_text: string | null;  // 옵션명 (매핑 기준)
    qty: number | null;

    receiver_name: string | null;
    receiver_phone1: string | null;
    receiver_addr: string | null;
    status: string | null;

    // Additional fields for PlayAuto
    ordered_at: string | null;
    paid_at: string | null;
    collected_at: string | null;
    status_changed_at: string | null;
    tracking_no: string | null;
    ship_msg: string | null;

    // 시스템 처리 정보
    matched_kit_id: string | null;
    is_processed: boolean | null;
    upload_date: string | null; // ISO Timestamp
    process_status: string | null; // NULL (New) -> GIFT_APPLIED -> DONE
}

// B. 매핑 규칙 (Master Data)
export interface MappingRule {
    rule_id: number;
    raw_identifier: string; // Key
    kit_id: string | null;
    created_at: string | null;
}
// C. 프로모션 (Promotion Data)
export interface PromoRule {
    rule_id: number;
    promo_group_id: string;
    promo_name: string;
    promo_type: 'PRICE_ONLY' | 'Q_BASED' | 'ALL_GIFT';
    target_kit_id: string; // Legacy
    target_kit_ids?: string[]; // New: Multiple targets
    condition_qty: number;
    gift_qty: number;
    gift_kit_id: string;
    start_date: string;
    end_date: string;
    platform_name?: string | null;
    match_condition_json?: any;
    is_active?: boolean;
    created_at?: string;
    // Client-side computed stats
    stats?: {
        total_qty: number;
        daily_sales: Record<string, number>; // date "YYYY-MM-DD": qty
    };
}

// View: Missing Rules Summary
export interface ViewMissingRulesSummary {
    option_text: string | null;
    product_name: string | null;
    missing_count: number | null;
    first_seen: string | null;
}

// D. ERP Products (Master Data)
export interface ErpProduct {
    product_id: string; // PK
    name: string;
    spec: string | null;
    bal_qty: number | null; // Added
    created_at: string | null;
    updated_at: string | null;
}

// E. Kit BOM (Master Data)
export interface KitBomItem {
    id: number;
    kit_id: string;
    product_id: string;
    multiplier: number;
}

// Wrapper for Supabase generic types (simplified for now)
export interface Database {
    public: {
        Tables: {
            cm_raw_order_lines: { Row: RawOrderLine; Insert: any; Update: any; Relationships: [] };
            cm_raw_mapping_rules: { Row: MappingRule; Insert: any; Update: any; Relationships: [] };
            cm_promo_rules: { Row: PromoRule; Insert: any; Update: any; Relationships: [] };
            cm_erp_products: { Row: ErpProduct; Insert: any; Update: any; Relationships: [] };
            cm_kit_bom_items: { Row: KitBomItem; Insert: any; Update: any; Relationships: [] };
        };
        Views: {
            cm_view_missing_rules_summary: { Row: ViewMissingRulesSummary; Relationships: [] };
        };
        Functions: {};
        Enums: {};
        CompositeTypes: {};
    };
}

