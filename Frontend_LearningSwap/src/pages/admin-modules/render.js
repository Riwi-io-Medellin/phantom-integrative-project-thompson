import { escapeHtml, getFieldByAliases } from './helpers.js';

export function renderCrudPanel(resource, config, isActive) {
  const headers = config.columns
    .map((column) => `<th>${escapeHtml(column.label)}</th>`)
    .join('');

  return `
    <article
      class="admin-crud-panel ${isActive ? 'is-active' : ''}"
      data-resource-panel="${resource}"
    >
      <div class="admin-panel-header">
        <h2>${escapeHtml(config.title)}</h2>
        <button
          type="button"
          class="admin-btn admin-btn--ghost"
          data-resource-refresh="${resource}"
        >
          Recargar
        </button>
      </div>

      <p id="status-${resource}" class="admin-status admin-status--muted">
        Cargando datos...
      </p>

      <form id="form-${resource}" class="admin-form-grid">
        ${config.fields
          .map(
            (field) => `
              <label class="admin-form-field">
                <span>${escapeHtml(field.label)}</span>
                <input
                  id="field-${resource}-${field.key}"
                  type="${escapeHtml(field.type || 'text')}"
                  placeholder="${escapeHtml(field.label)}"
                />
              </label>
            `
          )
          .join('')}

        <div class="admin-form-actions">
          <button type="submit" id="submit-${resource}" class="admin-btn">Crear</button>
          <button
            type="button"
            id="cancel-${resource}"
            class="admin-btn admin-btn--ghost"
            data-resource-cancel="${resource}"
            hidden
          >
            Cancelar edicion
          </button>
        </div>
      </form>

      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              ${headers}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tbody-${resource}">
            <tr>
              <td colspan="${config.columns.length + 1}" class="admin-table-empty">Sin datos</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  `;
}

export function renderResourceTable(resource, resources, resourceConfig) {
  const config = resourceConfig[resource];
  const rows = resources[resource];
  const body = document.getElementById(`tbody-${resource}`);

  if (!body) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="${config.columns.length + 1}" class="admin-table-empty">
          No hay registros para mostrar.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows
    .map((row, index) => {
      const idValue = getFieldByAliases(row, config.idAliases);
      const hasId = idValue !== null && idValue !== undefined && idValue !== '';
      const columnsHtml = config.columns
        .map((column) => {
          const value = getFieldByAliases(row, column.aliases);
          return `<td>${escapeHtml(value === undefined || value === null || value === '' ? '-' : value)}</td>`;
        })
        .join('');

      return `
        <tr>
          ${columnsHtml}
          <td class="admin-actions-cell">
            <button
              type="button"
              class="admin-btn admin-btn--ghost admin-btn--small"
              data-row-action="edit"
              data-row-index="${index}"
              ${hasId ? '' : 'disabled'}
            >
              Editar
            </button>
            <button
              type="button"
              class="admin-btn admin-btn--danger admin-btn--small"
              data-row-action="delete"
              data-row-index="${index}"
              ${hasId ? '' : 'disabled'}
            >
              Eliminar
            </button>
          </td>
        </tr>
      `;
    })
    .join('');
}
