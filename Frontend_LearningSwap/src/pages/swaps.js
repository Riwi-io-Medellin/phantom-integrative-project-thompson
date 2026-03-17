import { getCurrentUser, getCurrentUserId, isAuthenticated } from '../utils/auth.js';
import { renderFeedLoadingState } from './swaps/feed-render.js';
import { setupMatchesChat } from './swaps/matches-chat.js';
import { escapeHtml } from './swaps/ui-utils.js';

// ─── Main Page Entry Point ────────────────────────────────────────────────────
// SwapsPage is the main dashboard of the application.
// It renders two different views depending on the `view` parameter:
//   - 'matches' → shows the discovery feed with suggested profiles (swipe cards)
//   - 'chats'   → shows the conversations panel with real-time chat per match room

export async function SwapsPage(view = 'matches') {
  const app = document.getElementById('app');

  // ── Auth guard: unauthenticated users are sent back to the home page ──
  if (!isAuthenticated()) {
    const { HomePage } = await import('./home.js');
    HomePage();
    return;
  }

  // ── Cleanup listeners and state from any previously rendered view ──
  cleanupSwapView();

  // ── Page setup: apply body class, reset scroll, update browser history ──
  document.body.classList.remove('auth-page', 'register-mode', 'profile-page');
  document.body.classList.add('swaps-page');
  document.body.style.overflow = '';
  window.scrollTo({ top: 0, behavior: 'auto' });

  // ── Resolve current user data and determine which view to render ──
  const user = getCurrentUser();
  const currentUserId = getCurrentUserId();
  const isChatsView = view === 'chats';
  const profileLabel = user?.first_name || user?.name || 'Learning Swap';

  // Parse user points from profile data, defaulting to 0 if not available
  const rawUserPoints = Number.parseInt(user?.points ?? user?.puntos ?? 0, 10);
  const currentUserPoints = Number.isNaN(rawUserPoints) ? 0 : rawUserPoints;

  // Update the URL hash to reflect the current view without a full page reload
  window.history.replaceState(null, '', isChatsView ? '#chats' : '#swaps');

  // ─── Render HTML ──────────────────────────────────────────────────────────────
  // The layout follows a two-column dashboard pattern:
  //   - Left: fixed sidebar with navigation links and info card
  //   - Right: main content area with top bar and dynamic view content

  app.innerHTML = `
    <main class="swaps-dashboard">
      <div class="dashboard-container">

        <!-- ── Sidebar: logo, navigation menu, and info card ── -->
        <aside class="sidebar">
          <button class="logo logo-button" type="button" data-nav-home aria-label="Ir al inicio">
            <img class="logo-dashboard" src="/assets/logos/logo.png" alt="logo learning swap" />
            <h2>Learning Swap</h2>
          </button>

          <!-- Navigation links — each uses a data attribute for click delegation -->
          <nav class="nav-menu" aria-label="Navegación de Swap">
            <ul>
              <li>
                <button class="nav-menu-link" type="button" data-nav-home>
                  <ion-icon name="home-outline"></ion-icon>
                  <span>Home</span>
                </button>
              </li>
              <li>
                <button class="nav-menu-link" type="button" data-nav-profile>
                  <ion-icon name="person-circle-outline"></ion-icon>
                  <span>Profile</span>
                </button>
              </li>
              <li>
                <!-- Active state applied dynamically based on current view -->
                <button
                  class="nav-menu-link ${isChatsView ? 'is-active' : ''}"
                  type="button"
                  data-nav-chats
                  ${isChatsView ? 'aria-current="page"' : ''}
                >
                  <ion-icon name="chatbubbles-outline"></ion-icon>
                  <span>Chats</span>
                </button>
              </li>
              <li>
                <button
                  class="nav-menu-link ${!isChatsView ? 'is-active' : ''}"
                  type="button"
                  data-nav-matches
                  ${!isChatsView ? 'aria-current="page"' : ''}
                >
                  <ion-icon name="people-circle-outline"></ion-icon>
                  <span>Matches</span>
                </button>
              </li>
              <li>
                <!-- Link to the memberships page -->
                <button class="nav-menu-link" type="button" data-nav-memberships>
                  <ion-icon name="diamond-outline"></ion-icon>
                  <span>Membresías</span>
                </button>
              </li>
            </ul>
          </nav>

          <!-- Static informational card at the bottom of the sidebar -->
          <div class="card-information">
            <p>learning swap information</p>
            <p>
              Bienvenido/a al tablero principal de Learning Swap, aca podras
              descubrir a personas destacadas en lo que aman y podras compartir
              con ellas conocimientos y mucho mas.
            </p>
            <p>no esperes mas para empezar a conectarte con los demas.</p>
          </div>
        </aside>

        <!-- ── Main content: top bar + dynamic view body ── -->
        <section class="main-content">

          <!-- Top bar: search input, user points, notifications, profile access -->
          <header class="top-bar">
            <label class="search-bar" aria-label="search bar">
              <ion-icon name="search-outline"></ion-icon>
              <input type="text" placeholder="search..." />
            </label>

            <div class="user-actions">
              <span class="membership" aria-hidden="true"></span>

              <!-- Displays the user's current point balance -->
              <span class="user-points-chip" data-current-user-points-chip>
                ${currentUserPoints} pts
              </span>

              <button class="icon-action" type="button" aria-label="Idioma">
                <ion-icon name="earth-outline"></ion-icon>
              </button>

              <!-- Notifications bell: toggles the notification panel on click -->
              <button
                class="icon-action notifications-btn"
                type="button"
                data-notifications-toggle
                aria-label="Notificaciones"
                aria-expanded="false"
                aria-controls="notifications-panel"
              >
                <ion-icon name="notifications-outline"></ion-icon>
                <!-- Badge shows unread count, hidden when count is zero -->
                <span class="notifications-badge" data-notifications-badge hidden>
                  0
                </span>
              </button>

              <button class="icon-action" type="button" data-nav-profile aria-label="Ir al perfil">
                <ion-icon name="person-circle-outline"></ion-icon>
              </button>

              <!-- Displays the current user's first name -->
              <span class="user-chip">${escapeHtml(profileLabel)}</span>
            </div>

            <!-- Notifications dropdown panel — hidden by default, toggled via JS -->
            <section
              id="notifications-panel"
              class="notifications-panel"
              aria-label="Notificaciones recientes"
              hidden
            >
              <header class="notifications-panel-header">
                <h3>Notificaciones</h3>
              </header>
              <p id="notifications-empty" class="notifications-empty-state">
                Aún no tienes mensajes nuevos.
              </p>
              <ul id="notifications-list" class="notifications-list"></ul>
            </section>
          </header>

          <!-- ── Dashboard body: welcome banner + view-specific content ── -->
          <section class="dashboard-body">
            <div class="content-left">

              <!-- Welcome banner: message and CTA button change per view -->
              <div class="welcome-banner">
                <div>
                  <h2>
                    ${
                      isChatsView
                        ? '¡Hola!, bienvenido a tus conversaciones'
                        : '¡Hola!, bienvenido al tablero de matches'
                    }
                  </h2>
                  <p>
                    ${
                      isChatsView
                        ? `Bienvenido ${escapeHtml(profileLabel)}, aquí podrás continuar tus conversaciones y abrir nuevas salas de chat con tus matches.`
                        : `Bienvenido ${escapeHtml(profileLabel)}, aquí podrás descubrir personas y experiencias maravillosas haciendo match entre ellas. Tus conversaciones estarán siempre en la vista de chats.`
                    }
                  </p>
                </div>
                <!-- CTA button: navigates to plans (chats view) or chats (matches view) -->
                <button type="button" ${isChatsView ? 'data-nav-prices' : 'data-nav-chats'}>
                  ${isChatsView ? 'Planes' : 'Ir a chats'}
                </button>
              </div>

              ${
                isChatsView
                  ? `
                    <!-- ── Chats view: matches panel + chat window ── -->
                    <section class="matches-chat-section" aria-label="Mis matches y chat">

                      <!-- Left panel: list of active match conversations -->
                      <div class="matches-panel">
                        <div class="matches-panel-header">
                          <h3>Conversaciones</h3>
                          <button id="btn-refresh-matches" class="matches-refresh-btn" type="button">
                            Actualizar
                          </button>
                        </div>
                        <p class="matches-panel-helper">
                          Selecciona un chat para cargar historial y recibir mensajes nuevos en tiempo real.
                        </p>
                        <div id="matches-status" class="matches-status is-muted" role="status"></div>
                        <div id="matches-list" class="matches-list" aria-live="polite"></div>
                      </div>

                      <!-- Empty state: shown when no chat room is selected -->
                      <div id="chat-empty" class="chat-empty-state">
                        <h3>Selecciona un match</h3>
                        <p>
                          El historial de la sala y los mensajes nuevos aparecerán aquí.
                        </p>
                      </div>

                      <!-- ── Chat panel: hidden until a match is selected ── -->
                      <section id="chat-container" class="chat-panel" hidden aria-label="Ventana de chat">
                        <header class="chat-panel-header">
                          <div>
                            <h3 id="chat-header">Chat</h3>
                            <p id="chat-room-helper">Selecciona una conversación para empezar.</p>
                          </div>
                          <div class="chat-panel-actions">
                            <!-- Video call controls: call button shows, hangup button hidden until call starts -->
                            <button id="chat-call-btn" type="button" class="chat-call-btn">
                              Llamar
                            </button>
                            <button id="chat-hangup-btn" type="button" class="chat-hangup-btn" hidden>
                              Colgar llamada
                            </button>
                            <button id="chat-close-btn" type="button" class="chat-close-btn">
                              Cerrar
                            </button>
                            <button id="chat-finish-btn" type="button" class="chat-finish-btn">
                              Cerrar swap
                            </button>
                          </div>
                        </header>

                        <!-- ── Video call panel: shown during an active call ── -->
                        <section id="call-panel" class="call-panel" hidden aria-label="Panel de videollamada">
                          <div class="call-videos-grid">
                            <!-- Remote peer video stream -->
                            <article class="call-video-card">
                              <video id="remote-video" autoplay playsinline></video>
                              <p>Participante</p>
                            </article>
                            <!-- Local user video stream (muted to avoid echo) -->
                            <article class="call-video-card call-video-card--local">
                              <video id="local-video" autoplay playsinline muted></video>
                              <p>Tú</p>
                            </article>
                          </div>
                          <p id="call-status" class="call-status is-muted">Listo para iniciar llamada.</p>
                        </section>

                        <!-- Scrollable message history area -->
                        <div id="chat-messages" class="chat-messages" aria-live="polite"></div>

                        <!-- ── Message input form ── -->
                        <form id="chat-form" class="chat-input-row">
                          <!-- Hidden file input triggered by the attach button -->
                          <input
                            id="chat-file-input"
                            class="chat-file-input"
                            type="file"
                            accept=".jpg,.jpeg,.png,.gif,.webp,.mp3,.ogg,.wav,.webm"
                          />
                          <!-- Attach button: opens the file picker for images and audio -->
                          <button id="chat-file-btn" class="chat-file-btn" type="button">
                            Adjuntar
                          </button>
                          <!-- Record button: starts/stops audio recording via MediaRecorder API -->
                          <button id="chat-record-btn" class="chat-record-btn" type="button">
                            Grabar
                          </button>
                          <input
                            id="chat-input"
                            type="text"
                            placeholder="Escribe tu mensaje..."
                            maxlength="800"
                            autocomplete="off"
                          />
                          <button id="btn-enviar" type="submit">Enviar</button>
                        </form>
                      </section>
                    </section>`

                  : `
                    <!-- Matches view: shortcut panel directing user to chats section -->
                    <section class="chat-shortcut-panel" aria-label="Acceso a chats">
                      <h3>Tus chats están en una vista dedicada</h3>
                      <p>
                        Para mantener el tablero de swaps limpio, las conversaciones se gestionan ahora en la sección de chats.
                      </p>
                      <button class="matches-refresh-btn" type="button" data-nav-chats>
                        Abrir chats
                      </button>
                    </section>`
              }
            </div>
          </section>

          ${
            isChatsView
              ? ''
              : `
                <!-- ── Discovery feed section: only rendered in matches view ── -->
                <!-- Profiles are grouped into category-based carousels loaded dynamically -->
                <section class="users-grid-section users-grid-section--feed-board">
                  <div class="section-header section-header--feed">
                    <div class="section-header-copy">
                      <h2>Perfiles sugeridos</h2>
                      <h3>Carruseles filtrados por categoria</h3>
                    </div>
                    <button id="btn-refresh-feed" class="matches-refresh-btn" type="button">
                      Actualizar feed
                    </button>
                  </div>

                  <div id="feed-status" class="matches-status feed-carousel-status is-muted" role="status"></div>

                  <!-- Feed root: initially rendered with a loading skeleton,
                       replaced with real category carousels once data is fetched -->
                  <div id="feed-categories-root" class="feed-categories-root">
                    ${renderFeedLoadingState()}
                  </div>
                </section>
              `
          }

          <!-- Global toast stack: stacked notification toasts appear here -->
          <div
            id="notifications-toast-stack"
            class="notifications-toast-stack"
            aria-live="polite"
          ></div>
        </section>
      </div>
    </main>
  `;

  // Register interactions and store the cleanup function for when the view is torn down
  window.__swapsCleanup = setupSwapsInteractions(currentUserId, {
    isChatsView,
  });
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────
// Runs all previously registered cleanup functions from any active view.
// This prevents duplicate event listeners and memory leaks when navigating between pages.

function cleanupSwapView() {
  if (window.__homeCleanup) {
    window.__homeCleanup();
    window.__homeCleanup = null;
  }

  if (window.__homeScrollHandler) {
    window.removeEventListener('scroll', window.__homeScrollHandler);
    window.__homeScrollHandler = null;
  }

  if (window.__swapsCleanup) {
    window.__swapsCleanup();
    window.__swapsCleanup = null;
  }
}

// ─── Interactions Setup ───────────────────────────────────────────────────────
// Registers all event listeners for the swaps dashboard.
// Returns a cleanup function that removes all listeners when the view is unmounted.
// This pattern prevents memory leaks in the SPA.

function setupSwapsInteractions(currentUserId, options = {}) {
  const cleanups = [];

  // Shared state object passed down to child modules (matches-chat)
  const state = {
    userId: currentUserId ? String(currentUserId) : null,
    socket: null,        // Active WebSocket connection for the current chat room
    activeRoomId: null,  // ID of the currently open chat room
  };

  // ── Helper: registers click-to-navigate handlers for a given selector ──
  // Uses data attributes on buttons instead of href anchors for SPA navigation
  const registerNavigation = (selector, hash) => {
    document.querySelectorAll(selector).forEach((element) => {
      const handler = () => {
        window.location.hash = hash;
      };

      element.addEventListener('click', handler);
      cleanups.push(() => {
        element.removeEventListener('click', handler);
      });
    });
  };

  // ── Register all navigation routes ──
  registerNavigation('[data-nav-home]',         '#home');
  registerNavigation('[data-nav-profile]',      '#profile');
  registerNavigation('[data-nav-matches]',      '#swaps');
  registerNavigation('[data-nav-chats]',        '#chats');
  registerNavigation('[data-nav-prices]',       '#prices');
  registerNavigation('[data-nav-memberships]',  '#memberships');

  // ── Initialize the matches + chat module ──
  // This module handles: loading match list, opening chat rooms,
  // WebSocket connection, message rendering, notifications, file/audio attachments,
  // video call signaling, swap closing, and feed loading with swipe actions.
  cleanups.push(
    setupMatchesChat(state, {
      autoOpenFirstMatch: Boolean(options.isChatsView),
    })
  );

  // ─── Return cleanup function ──────────────────────────────────────────────
  // Called by cleanupSwapView() before the next page renders.
  // Closes the active WebSocket and removes all registered event listeners.
  return () => {
    if (state.socket) {
      try {
        state.socket.close();
      } catch {
        // Ignore errors if the socket is already closed
      }
      state.socket = null;
    }

    cleanups.forEach((cleanup) => {
      cleanup?.();
    });
  };
}
