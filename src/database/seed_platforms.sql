-- Create sales platforms table
CREATE TABLE IF NOT EXISTS cm_sales_platforms (
    platform_name TEXT PRIMARY KEY,
    account_code TEXT,
    description TEXT,
    type_code TEXT,
    pic_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upsert Platform Data
INSERT INTO cm_sales_platforms (platform_name, account_code, description, type_code, pic_code) VALUES
('카페24(신)', '1188120586', '', '', ''),
('스마트스토어', '2208162517', '스토어팜', '14', 'A20010'),
('G마켓', '2208183676', 'G마켓', '14', 'A20010'),
('티몬', '2118841856', '티몬 에바스', '14', ''),
('CJ온스타일', '1000041122', 'CJMALL', '14', 'A20010'),
('쿠팡(신)', '1000041127', '쿠팡(신)', '14', 'A23007'),
('skinrx', '2118899528', '스킨알엑스', '14', ''),
('스타일셰어', '1108195574', '스타일쉐어', '14', ''),
('29CM', '1018664617', '29cm', '14', 'A20010'),
('옥션', '6088700085', '옥션', '11', 'A5005'),
('GS이숍', '1000041121', 'GS이숍', '14', 'A20010'),
('SSG(통합)', '8708801143', 'SSG(통합)', '14', 'A20010'),
('11번가', '1048636968', '11번가', '14', 'A20010'),
('카카오 톡스토어', '1208147521', '다음', '14', 'A20010'),
('위메프2.0', '5668701096', '위메프 에바스', '14', ''),
('공영홈쇼핑', '1058815349', '공영홈쇼핑', '14', 'A20010'),
('하프클럽(신)', '1208106331', '하프클럽', '14', 'A20010'),
('카카오선물하기', '1208147521', '다음 선물', '14', 'A20010'),
('토스 쇼핑', '1208801280', '토스', '14', 'A20010'),
('홈앤쇼핑', '1058758545', '홈앤쇼핑', '14', 'A20010')
ON CONFLICT (platform_name) DO UPDATE SET
    account_code = EXCLUDED.account_code,
    description = EXCLUDED.description,
    type_code = EXCLUDED.type_code,
    pic_code = EXCLUDED.pic_code;
