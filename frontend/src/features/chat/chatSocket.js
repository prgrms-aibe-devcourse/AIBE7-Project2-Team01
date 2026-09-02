import { WS_BASE_URL } from "../../config/runtime.js";

/**
 * 채팅방 하나에 STOMP로 연결하고 구독까지 해줌.
 * SockJS/StompJS는 index.html에서 로컬 고정 버전으로 로드되어 있어야 함(window.SockJS, window.StompJs).
 *
 * @returns 연결에 사용한 StompJs.Client 인스턴스. 페이지를 떠날 때 client.deactivate() 호출해서 정리할 것.
 */
export function connectChatRoom(chatRoomId, { onMessage, onConnect, onError } = {}) {
  const client = new StompJs.Client({
    webSocketFactory: () => new SockJS(`${WS_BASE_URL}/ws`),
    // 유휴 커넥션이 프록시(Render 등)에 의해 조용히 끊기지 않도록 STOMP 하트비트를 켠다.
    // 서버(WebSocketConfig)도 setHeartbeatValue로 맞춰줘야 실제로 동작한다.
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    reconnectDelay: 3000,
    onConnect: () => {
      client.subscribe(`/topic/chat-rooms/${chatRoomId}`, (message) => {
        onMessage?.(JSON.parse(message.body));
      });
      onConnect?.();
    },
    onStompError: (frame) => onError?.(frame),
    onWebSocketError: (event) => onError?.(event),
  });
  client.activate();
  return client;
}

export function sendChatMessage(client, chatRoomId, content, messageType = "TEXT") {
  if (!client?.connected) {
    throw new Error("채팅 서버에 연결되어 있지 않습니다.");
  }
  client.publish({
    destination: "/app/chat.send",
    body: JSON.stringify({ chatRoomId, content, messageType }),
  });
}
