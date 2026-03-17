import {
  finishMatch,
  getFeed,
  getMatches,
  getMessages,
  sendSwipe,
  uploadChatMedia,
} from '../../services/api.js';
import { getCurrentUser, saveUserData } from '../../utils/auth.js';
import {
  CHAT_NOTIFICATION_STORE,
  CHAT_RECORDING_MAX_MS,
  CHAT_RECORDING_MIME_CANDIDATES,
  CHAT_UPLOAD_MAX_BYTES,
  DEFAULT_MATCH_AVATAR,
  MAX_CHAT_NOTIFICATIONS,
  WEBRTC_ICE_SERVERS,
  WEBRTC_MEDIA_CONSTRAINTS,
} from './constants.js';
import { setupSwapsCarousels } from './carousel-controls.js';
import {
  buildChatNotificationPreview,
  detectChatUploadFileType,
  getChatMediaSource,
  getChatMessageText,
  isSignalingMessageType,
  normalizeChatMediaUrl,
  normalizeChatMessageType,
  normalizeIncomingChatMessage,
  resolveChatMessageType,
} from './chat-message-utils.js';
import {
  getFeedProfileId,
  isAiMessage,
  isMatchCreated,
  normalizeFeedPayload,
  normalizeMatchesPayload,
  normalizeMessagesPayload,
} from './data-normalizers.js';
import {
  renderFeedCategoryBoard,
  renderFeedEmptyState,
  renderFeedLoadingState,
} from './feed-render.js';
import { groupFeedProfilesByCategory } from './feed-categorization.js';
import {
  getEntityUserId,
  getMatchAvatar,
  getMatchId,
  getMatchRoomId,
  resolveAvatarForEntity,
} from './avatar-utils.js';
import { buildChatSocketUrl, buildSignalSocketUrl } from './socket-utils.js';
import {
  persistClosedSwapRooms,
  readClosedSwapRooms,
} from './storage-utils.js';
import { escapeHtml, formatNotificationTime } from './ui-utils.js';
export function setupMatchesChat(state, options = {}) {
  const matchesList = document.getElementById('matches-list');
  const matchesStatus = document.getElementById('matches-status');
  const refreshMatchesButton = document.getElementById('btn-refresh-matches');
  const refreshFeedButton = document.getElementById('btn-refresh-feed');
  const feedStatus = document.getElementById('feed-status');
  const feedCategoriesRoot = document.getElementById('feed-categories-root');
  const chatContainer = document.getElementById('chat-container');
  const chatEmptyState = document.getElementById('chat-empty');
  const chatHeader = document.getElementById('chat-header');
  const chatRoomHelper = document.getElementById('chat-room-helper');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatSendButton = document.getElementById('btn-enviar');
  const chatFileInput = document.getElementById('chat-file-input');
  const chatFileButton = document.getElementById('chat-file-btn');
  const chatRecordButton = document.getElementById('chat-record-btn');
  const closeChatButton = document.getElementById('chat-close-btn');
  const finishSwapButton = document.getElementById('chat-finish-btn');
  const callPanel = document.getElementById('call-panel');
  const callStatus = document.getElementById('call-status');
  const localVideo = document.getElementById('local-video');
  const remoteVideo = document.getElementById('remote-video');
  const callStartButton = document.getElementById('chat-call-btn');
  const callHangupButton = document.getElementById('chat-hangup-btn');
  const notificationsButton = document.querySelector(
    '[data-notifications-toggle]'
  );
  const notificationsPanel = document.getElementById('notifications-panel');
  const notificationsList = document.getElementById('notifications-list');
  const notificationsEmpty = document.getElementById('notifications-empty');
  const notificationsBadge = document.querySelector(
    '[data-notifications-badge]'
  );
  const notificationsToastStack = document.getElementById(
    'notifications-toast-stack'
  );

  const hasFeedCarousel =
    Boolean(refreshFeedButton) && Boolean(feedStatus) && Boolean(feedCategoriesRoot);
  const hasChatPanel =
    Boolean(matchesList) &&
    Boolean(matchesStatus) &&
    Boolean(refreshMatchesButton) &&
    Boolean(chatContainer) &&
    Boolean(chatEmptyState) &&
    Boolean(chatHeader) &&
    Boolean(chatRoomHelper) &&
    Boolean(chatMessages) &&
    Boolean(chatForm) &&
    Boolean(chatInput) &&
    Boolean(chatSendButton) &&
    Boolean(closeChatButton) &&
    Boolean(finishSwapButton);
  const hasMediaUploadUI =
    hasChatPanel && Boolean(chatFileInput) && Boolean(chatFileButton);
  const hasAudioRecorderUI = hasChatPanel && Boolean(chatRecordButton);
  const hasCallUI =
    hasChatPanel &&
    Boolean(callPanel) &&
    Boolean(callStatus) &&
    Boolean(localVideo) &&
    Boolean(remoteVideo) &&
    Boolean(callStartButton) &&
    Boolean(callHangupButton);
  const hasNotificationUI =
    Boolean(notificationsButton) &&
    Boolean(notificationsPanel) &&
    Boolean(notificationsList) &&
    Boolean(notificationsEmpty) &&
    Boolean(notificationsBadge) &&
    Boolean(notificationsToastStack);

  if (!hasFeedCarousel && !hasChatPanel && !hasNotificationUI) {
    return () => {};
  }

  const closedSwapsStorageKey = state.userId
    ? `learning-swap:closed-swaps:${state.userId}`
    : 'learning-swap:closed-swaps:guest';
  const closedRoomIds = readClosedSwapRooms(closedSwapsStorageKey);

  const cleanups = [];
  let disposed = false;
  let latestMatchesRequest = 0;
  let latestHistoryRequest = 0;
  let autoOpenDone = false;
  let rowCleanups = [];
  let feedActionCleanups = [];
  let feedCarouselControlsCleanup = () => {};
  let feedQueue = [];
  let swipeInProgress = false;
  let mediaUploadInProgress = false;
  let audioRecordingInProgress = false;
  let audioRecorder = null;
  let audioRecorderStream = null;
  let audioRecorderChunks = [];
  let audioRecorderShouldUpload = true;
  let audioRecordingTimerId = null;
  let notificationsOpen = false;
  let activeMatch = null;
  let finishingSwapInProgress = false;
  const avatarCache = new Map();
  const callState = {
    roomId: null,
    active: false,
    signalSocket: null,
    signalClosing: false,
    peerConnection: null,
    localStream: null,
    pendingCandidates: [],
    remoteDescriptionReady: false,
  };

  const persistClosedSwaps = () => {
    persistClosedSwapRooms(closedSwapsStorageKey, closedRoomIds);
  };

  const isClosedSwapRoom = (roomId) => {
    if (!roomId) return false;
    return closedRoomIds.has(String(roomId));
  };

  const closeSwapRoom = (roomId) => {
    if (!roomId) return;
    closedRoomIds.add(String(roomId));
    persistClosedSwaps();
  };

  const isMatchCompleted = (match = {}) => {
    const statusCandidate =
      match?.is_completed ??
      match?.completed ??
      match?.isCompleted ??
      match?.status ??
      match?.state ??
      null;

    if (typeof statusCandidate === 'boolean') {
      return statusCandidate;
    }

    if (typeof statusCandidate === 'number') {
      return statusCandidate === 1;
    }

    if (typeof statusCandidate === 'string') {
      const normalizedStatus = statusCandidate.trim().toLowerCase();
      return (
        normalizedStatus === 'true' ||
        normalizedStatus === '1' ||
        normalizedStatus === 'completed' ||
        normalizedStatus === 'closed' ||
        normalizedStatus === 'finished' ||
        normalizedStatus === 'finalizado'
      );
    }

    return false;
  };

  const resolveCurrentUserId = () => {
    if (state.userId) return String(state.userId);

    const cachedUser = getCurrentUser() || {};
    const candidate = cachedUser?.id ?? cachedUser?.user_id ?? null;
    if (candidate === null || candidate === undefined || candidate === '') {
      return null;
    }

    return String(candidate);
  };

  const normalizePointsValue = (points) => {
    const parsedPoints = Number.parseInt(points, 10);
    return Number.isNaN(parsedPoints) ? null : parsedPoints;
  };

  const updateCurrentUserPoints = (points) => {
    const normalizedPoints = normalizePointsValue(points);
    if (normalizedPoints === null) return;

    const cachedUser = getCurrentUser() || {};
    saveUserData({
      user: {
        ...cachedUser,
        points: normalizedPoints,
      },
    });

    document.querySelectorAll('[data-current-user-points]').forEach((element) => {
      element.textContent = String(normalizedPoints);
    });

    document.querySelectorAll('[data-current-user-points-chip]').forEach((element) => {
      element.textContent = `${normalizedPoints} pts`;
    });
  };

  const resolveAwardedPointsFromFinishPayload = (payload = {}) => {
    return normalizePointsValue(
      payload?.puntos_otorgados ??
        payload?.points_awarded ??
        payload?.awarded_points ??
        payload?.data?.puntos_otorgados ??
        payload?.data?.points_awarded
    );
  };

  const resolveUpdatedPointsFromFinishPayload = (payload = {}) => {
    const directPoints = normalizePointsValue(
      payload?.points ??
        payload?.puntos ??
        payload?.my_points ??
        payload?.mis_puntos ??
        payload?.data?.points ??
        payload?.data?.puntos
    );

    if (directPoints !== null) {
      return directPoints;
    }

    const currentUserId = resolveCurrentUserId();
    if (!currentUserId) {
      return null;
    }

    const candidates = [
      payload?.user1,
      payload?.user2,
      payload?.data?.user1,
      payload?.data?.user2,
    ].filter(Boolean);

    for (const userPayload of candidates) {
      const candidateUserId =
        userPayload?.user_id ?? userPayload?.id ?? userPayload?.userId ?? null;

      if (
        candidateUserId === null ||
        candidateUserId === undefined ||
        candidateUserId === ''
      ) {
        continue;
      }

      if (String(candidateUserId) !== String(currentUserId)) {
        continue;
      }

      const updatedPoints = normalizePointsValue(
        userPayload?.nuevos_puntos ??
          userPayload?.new_points ??
          userPayload?.points ??
          userPayload?.puntos
      );

      if (updatedPoints !== null) {
        return updatedPoints;
      }
    }

    return null;
  };

  const setFinishSwapButtonState = (match) => {
    if (!hasChatPanel) return;

    const canFinishMatch =
      Boolean(match) && Boolean(getMatchId(match)) && !isMatchCompleted(match);

    finishSwapButton.hidden = !canFinishMatch;
    finishSwapButton.disabled = !canFinishMatch || finishingSwapInProgress;
    finishSwapButton.textContent = finishingSwapInProgress
      ? 'Finalizando...'
      : 'Cerrar swap';
  };

  const setMatchesStatus = (text, tone = 'muted') => {
    if (!hasChatPanel) return;

    matchesStatus.textContent = text;
    matchesStatus.classList.remove('is-muted', 'is-success', 'is-error');
    matchesStatus.classList.add(`is-${tone}`);
  };

  const setFeedStatus = (text, tone = 'muted') => {
    if (!hasFeedCarousel) return;

    feedStatus.textContent = text;
    feedStatus.classList.remove('is-muted', 'is-success', 'is-error');
    feedStatus.classList.add(`is-${tone}`);
  };

  const setFeedButtonsDisabled = (disabled) => {
    if (!hasFeedCarousel) return;

    feedCategoriesRoot.querySelectorAll('.feed-swipe-btn').forEach((button) => {
      const hasTarget = Boolean(button.getAttribute('data-user-id'));
      button.disabled = disabled || !hasTarget;
    });
  };

  const setCallPanelVisible = (show) => {
    if (!hasCallUI) return;
    callPanel.hidden = !show;
  };

  const setCallStatus = (text, tone = 'muted') => {
    if (!hasCallUI) return;

    callStatus.textContent = text;
    callStatus.classList.remove('is-muted', 'is-success', 'is-error');
    callStatus.classList.add(`is-${tone}`);
  };

  const setCallButtons = () => {
    if (!hasCallUI) return;

    const hasActiveRoom = Boolean(state.activeRoomId);
    callStartButton.disabled = !hasActiveRoom || callState.active;
    callHangupButton.hidden = !callState.active;
    callHangupButton.disabled = !callState.active;
  };

  const supportsAudioRecording = () => {
    return (
      hasAudioRecorderUI &&
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined' &&
      Boolean(navigator?.mediaDevices?.getUserMedia)
    );
  };

  const resolveAudioRecordingMimeType = () => {
    if (!supportsAudioRecording()) return '';

    if (typeof window.MediaRecorder.isTypeSupported !== 'function') {
      return CHAT_RECORDING_MIME_CANDIDATES[0];
    }

    const supported = CHAT_RECORDING_MIME_CANDIDATES.find((candidate) => {
      return window.MediaRecorder.isTypeSupported(candidate);
    });

    return supported || '';
  };

  const clearAudioRecordingTimer = () => {
    if (!audioRecordingTimerId) return;
    window.clearTimeout(audioRecordingTimerId);
    audioRecordingTimerId = null;
  };

  const stopAudioRecordingStream = () => {
    if (!audioRecorderStream) return;

    audioRecorderStream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // Ignore microphone stop errors.
      }
    });

    audioRecorderStream = null;
  };

  const setAudioRecordButtonState = () => {
    if (!hasAudioRecorderUI) return;

    if (!supportsAudioRecording()) {
      chatRecordButton.disabled = true;
      chatRecordButton.classList.remove('is-recording');
      chatRecordButton.textContent = 'Mic no disponible';
      return;
    }

    if (audioRecordingInProgress) {
      chatRecordButton.disabled = false;
      chatRecordButton.classList.add('is-recording');
      chatRecordButton.textContent = 'Detener';
      return;
    }

    chatRecordButton.classList.remove('is-recording');
    chatRecordButton.textContent = 'Grabar';
    chatRecordButton.disabled = mediaUploadInProgress || !state.activeRoomId;
  };

  const setChatComposerBusy = (busy) => {
    if (!hasChatPanel) return;

    const shouldDisableComposer = busy || audioRecordingInProgress;
    chatSendButton.disabled = shouldDisableComposer;
    chatInput.disabled = shouldDisableComposer;

    if (hasMediaUploadUI) {
      chatFileButton.disabled = shouldDisableComposer;
      chatFileInput.disabled = shouldDisableComposer;
    }

    setAudioRecordButtonState();
  };

  const stopAudioRecording = ({ shouldUpload = true } = {}) => {
    if (!audioRecordingInProgress || !audioRecorder) {
      return;
    }

    audioRecorderShouldUpload = shouldUpload;
    clearAudioRecordingTimer();

    if (shouldUpload) {
      chatRoomHelper.textContent = 'Procesando audio grabado...';
    } else {
      chatRoomHelper.textContent = 'Grabacion cancelada.';
    }

    try {
      audioRecorder.stop();
    } catch {
      audioRecorder = null;
      audioRecorderChunks = [];
      audioRecorderShouldUpload = true;
      audioRecordingInProgress = false;
      stopAudioRecordingStream();
      setChatComposerBusy(mediaUploadInProgress);
    }
  };

  const cancelAudioRecording = () => {
    if (!audioRecordingInProgress) {
      clearAudioRecordingTimer();
      stopAudioRecordingStream();
      audioRecorder = null;
      audioRecorderChunks = [];
      audioRecorderShouldUpload = true;
      setChatComposerBusy(mediaUploadInProgress);
      return;
    }

    stopAudioRecording({ shouldUpload: false });
  };

  const startAudioRecording = async () => {
    if (!hasAudioRecorderUI || mediaUploadInProgress || audioRecordingInProgress) return;

    if (!state.activeRoomId) {
      chatRoomHelper.textContent = 'Abre una conversación para grabar un audio.';
      return;
    }

    if (!isChatSocketOpen()) {
      chatRoomHelper.textContent = 'La sala no está conectada todavía.';
      return;
    }

    if (!supportsAudioRecording()) {
      chatRoomHelper.textContent =
        'Tu navegador no soporta grabación de audio en este chat.';
      return;
    }

    let stream = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    } catch {
      chatRoomHelper.textContent =
        'No se pudo acceder al micrófono. Revisa los permisos del navegador.';
      return;
    }

    const preferredMimeType = resolveAudioRecordingMimeType();

    try {
      audioRecorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
    } catch {
      try {
        audioRecorder = new MediaRecorder(stream);
      } catch {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore microphone stop errors.
          }
        });

        chatRoomHelper.textContent =
          'No fue posible iniciar la grabación de audio en este navegador.';
        return;
      }
    }

    audioRecorderStream = stream;
    audioRecorderChunks = [];
    audioRecorderShouldUpload = true;
    audioRecordingInProgress = true;

    audioRecorder.ondataavailable = (event) => {
      if (!event?.data || event.data.size <= 0) return;
      audioRecorderChunks.push(event.data);
    };

    audioRecorder.onerror = () => {
      clearAudioRecordingTimer();
      stopAudioRecordingStream();

      audioRecorder = null;
      audioRecorderChunks = [];
      audioRecorderShouldUpload = true;
      audioRecordingInProgress = false;

      chatRoomHelper.textContent = 'Hubo un error durante la grabación de audio.';
      setChatComposerBusy(mediaUploadInProgress);
    };

    audioRecorder.onstop = async () => {
      const shouldUpload = audioRecorderShouldUpload;
      const recorderMime = String(audioRecorder?.mimeType || '').trim();
      const chunks = [...audioRecorderChunks];

      clearAudioRecordingTimer();
      stopAudioRecordingStream();

      audioRecorder = null;
      audioRecorderChunks = [];
      audioRecorderShouldUpload = true;
      audioRecordingInProgress = false;
      setChatComposerBusy(mediaUploadInProgress);

      if (!shouldUpload || disposed) {
        return;
      }

      if (chunks.length === 0) {
        chatRoomHelper.textContent = 'No se detectó audio grabado.';
        return;
      }

      const baseMimeType = recorderMime
        ? recorderMime.split(';')[0].trim().toLowerCase()
        : 'audio/webm';

      const audioBlob = new Blob(chunks, {
        type: baseMimeType || 'audio/webm',
      });

      if (!audioBlob.size) {
        chatRoomHelper.textContent = 'No se detectó audio grabado.';
        return;
      }

      const extension = baseMimeType.includes('ogg') ? 'ogg' : 'webm';
      const audioFile = new File(
        [audioBlob],
        `audio-${Date.now()}.${extension}`,
        {
          type: baseMimeType || 'audio/webm',
        }
      );

      await uploadAndSendChatFile(audioFile);
    };

    try {
      audioRecorder.start(300);
    } catch {
      clearAudioRecordingTimer();
      stopAudioRecordingStream();
      audioRecorder = null;
      audioRecorderChunks = [];
      audioRecorderShouldUpload = true;
      audioRecordingInProgress = false;
      chatRoomHelper.textContent = 'No se pudo comenzar la grabación de audio.';
      setChatComposerBusy(mediaUploadInProgress);
      return;
    }

    audioRecordingTimerId = window.setTimeout(() => {
      if (!audioRecordingInProgress) return;
      chatRoomHelper.textContent =
        'Se alcanzó el máximo de 2 minutos. Enviando audio grabado...';
      stopAudioRecording({ shouldUpload: true });
    }, CHAT_RECORDING_MAX_MS);

    chatRoomHelper.textContent = 'Grabando audio... Pulsa Detener para enviarlo.';
    setChatComposerBusy(mediaUploadInProgress);
  };

  const clearVideoElements = () => {
    if (!hasCallUI) return;
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
  };

  const stopLocalStream = () => {
    if (!callState.localStream) return;

    callState.localStream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // Ignore track stop errors on cleanup.
      }
    });

    callState.localStream = null;
  };

  const closePeerConnection = () => {
    if (!callState.peerConnection) return;

    try {
      callState.peerConnection.ontrack = null;
      callState.peerConnection.onicecandidate = null;
      callState.peerConnection.onconnectionstatechange = null;
      callState.peerConnection.close();
    } catch {
      // Ignore close errors.
    }

    callState.peerConnection = null;
    callState.pendingCandidates = [];
    callState.remoteDescriptionReady = false;
  };

  const closeSignalSocket = () => {
    if (!callState.signalSocket) return;

    const activeSocket = callState.signalSocket;
    callState.signalClosing = true;
    callState.signalSocket = null;

    try {
      activeSocket.onmessage = null;
      activeSocket.onopen = null;
      activeSocket.onerror = null;
      activeSocket.onclose = null;
      activeSocket.close();
    } catch {
      // Ignore close errors.
    }
  };

  const sendSignalMessage = (payload = {}) => {
    const socket = callState.signalSocket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setCallStatus('La señalización no está conectada.', 'error');
      return false;
    }

    try {
      socket.send(JSON.stringify(payload));
      return true;
    } catch {
      setCallStatus('No fue posible enviar señalización.', 'error');
      return false;
    }
  };

  const closeCallSession = ({
    notifyHangUp = false,
    closeSignal = false,
    keepStatus = false,
  } = {}) => {
    if (notifyHangUp && callState.active) {
      sendSignalMessage({ type: 'hang-up' });
    }

    callState.active = false;
    closePeerConnection();
    stopLocalStream();
    clearVideoElements();

    if (closeSignal) {
      closeSignalSocket();
      callState.roomId = null;
    }

    if (!keepStatus) {
      setCallStatus('Llamada finalizada.', 'muted');
    }

    setCallButtons();
  };

  const attachLocalTracks = (peerConnection, stream) => {
    if (!peerConnection || !stream) return;

    const senderKinds = new Set(
      peerConnection
        .getSenders()
        .map((sender) => sender.track?.kind)
        .filter(Boolean)
    );

    stream.getTracks().forEach((track) => {
      if (senderKinds.has(track.kind)) return;
      peerConnection.addTrack(track, stream);
    });
  };

  const createPeerConnection = () => {
    if (callState.peerConnection) {
      return callState.peerConnection;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: WEBRTC_ICE_SERVERS,
    });

    callState.peerConnection = peerConnection;
    callState.pendingCandidates = [];
    callState.remoteDescriptionReady = false;

    if (callState.localStream) {
      attachLocalTracks(peerConnection, callState.localStream);
    }

    peerConnection.ontrack = (event) => {
      if (!hasCallUI) return;

      const [remoteStream] = event.streams || [];
      if (remoteStream) {
        remoteVideo.srcObject = remoteStream;
      }

      callState.active = true;
      setCallPanelVisible(true);
      setCallStatus('Llamada conectada.', 'success');
      setCallButtons();
    };

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      sendSignalMessage({ type: 'candidate', candidate: event.candidate });
    };

    peerConnection.onconnectionstatechange = () => {
      const currentState = peerConnection.connectionState;

      if (currentState === 'connected') {
        callState.active = true;
        setCallStatus('Llamada conectada.', 'success');
      }

      if (currentState === 'failed' || currentState === 'disconnected') {
        setCallStatus('La conexión de la llamada se interrumpió.', 'error');
      }

      if (currentState === 'closed') {
        callState.active = false;
      }

      setCallButtons();
    };

    return peerConnection;
  };

  const flushPendingCandidates = async () => {
    if (!callState.peerConnection || !callState.remoteDescriptionReady) return;

    if (callState.pendingCandidates.length === 0) return;

    const queuedCandidates = [...callState.pendingCandidates];
    callState.pendingCandidates = [];

    for (const candidate of queuedCandidates) {
      try {
        await callState.peerConnection.addIceCandidate(candidate);
      } catch {
        // Ignore invalid queued ICE candidates.
      }
    }
  };

  const ensureLocalStream = async () => {
    if (callState.localStream) {
      return callState.localStream;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('Tu navegador no soporta getUserMedia.');
    }

    const stream = await navigator.mediaDevices.getUserMedia(
      WEBRTC_MEDIA_CONSTRAINTS
    );

    callState.localStream = stream;

    if (hasCallUI) {
      localVideo.srcObject = stream;
      localVideo.muted = true;
      localVideo.volume = 0;
    }

    if (callState.peerConnection) {
      attachLocalTracks(callState.peerConnection, stream);
    }

    return stream;
  };

  const waitForSocketOpen = (socket, timeoutMs = 6000) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('No hay socket de señalización disponible.'));
        return;
      }

      if (socket.readyState === WebSocket.OPEN) {
        resolve(socket);
        return;
      }

      if (socket.readyState !== WebSocket.CONNECTING) {
        reject(new Error('No se pudo abrir el socket de señalización.'));
        return;
      }

      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error('La señalización tardó demasiado en conectar.'));
      }, timeoutMs);

      const onOpen = () => {
        cleanup();
        resolve(socket);
      };

      const onClose = () => {
        cleanup();
        reject(new Error('La señalización se cerró antes de conectar.'));
      };

      const onError = () => {
        cleanup();
        reject(new Error('La señalización reportó un error.'));
      };

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        socket.removeEventListener('open', onOpen);
        socket.removeEventListener('close', onClose);
        socket.removeEventListener('error', onError);
      };

      socket.addEventListener('open', onOpen);
      socket.addEventListener('close', onClose);
      socket.addEventListener('error', onError);
    });
  };

  const handleSignalMessage = async (data = {}) => {
    if (!hasCallUI || !data || typeof data !== 'object') return;

    const signalType = String(data.type || '').trim().toLowerCase();
    if (!signalType) return;

    try {
      if (signalType === 'offer' && data.sdp) {
        setCallPanelVisible(true);
        setCallStatus('Recibiendo llamada...', 'muted');

        await ensureLocalStream();
        const peerConnection = createPeerConnection();

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.sdp)
        );

        callState.remoteDescriptionReady = true;
        await flushPendingCandidates();

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        sendSignalMessage({ type: 'answer', sdp: answer });
        callState.active = true;
        setCallStatus('Respuesta enviada. Conectando llamada...', 'muted');
        setCallButtons();
        return;
      }

      if (signalType === 'answer' && data.sdp) {
        if (!callState.peerConnection) return;

        await callState.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.sdp)
        );

        callState.remoteDescriptionReady = true;
        await flushPendingCandidates();
        setCallStatus('Llamada aceptada. Estableciendo conexión...', 'muted');
        return;
      }

      if (signalType === 'candidate' && data.candidate) {
        const peerConnection = createPeerConnection();
        const candidate = new RTCIceCandidate(data.candidate);

        if (callState.remoteDescriptionReady && peerConnection.remoteDescription) {
          await peerConnection.addIceCandidate(candidate);
        } else {
          callState.pendingCandidates.push(candidate);
        }
        return;
      }

      if (signalType === 'hang-up') {
        closeCallSession({
          notifyHangUp: false,
          closeSignal: false,
          keepStatus: true,
        });
        setCallStatus('La otra persona finalizó la llamada.', 'muted');
      }
    } catch (error) {
      setCallStatus(
        error?.message || 'No fue posible procesar la señal de llamada.',
        'error'
      );
    }
  };

  const ensureSignalSocket = async (roomId) => {
    if (!hasCallUI) return null;

    const normalizedRoomId = String(roomId || '').trim();
    if (!normalizedRoomId) return null;

    if (callState.signalSocket && callState.roomId === normalizedRoomId) {
      if (callState.signalSocket.readyState === WebSocket.OPEN) {
        return callState.signalSocket;
      }

      if (callState.signalSocket.readyState === WebSocket.CONNECTING) {
        await waitForSocketOpen(callState.signalSocket);
        return callState.signalSocket;
      }
    }

    closeCallSession({
      notifyHangUp: false,
      closeSignal: true,
      keepStatus: true,
    });

    const wsUrl = buildSignalSocketUrl(normalizedRoomId);
    const signalSocket = new WebSocket(wsUrl);

    callState.signalSocket = signalSocket;
    callState.signalClosing = false;
    callState.roomId = normalizedRoomId;

    signalSocket.onmessage = async (event) => {
      if (disposed || callState.signalSocket !== signalSocket) return;

      try {
        const signalData = JSON.parse(event.data);
        await handleSignalMessage(signalData);
      } catch {
        // Ignore malformed signaling payloads.
      }
    };

    signalSocket.onerror = () => {
      if (disposed || callState.signalSocket !== signalSocket) return;
      setCallStatus('La señalización de llamada reportó un error.', 'error');
    };

    signalSocket.onclose = async (event) => {
      if (callState.signalSocket === signalSocket) {
        callState.signalSocket = null;
      }

      if (callState.signalClosing) {
        callState.signalClosing = false;
        setCallButtons();
        return;
      }

      if (event?.code === 4001) {
        setCallStatus('Token inválido para señalización.', 'error');
        window.alert('Token inválido');
        return;
      }

      if (event?.code === 4002) {
        setCallStatus('No se puede abrir llamada: sala llena.', 'error');
        window.alert('Sala llena');
        return;
      }

      setCallStatus('Se perdió la señalización de la llamada.', 'error');
      closeCallSession({
        notifyHangUp: false,
        closeSignal: false,
        keepStatus: true,
      });
      setCallButtons();
    };

    setCallPanelVisible(true);
    setCallStatus(`Conectando señalización de sala ${normalizedRoomId}...`, 'muted');
    await waitForSocketOpen(signalSocket);
    if (disposed || callState.signalSocket !== signalSocket) {
      return null;
    }

    setCallStatus(`Señalización lista en sala ${normalizedRoomId}.`, 'muted');
    setCallButtons();

    return signalSocket;
  };

  const startCall = async () => {
    if (!hasCallUI) return;

    if (!state.activeRoomId) {
      setCallStatus('Abre una sala antes de iniciar llamada.', 'error');
      return;
    }

    try {
      setCallPanelVisible(true);
      await ensureSignalSocket(state.activeRoomId);
      await ensureLocalStream();

      const peerConnection = createPeerConnection();
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      sendSignalMessage({ type: 'offer', sdp: offer });
      callState.active = true;
      setCallStatus('Llamando... esperando respuesta.', 'muted');
      setCallButtons();
    } catch (error) {
      setCallStatus(
        error?.message || 'No se pudo iniciar la videollamada.',
        'error'
      );
    }
  };

  const hangUpCall = () => {
    if (!hasCallUI) return;

    closeCallSession({
      notifyHangUp: true,
      closeSignal: false,
      keepStatus: true,
    });
    setCallStatus('Llamada finalizada.', 'muted');
  };

  if (hasCallUI) {
    setCallPanelVisible(false);
    setCallButtons();
  }

  const renderNotificationsBadge = () => {
    if (!hasNotificationUI) return;

    const unreadCount = CHAT_NOTIFICATION_STORE.unreadCount;
    notificationsBadge.hidden = unreadCount <= 0;
    notificationsBadge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
  };

  const renderNotificationsList = () => {
    if (!hasNotificationUI) return;

    notificationsList.innerHTML = '';
    const visibleItems = CHAT_NOTIFICATION_STORE.items.slice(0, 8);
    notificationsEmpty.hidden = visibleItems.length > 0;

    visibleItems.forEach((item) => {
      const notificationItem = document.createElement('li');
      notificationItem.className = 'notifications-item';

      const title = document.createElement('p');
      title.className = 'notifications-item-title';
      title.textContent = item.title;

      const detail = document.createElement('p');
      detail.className = 'notifications-item-detail';
      detail.textContent = item.body;

      const time = document.createElement('span');
      time.className = 'notifications-item-time';
      time.textContent = item.timeLabel;

      notificationItem.appendChild(title);
      notificationItem.appendChild(detail);
      notificationItem.appendChild(time);
      notificationsList.appendChild(notificationItem);
    });
  };

  const setNotificationsOpen = (open) => {
    if (!hasNotificationUI) return;

    notificationsOpen = open;
    notificationsPanel.hidden = !open;
    notificationsButton.setAttribute('aria-expanded', open ? 'true' : 'false');

    if (open && CHAT_NOTIFICATION_STORE.unreadCount > 0) {
      CHAT_NOTIFICATION_STORE.unreadCount = 0;
      renderNotificationsBadge();
    }
  };

  const requestBrowserNotificationsPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    if (Notification.permission === 'default') {
      try {
        return await Notification.requestPermission();
      } catch {
        return 'denied';
      }
    }

    return Notification.permission;
  };

  const showBrowserNotification = (item) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const browserNotification = new Notification(item.title, {
        body: item.body,
        tag: item.roomId ? `chat-room-${item.roomId}` : 'chat-general',
      });

      window.setTimeout(() => {
        browserNotification.close();
      }, 4500);
    } catch {
      // Ignore browser notification errors.
    }
  };

  const showToastNotification = (item) => {
    if (!hasNotificationUI) return;

    const toast = document.createElement('article');
    toast.className = 'notification-toast';

    const title = document.createElement('h4');
    title.textContent = item.title;

    const detail = document.createElement('p');
    detail.textContent = item.body;

    const time = document.createElement('span');
    time.className = 'notification-toast-time';
    time.textContent = item.timeLabel;

    toast.appendChild(title);
    toast.appendChild(detail);
    toast.appendChild(time);

    notificationsToastStack.prepend(toast);

    window.setTimeout(() => {
      toast.classList.add('is-leaving');
      window.setTimeout(() => {
        toast.remove();
      }, 220);
    }, 4500);
  };

  const pushIncomingMessageNotification = ({ senderName, message, roomId }) => {
    if (!hasNotificationUI) return;

    const sender = String(senderName || 'Tu match').trim() || 'Tu match';
    const messageText = String(message || '').trim();
    const body = messageText
      ? `${sender}: ${messageText}`
      : `${sender} te envió un mensaje nuevo.`;

    const notification = {
      id: CHAT_NOTIFICATION_STORE.nextId,
      title: 'Nuevo mensaje',
      body,
      roomId: roomId ? String(roomId) : null,
      timeLabel: formatNotificationTime(new Date()),
    };

    CHAT_NOTIFICATION_STORE.nextId += 1;
    CHAT_NOTIFICATION_STORE.items.unshift(notification);
    CHAT_NOTIFICATION_STORE.items = CHAT_NOTIFICATION_STORE.items.slice(
      0,
      MAX_CHAT_NOTIFICATIONS
    );
    if (notificationsOpen) {
      CHAT_NOTIFICATION_STORE.unreadCount = 0;
    } else {
      CHAT_NOTIFICATION_STORE.unreadCount += 1;
    }

    renderNotificationsList();
    renderNotificationsBadge();
    showToastNotification(notification);

    if (document.visibilityState !== 'visible') {
      showBrowserNotification(notification);
    }
  };

  if (hasNotificationUI) {
    renderNotificationsList();
    renderNotificationsBadge();
  }

  const cleanupFeedActions = () => {
    feedActionCleanups.forEach((cleanup) => cleanup());
    feedActionCleanups = [];
  };

  const renderFeedCarousels = () => {
    if (!hasFeedCarousel) return;

    cleanupFeedActions();
    feedCarouselControlsCleanup();
    feedCarouselControlsCleanup = () => {};

    if (feedQueue.length === 0) {
      feedCategoriesRoot.innerHTML = renderFeedEmptyState();
      return;
    }

    feedCategoriesRoot.innerHTML = renderFeedCategoryBoard(feedQueue);
    feedCarouselControlsCleanup = setupSwapsCarousels();

    feedCategoriesRoot.querySelectorAll('.feed-card-avatar').forEach((avatar) => {
      const onAvatarError = () => {
        avatar.src = DEFAULT_MATCH_AVATAR;
      };

      avatar.addEventListener('error', onAvatarError);
      feedActionCleanups.push(() => {
        avatar.removeEventListener('error', onAvatarError);
      });
    });

    feedQueue.forEach((profile) => {
      const profileId = getFeedProfileId(profile);
      if (!profileId) return;

      resolveAvatarForEntity(profile, avatarCache).then((resolvedAvatar) => {
        if (disposed) return;

        const avatar = feedCategoriesRoot.querySelector(
          `[data-feed-avatar-id="${profileId}"]`
        );
        if (avatar) {
          avatar.src = resolvedAvatar;
        }
      });
    });

    feedCategoriesRoot.querySelectorAll('.feed-swipe-btn').forEach((button) => {
      const action = button.getAttribute('data-action');
      const userToId = button.getAttribute('data-user-id');

      const onSwipe = () => {
        if (!action || !userToId) return;
        registerSwipe(action, userToId);
      };

      button.addEventListener('click', onSwipe);
      feedActionCleanups.push(() => {
        button.removeEventListener('click', onSwipe);
      });
    });

    setFeedButtonsDisabled(swipeInProgress);
  };

  const cleanupRows = () => {
    if (!hasChatPanel) return;

    rowCleanups.forEach((cleanup) => cleanup());
    rowCleanups = [];
    matchesList.innerHTML = '';
  };

  const closeSocket = () => {
    if (!state.socket) return;
    try {
      state.socket.close();
    } catch {
      // Ignore close errors when switching rooms.
    }
    state.socket = null;
  };

  const showChat = (show) => {
    if (!hasChatPanel) return;

    chatContainer.hidden = !show;
    chatEmptyState.hidden = show;
  };

  const markActiveMatch = (roomId) => {
    if (!hasChatPanel) return;

    document.querySelectorAll('.match-item').forEach((item) => {
      const isActive = item.getAttribute('data-room-id') === String(roomId);
      item.classList.toggle('is-active', isActive);
    });
  };

  const isChatSocketOpen = () => {
    return Boolean(state.socket) && state.socket.readyState === WebSocket.OPEN;
  };

  const paintMessage = (msg = {}) => {
    if (!hasChatPanel) return;

    const normalizedMessage = normalizeIncomingChatMessage(msg);
    const text = getChatMessageText(normalizedMessage);
    const mediaSource = getChatMediaSource(normalizedMessage);
    const messageType = resolveChatMessageType(normalizedMessage);
    if (!text && !mediaSource && messageType !== 'image' && messageType !== 'audio') {
      return;
    }

    const aiMessage = isAiMessage(normalizedMessage);
    const senderId =
      normalizedMessage.user_id !== undefined ? String(normalizedMessage.user_id) : '';
    const isMine = !aiMessage && state.userId !== null && senderId === state.userId;
    const senderName = String(normalizedMessage.username || '').trim();

    const historyEmpty = chatMessages.querySelector('.chat-history-empty');
    if (historyEmpty) {
      historyEmpty.remove();
    }

    const bubble = document.createElement('div');
    bubble.className = `chat-message ${
      aiMessage ? 'mensaje-ai' : isMine ? 'mensaje-mio' : 'mensaje-otro'
    }`;

    if (aiMessage) {
      if (!text) return;

      const aiLabel = document.createElement('span');
      aiLabel.className = 'chat-ai-label';
      aiLabel.textContent = senderName || 'Asistente IA';

      const aiText = document.createElement('span');
      aiText.className = 'chat-ai-text';
      aiText.textContent = text;

      bubble.append(aiLabel, aiText);
    } else if (messageType === 'image') {
      const mediaUrl = normalizeChatMediaUrl(mediaSource || text);
      if (mediaUrl) {
        const image = document.createElement('img');
        image.className = 'chat-media-image';
        image.src = mediaUrl;
        image.alt = 'Imagen compartida en el chat';
        image.loading = 'lazy';
        bubble.classList.add('chat-message-media');
        bubble.appendChild(image);
      } else {
        bubble.textContent = text || 'Imagen no disponible.';
      }
    } else if (messageType === 'audio') {
      const mediaUrl = normalizeChatMediaUrl(mediaSource || text);
      if (mediaUrl) {
        const audio = document.createElement('audio');
        audio.className = 'chat-media-audio';
        audio.src = mediaUrl;
        audio.controls = true;
        audio.preload = 'metadata';
        bubble.classList.add('chat-message-media');
        bubble.appendChild(audio);
      } else {
        bubble.textContent = text || 'Audio no disponible.';
      }
    } else {
      if (!text) return;
      bubble.textContent = text;
    }

    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const sendMessage = () => {
    if (!hasChatPanel) return;

    if (mediaUploadInProgress) {
      chatRoomHelper.textContent =
        'Espera a que termine la subida del archivo antes de enviar otro mensaje.';
      return;
    }

    if (audioRecordingInProgress) {
      chatRoomHelper.textContent =
        'Detén la grabación para poder enviar un mensaje de texto.';
      return;
    }

    const text = chatInput.value.trim();
    if (!text) return;

    if (!isChatSocketOpen()) {
      chatRoomHelper.textContent = 'La sala no está conectada todavía.';
      return;
    }

    const payload = {
      message: text,
    };

    state.socket.send(JSON.stringify(payload));
    chatInput.value = '';
  };

  const uploadAndSendChatFile = async (file) => {
    if (!hasChatPanel || !file || mediaUploadInProgress) return;

    if (!state.activeRoomId) {
      chatRoomHelper.textContent = 'Abre una conversación para enviar archivos.';
      return;
    }

    if (!isChatSocketOpen()) {
      chatRoomHelper.textContent = 'La sala no está conectada todavía.';
      return;
    }

    const detectedType = detectChatUploadFileType(file);
    if (!detectedType) {
      chatRoomHelper.textContent =
        'Archivo no permitido. Usa jpg, png, gif, webp, mp3, ogg, wav o webm.';
      return;
    }

    if (file.size > CHAT_UPLOAD_MAX_BYTES) {
      chatRoomHelper.textContent = 'El archivo supera el maximo permitido de 10 MB.';
      return;
    }

    mediaUploadInProgress = true;
    setChatComposerBusy(true);
    chatRoomHelper.textContent = 'Subiendo archivo al servidor...';

    try {
      const uploadResponse = await uploadChatMedia(file);
      if (disposed) return;

      const uploadedUrl = normalizeChatMediaUrl(
        uploadResponse?.url || uploadResponse?.data?.url || ''
      );
      const serverType = normalizeChatMessageType(
        uploadResponse?.type || uploadResponse?.data?.type
      );
      const resolvedType = serverType || detectedType;

      if (!uploadedUrl) {
        throw new Error('No se recibio la URL del archivo subido.');
      }

      if (resolvedType !== 'image' && resolvedType !== 'audio') {
        throw new Error('El servidor devolvio un tipo de archivo no soportado.');
      }

      if (!isChatSocketOpen()) {
        throw new Error('La sala se desconecto antes de enviar el archivo.');
      }

      state.socket.send(
        JSON.stringify({
          message: uploadedUrl,
          type: resolvedType,
        })
      );

      chatRoomHelper.textContent =
        resolvedType === 'image'
          ? 'Imagen enviada correctamente.'
          : 'Audio enviado correctamente.';
    } catch (error) {
      chatRoomHelper.textContent = error?.message || 'No fue posible subir el archivo.';
    } finally {
      mediaUploadInProgress = false;
      setChatComposerBusy(false);

      if (hasMediaUploadUI) {
        chatFileInput.value = '';
      }
    }
  };

  const clearChat = () => {
    if (!hasChatPanel) return;

    cancelAudioRecording();

    closeCallSession({
      notifyHangUp: callState.active,
      closeSignal: true,
      keepStatus: true,
    });

    state.activeRoomId = null;
    activeMatch = null;
    mediaUploadInProgress = false;
    closeSocket();
    markActiveMatch(null);
    showChat(false);
    chatMessages.innerHTML = '';
    chatHeader.textContent = 'Chat';
    chatRoomHelper.textContent = 'Selecciona una conversación para empezar.';
    setFinishSwapButtonState(null);
    setChatComposerBusy(false);

    if (hasMediaUploadUI) {
      chatFileInput.value = '';
    }

    if (hasCallUI) {
      setCallPanelVisible(false);
      setCallStatus('Listo para iniciar llamada.', 'muted');
      setCallButtons();
    }
  };

  const finishSelectedMatch = async (match, options = {}) => {
    if (!hasChatPanel || !match || finishingSwapInProgress) return;

    const { closeCurrentChat = false } = options;
    const matchId = getMatchId(match);
    const roomId = getMatchRoomId(match);

    if (!matchId) {
      setMatchesStatus('No se encontró el ID del match para finalizar.', 'error');
      return;
    }

    if (isMatchCompleted(match)) {
      setMatchesStatus(`El match #${matchId} ya está finalizado.`, 'muted');
      return;
    }

    const shouldFinish = window.confirm(
      '¿Estás seguro que deseas finalizar esta sesión de aprendizaje? Ambos recibirán puntos.'
    );

    if (!shouldFinish) return;

    finishingSwapInProgress = true;
    setFinishSwapButtonState(activeMatch);

    try {
      const response = await finishMatch(matchId);
      if (disposed) return;

      const successMessage =
        response?.msg ||
        response?.message ||
        response?.detail ||
        'El match se finalizó correctamente.';
      const awardedPoints = resolveAwardedPointsFromFinishPayload(response);
      const updatedPoints = resolveUpdatedPointsFromFinishPayload(response);

      if (updatedPoints !== null) {
        updateCurrentUserPoints(updatedPoints);
      }

      if (roomId) {
        closeSwapRoom(roomId);
      }

      if (activeMatch && String(getMatchId(activeMatch)) === String(matchId)) {
        activeMatch = {
          ...activeMatch,
          is_completed: true,
          completed: true,
        };
      }

      const pointsSummary =
        awardedPoints !== null
          ? ` Puntos ganados: ${awardedPoints}.`
          : updatedPoints !== null
          ? ` Tus puntos actuales: ${updatedPoints}.`
          : '';

      setMatchesStatus(`${successMessage}${pointsSummary}`, 'success');
      window.alert(`${successMessage}${pointsSummary}`);

      if (closeCurrentChat) {
        clearChat();
      }

      await loadMatches();
    } catch (error) {
      if (disposed) return;

      const errorMessage = error?.message || 'No se pudo finalizar el match.';
      setMatchesStatus(errorMessage, 'error');
      window.alert(`Error: ${errorMessage}`);
    } finally {
      finishingSwapInProgress = false;
      setFinishSwapButtonState(activeMatch);
    }
  };

  const openChat = async (match) => {
    if (!hasChatPanel) return;

    const roomId = getMatchRoomId(match);
    if (!roomId) {
      chatRoomHelper.textContent = 'Este match todavía no tiene sala disponible.';
      return;
    }

    cancelAudioRecording();

    if (callState.roomId && callState.roomId !== String(roomId)) {
      closeCallSession({
        notifyHangUp: callState.active,
        closeSignal: true,
        keepStatus: true,
      });
    }

    state.activeRoomId = roomId;
    activeMatch = match;
    setFinishSwapButtonState(activeMatch);
    latestHistoryRequest += 1;
    const historyRequestId = latestHistoryRequest;

    closeSocket();
    markActiveMatch(roomId);
    showChat(true);
    chatMessages.innerHTML = '';
    mediaUploadInProgress = false;
    setChatComposerBusy(false);

    if (hasMediaUploadUI) {
      chatFileInput.value = '';
    }

    if (hasCallUI) {
      setCallPanelVisible(true);
      setCallStatus('Preparando señalización de llamada...', 'muted');
      setCallButtons();
      try {
        await ensureSignalSocket(roomId);
      } catch (error) {
        setCallStatus(
          error?.message || 'No se pudo conectar la señalización de llamada.',
          'error'
        );
      }
    }

    const fullName = [match.first_name, match.last_name].filter(Boolean).join(' ');
    const matchId = getMatchId(match);
    chatHeader.textContent = `Chat con ${fullName || 'tu match'}`;
    chatRoomHelper.textContent = matchId
      ? `Cargando historial del match #${matchId} en sala ${roomId}...`
      : `Cargando historial de la sala ${roomId}...`;

    try {
      const historyPayload = await getMessages(roomId);
      if (
        disposed ||
        historyRequestId !== latestHistoryRequest ||
        state.activeRoomId !== String(roomId)
      ) {
        return;
      }

      const history = normalizeMessagesPayload(historyPayload);
      if (history.length === 0) {
        const emptyHistory = document.createElement('p');
        emptyHistory.className = 'chat-history-empty';
        emptyHistory.textContent = 'Aún no hay mensajes en esta sala. Inicia la conversación.';
        chatMessages.appendChild(emptyHistory);
      } else {
        history.forEach((message) => {
          paintMessage(normalizeIncomingChatMessage(message));
        });
      }
    } catch (error) {
      chatRoomHelper.textContent =
        error?.message || 'No fue posible cargar el historial de mensajes.';
    }

    const wsUrl = buildChatSocketUrl(roomId);

    try {
      const socket = new WebSocket(wsUrl);
      state.socket = socket;
      chatRoomHelper.textContent = 'Conectando al chat en tiempo real...';

      socket.onopen = () => {
        if (disposed || state.socket !== socket) return;
        chatRoomHelper.textContent = `Conectado a la sala ${roomId}.`;
      };

      socket.onmessage = (event) => {
        if (disposed || state.socket !== socket) return;

        try {
          const message = normalizeIncomingChatMessage(JSON.parse(event.data));
          if (isSignalingMessageType(message?.type)) return;

          const aiMessage = isAiMessage(message);
          const senderId =
            message?.user_id !== undefined ? String(message.user_id) : null;
          const isMine = !aiMessage && state.userId !== null && senderId === String(state.userId);

          paintMessage(message);

          if (!isMine) {
            const senderName = String(message?.username || '').trim();
            pushIncomingMessageNotification({
              senderName: aiMessage
                ? senderName || 'Asistente IA'
                : fullName || senderName || 'Tu match',
              message: buildChatNotificationPreview(message),
              roomId,
            });
          }
        } catch {
          // Ignore malformed websocket events.
        }
      };

      socket.onerror = () => {
        if (disposed || state.socket !== socket) return;
        chatRoomHelper.textContent =
          'La conexión del chat tuvo un problema. Reintenta abrir la sala.';
      };

      socket.onclose = async (event) => {
        if (disposed || state.socket !== socket) return;

        if (event?.code === 4001) {
          state.socket = null;
          closeCallSession({
            notifyHangUp: false,
            closeSignal: true,
            keepStatus: true,
          });
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
          localStorage.removeItem('currentUser');
          localStorage.removeItem('user_id');
          localStorage.removeItem('role');
          localStorage.removeItem('pendingOnboarding');
          const { LoginPage } = await import('../login.js');
          LoginPage('login');
          return;
        }

        state.socket = null;
        chatRoomHelper.textContent = 'Chat desconectado.';
      };
    } catch {
      chatRoomHelper.textContent = 'No se pudo abrir la conexión en tiempo real.';
    }
  };

  const loadMatches = async () => {
    if (!hasChatPanel) return;

    latestMatchesRequest += 1;
    const requestId = latestMatchesRequest;

    cleanupRows();

    setMatchesStatus('Cargando tus matches...', 'muted');

    try {
      const payload = await getMatches();
      if (disposed || requestId !== latestMatchesRequest) return;

      const allMatches = normalizeMatchesPayload(payload);
      const matches = allMatches.filter((match) => {
        const roomId = getMatchRoomId(match);
        if (isClosedSwapRoom(roomId)) return false;
        return !isMatchCompleted(match);
      });

      if (matches.length === 0) {
        const noActiveSwaps = allMatches.length > 0;
        setMatchesStatus(
          noActiveSwaps
            ? 'No tienes swaps activos. Los swaps cerrados no se muestran aquí.'
            : 'Aún no tienes matches disponibles.',
          'muted'
        );

        const emptyMatches = document.createElement('p');
        emptyMatches.className = 'matches-empty-state';
        emptyMatches.textContent = noActiveSwaps
          ? 'Cuando recibas nuevas coincidencias, aparecerán aquí para iniciar chat.'
          : 'Cuando haya coincidencias nuevas, aparecerán aquí para iniciar chat.';
        matchesList.appendChild(emptyMatches);

        if (state.activeRoomId) {
          clearChat();
        }

        return;
      }

      setMatchesStatus(
        `${matches.length} ${matches.length === 1 ? 'match cargado' : 'matches cargados'}.`,
        'success'
      );

      matches.forEach((match) => {
        const roomId = getMatchRoomId(match);
        const matchId = getMatchId(match);
        const fullName = [match?.first_name, match?.last_name]
          .filter(Boolean)
          .join(' ')
          .trim();

        const wrapper = document.createElement('article');
        wrapper.className = 'match-item';
        if (roomId) {
          wrapper.setAttribute('data-room-id', roomId);
        }

        const avatar = document.createElement('img');
        avatar.src = getMatchAvatar(match);
        avatar.alt = `Avatar de ${fullName || 'usuario'}`;
        avatar.loading = 'lazy';

        resolveAvatarForEntity(match, avatarCache).then((resolvedAvatar) => {
          if (disposed) return;
          avatar.src = resolvedAvatar;
        });

        const profile = document.createElement('div');
        profile.className = 'match-user-data';

        const name = document.createElement('span');
        name.className = 'match-name';
        name.textContent = fullName || 'Usuario Learning Swap';

        const room = document.createElement('span');
        room.className = 'match-room';
        room.textContent = [
          matchId ? `Match #${matchId}` : 'Match sin ID',
          roomId ? `Sala #${roomId}` : 'Sala no disponible',
        ].join(' • ');

        const actions = document.createElement('div');
        actions.className = 'match-actions';

        const action = document.createElement('button');
        action.className = 'match-chat-btn';
        action.type = 'button';
        action.textContent = 'Chatear';
        action.disabled = !roomId;

        const finishAction = document.createElement('button');
        finishAction.className = 'match-finish-btn';
        finishAction.type = 'button';
        finishAction.textContent = 'Finalizar';
        finishAction.disabled = !matchId || finishingSwapInProgress;
        if (matchId) {
          finishAction.setAttribute('data-match-id', String(matchId));
        }

        profile.appendChild(name);
        profile.appendChild(room);
        wrapper.appendChild(avatar);
        wrapper.appendChild(profile);
        actions.appendChild(action);
        actions.appendChild(finishAction);
        wrapper.appendChild(actions);
        matchesList.appendChild(wrapper);

        const onAvatarError = () => {
          avatar.src = DEFAULT_MATCH_AVATAR;
        };

        const onOpenChat = () => {
          openChat(match);
        };

        const onFinishMatch = async () => {
          await finishSelectedMatch(match, {
            closeCurrentChat:
              Boolean(state.activeRoomId) &&
              Boolean(roomId) &&
              String(state.activeRoomId) === String(roomId),
          });
        };

        avatar.addEventListener('error', onAvatarError);
        action.addEventListener('click', onOpenChat);
        finishAction.addEventListener('click', onFinishMatch);

        rowCleanups.push(() => {
          avatar.removeEventListener('error', onAvatarError);
          action.removeEventListener('click', onOpenChat);
          finishAction.removeEventListener('click', onFinishMatch);
        });
      });

      if (state.activeRoomId) {
        const activeMatchStillVisible = matches.some((match) => {
          return String(getMatchRoomId(match)) === String(state.activeRoomId);
        });

        if (!activeMatchStillVisible) {
          clearChat();
        }
      }

      setFinishSwapButtonState(activeMatch);

      if (options.autoOpenFirstMatch && !autoOpenDone && !state.activeRoomId) {
        const firstRoomMatch = matches.find((match) => {
          return Boolean(getMatchRoomId(match));
        });

        if (firstRoomMatch) {
          autoOpenDone = true;
          openChat(firstRoomMatch);
        }
      }
    } catch (error) {
      if (disposed || requestId !== latestMatchesRequest) return;

      setMatchesStatus(error?.message || 'No se pudieron cargar los matches.', 'error');
    }
  };

  const loadFeed = async () => {
    if (!hasFeedCarousel) return;

    setFeedStatus('Cargando perfiles sugeridos...', 'muted');

    try {
      const payload = await getFeed();
      if (disposed) return;

      const feedProfiles = normalizeFeedPayload(payload).filter((profile) => {
        const candidateId = getFeedProfileId(profile);
        if (!candidateId) return false;

        return String(candidateId) !== String(state.userId);
      });

      feedQueue = feedProfiles;

      if (feedQueue.length === 0) {
        setFeedStatus('No hay perfiles disponibles en tu feed por ahora.', 'muted');
        renderFeedCarousels();
        return;
      }

      renderFeedCarousels();
      const categorizedGroups = groupFeedProfilesByCategory(feedQueue);
      setFeedStatus(
        `${feedQueue.length} perfiles en ${categorizedGroups.length} ${
          categorizedGroups.length === 1 ? 'carrusel filtrado' : 'carruseles filtrados'
        }.`,
        'success'
      );
    } catch (error) {
      if (disposed) return;

      setFeedStatus(error?.message || 'No se pudo cargar el feed de perfiles.', 'error');
      feedQueue = [];
      renderFeedCarousels();
    }
  };

  const registerSwipe = async (action, selectedUserToId = null) => {
    if (!hasFeedCarousel || swipeInProgress) return;
    if (action !== 'like' && action !== 'pass') return;

    const profile = selectedUserToId
      ? feedQueue.find(
          (candidate) =>
            String(getFeedProfileId(candidate)) === String(selectedUserToId)
        )
      : feedQueue[0];
    const userToId = getFeedProfileId(profile);

    if (!profile || !userToId) {
      setFeedStatus('No hay perfil disponible para registrar swipe.', 'error');
      return;
    }

    swipeInProgress = true;
    setFeedButtonsDisabled(true);
    setFeedStatus(action === 'like' ? 'Enviando like...' : 'Enviando pass...', 'muted');

    try {
      const response = await sendSwipe(userToId, action);
      if (disposed) return;

      const createdMatch = isMatchCreated(response);

      if (action === 'like' && createdMatch) {
        setFeedStatus('Nuevo match creado. Ya puedes abrir el chat.', 'success');
      } else if (action === 'like') {
        setFeedStatus(
          response?.message ||
            'Like enviado. El match se crea cuando la otra persona también da like.',
          'muted'
        );
      } else {
        setFeedStatus(
          response?.message || 'Pass enviado. Mostrando siguiente perfil...',
          'muted'
        );
      }

      feedQueue = feedQueue.filter((candidate) => {
        return String(getFeedProfileId(candidate)) !== String(userToId);
      });

      renderFeedCarousels();

      if (feedQueue.length === 0) {
        setFeedStatus('No hay más perfiles en el feed. Usa actualizar feed.', 'muted');
      }

      if (action === 'like' && hasChatPanel) {
        await loadMatches();
      }
    } catch (error) {
      if (disposed) return;

      if (action === 'pass') {
        feedQueue = feedQueue.filter((candidate) => {
          return String(getFeedProfileId(candidate)) !== String(userToId);
        });

        renderFeedCarousels();

        const hasMoreProfiles = feedQueue.length > 0;
        setFeedStatus(
          hasMoreProfiles
            ? 'Pass aplicado localmente. El backend reportó un error temporal; puedes seguir.'
            : 'Pass aplicado localmente. No hay más perfiles en el feed por ahora.',
          'muted'
        );

        return;
      }

      setFeedStatus(error?.message || 'No se pudo registrar el swipe.', 'error');
    } finally {
      swipeInProgress = false;
      setFeedButtonsDisabled(false);
    }
  };

  const onRefreshMatches = () => {
    loadMatches();
  };

  const onRefreshFeed = () => {
    loadFeed();
  };

  const onChatSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const onChatFileButtonClick = () => {
    if (!hasMediaUploadUI || mediaUploadInProgress || audioRecordingInProgress) return;

    if (!state.activeRoomId) {
      chatRoomHelper.textContent = 'Abre una conversación para enviar archivos.';
      return;
    }

    chatFileInput.click();
  };

  const onChatFileSelected = async (event) => {
    if (!hasMediaUploadUI) return;

    const selectedFile = event?.target?.files?.[0];
    if (!selectedFile) return;

    await uploadAndSendChatFile(selectedFile);
  };

  const onRecordAudioClick = async () => {
    if (!hasAudioRecorderUI || mediaUploadInProgress) return;

    if (audioRecordingInProgress) {
      stopAudioRecording({ shouldUpload: true });
      return;
    }

    await startAudioRecording();
  };

  const onCloseChat = () => {
    clearChat();
  };

  const onStartCall = async () => {
    await startCall();
  };

  const onHangupCall = () => {
    hangUpCall();
  };

  const onFinishSwap = async () => {
    if (!hasChatPanel) return;

    if (!state.activeRoomId || !activeMatch) {
      chatRoomHelper.textContent = 'Abre una conversación para cerrar el swap.';
      return;
    }

    await finishSelectedMatch(activeMatch, { closeCurrentChat: true });
  };

  const onNotificationsToggle = () => {
    const nextState = !notificationsOpen;
    setNotificationsOpen(nextState);

    if (nextState) {
      requestBrowserNotificationsPermission();
    }
  };

  const onNotificationsOutsideClick = (event) => {
    if (!hasNotificationUI || !notificationsOpen) return;

    if (
      notificationsPanel.contains(event.target) ||
      notificationsButton.contains(event.target)
    ) {
      return;
    }

    setNotificationsOpen(false);
  };

  const onNotificationsEsc = (event) => {
    if (!hasNotificationUI) return;
    if (event.key !== 'Escape' || !notificationsOpen) return;
    setNotificationsOpen(false);
  };

  if (hasChatPanel) {
    refreshMatchesButton.addEventListener('click', onRefreshMatches);
    chatForm.addEventListener('submit', onChatSubmit);
    closeChatButton.addEventListener('click', onCloseChat);
    finishSwapButton.addEventListener('click', onFinishSwap);

    if (hasMediaUploadUI) {
      chatFileButton.addEventListener('click', onChatFileButtonClick);
      chatFileInput.addEventListener('change', onChatFileSelected);
    }

    if (hasAudioRecorderUI) {
      chatRecordButton.addEventListener('click', onRecordAudioClick);
    }

    if (hasCallUI) {
      callStartButton.addEventListener('click', onStartCall);
      callHangupButton.addEventListener('click', onHangupCall);
    }
  }

  if (hasNotificationUI) {
    notificationsButton.addEventListener('click', onNotificationsToggle);
    document.addEventListener('click', onNotificationsOutsideClick);
    document.addEventListener('keydown', onNotificationsEsc);
  }

  if (hasFeedCarousel) {
    refreshFeedButton.addEventListener('click', onRefreshFeed);

    cleanups.push(() => {
      refreshFeedButton.removeEventListener('click', onRefreshFeed);
    });
  }

  cleanups.push(() => {
    if (hasChatPanel) {
      cancelAudioRecording();
      refreshMatchesButton.removeEventListener('click', onRefreshMatches);
      chatForm.removeEventListener('submit', onChatSubmit);
      closeChatButton.removeEventListener('click', onCloseChat);
      finishSwapButton.removeEventListener('click', onFinishSwap);

      if (hasMediaUploadUI) {
        chatFileButton.removeEventListener('click', onChatFileButtonClick);
        chatFileInput.removeEventListener('change', onChatFileSelected);
      }

      if (hasAudioRecorderUI) {
        chatRecordButton.removeEventListener('click', onRecordAudioClick);
      }

      if (hasCallUI) {
        callStartButton.removeEventListener('click', onStartCall);
        callHangupButton.removeEventListener('click', onHangupCall);
      }
    }

    if (hasNotificationUI) {
      notificationsButton.removeEventListener('click', onNotificationsToggle);
      document.removeEventListener('click', onNotificationsOutsideClick);
      document.removeEventListener('keydown', onNotificationsEsc);
      setNotificationsOpen(false);
      notificationsToastStack.innerHTML = '';
    }
  });

  if (hasChatPanel) {
    setChatComposerBusy(false);
    setFinishSwapButtonState(null);
    loadMatches();
  }

  if (hasFeedCarousel) {
    loadFeed();
  }

  return () => {
    disposed = true;
    cleanupRows();
    cleanupFeedActions();
    feedCarouselControlsCleanup();
    cancelAudioRecording();
    closeCallSession({
      notifyHangUp: callState.active,
      closeSignal: true,
      keepStatus: true,
    });
    closeSocket();
    cleanups.forEach((cleanup) => cleanup());
  };
}
