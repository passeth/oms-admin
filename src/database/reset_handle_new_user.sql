-- [Auth 오류 수정]
-- 'handle_new_user' 트리거 함수를 초기화하여 아무 동작도 하지 않게 만듭니다.
-- 기존 함수가 존재하지 않는 테이블(user_profiles, credit_transactions)을 참조하고 있어
-- "Database error saving new user" 오류가 발생하고 있습니다.
-- 이 함수를 실행하면 회원 초대 및 가입이 정상적으로 작동하게 됩니다.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 빈 본문: 아무 작업도 수행하지 않고 유저 생성을 허용합니다.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
