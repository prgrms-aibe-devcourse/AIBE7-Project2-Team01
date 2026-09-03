-- 기존 PostgreSQL DB에 거래·지갑 중복 방지 제약을 적용한다.
-- 제약을 추가하기 전에 중복 확인 쿼리를 실행하고, 조회된 데이터가 있다면 먼저 정리한다.

-- 같은 채팅방에 동일 사용자가 중복 참여한 데이터 확인.
SELECT chat_room_id, user_id, COUNT(*)
FROM chat_participants
GROUP BY chat_room_id, user_id
HAVING COUNT(*) > 1;

-- 같은 채팅방에 진행 중인 거래가 여러 건인 데이터 확인.
SELECT chat_room_id, COUNT(*)
FROM trades
WHERE chat_room_id IS NOT NULL
  AND status IN ('PENDING', 'PAID')
GROUP BY chat_room_id
HAVING COUNT(*) > 1;

-- 1회성 요청글에 결제 또는 완료 거래가 여러 건인 데이터 확인.
SELECT request_post_id, COUNT(*)
FROM trades
WHERE request_post_id IS NOT NULL
  AND status IN ('PAID', 'COMPLETED')
GROUP BY request_post_id
HAVING COUNT(*) > 1;

-- 동일 거래에 같은 유형의 지갑 거래내역이 여러 건인 데이터 확인.
SELECT trade_id, transaction_type, COUNT(*)
FROM wallet_transactions
WHERE trade_id IS NOT NULL
GROUP BY trade_id, transaction_type
HAVING COUNT(*) > 1;

-- 위 확인 쿼리에서 결과가 나오면 여기서 중단하고 중복 데이터를 먼저 정리한다.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uk_chat_participant_room_user
    ON chat_participants (chat_room_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_trade_active_chat_room
    ON trades (chat_room_id)
    WHERE chat_room_id IS NOT NULL AND status IN ('PENDING', 'PAID');

CREATE UNIQUE INDEX IF NOT EXISTS uk_trade_paid_request_post
    ON trades (request_post_id)
    WHERE request_post_id IS NOT NULL AND status IN ('PAID', 'COMPLETED');

CREATE UNIQUE INDEX IF NOT EXISTS uk_wallet_transaction_trade_type
    ON wallet_transactions (trade_id, transaction_type)
    WHERE trade_id IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_trade_single_post'
    ) THEN
        ALTER TABLE trades
            ADD CONSTRAINT ck_trade_single_post CHECK (
                (request_post_id IS NOT NULL AND talent_post_id IS NULL)
                OR (request_post_id IS NULL AND talent_post_id IS NOT NULL)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_trade_positive_amount'
    ) THEN
        ALTER TABLE trades
            ADD CONSTRAINT ck_trade_positive_amount CHECK (amount > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_trade_distinct_parties'
    ) THEN
        ALTER TABLE trades
            ADD CONSTRAINT ck_trade_distinct_parties CHECK (payer_id <> payee_id);
    END IF;
END
$$;

COMMIT;
