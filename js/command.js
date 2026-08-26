(() => {
  const MASK = { nick: 1, badge: 2, cinfo: 4, role: 8, unit: 16, power: 32 };
  const ITEM_SRC = { vanilla: "vanilla", v: "vanilla", exiled: "exiled", e: "exiled", capi: "capi", c: "capi" };

  const clamp = (n, min, max, fallback) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return fallback;
    return Math.max(min, Math.min(max, v));
  };

  const emptyAmmo = (data) => Object.fromEntries(data.ammo.map((a) => [a.id, 0]));

  const emptyCharacter = (data) => ({
    targets: [],
    role: "None",
    useNick: false,
    nick: "",
    useCinfo: false,
    cinfo: "",
    useHp: false,
    hp: 100,
    useRoleInfo: true,
    useBadge: false,
    useUnit: false,
    items: Array(data.inventorySlots).fill(null),
    ammo: emptyAmmo(data),
    maskTouched: false,
  });

  const composeMask = (char) =>
    (char.useNick ? MASK.nick : 0) |
    (char.useBadge ? MASK.badge : 0) |
    (char.useCinfo ? MASK.cinfo : 0) |
    (char.useRoleInfo ? MASK.role : 0) |
    (char.useUnit ? MASK.unit : 0);

  const resolveRole = (raw, data) => {
    const id = String(raw || "").trim();
    if (!id || id === "-" || id.toLowerCase() === "none") return "None";
    const exact = data.roles.find((r) => r.id === id);
    if (exact) return exact.id;
    const lower = data.roles.find((r) => r.id.toLowerCase() === id.toLowerCase());
    return lower ? lower.id : "None";
  };

  const parseItemToken = (token) => {
    const idx = token.indexOf(":");
    if (idx > 0) {
      const src = token.slice(0, idx).trim().toLowerCase();
      const value = token.slice(idx + 1).trim();
      if (ITEM_SRC[src] && value) return { source: ITEM_SRC[src], value };
    }
    return { source: "auto", value: token };
  };

  const fillItems = (list, slots) => {
    const items = Array(slots).fill(null);
    (list || []).forEach((it, i) => {
      if (it && i < slots) items[i] = it;
    });
    return items;
  };

  const parseAmmoField = (text, data) => {
    const ammo = emptyAmmo(data);
    String(text || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const [name, qty] = pair.split(":");
        const found = data.ammo.find(
          (a) =>
            a.id.toLowerCase() === String(name).toLowerCase() ||
            a.aliases.some((x) => x.toLowerCase() === String(name).toLowerCase())
        );
        if (found) ammo[found.id] = clamp(qty, 0, 65535, 0);
      });
    return ammo;
  };

  const splitFields = (body) => {
    const parts = body.split(";");
    if (parts.length <= 7) return parts;
    const out = new Array(7);
    out[0] = parts[0];
    out[1] = parts.slice(1, parts.length - 5).join(";");
    for (let i = 2; i < 7; i++) out[i] = parts[parts.length - 7 + i];
    return out;
  };

  const applyMaskBits = (char, mask, payload) => {
    const m = Number(mask) & 63;
    const take = (key, bit, keepOn) => {
      if (!payload || payload[key] == null) char[key] = Boolean(m & bit) || Boolean(keepOn);
    };
    take("useNick", MASK.nick);
    take("useBadge", MASK.badge);
    take("useCinfo", MASK.cinfo, char.useCinfo);
    take("useRoleInfo", MASK.role);
    take("useUnit", MASK.unit);
  };

  const toCommand = (char, data) => {
    const targets = char.targets.length ? char.targets.join(",") : "<цель>";
    const role = char.role === "None" ? "" : char.role;
    const cinfo = char.useCinfo ? String(char.cinfo || "").replace(/;/g, ",") : "";
    const nick = char.useNick ? String(char.nick || "").replace(/;/g, ",") : "";
    const hp = char.useHp ? String(char.hp) : "";
    const items = (char.items || [])
      .filter(Boolean)
      .map((it) => (it.source && it.source !== "auto" ? `${it.source}:${it.value}` : it.value))
      .join(",");
    const ammo = data.ammo
      .filter((a) => Number(char.ammo[a.id]) > 0)
      .map((a) => `${a.id}:${char.ammo[a.id]}`)
      .join(",");
    const mask = char.maskTouched ? String(composeMask(char) & 63) : "";
    return `${data.commandName} ${targets} ${[role, cinfo, nick, hp, items, ammo, mask].join(";")}`;
  };

  const fromCommand = (text, data) => {
    const cleaned = String(text || "").trim().replace(/^CC#/i, "");
    const m = cleaned.match(/^(cc|createcharacter)\s+(\S+)\s+([\s\S]+)$/i);
    if (!m) throw new Error("Ожидается: cc <цели> <поля>");
    const char = emptyCharacter(data);
    char.targets = m[2]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const fields = splitFields(m[3]);
    char.role = resolveRole(fields[0], data);
    char.cinfo = fields[1] ?? "";
    char.useCinfo = Boolean(char.cinfo);
    char.nick = (fields[2] ?? "").trim();
    char.useNick = Boolean(char.nick);
    const hpRaw = (fields[3] ?? "").trim();
    if (hpRaw) {
      char.useHp = true;
      char.hp = clamp(hpRaw, 1, data.maxHealth, 100);
    }
    String(fields[4] || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((token, i) => {
        if (i < data.inventorySlots) char.items[i] = parseItemToken(token);
      });
    char.ammo = parseAmmoField(fields[5], data);
    const maskRaw = (fields[6] ?? "").trim();
    if (maskRaw === "") {
      char.maskTouched = false;
      char.useRoleInfo = true;
    } else {
      char.maskTouched = true;
      applyMaskBits(char, maskRaw, null);
    }
    return char;
  };

  const toSnapshot = (char) => ({
    role: char.role,
    useNick: char.useNick,
    nick: char.nick,
    useCinfo: char.useCinfo,
    cinfo: char.cinfo,
    useHp: char.useHp,
    hp: char.hp,
    useRoleInfo: char.useRoleInfo,
    useBadge: char.useBadge,
    useUnit: char.useUnit,
    items: (char.items || []).filter(Boolean),
    ammo: { ...char.ammo },
    mask: composeMask(char) & 63,
    maskTouched: char.maskTouched,
  });

  const applySnapshot = (current, payload, data) => {
    const next = emptyCharacter(data);
    next.targets = Array.isArray(current?.targets) ? [...current.targets] : [];
    if (!payload) return next;
    next.role = resolveRole(payload.role, data);
    next.useNick = Boolean(payload.useNick);
    next.nick = payload.nick || "";
    next.useCinfo = Boolean(payload.useCinfo);
    next.cinfo = payload.cinfo || "";
    next.useHp = Boolean(payload.useHp);
    next.hp = clamp(payload.hp, 1, data.maxHealth, 100);
    next.items = fillItems(payload.items, data.inventorySlots);
    const ammo = emptyAmmo(data);
    data.ammo.forEach((a) => {
      ammo[a.id] = clamp((payload.ammo || {})[a.id], 0, 65535, 0);
    });
    next.ammo = ammo;
    if (payload.useRoleInfo != null) next.useRoleInfo = Boolean(payload.useRoleInfo);
    if (payload.useBadge != null) next.useBadge = Boolean(payload.useBadge);
    if (payload.useUnit != null) next.useUnit = Boolean(payload.useUnit);
    next.maskTouched = payload.maskTouched != null ? Boolean(payload.maskTouched) : Number(payload.mask) !== 0;
    if (next.maskTouched) applyMaskBits(next, payload.mask, payload);
    return next;
  };

  const api = {
    MASK,
    emptyCharacter,
    composeMask,
    parseItemToken,
    toCommand,
    fromCommand,
    toSnapshot,
    applySnapshot,
  };
  if (typeof window !== "undefined") window.CCCommand = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
