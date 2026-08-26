(() => {
  const ARMOR_KIND = { ArmorLight: "light", ArmorCombat: "combat", ArmorHeavy: "heavy" };
  const ARMOR_FILE = { light: "LightArmor", combat: "CombatArmor", heavy: "HeavyArmor" };

  const fileSafe = (value) =>
    String(value || "")
      .trim()
      .replace(/[<>:"/\\|?*]/g, "_");

  const modelBase = (roleId) => {
    if (/^Ntf(?!Flamingo)/.test(roleId)) return "NTF";
    if (/^Chaos(?!Flamingo)/.test(roleId)) return "Chaos";
    return roleId;
  };

  const equippedArmor = (roleId, items, armorRoles) => {
    if (!armorRoles.has(roleId)) return "";
    let kind = "";
    (items || []).forEach((it) => {
      if (!it) return;
      if ((!it.source || it.source === "auto" || it.source === "vanilla") && ARMOR_KIND[it.value]) {
        kind = ARMOR_KIND[it.value];
      }
    });
    return kind;
  };

  const pair = (base) => [`${base}.png`, `${base}.svg`];

  const urlsFor = (kind, id, extra) => {
    if (kind === "role-model") {
      const shared = modelBase(id);
      const armor = ARMOR_FILE[extra];
      const urls = [];
      if (armor) urls.push(...pair(`./assets/roles/model/${shared}_${armor}`));
      urls.push(...pair(`./assets/roles/model/${shared}`));
      if (shared !== id) urls.push(...pair(`./assets/roles/model/${id}`));
      return urls;
    }
    if (kind === "role-art") return pair(`./assets/roles/art/${id}`);
    if (kind === "item") return pair(`./assets/items/${id}`);
    if (kind === "custom") {
      const src = extra || "exiled";
      const safe = fileSafe(id);
      return [...pair(`./assets/items/custom/${src}/${safe}`), ...pair(`./assets/items/custom/${src}`)];
    }
    return pair(`./assets/ammo/${id}`);
  };

  let seq = 0;

  const bindImg = (img, kind, id, extra) => {
    if (!img || !id) return;
    const chain = urlsFor(kind, id, extra);
    const key = chain.join("|");
    if (img.dataset.boundKey === key && img.getAttribute("src") && !img.dataset.failed) return;
    img.dataset.boundKey = key;
    img.dataset.failed = "";
    img.alt = id;
    const gen = String(++seq);
    img.dataset.gen = gen;
    let i = 0;
    const tryNext = () => {
      if (img.dataset.gen !== gen) return;
      if (i >= chain.length) {
        img.dataset.failed = "1";
        return;
      }
      img.src = chain[i++];
    };
    img.onload = () => {
      if (img.dataset.gen !== gen) return;
      img.dataset.failed = "";
    };
    img.onerror = tryNext;
    tryNext();
  };

  const api = { equippedArmor, urlsFor, bindImg, modelBase };
  if (typeof window !== "undefined") window.CCAssets = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
