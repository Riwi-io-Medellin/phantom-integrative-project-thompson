import { getCurrentUser, isAuthenticated } from '../utils/auth.js';

// ─── Main Page Function ───────────────────────────────────────────────────────

export async function CheckoutPage() {
  const app = document.getElementById('app');

  // ── Auth guard: redirect to home if not logged in ──
  if (!isAuthenticated()) {
    const { HomePage } = await import('./home.js');
    HomePage();
    return;
  }

  // ── Cleanup any previous page listeners ──
  if (window.__swapsCleanup) {
    window.__swapsCleanup();
    window.__swapsCleanup = null;
  }
  if (window.__homeCleanup) {
    window.__homeCleanup();
    window.__homeCleanup = null;
  }

  // ── Page setup: clean page without dashboard or sidebar ──
  document.body.classList.remove('auth-page', 'register-mode', 'profile-page', 'swaps-page');
  document.body.classList.add('checkout-page');
  document.body.style.overflow = '';
  window.scrollTo({ top: 0, behavior: 'auto' });
  window.history.replaceState(null, '', '#checkout');

  // ── Retrieve plan preselected from memberships page via sessionStorage ──
  const user             = getCurrentUser();
  const preselectedPlan  = sessionStorage.getItem('checkout-plan') || '';
  const pendingReceipt   = localStorage.getItem('lastReceipt');

  // ─── Render HTML ─────────────────────────────────────────────────────────────

  app.innerHTML = `
    <main class="checkout-container">
      <section class="checkout-card">

        <!-- ── Payment form section ── -->
        <div class="payment-form-section">
          <header class="form-header">
            <div class="title-row">
              <img class="logo-pays" src="/assets/logos/logo.png" alt="logo" />
              <h2 class="title-text">Pago Seguro</h2>
            </div>
            <p class="subtitle-text">Completa los detalles de tu suscripción</p>
          </header>

          <!-- novalidate: we handle validation manually in JS -->
          <form class="checkout-form" id="checkoutForm" novalidate>

            <!-- Cardholder name -->
            <div class="input-group">
              <label for="cardName">Nombre en la tarjeta</label>
              <input type="text" id="cardName" placeholder="Nombre del titular" required />
            </div>

            <!-- Card number (auto-formatted as groups of 4) -->
            <div class="input-group">
              <label for="cardNumber">Número de tarjeta</label>
              <input type="text" id="cardNumber" placeholder="xxxx xxxx xxxx xxxx" maxlength="19" required />
            </div>

            <!-- CVV and expiry date side by side -->
            <div class="input-row">
              <div class="input-group">
                <label for="cvvNumber">CVV</label>
                <input type="text" id="cvvNumber" placeholder="xxx" maxlength="3" required />
              </div>
              <div class="input-group">
                <label for="expiryDate">Expiración</label>
                <input type="text" id="expiryDate" placeholder="MM/AA" maxlength="5" required />
              </div>
            </div>

            <!-- Membership plan selector — preselected if coming from memberships page -->
            <div class="input-group">
              <label for="membershipSelect">Membresía</label>
              <select id="membershipSelect" required>
                <option value="" disabled ${preselectedPlan ? '' : 'selected'}>Selecciona un plan...</option>
                <option value="emerald" ${preselectedPlan === 'Emerald' ? 'selected' : ''}>Emerald - $12.000</option>
                <option value="ruby"    ${preselectedPlan === 'Ruby'    ? 'selected' : ''}>Ruby - $25.000</option>
                <option value="diamond" ${preselectedPlan === 'Diamond' ? 'selected' : ''}>Diamond - $35.000</option>
              </select>
            </div>

            <!-- Submit button: shows spinner while processing -->
            <button type="submit" class="submit-button" id="submitBtn">
              <span id="submitLabel">Finalizar compra</span>
              <span id="submitLoader" class="checkout-loader" hidden>
                <span class="checkout-spinner"></span> Procesando...
              </span>
            </button>

            <!-- Back button: returns to memberships page -->
            <button type="button" class="back-link" id="backBtn">← Volver</button>
          </form>
        </div>

        <!-- ── Info panel with payment instructions and 3D model ── -->
        <aside class="info-panel-section">
          <div class="info-content">
            <h4>Bienvenido/a a la zona de pagos</h4>
            <p class="info-step">A continuación los pasos para un pago seguro.</p>
            <p class="info-step">1. Verifica que los datos de tu tarjeta coincidan con los de tu banco.</p>
            <p class="info-step">2. Métodos aceptados:</p>
            <div class="card-logos" aria-label="Tarjetas aceptadas">
              <figure class="card-logo-item">
                <img src="/assets/credit-cards-payzone/Visa.jpg" alt="Visa" loading="lazy" />
              </figure>
              <figure class="card-logo-item">
                <img src="/assets/credit-cards-payzone/americanExpress.png" alt="American Express" loading="lazy" />
              </figure>
              <figure class="card-logo-item">
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" loading="lazy" />
              </figure>
            </div>
            <p class="info-step">3. Tu compra es 100% segura y cifrada.</p>
            <!-- Spline 3D model viewer -->
            <spline-viewer
              class="robot-3d"
              url="https://prod.spline.design/R4psabwCeqKQmqyK/scene.splinecode"
            ></spline-viewer>
          </div>
        </aside>

      </section>
    </main>

    <!-- ── Success modal: shown after payment is processed ── -->
    <div id="successModal" class="modal-overlay hidden">
      <div class="success-card">
        <div class="success-header">
          <ion-icon class="check-icon" name="shield-checkmark-outline"></ion-icon>
          <h2>¡Pago Exitoso!</h2>
        </div>
        <div class="invoice-body">
          <div class="invoice-item"><span>Usuario:</span><strong id="res-name"></strong></div>
          <div class="invoice-item"><span>Plan:</span><strong id="res-plan"></strong></div>
          <div class="invoice-item"><span>Total:</span><strong id="res-amount"></strong></div>
          <div class="invoice-item"><span>Vencimiento:</span><span id="res-date"></span></div>
          <hr />
          <p id="res-card-type" class="card-tag"></p>
        </div>
        <button type="button" class="pay-done-button" id="closeModalBtn">Cerrar y Descargar PDF</button>
      </div>
    </div>
  `;

  // ─── Load Spline Viewer ───────────────────────────────────────────────────────

  // Dynamically inject the Spline script only if not already registered
  if (!customElements.get('spline-viewer')) {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://unpkg.com/@splinetool/viewer@1.12.69/build/spline-viewer.js';
    document.head.appendChild(s);
  }

  // ─── DOM References ───────────────────────────────────────────────────────────

  const checkoutForm    = document.getElementById('checkoutForm');
  const cardNumberInput = document.getElementById('cardNumber');
  const cvvInput        = document.getElementById('cvvNumber');
  const expiryInput     = document.getElementById('expiryDate');
  const successModal    = document.getElementById('successModal');
  const closeModalBtn   = document.getElementById('closeModalBtn');
  const submitBtn       = document.getElementById('submitBtn');
  const submitLabel     = document.getElementById('submitLabel');
  const submitLoader    = document.getElementById('submitLoader');
  const backBtn         = document.getElementById('backBtn');

  // ─── Anti-Refresh Guard ───────────────────────────────────────────────────────

  // If a receipt was saved before a page refresh, restore and show the modal
  if (pendingReceipt) {
    showModal(JSON.parse(pendingReceipt));
    localStorage.removeItem('lastReceipt');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  // Back button returns user to the memberships page
  backBtn.addEventListener('click', () => {
    window.location.hash = '#memberships';
  });

  // ─── Input Masks ─────────────────────────────────────────────────────────────

  // Format card number as groups of 4 digits separated by spaces
  cardNumberInput.addEventListener('input', (e) => {
    const v = e.target.value.replace(/\D/g, '');
    const f = v.match(/.{1,4}/g);
    e.target.value = f ? f.join(' ') : '';
  });

  // Allow only digits for CVV
  cvvInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
  });

  // Auto-insert slash for expiry date format MM/AA
  expiryInput.addEventListener('input', (e) => {
    const v = e.target.value.replace(/\D/g, '');
    e.target.value = v.length >= 2 ? v.substring(0, 2) + '/' + v.substring(2, 4) : v;
  });

  // ─── Form Submit ─────────────────────────────────────────────────────────────

  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // ── Read field values ──
    const cardName   = document.getElementById('cardName').value.trim();
    const cardNum    = cardNumberInput.value.trim();
    const cvv        = cvvInput.value.trim();
    const expiry     = expiryInput.value.trim();
    const membership = document.getElementById('membershipSelect').value;

    // ── Clear previous validation errors ──
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    let hasError = false;

    // Helper: mark a field as invalid and show an error message below it
    const showError = (inputId, message) => {
      const input = document.getElementById(inputId);
      input.classList.add('input-error');
      const err = document.createElement('span');
      err.className = 'field-error';
      err.textContent = message;
      input.parentElement.appendChild(err);
      hasError = true;
    };

    // ── Field validations ──
    if (!cardName)
      showError('cardName', 'El nombre es obligatorio.');

    if (cardNum.replace(/\s/g, '').length < 16)
      showError('cardNumber', 'Ingresa un número de tarjeta válido (16 dígitos).');

    if (cvv.length < 3)
      showError('cvvNumber', 'El CVV debe tener 3 dígitos.');

    if (!/^\d{2}\/\d{2}$/.test(expiry))
      showError('expiryDate', 'Formato inválido. Usa MM/AA.');

    if (!membership || membership === 'disabled selected')
      showError('membershipSelect', 'Selecciona un plan.');

    // Stop submission if any field is invalid
    if (hasError) return;

    // ── Build payment data object ──
    const selectedOption = document.getElementById('membershipSelect').selectedOptions[0].text;
    const [plan, price]  = selectedOption.split(' - ');

    const dataToSave = {
      customerName: document.getElementById('cardName').value,
      plan,
      amount: price,
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
      // Detect card type by first digit: 4 = VISA, anything else = Mastercard
      cardType: cardNumberInput.value[0] === '4' ? 'VISA' : 'Mastercard',
    };

    // Save a backup in localStorage in case the page refreshes mid-request
    localStorage.setItem('lastReceipt', JSON.stringify(dataToSave));

    // ── Show loading state on submit button ──
    submitLabel.hidden  = true;
    submitLoader.hidden = false;
    submitBtn.disabled  = true;

    try {
      // Attempt to persist payment to the local JSON server
      await fetch('http://localhost:3001/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      localStorage.removeItem('lastReceipt');
    } catch {
      // Server unavailable — receipt will still show from localStorage backup
    } finally {
      // Minimum 1.5s loading UX before showing the result
      await new Promise((res) => setTimeout(res, 1500));

      // Restore button state
      submitLabel.hidden  = false;
      submitLoader.hidden = true;
      submitBtn.disabled  = false;

      // Show success modal and clean up storage
      showModal(dataToSave);
      localStorage.removeItem('lastReceipt');
      sessionStorage.removeItem('checkout-plan');
      sessionStorage.removeItem('checkout-price');
    }
  });

  // ─── Modal Close & Print ─────────────────────────────────────────────────────

  // Trigger browser print dialog (saves as PDF) and close the modal
  closeModalBtn.addEventListener('click', () => {
    window.print();
    successModal.classList.add('hidden');
    checkoutForm.reset();
    localStorage.removeItem('lastReceipt');
  });

  // ─── Show Modal ──────────────────────────────────────────────────────────────

  // Populates and displays the success modal with payment receipt data
 function showModal(data) {
  document.getElementById('res-name').textContent      = data.customerName;
  document.getElementById('res-plan').textContent      = data.plan;
  document.getElementById('res-amount').textContent    = data.amount;
  document.getElementById('res-date').textContent      = data.date;
  document.getElementById('res-card-type').textContent = `Método: ${data.cardType}`;
  successModal.classList.remove('hidden');

  // keep the plan and show the icon in the profile
  localStorage.setItem('user-membership', data.plan.toLowerCase());
}

  // ─── Cleanup Registration ─────────────────────────────────────────────────────

  // Remove checkout-page class when navigating away
  window.__swapsCleanup = () => {
    document.body.classList.remove('checkout-page');
  };
}