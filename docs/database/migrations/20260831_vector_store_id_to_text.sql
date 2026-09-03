-- Spring AI Document ID는 "TALENT:{UUID}" 형식을 사용하므로 TEXT 컬럼이 필요하다.
-- 과거 Spring AI 기본값으로 생성된 UUID 컬럼만 조건부로 TEXT로 변경한다.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'vector_store'
          AND column_name = 'id'
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.vector_store
            ALTER COLUMN id TYPE TEXT
            USING id::text;
    END IF;
END
$$;

-- 적용 결과 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vector_store'
  AND column_name IN ('id', 'metadata', 'embedding')
ORDER BY ordinal_position;
