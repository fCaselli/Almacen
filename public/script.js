
const state = {
  dashboard: null,
  products: [],
  productMeta: { categories: [] },
  providers: [],
  purchases: [],
  lots: [],
  alerts: null,
  view: "dashboard",
  productFilters: { q: "", category: "", status: "", sort: "name" },
  purchaseSearch: "",
  lotFilters: { q: "", status: "", days: "30", sort: "expiry" },
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function normalizeBase(base) {
  return base.replace(/\/+$/, "");
}

function resolveApiBaseUrl() {
  const metaValue = document.querySelector('meta[name="api-base-url"]')?.content?.trim();
  if (metaValue) return normalizeBase(metaValue);

  try {
    const stored = window.localStorage.getItem("almacen_api_base_url")?.trim();
    if (stored) return normalizeBase(stored);
  } catch {}

  const { protocol, hostname, port, origin } = window.location;
  const isLocal = ["localhost", "127.0.0.1"].includes(hostname);
  const isGithubPages = hostname.endsWith("github.io");

  if (protocol === "file:") return "http://localhost:3000";
  if (port === "3000") return origin;
  if (isLocal) return "http://localhost:3000";
  if (isGithubPages) return "http://localhost:3000";
  return origin;
}

const API_BASE_URL = resolveApiBaseUrl();

function withApi(path) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function api(path, options = {}) {
  const response = await fetch(withApi(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Error ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

const fmtMoney = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const fmtDate = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  $("#toastContainer").appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 220);
  }, 2800);
}

function setConnectionStatus(text, ok = true) {
  const el = $("#connectionStatus");
  el.textContent = text;
  el.style.background = ok ? "rgba(15, 157, 88, 0.18)" : "rgba(228, 88, 88, 0.16)";
  el.style.borderColor = ok ? "rgba(15, 157, 88, 0.24)" : "rgba(228, 88, 88, 0.24)";
  el.style.color = ok ? "#dcfce7" : "#fee2e2";
}

function statusBadge(label) {
  const lower = String(label || "").toLowerCase();
  let cls = "badge-neutral";
  if (["ok", "recibida", "received"].includes(lower)) cls = "badge-ok";
  if (["bajo mínimo", "en límite", "pendiente", "pending"].includes(lower)) cls = "badge-warning";
  if (["sin stock", "vencido", "error", "urgente"].includes(lower)) cls = "badge-danger";
  if (["por vencer", "agotado"].includes(lower)) cls = "badge-warning";
  return `<span class="badge ${cls}">${label}</span>`;
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const now = new Date();
  const target = new Date(dateValue);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}


function syncFilterInputs() {
  const productSearch = $("#productSearch");
  if (productSearch) productSearch.value = state.productFilters.q || "";
  const productCategory = $("#productCategoryFilter");
  if (productCategory) productCategory.value = state.productFilters.category || "";
  const productStatus = $("#productStatusFilter");
  if (productStatus) productStatus.value = state.productFilters.status || "";
  const productSort = $("#productSort");
  if (productSort) productSort.value = state.productFilters.sort || "name";

  const lotSearch = $("#lotSearch");
  if (lotSearch) lotSearch.value = state.lotFilters.q || "";
  const lotStatus = $("#lotStatusFilter");
  if (lotStatus) lotStatus.value = state.lotFilters.status || "";
  const lotDays = $("#lotDaysFilter");
  if (lotDays) lotDays.value = state.lotFilters.days || "30";
  const lotSort = $("#lotSort");
  if (lotSort) lotSort.value = state.lotFilters.sort || "expiry";
}

function getAlertsTotal(data = state.alerts) {
  if (!data?.cards) return 0;
  return Number(data.cards.expiring7 || 0) + Number(data.cards.expired || 0) + Number(data.cards.lowStock || 0) + Number(data.cards.outOfStock || 0);
}

function renderSidebarAlerts() {
  const count = getAlertsTotal();
  const badge = $("#sidebarAlertsBadge");
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-flex" : "none";
}

function buildAlertFeed(data = state.alerts) {
  if (!data) return [];
  if (Array.isArray(data.feed) && data.feed.length) return data.feed;
  return [];
}

function renderDashboardAlertBanner() {
  const container = $("#dashboardAlertBanner");
  if (!container) return;
  const total = getAlertsTotal();
  if (!state.alerts || total === 0) {
    container.innerHTML = `
      <div class="alert-banner-card ok">
        <div>
          <p class="panel-eyebrow">Centro de alertas</p>
          <h3>Todo en orden por ahora</h3>
          <p>No hay alertas críticas activas. Igual podés revisar lotes y productos desde el panel.</p>
        </div>
        <button class="btn btn-secondary" data-go-view="lots">Ver lotes</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="alert-banner-card danger">
      <div>
        <p class="panel-eyebrow">Centro de alertas</p>
        <h3>${total} alertas activas para revisar</h3>
        <p>${state.alerts.cards.expired || 0} vencidos, ${state.alerts.cards.expiring7 || 0} por vencer pronto y ${state.alerts.cards.lowStock || 0} productos a reponer.</p>
      </div>
      <div class="alert-banner-actions">
        <button class="btn btn-secondary" data-alert-shortcut="critical">Ver críticas</button>
        <button class="btn btn-primary" data-go-view="alerts">Abrir alertas</button>
      </div>
    </div>
  `;
}

async function focusLotIssue(lotId, fallbackText = "") {
  const lot = state.lots.find((item) => item.id === lotId);
  state.lotFilters.q = lot?.lotCode || fallbackText || lot?.productName || "";
  state.lotFilters.status = lot?.status === "Vencido" ? "expired" : lot?.status === "Urgente" ? "urgent" : "expiring";
  syncFilterInputs();
  switchView("lots");
  await Promise.all([loadLots(), loadAlerts()]);
}

async function startReplenishment(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  try {
    await api(`/api/products/${productId}/reorder-suggestion`, {
      method: "POST",
      body: JSON.stringify({ reason: "alert", notes: `Reposición sugerida para ${product.name}` }),
    });
  } catch (error) {
    console.warn("No pudimos registrar la sugerencia de compra", error);
  }
  switchView("purchases");
  openPurchaseModal({
    providerId: product.supplierId || "",
    note: `Reposición sugerida por alerta para ${product.name}`,
    line: {
      productId: product.id,
      quantity: Math.max((product.minStock || 1) - (product.stock || 0), 1),
      unitCost: 0,
    },
  });
}

async function markLotExpired(lotId) {
  if (!window.confirm("Esto va a descontar del stock las unidades remanentes del lote. ¿Seguimos?")) return;
  await api(`/api/lots/${lotId}/mark-expired`, {
    method: "POST",
    body: JSON.stringify({ reason: "vencimiento", notes: "Procesado desde alertas" }),
  });
  showToast("Lote marcado como vencido y stock actualizado.", "success");
  await refreshAll();
  switchView("lots");
}

async function promoteLotFromAlert(lotId) {
  await api(`/api/lots/${lotId}/promotion`, {
    method: "POST",
    body: JSON.stringify({ notes: "Marcado para promoción desde alertas" }),
  });
  showToast("Lote marcado para promoción.", "success");
  await refreshAll();
  switchView("lots");
}

async function resolveAlertKey(alertKey, resolutionType = "reviewed") {
  await api(`/api/alerts/${encodeURIComponent(alertKey)}/resolve`, {
    method: "POST",
    body: JSON.stringify({ resolutionType, notes: "Atendida desde el panel" }),
  });
  showToast("Alerta marcada como atendida.", "success");
  await refreshAll();
}

function updateHeaderForView(view) {
  const config = {
    dashboard: {
      eyebrow: "Panel operativo",
      title: "Dashboard",
      subtitle: "Vista general para controlar productos, compras y proveedores desde un mismo lugar.",
      cta: { label: "Nuevo producto", action: () => openProductModal() },
    },
    products: {
      eyebrow: "Catálogo",
      title: "Productos",
      subtitle: "Ordená el catálogo con filtros, estados y acciones directas por fila.",
      cta: { label: "Nuevo producto", action: () => openProductModal() },
    },
    purchases: {
      eyebrow: "Abastecimiento",
      title: "Compras",
      subtitle: "Registrá ingresos de mercadería y actualizá stock desde un flujo administrativo más claro.",
      cta: { label: "Nueva compra", action: () => openPurchaseModal() },
    },
    providers: {
      eyebrow: "Relaciones",
      title: "Proveedores",
      subtitle: "Centralizá contactos, productos asociados y compras para ordenar mejor la reposición.",
      cta: { label: "Nuevo proveedor", action: () => openProviderModal() },
    },
    lots: {
      eyebrow: "Trazabilidad",
      title: "Lotes",
      subtitle: "Controlá remanentes, vencimientos y compras asociadas para evitar pérdidas y ordenar mejor la rotación.",
      cta: { label: "Ver alertas", action: () => switchView("alerts") },
    },
    alerts: {
      eyebrow: "Prevención",
      title: "Alertas",
      subtitle: "Detectá a tiempo qué productos están en riesgo por vencimiento o por bajo stock.",
      cta: { label: "Ir a lotes", action: () => switchView("lots") },
    },
  };

  const current = config[view];
  $("#headerEyebrow").textContent = current.eyebrow;
  $("#pageTitle").textContent = current.title;
  $("#pageSubtitle").textContent = current.subtitle;

  const actionBtn = $("#contextPrimaryAction");
  actionBtn.textContent = current.cta.label;
  actionBtn.onclick = current.cta.action;
}

function switchView(view) {
  state.view = view;
  $$(".view").forEach((section) => section.classList.toggle("active", section.id === `view-${view}`));
  $$(".nav-item").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
  updateHeaderForView(view);
}

function renderDashboard() {
  const data = state.dashboard;
  if (!data) return;

  $("#statProducts").textContent = data.cards.products;
  $("#statUnits").textContent = data.cards.units;
  $("#statLowStock").textContent = data.cards.lowStock;
  $("#statStockValue").textContent = fmtMoney.format(data.cards.stockValue || 0);
  $("#statProviders").textContent = data.cards.providers;
  $("#statPurchases").textContent = data.cards.purchases;

  renderListBlock("#lowStockList", data.lowStock, (item) => {
    return `
      <div class="list-item">
        <div class="list-item-main">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.category)} · ${escapeHtml(item.supplierName || "Sin proveedor")}</span>
        </div>
        <div class="list-item-meta">Stock ${item.stock} / mínimo ${item.minStock}</div>
        ${statusBadge(item.status)}
      </div>
    `;
  }, "Todo en orden por ahora.");

  renderListBlock("#expiringLotsList", data.expiringLots, (item) => {
    const d = daysUntil(item.expiry);
    const badge = d !== null && d <= 7 ? "Por vencer" : "Próximo";
    return `
      <div class="list-item">
        <div class="list-item-main">
          <strong>${escapeHtml(item.productName)}</strong>
          <span>Lote ${escapeHtml(item.lotCode)} · ${item.remainingQuantity} u.</span>
        </div>
        <div class="list-item-meta">Vence ${formatDate(item.expiry)}${d !== null ? ` · ${d} días` : ""}</div>
        ${statusBadge(badge)}
      </div>
    `;
  }, "No hay lotes próximos a vencer.");

  renderListBlock("#recentPurchasesList", data.recentPurchases, (item) => {
    return `
      <div class="list-item">
        <div class="list-item-main">
          <strong>${escapeHtml(item.reference)}</strong>
          <span>${escapeHtml(item.providerName)} · ${formatDate(item.purchasedAt)}</span>
        </div>
        <div class="list-item-meta">${fmtMoney.format(item.total || 0)} · ${item.lines?.length || 0} líneas</div>
        ${statusBadge(item.status === "received" ? "Recibida" : "Pendiente")}
      </div>
    `;
  }, "Todavía no hay compras registradas.");

  renderDashboardAlertBanner();
}

function renderListBlock(selector, items, template, emptyText) {
  const container = $(selector);
  if (!items?.length) {
    container.innerHTML = `<div class="table-empty">${emptyText}</div>`;
    return;
  }
  container.innerHTML = items.map(template).join("");
}

function renderProducts() {
  const tbody = $("#productsTableBody");
  if (!state.products.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty">No encontramos productos con esos filtros.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.products.map((item) => `
    <tr>
      <td>
        <strong>${escapeHtml(item.name)}</strong>
        <div class="subcell">${escapeHtml(item.barcode || "Sin código")}</div>
      </td>
      <td>${escapeHtml(item.category)}</td>
      <td>${escapeHtml(item.supplierName || "Sin proveedor")}</td>
      <td>${escapeHtml(item.location || "-")}</td>
      <td>${item.stock}</td>
      <td>${item.minStock}</td>
      <td>${fmtMoney.format(item.price || 0)}</td>
      <td>${statusBadge(item.status)}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-secondary small" data-edit-product="${item.id}">Editar</button>
          <button class="btn btn-danger small" data-delete-product="${item.id}">Borrar</button>
        </div>
      </td>
    </tr>
  `).join("");

  $("#productCategoryFilter").innerHTML = `
    <option value="">Todas</option>
    ${state.productMeta.categories.map((category) => `<option value="${escapeAttr(category)}">${escapeHtml(category)}</option>`).join("")}
  `;

  $("#productCategoryFilter").value = state.productFilters.category;
}

function renderProviders() {
  const tbody = $("#providersTableBody");
  if (!state.providers.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Todavía no hay proveedores.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.providers.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td>${escapeHtml(item.contactName || "-")}</td>
      <td>${escapeHtml(item.phone || "-")}</td>
      <td>${escapeHtml(item.email || "-")}</td>
      <td>${item.purchaseCount ?? 0}</td>
      <td>${item.productCount ?? 0}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-secondary small" data-edit-provider="${item.id}">Editar</button>
          <button class="btn btn-danger small" data-delete-provider="${item.id}">Borrar</button>
        </div>
      </td>
    </tr>
  `).join("");

  refreshProvidersDatalist();
}

function renderPurchases() {
  const tbody = $("#purchasesTableBody");
  if (!state.purchases.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty">No encontramos compras.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.purchases.map((item) => `
    <tr>
      <td>${formatDate(item.purchasedAt)}</td>
      <td><strong>${escapeHtml(item.reference)}</strong></td>
      <td>${escapeHtml(item.providerName)}</td>
      <td>${statusBadge(item.status === "received" ? "Recibida" : "Pendiente")}</td>
      <td>${fmtMoney.format(item.total || 0)}</td>
      <td>${fmtMoney.format(item.paidAmount || 0)}</td>
      <td>${fmtMoney.format(item.balance || 0)}</td>
      <td>${item.lines?.length || 0}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-secondary small" data-view-purchase="${item.id}">Ver</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderLots() {
  const tbody = $("#lotsTableBody");
  if (!state.lots.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty">No encontramos lotes con esos filtros.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.lots.map((item) => `
    <tr>
      <td>
        <strong>${escapeHtml(item.productName || "-")}</strong>
        <div class="subcell">${escapeHtml(item.supplierName || "Sin proveedor")}</div>
      </td>
      <td>${escapeHtml(item.lotCode || "-")}</td>
      <td>${escapeHtml(item.supplierName || "-")}</td>
      <td>${escapeHtml(item.purchaseReference || "-")}</td>
      <td>${formatDate(item.expiry)}</td>
      <td>${item.daysLeft ?? "-"}</td>
      <td>${item.remainingQuantity ?? 0}</td>
      <td>${fmtMoney.format(item.unitCost || 0)}</td>
      <td>${statusBadge(item.status)}</td>
    </tr>
  `).join("");
}


function renderAlerts() {
  const data = state.alerts;
  if (!data) return;

  $("#alertExpiring7").textContent = data.cards.expiring7 || 0;
  $("#alertExpiring15").textContent = data.cards.expiring15 || 0;
  $("#alertExpiring30").textContent = data.cards.expiring30 || 0;
  $("#alertExpired").textContent = data.cards.expired || 0;
  $("#alertLowStock").textContent = data.cards.lowStock || 0;
  $("#alertOutOfStock").textContent = data.cards.outOfStock || 0;

  const feed = buildAlertFeed(data);
  $("#alertsFeedMeta").textContent = `${feed.length} alertas activas`;
  const feedContainer = $("#alertCenterList");
  if (!feed.length) {
    feedContainer.innerHTML = `<div class="table-empty">No hay alertas activas en este momento.</div>`;
  } else {
    feedContainer.innerHTML = feed.map((item) => `
      <article class="alert-card-item ${item.severityClass}">
        <div class="alert-card-main">
          <div class="alert-severity-pill ${item.severityClass}">${escapeHtml(item.severity)}</div>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.subtitle)}</span>
          </div>
        </div>
        <div class="alert-card-detail">${escapeHtml(item.detail)}</div>
        <div class="alert-card-actions">
          <button class="btn btn-secondary small" data-alert-go-view="alerts">Ver alertas</button>
          <button class="btn btn-secondary small" data-alert-resolve-key="${escapeAttr(item.key || item.id || "")}">Atendida</button>
          <button class="btn btn-primary small" data-alert-action="${item.actionType}" data-alert-ref-id="${escapeAttr(item.refId || "")}" data-alert-ref-text="${escapeAttr(item.refText || "")}">${escapeHtml(item.actionLabel)}</button>
        </div>
      </article>
    `).join("");
  }

  renderListBlock("#alertUrgentLotsList", data.urgentLots, (item) => `
    <div class="list-item actionable-item">
      <div class="list-item-main">
        <strong>${escapeHtml(item.productName)}</strong>
        <span>Lote ${escapeHtml(item.lotCode || "-")} · ${item.remainingQuantity} u.</span>
      </div>
      <div class="list-item-meta">${formatDate(item.expiry)} · ${item.daysLeft ?? "-"} días · ${escapeHtml(item.purchaseReference || "Sin compra")}</div>
      <div class="inline-actions">
        ${statusBadge(item.status)}
        <button class="btn btn-secondary small" data-alert-resolve-key="${escapeAttr(item.alertKey || '')}">Atendida</button>
        <button class="btn btn-primary small" data-alert-action="promoteLot" data-alert-ref-id="${escapeAttr(item.id)}" data-alert-ref-text="${escapeAttr(item.lotCode || item.productName)}">Mover a promo</button>
      </div>
    </div>
  `, "No hay lotes urgentes por ahora.");

  renderListBlock("#alertExpiredLotsList", data.expiredLots, (item) => `
    <div class="list-item actionable-item">
      <div class="list-item-main">
        <strong>${escapeHtml(item.productName)}</strong>
        <span>Lote ${escapeHtml(item.lotCode || "-")} · ${item.remainingQuantity} u.</span>
      </div>
      <div class="list-item-meta">Venció ${formatDate(item.expiry)} · costo estimado ${fmtMoney.format(item.estimatedCost || 0)}</div>
      <div class="inline-actions">
        ${statusBadge(item.status)}
        <button class="btn btn-secondary small" data-alert-resolve-key="${escapeAttr(item.alertKey || '')}">Atendida</button>
        <button class="btn btn-danger small" data-alert-action="markExpired" data-alert-ref-id="${escapeAttr(item.id)}" data-alert-ref-text="${escapeAttr(item.lotCode || item.productName)}">Registrar vencido</button>
      </div>
    </div>
  `, "No hay lotes vencidos en este momento.");

  renderListBlock("#alertLowStockProductsList", data.lowStockProducts, (item) => `
    <div class="list-item actionable-item">
      <div class="list-item-main">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.category)} · ${escapeHtml(item.supplierName || "Sin proveedor")}</span>
      </div>
      <div class="list-item-meta">Stock ${item.stock} / mínimo ${item.minStock}</div>
      <div class="inline-actions">
        ${statusBadge(item.status)}
        <button class="btn btn-secondary small" data-alert-resolve-key="${escapeAttr(item.alertKey || '')}">Atendida</button>
        <button class="btn btn-primary small" data-alert-action="buy" data-alert-ref-id="${escapeAttr(item.id)}">Reponer</button>
        <button class="btn btn-secondary small" data-edit-product="${escapeAttr(item.id)}">Editar</button>
      </div>
    </div>
  `, "No hay productos críticos por ahora.");

  renderSidebarAlerts();
  renderDashboardAlertBanner();
}


function refreshProvidersDatalist() {
  $("#providersDatalist").innerHTML = state.providers
    .map((provider) => `<option value="${escapeAttr(provider.name)}"></option>`)
    .join("");
}

function populatePurchaseProviderSelect() {
  $("#purchaseProvider").innerHTML = state.providers.length
    ? state.providers.map((provider) => `<option value="${provider.id}">${escapeHtml(provider.name)}</option>`).join("")
    : `<option value="">No hay proveedores</option>`;
}

function createPurchaseLine(values = {}) {
  const row = document.createElement("div");
  row.className = "purchase-line";
  const productOptions = state.products
    .map((product) => `<option value="${product.id}">${escapeHtml(product.name)} (${product.stock} u.)</option>`)
    .join("");

  row.innerHTML = `
    <label>
      Producto
      <select class="purchase-line-product" required>
        <option value="">Seleccionar...</option>
        ${productOptions}
      </select>
    </label>
    <label>
      Cantidad
      <input class="purchase-line-quantity" type="number" min="1" step="1" value="${values.quantity ?? 1}" required />
    </label>
    <label>
      Costo unitario
      <input class="purchase-line-unit-cost" type="number" min="0" step="0.01" value="${values.unitCost ?? 0}" required />
    </label>
    <label>
      Vencimiento
      <input class="purchase-line-expiry" type="date" value="${values.expiry ?? ""}" />
    </label>
    <label>
      Lote
      <input class="purchase-line-lot-code" value="${values.lotCode ?? ""}" placeholder="Opcional" />
    </label>
    <div class="row-actions">
      <button type="button" class="btn btn-danger small purchase-line-remove">Quitar</button>
    </div>
  `;

  if (values.productId) {
    row.querySelector(".purchase-line-product").value = values.productId;
  }

  row.querySelector(".purchase-line-remove").addEventListener("click", () => {
    row.remove();
    updatePurchaseTotal();
  });

  row.querySelectorAll("input, select").forEach((field) => {
    field.addEventListener("input", updatePurchaseTotal);
    field.addEventListener("change", updatePurchaseTotal);
  });

  return row;
}

function updatePurchaseTotal() {
  const rows = $$("#purchaseLines .purchase-line");
  const total = rows.reduce((sum, row) => {
    const quantity = Number($(".purchase-line-quantity", row)?.value || 0);
    const unitCost = Number($(".purchase-line-unit-cost", row)?.value || 0);
    return sum + quantity * unitCost;
  }, 0);

  $("#purchaseTotal").textContent = fmtMoney.format(total);
}

function openModal(id) {
  const dialog = document.getElementById(id);
  if (typeof dialog.showModal === "function") dialog.showModal();
}

function closeModal(id) {
  const dialog = document.getElementById(id);
  dialog?.close();
}

function openProductModal(product = null) {
  $("#productForm").reset();
  $("#productId").value = product?.id || "";
  $("#productModalTitle").textContent = product ? "Editar producto" : "Nuevo producto";
  $("#productName").value = product?.name || "";
  $("#productCategory").value = product?.category || "";
  $("#productPrice").value = product?.price ?? "";
  $("#productStock").value = product?.stock ?? 0;
  $("#productMinStock").value = product?.minStock ?? 0;
  $("#productSupplierName").value = product?.supplierName || "";
  $("#productLocation").value = product?.location || "";
  $("#productBarcode").value = product?.barcode || "";
  openModal("productModal");
}

function openProviderModal(provider = null) {
  $("#providerForm").reset();
  $("#providerId").value = provider?.id || "";
  $("#providerModalTitle").textContent = provider ? "Editar proveedor" : "Nuevo proveedor";
  $("#providerName").value = provider?.name || "";
  $("#providerContactName").value = provider?.contactName || "";
  $("#providerPhone").value = provider?.phone || "";
  $("#providerEmail").value = provider?.email || "";
  $("#providerNotes").value = provider?.notes || "";
  openModal("providerModal");
}

function openPurchaseModal(prefill = null) {
  $("#purchaseForm").reset();
  $("#purchaseDate").value = new Date().toISOString().slice(0, 10);
  $("#purchasePaidAmount").value = 0;
  $("#purchaseStatus").value = "received";
  populatePurchaseProviderSelect();
  const container = $("#purchaseLines");
  container.innerHTML = "";

  if (prefill?.providerId) {
    $("#purchaseProvider").value = prefill.providerId;
  }
  if (prefill?.note) {
    $("#purchaseNotes").value = prefill.note;
  }

  container.appendChild(createPurchaseLine(prefill?.line || {}));
  updatePurchaseTotal();
  openModal("purchaseModal");
}

function openPurchaseDetail(purchase) {
  $("#purchaseDetailTitle").textContent = `Compra ${purchase.reference}`;
  $("#purchaseDetailContent").innerHTML = `
    <div class="purchase-detail-grid">
      <div class="detail-meta">
        <div class="detail-meta-card"><span>Proveedor</span><strong>${escapeHtml(purchase.providerName)}</strong></div>
        <div class="detail-meta-card"><span>Fecha</span><strong>${formatDate(purchase.purchasedAt)}</strong></div>
        <div class="detail-meta-card"><span>Total</span><strong>${fmtMoney.format(purchase.total || 0)}</strong></div>
        <div class="detail-meta-card"><span>Saldo</span><strong>${fmtMoney.format(purchase.balance || 0)}</strong></div>
      </div>
      <div class="table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Costo</th>
              <th>Subtotal</th>
              <th>Lote</th>
              <th>Vencimiento</th>
            </tr>
          </thead>
          <tbody>
            ${purchase.lines.map((line) => `
              <tr>
                <td>${escapeHtml(line.productName)}</td>
                <td>${line.quantity}</td>
                <td>${fmtMoney.format(line.unitCost || 0)}</td>
                <td>${fmtMoney.format(line.subtotal || 0)}</td>
                <td>${escapeHtml(line.lotCode || "-")}</td>
                <td>${line.expiry ? formatDate(line.expiry) : "-"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="detail-meta-card">
        <span>Notas</span>
        <strong>${escapeHtml(purchase.notes || "Sin notas")}</strong>
      </div>
    </div>
  `;
  openModal("purchaseDetailModal");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) return "-";
  return fmtDate.format(new Date(value));
}

async function loadDashboard() {
  state.dashboard = await api("/api/dashboard");
  renderDashboard();
}

async function loadProducts() {
  const query = new URLSearchParams();
  if (state.productFilters.q) query.set("q", state.productFilters.q);
  if (state.productFilters.category) query.set("category", state.productFilters.category);
  if (state.productFilters.status) query.set("status", state.productFilters.status);
  if (state.productFilters.sort) query.set("sort", state.productFilters.sort);

  const data = await api(`/api/products?${query.toString()}`);
  state.products = data.items || [];
  state.productMeta = data.meta || { categories: [] };
  renderProducts();
}

async function loadProviders() {
  const data = await api("/api/providers");
  state.providers = data.items || [];
  renderProviders();
  populatePurchaseProviderSelect();
}

async function loadPurchases() {
  const query = new URLSearchParams();
  if (state.purchaseSearch) query.set("q", state.purchaseSearch);
  const data = await api(`/api/purchases?${query.toString()}`);
  state.purchases = data.items || [];
  renderPurchases();
}

async function loadLots() {
  const query = new URLSearchParams();
  if (state.lotFilters.q) query.set("q", state.lotFilters.q);
  if (state.lotFilters.status) query.set("status", state.lotFilters.status);
  if (state.lotFilters.days) query.set("days", state.lotFilters.days);
  if (state.lotFilters.sort) query.set("sort", state.lotFilters.sort);

  const data = await api(`/api/lots?${query.toString()}`);
  state.lots = data.items || [];
  renderLots();
}

async function loadAlerts() {
  const query = new URLSearchParams();
  query.set("days", state.lotFilters.days || "30");
  state.alerts = await api(`/api/alerts?${query.toString()}`);
  renderAlerts();
}

async function refreshAll() {
  try {
    setConnectionStatus("Actualizando información...", true);
    await Promise.all([loadDashboard(), loadProviders(), loadProducts(), loadPurchases(), loadLots(), loadAlerts()]);
    syncFilterInputs();
    renderSidebarAlerts();
    setConnectionStatus("Backend conectado y listo para trabajar.", true);
  } catch (error) {
    console.error(error);
    setConnectionStatus("No pudimos conectar la API.", false);
    showToast(error.message || "No pudimos cargar el sistema.", "error");
  }
}

async function handleProductSubmit(event) {
  event.preventDefault();
  const id = $("#productId").value;
  const payload = {
    name: $("#productName").value,
    category: $("#productCategory").value,
    price: Number($("#productPrice").value),
    stock: Number($("#productStock").value),
    minStock: Number($("#productMinStock").value),
    supplierName: $("#productSupplierName").value,
    location: $("#productLocation").value,
    barcode: $("#productBarcode").value,
  };

  const button = $("#saveProductBtn");
  const original = button.textContent;
  button.textContent = "Guardando...";
  button.disabled = true;

  try {
    if (id) {
      await api(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      showToast("Producto actualizado.", "success");
    } else {
      await api("/api/products", { method: "POST", body: JSON.stringify(payload) });
      showToast("Producto creado.", "success");
    }
    closeModal("productModal");
    await refreshAll();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.textContent = original;
    button.disabled = false;
  }
}

async function handleProviderSubmit(event) {
  event.preventDefault();
  const id = $("#providerId").value;
  const payload = {
    name: $("#providerName").value,
    contactName: $("#providerContactName").value,
    phone: $("#providerPhone").value,
    email: $("#providerEmail").value,
    notes: $("#providerNotes").value,
  };

  const button = $("#saveProviderBtn");
  const original = button.textContent;
  button.textContent = "Guardando...";
  button.disabled = true;

  try {
    if (id) {
      await api(`/api/providers/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      showToast("Proveedor actualizado.", "success");
    } else {
      await api("/api/providers", { method: "POST", body: JSON.stringify(payload) });
      showToast("Proveedor creado.", "success");
    }
    closeModal("providerModal");
    await refreshAll();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.textContent = original;
    button.disabled = false;
  }
}

async function handlePurchaseSubmit(event) {
  event.preventDefault();
  const rows = $$("#purchaseLines .purchase-line");

  const payload = {
    providerId: $("#purchaseProvider").value,
    reference: $("#purchaseReference").value,
    purchasedAt: $("#purchaseDate").value,
    status: $("#purchaseStatus").value,
    paidAmount: Number($("#purchasePaidAmount").value || 0),
    notes: $("#purchaseNotes").value,
    lines: rows.map((row) => ({
      productId: $(".purchase-line-product", row).value,
      quantity: Number($(".purchase-line-quantity", row).value || 0),
      unitCost: Number($(".purchase-line-unit-cost", row).value || 0),
      expiry: $(".purchase-line-expiry", row).value || null,
      lotCode: $(".purchase-line-lot-code", row).value,
    })),
  };

  const button = $("#savePurchaseBtn");
  const original = button.textContent;
  button.textContent = "Guardando...";
  button.disabled = true;

  try {
    await api("/api/purchases", { method: "POST", body: JSON.stringify(payload) });
    showToast("Compra registrada y stock actualizado.", "success");
    closeModal("purchaseModal");
    await refreshAll();
    switchView("purchases");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.textContent = original;
    button.disabled = false;
  }
}

async function resetDemoData() {
  if (!window.confirm("Esto va a restaurar los datos demo. ¿Seguimos?")) return;
  try {
    await api("/api/reset-demo", { method: "POST" });
    showToast("Datos demo restaurados.", "success");
    await refreshAll();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function deleteProduct(id) {
  if (!window.confirm("¿Querés borrar este producto?")) return;
  try {
    await api(`/api/products/${id}`, { method: "DELETE" });
    showToast("Producto eliminado.", "success");
    await refreshAll();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function deleteProvider(id) {
  if (!window.confirm("¿Querés borrar este proveedor?")) return;
  try {
    await api(`/api/providers/${id}`, { method: "DELETE" });
    showToast("Proveedor eliminado.", "success");
    await refreshAll();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function bindEvents() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  $$("[data-go-view]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.goView));
  });

  $("#quickNewProduct").addEventListener("click", () => {
    switchView("products");
    openProductModal();
  });
  $("#quickNewPurchase").addEventListener("click", () => {
    switchView("purchases");
    openPurchaseModal();
  });
  $("#quickNewProvider").addEventListener("click", () => {
    switchView("providers");
    openProviderModal();
  });
  $("#quickLotsBtn").addEventListener("click", () => switchView("lots"));

  $("#refreshBtn").addEventListener("click", refreshAll);
  $("#resetDemoBtn").addEventListener("click", resetDemoData);

  $("#newProductBtn").addEventListener("click", () => openProductModal());
  $("#newPurchaseBtn").addEventListener("click", () => openPurchaseModal());
  $("#newProviderBtn").addEventListener("click", () => openProviderModal());
  $("#goToAlertsBtn").addEventListener("click", () => switchView("alerts"));

  $("#productSearch").addEventListener("input", debounce((event) => {
    state.productFilters.q = event.target.value.trim();
    loadProducts().catch(handleLoadError);
  }, 250));

  $("#productCategoryFilter").addEventListener("change", (event) => {
    state.productFilters.category = event.target.value;
    loadProducts().catch(handleLoadError);
  });

  $("#productStatusFilter").addEventListener("change", (event) => {
    state.productFilters.status = event.target.value;
    loadProducts().catch(handleLoadError);
  });

  $("#productSort").addEventListener("change", (event) => {
    state.productFilters.sort = event.target.value;
    loadProducts().catch(handleLoadError);
  });

  $("#purchaseSearch").addEventListener("input", debounce((event) => {
    state.purchaseSearch = event.target.value.trim();
    loadPurchases().catch(handleLoadError);
  }, 250));

  $("#lotSearch").addEventListener("input", debounce((event) => {
    state.lotFilters.q = event.target.value.trim();
    Promise.all([loadLots(), loadAlerts()]).catch(handleLoadError);
  }, 250));

  $("#lotStatusFilter").addEventListener("change", (event) => {
    state.lotFilters.status = event.target.value;
    Promise.all([loadLots(), loadAlerts()]).catch(handleLoadError);
  });

  $("#lotDaysFilter").addEventListener("change", (event) => {
    state.lotFilters.days = event.target.value;
    Promise.all([loadLots(), loadAlerts(), loadDashboard()]).catch(handleLoadError);
  });

  $("#lotSort").addEventListener("change", (event) => {
    state.lotFilters.sort = event.target.value;
    loadLots().catch(handleLoadError);
  });

  $("#productForm").addEventListener("submit", handleProductSubmit);
  $("#providerForm").addEventListener("submit", handleProviderSubmit);
  $("#purchaseForm").addEventListener("submit", handlePurchaseSubmit);

  $("#addPurchaseLineBtn").addEventListener("click", () => {
    $("#purchaseLines").appendChild(createPurchaseLine());
    updatePurchaseTotal();
  });

  document.body.addEventListener("click", async (event) => {
    const productEditId = event.target.closest("[data-edit-product]")?.dataset.editProduct;
    if (productEditId) {
      const product = state.products.find((item) => item.id === productEditId);
      if (product) openProductModal(product);
      return;
    }

    const productDeleteId = event.target.closest("[data-delete-product]")?.dataset.deleteProduct;
    if (productDeleteId) {
      await deleteProduct(productDeleteId);
      return;
    }

    const providerEditId = event.target.closest("[data-edit-provider]")?.dataset.editProvider;
    if (providerEditId) {
      const provider = state.providers.find((item) => item.id === providerEditId);
      if (provider) openProviderModal(provider);
      return;
    }

    const providerDeleteId = event.target.closest("[data-delete-provider]")?.dataset.deleteProvider;
    if (providerDeleteId) {
      await deleteProvider(providerDeleteId);
      return;
    }

    const alertView = event.target.closest("[data-alert-go-view]")?.dataset.alertGoView;
    if (alertView) {
      switchView(alertView);
      return;
    }

    const alertResolveKey = event.target.closest("[data-alert-resolve-key]")?.dataset.alertResolveKey;
    if (alertResolveKey) {
      await resolveAlertKey(alertResolveKey);
      return;
    }

    const alertAction = event.target.closest("[data-alert-action]");
    if (alertAction) {
      const type = alertAction.dataset.alertAction;
      const refId = alertAction.dataset.alertRefId;
      const refText = alertAction.dataset.alertRefText || "";

      if (type === "lot") {
        await focusLotIssue(refId, refText);
        return;
      }
      if (type === "markExpired") {
        await markLotExpired(refId);
        return;
      }
      if (type === "promoteLot") {
        await promoteLotFromAlert(refId);
        return;
      }
      if (type === "buy") {
        await startReplenishment(refId);
        return;
      }
    }

    const shortcut = event.target.closest("[data-alert-shortcut]")?.dataset.alertShortcut;
    if (shortcut) {
      if (shortcut === "critical") {
        switchView("alerts");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (shortcut === "restock") {
        const target = state.alerts?.outOfStockProducts?.[0]?.id || state.alerts?.lowStockProducts?.[0]?.id;
        if (target) {
          await startReplenishment(target);
        } else {
          switchView("purchases");
          openPurchaseModal();
        }
        return;
      }
      if (shortcut === "lots") {
        switchView("lots");
        return;
      }
    }

    const purchaseViewId = event.target.closest("[data-view-purchase]")?.dataset.viewPurchase;
    if (purchaseViewId) {
      const detail = await api(`/api/purchases/${purchaseViewId}`);
      openPurchaseDetail(detail.item);
      return;
    }

    const closeModalId = event.target.closest("[data-close-modal]")?.dataset.closeModal;
    if (closeModalId) {
      closeModal(closeModalId);
    }
  });

  $("#contextPrimaryAction").addEventListener("click", () => {});

  $$("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      const inside = rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX && event.clientX <= rect.left + rect.width;
      if (!inside) dialog.close();
    });
  });
}

function handleLoadError(error) {
  console.error(error);
  showToast(error.message || "No pudimos cargar los datos.", "error");
}

function debounce(fn, wait = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

async function init() {
  bindEvents();
  updateHeaderForView("dashboard");
  try {
    await refreshAll();
  } catch (error) {
    handleLoadError(error);
  }
}

window.addEventListener("DOMContentLoaded", init);
