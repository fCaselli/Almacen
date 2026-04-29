export function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parsePagination(query = {}, defaults = {}) {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    maxLimit = 100,
  } = defaults;

  const page = parsePositiveInt(query.page, defaultPage);
  const requestedLimit = parsePositiveInt(query.limit, defaultLimit);
  const limit = Math.min(requestedLimit, maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function parseSort(query = {}, defaults = {}) {
  const { defaultSort = 'createdAt', defaultOrder = 'desc', allowedSorts = [] } = defaults;
  const sort = allowedSorts.includes(query.sort) ? query.sort : defaultSort;
  const order = String(query.order || defaultOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';
  return { sort, order };
}

export function buildPaginationMeta({ total, page, limit, sort, order, extra = {} }) {
  const totalItems = Number(total || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    total: totalItems,
    page,
    limit,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
    sort,
    order,
    ...extra,
  };
}
