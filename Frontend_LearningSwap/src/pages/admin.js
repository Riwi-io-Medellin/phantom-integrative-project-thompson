import {
	getNavbar,
	setupNavbarAuthActions,
	setupNavbarBurger,
	setupNavbarSectionLinks,
} from '../components/navbar.js';
import {
	getCurrentUser,
	getCurrentUserRole,
	isAuthenticated,
	logout,
} from '../utils/auth.js';
import { RESOURCE_CONFIG, RESOURCE_ORDER } from './admin-modules/config.js';
import {
	escapeHtml,
	getFieldByAliases,
} from './admin-modules/helpers.js';
import { renderCrudPanel } from './admin-modules/render.js';
import {
	loadResource,
	loadStats,
	requestResource,
	setResourceStatus,
} from './admin-modules/data.js';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const state = {
	activeResource: 'skills',
	endpoints: {
		stats: null,
		skills: null,
		users: null,
		matches: null,
	},
	resources: {
		skills: [],
		users: [],
		matches: [],
	},
	editing: {
		skills: null,
		users: null,
		matches: null,
	},
};

export async function AdminPage() {
	const app = document.getElementById('app');

	if (!isAuthenticated()) {
		const { HomePage } = await import('./home.js');
		HomePage();
		return;
	}

	if (getCurrentUserRole() !== 'admin') {
		const { ProfilePage } = await import('./profile.js');
		ProfilePage();
		return;
	}

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

	document.body.classList.remove(
		'auth-page',
		'register-mode',
		'profile-page',
		'swaps-page'
	);
	document.body.classList.add('admin-page');
	document.body.style.overflow = '';
	window.history.replaceState(null, '', '#admin');
	window.scrollTo({ top: 0, behavior: 'auto' });

	const user = getCurrentUser();
	const fullName = [user?.first_name || user?.name || 'Admin', user?.last_name]
		.filter(Boolean)
		.join(' ')
		.trim();

	app.innerHTML = `
		${getNavbar()}

		<main class="admin-main">
			<section class="admin-header">
				<div>
					<p class="admin-kicker">Panel Admin</p>
					<h1>Gestion general</h1>
					<p>Bienvenido ${escapeHtml(fullName || 'Administrador')}. Administra usuarios, habilidades y matches.</p>
				</div>
				<div class="admin-header-actions">
					<button id="admin-go-profile" class="admin-btn" type="button">Perfil</button>
					<button id="admin-go-swaps" class="admin-btn" type="button">Swaps</button>
					<button id="admin-logout" class="admin-btn admin-btn--danger" type="button">Cerrar sesion</button>
				</div>
			</section>

			<section class="admin-stats-grid" aria-label="Metricas">
				<article class="admin-stat-card">
					<span>Total usuarios</span>
					<strong id="stat-total-users">0</strong>
				</article>
				<article class="admin-stat-card">
					<span>Total matches</span>
					<strong id="stat-total-matches">0</strong>
				</article>
				<article class="admin-stat-card">
					<span>Total skills</span>
					<strong id="stat-total-skills">0</strong>
				</article>
				<article class="admin-stat-card">
					<span>Total user skills</span>
					<strong id="stat-total-user-skills">0</strong>
				</article>
			</section>
			<p id="stats-status" class="admin-status admin-status--muted">Cargando estadisticas...</p>

			<section class="admin-tabs" aria-label="Secciones CRUD">
				${RESOURCE_ORDER.map(
					(resource) => `
						<button
							type="button"
							class="admin-tab ${resource === state.activeResource ? 'is-active' : ''}"
							data-admin-tab="${resource}"
						>
							${escapeHtml(RESOURCE_CONFIG[resource].title)}
						</button>
					`
				).join('')}
			</section>

			<section class="admin-crud-sections">
				${RESOURCE_ORDER.map((resource) =>
					renderCrudPanel(
						resource,
						RESOURCE_CONFIG[resource],
						resource === state.activeResource
					)
				).join('')}
			</section>
		</main>
	`;

	setupNavbarBurger();
	setupNavbarAuthActions();
	setupNavbarSectionLinks();

	setupAdminNavigationActions();
	setupTabActions();
	setupCrudActions();

	window.__swapsCleanup = () => {
		document.body.classList.remove('admin-page');
	};

	await loadStats(state, API_URL);
	await Promise.all(
		RESOURCE_ORDER.map((resource) =>
			loadResource(state, resource, RESOURCE_CONFIG, API_URL)
		)
	);
	setActiveResource(state.activeResource);
}

function setupAdminNavigationActions() {
	document.getElementById('admin-go-profile')?.addEventListener('click', () => {
		window.location.hash = '#profile';
	});

	document.getElementById('admin-go-swaps')?.addEventListener('click', () => {
		window.location.hash = '#swaps';
	});

	document.getElementById('admin-logout')?.addEventListener('click', () => {
		logout();
	});
}

function setupTabActions() {
	document.querySelectorAll('[data-admin-tab]').forEach((button) => {
		button.addEventListener('click', () => {
			const resource = button.getAttribute('data-admin-tab');
			if (!RESOURCE_CONFIG[resource]) return;
			setActiveResource(resource);
		});
	});
}

function setActiveResource(resource) {
	state.activeResource = resource;

	document.querySelectorAll('[data-admin-tab]').forEach((button) => {
		button.classList.toggle(
			'is-active',
			button.getAttribute('data-admin-tab') === resource
		);
	});

	document.querySelectorAll('[data-resource-panel]').forEach((panel) => {
		panel.classList.toggle(
			'is-active',
			panel.getAttribute('data-resource-panel') === resource
		);
	});
}

function setupCrudActions() {
	RESOURCE_ORDER.forEach((resource) => {
		document
			.getElementById(`form-${resource}`)
			?.addEventListener('submit', async (event) => {
				event.preventDefault();
				await submitResource(resource);
			});

		document
			.querySelector(`[data-resource-cancel="${resource}"]`)
			?.addEventListener('click', () => {
				resetForm(resource);
			});

		document
			.querySelector(`[data-resource-refresh="${resource}"]`)
			?.addEventListener('click', async () => {
				await loadResource(state, resource, RESOURCE_CONFIG, API_URL);
			});

		document.getElementById(`tbody-${resource}`)?.addEventListener('click', async (event) => {
			const button = event.target.closest('[data-row-action]');
			if (!button) return;

			const action = button.getAttribute('data-row-action');
			const index = Number.parseInt(button.getAttribute('data-row-index'), 10);
			const entity = state.resources[resource][index];

			if (!entity) return;

			if (action === 'edit') {
				startEditing(resource, entity);
			}

			if (action === 'delete') {
				await deleteEntity(resource, entity);
			}
		});
	});
}

async function submitResource(resource) {
	const config = RESOURCE_CONFIG[resource];
	const isEditing = Boolean(state.editing[resource]);
	const payload = buildPayloadFromForm(resource, config.fields, isEditing);

	if (!payload) return;

	try {
		if (isEditing) {
			await requestResource(state, resource, RESOURCE_CONFIG, API_URL, {
				method: 'PUT',
				id: state.editing[resource],
				payload,
			});
			setResourceStatus(resource, 'Registro actualizado correctamente.', 'success');
		} else {
			await requestResource(state, resource, RESOURCE_CONFIG, API_URL, {
				method: 'POST',
				payload,
			});
			setResourceStatus(resource, 'Registro creado correctamente.', 'success');
		}

		resetForm(resource);
		await loadResource(state, resource, RESOURCE_CONFIG, API_URL, {
			silentSuccessStatus: true,
		});
	} catch (error) {
		setResourceStatus(
			resource,
			error.message || 'No fue posible guardar el registro.',
			'error'
		);
	}
}

async function deleteEntity(resource, entity) {
	const config = RESOURCE_CONFIG[resource];
	const entityId = getFieldByAliases(entity, config.idAliases);

	if (entityId === null || entityId === undefined || entityId === '') {
		setResourceStatus(resource, 'El registro no tiene un ID valido.', 'error');
		return;
	}

	const shouldDelete = window.confirm('Deseas eliminar este registro?');
	if (!shouldDelete) return;

	try {
		await requestResource(state, resource, RESOURCE_CONFIG, API_URL, {
			method: 'DELETE',
			id: entityId,
		});

		if (String(state.editing[resource]) === String(entityId)) {
			resetForm(resource);
		}

		setResourceStatus(resource, 'Registro eliminado correctamente.', 'success');
		await loadResource(state, resource, RESOURCE_CONFIG, API_URL, {
			silentSuccessStatus: true,
		});
	} catch (error) {
		setResourceStatus(
			resource,
			error.message || 'No fue posible eliminar el registro.',
			'error'
		);
	}
}

function startEditing(resource, entity) {
	const config = RESOURCE_CONFIG[resource];
	const entityId = getFieldByAliases(entity, config.idAliases);

	if (entityId === null || entityId === undefined || entityId === '') {
		setResourceStatus(resource, 'No se puede editar: registro sin ID.', 'error');
		return;
	}

	state.editing[resource] = entityId;

	config.fields.forEach((field) => {
		const input = document.getElementById(`field-${resource}-${field.key}`);
		if (!input) return;
		const value = getFieldByAliases(entity, field.aliases);
		input.value = value === undefined || value === null ? '' : String(value);
	});

	const submitButton = document.getElementById(`submit-${resource}`);
	if (submitButton) {
		submitButton.textContent = 'Actualizar';
	}

	const cancelButton = document.getElementById(`cancel-${resource}`);
	if (cancelButton) {
		cancelButton.hidden = false;
	}

	setResourceStatus(resource, 'Modo edicion activo.', 'muted');
}

function resetForm(resource) {
	const config = RESOURCE_CONFIG[resource];

	state.editing[resource] = null;
	config.fields.forEach((field) => {
		const input = document.getElementById(`field-${resource}-${field.key}`);
		if (input) input.value = '';
	});

	const submitButton = document.getElementById(`submit-${resource}`);
	if (submitButton) {
		submitButton.textContent = 'Crear';
	}

	const cancelButton = document.getElementById(`cancel-${resource}`);
	if (cancelButton) {
		cancelButton.hidden = true;
	}
}

function buildPayloadFromForm(resource, fields, isEditing) {
	const payload = {};
	const missingRequired = [];

	fields.forEach((field) => {
		const input = document.getElementById(`field-${resource}-${field.key}`);
		const rawValue = input?.value?.trim() || '';

		if (!rawValue) {
			if (!isEditing && field.requiredOnCreate) {
				missingRequired.push(field.label);
			}
			return;
		}

		payload[field.key] = normalizePayloadValue(field.key, rawValue);
	});

	if (missingRequired.length > 0) {
		setResourceStatus(
			resource,
			`Campos obligatorios: ${missingRequired.join(', ')}.`,
			'error'
		);
		return null;
	}

	if (Object.keys(payload).length === 0) {
		setResourceStatus(resource, 'Debes ingresar al menos un valor.', 'error');
		return null;
	}

	return payload;
}

function normalizePayloadValue(key, value) {
	if (key.endsWith('_id')) {
		const numeric = Number.parseInt(value, 10);
		return Number.isNaN(numeric) ? value : numeric;
	}

	return value;
}

