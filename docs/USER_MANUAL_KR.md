# Supabase OMS 시스템 사용 설명서 (User Manual)

## 1. 개요

이 시스템은 "플레이오토" 주문 데이터를 Supabase DB에 업로드하여, 자동으로 **표준 세트(Kit)**로 변환하고 **구성품(BOM)**을 계산하기 위해 구축되었습니다.

---

## 2. 테이블(Table) 구조 및 역할

### A. 마스터 데이터 (기준 정보)

이 테이블들은 처음에 한 번 세팅하고, 신제품이 나올 때만 수정합니다.

| 테이블명 | 역할 | 주요 컬럼 | 비고 |
| :--- | :--- | :--- | :--- |
| **`CM_ERP_PRODUCTS`** | **ERP 품목 마스터**<br>우리 회사의 모든 개별 상품 정보 | `product_id` (코드)<br>`name` (품명) | ERP와 동일하게 유지 |
| **`CM_KIT_BOM_ITEMS`** | **세트 구성표 (BOM)**<br>세트 1개를 만들 때 필요한 구성품 목록 | `kit_id` (세트명)<br>`product_id` (구성품)<br>`multiplier` (수량) | 하나의 세트에 여러 줄 입력 |
| **`CM_RAW_MAPPING_RULES`** | **주문 매핑 규칙**<br>쇼핑몰 옵션명을 우리 회사 표준 세트명으로 연결 | `raw_identifier` (옵션명)<br>`kit_id` (표준 세트명) | 매칭 실패 시 여기에 추가 |

### B. 트랜잭션 데이터 (매일 쌓이는 정보)

매일 새로운 데이터가 추가되는 테이블입니다.

| 테이블명 | 역할 | 주요 컬럼 | 비고 |
| :--- | :--- | :--- | :--- |
| **`CM_RAW_ORDER_LINES`** | **주문 원장**<br>플레이오토에서 다운받은 엑셀 원본 | `site_order_no` (주문번호)<br>`option_text` (옵션)<br>`matched_kit_id` (판별결과) | **26개 컬럼**<br>업로드 시 자동 매칭 실행됨 |

---

## 3. 핵심 뷰(View) 및 사용법 (업무 루틴)

### [1단계] 주문 업로드

- `CM_RAW_ORDER_LINES` 테이블에 **오늘의 주문 CSV**를 업로드합니다.
- 업로드 즉시 DB가 자동으로 매칭 작업을 수행합니다.

### [2단계] 에러 확인 (숙제 검사)

아래 뷰를 조회하여 문제가 있는지 확인합니다.

**1. 매칭 실패 확인 (`CM_VIEW_MISSING_RULES_SUMMARY`)**
> "이 주문 옵션은 무슨 세트인지 모르겠어요."

- **조회:** `SELECT * FROM CM_VIEW_MISSING_RULES_SUMMARY;`
- **해결:** 나온 `option_text`를 복사해서 `CM_RAW_MAPPING_RULES` 테이블에 등록해줍니다.

**2. BOM 누락 확인 (`CM_VIEW_MISSING_BOM_SUMMARY`)**
> "세트 이름은 알겠는데, 구성품이 등록 안 되어 있어요."

- **조회:** `SELECT * FROM CM_VIEW_MISSING_BOM_SUMMARY;`
- **해결:** 나온 `matched_kit_id`에 해당하는 구성품을 `CM_KIT_BOM_ITEMS` 테이블에 등록해줍니다.

### [3단계] 최종 결과 다운로드

모든 에러를 수정했다면, 최종 결과를 뽑습니다.

**최신 배포 결과 (`CM_VIEW_LATEST_BATCH_RESULT`)**
> "방금 업로드한 파일의 결과만 보여줘."

- **조회:** `SELECT * FROM CM_VIEW_LATEST_BATCH_RESULT;`
- **활용:** 이 결과를 엑셀로 다운로드하여 송장 작업 등에 사용합니다. L열(`option_text_standardized`)에 표준 세트명이 채워져 있습니다.

---

## 4. 파일 업로드 규칙 (상세)

데이터를 초기화하거나 수정할 때는 반드시 아래 **순서**대로 파일을 업로드해야 에러가 나지 않습니다.

1. **`clean_import_erp_products.csv`** (상품 마스터)
2. **`clean_import_kit_bom_items_FINAL_V3.csv`** (BOM 구성표)
3. **`clean_import_mapping_rules_FINAL_V3.csv`** (매핑 규칙)
4. **`clean_import_orders_FULL_STRUCTURE.csv`** (매일매일 주문 업로드)

---

## 5. 자주 묻는 질문 (FAQ)

**Q. 매칭 규칙을 추가했는데, 옛날 주문도 반영되나요?**
A. 네! 규칙을 추가한 뒤 `SELECT fn_match_order_kits();` 명령어를 한 번 실행해주면, 아직 처리 안 된 과거 주문들도 싹 다시 매칭합니다.

**Q. 같은 파일을 두 번 올리면 어떻게 되나요?**
A. 중복된 데이터가 쌓이게 됩니다. (현재 중복 체크 로직 없음) 실수로 두 번 올렸다면, `CM_RAW_ORDER_LINES`에서 `upload_date`를 보고 잘못 올라간 건들을 삭제해야 합니다.

**Q. L열이 엑셀에서 깨져 보이면?**
A. 인코딩 문제입니다. CSV를 만들 때 `UTF-8` 형식을 권장합니다.
