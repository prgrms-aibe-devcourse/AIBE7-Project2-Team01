package org.example.link.domain.request.repository;

import jakarta.persistence.LockModeType;
import java.util.UUID;

import org.example.link.domain.request.entity.RequestPostEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RequestPostRepository extends JpaRepository<RequestPostEntity, UUID> {
    /** 목록 응답에 필요한 작성자와 카테고리를 한 번에 조회한다. */
    @Override
    @EntityGraph(attributePaths = {"user", "category"})
    Page<RequestPostEntity> findAll(Pageable pageable);

    @Query("""
            SELECT r FROM RequestPostEntity r
            WHERE r.status NOT IN (
                    org.example.link.domain.request.util.RequestPostStatus.CLOSED,
                    org.example.link.domain.request.util.RequestPostStatus.CANCELLED)
              AND (:categoryId IS NULL OR r.category.id = :categoryId)
              AND (:minBudget IS NULL OR r.budgetMax >= :minBudget)
              AND (:maxBudget IS NULL OR r.budgetMin <= :maxBudget)
              AND (CAST(:dueDateFrom AS date) IS NULL OR r.dueDate >= :dueDateFrom)
              AND (CAST(:dueDateTo AS date) IS NULL OR r.dueDate <= :dueDateTo)
            """)
    @EntityGraph(attributePaths = {"user", "category"})
    Page<RequestPostEntity> findAllByFilters(
            @Param("categoryId") UUID categoryId,
            @Param("minBudget") Long minBudget,
            @Param("maxBudget") Long maxBudget,
            @Param("dueDateFrom") java.time.LocalDate dueDateFrom,
            @Param("dueDateTo") java.time.LocalDate dueDateTo,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"user", "category"})
    @Query("""
        SELECT r
        FROM RequestPostEntity r
        WHERE r.id = :requestPostId
        """)
    Optional<RequestPostEntity> findDetailById(
            @Param("requestPostId") UUID requestPostId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RequestPostEntity r where r.id = :requestPostId")
    Optional<RequestPostEntity> findByIdForUpdate(@Param("requestPostId") UUID requestPostId);

    /** 벡터 검색 후보를 일괄 조회하고 응답에 필요한 작성자와 카테고리도 함께 로딩한다. */
    @EntityGraph(attributePaths = {"user", "category"})
    List<RequestPostEntity> findByIdIn(Collection<UUID> ids);

    @Query("""
    SELECT r
    FROM RequestPostEntity r
    WHERE r.status NOT IN (
            org.example.link.domain.request.util.RequestPostStatus.CLOSED,
            org.example.link.domain.request.util.RequestPostStatus.CANCELLED)
      AND (:keyword IS NULL OR
           LOWER(r.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR
           LOWER(r.content) LIKE LOWER(CONCAT('%', :keyword, '%')))
      AND (:categoryId IS NULL OR r.category.id = :categoryId)
      AND (:minBudget IS NULL OR r.budgetMax >= :minBudget)
      AND (:maxBudget IS NULL OR r.budgetMin <= :maxBudget)
      AND (CAST(:dueDateFrom AS date) IS NULL OR r.dueDate >= :dueDateFrom)
      AND (CAST(:dueDateTo AS date) IS NULL OR r.dueDate <= :dueDateTo)
    """)
    @EntityGraph(attributePaths = {"user", "category"})
    Page<RequestPostEntity> search(
            @Param("keyword") String keyword,
            @Param("categoryId") UUID categoryId,
            @Param("minBudget") Long minBudget,
            @Param("maxBudget") Long maxBudget,
            @Param("dueDateFrom") java.time.LocalDate dueDateFrom,
            @Param("dueDateTo") java.time.LocalDate dueDateTo,
            Pageable pageable
    );
}
