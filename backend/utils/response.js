// Consistent API response helpers used across all controllers
const ok = (res, data, meta) => {
  const payload = { success: true, data };
  if (meta) payload.meta = meta;
  return res.json(payload);
};

const fail = (res, status, message, code) => {
  return res.status(status).json({ success: false, message, ...(code && { code }) });
};

module.exports = { ok, fail };
