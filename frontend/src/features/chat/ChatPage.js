import { getCurrentUserId } from "../../auth/currentUser.js";
import {
  fetchMyChatRooms,
  fetchChatMessages,
  leaveChatRoom,
  requestTradeAmount,
  uploadChatImage,
} from "./chatApi.js";
import { connectChatRoom, sendChatMessage } from "./chatSocket.js";
import { fetchRequest } from "../request/requestApi.js";
import { fetchTalent } from "../talent/talentApi.js";
import { cancelTrade, createTrade, fetchMyTrades, payTrade } from "../trade/tradeApi.js";
import { fetchWallet } from "../wallet/walletApi.js";
import {
  appendSafeHtml,
  escapeHtml,
  safeImageUrl,
  setSafeHtml,
} from "../../shared/security/xss.js";

let activeClient = null;
const noticeTimers = new WeakMap();

// 채팅 목록 페이지(#/chat) 겸 채팅방 페이지(#/chat/{id}).
// 실제 데이터는 initChatPage()가 렌더링 후 비동기로 채워 넣음 (app.js의 bindPageEvents에서 호출).
export function ChatPage(activeRoomId) {
  const roomId = activeRoomId || "";
  return `
    <section class="chat-layout" data-chat-page data-room-id="${roomId}">
      <aside class="conversation-list" data-conversation-list>
        <h1>Messages</h1>
        <input type="search" placeholder="Search conversations..." aria-label="Search conversations" />
        <div data-room-list>
          <p>채팅방을 불러오는 중...</p>
        </div>
     </aside>
      <article class="chat-panel" data-chat-panel>
        <p>왼쪽에서 대화를 선택하세요.</p>
      </article>
    </section>
  `;
}

// 페이지가 렌더링된 뒤 호출: 채팅방 목록/이력 로드, WebSocket 연결, 메시지 전송 바인딩.
export function initChatPage() {
  const root = document.querySelector("[data-chat-page]");
  if (!root) return;

  const roomIdAttr = root.dataset.roomId;
  const roomId = roomIdAttr || null;
  const listEl = root.querySelector("[data-room-list]");
  const panelEl = root.querySelector("[data-chat-panel]");

  loadRoomList(listEl, roomId, panelEl);
}

// 다른 페이지로 이동할 때 반드시 호출해서 WebSocket 연결을 정리해야 함 (app.js render()에서 매번 호출).
export function teardownChatPage() {
  if (activeClient) {
    activeClient.deactivate();
    activeClient = null;
  }
}

async function loadRoomList(listEl, roomId, panelEl) {
  let rooms = [];
  try {
    rooms = await fetchMyChatRooms();
  } catch (error) {
    setSafeHtml(listEl, `<p>채팅방 목록을 불러오지 못했습니다: ${escapeHtml(error.message)}</p>`);
    return;
  }

  setSafeHtml(listEl, renderRoomList(rooms, roomId));

  if (!roomId) return;

  const room = rooms.find((item) => item.chatRoomId === roomId);
  if (!room) {
    setSafeHtml(panelEl, `<p>채팅방을 찾을 수 없거나 접근 권한이 없습니다.</p>`);
    return;
  }

  openRoom(panelEl, room);
}

function renderRoomList(rooms, activeRoomId) {
  if (!rooms.length) {
    return `<p>아직 채팅방이 없습니다. 게시글에서 "채팅 신청"을 눌러보세요.</p>`;
  }

  return rooms
    .map((room) => {
      const isActive = room.chatRoomId === activeRoomId;
      return `
        <a class="conversation ${isActive ? "active" : ""}" href="#/chat/${room.chatRoomId}">
          ${renderChatAvatar(room)}
          <div>
            <strong>${escapeHtml(room.otherUserNickname ?? "상대방")}</strong>
            <span>${postLabel(room)}</span>
          </div>
        </a>
      `;
    })
    .join("");
}

async function openRoom(panelEl, room) {
  teardownChatPage();

  const [currentUserId, requestPost, talentPost, activeTrade, history] = await Promise.all([
    getCurrentUserId({ optional: true }),
    loadRequestPost(room),
    loadTalentPost(room),
    loadActiveTrade(room.chatRoomId),
    fetchChatMessages(room.chatRoomId).catch(() => null),
  ]);
  const tradeFlow = resolveTradeFlow(history, activeTrade);
  const hasOpenAmountRequest = tradeFlow.hasOpenAmountRequest;
  const post = requestPost || talentPost;
  const isPostOwner = currentUserId != null && post != null &&
    String(post.userId) === String(currentUserId);
  const postAvailableForTrade = isPostAvailableForTrade(post, room);
  const canRequestTrade = Boolean(
    post &&
    !activeTrade &&
    !hasOpenAmountRequest &&
    isPostOwner &&
    postAvailableForTrade
  );
  const canSetRequestAmount = Boolean(
    requestPost &&
    hasOpenAmountRequest &&
    !isPostOwner &&
    postAvailableForTrade
  );
  const roomContext = {
    ...room,
    hasActiveTrade: tradeFlow.hasActiveTrade,
    openAmountRequestMessageId: tradeFlow.openAmountRequestMessageId,
  };
  const tradeButtonLabel = room.talentPostId ? "판매 금액 설정" : "금액 설정 요청";

  setSafeHtml(panelEl, panelTemplate(room, { canRequestTrade, canSetRequestAmount }));
  const streamEl = panelEl.querySelector("[data-message-stream]");
  const formEl = panelEl.querySelector("[data-compose-form]");

  // 거래가 취소되면 글 주인이 다시 거래를 요청할 수 있도록 헤더 버튼을 복구한다.
  function restoreTradeRequestButton() {
    if (!isPostOwner || roomContext.hasActiveTrade) return;
    const actionsEl = panelEl.querySelector(".chat-panel-actions");
    if (!actionsEl) return;
    if (actionsEl.querySelector("[data-trade-request-open], [data-request-amount-open]")) return;

    appendSafeHtml(
      actionsEl,
      "afterbegin",
      `<button type="button" class="button primary" data-trade-request-open>${escapeHtml(tradeButtonLabel)}</button>`
    );
  }

  loadHistory(streamEl, roomContext, currentUserId, history);

  // 소켓이 끊겼다 재연결되면 그 사이 놓친 브로드캐스트(특히 거래 요청 카드)를
  // 서버 상태 기준으로 다시 맞춘다. 심플 브로커는 미접속 클라 메시지를 큐잉하지 않는다.
  let socketConnectedOnce = false;
  async function catchUpAfterReconnect() {
    try {
      const [freshTrade, freshHistory] = await Promise.all([
        loadActiveTrade(room.chatRoomId),
        fetchChatMessages(room.chatRoomId),
      ]);
      const flow = resolveTradeFlow(freshHistory, freshTrade);
      roomContext.hasActiveTrade = flow.hasActiveTrade;
      roomContext.openAmountRequestMessageId = flow.openAmountRequestMessageId;
      loadHistory(streamEl, roomContext, currentUserId, freshHistory);
    } catch {
      // 재연결 직후 일시적 실패는 다음 하트비트/재연결에서 회복
    }
  }

  activeClient = connectChatRoom(room.chatRoomId, {
    onConnect: () => {
      if (socketConnectedOnce) {
        catchUpAfterReconnect();
      }
      socketConnectedOnce = true;
    },
    onMessage: (message) => {
      if (isTradeAmountRequest(message)) {
        roomContext.hasActiveTrade = false;
        roomContext.openAmountRequestMessageId = getMessageId(message);
        panelEl.querySelector("[data-trade-request-open]")?.remove();
        if (String(message.senderId) !== String(currentUserId)) {
          showRequestAmountAction(panelEl);
        }
      }
      if (message.messageType === "TRADE_REQUEST") {
        roomContext.hasActiveTrade = true;
        roomContext.openAmountRequestMessageId = null;
        panelEl.querySelector("[data-trade-request-open]")?.remove();
        panelEl.querySelector("[data-request-amount-open]")?.remove();
        markAmountRequestButtonsAsFixed(panelEl);
      }
      if (isTradePaid(message)) {
        updateTradeCardStatus(panelEl, message.trade, "결제 완료");
      }
      if (isTradeCompleted(message)) {
        roomContext.hasActiveTrade = false;
        updateTradeCardStatus(panelEl, message.trade, "거래 완료");
      }
      if (isTradeCancelled(message)) {
        roomContext.hasActiveTrade = false;
        roomContext.openAmountRequestMessageId = null;
        updateTradeCardStatus(panelEl, message.trade, "취소된 거래");
        restoreTradeRequestButton();
      }
      appendSafeHtml(streamEl, "beforeend", renderBubble(message, currentUserId, roomContext));
      streamEl.scrollTop = streamEl.scrollHeight;
    },
    onError: () => {
      appendSafeHtml(streamEl, "beforeend", `<p>채팅 연결에 문제가 발생했습니다.</p>`);
    },
  });

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = formEl.elements.content;
    const value = input.value.trim();
    if (!value) return;

    try {
      sendChatMessage(activeClient, room.chatRoomId, value);
      input.value = "";
    } catch (error) {
      showChatNotice(panelEl, error.message, "error");
    }
  });

  const imageInputEl = formEl.querySelector("[data-image-input]");
  imageInputEl?.addEventListener("change", async () => {
    const file = imageInputEl.files?.[0];
    if (!file) return;

    formEl.classList.add("uploading");
    try {
      // 업로드만 하면 서버가 STOMP 로 메시지를 브로드캐스트 → onMessage 에서 화면에 그려짐.
      await uploadChatImage(room.chatRoomId, file);
    } catch (error) {
      showChatNotice(panelEl, `이미지 전송 실패: ${error.message}`, "error");
    } finally {
      formEl.classList.remove("uploading");
      imageInputEl.value = "";
    }
  });

  const leaveButtonEl = panelEl.querySelector("[data-leave-room]");
  leaveButtonEl?.addEventListener("click", () => handleLeaveRoom(room.chatRoomId, panelEl));

  panelEl.addEventListener("click", (event) => {
    const tradeRequestButtonEl = event.target.closest("[data-trade-request-open]");
    if (tradeRequestButtonEl) {
      if (room.talentPostId) {
        openTalentTradeRequestModal(panelEl, { room, talentPost });
        return;
      }
      sendRequestTradeAmountCard(panelEl, room);
      return;
    }

    const buttonEl = event.target.closest("[data-trade-pay-open]");
    if (buttonEl) {
      const trade = {
        tradeId: buttonEl.dataset.tradePayOpen,
        amount: buttonEl.dataset.tradeAmount,
        status: buttonEl.dataset.tradeStatus,
        payerId: buttonEl.dataset.tradePayerId,
      };
      openTradePayModal(panelEl, trade);
      return;
    }

    const cancelButtonEl = event.target.closest("[data-trade-cancel]");
    if (cancelButtonEl) {
      cancelTradeRequest(panelEl, cancelButtonEl, () => {
        roomContext.hasActiveTrade = false;
        roomContext.openAmountRequestMessageId = null;
        restoreTradeRequestButton();
      });
      return;
    }

    const amountButtonEl = event.target.closest("[data-trade-amount-open], [data-request-amount-open]");
    if (amountButtonEl) {
      openRequestTradeAmountModal(panelEl, { room, requestPost });
    }
  });
}

async function loadRequestPost(room) {
  if (!room.requestPostId) return null;

  try {
    return await fetchRequest(room.requestPostId);
  } catch {
    return null;
  }
}

async function loadTalentPost(room) {
  if (!room.talentPostId) return null;

  try {
    return await fetchTalent(room.talentPostId);
  } catch {
    return null;
  }
}

async function loadActiveTrade(chatRoomId) {
  try {
    const trades = await fetchMyTrades({ size: 50 });
    return (trades.content || []).find(
      (trade) => String(trade.chatRoomId) === String(chatRoomId) &&
        (trade.status === "PENDING" || trade.status === "PAID")
    );
  } catch {
    return null;
  }
}

async function handleLeaveRoom(chatRoomId, panelEl) {
  if (!confirm("채팅방을 나가시겠습니까? 대화 내용을 다시 볼 수 없습니다.")) return;

  try {
    await leaveChatRoom(chatRoomId);
  } catch (error) {
    showChatNotice(panelEl, `채팅방 나가기 실패: ${error.message}`, "error");
    return;
  }

  // hashchange 리스너(app.js의 render())가 teardown + 목록 갱신을 알아서 처리함.
  window.location.hash = "/chat";
}

async function loadHistory(streamEl, room, currentUserId, initialHistory = null) {
  try {
    const history = initialHistory || await fetchChatMessages(room.chatRoomId);
    const ascending = [...history].reverse();
    setSafeHtml(streamEl, ascending.length
      ? ascending.map((message) => renderBubble(message, currentUserId, room)).join("")
      : `<p>아직 메시지가 없습니다. 첫 메시지를 보내보세요.</p>`);
    streamEl.scrollTop = streamEl.scrollHeight;
  } catch (error) {
    setSafeHtml(streamEl, `<p>메시지 이력을 불러오지 못했습니다: ${escapeHtml(error.message)}</p>`);
  }
}

function panelTemplate(room, { canRequestTrade = false, canSetRequestAmount = false } = {}) {
  const tradeButtonLabel = room.talentPostId ? "판매 금액 설정" : "금액 설정 요청";
  const profileContent = `
    ${renderChatAvatar(room)}
    <div><strong>${escapeHtml(room.otherUserNickname ?? "상대방")}</strong><span>${postLabel(room)}</span></div>
  `;
  return `
    <header>
      ${renderChatPostLink(room, profileContent)}
      <div class="chat-panel-actions">
        ${canRequestTrade ? `<button type="button" class="button primary" data-trade-request-open>${tradeButtonLabel}</button>` : ""}
        ${canSetRequestAmount ? `<button type="button" class="button primary" data-request-amount-open>금액 설정</button>` : ""}
        <button type="button" class="button quiet" data-leave-room>채팅방 나가기</button>
      </div>
    </header>
    <div class="message-stream" data-message-stream>
      <p>메시지를 불러오는 중...</p>
    </div>
    <div class="chat-notice" data-chat-notice role="status" aria-live="polite" hidden></div>
    <form class="message-compose" data-compose-form>
      <label class="compose-attach" title="사진 보내기">
        <input type="file" name="image" accept="image/png,image/jpeg,image/gif,image/webp" data-image-input hidden />
        <span aria-hidden="true">📷</span>
      </label>
      <input type="text" name="content" placeholder="메시지를 입력하세요..." aria-label="Message" autocomplete="off" />
      <button type="submit">Send</button>
    </form>
  `;
}

function renderBubble(message, currentUserId, room) {
  const mine = currentUserId != null && String(message.senderId) === String(currentUserId);
  const mineClass = mine ? "me" : "";

  if (message.messageType === "TRADE_REQUEST" && message.trade) {
    return renderTradeRequestBubble(message, currentUserId, mineClass);
  }

  if (isTradeAmountRequest(message)) {
    return renderTradeAmountRequestBubble(message, currentUserId, mineClass, room);
  }

  if (isTradePaid(message)) {
    return renderTradePaidBubble(message, mineClass);
  }

  if (isTradeCompleted(message)) {
    return renderTradeCompletedBubble(message, mineClass);
  }

  if (isTradeCancelled(message)) {
    return renderTradeCancelledBubble(message, mineClass);
  }

  if (message.messageType === "IMAGE") {
    const src = safeImageUrl(message.content);
    if (!src) {
      return `<p class="bubble ${mineClass}">차단된 이미지 주소입니다.</p>`;
    }
    const escapedSrc = escapeHtml(src);
    return `<a class="bubble bubble-image ${mineClass}" href="${escapedSrc}" target="_blank" rel="noopener noreferrer">
      <img src="${escapedSrc}" alt="첨부 이미지" loading="lazy" />
    </a>`;
  }

  return `<p class="bubble ${mineClass}">${escapeHtml(message.content)}</p>`;
}

function renderTradeAmountRequestBubble(message, currentUserId, mineClass, room) {
  const isCounterpart = currentUserId != null && String(message.senderId) !== String(currentUserId);
  const isOpenRequest = getMessageId(message) === room?.openAmountRequestMessageId;
  const canSetAmount = Boolean(room?.requestPostId && isCounterpart && isOpenRequest && !room.hasActiveTrade);

  let actionHtml = `<small>상대방의 금액 설정을 기다리는 중입니다.</small>`;
  if (room?.hasActiveTrade || !isOpenRequest) {
    actionHtml = `<small>거래 금액이 확정되었습니다.</small>`;
  }
  if (canSetAmount) {
    actionHtml = `<button type="button" class="button primary" data-trade-amount-open>금액 설정</button>`;
  }

  return `
    <article class="bubble trade-bubble ${mineClass}">
      <span>금액 설정 요청</span>
      <strong>거래 금액을 설정해 주세요</strong>
      <p>재능 보유자가 금액을 확정하면 요청자가 결제할 수 있습니다.</p>
      ${actionHtml}
    </article>
  `;
}

function renderTradeRequestBubble(message, currentUserId, mineClass) {
  const trade = message.trade;
  const isPayer = currentUserId != null && String(trade.payerId) === String(currentUserId);
  const isRequester = currentUserId != null && String(trade.payeeId) === String(currentUserId);
  const isPending = trade.status === "PENDING";
  const canCancel = isPending && isRequester;

  return `
    <article class="bubble trade-bubble ${mineClass}" data-trade-card="${escapeHtml(trade.tradeId)}">
      <span>거래 요청</span>
      <strong>${formatTradeAmount(trade.amount)}</strong>
      <p>${trade.postType === "REQUEST" ? "요청글 거래가 생성되었습니다." : "재능글 거래가 생성되었습니다."}</p>
      <div data-trade-card-status>${renderTradeCardActions(trade, { isPending, isPayer, canCancel })}</div>
    </article>
  `;
}

function renderTradeCardActions(trade, { isPending, isPayer, canCancel }) {
  const buttons = [];
  if (isPending && isPayer) {
    buttons.push(`
          <button
            type="button"
            class="button primary"
            data-trade-pay-open="${escapeHtml(trade.tradeId)}"
            data-trade-amount="${escapeHtml(trade.amount)}"
            data-trade-status="${escapeHtml(trade.status)}"
            data-trade-payer-id="${escapeHtml(trade.payerId)}"
          >거래 진행</button>
        `);
  }
  if (canCancel) {
    buttons.push(`
          <button
            type="button"
            class="button quiet"
            data-trade-cancel="${escapeHtml(trade.tradeId)}"
          >거래 취소</button>
        `);
  }
  if (buttons.length > 0) {
    return `<div class="trade-card-actions">${buttons.join("")}</div>`;
  }
  return `<small>${tradeStatusLabel(trade.status, isPayer)}</small>`;
}

function renderTradePaidBubble(message, mineClass) {
  return `
    <article class="bubble trade-bubble trade-paid-bubble ${mineClass}">
      <span>결제 완료</span>
      <strong>${formatTradeAmount(message.trade?.amount)}</strong>
      <p>결제가 완료되어 거래가 진행 중 상태로 변경되었습니다.</p>
    </article>
  `;
}

function renderTradeCompletedBubble(message, mineClass) {
  return `
    <article class="bubble trade-bubble trade-paid-bubble ${mineClass}">
      <span>거래 완료</span>
      <strong>${formatTradeAmount(message.trade?.amount)}</strong>
      <p>거래 완료되었습니다.</p>
    </article>
  `;
}

function renderTradeCancelledBubble(message, mineClass) {
  return `
    <article class="bubble trade-bubble trade-paid-bubble ${mineClass}">
      <span>거래 취소</span>
      <strong>${formatTradeAmount(message.trade?.amount)}</strong>
      <p>거래가 취소되었습니다.</p>
    </article>
  `;
}

async function sendRequestTradeAmountCard(panelEl, room) {
  const buttonEl = panelEl.querySelector("[data-trade-request-open]");
  buttonEl.disabled = true;
  try {
    await requestTradeAmount(room.chatRoomId);
    buttonEl.remove();
  } catch (error) {
    showChatNotice(panelEl, error.message, "error");
    buttonEl.disabled = false;
  }
}

function openTalentTradeRequestModal(panelEl, { room, talentPost }) {
  if (!talentPost) {
    showChatNotice(panelEl, "재능글 정보를 불러오지 못했습니다.", "error");
    return;
  }

  const defaultAmount = Number(talentPost.price || talentPost.budgetMax || talentPost.budgetMin || 0);
  showChatModal(panelEl, `
    <div class="modal-head">
      <div>
        <span class="kicker">Trade Request</span>
        <h2>판매 금액 설정</h2>
      </div>
      <button class="modal-close" type="button" data-chat-modal-close aria-label="팝업 닫기">x</button>
    </div>
    <form class="trade-modal-form" data-trade-request-form>
      <label class="field">
        <span>재능 판매글</span>
        <input type="text" value="${escapeHtml(talentPost.title || room.postTitle || "재능 판매글")}" readonly />
      </label>
      <label class="field">
        <span>거래 금액</span>
        <input type="number" name="amount" min="1" step="1" value="${defaultAmount || ""}" required />
      </label>
      <p class="secure-note">전송한 금액은 수정할 수 없습니다.</p>
      <p class="form-message" data-trade-modal-message aria-live="polite"></p>
      <div class="form-actions">
        <button class="button quiet" type="button" data-chat-modal-close>취소</button>
        <button class="button primary" type="submit">금액 확정 및 요청</button>
      </div>
    </form>
  `);

  const modalEl = panelEl.querySelector("[data-chat-modal]");
  const formEl = modalEl.querySelector("[data-trade-request-form]");
  const messageEl = modalEl.querySelector("[data-trade-modal-message]");
  const submitButton = formEl.querySelector("button[type='submit']");

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    const amount = Number(new FormData(formEl).get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      messageEl.textContent = "거래 금액을 확인해 주세요.";
      return;
    }

    submitButton.disabled = true;
    try {
      await createTrade(room.chatRoomId, { amount, talentPostId: talentPost.talentPostId });
      panelEl.querySelector("[data-trade-request-open]")?.remove();
      closeChatModal(panelEl);
      showChatNotice(panelEl, "거래 요청을 보냈습니다.");
    } catch (error) {
      messageEl.textContent = error.message;
      submitButton.disabled = false;
    }
  });
}

function openRequestTradeAmountModal(panelEl, { room, requestPost }) {
  if (!requestPost) {
    showChatNotice(panelEl, "요청글 정보를 불러오지 못했습니다.", "error");
    return;
  }

  showChatModal(panelEl, `
    <div class="modal-head">
      <div>
        <span class="kicker">Trade Amount</span>
        <h2>거래 금액 설정</h2>
      </div>
      <button class="modal-close" type="button" data-chat-modal-close aria-label="팝업 닫기">x</button>
    </div>
    <form class="trade-modal-form" data-trade-request-form>
      <label class="field">
        <span>재능 요청글</span>
        <input type="text" value="${escapeHtml(requestPost.title || room.postTitle || "재능 요청글")}" readonly />
      </label>
      <label class="field">
        <span>받을 금액</span>
        <input type="number" name="amount" min="1" step="1" required />
      </label>
      <p class="secure-note">전송한 금액은 수정할 수 없습니다.</p>
      <p class="form-message" data-trade-modal-message aria-live="polite"></p>
      <div class="form-actions">
        <button class="button quiet" type="button" data-chat-modal-close>취소</button>
        <button class="button primary" type="submit">지불 요청 보내기</button>
      </div>
    </form>
  `);

  const modalEl = panelEl.querySelector("[data-chat-modal]");
  const formEl = modalEl.querySelector("[data-trade-request-form]");
  const messageEl = modalEl.querySelector("[data-trade-modal-message]");
  const submitButton = formEl.querySelector("button[type='submit']");

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    const amount = Number(new FormData(formEl).get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      messageEl.textContent = "거래 금액을 확인해 주세요.";
      return;
    }

    submitButton.disabled = true;
    try {
      await createTrade(room.chatRoomId, { amount, requestPostId: requestPost.requestPostId });
      panelEl.querySelector("[data-request-amount-open]")?.remove();
      markAmountRequestButtonsAsFixed(panelEl);
      closeChatModal(panelEl);
      showChatNotice(panelEl, "지불 요청을 보냈습니다.");
    } catch (error) {
      messageEl.textContent = error.message;
      submitButton.disabled = false;
    }
  });
}

async function openTradePayModal(panelEl, trade) {
  showChatModal(panelEl, `
    <div class="modal-head">
      <div>
        <span class="kicker">Payment</span>
        <h2>거래 결제</h2>
      </div>
      <button class="modal-close" type="button" data-chat-modal-close aria-label="팝업 닫기">x</button>
    </div>
    <div class="trade-payment-detail">
      <dl>
        <div><dt>거래 금액</dt><dd>${formatTradeAmount(trade.amount)}</dd></div>
        <div><dt>내 잔액</dt><dd data-trade-wallet>불러오는 중...</dd></div>
      </dl>
      <p class="form-message" data-trade-modal-message aria-live="polite"></p>
      <div class="form-actions">
        <button class="button quiet" type="button" data-chat-modal-close>취소</button>
        <button class="button primary" type="button" data-trade-pay-submit disabled>지불하기</button>
      </div>
    </div>
  `);

  const modalEl = panelEl.querySelector("[data-chat-modal]");
  const walletEl = modalEl.querySelector("[data-trade-wallet]");
  const messageEl = modalEl.querySelector("[data-trade-modal-message]");
  const payButton = modalEl.querySelector("[data-trade-pay-submit]");

  try {
    const wallet = await fetchWallet();
    const balance = Number(wallet.balance || 0);
    const amount = Number(trade.amount || 0);
    walletEl.textContent = formatTradeAmount(balance);
    payButton.disabled = balance < amount;
    if (balance < amount) {
      messageEl.textContent = "잔액이 부족합니다.";
    }
  } catch (error) {
    walletEl.textContent = "-";
    messageEl.textContent = error.message;
  }

  payButton.addEventListener("click", async () => {
    payButton.disabled = true;
    try {
      const paidTrade = await payTrade(trade.tradeId);
      closeChatModal(panelEl);
      const statusLabel = paidTrade?.status === "COMPLETED" ? "거래 완료" : "결제 완료";
      updateTradeCardStatus(panelEl, paidTrade || trade, statusLabel);
      showChatNotice(panelEl, "결제가 완료되어 거래 완료 안내가 채팅에 추가됩니다.");
    } catch (error) {
      messageEl.textContent = error.message;
      payButton.disabled = false;
    }
  });
}

async function cancelTradeRequest(panelEl, buttonEl, onCancelled) {
  const tradeId = buttonEl.dataset.tradeCancel;
  if (!tradeId) return;

  buttonEl.disabled = true;
  try {
    const cancelledTrade = await cancelTrade(tradeId);
    updateTradeCardStatus(panelEl, cancelledTrade, "취소된 거래");
    showChatNotice(panelEl, "거래가 취소되었습니다.");
    onCancelled?.(cancelledTrade);
  } catch (error) {
    buttonEl.disabled = false;
    showChatNotice(panelEl, `거래 취소 실패: ${error.message}`, "error");
  }
}

function showChatModal(panelEl, content) {
  closeChatModal(panelEl);
  appendSafeHtml(panelEl, "beforeend", `
    <div class="modal-backdrop chat-modal-backdrop" data-chat-modal>
      <div class="charge-modal chat-trade-modal" role="dialog" aria-modal="true">
        ${content}
      </div>
    </div>
  `);

  const modalEl = panelEl.querySelector("[data-chat-modal]");
  modalEl.addEventListener("click", (event) => {
    if (event.target === modalEl || event.target.closest("[data-chat-modal-close]")) {
      closeChatModal(panelEl);
    }
  });
}

function closeChatModal(panelEl) {
  panelEl.querySelector("[data-chat-modal]")?.remove();
}

function statusText(text) {
  const element = document.createElement("small");
  element.textContent = text;
  return element;
}

function showChatNotice(panelEl, message, type = "success") {
  const noticeEl = panelEl.querySelector("[data-chat-notice]");
  if (!noticeEl) return;

  const previousTimer = noticeTimers.get(noticeEl);
  if (previousTimer) {
    clearTimeout(previousTimer);
  }

  noticeEl.textContent = message;
  noticeEl.hidden = false;
  noticeEl.className = `chat-notice ${type}`;

  const nextTimer = setTimeout(() => {
    noticeEl.hidden = true;
  }, 3000);
  noticeTimers.set(noticeEl, nextTimer);
}

function markAmountRequestButtonsAsFixed(panelEl) {
  panelEl.querySelectorAll("[data-trade-amount-open]").forEach((button) => {
    button.replaceWith(statusText("거래 금액이 확정되었습니다."));
  });
}

function showRequestAmountAction(panelEl) {
  const actionsEl = panelEl.querySelector(".chat-panel-actions");
  if (!actionsEl || actionsEl.querySelector("[data-request-amount-open]")) return;

  appendSafeHtml(
    actionsEl,
    "afterbegin",
    `<button type="button" class="button primary" data-request-amount-open>금액 설정</button>`
  );
}

function isTradeAmountRequest(message) {
  return Boolean(message) && (
    message.actionType === "TRADE_AMOUNT_REQUEST" ||
    message.messageType === "TRADE_AMOUNT_REQUEST" ||
    (message.messageType === "SYSTEM" && message.content === "거래 금액 설정을 요청했습니다.")
  );
}

function isTradePaid(message) {
  return Boolean(message?.trade) && (
    message.actionType === "TRADE_PAID" ||
    (message.messageType === "SYSTEM" && message.content === "결제가 완료되었습니다.")
  );
}

function isTradeCompleted(message) {
  return Boolean(message?.trade) && (
    message.actionType === "TRADE_COMPLETED" ||
    (message.messageType === "SYSTEM" && message.content === "거래 완료되었습니다.")
  );
}

function isTradeCancelled(message) {
  return Boolean(message?.trade) && (
    message.actionType === "TRADE_CANCELLED" ||
    (message.messageType === "SYSTEM" && message.content === "거래가 취소되었습니다.")
  );
}

function resolveTradeFlow(history, activeTrade) {
  const messages = Array.isArray(history) ? history : [];
  const latestTradeFlowMessage = messages.find((message) =>
    isTradeAmountRequest(message) || message.messageType === "TRADE_REQUEST"
  );
  const latestTradeRequest = messages.find((message) => message.messageType === "TRADE_REQUEST");
  const hasActiveTrade = Boolean(activeTrade || isActiveTradeRequest(latestTradeRequest));
  const hasOpenAmountRequest = Boolean(!hasActiveTrade && isTradeAmountRequest(latestTradeFlowMessage));

  return {
    hasActiveTrade,
    hasOpenAmountRequest,
    openAmountRequestMessageId: hasOpenAmountRequest ? getMessageId(latestTradeFlowMessage) : null,
  };
}

function isActiveTradeRequest(message) {
  if (!message?.trade) return false;
  return message.trade.status === "PENDING" || message.trade.status === "PAID";
}

function isPostAvailableForTrade(post, room) {
  if (!post) return false;
  if (room.requestPostId) return post.status === "OPEN";
  if (room.talentPostId) return post.status === "ACTIVE";
  return false;
}

function getMessageId(message) {
  return String(message?.chatMessageId || message?.messageId || message?.id || "");
}

function updateTradeCardStatus(panelEl, trade, label) {
  if (!trade?.tradeId) return;

  const tradeId = CSS.escape(String(trade.tradeId));
  panelEl.querySelectorAll(`[data-trade-card="${tradeId}"] [data-trade-card-status]`).forEach((statusEl) => {
    setSafeHtml(statusEl, `<small>${escapeHtml(label)}</small>`);
  });
}

function formatTradeAmount(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("ko-KR")}원`;
}

function tradeStatusLabel(status, isPayer) {
  if (status === "PAID") return "결제 완료";
  if (status === "COMPLETED") return "거래 완료";
  if (status === "CANCELLED") return "취소된 거래";
  return isPayer ? "결제 대기 중" : "상대방 결제 대기 중";
}

function postLabel(room) {
  if (room.postTitle) return escapeHtml(room.postTitle);
  if (room.talentPostId) return "판매글";
  if (room.requestPostId) return "요청글";
  return "";
}

function renderChatPostLink(room, content) {
  const href = postDetailHref(room);
  if (!href) {
    return `<div class="seller-box">${content}</div>`;
  }

  return `
    <a class="seller-box chat-post-link" href="${href}" aria-label="연결된 게시글 상세 보기">
      ${content}
    </a>
  `;
}

function postDetailHref(room) {
  if (room.talentPostId) {
    return `#/talent/${escapeHtml(room.talentPostId)}`;
  }
  if (room.requestPostId) {
    return `#/request/${escapeHtml(room.requestPostId)}`;
  }
  return "";
}

function renderChatAvatar(room) {
  const initial = (room.otherUserNickname || "?").charAt(0).toUpperCase();
  return `
    <div class="avatar chat-avatar">
      ${room.otherUserProfileImageUrl ? `<img src="${escapeHtml(safeImageUrl(room.otherUserProfileImageUrl))}" alt="" />` : escapeHtml(initial)}
    </div>
  `;
}
