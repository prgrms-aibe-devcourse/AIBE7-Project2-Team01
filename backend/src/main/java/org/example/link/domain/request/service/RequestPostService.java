package org.example.link.domain.request.service;

import java.util.UUID;

import lombok.RequiredArgsConstructor;
import org.example.link.ai.embedding.event.EmbeddingEventPublisher;
import org.example.link.auth.security.CustomUserDetails;
import org.example.link.common.exception.CustomException;
import org.example.link.common.exception.ErrorCode;
import org.example.link.domain.category.entity.CategoryEntity;
import org.example.link.domain.category.repository.CategoryRepository;
import org.example.link.domain.request.dto.RequestPostRequestDto;
import org.example.link.domain.request.entity.RequestPostEntity;
import org.example.link.domain.request.repository.RequestPostRepository;
import org.example.link.domain.request.util.RequestPostStatus;
import org.example.link.domain.user.entity.UserEntity;
import org.example.link.domain.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.AccessDeniedException;

@Service
@RequiredArgsConstructor
@Transactional
public class RequestPostService {
    private final RequestPostRepository requestPostRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final EmbeddingEventPublisher embeddingEventPublisher;

    @Transactional
    public RequestPostEntity create(RequestPostRequestDto requestPostRequestDto, CustomUserDetails userDetails) {
        UUID userId = getUserId(userDetails);
        UserEntity user = getUser(userId);
        CategoryEntity category = getCategory(requestPostRequestDto);
        RequestPostEntity requestPostEntity = createRequestPost(user, category, requestPostRequestDto);
        RequestPostEntity saved = requestPostRepository.save(requestPostEntity);
        embeddingEventPublisher.saveRequest(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<RequestPostEntity> readAll(UUID categoryId, Long minBudget, Long maxBudget,
                                           java.time.LocalDate dueDateFrom,
                                           java.time.LocalDate dueDateTo,
                                           Pageable pageable) {
        return requestPostRepository.findAllByFilters(
                categoryId, minBudget, maxBudget, dueDateFrom, dueDateTo, pageable);
    }

    public RequestPostEntity readOne(UUID requestPostId) {
        return getRequestPost(requestPostId);
    }

    @Transactional(readOnly = true)
    public Page<RequestPostEntity> search(
            String keyword,
            UUID categoryId,
            Long minBudget,
            Long maxBudget,
            java.time.LocalDate dueDateFrom,
            java.time.LocalDate dueDateTo,
            Pageable pageable
    ) {
        return requestPostRepository.search(keyword, categoryId, minBudget, maxBudget,
                dueDateFrom, dueDateTo, pageable);
    }

    @Transactional
    public RequestPostEntity update(
            UUID requestPostId,
            RequestPostRequestDto requestPostRequestDto,
            CustomUserDetails userDetails) throws AccessDeniedException {
        UUID userId = getUserId(userDetails);
        RequestPostEntity requestPostEntity = getRequestPostForUpdate(requestPostId);
        validateAuth(requestPostEntity, userId);
        CategoryEntity category = getCategory(requestPostRequestDto);
        updateRequestPost(requestPostRequestDto, requestPostEntity, category);
        embeddingEventPublisher.replaceRequest(requestPostEntity);
        return requestPostEntity;
    }

    @Transactional
    public void delete(UUID requestPostId, CustomUserDetails userDetails) throws AccessDeniedException {
        UUID userId = getUserId(userDetails);
        RequestPostEntity requestPostEntity = getRequestPostForUpdate(requestPostId);
        validateAuth(requestPostEntity, userId);
        validateOpenStatus(requestPostEntity);
        requestPostRepository.delete(requestPostEntity);
        embeddingEventPublisher.deleteRequest(requestPostId);
    }

    @Transactional
    public RequestPostEntity closeStatus(UUID requestPostId, CustomUserDetails userDetails) throws AccessDeniedException {
        UUID userId = getUserId(userDetails);
        RequestPostEntity requestPostEntity = getRequestPostForUpdate(requestPostId);
        validateAuth(requestPostEntity, userId);
        requestPostEntity.closeStatus();
        embeddingEventPublisher.deleteRequest(requestPostId);
        return requestPostEntity;
    }

    private UUID getUserId(CustomUserDetails userDetails) {
        return userDetails.getUserId();
    }

    private UserEntity getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private CategoryEntity getCategory(RequestPostRequestDto requestPostRequestDto) {
        return categoryRepository.findById(requestPostRequestDto.categoryId())
                .orElseThrow(() -> new CustomException(ErrorCode.CATEGORY_NOT_FOUND));
    }

    private RequestPostEntity createRequestPost(UserEntity user, CategoryEntity category, RequestPostRequestDto requestPostRequestDto) {
        return RequestPostEntity.builder()
                .user(user)
                .category(category)
                .title(requestPostRequestDto.title())
                .content(requestPostRequestDto.content())
                .budgetMin(requestPostRequestDto.budgetMin())
                .budgetMax(requestPostRequestDto.budgetMax())
                .dueDate(requestPostRequestDto.dueDate())
                .status(RequestPostStatus.OPEN)
                .build();
    }

    private RequestPostEntity getRequestPost(UUID requestPostId) {
        return requestPostRepository.findDetailById(requestPostId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
    }

    private RequestPostEntity getRequestPostForUpdate(UUID requestPostId) {
        return requestPostRepository.findByIdForUpdate(requestPostId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));
    }

    private void validateOpenStatus(RequestPostEntity requestPostEntity) {
        if (requestPostEntity.getStatus() != RequestPostStatus.OPEN) {
            throw new CustomException(ErrorCode.INVALID_REQUEST_POST_STATUS);
        }
    }

    private void validateAuth(RequestPostEntity requestPostEntity, UUID userId) throws AccessDeniedException {
        if (!requestPostEntity.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.POST_ACCESS_DENIED);
        }
    }

    private void updateRequestPost(RequestPostRequestDto requestPostRequestDto, RequestPostEntity requestPostEntity, CategoryEntity category) {
        requestPostEntity.update(
                requestPostRequestDto.title(),
                requestPostRequestDto.content(),
                category,
                requestPostRequestDto.budgetMin(),
                requestPostRequestDto.budgetMax(),
                requestPostRequestDto.dueDate()
        );
    }
}
