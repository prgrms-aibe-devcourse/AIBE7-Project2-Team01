package org.example.link.domain.chat.service;

import java.util.UUID;

import lombok.RequiredArgsConstructor;
import org.example.link.domain.chat.dto.ChatMessageResponse;
import org.example.link.domain.chat.entity.ChatMessage;
import org.example.link.domain.chat.entity.ChatRoom;
import org.example.link.domain.chat.repository.ChatMessageRepository;
import org.example.link.domain.trade.entity.TradeEntity;
import org.example.link.domain.user.entity.UserEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 다른 도메인(예: 거래)에서 채팅 메시지를 저장하고 실시간으로 브로드캐스트할 때 사용한다.
 * ChatService / TradeService 간 순환참조를 피하기 위해 별도 컴포넌트로 분리했다.
 * 호출자의 트랜잭션 안에서 실행되는 것을 전제로 한다.
 * 저장은 호출자 트랜잭션 안에서, 브로드캐스트는 커밋 이후에 수행한다
 * (커밋 전 발행 시 롤백되면 유령 메시지가 생기고, 구독자가 아직 없는 행을 참조할 수 있다).
 */
@Component
@RequiredArgsConstructor
public class ChatMessagePublisher {

    private static final String TOPIC_PREFIX = "/topic/chat-rooms/";

    private final ChatMessageRepository chatMessageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatMessageResponse publishTradeRequest(ChatRoom chatRoom, UserEntity sender, String content, TradeEntity trade) {
        return publish(new ChatMessage(chatRoom, sender, content, ChatMessage.MessageType.TRADE_REQUEST, trade));
    }

    public ChatMessageResponse publishTradeAmountRequest(ChatRoom chatRoom, UserEntity sender, String content) {
        return publish(new ChatMessage(chatRoom, sender, content, ChatMessage.MessageType.SYSTEM));
    }

    public ChatMessageResponse publishTradePaid(ChatRoom chatRoom, UserEntity sender, String content, TradeEntity trade) {
        return publish(new ChatMessage(chatRoom, sender, content, ChatMessage.MessageType.SYSTEM, trade));
    }

    public ChatMessageResponse publishTradeCompleted(ChatRoom chatRoom, UserEntity sender, String content, TradeEntity trade) {
        return publish(new ChatMessage(chatRoom, sender, content, ChatMessage.MessageType.SYSTEM, trade));
    }

    public ChatMessageResponse publishTradeCancelled(ChatRoom chatRoom, UserEntity sender, String content, TradeEntity trade) {
        return publish(new ChatMessage(chatRoom, sender, content, ChatMessage.MessageType.SYSTEM, trade));
    }

    public ChatMessageResponse publishImage(ChatRoom chatRoom, UserEntity sender, String imageUrl, String attachmentPath) {
        return publish(ChatMessage.image(chatRoom, sender, imageUrl, attachmentPath));
    }

    private ChatMessageResponse publish(ChatMessage message) {
        ChatMessage saved = chatMessageRepository.save(message);
        ChatMessageResponse response = ChatMessageResponse.from(saved);
        broadcastAfterCommit(saved.getChatRoom().getId(), response);
        return response;
    }

    private void broadcastAfterCommit(UUID chatRoomId, ChatMessageResponse response) {
        String destination = TOPIC_PREFIX + chatRoomId;

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            messagingTemplate.convertAndSend(destination, response);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend(destination, response);
            }
        });
    }
}
