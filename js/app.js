(() => {
  const D = window.CC_DATA;
  const Cmd = window.CCCommand;
  const Assets = window.CCAssets;
  const $ = (id) => document.getElementById(id);
  const ARMOR_ROLES = new Set(D.armorRoles || []);

  let char = Cmd.emptyCharacter(D);
  const ui = {
    slotIndex: -1,
    roleFaction: "all",
    itemCategory: "all",
    customSrc: "exiled",
    tplTab: "server",
  };

  const localTpls = { folders: [{ id: "mine", name: "Мои", open: true, items: [] }] };
  let serverTpls = D.serverTemplates || { folders: [] };
  let presetCustom = [...(D.customItems || [])];
  let userCustom = [];

  const roleById = Object.fromEntries(D.roles.map((r) => [r.id, r]));
  const itemById = Object.fromEntries(D.items.map((i) => [i.id, i]));

  const toast = (text) => {
    const el = $("toast");
    el.textContent = text;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1400);
  };

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const isCustomItem = (it) => it && (it.source === "exiled" || it.source === "capi");
  const isPresetCustom = (source, value) =>
    presetCustom.some((p) => p.source === source && String(p.value) === String(value));
  const catalogFor = (source) => [
    ...presetCustom.filter((p) => p.source === source),
    ...userCustom.filter((p) => p.source === source && !isPresetCustom(p.source, p.value)),
  ];

  const rememberCustom = (item) => {
    if (!isCustomItem(item) || isPresetCustom(item.source, item.value)) return;
    const key = `${item.source}:${item.value}`;
    userCustom = [
      { source: item.source, value: item.value, name: item.name || item.value },
      ...userCustom.filter((c) => `${c.source}:${c.value}` !== key),
    ].slice(0, 40);
  };

  const addCustomToList = (source, value, name) => {
    const id = String(value || "").trim();
    if (!id) return false;
    if (isPresetCustom(source, id) || userCustom.some((c) => c.source === source && String(c.value) === id)) {
      toast("Уже в списке");
      return false;
    }
    userCustom.unshift({ source, value: id, name: (name || id).trim() });
    return true;
  };

  const addCustomToSlot = (source, value, slot, name) => {
    const id = String(value || "").trim();
    if (!id) return false;
    const index = slot >= 0 ? slot : char.items.findIndex((it) => !it);
    if (index < 0) {
      toast("Нет свободных слотов");
      return false;
    }
    const item = { source, value: id };
    char.items[index] = item;
    rememberCustom({ ...item, name: name || id });
    return true;
  };

  const presetsFromFile = (data) => {
    if (!data) return null;
    if (Array.isArray(data) && data[0]?.source) return data;
    const out = [];
    const push = (source, list) => {
      (list || []).forEach((it) => {
        const value = String(it.id ?? it.value ?? "").trim();
        if (value) out.push({ source, value, name: it.name || value });
      });
    };
    push("exiled", data.exiled);
    push("capi", data.capi);
    return out.length ? out : null;
  };

  const setSwitch = (btn, on) => {
    if (!btn) return;
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", String(on));
  };

  const unityToHtml = (raw) => {
    if (!raw) return "";
    return raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/&lt;b&gt;/gi, "<b>")
      .replace(/&lt;\/b&gt;/gi, "</b>")
      .replace(/&lt;i&gt;/gi, "<i>")
      .replace(/&lt;\/i&gt;/gi, "</i>")
      .replace(/&lt;u&gt;/gi, "<u>")
      .replace(/&lt;\/u&gt;/gi, "</u>")
      .replace(/&lt;size=(\d+(?:\.\d+)?)&gt;/gi, '<span style="font-size:$1px">')
      .replace(/&lt;\/size&gt;/gi, "</span>")
      .replace(
        /&lt;color=(?:&quot;|")?(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)(?:&quot;|")?&gt;/gi,
        '<span style="color:$1">'
      )
      .replace(/&lt;\/color&gt;/gi, "</span>")
      .replace(/\n/g, "<br>");
  };

  const wrapSelection = (textarea, before, after) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.slice(start, end) || "текст";
    textarea.value = value.slice(0, start) + before + selected + after + value.slice(end);
    textarea.focus();
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    char.cinfo = textarea.value;
    paintLive();
  };

  const commandText = () => Cmd.toCommand(char, D);

  const paintCommand = () => {
    $("command").textContent = commandText();
  };

  const paintTargets = () => {
    $("targetChips").innerHTML = char.targets
      .map((t, i) => `<span class="target-chip">${escapeHtml(t)}<button type="button" data-del="${i}">✕</button></span>`)
      .join("");
  };

  const paintNameplate = () => {
    const role = roleById[char.role];
    const cinfo = char.useCinfo && char.cinfo ? `<div class="np-cinfo">${unityToHtml(char.cinfo)}</div>` : "";
    const nick = char.useNick
      ? `<div class="np-nick${char.nick ? "" : " dim"}">${escapeHtml(char.nick || "настоящий ник")}</div>`
      : "";
    const roleInfo =
      char.useRoleInfo && char.role !== "None" ? `<div class="np-role">${escapeHtml(role.name)}</div>` : "";
    const chips = [];
    if (char.useBadge) chips.push(`<span class="chip">бейдж</span>`);
    if (char.useUnit) chips.push(`<span class="chip">отряд</span>`);
    $("nameplate").innerHTML = `${cinfo}${nick}${roleInfo}${
      chips.length ? `<div class="meta">${chips.join("")}</div>` : ""
    }`;
  };

  const paintPreview = () => {
    const role = roleById[char.role];
    const keep = char.role === "None";
    const armor = Assets.equippedArmor(char.role, char.items, ARMOR_ROLES);
    $("previewEmpty").style.display = keep ? "grid" : "none";
    $("roleImg").style.display = keep ? "none" : "block";
    $("roleFallback").style.display = keep ? "none" : "grid";
    $("roleFallback").textContent = role.id;
    if (!keep) Assets.bindImg($("roleImg"), "role-model", role.id, armor);
    Assets.bindImg($("roleThumb"), "role-art", role.id);
    $("roleName").textContent = role.name;
    $("roleId").textContent = role.id;
    $("hpLabel").textContent = char.useHp ? `${char.hp}` : char.role === "None" ? "не менять" : "HP класса";
    $("hpFill").style.width = char.useHp ? `${Math.min(100, char.hp)}%` : "40%";
    $("hpFill").classList.toggle("dim", !char.useHp);
    paintNameplate();
  };

  const itemLabel = (it) => {
    if (!it) return "";
    if (it.source && it.source !== "auto") return `${it.source}:${it.value}`;
    return itemById[it.value]?.name || it.value;
  };

  const bindItemImg = (img, it) => {
    if (!img || !it) return;
    if (isCustomItem(it)) Assets.bindImg(img, "custom", it.value, it.source);
    else Assets.bindImg(img, "item", it.value);
  };

  const paintSlot = (el, it, index, mini) => {
    el.className = `slot ${it ? "filled" : ""} ${index === ui.slotIndex ? "selected" : ""}`;
    el.dataset.slot = index;
    if (!it) {
      el.innerHTML = mini ? "" : `<span class="empty-text">+</span>`;
      return;
    }
    const showImg =
      isCustomItem(it) || ((!it.source || it.source === "auto" || it.source === "vanilla") && itemById[it.value]);
    el.innerHTML = `
      ${showImg ? `<img alt="" />` : ""}
      <span class="label">${escapeHtml(itemLabel(it))}</span>
      ${mini ? "" : `<button class="slot-x" type="button" data-clear="${index}">✕</button>`}
    `;
    const img = el.querySelector("img");
    if (img) bindItemImg(img, it);
  };

  const paintInventory = () => {
    const grid = $("invGrid");
    const mini = $("invMini");
    if (!grid.children.length) {
      grid.innerHTML = char.items.map((_, i) => `<div class="slot" data-slot="${i}"></div>`).join("");
      mini.innerHTML = char.items.map((_, i) => `<div class="slot" data-slot="${i}"></div>`).join("");
    }
    [...grid.children].forEach((el, i) => paintSlot(el, char.items[i], i, false));
    [...mini.children].forEach((el, i) => paintSlot(el, char.items[i], i, true));
  };

  const paintCustomGrid = () => {
    const list = catalogFor(ui.customSrc);
    $("customGrid").innerHTML = list
      .map((c) => {
        const locked = isPresetCustom(c.source, c.value);
        const label = c.name && c.name !== c.value ? c.name : c.value;
        const sub = c.name && c.name !== c.value ? c.value : c.source;
        return `
      <div class="custom-tile" data-csrc="${c.source}" data-cval="${escapeHtml(c.value)}">
        <img alt="" />
        <div class="meta">
          <b>${escapeHtml(label)}</b>
          <small>${escapeHtml(sub)}</small>
        </div>
        ${locked ? "" : `<button class="custom-x" type="button" data-del-custom title="Удалить">✕</button>`}
      </div>`;
      })
      .join("");
    [...$("customGrid").children].forEach((el) => {
      Assets.bindImg(el.querySelector("img"), "custom", el.dataset.cval, el.dataset.csrc);
    });
  };

  const paintAmmo = () => {
    if (!$("ammoList").children.length) {
      $("ammoList").innerHTML = D.ammo
        .map(
          (a) => `
        <div class="ammo-row">
          <img alt="" data-ammo="${a.id}" />
          <span>${a.label}</span>
          <input type="range" min="0" max="65535" value="0" data-ammo-range="${a.id}" />
          <input class="input" type="number" min="0" max="65535" value="0" data-ammo-num="${a.id}" />
        </div>`
        )
        .join("");
      D.ammo.forEach((a) => Assets.bindImg(document.querySelector(`[data-ammo="${a.id}"]`), "ammo", a.id));
    }
    D.ammo.forEach((a) => {
      const v = char.ammo[a.id] || 0;
      const range = document.querySelector(`[data-ammo-range="${a.id}"]`);
      const num = document.querySelector(`[data-ammo-num="${a.id}"]`);
      if (range && document.activeElement !== range) range.value = v;
      if (num && document.activeElement !== num) num.value = v;
    });
  };

  const paintToggles = () => {
    setSwitch($("nickToggle"), char.useNick);
    setSwitch($("cinfoToggle"), char.useCinfo);
    setSwitch($("roleInfoToggle"), char.useRoleInfo);
    setSwitch($("badgeToggle"), char.useBadge);
    setSwitch($("unitToggle"), char.useUnit);
    setSwitch($("hpToggle"), char.useHp);
    $("nickReveal").classList.toggle("open", char.useNick);
    $("cinfoReveal").classList.toggle("open", char.useCinfo);
    $("hpReveal").classList.toggle("open", char.useHp);
  };

  const syncFields = () => {
    if (document.activeElement !== $("nickInput")) $("nickInput").value = char.nick;
    if (document.activeElement !== $("cinfoInput")) $("cinfoInput").value = char.cinfo;
    if (document.activeElement !== $("hpInput")) $("hpInput").value = char.hp;
    if (document.activeElement !== $("hpRange")) $("hpRange").value = char.hp;
    $("cinfoCount").textContent = `${char.cinfo.length}`;
  };

  const currentFolders = () => (ui.tplTab === "server" ? serverTpls.folders : localTpls.folders);

  const paintTemplates = () => {
    const folders = currentFolders() || [];
    const editable = ui.tplTab === "local";
    $("localActions").hidden = !editable;
    $("tplHint").hidden = ui.tplTab !== "server";
    if (!folders.length) {
      $("tplTree").innerHTML = `<p class="empty-side">${editable ? "Нет шаблонов" : "Нет серверных шаблонов"}</p>`;
      return;
    }
    $("tplTree").innerHTML = folders
      .map((folder) => {
        const items = folder.items || [];
        return `
        <div class="folder ${folder.open !== false ? "open" : ""}">
          <button class="folder-h" type="button" data-toggle-folder="${folder.id}">
            <span class="chev">${folder.open !== false ? "▾" : "▸"}</span>
            ${escapeHtml(folder.name)}
            <span class="count">${items.length}</span>
            ${editable ? `<span class="mini" data-del-folder="${folder.id}">✕</span>` : ""}
          </button>
          <div class="folder-list">
            ${
              items.length
                ? items
                    .map(
                      (it) => `
              <div class="tpl-item" data-apply="${folder.id}:${it.id}">
                <span class="name">${escapeHtml(it.name)}</span>
                ${editable ? `<button class="mini" type="button" data-del-tpl="${folder.id}:${it.id}">✕</button>` : ""}
              </div>`
                    )
                    .join("")
                : `<p class="empty-side">пусто</p>`
            }
          </div>
        </div>`;
      })
      .join("");
  };

  const paintLive = () => {
    syncFields();
    paintNameplate();
    paintToggles();
    paintCommand();
  };

  const render = () => {
    syncFields();
    paintTargets();
    paintPreview();
    paintInventory();
    paintAmmo();
    paintCustomGrid();
    paintToggles();
    paintCommand();
  };

  const matchText = (obj, q) => {
    if (!q) return true;
    return `${obj.id} ${obj.name || ""} ${obj.search || ""}`.toLowerCase().includes(q);
  };

  const paintRoleGrid = () => {
    const q = $("roleSearch").value.trim().toLowerCase();
    const list = D.roles.filter((r) => {
      if (ui.roleFaction !== "all" && r.faction !== ui.roleFaction) return false;
      return matchText(r, q);
    });
    $("roleGrid").innerHTML = list
      .map(
        (r) => `
      <button class="tile" type="button" data-role="${r.id}">
        <img alt="" data-role-img="${r.id}" />
        <span>${escapeHtml(r.name)}</span>
      </button>`
      )
      .join("");
    list.forEach((r) => Assets.bindImg(document.querySelector(`[data-role-img="${r.id}"]`), "role-art", r.id));
  };

  const paintItemGrid = () => {
    const q = $("itemSearch").value.trim().toLowerCase();
    const list = D.items.filter((it) => {
      if (it.category === "ammo") return false;
      if (ui.itemCategory !== "all" && it.category !== ui.itemCategory) return false;
      return matchText(it, q);
    });
    $("itemGrid").innerHTML = list
      .map(
        (it) => `
      <button class="tile item-tile" type="button" data-item="${it.id}">
        <img alt="" data-item-img="${it.id}" />
        <b>${escapeHtml(it.name)}</b>
      </button>`
      )
      .join("");
    list.forEach((it) => Assets.bindImg(document.querySelector(`[data-item-img="${it.id}"]`), "item", it.id));
  };

  const openModal = (id) => $(id).classList.add("show");
  const closeModal = (id) => {
    $(id).classList.remove("show");
    if (id === "itemModal") {
      ui.slotIndex = -1;
      paintInventory();
    }
  };

  const addTarget = (raw) => {
    raw.split(",").forEach((part) => {
      const t = part.trim();
      if (!t) return;
      if (t === "*" || t.toLowerCase() === "all" || t === "все") {
        char.targets = ["*"];
        return;
      }
      if (!char.targets.includes(t)) char.targets.push(t);
      char.targets = char.targets.filter((x) => x !== "*");
    });
    render();
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    toast("Скопировано");
  };

  const persist = () => {
    localStorage.setItem("cc-gen", JSON.stringify({ ...char, ...ui, slotIndex: -1 }));
    localStorage.setItem("cc-local-templates", JSON.stringify(localTpls));
    localStorage.setItem("cc-custom-items", JSON.stringify(userCustom));
  };

  const restore = () => {
    try {
      const raw = localStorage.getItem("cc-gen");
      if (raw) {
        const saved = JSON.parse(raw);
        char = Cmd.applySnapshot(char, saved, D);
        char.targets = Array.isArray(saved.targets) ? saved.targets : [];
        ui.roleFaction = saved.roleFaction || "all";
        ui.itemCategory = D.itemCategories.some((c) => c.id === saved.itemCategory) ? saved.itemCategory : "all";
        ui.customSrc = saved.customSrc === "capi" ? "capi" : "exiled";
        ui.tplTab = saved.tplTab === "local" ? "local" : "server";
      }
    } catch {}
    try {
      const raw = localStorage.getItem("cc-local-templates");
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.folders)) localTpls.folders = saved.folders;
      }
    } catch {}
    try {
      const raw = localStorage.getItem("cc-custom-items");
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) {
          userCustom = saved
            .map((c) => ({
              source: c.source,
              value: String(c.value ?? c.id ?? ""),
              name: c.name || String(c.value ?? c.id ?? ""),
            }))
            .filter((c) => c.value && (c.source === "exiled" || c.source === "capi") && !isPresetCustom(c.source, c.value));
        }
      }
    } catch {}
  };

  const uid = (p) => `${p}-${Date.now().toString(36)}`;

  const findTpl = (folderId, tplId) => {
    const folder = currentFolders().find((f) => f.id === folderId);
    return { folder, item: folder?.items?.find((i) => i.id === tplId) };
  };

  $("btnAll").onclick = () => {
    char.targets = ["*"];
    render();
  };
  $("targetInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTarget($("targetInput").value);
      $("targetInput").value = "";
    }
  });
  $("targetInput").addEventListener("blur", () => {
    if ($("targetInput").value.trim()) {
      addTarget($("targetInput").value);
      $("targetInput").value = "";
    }
  });
  $("targetChips").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-del]");
    if (!btn) return;
    char.targets.splice(Number(btn.dataset.del), 1);
    render();
  });

  $("roleBtn").onclick = () => {
    paintRoleGrid();
    openModal("roleModal");
    $("roleSearch").focus();
  };
  $("roleFilters").innerHTML =
    `<button class="pill on" data-fac="all" type="button">Все</button>` +
    D.roleFactions.map((f) => `<button class="pill" data-fac="${f.id}" type="button">${f.label}</button>`).join("");
  $("roleFilters").onclick = (e) => {
    const btn = e.target.closest("[data-fac]");
    if (!btn) return;
    ui.roleFaction = btn.dataset.fac;
    [...$("roleFilters").children].forEach((el) => el.classList.toggle("on", el === btn));
    paintRoleGrid();
  };
  $("roleSearch").oninput = paintRoleGrid;
  $("roleGrid").onclick = (e) => {
    const tile = e.target.closest("[data-role]");
    if (!tile) return;
    char.role = tile.dataset.role;
    closeModal("roleModal");
    render();
  };

  [
    ["nickToggle", "useNick", true, "nickInput"],
    ["cinfoToggle", "useCinfo", true, "cinfoInput"],
    ["roleInfoToggle", "useRoleInfo", true, ""],
    ["badgeToggle", "useBadge", true, ""],
    ["unitToggle", "useUnit", true, ""],
    ["hpToggle", "useHp", false, ""],
  ].forEach(([id, flag, mask, focus]) => {
    $(id).onclick = () => {
      char[flag] = !char[flag];
      if (mask) char.maskTouched = true;
      render();
      if (focus && char[flag]) $(focus).focus();
    };
  });
  $("nickInput").oninput = (e) => {
    char.nick = e.target.value;
    paintLive();
  };
  $("cinfoInput").oninput = (e) => {
    char.cinfo = e.target.value;
    paintLive();
  };

  $("swatches").innerHTML = D.namedColors
    .map((c) => `<button class="swatch" type="button" data-color="${c}" style="background:${c}"></button>`)
    .join("");
  $("cinfoBar").onclick = (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const area = $("cinfoInput");
    if (btn.dataset.wrap === "b") wrapSelection(area, "<b>", "</b>");
    if (btn.dataset.wrap === "i") wrapSelection(area, "<i>", "</i>");
    if (btn.dataset.size) wrapSelection(area, `<size=${$("cinfoSize").value || "20"}>`, "</size>");
    if (btn.dataset.nl) wrapSelection(area, "\n", "");
    if (btn.dataset.color) wrapSelection(area, `<color=${btn.dataset.color}>`, "</color>");
  };

  const syncHp = (v) => {
    char.hp = Math.max(1, Math.min(D.maxHealth, Number(v) || 1));
    paintLive();
    paintPreview();
  };
  $("hpRange").oninput = (e) => syncHp(e.target.value);
  $("hpInput").oninput = (e) => syncHp(e.target.value);

  const openItemPicker = (index) => {
    ui.slotIndex = index;
    $("slotTitle").textContent = String(index + 1);
    paintItemGrid();
    paintInventory();
    openModal("itemModal");
    $("itemSearch").focus();
  };
  $("invGrid").onclick = (e) => {
    const clear = e.target.closest("[data-clear]");
    if (clear) {
      char.items[Number(clear.dataset.clear)] = null;
      render();
      return;
    }
    const slot = e.target.closest("[data-slot]");
    if (slot) openItemPicker(Number(slot.dataset.slot));
  };
  $("invMini").onclick = (e) => {
    const slot = e.target.closest("[data-slot]");
    if (slot) openItemPicker(Number(slot.dataset.slot));
  };
  $("itemFilters").innerHTML = D.itemCategories
    .map((c, i) => `<button class="pill ${i === 0 ? "on" : ""}" data-cat="${c.id}" type="button">${c.label}</button>`)
    .join("");
  $("itemFilters").onclick = (e) => {
    const btn = e.target.closest("[data-cat]");
    if (!btn) return;
    ui.itemCategory = btn.dataset.cat;
    [...$("itemFilters").children].forEach((el) => el.classList.toggle("on", el === btn));
    paintItemGrid();
  };
  $("itemSearch").oninput = paintItemGrid;
  $("itemGrid").onclick = (e) => {
    const tile = e.target.closest("[data-item]");
    if (!tile) return;
    char.items[ui.slotIndex] = { source: "auto", value: tile.dataset.item };
    closeModal("itemModal");
    render();
  };
  $("btnCustomItem").onclick = () => {
    const value = $("customId").value.trim();
    if (!value) return;
    const item = { source: $("customSrc").value, value };
    char.items[ui.slotIndex] = item;
    rememberCustom(item);
    $("customId").value = "";
    closeModal("itemModal");
    render();
  };

  $("customSrcPills").onclick = (e) => {
    const btn = e.target.closest("[data-csrc]");
    if (!btn) return;
    ui.customSrc = btn.dataset.csrc;
    [...$("customSrcPills").children].forEach((el) => el.classList.toggle("on", el === btn));
    paintCustomGrid();
  };
  $("btnAddCustomList").onclick = () => {
    if (addCustomToList(ui.customSrc, $("customName").value)) {
      $("customName").value = "";
      render();
    }
  };
  $("btnAddCustom").onclick = () => {
    if (addCustomToSlot(ui.customSrc, $("customName").value, -1, $("customName").value)) {
      $("customName").value = "";
      render();
    }
  };
  $("customName").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    $("btnAddCustomList").click();
  });
  $("customGrid").onclick = (e) => {
    const del = e.target.closest("[data-del-custom]");
    if (del) {
      const tile = del.closest("[data-cval]");
      if (!tile) return;
      userCustom = userCustom.filter(
        (c) => !(c.source === tile.dataset.csrc && String(c.value) === tile.dataset.cval)
      );
      render();
      return;
    }
    const tile = e.target.closest("[data-cval]");
    if (!tile) return;
    const found = catalogFor(tile.dataset.csrc).find((c) => String(c.value) === tile.dataset.cval);
    if (addCustomToSlot(tile.dataset.csrc, tile.dataset.cval, -1, found?.name)) render();
  };

  $("ammoList").addEventListener("input", (e) => {
    const id = e.target.dataset.ammoRange || e.target.dataset.ammoNum;
    if (!id) return;
    char.ammo[id] = Math.max(0, Math.min(65535, Number(e.target.value) || 0));
    paintAmmo();
    paintCommand();
  });

  document.querySelectorAll("[data-tpl-tab]").forEach((btn) => {
    btn.onclick = () => {
      ui.tplTab = btn.dataset.tplTab;
      document.querySelectorAll("[data-tpl-tab]").forEach((b) => b.classList.toggle("on", b === btn));
      paintTemplates();
    };
  });

  $("tplTree").onclick = (e) => {
    const delTpl = e.target.closest("[data-del-tpl]");
    if (delTpl) {
      e.stopPropagation();
      const [folderId, tplId] = delTpl.dataset.delTpl.split(":");
      const folder = localTpls.folders.find((f) => f.id === folderId);
      if (folder) folder.items = folder.items.filter((i) => i.id !== tplId);
      paintTemplates();
      return;
    }
    const delFolder = e.target.closest("[data-del-folder]");
    if (delFolder) {
      e.stopPropagation();
      if (localTpls.folders.length < 2) return toast("Нужна хотя бы одна папка");
      localTpls.folders = localTpls.folders.filter((f) => f.id !== delFolder.dataset.delFolder);
      paintTemplates();
      return;
    }
    const toggle = e.target.closest("[data-toggle-folder]");
    if (toggle) {
      const folder = currentFolders().find((f) => f.id === toggle.dataset.toggleFolder);
      if (folder) folder.open = folder.open === false;
      paintTemplates();
      return;
    }
    const apply = e.target.closest("[data-apply]");
    if (!apply) return;
    const [folderId, tplId] = apply.dataset.apply.split(":");
    const { item } = findTpl(folderId, tplId);
    if (!item) return;
    char = Cmd.applySnapshot(char, item.payload, D);
    render();
    toast(item.name);
  };

  $("btnSaveTpl").onclick = () => {
    $("saveFolder").innerHTML = localTpls.folders
      .map((f) => `<option value="${f.id}">${escapeHtml(f.name)}</option>`)
      .join("");
    $("saveName").value = roleById[char.role]?.name || "Шаблон";
    openModal("saveModal");
    $("saveName").focus();
  };
  $("btnDoSave").onclick = () => {
    const name = $("saveName").value.trim();
    if (!name) return;
    const folder = localTpls.folders.find((f) => f.id === $("saveFolder").value) || localTpls.folders[0];
    folder.items.push({ id: uid("t"), name, payload: Cmd.toSnapshot(char) });
    folder.open = true;
    closeModal("saveModal");
    ui.tplTab = "local";
    document.querySelectorAll("[data-tpl-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tplTab === "local"));
    render();
    paintTemplates();
    toast("Сохранено");
  };
  $("btnNewFolder").onclick = () => {
    const name = window.prompt("Имя папки");
    if (!name || !name.trim()) return;
    localTpls.folders.push({ id: uid("f"), name: name.trim(), open: true, items: [] });
    paintTemplates();
  };
  $("btnExportTpl").onclick = () => {
    const blob = new Blob([JSON.stringify(localTpls, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cc-templates.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $("btnImportTpl").onclick = () => $("importFile").click();
  $("importFile").onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const folders = data.folders || (Array.isArray(data) ? [{ id: uid("f"), name: "Импорт", open: true, items: data }] : null);
      if (!folders) throw new Error("bad");
      folders.forEach((folder) => {
        const existing = localTpls.folders.find((f) => f.name === folder.name);
        const items = (folder.items || []).map((it) => ({ ...it, id: uid("t") }));
        if (existing) existing.items.push(...items);
        else localTpls.folders.push({ id: uid("f"), name: folder.name || "Папка", open: true, items });
      });
      ui.tplTab = "local";
      document.querySelectorAll("[data-tpl-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tplTab === "local"));
      render();
      paintTemplates();
      toast("Импортировано");
    } catch {
      toast("Не удалось прочитать файл");
    }
  };

  $("btnCopy").onclick = () => {
    if (!char.targets.length) toast("Сначала укажите цель");
    copyText(commandText());
  };
  $("btnImport").onclick = () => openModal("importModal");
  $("btnDoImport").onclick = () => {
    try {
      char = Cmd.fromCommand($("importText").value, D);
      char.items.forEach(rememberCustom);
      closeModal("importModal");
      render();
      toast("Разобрано");
    } catch (err) {
      toast(err.message);
    }
  };
  $("btnReset").onclick = () => {
    const keepUi = { ...ui, slotIndex: -1 };
    char = Cmd.emptyCharacter(D);
    Object.assign(ui, keepUi);
    render();
  };
  $("btnHelp").onclick = () => openModal("helpModal");

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.onclick = () => closeModal(btn.dataset.close);
  });
  document.querySelectorAll(".overlay").forEach((ov) => {
    ov.addEventListener("click", (e) => {
      if (e.target === ov) closeModal(ov.id);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelectorAll(".overlay.show").forEach((ov) => closeModal(ov.id));
  });

  restore();
  char.items.forEach(rememberCustom);
  render();
  paintTemplates();
  document.querySelectorAll("[data-tpl-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tplTab === ui.tplTab));
  [...$("customSrcPills").children].forEach((el) => el.classList.toggle("on", el.dataset.csrc === ui.customSrc));
  fetch("./templates/server.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data?.folders) {
        serverTpls = data;
        paintTemplates();
      }
    })
    .catch(() => {});
  fetch("./templates/custom-items.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const parsed = presetsFromFile(data);
      if (parsed) {
        presetCustom = parsed;
        userCustom = userCustom.filter((c) => !isPresetCustom(c.source, c.value));
        paintCustomGrid();
      }
    })
    .catch(() => {});
  setInterval(persist, 800);
})();
