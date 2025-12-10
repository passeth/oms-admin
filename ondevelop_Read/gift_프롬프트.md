http://localhost:3000/promotions/apply 이 페이지의 기능을 개선할꺼야. 
지금은 제대로 구동이 안되고 있어.  상황에 대해 설명할께 

이 페이지는 process new orders (cm_raw_order_lines 테이블의 process_status 가  null인 오더) 에 사은품을 부여하는 페이지야. 
사은품 부여 규칙은 
1. 위의 규칙으로 필터링된  new orders의 paid_at 기간의 시작일과 종료일 기준으로  진행 되고 있는 cm_promo_rules의 start_date date not null,
  end_date date not null,에 속하는 프로모션을 리스팅한다. 
2. 이렇게 리스팅한 프로모션에 target_kit_ids text[] null에 입력된 상품코드들을 확인하여  new orders에서 해당하는 상품 코드의 오더를 필터링한다. 
3. 이렇게 필터링된 cm_raw_order_lines의 오더를  group by receiver_addr text null하여  qty integer null,의 sum을 구하여   cm_promo_rules의 condition_qty integer 에 해당하는 오더를 group by sum 된 최종 리스팅을 추출한다. 
(주소지를 기준으로 그룹한 합을 기준으로 사은품 지급 대상 오더를 추출하는 것) 

- 화면에서는 1번의 프로모션이 리스팅되고, 
- 담당자가 당일에 지급하기로 지정한 사은품을 입력하여 배정하면 
- 아래에 리스팅된 사은품 증정 대상 오더리스트와 배정된 사은품 리스트가 나와야해 . 
- 사은품은 수기로 수정 가능하도록 편집 가능한 입력칸으로 개발해줘. 임의 변경 필요한 경우가 있으니. 
- 사은품 입력 칸은 검색이 가능한 칸으로 해줘. (cm_raw_mapping_rules 테이블의 kit_id text null,가 검색되고 입력되면 됨) 




ui 개선 및 사용 편의성 개선하자. 
1. 프로모션 리스트는 테이블 형태로 정리하고, 테이블 내에서 사은품을 지정하도록 사은품 입력 필드를 넣어줘.  -> apply 하면 해당 오더 리스트에 적용됨. 
2. Review Targets & Assign Gifts 는 프로모션 all 상태로 리스팅되게 디폴트로 하고, 프로모션 리스트에서 클릭해서 선택하면, 선택된 프로모션으로 필터링되게 해줘. 
3. Review Targets & Assign Gifts를 필터링할 때, cm_raw_order_lines의 master_product_code와  cm_promo_rules의 target_kit_ids 필드로 매칭해야해. 이대로 매칭한건지도 확인해봐. 지금은 이 매칭 로직 설정이 잘못된 것 같아. 
3. Review Targets & Assign Gifts에서 보여줄 필드는 platform_name, matched_kit_id, Total Qty, Gift Qty, Assigned Gift 


cm_promo_rules에 프로모션을 등록할 때, 증정대상의 cm_raw_order_lines의 site_product_code를 지정해. 이 코드의 오더만 증정 대상인거야. 이걸 지정하면 cm_promo_rules의 target_kit_ids에 복수개의 상품 코드가 등록되는거야. 이 상품 코드의 오더를 찾아서 리스팅해야해. 