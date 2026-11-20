(function () {
  "use strict";
  var app = document.getElementById("app");
  var MEDIA_BUCKET = "bar-media";

  var deferredInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallAppBanner();
  });
  function showInstallAppBanner() {
    if (!deferredInstallPrompt) return;
    if (localStorage.getItem("mb_install_dismissed") === "1") return;
    if (document.getElementById("mbInstallBanner")) return;
    var bar = document.createElement("div");
    bar.id = "mbInstallBanner";
    bar.style.cssText = "position:fixed;left:12px;right:12px;bottom:78px;z-index:40;background:#1a1514;border:1px solid #c47b3a;border-radius:16px;padding:14px 16px;box-shadow:0 12px 40px rgba(0,0,0,.45)";
    bar.innerHTML = '<div style="font-weight:700;margin-bottom:6px">Instalar Meu Bar</div>' +
      '<p class="mu" style="margin:0 0 12px">Use como app na tela inicial — mais rápido e em tela cheia.</p>' +
      '<div class="row"><button class="b sm" id="mbInstallYes" style="flex:1">Instalar</button>' +
      '<button class="b g sm" id="mbInstallNo" style="flex:1">Agora não</button></div>';
    document.body.appendChild(bar);
    document.getElementById("mbInstallYes").onclick = async function () {
      bar.remove();
      deferredInstallPrompt.prompt();
      try { await deferredInstallPrompt.userChoice; } catch (e) {}
      deferredInstallPrompt = null;
    };
    document.getElementById("mbInstallNo").onclick = function () {
      localStorage.setItem("mb_install_dismissed", "1");
      bar.remove();
    };
  }


  function allIngredientNames() {
    var out = [], seen = {};
    try {
      if (typeof CAT !== "undefined") {
        Object.keys(CAT).forEach(function (cat) {
          (CAT[cat] || []).forEach(function (s) {
            var name = String(s).split("|")[0].trim();
            if (name && !seen[name]) { seen[name] = 1; out.push(name); }
          });
        });
      }
    } catch (e) {}
    ["Gelo","Água","Água com gás","Açúcar","Limão","Laranja","Hortelã"].forEach(function (n) {
      if (!seen[n]) { seen[n] = 1; out.push(n); }
    });
    return out.sort(function (a,b){ return a.localeCompare(b,"pt-BR"); });
  }
  function ingredientSelectHtml(id, selected) {
    var opts = '<option value="">— selecione —</option>' + allIngredientNames().map(function (n) {
      return '<option value="' + esc(n) + '"' + (selected===n?' selected':'') + '>' + esc(n) + '</option>';
    }).join('');
    return '<select id="'+id+'">'+opts+'</select>';
  }


  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function showErr(title, msg) {
    app.innerHTML =
      '<div class="gate"><h1>' + esc(title) + '</h1><p class="mu">' + esc(msg) +
      '</p><button class="b" id="rl" style="margin-top:18px">Tentar de novo</button></div>';
    var b = document.getElementById("rl");
    if (b) b.onclick = function () { location.reload(); };
  }

  var URL_CFG = window.SUPABASE_URL;
  var KEY_CFG = window.SUPABASE_ANON_KEY;
  if (!URL_CFG || !KEY_CFG) {
    showErr("Configuração", "Faltam SUPABASE_URL ou SUPABASE_ANON_KEY no config.js.");
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    showErr("Biblioteca", "O Supabase não carregou. Verifique a internet e atualize a página.");
    return;
  }

  var sb = window.supabase.createClient(URL_CFG, KEY_CFG);
  var $ = function (s) { return document.querySelector(s); };
  var money = function (v) { return "R$ " + Number(v || 0).toFixed(2).replace(".", ","); };
  var CATS = ["Refrescantes", "Fortes", "Cítricos", "Tropicais", "Doces & Frutados", "Aperitivos"];
  var EMO = ["🍋", "🥃", "🍊", "🍹", "🍓", "🥂"];
  var ALL_TAGS = [
    "Refrescante", "Forte", "Doce", "Ácido", "Charmoso", "Fácil",
    "Clássico", "Tropical", "Aperitivo", "Longo", "Curto",
    "Com hortelã", "Com soda", "Frutado", "Amargo"
  ];
  var ROLE_LABELS = { owner: "Dono", gerente: "Gerente", barman: "Barman", caixa: "Caixa", garcom: "Garçom", cozinha: "Cozinha", outro: "Outro" };
  var JOB_ROLES = ["barman", "cozinha", "garcom", "caixa", "gerente", "outro"];
  var SKILL_OPTIONS = ["Barman", "Mixologia", "Cozinha", "Garçom", "Caixa", "Gerente", "Eventos / Freelance", "Atendimento rápido"];

  var DISPLAY_MODES = [
    { id: "grid-classic", label: "Grade clássica" },
    { id: "mode-single", label: "Fila única" },
    { id: "mode-small-blocks", label: "Blocos pequenos" },
    { id: "mode-list", label: "Listas" },
    { id: "mode-columns", label: "Colunas" },
    { id: "mode-showcase", label: "Vitrine destaque" }
  ];

  var CREST_BASES = [
    { id: "none", label: "Sem moldura", emoji: "" },
    { id: "circle", label: "Logo redonda", emoji: "⭕" },
    { id: "square", label: "Logo quadrada", emoji: "⬜" },
    { id: "rounded", label: "Cantos arredondados", emoji: "▢" },
    { id: "ring", label: "Anel dourado", emoji: "🟡" }
  ];
  var CREST_ICONS = [
    { id: "glass", label: "Taça martini", emoji: "🍸" },
    { id: "wine", label: "Taça vinho", emoji: "🍷" },
    { id: "beer", label: "Chopp", emoji: "🍺" },
    { id: "whisky", label: "Whisky", emoji: "🥃" },
    { id: "tropical", label: "Drink tropical", emoji: "🍹" },
    { id: "champagne", label: "Espumante", emoji: "🥂" },
    { id: "bottle", label: "Garrafa", emoji: "🍾" },
    { id: "lemon", label: "Limão", emoji: "🍋" },
    { id: "ice", label: "Gelo", emoji: "🧊" },
    { id: "mint", label: "Hortelã", emoji: "🌿" }
  ];
  var CREST_ORNAMENTS = [
    { id: "none", label: "Nenhum", emoji: "" },
    { id: "spark", label: "Brilho", emoji: "✨" },
    { id: "citrus", label: "Cítricos", emoji: "🍊" },
    { id: "bubble", label: "Bolhas", emoji: "🫧" },
    { id: "neon", label: "Neon", emoji: "💜" }
  ];


  var NAME_FONTS = [
    { id: "store-font-serif", label: "Clássica (Fraunces)" },
    { id: "store-font-sans", label: "Moderna (DM Sans)" },
    { id: "store-font-display", label: "Letreiro / Emblema" },
    { id: "store-font-mono", label: "Técnica / Monospace" }
  ];

  var BORDER_STYLES = [
    { id: "crest-border-gold", label: "Moldura Dourada" },
    { id: "crest-border-double", label: "Borda Dupla" },
    { id: "crest-border-dashed", label: "Tracejada de Oficina" },
    { id: "crest-border-emblem", label: "Brasão Assimétrico" }
  ];

  var POS_OPTIONS = [
    { id: "left", label: "Esquerda" },
    { id: "center", label: "Centro" },
    { id: "right", label: "Direita" }
  ];

  var PLACES_CATALOG = [
    { label: "Asa Norte, Brasília, DF", lat: -15.7634, lon: -47.8842 },
    { label: "Asa Sul, Brasília, DF", lat: -15.8152, lon: -47.9016 },
    { label: "Taguatinga, Brasília, DF", lat: -15.8333, lon: -48.0567 },
    { label: "Ceilândia, Brasília, DF", lat: -15.8178, lon: -48.1069 },
    { label: "Sobradinho, Brasília, DF", lat: -15.6536, lon: -47.7889 },
    { label: "Planaltina, Brasília, DF", lat: -15.6197, lon: -47.6514 },
    { label: "Guará, Brasília, DF", lat: -15.8267, lon: -47.9778 },
    { label: "Águas Claras, Brasília, DF", lat: -15.8344, lon: -48.0261 },
    { label: "São Paulo, SP", lat: -23.5505, lon: -46.6333 },
    { label: "Pinheiros, São Paulo, SP", lat: -23.5667, lon: -46.6908 },
    { label: "Vila Madalena, São Paulo, SP", lat: -23.5525, lon: -46.6914 },
    { label: "Rio de Janeiro, RJ", lat: -22.9068, lon: -43.1729 },
    { label: "Copacabana, Rio de Janeiro, RJ", lat: -22.9711, lon: -43.1822 },
    { label: "Belo Horizonte, MG", lat: -19.9167, lon: -43.9345 },
    { label: "Curitiba, PR", lat: -25.4284, lon: -49.2733 },
    { label: "Salvador, BA", lat: -12.9714, lon: -38.5014 },
    { label: "Fortaleza, CE", lat: -3.7172, lon: -38.5433 },
    { label: "Goiânia, GO", lat: -16.6869, lon: -49.2648 }
  ];

  var S = {
    user: null,
    userCoords: null,
    bars: [],
    bar: null,
    role: null,
    tab: "recipes",
    items: [],
    recipes: [],
    prices: {},
    orders: [],
    settledIds: new Set(),
    members: [],
    jobs: [],
    myApps: [],
    receivedApps: [],
    serviceReqs: [],
    passwords: [],
    profile: null,
    sub: null,
    pollId: null,
    rFilter: "can",
    rCat: "Todas",
    rQuery: "",
    rTags: new Set(),
    showTags: false,
    pCat: "Todas",
    pFilter: "all",
    pOnlyNow: false,
    pMarkup: 2.8,
    jobRoleFilter: "todas",
    jobRadiusKm: 50, jobLocFilter: "",
    jobTypeFilter: "todas"
  };

  var isManager = function () { return S.role === "owner" || S.role === "gerente"; };
  var canEditMenu = function () { return S.role === "owner" || S.role === "gerente"; };
  var hasPricing = function () { return S.bar && S.bar.kind !== "home" && S.bar.kind !== "casa"; };

  function detectCurrentCoords(force) {
    if (!navigator.geolocation) return Promise.resolve(S.userCoords || null);
    if (S.userCoords && !force) return Promise.resolve(S.userCoords);
    return new Promise(function (resolve) {
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          S.userCoords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
          resolve(S.userCoords);
        },
        function (err) {
          console.warn("geo", err);
          if (!S.userCoords) S.userCoords = null;
          resolve(S.userCoords);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: force ? 0 : 60000 }
      );
    });
  }
  function useMyLocationBtnHtml(btnId) {
    return '<button type="button" class="b g sm" id="' + btnId + '">📍 Usar minha localização</button>';
  }
  function bindUseMyLocation(btn, onDone) {
    if (!btn) return;
    btn.onclick = async function () {
      btn.disabled = true;
      var old = btn.textContent;
      btn.textContent = "Obtendo…";
      var c = await detectCurrentCoords(true);
      btn.disabled = false;
      btn.textContent = old;
      if (!c) { toast("Não foi possível obter a localização. Permita o acesso no navegador."); return; }
      toast("Localização obtida (±" + Math.round(c.accuracy || 0) + " m)");
      if (onDone) onDone(c);
    };
  }

  function haversineKm(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return 99999;
    var toRad = function (d) { return (d * Math.PI) / 180; };
    var R = 6371;
    var dLat = toRad(b.lat - a.lat);
    var dLon = toRad(b.lon - a.lon);
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function getProximitySuggestions(queryText, extraCoords) {
    var origin = extraCoords || S.userCoords || { lat: -15.7942, lon: -47.8822 };
    var q = String(queryText || "").trim().toLowerCase();
    var list = PLACES_CATALOG.map(function (p) {
      var dist = haversineKm(origin, p);
      return { label: p.label, lat: p.lat, lon: p.lon, km: dist };
    });
    if (q) {
      var matching = list.filter(function (item) { return item.label.toLowerCase().includes(q); });
      if (matching.length) list = matching;
    }
    list.sort(function (a, b) { return a.km - b.km; });
    return list.slice(0, 6);
  }

  function bindLocationSearchInput(rootEl, inputId, sugBoxId, latInpId, lonInpId, onSelect) {
    var inp = rootEl.querySelector("#" + inputId);
    var box = rootEl.querySelector("#" + sugBoxId);
    if (!inp || !box) return;

    var renderList = function () {
      var val = inp.value || "";
      if (!val.trim()) { box.style.display = "none"; return; }
      var items = getProximitySuggestions(val);
      box.style.display = "block";
      box.innerHTML = items.map(function (it, idx) {
        return '<button type="button" class="loc-suggest-item" data-sidx="' + idx + '">' +
          '<span>📍 <b>' + esc(it.label) + '</b></span>' +
          '<span class="tag">' + (it.km < 9000 ? it.km.toFixed(1) + " km" : "Exato") + "</span></button>";
      }).join("");

      box.querySelectorAll("[data-sidx]").forEach(function (btn) {
        btn.onclick = function () {
          var chosen = items[Number(btn.getAttribute("data-sidx"))];
          if (!chosen) return;
          inp.value = chosen.label;
          if (latInpId && rootEl.querySelector("#" + latInpId)) rootEl.querySelector("#" + latInpId).value = chosen.lat;
          if (lonInpId && rootEl.querySelector("#" + lonInpId)) rootEl.querySelector("#" + lonInpId).value = chosen.lon;
          box.style.display = "none";
          if (onSelect) onSelect(chosen);
        };
      });
    };

    inp.addEventListener("input", renderList);
    inp.addEventListener("focus", renderList);
  }

  function externalMapUrl(placeOrBar) {
    var b = placeOrBar || {};
    if (b.lat != null && b.lon != null && b.lat !== "" && b.lon !== "") {
      return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(Number(b.lat) + "," + Number(b.lon));
    }
    var q = b.city || b.name || "Brasil";
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
  }

  function slugHandle(raw) {
    return String(raw || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 28);
  }

  function applyBarTheme(bar) {
    var root = document.documentElement.style;
    if (!bar) {
      ["--bg", "--s1", "--ac", "--ok", "--tx"].forEach(function (k) { root.removeProperty(k); });
      return;
    }
    if (bar.color_bg) root.setProperty("--bg", bar.color_bg);
    if (bar.color_surface) root.setProperty("--s1", bar.color_surface);
    if (bar.color_accent) root.setProperty("--ac", bar.color_accent);
    if (bar.color_ok) root.setProperty("--ok", bar.color_ok);
    if (bar.color_text) root.setProperty("--tx", bar.color_text);
  }

  function brandLogoHtml(bar, big) {
    var lg = (bar && bar.logo_url) ? bar.logo_url : ((window.BRAND && window.BRAND.logo) || "logo.png");
    var nm = (bar && bar.name) ? bar.name : ((window.BRAND && window.BRAND.name) || "Meu Bar");
    var fontCls = (bar && bar.name_font) ? bar.name_font : "store-font-serif";
    return (
      '<span class="brand' + (big ? " big" : "") + '">' +
      '<img class="logo' + (big ? " big" : "") + '" src="' + esc(lg) + '" alt="' + esc(nm) + '" onerror="this.style.display=\'none\'">' +
      '<span><span class="bn ' + fontCls + '">' + esc(nm) + "</span></span></span>"
    );
  }

  function imageUploaderHtml(prefix, label, currentUrl) {
    var safeUrl = currentUrl || "";
    return (
      '<div class="img-picker"><label style="margin-top:0">' + esc(label) + '</label>' +
      '<div class="row" style="align-items:flex-start">' +
      '<img class="img-thumb" id="' + prefix + 'Thumb" src="' + esc(safeUrl || ((window.BRAND && window.BRAND.logo) || "logo.png")) + '" alt="Prévia" onerror="this.style.opacity=\'0.35\'">' +
      '<div class="grow"><input id="' + prefix + 'Url" value="' + esc(safeUrl) + '" placeholder="Link da imagem (gerado ao enviar foto ou colado)">' +
      '<div class="row" style="margin-top:8px">' +
      '<button type="button" class="b sm g" id="' + prefix + 'CamBtn">📷 Tirar foto</button>' +
      '<button type="button" class="b sm g" id="' + prefix + 'GalBtn">🖼️ Galeria</button>' +
      '<span class="tag" id="' + prefix + 'Status"></span></div>' +
      '<input type="file" id="' + prefix + 'CamInp" accept="image/*" capture="user" style="display:none">' +
      '<input type="file" id="' + prefix + 'GalInp" accept="image/*" style="display:none"></div></div></div>'
    );
  }

  async function compressImageFile(file) {
    return new Promise(function (resolve) {
      if (!file || !file.type || !file.type.startsWith("image/")) { resolve(file); return; }
      var img = new Image();
      var reader = new FileReader();
      reader.onload = function (e) {
        img.onload = function () {
          var maxSide = 1100;
          var w = img.width, h = img.height;
          if (w > maxSide || h > maxSide) {
            if (w >= h) { h = Math.round((h * maxSide) / w); w = maxSide; }
            else { w = Math.round((w * maxSide) / h); h = maxSide; }
          }
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(function (blob) {
            resolve(blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : file);
          }, "image/jpeg", 0.82);
        };
        img.onerror = function () { resolve(file); };
        img.src = e.target.result;
      };
      reader.onerror = function () { resolve(file); };
      reader.readAsDataURL(file);
    });
  }

  function bindImageUploader(rootEl, prefix, folder, onUrlChange) {
    var q = function (s) { return rootEl.querySelector(s); };
    var urlInp = q("#" + prefix + "Url");
    var thumb = q("#" + prefix + "Thumb");
    var st = q("#" + prefix + "Status");
    var camBtn = q("#" + prefix + "CamBtn");
    var galBtn = q("#" + prefix + "GalBtn");
    var camInp = q("#" + prefix + "CamInp");
    var galInp = q("#" + prefix + "GalInp");

    var syncThumb = function (u) {
      if (thumb) { thumb.style.opacity = u ? "1" : "0.35"; thumb.src = u || ((window.BRAND && window.BRAND.logo) || "logo.png"); }
      if (onUrlChange) onUrlChange(u || "");
    };

    var handleFile = async function (file) {
      if (!file) return;
      if (st) st.textContent = "Enviando...";
      var prepared = await compressImageFile(file);
      var ext = (prepared.type === "image/jpeg") ? "jpg" : ((file.name.split(".").pop() || "jpg").replace(/[^a-zA-Z0-9]/g, "") || "jpg");
      var path = (S.user ? S.user.id : "anon") + "/" + folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + "." + ext;
      var up = await sb.storage.from(MEDIA_BUCKET).upload(path, prepared, { upsert: true });
      if (up.error) {
        if (st) st.textContent = "Falha no upload";
        toast("Erro ao enviar imagem: " + up.error.message);
        return;
      }
      var pub = sb.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      var publicUrl = pub && pub.data ? pub.data.publicUrl : "";
      if (urlInp) urlInp.value = publicUrl;
      if (st) st.textContent = "Link salvo!";
      syncThumb(publicUrl);
      toast("Imagem enviada e link gerado!");
    };

    if (camBtn && camInp) camBtn.onclick = function () { camInp.click(); };
    if (galBtn && galInp) galBtn.onclick = function () { galInp.click(); };
    if (camInp) camInp.onchange = function () { if (camInp.files && camInp.files[0]) handleFile(camInp.files[0]); };
    if (galInp) galInp.onchange = function () { if (galInp.files && galInp.files[0]) handleFile(galInp.files[0]); };
    if (urlInp) urlInp.oninput = function () { syncThumb(urlInp.value.trim()); };
  }

  async function uploadPdfFile(file, folder) {
    if (!file) return "";
    var path = (S.user ? S.user.id : "anon") + "/" + folder + "/" + Date.now() + "-curriculo.pdf";
    var up = await sb.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: "application/pdf", upsert: true });
    if (up.error) {
      toast("Erro ao enviar PDF: " + up.error.message);
      return "";
    }
    var pub = sb.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return pub && pub.data ? pub.data.publicUrl : "";
  }

  // Insere/atualiza ignorando colunas opcionais caso alguma coluna ainda não exista no banco
  async function writeBarSafe(mode, payload, barId) {
    var data = Object.assign({}, payload);
    if (mode === "insert" && (!data.handle || !String(data.handle).trim())) {
      data.handle = slugHandle(data.name || "bar") + "_" + Math.random().toString(36).slice(2, 8);
    }
    if (data.handle) data.handle = slugHandle(data.handle);
    var optionalKeys = ["handle", "city", "lat", "lon", "logo_url", "banner_url", "shakers", "tiers", "slogan", "name_font", "crest_border", "logo_pos", "name_pos", "menu_display_mode", "color_bg", "color_surface", "color_accent", "color_ok", "color_text", "menu_presets", "active_menu_preset", "crest_base", "crest_icon", "crest_ornament"];
    for (var attempt = 0; attempt < 8; attempt++) {
      var res = mode === "insert"
        ? await sb.from("bars").insert(data).select().single()
        : await sb.from("bars").update(data).eq("id", barId).select().single();
      if (!res.error) return res;
      var msg = String(res.error.message || "");
      var removed = false;
      for (var i = 0; i < optionalKeys.length; i++) {
        var k = optionalKeys[i];
        if (k in data && msg.includes(k)) {
          delete data[k];
          removed = true;
          break;
        }
      }
      if (!removed) return res;
    }
    return await (mode === "insert"
      ? sb.from("bars").insert({ name: payload.name, kind: payload.kind, owner: payload.owner }).select().single()
      : sb.from("bars").update({ name: payload.name }).eq("id", barId).select().single());
  }

  function toast(t) {
    var d = document.createElement("div");
    d.className = "toast";
    d.textContent = t;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2500);
  }

  function beep() {
    try {
      var c = new (window.AudioContext || window.webkitAudioContext)();
      var o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.frequency.value = 740;
      g.gain.setValueAtTime(0.2, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45);
      o.start(); o.stop(c.currentTime + 0.45);
    } catch (e) {}
  }

  function menuUrl(barId, tableVal) {
    var p = location.pathname.replace(/[^/]*$/, "menu.html");
    var q = "?bar=" + encodeURIComponent(barId);
    if (tableVal) q += "&mesa=" + encodeURIComponent(tableVal);
    return location.origin + p + q;
  }

  async function init() {
    detectCurrentCoords();
    var res = await sb.auth.getSession();
    S.user = res.data && res.data.session ? res.data.session.user : null;
    if (!S.user) { applyBarTheme(null); loginScreen(); }
    else { await loadProfile(); await loadBars(); }
    sb.auth.onAuthStateChange(async function (_ev, session) {
      var u = session ? session.user : null;
      if ((u && u.id) !== (S.user && S.user.id)) {
        S.user = u;
        if (!S.user) {
          if (S.sub) sb.removeChannel(S.sub);
          clearInterval(S.pollId);
          applyBarTheme(null);
          loginScreen();
        } else { await loadProfile(); await loadBars(); }
      }
    });
  }

  function loginScreen() {
    app.innerHTML =
      '<div class="w narrow"><div style="text-align:center;margin-bottom:14px">' + brandLogoHtml(null, true) +
      '</div><p class="mu" style="text-align:center">Entre ou crie sua conta para gerenciar o bar, receitas, currículo e vagas.</p>' +
      '<div class="panel"><label>E-mail</label><input id="em" type="email" autocomplete="email" placeholder="voce@exemplo.com">' +
      '<label>Senha</label><input id="pw" type="password" autocomplete="current-password" placeholder="Mínimo 6 caracteres">' +
      '<div class="row" style="margin-top:16px"><button class="b grow" id="in">Entrar</button><button class="b g grow" id="up">Criar conta</button></div>' +
      '<p class="err" id="er"></p></div></div>';

    var go = async function (mode) {
      $("#er").textContent = "";
      var em = $("#em").value.trim(), pw = $("#pw").value;
      if (!em || !pw) { $("#er").textContent = "Preencha e-mail e senha."; return; }
      var r = mode === "in"
        ? await sb.auth.signInWithPassword({ email: em, password: pw })
        : await sb.auth.signUp({ email: em, password: pw });
      if (r.error) { $("#er").textContent = r.error.message; return; }
      if (mode === "up" && !r.data.session) {
        $("#er").className = "ok-txt";
        $("#er").textContent = "Conta criada! Confira seu e-mail para confirmar e entrar.";
      }
    };
    $("#in").onclick = function () { go("in"); };
    $("#up").onclick = function () { go("up"); };
  }

  async function loadProfile() {
    var r = await sb.from("staff_profiles").select("*").eq("user_id", S.user.id).maybeSingle();
    S.profile = r.data || {
      user_id: S.user.id,
      display_name: (S.user.email || "").split("@")[0] || "Profissional",
      avatar_url: "",
      resume_pdf_url: "",
      location: "",
      skills: [],
      work_mode: "ambos",
      experience_years: 0,
      bio: "",
      availability: ""
    };
  }

  async function loadBars() {
    var own = await sb.from("bars").select("*").eq("owner", S.user.id);
    if (own.error) { console.error(own.error); showErr("Erro ao carregar seus bares", own.error.message); return; }
    var mem = await sb.from("bar_members").select("role, name, bars(*)").eq("user_id", S.user.id);
    if (mem.error) { console.warn(mem.error); mem = { data: [] }; }
    var map = {};
    (own.data || []).forEach(function (b) { map[b.id] = { bar: b, role: "owner" }; });
    (mem.data || []).forEach(function (m) {
      if (m.bars && !map[m.bars.id]) map[m.bars.id] = { bar: m.bars, role: m.role };
    });
    S.bars = Object.keys(map).map(function (id) { return map[id]; });
    if (S.bars.length) {
      var savedBar = localStorage.getItem("last_bar_" + S.user.id);
      var pick = S.bars.find(function (x) { return x.bar.id === savedBar; }) || S.bars[0];
      await openBar(pick.bar, pick.role);
    } else {
      applyBarTheme(null);
      try { await loadJobsAndRequests(); } catch (e) { console.warn(e); }
      S.bar = null; S.role = null; S.tab = "careers";
      seekerShell();
    }
  }

  async function loadJobsAndRequests() {
    var jr = await sb.from("job_posts").select("*, bars(name, handle, city)").eq("is_open", true).order("created_at", { ascending: false }).limit(80);
    S.jobs = jr.error ? [] : (jr.data || []);
    var ar = await sb.from("job_applications").select("*").eq("applicant_id", S.user.id);
    S.myApps = ar.error ? [] : (ar.data || []);
    var sr = await sb.from("service_requests").select("*, bars(name, handle)").eq("requester_id", S.user.id).order("created_at", { ascending: false }).limit(30);
    S.serviceReqs = sr.error ? [] : (sr.data || []);

    if (S.bar && isManager()) {
      var barJobIds = S.jobs.filter(function (j) { return j.bar_id === S.bar.id; }).map(function (j) { return j.id; });
      if (barJobIds.length) {
        var ra = await sb.from("job_applications").select("*, job_posts(id, title, role_needed), staff_profiles(*)").in("job_id", barJobIds).order("created_at", { ascending: false });
        S.receivedApps = ra.data || [];
      } else {
        S.receivedApps = [];
      }
    } else {
      S.receivedApps = [];
    }
  }

  
  function seekerShell() {
    app.innerHTML =
      '<div class="top">' + brandLogoHtml(null, false) +
      '<div class="row"><button class="lnk" id="out">Sair</button></div></div>' +
      '<div class="w" id="view"></div>' +
      '<nav class="bnav">' +
      '<button class="bnav-btn ' + (S.tab === "careers" ? "on" : "") + '" data-nav="careers"><span class="ico">💼</span><span>Vagas</span></button>' +
      '<button class="bnav-btn ' + (S.tab === "profile" ? "on" : "") + '" data-nav="profile"><span class="ico">📄</span><span>Currículo</span></button>' +
      '<button class="bnav-btn ' + (S.tab === "explore" ? "on" : "") + '" data-nav="explore"><span class="ico">📍</span><span>Bares</span></button>' +
      '<button class="bnav-btn ' + (S.tab === "createbar" ? "on" : "") + '" data-nav="createbar"><span class="ico">🏠</span><span>Meu bar</span></button>' +
      "</nav>";
    $("#out").onclick = function () { sb.auth.signOut(); };
    document.querySelectorAll("[data-nav]").forEach(function (btn) {
      btn.onclick = function () {
        S.tab = btn.getAttribute("data-nav");
        document.querySelectorAll("[data-nav]").forEach(function (x) { x.classList.toggle("on", x === btn); });
        paintSeeker();
      };
    });
    paintSeeker();
  }
  function paintSeeker() {
    var v = $("#view"); if (!v) return;
    if (S.tab === "careers") careersView(v);
    else if (S.tab === "profile") {
      v.innerHTML = '<h1>Meu currículo</h1><div id="profBox"></div>';
      renderProfileSection(v.querySelector("#profBox") || v);
    } else if (S.tab === "explore") exploreBarsView(v);
    else {
      v.innerHTML = '<h1>Meu bar</h1><p class="mu">Modo profissional sem bar ativo.</p><div class="panel"><button class="b full" id="goOnb">Criar meu bar</button></div>';
      if (v.querySelector("#goOnb")) v.querySelector("#goOnb").onclick = function () { onboardingScreen(); };
    }
  }
  function exploreBarsView(v) {
    var origin = S.userCoords || { lat: -15.7942, lon: -47.8822 };
    var map = {};
    (S.jobs || []).forEach(function (j) {
      if (!j.bars || !j.bars.name) return;
      var id = j.bar_id;
      if (!map[id]) map[id] = { name: j.bars.name, handle: j.bars.handle, city: j.bars.city || j.location, lat: j.bars.lat, lon: j.bars.lon, jobs: 0 };
      map[id].jobs++;
    });
    var list = Object.keys(map).map(function (id) {
      var b = map[id];
      var km = (b.lat != null && b.lon != null) ? haversineKm(origin, { lat: Number(b.lat), lon: Number(b.lon) }) : 9999;
      return Object.assign({ id: id }, b, { _km: km });
    }).sort(function (a,b){ return a._km - b._km; });
    v.innerHTML = '<h1>Bares próximos</h1><p class="mu">Com vagas abertas.</p><div class="list" style="margin-top:12px">' +
      (list.length ? list.map(function (b) {
        return '<div><div style="flex:1"><b>'+esc(b.name)+'</b>'+(b.handle?' <span class="tag">@'+esc(b.handle)+'</span>':'')+
          (b.city?'<br><span class="tag">📍 '+esc(b.city)+(b._km<9000?' · '+b._km.toFixed(1)+' km':'')+'</span>':'')+
          '<br><span class="mu">'+b.jobs+' vaga(s)</span></div></div>';
      }).join('') : '<p class="mu">Nenhum bar com vaga no momento.</p>') + '</div>';
  }

  function onboardingScreen() {
    app.innerHTML =
      '<div class="top">' + brandLogoHtml(null, false) + '<button class="lnk" id="out">Sair</button></div>' +
      '<div class="w narrow"><h1>Começar no Meu Bar</h1><p class="mu">Crie seu bar, entre numa equipe, ou use só para <b>currículo e vagas</b>.</p>' +
      '<div class="panel" style="border-color:var(--ac)"><h2>Só quero emprego</h2><p class="mu">Sem criar bar agora.</p><button class="b full" id="goSeeker">Continuar sem criar bar</button></div>' +
      '<div class="panel"><h2>Criar novo bar</h2>' +
      '<label>Nome do bar</label><input id="bn" placeholder="Ex: Minha casa">' +
      '<label>@ do bar (único)</label><input id="bh" placeholder="Ex: minha_casa_7228">' +
      '<label>Localização do bar</label>' +
      '<div class="row" style="margin-bottom:6px">' + useMyLocationBtnHtml("bcGeo") + '</div>' +
      '<input id="bc" placeholder="Ex: Asa Norte, Brasília, DF" autocomplete="off">' +
      '<div class="loc-suggest-box" id="bcSug" style="display:none"></div>' +
      '<input type="hidden" id="bcLat"><input type="hidden" id="bcLon">' +
      '<label>Tipo</label><select id="bk"><option value="home">Em casa / Amigos (sem preço)</option><option value="bar">Bar / Restaurante (com preços)</option></select>' +
      '<label>Seu nome na equipe</label><input id="mn" placeholder="Ex: Davi">' +
      '<div id="cbLogoBox"></div><div id="cbBannerBox"></div>' +
      '<button class="b full" id="cr" style="margin-top:14px">Criar bar</button><p class="err" id="er"></p></div>' +
      '<div class="panel"><h2>Solicitar serviço por @ do bar + senha</h2>' +
      '<label>@ do bar</label><input id="rqh" placeholder="Ex: @minha_casa_7228">' +
      '<label>Senha de serviço</label><input id="rqp" placeholder="Senha gerada pelo dono ou gerente">' +
      '<label>Função</label><select id="rqr"><option value="barman">Barman</option><option value="garcom">Garçom</option><option value="cozinha">Cozinha</option><option value="caixa">Caixa</option></select>' +
      '<button class="b g full" id="rqs" style="margin-top:12px">Enviar solicitação</button><p class="err" id="rqer"></p><p class="ok-txt" id="rqok"></p></div>' +
      '<div class="panel"><h2>Currículo & Vagas</h2><div class="row" style="margin-top:8px">' +
      '<button class="b g grow" id="openProf">Meu Currículo</button><button class="b g grow" id="openJobs">Mural de Vagas (' + S.jobs.length + ')</button></div></div></div>';

    $("#cbLogoBox").innerHTML = imageUploaderHtml("cbLg", "Logo do bar (foto ou galeria)", "");
    $("#cbBannerBox").innerHTML = imageUploaderHtml("cbBn", "Banner do bar (foto ou galeria)", "");
    bindImageUploader(app, "cbLg", "logos");
    bindUseMyLocation(document.getElementById("bcGeo"), function (c) {
      var lat = document.getElementById("bcLat");
      var lon = document.getElementById("bcLon");
      if (lat) lat.value = c.lat;
      if (lon) lon.value = c.lon;
      var bc = document.getElementById("bc");
      if (bc && !bc.value) bc.value = "Minha localização";
    });

    bindImageUploader(app, "cbBn", "banners");
    bindLocationSearchInput(app, "bc", "bcSug", "bcLat", "bcLon");

    $("#out").onclick = function () { sb.auth.signOut(); };
    $("#bn").oninput = function () { if (!$("#bh").dataset.manual) $("#bh").value = slugHandle($("#bn").value); };
    $("#bh").oninput = function () { $("#bh").dataset.manual = "1"; $("#bh").value = slugHandle($("#bh").value); };

    $("#cr").onclick = async function () {
      $("#er").textContent = "";
      var name = $("#bn").value.trim();
      var handle = slugHandle($("#bh").value || name);
      if (name.length < 2) { $("#er").textContent = "Digite o nome do bar."; return; }
      if (handle.length < 3) { $("#er").textContent = "Escolha um @ válido (mínimo 3 caracteres)."; return; }
      var latVal = $("#bcLat").value ? Number($("#bcLat").value) : null;
      var lonVal = $("#bcLon").value ? Number($("#bcLon").value) : null;

      var ins = await writeBarSafe("insert", {
        name: name,
        handle: handle,
        city: $("#bc").value.trim() || null,
        lat: latVal,
        lon: lonVal,
        kind: $("#bk").value,
        logo_url: ($("#cbLgUrl").value || "").trim() || null,
        banner_url: ($("#cbBnUrl").value || "").trim() || null,
        owner: S.user.id,
        shakers: 2,
        tiers: [{ name: "Padrão", bonus: 0 }]
      });
      if (ins.error) { $("#er").textContent = ins.error.code === "23505" ? "Esse @ já está em uso." : ins.error.message; return; }
      await sb.from("bar_members").insert({ bar_id: ins.data.id, user_id: S.user.id, role: "owner", name: $("#mn").value.trim() || S.profile.display_name || "Dono" });
      localStorage.setItem("last_bar_" + S.user.id, ins.data.id);
      await loadBars();
    };

    $("#rqs").onclick = async function () {
      $("#rqer").textContent = ""; $("#rqok").textContent = "";
      var r = await sb.rpc("request_service_by_handle", { p_handle: $("#rqh").value, p_password: $("#rqp").value, p_role: $("#rqr").value });
      if (r.error) { $("#rqer").textContent = r.error.message; return; }
      $("#rqok").textContent = "Solicitação enviada com seu currículo!";
      await loadJobsAndRequests();
    };

    $("#openProf").onclick = function () { standaloneModal(false);
    if ($("#goSeeker")) $("#goSeeker").onclick = function () { S.tab = "careers"; seekerShell(); }; };
    $("#openJobs").onclick = function () { standaloneModal(true); };
  }

  function standaloneModal(jobsFirst) {
    var o = document.createElement("div");
    o.className = "ov";
    o.innerHTML = '<div class="w narrow"><button class="b g" id="x">← Voltar</button><div id="b" style="margin-top:12px"></div></div>';
    document.body.appendChild(o);
    o.querySelector("#x").onclick = function () { o.remove(); onboardingScreen(); };
    if (jobsFirst) renderJobsSection(o.querySelector("#b"));
    else renderProfileSection(o.querySelector("#b"));
  }

  async function openBar(bar, role) {
    S.bar = bar; S.role = role; S.settledIds = new Set();
    localStorage.setItem("last_bar_" + S.user.id, bar.id);
    applyBarTheme(bar);

    var r1 = await sb.from("bar_items").select("*").eq("bar_id", bar.id).order("name");
    var r2 = await sb.from("recipes").select("*").order("name");
    var r3 = await sb.from("bar_prices").select("recipe_id, price").eq("bar_id", bar.id);
    var r4 = await sb.from("orders").select("*").eq("bar_id", bar.id).neq("status", "done").order("created_at");
    var r5 = await sb.from("bar_members").select("*").eq("bar_id", bar.id);

    S.items = r1.data || []; S.recipes = r2.data || [];
    S.prices = {}; (r3.data || []).forEach(function (x) { S.prices[x.recipe_id] = x.price; });
    S.orders = r4.data || []; S.members = r5.data || [];

    if (isManager()) {
      var pw = await sb.from("bar_service_passwords").select("*").eq("bar_id", bar.id).order("created_at", { ascending: false });
      S.passwords = pw.data || [];
    } else { S.passwords = []; }

    await loadJobsAndRequests();
    shell();
    subscribeRealtime();
  }

  function subscribeRealtime() {
    if (S.sub) sb.removeChannel(S.sub);
    clearInterval(S.pollId);
    S.sub = sb.channel("bar-" + S.bar.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: "bar_id=eq." + S.bar.id }, async function (p) {
        if (p.eventType === "INSERT") beep();
        await refreshOrders();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "job_posts" }, async function () {
        await loadJobsAndRequests();
        if (S.tab === "careers") paint();
      })
      .subscribe();
    S.pollId = setInterval(refreshOrders, 12000);
  }

  async function refreshOrders() {
    if (!S.bar) return;
    var r = await sb.from("orders").select("*").eq("bar_id", S.bar.id).neq("status", "done").order("created_at");
    S.orders = r.data || [];
    if (S.tab === "queue") paint();
    if (S.tab === "cashier") paint();
    updateBottomNavBadge();
  }

  function updateBottomNavBadge() {
    var b = document.querySelector('[data-nav="queue"] .nav-badge');
    if (b) b.textContent = S.orders.length ? " (" + S.orders.length + ")" : "";
  }

  function makeDrink(recipe) {
    var have = new Set(S.items.filter(function (i) { return i.in_stock; }).map(function (i) { return i.name.trim().toLowerCase(); }));
    var free = new Set(["gelo", "agua", "agua gelada", "água", "água gelada"]);
    return !(recipe.ingredients || []).some(function (x) {
      var n = (x.n || "").trim().toLowerCase();
      return n && !free.has(n) && !have.has(n);
    });
  }

  function recipeTags(r) {
    if (Array.isArray(r.tags) && r.tags.length) return r.tags;
    var t = [];
    if (r.category === "Refrescantes") t.push("Refrescante", "Longo");
    if (r.category === "Fortes") t.push("Forte", "Curto");
    if (r.category === "Cítricos") t.push("Ácido");
    if (r.category === "Tropicais") t.push("Tropical");
    if (r.category === "Doces & Frutados") t.push("Doce", "Frutado");
    if (r.category === "Aperitivos") t.push("Aperitivo");
    return t;
  }

  function matchRecipeTags(r) {
    if (!S.rTags.size) return true;
    var t = new Set(recipeTags(r));
    var ok = true;
    S.rTags.forEach(function (x) { if (!t.has(x)) ok = false; });
    return ok;
  }

  function tile(r) {
    var idx = Math.max(0, CATS.indexOf(r.category));
    var img = r.image_url ? ' style="background-image:url(\'' + esc(r.image_url) + "')\"" : "";
    var emoji = r.image_url ? "" : (EMO[idx] || "🍸");
    return '<div class="im c' + idx + '"' + img + ">" + emoji + "</div>";
  }

  function estimateRecipeCost(recipe) {
    if (Number(recipe.base_cost) > 0) return Number(recipe.base_cost);
    var costMap = {};
    S.items.forEach(function (it) { costMap[(it.name || "").trim().toLowerCase()] = Number(it.unit_cost) || 0; });
    var sum = 0;
    (recipe.ingredients || []).forEach(function (ing) {
      var k = (ing.n || "").trim().toLowerCase();
      if (costMap[k]) sum += costMap[k];
    });
    return sum > 0 ? sum : (Number(S.bar && S.bar.base_cost) > 0 ? Number(S.bar.base_cost) : 6);
  }

  function suggestedPrice(recipe) {
    return Math.ceil((estimateRecipeCost(recipe) * Math.max(1.2, Number(S.pMarkup) || 2.8)) * 2) / 2;
  }

  function openSwitchBarModal() {
    var o = document.createElement("div");
    o.className = "ov";
    o.innerHTML =
      '<div class="w narrow"><button class="b g sm" id="closeSw">← Voltar</button>' +
      '<h1 style="margin-top:14px">Meus bares</h1>' +
      '<p class="mu">Troque o bar ativo ou edite nome, @, cidade e imagens.</p>' +
      '<div class="list" style="margin-top:14px">' +
      (S.bars || []).map(function (x) {
        var active = S.bar && S.bar.id === x.bar.id;
        var b = x.bar;
        return '<div style="align-items:flex-start;flex-wrap:wrap"><div style="flex:1;min-width:140px">' +
          (b.logo_url ? '<img src="' + esc(b.logo_url) + '" style="width:36px;height:36px;border-radius:8px;object-fit:cover;vertical-align:middle;margin-right:8px">' : "") +
          '<b>' + esc(b.name) + '</b> <span class="badge-warn">' + esc((typeof ROLE_LABELS !== "undefined" && ROLE_LABELS[x.role]) || x.role) + "</span>" +
          (b.handle ? '<br><span class="tag">@' + esc(b.handle) + "</span>" : "") +
          (b.city ? '<br><span class="tag">📍 ' + esc(b.city) + "</span>" : "") +
          '</div><div class="row">' +
          (active ? '<span class="chip st1">Ativo</span>' : '<button class="b sm" data-pickbar="' + b.id + '" data-pickrole="' + x.role + '">Gerenciar</button>') +
          (x.role === "owner" || x.role === "gerente" ? '<button class="b g sm" data-editbar="' + b.id + '">Editar</button>' : "") +
          "</div></div>";
      }).join("") +
      '</div><button class="b g full" id="newBarFromSw" style="margin-top:14px">+ Criar ou entrar em outro bar</button></div>';
    document.body.appendChild(o);
    o.querySelector("#closeSw").onclick = function () { o.remove(); };
    o.querySelectorAll("[data-pickbar]").forEach(function (btn) {
      btn.onclick = async function () {
        var bid = btn.getAttribute("data-pickbar");
        var r = btn.getAttribute("data-pickrole");
        var found = S.bars.find(function (x) { return x.bar.id === bid; });
        o.remove();
        if (found) await openBar(found.bar, r);
      };
    });
    o.querySelectorAll("[data-editbar]").forEach(function (btn) {
      btn.onclick = function () {
        var found = S.bars.find(function (x) { return x.bar.id === btn.getAttribute("data-editbar"); });
        if (!found) return;
        openEditBarModal(found.bar, o);
      };
    });
    o.querySelector("#newBarFromSw").onclick = function () {
      o.remove();
      onboardingScreen();
    };
  }

  function openEditBarModal(bar, parentOv) {
    var o = document.createElement("div");
    o.className = "ov";
    o.innerHTML =
      '<div class="w narrow"><button class="b g sm" id="x">← Voltar</button>' +
      '<h1 style="margin-top:12px">Editar bar</h1>' +
      '<label>Nome</label><input id="ebName" value="' + esc(bar.name || "") + '">' +
      '<label>@ único (handle)</label><input id="ebHandle" value="' + esc(bar.handle || "") + '" placeholder="ex: campos_house">' +
      '<label>Cidade / endereço</label><input id="ebCity" value="' + esc(bar.city || "") + '" placeholder="Ex: Asa Norte, Brasília">' +
      '<div class="row" style="margin-top:8px">' + useMyLocationBtnHtml("ebGeo") + '</div>' +
      '<input type="hidden" id="ebLat" value="' + esc(bar.lat != null ? bar.lat : "") + '">' +
      '<input type="hidden" id="ebLon" value="' + esc(bar.lon != null ? bar.lon : "") + '">' +
      '<label>Slogan</label><input id="ebSlogan" value="' + esc(bar.slogan || "") + '">' +
      '<div id="ebLogoBox"></div>' +
      '<div id="ebBannerBox"></div>' +
      '<label>Tipo</label><select id="ebKind">' +
      '<option value="home"' + (bar.kind === "home" ? " selected" : "") + '>Casa (sem preço)</option>' +
      '<option value="bar"' + (bar.kind === "bar" || bar.kind === "counter" ? " selected" : "") + '>Bar / Restaurante (com preços)</option>' +
      '</select>' +
      '<button class="b full" id="ebSave" style="margin-top:14px">Salvar alterações</button><p class="err" id="ebEr"></p></div>';
    document.body.appendChild(o);
    if (typeof imageUploaderHtml === "function") {
      o.querySelector("#ebLogoBox").innerHTML = imageUploaderHtml("ebLg", "Logo", bar.logo_url || "");
      o.querySelector("#ebBannerBox").innerHTML = imageUploaderHtml("ebBn", "Banner", bar.banner_url || "");
      bindImageUploader(o, "ebLg", "logos");
      bindImageUploader(o, "ebBn", "banners");
    }
    bindUseMyLocation(o.querySelector("#ebGeo"), function (c) {
      o.querySelector("#ebLat").value = c.lat;
      o.querySelector("#ebLon").value = c.lon;
      if (!o.querySelector("#ebCity").value) o.querySelector("#ebCity").value = "Minha localização";
    });
    o.querySelector("#x").onclick = function () { o.remove(); };
    o.querySelector("#ebSave").onclick = async function () {
      var name = (o.querySelector("#ebName").value || "").trim();
      var handle = (o.querySelector("#ebHandle").value || "").trim().replace(/^@/, "");
      if (name.length < 2) { o.querySelector("#ebEr").textContent = "Nome obrigatório"; return; }
      if (handle && !/^[a-z0-9_]{3,32}$/i.test(handle)) {
        o.querySelector("#ebEr").textContent = "@ só letras, números e _ (3–32)";
        return;
      }
      var payload = {
        name: name,
        handle: handle || null,
        city: (o.querySelector("#ebCity").value || "").trim() || null,
        lat: o.querySelector("#ebLat").value ? Number(o.querySelector("#ebLat").value) : null,
        lon: o.querySelector("#ebLon").value ? Number(o.querySelector("#ebLon").value) : null,
        slogan: (o.querySelector("#ebSlogan").value || "").trim() || null,
        kind: o.querySelector("#ebKind").value,
        logo_url: (o.querySelector("#ebLgUrl") && o.querySelector("#ebLgUrl").value || bar.logo_url || null),
        banner_url: (o.querySelector("#ebBnUrl") && o.querySelector("#ebBnUrl").value || bar.banner_url || null)
      };
      var r = await writeBarSafe("update", payload, bar.id);
      if (r.error) {
        var msg = r.error.message || "";
        if (msg.indexOf("bars_kind_check") >= 0) {
          msg = "Tipo de bar inválido no banco. Rode o SQL sql-fix-kind-e-cardapio.sql no Supabase.";
        }
        o.querySelector("#ebEr").textContent = msg;
        return;
      }
      if (r.data) {
        bar = r.data;
        if (S.bar && S.bar.id === bar.id) {
          S.bar = bar;
          applyBarTheme(S.bar);
        }
        var entry = (S.bars || []).find(function (x) { return x.bar.id === bar.id; });
        if (entry) entry.bar = bar;
      }
      toast("Bar atualizado");
      o.remove();
      if (parentOv) parentOv.remove();
      openSwitchBarModal();
    };
  }

  function shell() {
    app.innerHTML =
      '<div class="top">' + brandLogoHtml(S.bar, false) +
      '<div class="row"><button class="bar-switcher-pill" id="topSwitchBar">🏠 Trocar bar</button><button class="lnk" id="out">Sair</button></div></div>' +
      '<div class="w" id="view"></div>' +
      '<nav class="bnav">' +
      '<button class="bnav-btn ' + (S.tab === "recipes" ? "on" : "") + '" data-nav="recipes"><span class="ico">🍸</span><span>Receitas</span></button>' +
      '<button class="bnav-btn ' + (S.tab === "stock" ? "on" : "") + '" data-nav="stock"><span class="ico">🍾</span><span>Estoque</span></button>' +
      '<button class="bnav-btn ' + (S.tab === "queue" ? "on" : "") + '" data-nav="queue"><span class="ico">🔔</span><span>Fila<span class="nav-badge">' + (S.orders.length ? " (" + S.orders.length + ")" : "") + '</span></span></button>' +
      '<button class="bnav-btn ' + (S.tab === "more" ? "on" : "") + '" data-nav="more"><span class="ico">•••</span><span>Mais</span></button>' +
      "</nav>";

    $("#topSwitchBar").onclick = openSwitchBarModal;
    $("#out").onclick = function () { sb.auth.signOut(); };
    document.querySelectorAll("[data-nav]").forEach(function (btn) {
      btn.onclick = function () {
        S.tab = btn.getAttribute("data-nav");
        document.querySelectorAll("[data-nav]").forEach(function (x) { x.classList.toggle("on", x === btn); });
        paint();
      };
    });
    paint();
  }

  function paint() {
    var v = $("#view");
    if (!v) return;
    if (S.tab === "recipes") recipesView(v);
    else if (S.tab === "stock") stockView(v);
    else if (S.tab === "queue") queueView(v);
    else if (S.tab === "cashier") cashierView(v);
    else if (S.tab === "careers") careersView(v);
    else if (S.tab === "studio") storeStudioView(v);
    else moreView(v);
  }

  function recipesView(v) {
    var canList = S.recipes.filter(makeDrink);
    var missingList = S.recipes.filter(function (r) { return !makeDrink(r); });
    var basePool = S.rFilter === "can" ? canList : (S.rFilter === "missing" ? missingList : S.recipes);
    var q = S.rQuery.trim().toLowerCase();
    var displayMode = S.bar.menu_display_mode || "grid-classic";

    var filtered = basePool.filter(function (r) {
      if (S.rCat !== "Todas" && r.category !== S.rCat) return false;
      if (!matchRecipeTags(r)) return false;
      if (q) {
        var inName = (r.name || "").toLowerCase().includes(q);
        var inIng = (r.ingredients || []).some(function (i) { return (i.n || "").toLowerCase().includes(q); });
        if (!inName && !inIng) return false;
      }
      return true;
    });

    v.innerHTML =
      '<div class="row sp" style="align-items:flex-start">' +
      '<div><h1>Receitas</h1><p class="mu">' + esc(S.bar.name) + " · você faz " + canList.length + "</p></div>" +
      '<div class="row"><button class="b sm g" id="pickMood">✨ O que tomar?</button>' +
      '<select id="catSelect" style="width:auto;padding:8px 12px;font-size:.85rem">' +
      ["Todas"].concat(CATS).map(function (c) {
        return '<option value="' + esc(c) + '" ' + (S.rCat === c ? "selected" : "") + '>' + (c === "Todas" ? "Categorias" : esc(c)) + "</option>";
      }).join("") + "</select></div></div>" +
      '<input id="searchDrink" value="' + esc(S.rQuery) + '" placeholder="Buscar drink" style="margin-top:14px">' +
      '<div class="chips" style="margin-top:10px">' +
      '<button class="chip ' + (S.rFilter === "can" ? "on" : "") + '" data-rf="can">Faço agora</button>' +
      '<button class="chip ' + (S.rFilter === "missing" ? "on" : "") + '" data-rf="missing">Falta ' + missingList.length + "</button>" +
      '<button class="chip ' + (S.rFilter === "all" ? "on" : "") + '" data-rf="all">Todas</button></div>' +
      (S.showTags
        ? '<div class="chips" style="flex-wrap:wrap;overflow:visible;margin-top:6px">' +
          ALL_TAGS.map(function (t) {
            return '<span class="chip ' + (S.rTags.has(t) ? "on" : "") + '" data-rtag="' + esc(t) + '">' + esc(t) + "</span>";
          }).join("") +
          (S.rTags.size ? '<span class="chip" id="clrRTags" style="border-style:dashed">Limpar</span>' : "") + "</div>"
        : "") +
      '<div class="menu-items ' + esc(displayMode) + '" style="margin-top:14px">' +
      (filtered.length
        ? filtered.map(function (r) {
            var tg = recipeTags(r).slice(0, 2);
            var pr = hasPricing() && S.prices[r.id] != null ? '<span class="tag pr">' + money(S.prices[r.id]) + "</span>" : "";
            return '<button class="card" data-rec="' + r.id + '">' + tile(r) +
              '<div class="t"><div><div>' + esc(r.name) + "</div>" +
              (tg.length ? '<span class="pill-tag">' + esc(tg.join(" · ")) + "</span>" : "") +
              "</div>" + pr + "</div></button>";
          }).join("")
        : '<p class="mu">Nenhuma receita encontrada com esse filtro.</p>') + "</div>";

    $("#pickMood").onclick = function () { S.showTags = !S.showTags; recipesView(v); };
    $("#catSelect").onchange = function (e) { S.rCat = e.target.value; recipesView(v); };
    $("#searchDrink").oninput = function (e) { S.rQuery = e.target.value; recipesView(v); };
    v.querySelectorAll("[data-rf]").forEach(function (b) { b.onclick = function () { S.rFilter = b.getAttribute("data-rf"); recipesView(v); }; });
    v.querySelectorAll("[data-rtag]").forEach(function (c) {
      c.onclick = function () {
        var t = c.getAttribute("data-rtag");
        if (S.rTags.has(t)) S.rTags.delete(t); else S.rTags.add(t);
        recipesView(v);
      };
    });
    if ($("#clrRTags")) $("#clrRTags").onclick = function () { S.rTags.clear(); recipesView(v); };
    v.querySelectorAll("[data-rec]").forEach(function (card) {
      card.onclick = function () {
        var r = S.recipes.find(function (x) { return x.id === card.getAttribute("data-rec"); });
        if (r) openMakeDrinkModal(r);
      };
    });
  }

  function openMakeDrinkModal(r) {
    var canMake = makeDrink(r);
    var st = new Set((S.items || []).filter(function (i) { return i.in_stock; }).map(function (i) { return norm(i.name); }));
    var free = { gelo: 1, agua: 1, "agua gelada": 1 };
    var shakers = (S.bar && S.bar.shakers) || [750, 500];
    if (typeof shakers === "number") shakers = [shakers];
    var o = document.createElement("div");
    o.className = "ov";
    o.innerHTML =
      '<div class="hero c' + Math.max(0, CATS.indexOf(r.category)) + '"' +
      (r.image_url ? ' style="background-image:url(\'' + esc(r.image_url) + "')\"" : "") +
      ">" + (r.image_url ? "" : (EMO[CATS.indexOf(r.category)] || "🍸")) +
      '</div><div class="w"><button class="b g sm" id="closeRec">← Voltar</button>' +
      '<h1 style="margin-top:14px">' + esc(r.name) + "</h1>" +
      '<p class="mu">' + esc(r.category || "Drink") + " · " + (canMake ? '<span style="color:var(--ok)">Você consegue fazer agora</span>' : '<span class="warn-txt">Falta algo no estoque</span>') + "</p>" +
      (r.glass || r.technique || r.garnish ? '<div class="meta" style="display:flex;gap:12px;flex-wrap:wrap;margin:12px 0">' +
        (r.glass ? '<div><span class="mu">Copo</span><br><b>' + esc(r.glass) + '</b></div>' : '') +
        (r.technique ? '<div><span class="mu">Técnica</span><br><b>' + esc(r.technique) + '</b></div>' : '') +
        (r.garnish ? '<div><span class="mu">Decoração</span><br><b>' + esc(r.garnish) + '</b></div>' : '') +
      '</div>' : '') +
      (r.description ? '<p class="desc">' + esc(r.description) + "</p>" : "") +
      '<h2>Ingredientes</h2>' +
      (r.ingredients || []).map(function (i) {
        var ok = free[norm(i.n)] || st.has(norm(i.n));
        return '<div class="row sp" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span>' + esc(i.n) + '</span><span class="mu">' + esc(i.q || "") + (ok ? "" : ' · <span class="warn-txt">falta</span>') + '</span></div>';
      }).join("") +
      '<h2 style="margin-top:18px">Modo de preparo</h2>' +
      (r.instructions || r.steps
        ? '<ol class="st" style="padding-left:18px">' + String(r.instructions || r.steps).split("\n").map(function (line) {
            line = line.replace(/^\s*\d+[.)]\s*/, "").trim();
            return line ? "<li style=\"margin:6px 0\"><span>" + esc(line) + "</span></li>" : "";
          }).join("") + "</ol>"
        : '<p class="mu">Sem modo de preparo cadastrado.</p>') +
      (r.garnish || r.technique ? '<h2>Dicas</h2><p class="mu">' +
        (r.technique ? "Técnica: <b>" + esc(r.technique) + "</b>. " : "") +
        (r.garnish ? "Finalize com <b>" + esc(r.garnish) + "</b>." : "") +
        "</p>" : "") +
      '<h2>Equipamento</h2><p class="mu">Coqueteleiras do bar: <b>' + esc((Array.isArray(shakers) ? shakers : [shakers]).join(" ml, ") + " ml") +
      '</b>. Use gelo e a coqueteleira adequada ao volume do lote.</p>' +
      (r.story ? '<h2>História</h2><p class="mu story">' + esc(r.story) + "</p>" : "") +
      '<div class="panel" style="margin-top:18px"><label style="margin-top:0">Nome do cliente ou comanda *</label>' +
      '<input id="mkFor" placeholder="Ex: Mesa 3 · Ana · Comanda 12" maxlength="40">' +
      '<label>Observação</label><input id="mkNote" placeholder="Sem açúcar, pouco gelo…" maxlength="140">' +
      '<label>Quantidade</label><select id="mkQty"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select>' +
      '<button class="b ok full" id="makeNowBtn" style="margin-top:12px">🍸 Fazer agora · enviar à fila</button><p class="err" id="mkEr"></p></div></div>';

    document.body.appendChild(o);
    o.querySelector("#closeRec").onclick = function () { o.remove(); };
    o.querySelector("#makeNowBtn").onclick = async function () {
      var who = (o.querySelector("#mkFor").value || "").trim();
      if (who.length < 2) { o.querySelector("#mkEr").textContent = "Informe o nome ou a comanda."; return; }
      var qty = parseInt(o.querySelector("#mkQty").value, 10) || 1;
      var note = (o.querySelector("#mkNote").value || "").trim();
      var price = S.prices && S.prices[r.id] != null ? S.prices[r.id] : null;
      var payload = {
        bar_id: S.bar.id,
        recipe_id: r.id,
        client_name: who,
        customer_name: who,
        qty: qty,
        note: note || null,
        price: price,
        status: "pending",
        recipe_name: r.name
      };
      var ins = await sb.from("orders").insert(payload).select().single();
      if (ins.error) {
        // schema pode usar só client_name
        delete payload.customer_name;
        delete payload.recipe_name;
        ins = await sb.from("orders").insert(payload).select().single();
      }
      if (ins.error) { o.querySelector("#mkEr").textContent = ins.error.message; return; }
      o.remove();
      toast("Na fila: " + qty + "× " + r.name + " → " + who);
      try { await refreshOrders(); } catch (e) {}
      if (S.tab === "queue") paint();
    };
  }

  function stockView(v) {
    if (!S.stockCat) S.stockCat = "";
    if (!S.stockQ) S.stockQ = "";
    var cats = [];
    try { if (typeof CAT !== "undefined") cats = Object.keys(CAT); } catch (e) {}
    var namesInCat = [];
    if (S.stockCat && typeof CAT !== "undefined" && CAT[S.stockCat]) {
      namesInCat = CAT[S.stockCat].map(function (s) { return String(s).split("|")[0].trim(); });
    }
    var q = (S.stockQ || "").toLowerCase().trim();
    var filteredNames = namesInCat.filter(function (n) {
      return !q || n.toLowerCase().includes(q);
    });
    var list = (S.items || []).filter(function (i) {
      if (!S.stockCat) return true;
      return namesInCat.indexOf(i.name) >= 0;
    });

    v.innerHTML =
      '<div class="row sp"><h1>Estoque</h1>' + (canEditMenu() && hasPricing() ? '<button class="b sm" id="goPrices">Precificação</button>' : "") + "</div>" +
      '<p class="mu">Escolha o tipo → busque ou selecione o item. Se não existir, cadastre novo.</p>' +
      '<div class="panel"><label>1. Tipo / categoria</label>' +
      '<select id="inCat"><option value="">— escolha o tipo —</option>' +
      cats.map(function (c) {
        return '<option value="' + esc(c) + '"' + (S.stockCat === c ? " selected" : "") + ">" + esc(c) + "</option>";
      }).join("") + "</select>" +
      (S.stockCat
        ? '<label style="margin-top:10px">2. Buscar na lista</label><input id="inSearch" placeholder="Digite para filtrar…" value="' + esc(S.stockQ) + '">' +
          '<label>3. Item</label><select id="inName"><option value="">— selecione —</option>' +
          filteredNames.map(function (n) {
            return '<option value="' + esc(n) + '">' + esc(n) + "</option>";
          }).join("") +
          '<option value="__custom__">➕ Cadastrar item novo nesta categoria…</option></select>' +
          '<div id="customBox" style="display:none"><label>Nome do novo item</label><input id="inCustom" placeholder="Ex: Xarope de hibisco caseiro"></div>' +
          '<div class="row" style="margin-top:8px">' +
          '<input id="inBrand" placeholder="Marca" style="flex:1">' +
          '<input id="inSize" type="number" placeholder="ml" style="width:80px"></div>' +
          '<div class="row" style="margin-top:8px">' +
          '<input id="inVariant" placeholder="Sabor / variação" style="flex:1">' +
          '<input id="inCost" type="number" step="0.1" min="0" placeholder="Custo R$" style="width:100px">' +
          '<button class="b sm" id="inAdd">Add</button></div>'
        : '<p class="mu" style="margin-top:10px">Selecione um tipo para ver os itens.</p>') +
      '<p class="err" id="inEr"></p></div>' +
      '<div class="chips" style="flex-wrap:wrap;overflow:visible;margin-top:10px">' +
      '<span class="chip ' + (!S.stockCat ? "on" : "") + '" data-scat="">Todos no estoque</span>' +
      cats.map(function (c) {
        return '<span class="chip ' + (S.stockCat === c ? "on" : "") + '" data-scat="' + esc(c) + '">' + esc(c) + "</span>";
      }).join("") + "</div>" +
      '<div class="list" style="margin-top:14px">' +
      (list.length ? list.map(function (i) {
        var meta = [];
        if (i.brand) meta.push(i.brand);
        if (i.variant) meta.push(i.variant);
        if (i.size_ml) meta.push(i.size_ml + " ml");
        if (i.unit_cost != null) meta.push("custo " + money(i.unit_cost));
        return '<div style="align-items:flex-start"><div style="flex:1"><b>' + esc(i.name) + "</b>" +
          (meta.length ? '<br><span class="tag">' + esc(meta.join(" · ")) + "</span>" : "") +
          '</div><div class="row"><button class="chip ' + (i.in_stock ? "st1" : "st0") + '" data-tog="' + i.id + '">' + (i.in_stock ? "OK" : "Falta") + "</button>" +
          '<button class="b g sm" data-ed="' + i.id + '">✏️</button>' +
          '<button class="b g sm" data-rm="' + i.id + '">🗑</button></div></div>';
      }).join("") : '<p class="mu">Nenhum item listado.</p>') + "</div>";

    v.querySelectorAll("[data-scat]").forEach(function (c) {
      c.onclick = function () { S.stockCat = c.getAttribute("data-scat") || ""; S.stockQ = ""; stockView(v); };
    });
    if ($("#inCat")) $("#inCat").onchange = function () { S.stockCat = $("#inCat").value; S.stockQ = ""; stockView(v); };
    if ($("#inSearch")) $("#inSearch").oninput = function () { S.stockQ = $("#inSearch").value; stockView(v); };
    if ($("#inName")) $("#inName").onchange = function () {
      var custom = $("#inName").value === "__custom__";
      if ($("#customBox")) $("#customBox").style.display = custom ? "block" : "none";
    };
    if ($("#goPrices")) $("#goPrices").onclick = function () { pricesView(v); };
    if ($("#inAdd")) $("#inAdd").onclick = async function () {
      $("#inEr").textContent = "";
      var nm = ($("#inName").value || "").trim();
      if (nm === "__custom__") nm = ($("#inCustom").value || "").trim();
      if (!nm) { $("#inEr").textContent = "Selecione ou digite o nome do item."; return; }
      var row = {
        bar_id: S.bar.id, name: nm, in_stock: true, category: S.stockCat || null,
        unit_cost: Math.max(0, Number($("#inCost").value) || 0),
        brand: ($("#inBrand").value || "").trim() || null,
        variant: ($("#inVariant").value || "").trim() || null,
        size_ml: $("#inSize").value ? parseInt($("#inSize").value, 10) : null
      };
      var r = await sb.from("bar_items").insert(row).select().single();
      if (r.error) {
        delete row.brand; delete row.variant; delete row.size_ml; delete row.category;
        r = await sb.from("bar_items").insert(row).select().single();
      }
      if (r.error) { $("#inEr").textContent = r.error.message; return; }
      S.items.push(r.data); S.items.sort(function (a, b) { return a.name.localeCompare(b.name); });
      toast("Item adicionado"); stockView(v);
    };
    v.querySelectorAll("[data-tog]").forEach(function (b) {
      b.onclick = async function () {
        var it = S.items.find(function (x) { return x.id === b.getAttribute("data-tog"); });
        if (!it) return;
        var r = await sb.from("bar_items").update({ in_stock: !it.in_stock }).eq("id", it.id).select().single();
        if (!r.error && r.data) { it.in_stock = r.data.in_stock; stockView(v); }
      };
    });
    v.querySelectorAll("[data-rm]").forEach(function (b) {
      b.onclick = async function () {
        if (!confirm("Remover este item do estoque?")) return;
        var id = b.getAttribute("data-rm");
        await sb.from("bar_items").delete().eq("id", id);
        S.items = S.items.filter(function (x) { return x.id !== id; });
        stockView(v);
      };
    });
    v.querySelectorAll("[data-ed]").forEach(function (b) {
      b.onclick = function () {
        var it = S.items.find(function (x) { return x.id === b.getAttribute("data-ed"); });
        if (!it) return;
        var o = document.createElement("div"); o.className = "ov";
        o.innerHTML = '<div class="w narrow"><button class="b g sm" id="x">← Voltar</button><h1 style="margin-top:12px">Editar ' + esc(it.name) + "</h1>" +
          "<label>Marca</label><input id='eb' value='" + esc(it.brand || "") + "'>" +
          "<label>Sabor / variação</label><input id='ev' value='" + esc(it.variant || "") + "'>" +
          "<label>Tamanho (ml)</label><input id='es' type='number' value='" + esc(it.size_ml != null ? it.size_ml : "") + "'>" +
          "<label>Custo (R$)</label><input id='ec' type='number' step='0.1' value='" + esc(it.unit_cost != null ? it.unit_cost : "") + "'>" +
          '<button class="b full" id="sv" style="margin-top:12px">Salvar</button><p class="err" id="er"></p></div>';
        document.body.appendChild(o);
        o.querySelector("#x").onclick = function () { o.remove(); };
        o.querySelector("#sv").onclick = async function () {
          var patch = {
            brand: (o.querySelector("#eb").value || "").trim() || null,
            variant: (o.querySelector("#ev").value || "").trim() || null,
            size_ml: o.querySelector("#es").value ? parseInt(o.querySelector("#es").value, 10) : null,
            unit_cost: Math.max(0, Number(o.querySelector("#ec").value) || 0)
          };
          var r = await sb.from("bar_items").update(patch).eq("id", it.id).select().single();
          if (r.error) r = await sb.from("bar_items").update({ unit_cost: patch.unit_cost }).eq("id", it.id).select().single();
          if (r.error) { o.querySelector("#er").textContent = r.error.message; return; }
          Object.assign(it, r.data); o.remove(); stockView(v); toast("Item atualizado");
        };
      };
    });
  }

  function queueView(v) {
    var open = S.bar.accepting_orders !== false;
    var active = S.orders.filter(function (o) { return o.status !== "done"; });
    // Mescla pedidos do mesmo drink + mesmo status + mesma obs (preparar juntos)
    var groups = [];
    var map = {};
    active.forEach(function (o) {
      var key = (o.recipe_id || o.recipe_name || "") + "|" + (o.status || "pending") + "|" + (o.note || "");
      if (!map[key]) {
        map[key] = { key: key, recipe_id: o.recipe_id, recipe_name: o.recipe_name, status: o.status, note: o.note, qty: 0, orders: [], names: [] };
        groups.push(map[key]);
      }
      map[key].qty += (o.qty || 1);
      map[key].orders.push(o);
      var nm = o.customer_name || "Cliente";
      if (map[key].names.indexOf(nm) < 0) map[key].names.push(nm);
    });
    groups.sort(function (a, b) {
      var ta = a.orders[0] && a.orders[0].created_at || "";
      var tb = b.orders[0] && b.orders[0].created_at || "";
      return ta < tb ? -1 : 1;
    });

    v.innerHTML =
      '<div class="row sp"><h1>Fila de Pedidos</h1><button class="b sm ' + (open ? "g" : "ok") + '" id="pauseBtn">' + (open ? "Pausar pedidos" : "Retomar pedidos") + "</button></div>" +
      (open ? "" : '<p class="warn-txt">Pedidos pausados no cardápio agora.</p>') +
      '<p class="mu">Pedidos iguais do mesmo drink são agrupados para preparar juntos.</p>' +
      '<div style="margin-top:12px">' +
      (groups.length ? groups.map(function (g, gi) {
        var isReady = g.status === "ready";
        return '<div class="ord ' + (isReady ? "ready" : "") + '"><div class="row sp"><h3>' + esc(g.qty + "× " + (g.recipe_name || "Drink")) + '</h3><span class="tag">' + (isReady ? "PRONTO" : "PREPARANDO") + (g.orders.length > 1 ? " · " + g.orders.length + " pedidos" : "") + "</span></div>" +
          '<div class="meta">' + esc(g.names.join(", ")) + "</div>" +
          (g.note ? '<div class="items"><span class="mu">Obs: ' + esc(g.note) + "</span></div>" : "") +
          '<div class="acts">' + (!isReady ? '<button class="b sm ok" data-gready="' + gi + '">Marcar lote pronto</button>' : "") +
          '<button class="b sm g" data-gdone="' + gi + '">Entregue</button></div></div>';
      }).join("") : '<p class="mu">Nenhum pedido na fila agora. Você pode fazer drinks direto na aba Receitas.</p>') + "</div>";

    $("#pauseBtn").onclick = async function () {
      var r = await sb.from("bars").update({ accepting_orders: !open }).eq("id", S.bar.id).select().single();
      if (!r.error && r.data) { S.bar = r.data; queueView(v); }
    };
    v.querySelectorAll("[data-gready]").forEach(function (btn) {
      btn.onclick = async function () {
        var g = groups[+btn.getAttribute("data-gready")];
        if (!g) return;
        var ids = g.orders.map(function (o) { return o.id; });
        await sb.from("orders").update({ status: "ready" }).in("id", ids);
        await refreshOrders();
        queueView(v);
      };
    });
    v.querySelectorAll("[data-gdone]").forEach(function (btn) {
      btn.onclick = async function () {
        var g = groups[+btn.getAttribute("data-gdone")];
        if (!g) return;
        var ids = g.orders.map(function (o) { return o.id; });
        await sb.from("orders").update({ status: "done" }).in("id", ids);
        await refreshOrders();
        queueView(v);
      };
    });
  }

  function cashierView(v) {
    var openOrders = S.orders.filter(function (o) { return !S.settledIds.has(o.id); });
    var grouped = {};
    var grandTotal = 0;

    openOrders.forEach(function (o) {
      var key = (o.customer_name || "Cliente").trim();
      var unit = (o.unit_price != null ? Number(o.unit_price) : (o.recipe_id && S.prices[o.recipe_id] != null ? Number(S.prices[o.recipe_id]) : 0));
      var line = (Number(o.qty) || 1) * unit;
      grandTotal += line;
      if (!grouped[key]) grouped[key] = { name: key, total: 0, ids: [], lines: [] };
      grouped[key].total += line;
      grouped[key].ids.push(o.id);
      grouped[key].lines.push((o.qty || 1) + "× " + (o.recipe_name || "Drink") + (unit ? " (" + money(line) + ")" : ""));
    });

    var customers = Object.keys(grouped).map(function (k) { return grouped[k]; });

    v.innerHTML =
      '<button type="button" class="b g sm" id="backMoreCash">← Voltar para Mais</button>' +
      '<h1 style="margin-top:12px">Caixa</h1>' +
      '<p class="mu">' + esc(S.bar.name) + (hasPricing() ? " · Comandas em aberto" : " · Modo livre (sem cobrança)") + "</p>" +
      '<div class="pay"><div class="row sp"><span>Total em aberto</span><span class="tt">' + money(grandTotal) + "</span></div></div>" +
      '<div class="list" style="margin-top:14px">' +
      (customers.length
        ? customers.map(function (c, idx) {
            return '<div style="align-items:flex-start"><div style="flex:1"><b>' + esc(c.name) + "</b>" +
              (hasPricing() ? ' · <span class="pr">' + money(c.total) + "</span>" : "") +
              '<br><span class="tag">' + esc(c.lines.join(", ")) + "</span></div>" +
              '<button type="button" class="b sm ok" data-payidx="' + idx + '">Receber / Fechar</button></div>';
          }).join("")
        : '<p class="mu">Nenhuma comanda pendente no caixa agora.</p>') + "</div>";

    $("#backMoreCash").onclick = function () { S.tab = "more"; paint(); };
    v.querySelectorAll("[data-payidx]").forEach(function (btn) {
      btn.onclick = async function () {
        var c = customers[Number(btn.getAttribute("data-payidx"))];
        if (!c) return;
        for (var i = 0; i < c.ids.length; i++) {
          S.settledIds.add(c.ids[i]);
          await sb.from("orders").update({ status: "done" }).eq("id", c.ids[i]);
        }
        toast("Comanda de " + c.name + " fechada!");
        await refreshOrders();
        cashierView(v);
      };
    });
  }

  function pricesView(v) {
    var unpricedAvailable = S.recipes.filter(function (r) { return makeDrink(r) && S.prices[r.id] == null; });
    var filtered = S.recipes.filter(function (r) {
      if (S.pCat !== "Todas" && r.category !== S.pCat) return false;
      if (S.pOnlyNow && !makeDrink(r)) return false;
      if (S.pFilter === "missing") return S.prices[r.id] == null;
      if (S.pFilter === "priced") return S.prices[r.id] != null;
      return true;
    });

    v.innerHTML =
      '<button type="button" class="b g sm" id="bkStock">← Voltar ao Estoque</button><h1 style="margin-top:12px">Precificação do Bar</h1>' +
      (unpricedAvailable.length
        ? '<div class="alert-box"><b>⚠️ ' + unpricedAvailable.length + ' drink(s) disponível(is) sem preço!</b><p class="mu" style="margin-top:4px">Sem preço, não aparece para o cliente: ' +
          esc(unpricedAvailable.slice(0, 6).map(function (d) { return d.name; }).join(", ")) + "</p></div>"
        : '<p class="ok-txt">✓ Todos os drinks disponíveis já possuem preço.</p>') +
      '<div class="panel"><div class="row"><div class="grow"><label>Multiplicador sobre custo base</label><input id="mkInput" type="number" step="0.1" min="1.1" value="' + esc(S.pMarkup) + '"></div>' +
      '<div class="grow"><label>Custo base padrão (R$)</label><input id="bcInput" type="number" step="0.5" min="0" value="' + esc(S.bar.base_cost || 0) + '"></div>' +
      '<div style="align-self:flex-end"><button type="button" class="b sm g" id="saveBase">Salvar base</button></div></div>' +
      '<div class="row" style="margin-top:12px"><button type="button" class="b sm" id="applyMissing">Sugerir para sem preço</button>' +
      '<button type="button" class="b sm g" id="togNow">' + (S.pOnlyNow ? "Mostrando: Só os que faço" : "Filtrar: Só os que faço") + "</button></div></div>" +
      '<div class="chips">' + ["all", "missing", "priced"].map(function (f) {
        return '<span class="chip ' + (S.pFilter === f ? "on" : "") + '" data-pf="' + f + '">' + (f === "all" ? "Todos" : f === "missing" ? "Sem preço" : "Com preço") + "</span>";
      }).join("") + '</div><div class="chips">' + ["Todas"].concat(CATS).map(function (c) {
        return '<span class="chip ' + (S.pCat === c ? "on" : "") + '" data-pc="' + esc(c) + '">' + esc(c) + "</span>";
      }).join("") + '</div><div class="list" style="margin-top:12px">' +
      filtered.map(function (r) {
        var cur = S.prices[r.id], cost = estimateRecipeCost(r), sug = suggestedPrice(r);
        return '<div><div style="flex:1;min-width:190px"><b>' + esc(r.name) + "</b>" + (cur == null ? '<span class="badge-warn">Sem preço</span>' : "") +
          '<br><span class="tag">Custo base: ' + money(cost) + " · Sugerido: <b>" + money(sug) + "</b></span></div>" +
          '<div class="row"><input type="number" step="0.5" min="0" data-pr="' + r.id + '" value="' + (cur != null ? esc(cur) : "") + '" placeholder="R$" style="width:88px">' +
          '<button type="button" class="b sm g" data-sug="' + r.id + '" data-val="' + sug + '">Usar ' + money(sug) + "</button></div></div>";
      }).join("") + '</div><button type="button" class="b full" id="savePrices" style="margin-top:14px">Salvar preços</button><p class="ok-txt" id="prMsg"></p>';

    $("#bkStock").onclick = function () { stockView(v); };
    $("#mkInput").onchange = function () { S.pMarkup = Math.max(1.1, Number($("#mkInput").value) || 2.8); pricesView(v); };
    $("#saveBase").onclick = async function () {
      S.pMarkup = Math.max(1.1, Number($("#mkInput").value) || 2.8);
      var r = await sb.from("bars").update({ base_cost: Math.max(0, Number($("#bcInput").value) || 0) }).eq("id", S.bar.id).select().single();
      if (!r.error && r.data) { S.bar = r.data; toast("Base salva!"); pricesView(v); }
    };
    $("#togNow").onclick = function () { S.pOnlyNow = !S.pOnlyNow; pricesView(v); };
    v.querySelectorAll("[data-pf]").forEach(function (el) { el.onclick = function () { S.pFilter = el.getAttribute("data-pf"); pricesView(v); }; });
    v.querySelectorAll("[data-pc]").forEach(function (el) { el.onclick = function () { S.pCat = el.getAttribute("data-pc"); pricesView(v); }; });
    v.querySelectorAll("[data-sug]").forEach(function (btn) {
      btn.onclick = function () {
        var inp = v.querySelector('[data-pr="' + btn.getAttribute("data-sug") + '"]');
        if (inp) inp.value = btn.getAttribute("data-val");
      };
    });
    $("#applyMissing").onclick = function () {
      S.recipes.forEach(function (r) {
        if (S.prices[r.id] == null) {
          var inp = v.querySelector('[data-pr="' + r.id + '"]');
          if (inp) inp.value = suggestedPrice(r);
        }
      });
      toast("Preços sugeridos preenchidos!");
    };
    $("#savePrices").onclick = async function () {
      var rows = [];
      v.querySelectorAll("[data-pr]").forEach(function (inp) {
        var rid = inp.getAttribute("data-pr"), raw = inp.value.trim();
        if (raw !== "") { var num = Math.max(0, Number(raw)); S.prices[rid] = num; rows.push({ bar_id: S.bar.id, recipe_id: rid, price: num }); }
        else delete S.prices[rid];
      });
      if (rows.length) {
        var r = await sb.from("bar_prices").upsert(rows, { onConflict: "bar_id,recipe_id" });
        if (r.error) { toast("Erro: " + r.error.message); return; }
      }
      $("#prMsg").textContent = "Preços salvos!";
      toast("Preços atualizados!");
    };
  }

  function careersView(v) {
    var mode = S.careerMode || (isManager() ? "store" : "personal");
    if (mode === "store" && !isManager()) mode = "personal";
    var storeMode = mode === "store";
    v.innerHTML =
      '<button type="button" class="b g sm" id="backMoreTab">← Voltar</button>' +
      '<h1 style="margin-top:12px">' + (storeMode ? "Equipe & Vagas da loja" : "Meu currículo & Vagas") + "</h1>" +
      '<div class="chips" style="flex-wrap:wrap;overflow:visible">' +
      (storeMode
        ? '<span class="chip on" id="tabCreateJob">Criar vagas</span>' +
          '<span class="chip" id="tabApps">Currículos (' + (S.receivedApps || []).length + ")</span>" +
          '<span class="chip" id="tabTeam">Equipe</span>'
        : '<span class="chip on" id="tabJobs">Vagas na região</span>' +
          '<span class="chip" id="tabProfile">Meu currículo</span>' +
          '<span class="chip" id="tabReq">Entrar na loja (@ + senha)</span>' +
          '<span class="chip" id="tabMyStores">Minhas lojas</span>') +
      '</div><div id="careerBox"></div>';

    $("#backMoreTab").onclick = function () {
      if (S.bar) { S.tab = "more"; paint(); }
      else { S.tab = "careers"; seekerShell(); }
    };
    var box = $("#careerBox");
    var setChip = function (id) {
      box.parentElement.querySelectorAll(".chips .chip").forEach(function (el) { el.classList.toggle("on", el.id === id); });
    };

    if (storeMode) {
      $("#tabCreateJob").onclick = function () { setChip("tabCreateJob"); renderCreateJobSection(box, S.bar); };
      $("#tabApps").onclick = function () { setChip("tabApps"); renderReceivedAppsByJobSection(box); };
      $("#tabTeam").onclick = function () { setChip("tabTeam"); renderTeamSection(box); };
      renderCreateJobSection(box, S.bar);
    } else {
      $("#tabJobs").onclick = function () { setChip("tabJobs"); renderJobsSection(box); };
      $("#tabProfile").onclick = function () { setChip("tabProfile"); renderProfileSection(box); };
      $("#tabReq").onclick = function () { setChip("tabReq"); renderHandleServiceSection(box); };
      if ($("#tabMyStores")) $("#tabMyStores").onclick = function () { setChip("tabMyStores"); renderMyStoreProfiles(box); };
      renderJobsSection(box);
    }
  }

  function renderTeamSection(box) {
    var members = S.members || [];
    var roles = [
      { id: "owner", label: "Dono" },
      { id: "gerente", label: "Gerente" },
      { id: "barman", label: "Barman" },
      { id: "garcom", label: "Garçom" },
      { id: "cozinha", label: "Cozinha" },
      { id: "caixa", label: "Caixa" }
    ];
    box.innerHTML =
      '<div class="panel"><h2>Equipe · ' + esc(S.bar.name) + '</h2>' +
      '<p class="mu">@ da loja: <b>@' + esc(S.bar.handle || "sem_handle") + '</b> — o funcionário usa este @ + a senha temporária.</p>' +
      '<label>Senha temporária de entrada</label>' +
      '<div class="row"><input id="svcPw" placeholder="Ex: 100899" style="flex:1" maxlength="24">' +
      '<button class="b sm" id="svcPwSave">Criar senha</button></div>' +
      '<p class="mu">Crie uma senha, envie ao funcionário. Depois de usada/aceita você pode apagar.</p>' +
      '<div class="list" style="margin-top:12px" id="svcPwList"><p class="mu">Carregando senhas…</p></div></div>' +
      '<div class="panel"><h2>Membros</h2><div class="list">' +
      (members.length ? members.map(function (m) {
        var isSelfOwner = m.role === "owner";
        return '<div style="align-items:flex-start"><div style="flex:1"><b>' + esc(m.name || "Membro") + '</b><br><span class="tag">' + esc(m.role || "") + '</span></div>' +
          (isSelfOwner
            ? '<span class="chip st1">Dono</span>'
            : '<select data-role="' + m.id + '">' +
              roles.map(function (r) {
                return '<option value="' + r.id + '"' + (m.role === r.id ? " selected" : "") + ">" + esc(r.label) + "</option>";
              }).join("") + '</select>' +
              '<button class="b g sm" data-rmm="' + m.id + '">Remover</button>') +
          "</div>";
      }).join("") : '<p class="mu">Só você na equipe por enquanto.</p>') +
      "</div></div>" +
      '<div class="panel"><h2>Pedidos de entrada (aguardando aceite)</h2>' +
      '<p class="mu">Quando alguém enviar convite com @ + senha, aparece aqui.</p>' +
      '<div class="list" id="svcReqList"><p class="mu">Carregando…</p></div></div>';

    $("#svcPwSave").onclick = async function () {
      var pw = ($("#svcPw").value || "").trim();
      if (pw.length < 4) return toast("Senha com pelo menos 4 caracteres");
      var r = await sb.from("bar_service_passwords").insert({
        bar_id: S.bar.id,
        password: pw,
        label: "Temporária " + new Date().toLocaleDateString("pt-BR")
      });
      if (r.error) {
        toast(r.error.message + " — rode o SQL de senhas no Supabase");
        return;
      }
      toast("Senha criada. Passe ao funcionário com o @" + (S.bar.handle || ""));
      $("#svcPw").value = "";
      loadSvcPasswords();
    };

    async function loadSvcPasswords() {
      var el = $("#svcPwList");
      if (!el) return;
      var r = await sb.from("bar_service_passwords").select("*").eq("bar_id", S.bar.id).order("created_at", { ascending: false });
      if (r.error) {
        el.innerHTML = '<p class="err">' + esc(r.error.message) + '</p><p class="mu">Rode o SQL de correção no Supabase (arquivo sql-senhas-equipe.sql).</p>';
        return;
      }
      el.innerHTML = (r.data || []).length
        ? (r.data || []).map(function (p) {
            return '<div><span><b>' + esc(p.password) + '</b><br><span class="mu">' + esc(p.label || "Senha") + '</span></span>' +
              '<button class="b g sm" data-dpw="' + p.id + '">Apagar</button></div>';
          }).join("")
        : '<p class="mu">Nenhuma senha ativa.</p>';
      el.querySelectorAll("[data-dpw]").forEach(function (b) {
        b.onclick = async function () {
          await sb.from("bar_service_passwords").delete().eq("id", b.getAttribute("data-dpw"));
          loadSvcPasswords();
        };
      });
    }
    loadSvcPasswords();

    box.querySelectorAll("[data-role]").forEach(function (sel) {
      sel.onchange = async function () {
        var r = await sb.from("bar_members").update({ role: sel.value }).eq("id", sel.getAttribute("data-role"));
        if (r.error) return toast(r.error.message);
        var m = (S.members || []).find(function (x) { return x.id === sel.getAttribute("data-role"); });
        if (m) m.role = sel.value;
        toast("Função atualizada");
      };
    });
    box.querySelectorAll("[data-rmm]").forEach(function (b) {
      b.onclick = async function () {
        if (!confirm("Remover da equipe?")) return;
        await sb.from("bar_members").delete().eq("id", b.getAttribute("data-rmm"));
        S.members = (S.members || []).filter(function (x) { return x.id !== b.getAttribute("data-rmm"); });
        renderTeamSection(box);
      };
    });

    (async function () {
      var el = $("#svcReqList");
      if (!el) return;
      var r = await sb.from("service_requests").select("*").eq("bar_id", S.bar.id).eq("status", "pendente").order("created_at", { ascending: false });
      if (r.error) {
        el.innerHTML = '<p class="err">' + esc(r.error.message) + "</p>";
        return;
      }
      var rows = r.data || [];
      el.innerHTML = rows.length ? rows.map(function (req) {
        return '<div style="align-items:flex-start"><div style="flex:1"><b>' + esc(req.requester_name || req.name || "Candidato") + '</b>' +
          '<br><span class="tag">' + esc(req.role || "garcom") + '</span>' +
          (req.requester_id ? '<br><span class="mu">' + esc(String(req.requester_id).slice(0, 8)) + "…</span>" : "") +
          '</div>' +
          '<button class="b sm ok" data-acc="' + req.id + '" data-uid="' + esc(req.requester_id || "") + '" data-role="' + esc(req.role || "garcom") + '" data-name="' + esc(req.requester_name || req.name || "Funcionário") + '">Aceitar</button>' +
          '<button class="b g sm" data-rej="' + req.id + '">Recusar</button></div>';
      }).join("") : '<p class="mu">Nenhum pedido pendente.</p>';

      el.querySelectorAll("[data-acc]").forEach(function (b) {
        b.onclick = async function () {
          var id = b.getAttribute("data-acc");
          var uid = b.getAttribute("data-uid");
          var role = b.getAttribute("data-role") || "garcom";
          var name = b.getAttribute("data-name") || "Funcionário";
          if (!uid) return toast("Pedido sem usuário");
          await sb.from("service_requests").update({ status: "aprovada" }).eq("id", id);
          var up = await sb.from("bar_members").upsert({
            bar_id: S.bar.id, user_id: uid, role: role, name: name
          }, { onConflict: "bar_id,user_id" });
          if (up.error) {
            up = await sb.from("bar_members").insert({ bar_id: S.bar.id, user_id: uid, role: role, name: name });
          }
          if (up.error) return toast(up.error.message);
          var mem = await sb.from("bar_members").select("*").eq("bar_id", S.bar.id);
          S.members = mem.data || [];
          toast("Aceito na equipe");
          renderTeamSection(box);
        };
      });
      el.querySelectorAll("[data-rej]").forEach(function (b) {
        b.onclick = async function () {
          await sb.from("service_requests").update({ status: "recusada" }).eq("id", b.getAttribute("data-rej"));
          renderTeamSection(box);
        };
      });
    })();
  }

  function renderMyStoreProfiles(box) {
    var list = S.bars || [];
    box.innerHTML = '<div class="panel"><h2>Perfis de loja</h2><p class="mu">Alterne entre seu perfil pessoal e as lojas em que você trabalha.</p><div class="list">' +
      '<div><div style="flex:1"><b>Perfil pessoal</b><br><span class="mu">Acesso completo ao app</span></div>' +
      (S.bar ? '<button class="b sm g" id="toPersonal">Usar pessoal</button>' : '<span class="chip st1">Ativo</span>') + "</div>" +
      list.map(function (x) {
        var active = S.bar && S.bar.id === x.bar.id;
        return '<div><div style="flex:1"><b>' + esc(x.bar.name) + '</b><br><span class="tag">' + esc(x.role) + (x.bar.handle ? " · @" + esc(x.bar.handle) : "") + '</span></div>' +
          (active ? '<span class="chip st1">Ativo</span>' : '<button class="b sm" data-ob="' + x.bar.id + '" data-rl="' + x.role + '">Entrar</button>') + "</div>";
      }).join("") +
      '</div></div>';
    if ($("#toPersonal")) $("#toPersonal").onclick = function () {
      S.bar = null; S.role = null; S.tab = "careers"; seekerShell();
    };
    box.querySelectorAll("[data-ob]").forEach(function (b) {
      b.onclick = async function () {
        var found = (S.bars || []).find(function (x) { return x.bar.id === b.getAttribute("data-ob"); });
        if (found) await openBar(found.bar, b.getAttribute("data-rl"));
      };
    });
  }


  function renderCreateJobSection(box, activeBar) {
    if (!activeBar.handle) {
      box.innerHTML = '<div class="panel"><h2>@ da loja obrigatório</h2><p class="err">Defina um @ único em Visual da loja antes de publicar vagas. Sem @ os funcionários não conseguem solicitar entrada.</p>' +
        '<button class="b full" id="goStudioHandle">Abrir Visual da loja</button></div>';
      if (box.querySelector("#goStudioHandle")) box.querySelector("#goStudioHandle").onclick = function () { S.tab = "studio"; paint(); };
      return;
    }
    box.innerHTML =
      '<div class="panel"><h2>Criar nova vaga (' + esc(activeBar.name) + ' · @' + esc(activeBar.handle) + ')</h2>' +
      '<label>Título da vaga</label><input id="jbTitle" placeholder="Ex: Barman ou Garçom para fim de semana">' +
      '<div class="row"><div class="grow"><label>Função</label><select id="jbRole">' + JOB_ROLES.map(function (r) {
        return '<option value="' + r + '">' + esc(ROLE_LABELS[r] || r) + "</option>";
      }).join("") + '</select></div><div class="grow"><label>Tipo</label><select id="jbType"><option value="freelance">Freelance</option><option value="contrato">Contrato</option></select></div></div>' +
      '<label>Localidade (mais próximos primeiro)</label>' +
      '<input id="jbLoc" value="' + esc(activeBar.city || "") + '" placeholder="Digite cidade/bairro" autocomplete="off">' +
      '<div class="loc-suggest-box" id="jbLocSug" style="display:none"></div>' +
      '<label>Pagamento / Detalhes</label><input id="jbPay" placeholder="Ex: Diária ou fixo">' +
      '<label>Descrição</label><textarea id="jbDesc"></textarea>' +
      '<button type="button" class="b sm" id="jbPub" style="margin-top:10px">Publicar vaga</button><p class="ok-txt" id="jbMsg"></p></div>';

    bindLocationSearchInput(box, "jbLoc", "jbLocSug");
    box.querySelector("#jbPub").onclick = async function () {
      var title = box.querySelector("#jbTitle").value.trim(), loc = box.querySelector("#jbLoc").value.trim();
      if (!title || !loc) { toast("Informe título e localidade."); return; }
      var r = await sb.from("job_posts").insert({
        bar_id: activeBar.id, created_by: S.user.id, title: title, role_needed: box.querySelector("#jbRole").value,
        contract_type: box.querySelector("#jbType").value, location: loc, pay_info: box.querySelector("#jbPay").value.trim() || null,
        description: box.querySelector("#jbDesc").value.trim() || null, is_open: true
      }).select().single();
      if (r.error) { toast("Erro: " + r.error.message); return; }
      box.querySelector("#jbMsg").textContent = "Vaga publicada!";
      await loadJobsAndRequests();
      toast("Vaga publicada!");
    };
  }

  function renderReceivedAppsByJobSection(box) {
    var byJob = {};
    S.receivedApps.forEach(function (a) {
      var jid = a.job_id || "geral";
      var jTitle = (a.job_posts && a.job_posts.title) ? a.job_posts.title : "Vaga";
      if (!byJob[jid]) byJob[jid] = { title: jTitle, items: [] };
      byJob[jid].items.push(a);
    });
    var groups = Object.keys(byJob).map(function (k) { return byJob[k]; });

    box.innerHTML =
      '<div class="panel"><h2>Currículos recebidos por vaga (' + S.receivedApps.length + ')</h2>' +
      (groups.length
        ? groups.map(function (g) {
            return '<div class="panel" style="background:var(--s2);margin-top:12px"><h3>Vaga: ' + esc(g.title) + " (" + g.items.length + ")</h3>" +
              '<div class="list" style="margin-top:10px">' + g.items.map(function (a) {
                var sp = a.staff_profiles || {};
                return '<div style="align-items:flex-start"><div class="row" style="align-items:flex-start;flex:1">' +
                  (sp.avatar_url ? '<img class="img-thumb" src="' + esc(sp.avatar_url) + '" alt="Rosto">' : "") +
                  '<div style="flex:1"><b>' + esc(sp.display_name || "Candidato") + "</b>" +
                  (sp.location ? '<br><span class="tag">📍 ' + esc(sp.location) + (sp.work_mode ? " · " + esc(sp.work_mode) : "") + (sp.experience_years ? " · " + esc(sp.experience_years) + "a exp." : "") + "</span>" : "") +
                  (Array.isArray(sp.skills) && sp.skills.length ? '<br><span class="tag">Funções: ' + esc(sp.skills.join(", ")) + "</span>" : "") +
                  (sp.resume_pdf_url ? '<br><a href="' + esc(sp.resume_pdf_url) + '" target="_blank" rel="noopener" style="color:var(--ac);font-size:.82rem">📄 Ver currículo em PDF</a>' : "") +
                  (sp.bio ? '<p class="mu" style="margin-top:6px">' + esc(sp.bio) + "</p>" : "") +
                  "</div></div></div>";
              }).join("") + "</div></div>";
          }).join("")
        : '<p class="mu" style="margin-top:8px">Nenhum currículo recebido ainda.</p>') + "</div>";
  }

  function renderProfileSection(box) {
    var p = S.profile || {}, selected = new Set(p.skills || []);
    box.innerHTML =
      '<div class="panel"><h2>Meu Currículo Profissional</h2>' +
      '<label>Nome profissional</label><input id="pfName" value="' + esc(p.display_name || "") + '">' +
      '<div id="pfAvatarBox"></div>' +
      '<label>Anexar currículo em PDF (junto ao digital)</label>' +
      '<input type="file" id="pfPdfInp" accept="application/pdf">' +
      '<input id="pfPdfUrl" value="' + esc(p.resume_pdf_url || "") + '" placeholder="Link do PDF (preenchido ao anexar)" style="margin-top:6px">' +
      '<label>Localidade (digite para sugestões da mais próxima)</label>' +
      '<input id="pfLoc" value="' + esc(p.location || "") + '" placeholder="Ex: Asa Sul, Brasília, DF" autocomplete="off">' +
      '<div class="loc-suggest-box" id="pfLocSug" style="display:none"></div>' +
      '<label>Vínculo</label><select id="pfMode">' + ["ambos", "contrato", "freelance"].map(function (m) {
        return '<option value="' + m + '" ' + (p.work_mode === m ? "selected" : "") + '>' + m.charAt(0).toUpperCase() + m.slice(1) + "</option>";
      }).join("") + '</select>' +
      '<label>Anos de experiência</label><input id="pfExp" type="number" min="0" max="50" value="' + esc(p.experience_years || 0) + '">' +
      '<label>Disponibilidade</label><input id="pfAvail" value="' + esc(p.availability || "") + '" placeholder="Ex: Noites, fins de semana, eventos">' +
      '<label>Qualidades / Funções</label><div class="chips" style="flex-wrap:wrap;overflow:visible">' + SKILL_OPTIONS.map(function (sk) {
        return '<span class="chip ' + (selected.has(sk) ? "on" : "") + '" data-sk="' + esc(sk) + '">' + esc(sk) + "</span>";
      }).join("") + '</div>' +
      '<label>Resumo profissional</label><textarea id="pfBio">' + esc(p.bio || "") + "</textarea>" +
      '<button type="button" class="b full" id="pfSave" style="margin-top:14px">Salvar currículo</button><p class="err" id="pfErr"></p><p class="ok-txt" id="pfMsg"></p></div>';

    box.querySelector("#pfAvatarBox").innerHTML = imageUploaderHtml("pfAv", "Foto de rosto (obrigatória — câmera ou galeria)", p.avatar_url || "");
    bindImageUploader(box, "pfAv", "avatars");
    bindLocationSearchInput(box, "pfLoc", "pfLocSug");

    var pdfInp = box.querySelector("#pfPdfInp");
    if (pdfInp) {
      pdfInp.onchange = async function () {
        if (!pdfInp.files || !pdfInp.files[0]) return;
        toast("Enviando PDF...");
        var u = await uploadPdfFile(pdfInp.files[0], "resumes");
        if (u) { box.querySelector("#pfPdfUrl").value = u; toast("PDF anexado!"); }
      };
    }

    box.querySelectorAll("[data-sk]").forEach(function (ch) {
      ch.onclick = function () {
        var s = ch.getAttribute("data-sk");
        if (selected.has(s)) selected.delete(s); else selected.add(s);
        ch.classList.toggle("on");
      };
    });

    box.querySelector("#pfSave").onclick = async function () {
      box.querySelector("#pfErr").textContent = "";
      var avatarVal = (box.querySelector("#pfAvUrl").value || "").trim();
      if (!avatarVal) {
        box.querySelector("#pfErr").textContent = "A foto de rosto é obrigatória no currículo.";
        toast("Coloque uma foto de rosto no currículo.");
        return;
      }
      var r = await sb.from("staff_profiles").upsert({
        user_id: S.user.id,
        display_name: box.querySelector("#pfName").value.trim() || "Profissional",
        avatar_url: avatarVal,
        resume_pdf_url: (box.querySelector("#pfPdfUrl").value || "").trim() || null,
        location: box.querySelector("#pfLoc").value.trim() || null,
        work_mode: box.querySelector("#pfMode").value,
        experience_years: Math.max(0, parseInt(box.querySelector("#pfExp").value, 10) || 0),
        availability: box.querySelector("#pfAvail").value.trim() || null,
        skills: Array.from(selected),
        bio: box.querySelector("#pfBio").value.trim() || null,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" }).select().single();
      if (r.error) { toast("Erro: " + r.error.message); return; }
      S.profile = r.data;
      box.querySelector("#pfMsg").textContent = "Currículo salvo!";
      toast("Currículo salvo!");
    };
  }

  function renderJobsSection(box) {
    var origin = S.userCoords || { lat: -15.7942, lon: -47.8822 };
    var list = S.jobs
      .map(function (j) {
        var bCoords = j.bars && j.bars.lat != null && j.bars.lon != null ? { lat: Number(j.bars.lat), lon: Number(j.bars.lon) } : null;
        var km = bCoords ? haversineKm(origin, bCoords) : 9999;
        return Object.assign({}, j, { _km: km });
      })
      .filter(function (j) {
        if (S.jobRoleFilter !== "todas" && j.role_needed !== S.jobRoleFilter) return false;
        if (S.jobTypeFilter !== "todas" && j.contract_type !== S.jobTypeFilter) return false;
        if (S.jobLocFilter.trim() && !(j.location || (j.bars && j.bars.city) || "").toLowerCase().includes(S.jobLocFilter.trim().toLowerCase())) return false;
        var radius = S.jobRadiusKm != null ? Number(S.jobRadiusKm) : 50;
        if (origin && j._km != null && j._km < 9000 && j._km > radius) return false;
        return true;
      })
      .sort(function (a, b) { return a._km - b._km; });

    box.innerHTML =
      '<div class="panel"><h2>Vagas disponíveis (mais próximas primeiro)</h2>' +
      '<div class="row" style="margin-bottom:8px">' + useMyLocationBtnHtml("fltGeo") +
      '<select id="fltRadius" style="width:auto">' +
      [5,10,25,50,100,200].map(function (km) {
        return '<option value="' + km + '"' + ((S.jobRadiusKm || 50) == km ? " selected" : "") + ">Até " + km + " km</option>";
      }).join("") + "</select></div>" +
      '<div class="row">' +
      '<div class="grow"><label>Localidade</label><input id="fltLoc" value="' + esc(S.jobLocFilter) + '" placeholder="Cidade ou bairro (opcional)" autocomplete="off">' +
      '<div class="loc-suggest-box" id="fltLocSug" style="display:none"></div></div>' +
      '<div class="grow"><label>Vínculo</label><select id="fltType"><option value="todas" ' + (S.jobTypeFilter === "todas" ? "selected" : "") + '>Contrato e Freelance</option><option value="contrato" ' + (S.jobTypeFilter === "contrato" ? "selected" : "") + '>Contrato</option><option value="freelance" ' + (S.jobTypeFilter === "freelance" ? "selected" : "") + '>Freelance</option></select></div></div>' +
      '<div class="chips" style="flex-wrap:wrap;overflow:visible;margin-top:10px">' + ["todas"].concat(JOB_ROLES).map(function (r) {
        return '<span class="chip ' + (S.jobRoleFilter === r ? "on" : "") + '" data-jr="' + r + '">' + (r === "todas" ? "Todas funções" : esc(ROLE_LABELS[r] || r)) + "</span>";
      }).join("") + '</div></div><div class="list" style="margin-top:12px">' +
      (list.length ? list.map(function (j) {
        var applied = S.myApps.some(function (a) { return a.job_id === j.id; });
        var bName = j.bars ? j.bars.name + (j.bars.handle ? " (@" + j.bars.handle + ")" : "") : "Estabelecimento";
        var distTxt = j._km < 9000 ? " · " + j._km.toFixed(1) + " km" : "";
        return '<div style="align-items:flex-start"><div style="flex:1"><b>' + esc(j.title) + '</b> <span class="badge-warn">' + esc(j.contract_type) + " · " + esc(ROLE_LABELS[j.role_needed] || j.role_needed) + "</span>" +
          '<br><span class="tag">' + esc(bName) + " · 📍 " + esc(j.location) + distTxt +
          ' · <a href="' + esc(externalMapUrl(j.bars || { city: j.location })) + '" target="_blank" rel="noopener" style="color:var(--ac)">Abrir no mapa</a></span>' +
          (j.description ? '<p class="mu" style="margin-top:6px">' + esc(j.description) + "</p>" : "") +
          '</div><button type="button" class="b sm ' + (applied ? "g" : "") + '" ' + (applied ? "disabled" : 'data-apply="' + j.id + '"') + '>' + (applied ? "Candidatado" : "Candidatar-se") + "</button></div>";
      }).join("") : '<p class="mu">Nenhuma vaga disponível no momento.</p>') + "</div>";

    bindLocationSearchInput(box, "fltLoc", "fltLocSug", null, null, function (chosen) {
      S.jobLocFilter = chosen.label;
      renderJobsSection(box);
    });
    if (box.querySelector("#fltLoc")) box.querySelector("#fltLoc").oninput = function (e) { S.jobLocFilter = e.target.value; renderJobsSection(box); };
    if (box.querySelector("#fltRadius")) box.querySelector("#fltRadius").onchange = function (e) { S.jobRadiusKm = Number(e.target.value) || 50; renderJobsSection(box); };
    bindUseMyLocation(box.querySelector("#fltGeo"), function () { renderJobsSection(box); });
    if (box.querySelector("#fltType")) box.querySelector("#fltType").onchange = function (e) { S.jobTypeFilter = e.target.value; renderJobsSection(box); };
    box.querySelectorAll("[data-jr]").forEach(function (ch) { ch.onclick = function () { S.jobRoleFilter = ch.getAttribute("data-jr"); renderJobsSection(box); }; });
    box.querySelectorAll("[data-apply]").forEach(function (btn) {
      btn.onclick = async function () {
        var r = await sb.from("job_applications").insert({ job_id: btn.getAttribute("data-apply"), applicant_id: S.user.id, message: "Currículo enviado." });
        if (r.error) { toast("Erro: " + r.error.message); return; }
        toast("Candidatura enviada!"); await loadJobsAndRequests(); renderJobsSection(box);
      };
    });
  }

  async function renderHandleServiceSection(box) {
    var approvedReq = S.serviceReqs.find(function (x) { return x.status === "aprovada" || x.status === "aceita"; });
    box.innerHTML =
      '<div class="panel"><h2>Solicitar serviço para a loja</h2>' +
      (approvedReq
        ? '<p class="ok-txt">✓ Solicitação aprovada para ' + esc(approvedReq.bars ? approvedReq.bars.name : "a loja") + "!</p>"
        : '<p class="mu">Preencha o @ da loja e a senha para enviar sua solicitação.</p>') +
      '<label>@ da loja</label><input id="svcHandle" placeholder="Ex: @minha_casa_7228">' +
      '<label>Senha da loja</label><input id="svcPass" placeholder="Senha gerada pelo dono ou gerente">' +
      '<label>Função</label><select id="svcRole"><option value="barman">Barman</option><option value="garcom">Garçom</option><option value="cozinha">Cozinha</option><option value="caixa">Caixa</option></select>' +
      '<button type="button" class="b full" id="svcSend" style="margin-top:12px">Enviar solicitação para a loja</button><p class="ok-txt" id="svcOk"></p><p class="err" id="svcErr"></p></div>';

    box.querySelector("#svcSend").onclick = async function () {
      box.querySelector("#svcErr").textContent = ""; box.querySelector("#svcOk").textContent = "";
      var r = await sb.rpc("request_service_by_handle", { p_handle: box.querySelector("#svcHandle").value, p_password: box.querySelector("#svcPass").value, p_role: box.querySelector("#svcRole").value });
      if (r.error) { box.querySelector("#svcErr").textContent = r.error.message; return; }
      box.querySelector("#svcOk").textContent = "Solicitação enviada para a loja!";
      await loadJobsAndRequests();
    };
  }

  
  function getMenuPresets(bar) {
    var p = bar && bar.menu_presets;
    if (!p) return [];
    if (typeof p === "string") { try { p = JSON.parse(p); } catch(e){ return []; } }
    return Array.isArray(p) ? p : [];
  }

  function storeStudioView(v) {
    var b = S.bar;
    v.innerHTML =
      '<button type="button" class="b g sm" id="backMoreSt">← Voltar para Mais</button>' +
      '<h1 style="margin-top:12px">Estúdio da Loja & Cardápio</h1>' +
      '<p class="mu">Personalize a identidade livre da loja (como criação de emblema) e escolha o modo da área de drinks.</p>' +
      '<div class="panel"><h2>Presets do cardápio (QR)</h2>' +
      '<p class="mu">Salve logo, cores, fonte e modo. O QR é o mesmo; o visual muda para quem abrir depois.</p>' +
      '<label>Preset salvo</label><select id="stPreset"><option value="">— visual atual —</option>' +
      getMenuPresets(b).map(function(p){ return '<option value="'+esc(p.id)+'">'+esc(p.preset_name||'Preset')+'</option>'; }).join('') + '</select>' +
      '<div class="row" style="margin-top:10px"><input class="grow" id="stPresetName" placeholder="Nome (ex: Happy Hour)">' +
      '<button type="button" class="b sm" id="stSavePreset">Salvar preset</button></div>' +
      '<button type="button" class="b g sm" id="stApplyPreset" style="margin-top:8px">Aplicar</button> ' +
      '<button type="button" class="b g sm" id="stDelPreset" style="margin-top:8px">Excluir</button></div>' +
      '<div class="panel"><h2>1. Área central de drinks (modo de exibição)</h2>' +
      '<label>Modo da área de drinks</label><select id="stMode">' + DISPLAY_MODES.map(function (m) {
        return '<option value="' + m.id + '" ' + ((b.menu_display_mode || "grid-classic") === m.id ? "selected" : "") + '>' + esc(m.label) + "</option>";
      }).join("") + "</select></div>" +
      '<div class="panel"><h2>2. Identidade livre da loja (7+ itens combináveis)</h2>' +
      '<label>1) Nome da loja</label><input id="stName" value="' + esc(b.name || "") + '">' +
      '<label>2) Slogan da loja</label><input id="stSlogan" value="' + esc(b.slogan || "") + '" placeholder="Ex: Drinks autorais & boas noites">' +
      '<div id="stLogoBox"></div>' +
      '<label>4) Fonte do nome da loja</label><select id="stFont">' + NAME_FONTS.map(function (f) {
        return '<option value="' + f.id + '" ' + ((b.name_font || "store-font-serif") === f.id ? "selected" : "") + '>' + esc(f.label) + "</option>";
      }).join("") + "</select>" +
      '<label>5a) Base do emblema</label><select id="stCrestBase">' + CREST_BASES.map(function (x) { return '<option value="' + x.id + '" ' + ((b.crest_base||'circle')===x.id?'selected':'') + '>' + esc(x.label) + '</option>';}).join('') + '</select>' +
      '<label>5b) Ícone central</label><select id="stCrestIcon">' + CREST_ICONS.map(function (x) { return '<option value="' + x.id + '" ' + ((b.crest_icon||'glass')===x.id?'selected':'') + '>' + esc(x.emoji+' '+x.label) + '</option>';}).join('') + '</select>' +
      '<label>5c) Ornamento</label><select id="stCrestOrn">' + CREST_ORNAMENTS.map(function (x) { return '<option value="' + x.id + '" ' + ((b.crest_ornament||'none')===x.id?'selected':'') + '>' + esc((x.emoji?x.emoji+' ':'')+x.label) + '</option>';}).join('') + '</select>' +
      '<label>5) Desenho / Borda (estilo bandeira/brasão)</label><select id="stBorder">' + BORDER_STYLES.map(function (br) {
        return '<option value="' + br.id + '" ' + ((b.crest_border || "crest-border-gold") === br.id ? "selected" : "") + '>' + esc(br.label) + "</option>";
      }).join("") + "</select>" +
      '<div class="row"><div class="grow"><label>6) Posição da logo</label><select id="stLogoPos">' + POS_OPTIONS.map(function (p) {
        return '<option value="' + p.id + '" ' + ((b.logo_pos || "left") === p.id ? "selected" : "") + '>' + esc(p.label) + "</option>";
      }).join("") + '</select></div>' +
      '<div class="grow"><label>7) Posição do nome</label><select id="stNamePos">' + POS_OPTIONS.map(function (p) {
        return '<option value="' + p.id + '" ' + ((b.name_pos || "left") === p.id ? "selected" : "") + '>' + esc(p.label) + "</option>";
      }).join("") + "</select></div></div>" +
      '<label>8) Localização da loja</label>' +
      '<div class="row" style="margin-bottom:6px">' + useMyLocationBtnHtml("stGeo") + '</div>' +
      '<input id="stCity" value="' + esc(b.city || "") + '" placeholder="Digite localização da loja" autocomplete="off">' +
      '<div class="loc-suggest-box" id="stCitySug" style="display:none"></div>' +
      '<input type="hidden" id="stLat" value="' + esc(b.lat != null ? b.lat : "") + '">' +
      '<input type="hidden" id="stLon" value="' + esc(b.lon != null ? b.lon : "") + '">' +
      '<div class="row"><div class="grow"><label>Paleta: Fundo</label><input type="color" id="stBg" value="' + esc(b.color_bg || "#0b0a0d") + '"></div>' +
      '<div class="grow"><label>Paleta: Superfície</label><input type="color" id="stS1" value="' + esc(b.color_surface || "#141218") + '"></div>' +
      '<div class="grow"><label>Paleta: Destaque</label><input type="color" id="stAc" value="' + esc(b.color_accent || "#e5a93c") + '"></div>' +
      '<div class="grow"><label>Paleta: Texto</label><input type="color" id="stTx" value="' + esc(b.color_text || "#f6f1ea") + '"></div></div>' +
      '<button type="button" class="b full" id="stSave" style="margin-top:16px">Salvar visual e modo do cardápio</button>' +
      '<p class="ok-txt" id="stMsg"></p></div>' +
      '<h2>Prévia da identidade</h2><div id="stPreview" style="margin-top:10px"></div>';

    $("#stLogoBox").innerHTML = imageUploaderHtml("stLg", "3) Logo da loja (câmera ou galeria)", b.logo_url || "");
    bindImageUploader(v, "stLg", "logos", function () { renderCrestPreview(); });
    bindLocationSearchInput(v, "stCity", "stCitySug", "stLat", "stLon", function () { renderCrestPreview(); });

    var alignMap = { left: "flex-start", center: "center", right: "flex-end" };
    var renderCrestPreview = function () {
      var nm = $("#stName").value.trim() || b.name;
      var sl = $("#stSlogan").value.trim();
      var lg = ($("#stLgUrl").value || "").trim() || ((window.BRAND && window.BRAND.logo) || "logo.png");
      var fn = $("#stFont").value;
      var brd = $("#stBorder").value;
      var lp = alignMap[$("#stLogoPos").value] || "flex-start";
      var np = alignMap[$("#stNamePos").value] || "flex-start";
      var ct = $("#stCity").value.trim();

      applyBarTheme({
        color_bg: $("#stBg").value,
        color_surface: $("#stS1").value,
        color_accent: $("#stAc").value,
        color_text: $("#stTx").value
      });

      $("#stPreview").innerHTML =
        '<div class="crest-frame ' + esc(brd) + '">' +
        '<div style="display:flex;justify-content:' + lp + '"><img class="logo big" src="' + esc(lg) + '" alt="Logo" onerror="this.style.display=\'none\'"></div>' +
        '<div style="display:flex;justify-content:' + np + ';margin-top:10px"><h2 class="' + esc(fn) + '" style="margin:0">' + esc(nm) + "</h2></div>" +
        (sl ? '<p class="mu" style="margin-top:6px">' + esc(sl) + "</p>" : "") +
        (ct ? '<p class="tag" style="margin-top:6px">📍 ' + esc(ct) + ' · <a href="' + esc(externalMapUrl({ city: ct, lat: $("#stLat").value, lon: $("#stLon").value })) + '" target="_blank" rel="noopener" style="color:var(--ac)">Abrir no mapa externo</a></p>' : "") +
        "</div>";
    };

    ["stName", "stSlogan", "stFont", "stBorder", "stLogoPos", "stNamePos", "stCity", "stBg", "stS1", "stAc", "stTx"].forEach(function (id) {
      $("#" + id).oninput = renderCrestPreview;
    });
    renderCrestPreview();

    
    // Prévia ao vivo (estilo canvas)
    var prev = document.createElement("div");
    prev.id = "menuLivePreviewWrap";
    prev.innerHTML = '<div class="panel" style="position:sticky;bottom:70px;z-index:5;border:1px solid var(--ac);background:var(--card,#16131a)"><h2 style="margin:0 0 8px">Prévia do cardápio (cliente)</h2><div id="menuLivePreview" style="border-radius:16px;padding:16px;min-height:160px"></div><p class="mu" style="margin-top:8px">Atualiza em tempo real conforme você edita.</p></div>';
    v.appendChild(prev);
    function crestEmoji() {
      var base = (document.getElementById("stCrestBase") && document.getElementById("stCrestBase").value) || b.crest_base || "circle";
      var icon = (document.getElementById("stCrestIcon") && document.getElementById("stCrestIcon").value) || b.crest_icon || "glass";
      var orn = (document.getElementById("stCrestOrn") && document.getElementById("stCrestOrn").value) || b.crest_ornament || "none";
      var be = (CREST_BASES.find(function(x){return x.id===base})||{}).emoji || "";
      var ie = (CREST_ICONS.find(function(x){return x.id===icon})||{}).emoji || "🍸";
      var oe = (CREST_ORNAMENTS.find(function(x){return x.id===orn})||{}).emoji || "";
      return (oe ? oe + " " : "") + ie + (be ? " " + be : "");
    }
    function updateLivePreview() {
      var el = document.getElementById("menuLivePreview");
      if (!el) return;
      var bg = (document.getElementById("stBg") && document.getElementById("stBg").value) || b.color_bg || "#0b0a0d";
      var surf = (document.getElementById("stSurface") && document.getElementById("stSurface").value) || b.color_surface || "#16131a";
      var ac = (document.getElementById("stAccent") && document.getElementById("stAccent").value) || b.color_accent || "#c47b3a";
      var tx = (document.getElementById("stText") && document.getElementById("stText").value) || b.color_text || "#f3ebe2";
      var name = (document.getElementById("stName") && document.getElementById("stName").value) || b.name || "Sua loja";
      var slogan = (document.getElementById("stSlogan") && document.getElementById("stSlogan").value) || b.slogan || "";
      var logo = (document.getElementById("stLgUrl") && document.getElementById("stLgUrl").value) || b.logo_url || "";
      el.style.background = bg;
      el.style.color = tx;
      var samples = (S.recipes || []).filter(function(){return true;}).slice(0, 3);
      el.innerHTML =
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' +
        (logo ? '<img src="' + esc(logo) + '" style="width:40px;height:40px;border-radius:10px;object-fit:cover">' :
          '<div style="width:44px;height:44px;border-radius:12px;background:' + ac + '22;display:flex;align-items:center;justify-content:center;font-size:1.3rem">' + crestEmoji() + '</div>') +
        '<div><div style="font-weight:700;font-size:1.15rem;color:' + ac + '">' + esc(name) + '</div>' +
        (slogan ? '<div style="opacity:.75;font-size:.85rem">' + esc(slogan) + '</div>' : '') + '</div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        (samples.length ? samples.map(function (r) {
          return '<div style="background:' + surf + ';border-radius:12px;padding:10px"><div style="font-size:1.2rem">🍸</div><div style="font-weight:600;font-size:.9rem">' + esc(r.name) + '</div></div>';
        }).join("") : '<div style="opacity:.6">Adicione receitas para ver cards aqui</div>') +
        '</div>';
    }
    updateLivePreview();
    v.querySelectorAll("input, select").forEach(function (el) {
      el.addEventListener("input", updateLivePreview);
      el.addEventListener("change", updateLivePreview);
    });

    $("#backMoreSt").onclick = function () { applyBarTheme(S.bar); moreView(v); };
    $("#stSave").onclick = async function () {
      var patch = {
        name: $("#stName").value.trim() || b.name,
        slogan: $("#stSlogan").value.trim() || null,
        logo_url: ($("#stLgUrl").value || "").trim() || null,
        name_font: $("#stFont").value,
        crest_border: $("#stBorder").value,
        logo_pos: $("#stLogoPos").value,
        name_pos: $("#stNamePos").value,
        menu_display_mode: $("#stMode").value,
        city: $("#stCity").value.trim() || null,
        lat: $("#stLat").value ? Number($("#stLat").value) : null,
        lon: $("#stLon").value ? Number($("#stLon").value) : null,
        color_bg: $("#stBg").value,
        color_surface: $("#stS1").value,
        color_accent: $("#stAc").value,
        color_text: $("#stTx").value
      };
      var r = await writeBarSafe("update", patch, b.id);
      if (r.error) { toast("Erro: " + r.error.message); return; }
      S.bar = r.data;
      applyBarTheme(S.bar);
      $("#stMsg").textContent = "Visual e modo salvos!";
      toast("Visual da loja salvo!");
    };
  }

    function themeFromStudio() {
      return {
        name: ($("#stName")&&$("#stName").value||"").trim(),
        slogan: ($("#stSlogan")&&$("#stSlogan").value||"").trim(),
        logo_url: ($("#stLgUrl")&&$("#stLgUrl").value||"").trim(),
        banner_url: ($("#stBnUrl")&&$("#stBnUrl").value||"").trim(),
        name_font: $("#stFont")&&$("#stFont").value,
        crest_border: $("#stBorder")&&$("#stBorder").value,
        logo_pos: $("#stLogoPos")&&$("#stLogoPos").value,
        name_pos: $("#stNamePos")&&$("#stNamePos").value,
        menu_display_mode: $("#stMode")&&$("#stMode").value,
        color_bg: $("#stBg")&&$("#stBg").value,
        color_surface: $("#stSurface")&&$("#stSurface").value,
        color_accent: $("#stAccent")&&$("#stAccent").value,
        color_ok: $("#stOk")&&$("#stOk").value,
        color_text: $("#stText")&&$("#stText").value
      };
    }
    if ($("#stSavePreset")) $("#stSavePreset").onclick = async function () {
      var pname = ($("#stPresetName").value||"").trim();
      if (!pname) { toast("Digite um nome para o preset"); return; }
      var presets = getMenuPresets(S.bar);
      var id = "p_"+Math.random().toString(36).slice(2,9);
      presets.push(Object.assign({id:id, preset_name:pname, saved_at:new Date().toISOString()}, themeFromStudio()));
      var r = await writeBarSafe("update", { menu_presets: presets, active_menu_preset: id }, S.bar.id);
      if (r.error) return toast(r.error.message);
      if (r.data) S.bar = r.data;
      toast("Preset salvo"); storeStudioView(v);
    };
    if ($("#stApplyPreset")) $("#stApplyPreset").onclick = async function () {
      var id = $("#stPreset").value; if (!id) return toast("Escolha um preset");
      var p = getMenuPresets(S.bar).find(function(x){ return x.id===id; }); if (!p) return;
      var payload = Object.assign({}, p); delete payload.id; delete payload.preset_name; delete payload.saved_at;
      payload.active_menu_preset = id;
      var r = await writeBarSafe("update", payload, S.bar.id);
      if (r.error) return toast(r.error.message);
      if (r.data) S.bar = r.data;
      applyBarTheme(S.bar); toast("Preset aplicado"); storeStudioView(v);
    };
    if ($("#stDelPreset")) $("#stDelPreset").onclick = async function () {
      var id = $("#stPreset").value; if (!id) return toast("Escolha um preset");
      var presets = getMenuPresets(S.bar).filter(function(x){ return x.id!==id; });
      var r = await writeBarSafe("update", { menu_presets: presets }, S.bar.id);
      if (r.error) return toast(r.error.message);
      if (r.data) S.bar = r.data;
      toast("Preset excluído"); storeStudioView(v);
    };

  function openQrModal() {
    var o = document.createElement("div");
    o.className = "ov";
    o.innerHTML =
      '<div class="w narrow"><button type="button" class="b g sm" id="closeQr">← Voltar</button>' +
      '<h1 style="margin-top:14px">QR do cardápio</h1>' +
      '<p class="mu">O QR é fixo. O visual do cardápio segue o design ativo (preset).</p>' +
      '<label>Design do cardápio</label><select id="qrDesign">' +
      '<option value="">Visual atual</option>' +
      getMenuPresets(S.bar).map(function (p) {
        return '<option value="' + esc(p.id) + '"' + ((S.bar.active_menu_preset === p.id) ? " selected" : "") + ">" + esc(p.preset_name || "Preset") + "</option>";
      }).join("") + "</select>" +
      '<div class="row" style="margin-top:12px">' +
      '<div class="grow"><label>Mesa (opcional)</label><select id="qrMesaSel">' +
      '<option value="">Cardápio geral</option>' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(function (n) {
        return '<option value="Mesa ' + n + '">Mesa ' + n + "</option>";
      }).join("") +
      '<option value="custom">Mesa personalizada...</option></select></div></div>' +
      '<div id="qrCustomWrap" style="display:none"><label>Nome/número da mesa</label><input id="qrCustomInp" placeholder="Ex: Mesa 14 / Varanda 2"></div>' +
      '<div style="text-align:center"><div class="qr-box"><img id="qrImg" width="196" height="196" alt="QR Code"><span class="tag" id="qrLabel" style="color:#222"></span></div></div>' +
      '<p class="tag" id="qrLinkTxt" style="word-break:break-all;text-align:center"></p>' +
      '<div class="row" style="margin-top:14px"><button type="button" class="b grow" id="qrCopyBtn">Copiar link</button>' +
      '<a class="b g grow" id="qrOpenBtn" target="_blank" rel="noopener">Abrir cardápio</a></div></div>';

    document.body.appendChild(o);
    var dSel = o.querySelector("#qrDesign");
    if (dSel) dSel.onchange = async function () {
      var id = dSel.value; if (!id) return;
      var p = getMenuPresets(S.bar).find(function (x) { return x.id === id; });
      if (!p) return;
      var payload = Object.assign({}, p);
      delete payload.id; delete payload.preset_name; delete payload.saved_at;
      payload.active_menu_preset = id;
      var r = await writeBarSafe("update", payload, S.bar.id);
      if (!r.error && r.data) { S.bar = r.data; applyBarTheme(S.bar); toast("Design ativo: " + (p.preset_name || "")); }
    };
    var sel = o.querySelector("#qrMesaSel");
    var cWrap = o.querySelector("#qrCustomWrap");
    var cInp = o.querySelector("#qrCustomInp");

    var updateQr = function () {
      var val = sel.value === "custom" ? (cInp.value || "").trim() : sel.value;
      var url = menuUrl(S.bar.id, val);
      o.querySelector("#qrLabel").textContent = val ? (S.bar.name + " · " + val) : S.bar.name;
      o.querySelector("#qrLinkTxt").textContent = url;
      o.querySelector("#qrOpenBtn").href = url;
      o.querySelector("#qrImg").src = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(url);
    };

    sel.onchange = function () {
      cWrap.style.display = sel.value === "custom" ? "block" : "none";
      updateQr();
    };
    cInp.oninput = updateQr;
    o.querySelector("#closeQr").onclick = function () { o.remove(); };
    o.querySelector("#qrCopyBtn").onclick = function () {
      if (navigator.clipboard) navigator.clipboard.writeText(o.querySelector("#qrLinkTxt").textContent);
      toast("Link do QR copiado!");
    };
    updateQr();
  }

  function openShakersModal() {
    var o = document.createElement("div");
    o.className = "ov";
    o.innerHTML =
      '<div class="w narrow"><button type="button" class="b g sm" id="closeSh">← Voltar</button>' +
      '<h1 style="margin-top:14px">Coqueteleiras</h1>' +
      '<p class="mu">Tamanhos e quantidade de coqueteleiras que você usa.</p>' +
      '<div class="panel"><label>Quantidade de coqueteleiras</label><input id="shCount" type="number" min="1" max="50" value="' + esc(S.bar.shakers || 2) + '">' +
      '<button type="button" class="b full" id="shSave" style="margin-top:14px">Salvar</button></div></div>';
    document.body.appendChild(o);
    o.querySelector("#closeSh").onclick = function () { o.remove(); };
    o.querySelector("#shSave").onclick = async function () {
      var cnt = Math.max(1, parseInt(o.querySelector("#shCount").value, 10) || 2);
      var r = await writeBarSafe("update", { shakers: cnt }, S.bar.id);
      if (!r.error && r.data) { S.bar = r.data; toast("Coqueteleiras salvas!"); }
      o.remove();
    };
  }

  function openCreateDrinkModal(editExisting) {
    var o = document.createElement("div");
    o.className = "ov";
    o.innerHTML =
      '<div class="w narrow"><button type="button" class="b g sm" id="closeDr">← Voltar</button>' +
      '<h1 style="margin-top:14px">' + (editExisting ? "Editar / Criar receita" : "Criar drink") + "</h1>" +
      (editExisting
        ? '<label>Escolha uma receita para editar ou deixe em branco para nova</label><select id="pickRec"><option value="">— Nova receita —</option>' +
          S.recipes.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + "</option>"; }).join("") + "</select>"
        : "") +
      '<label>Nome do drink</label><input id="drName" placeholder="Ex: Gin Tônica de Hibisco">' +
      '<label>Categoria</label><select id="drCat">' + CATS.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("") + "</select>" +
      '<div id="drImgBox"></div>' +
      '<label>Ingredientes</label><div id="drIngList"></div><button type="button" class="b g sm" id="drIngAdd" style="margin-top:8px">+ Ingrediente</button>' +
      '<p class="mu">Nome pela lista (obrigatório). Quantidade livre (ex: 50 ml).</p>' +
      '<label>Modo de preparo</label><textarea id="drPrep" placeholder="Como montar ou bater o drink"></textarea>' +
      '<label>História do drink</label><textarea id="drStory" placeholder="Origem ou curiosidade"></textarea>' +
      '<button type="button" class="b full" id="drSave" style="margin-top:14px">Salvar receita</button><p class="err" id="drErr"></p></div>';

    document.body.appendChild(o);
    o.querySelector("#drImgBox").innerHTML = imageUploaderHtml("drIm", "Foto do drink (câmera ou galeria)", "");
    bindImageUploader(o, "drIm", "recipes");
    function addIngRow(name, qty) {
      var box = o.querySelector("#drIngList");
      if (!box) return;
      var row = document.createElement("div");
      row.className = "row"; row.style.marginTop = "8px";
      row.innerHTML = '<div class="grow">' + ingredientSelectHtml("x", name || "") + '</div>' +
        '<input data-q placeholder="Qtd" value="' + esc(qty || "") + '" style="width:110px">' +
        '<button type="button" class="b g sm" data-rm>×</button>';
      var sel = row.querySelector("select");
      if (sel) { sel.removeAttribute("id"); if (name) sel.value = name; }
      row.querySelector("[data-rm]").onclick = function () { row.remove(); };
      box.appendChild(row);
    }
    if (o.querySelector("#drIngAdd")) {
      o.querySelector("#drIngAdd").onclick = function () { addIngRow("", ""); };
      addIngRow("", "");
    }


    if (o.querySelector("#pickRec")) {
      o.querySelector("#pickRec").onchange = function (e) {
        var rec = S.recipes.find(function (x) { return x.id === e.target.value; });
        if (!rec) return;
        o.querySelector("#drName").value = rec.name || "";
        o.querySelector("#drCat").value = rec.category || CATS[0];
        o.querySelector("#drImUrl").value = rec.image_url || "";
        o.querySelector("#drImThumb").src = rec.image_url || ((window.BRAND && window.BRAND.logo) || "logo.png");
        var box = o.querySelector("#drIngList"); if (box) box.innerHTML = "";
        (rec.ingredients || []).forEach(function (i) { addIngRow(i.n, i.q || ""); });
        if (!(rec.ingredients || []).length) addIngRow("", "");
        o.querySelector("#drPrep").value = rec.instructions || "";
        o.querySelector("#drStory").value = rec.story || "";
      };
    }

    o.querySelector("#closeDr").onclick = function () { o.remove(); };
    o.querySelector("#drSave").onclick = async function () {
      var name = o.querySelector("#drName").value.trim();
      if (name.length < 2) { o.querySelector("#drErr").textContent = "Digite o nome do drink."; return; }
      var ingLines = [];
      o.querySelectorAll("#drIngList .row").forEach(function (row) {
        var n = (row.querySelector("select") && row.querySelector("select").value || "").trim();
        var q = (row.querySelector("[data-q]") && row.querySelector("[data-q]").value || "").trim();
        if (n) ingLines.push({ n: n, q: q });
      });
      if (!ingLines.length) { o.querySelector("#drErr").textContent = "Adicione ao menos 1 ingrediente da lista."; return; }
      var payload = {
        name: name,
        category: o.querySelector("#drCat").value,
        image_url: (o.querySelector("#drImUrl").value || "").trim() || null,
        ingredients: ingLines,
        instructions: o.querySelector("#drPrep").value.trim() || null,
        story: o.querySelector("#drStory").value.trim() || null
      };
      var selId = o.querySelector("#pickRec") ? o.querySelector("#pickRec").value : "";
      var r = selId
        ? await sb.from("recipes").update(payload).eq("id", selId).select().single()
        : await sb.from("recipes").insert(payload).select().single();
      if (r.error) { o.querySelector("#drErr").textContent = r.error.message; return; }
      var idx = S.recipes.findIndex(function (x) { return x.id === r.data.id; });
      if (idx >= 0) S.recipes[idx] = r.data; else S.recipes.push(r.data);
      o.remove();
      toast("Receita salva!");
      if (S.tab === "recipes") paint();
    };
  }

  function moreView(v) {
    var open = S.bar.accepting_orders !== false;
    v.innerHTML =
      '<h1>Mais</h1>' +
      '<p class="mu">' + esc(S.bar.name) +
      (S.bar.city ? ' · <a href="' + esc(externalMapUrl(S.bar)) + '" target="_blank" rel="noopener" style="color:var(--ac);text-decoration:none">📍 ' + esc(S.bar.city) + " (Abrir mapa)</a>" : "") +
      "</p>" +
      '<div class="menu-row-list">' +
      '<div class="menu-row-item" style="cursor:default">' +
        '<div class="menu-row-text"><div class="menu-row-title">Receber pedidos</div><div class="menu-row-sub">' + (open ? "Ligado" : "Pausado") + '</div></div>' +
        '<button type="button" class="b sm g" id="mToggleOrders">' + (open ? "Pausar" : "Ligar") + "</button>" +
      "</div>" +
      '<button type="button" class="menu-row-item" id="mQr">' +
        '<div class="menu-row-text"><div class="menu-row-title">📱 QR do cardápio</div><div class="menu-row-sub">Para convidados ou clientes (inclui mesas)</div></div>' +
        '<span class="menu-row-chev">›</span>' +
      "</button>" +
      '<button type="button" class="menu-row-item" id="mShakers">' +
        '<div class="menu-row-text"><div class="menu-row-title">🍸 Coqueteleiras</div><div class="menu-row-sub">Tamanhos que você usa</div></div>' +
        '<span class="menu-row-chev">›</span>' +
      "</button>" +
      '<button type="button" class="menu-row-item" id="mCreateDrink">' +
        '<div class="menu-row-text"><div class="menu-row-title">➕ Criar drink</div><div class="menu-row-sub">Receita nova, com foto e história</div></div>' +
        '<span class="menu-row-chev">›</span>' +
      "</button>" +
      '<button type="button" class="menu-row-item" id="mEditRecipe">' +
        '<div class="menu-row-text"><div class="menu-row-title">✏️ Editar receita</div><div class="menu-row-sub">Importe, ajuste e atualize ou crie nova</div></div>' +
        '<span class="menu-row-chev">›</span>' +
      "</button>" +
      '<button type="button" class="menu-row-item" id="mCashier">' +
        '<div class="menu-row-text"><div class="menu-row-title">💵 Caixa</div><div class="menu-row-sub">Comandas, totais e fechamento</div></div>' +
        '<span class="menu-row-chev">›</span>' +
      "</button>" +
      (canEditMenu()
        ? '<button type="button" class="menu-row-item" id="mStudio">' +
            '<div class="menu-row-text"><div class="menu-row-title">🎨 Editor do cardápio</div><div class="menu-row-sub">Logo, layout, cores, presets e prévia ao vivo</div></div>' +
            '<span class="menu-row-chev">›</span>' +
          "</button>"
        : "") +
      (canEditMenu()
        ? '<button type="button" class="menu-row-item" id="mPrices">' +
            '<div class="menu-row-text"><div class="menu-row-title">💰 Precificação</div><div class="menu-row-sub">Preços dos drinks (cardápio pago)</div></div>' +
            '<span class="menu-row-chev">›</span></button>'
        : "") +
      (isManager()
        ? '<button type="button" class="menu-row-item" id="mTeamJobs">' +
            '<div class="menu-row-text"><div class="menu-row-title">👥 Equipe & Vagas da loja</div><div class="menu-row-sub">Criar vagas, currículos recebidos e equipe</div></div>' +
            '<span class="menu-row-chev">›</span></button>'
        : "") +
      '<button type="button" class="menu-row-item" id="mMyCareer">' +
        '<div class="menu-row-text"><div class="menu-row-title">📄 Meu currículo & Vagas</div><div class="menu-row-sub">Currículo, vagas na região e entrar em loja</div></div>' +
        '<span class="menu-row-chev">›</span></button>' +
      '<button type="button" class="menu-row-item" id="mMyBars">' +
        '<div class="menu-row-text"><div class="menu-row-title">🏠 Meus bares</div><div class="menu-row-sub">Trocar ou criar bar</div></div>' +
        '<span class="menu-row-chev">›</span>' +
      "</button>" +
      "</div>";

    $("#mToggleOrders").onclick = async function () {
      var r = await sb.from("bars").update({ accepting_orders: !open }).eq("id", S.bar.id).select().single();
      if (!r.error && r.data) { S.bar = r.data; moreView(v); }
    };
    $("#mQr").onclick = openQrModal;
    $("#mShakers").onclick = openShakersModal;
    $("#mCreateDrink").onclick = function () { openCreateDrinkModal(false); };
    $("#mEditRecipe").onclick = function () { openCreateDrinkModal(true); };
    $("#mCashier").onclick = function () { S.tab = "cashier"; paint(); };
    if ($("#mStudio")) $("#mStudio").onclick = function () { S.tab = "studio"; paint(); };
    if ($("#mPrices")) $("#mPrices").onclick = function () { pricesView(v); };
    if ($("#mTeamJobs")) $("#mTeamJobs").onclick = function () { S.tab = "careers"; S.careerMode = "store"; paint(); };
    if ($("#mMyCareer")) $("#mMyCareer").onclick = function () { S.tab = "careers"; S.careerMode = "personal"; paint(); };
    if ($("#mCareers")) $("#mCareers").onclick = function () { S.tab = "careers"; paint(); };
    $("#mMyBars").onclick = openSwitchBarModal;
  }

  init();
})();
