(function () {
  "use strict";
  var app = document.getElementById("app");
  var MEDIA_BUCKET = "bar-media";

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

  // Pontos de referência no Brasil com coordenadas para ordenação por proximidade à localização atual
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
    jobLocFilter: "",
    jobTypeFilter: "todas"
  };

  var isManager = function () { return S.role === "owner" || S.role === "gerente"; };
  var canEditMenu = function () { return S.role === "owner" || S.role === "gerente"; };
  var hasPricing = function () { return S.bar && S.bar.kind !== "home"; };

  function detectCurrentCoords() {
    if (S.userCoords || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        S.userCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      },
      function () {
        S.userCoords = { lat: -15.7942, lon: -47.8822 }; // Fallback neutro (Brasília)
      },
      { timeout: 5000 }
    );
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

  // Buscador de localização exata ordenando do mais próximo ao mais longe da localização atual
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
    var mem = await sb.from("bar_members").select("role, name, bars(*)").eq("user_id", S.user.id);
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
      await loadJobsAndRequests();
      onboardingScreen();
    }
  }

  async function loadJobsAndRequests() {
    var jr = await sb.from("job_posts").select("*, bars(name, handle, city, lat, lon)").eq("is_open", true).order("created_at", { ascending: false }).limit(80);
    S.jobs = jr.data || [];
    var ar = await sb.from("job_applications").select("*").eq("applicant_id", S.user.id);
    S.myApps = ar.data || [];
    var sr = await sb.from("service_requests").select("*, bars(name, handle)").eq("requester_id", S.user.id).order("created_at", { ascending: false }).limit(30);
    S.serviceReqs = sr.data || [];

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

  function onboardingScreen() {
    app.innerHTML =
      '<div class="top">' + brandLogoHtml(null, false) + '<button class="lnk" id="out">Sair</button></div>' +
      '<div class="w narrow"><h1>Começar no Meu Bar</h1><p class="mu">Crie seu bar, envie solicitação por <b>@ + senha</b> ou preencha seu <b>currículo</b> e busque <b>vagas</b>.</p>' +
      '<div class="panel"><h2>Criar novo bar</h2>' +
      '<label>Nome do bar</label><input id="bn" placeholder="Ex: Minha casa">' +
      '<label>@ do bar (único)</label><input id="bh" placeholder="Ex: minha_casa_7228">' +
      '<label>Localização do bar (digite para ver sugestões da mais próxima)</label>' +
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
      var ins = await sb.from("bars").insert({
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
      }).select().single();
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

    $("#openProf").onclick = function () { standaloneModal(false); };
    $("#openJobs").onclick = function () { standaloneModal(true); };
  }

  function standaloneModal(jobsFirst) {
    var o = document.createElement("div");
    o.className = "ov";
    o.innerHTML = '<div class="w narrow"><button class="b g" id="x">← Voltar</button><div id="b" style="margin-top:12px"></div></div>';
    document.body.appendChild(o);
    o.querySelector("#x").onclick = function () { o.remove(); onboardingScreen(); };
    if (jobsFirst) renderJobsSection(o.querySelector("#b"), null);
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
      '<h1 style="margin-top:14px">Escolher bar</h1>' +
      '<p class="mu">Selecione qual bar você está gerenciando agora ou crie um novo.</p>' +
      '<div class="list" style="margin-top:14px">' +
      S.bars.map(function (x) {
        var active = S.bar && S.bar.id === x.bar.id;
        return '<div style="align-items:flex-start"><div style="flex:1"><b>' + esc(x.bar.name) + '</b> <span class="badge-warn">' + esc(ROLE_LABELS[x.role] || x.role) + "</span>" +
          (x.bar.city ? '<br><span class="tag">📍 ' + esc(x.bar.city) + ' · <a href="' + esc(externalMapUrl(x.bar)) + '" target="_blank" rel="noopener" style="color:var(--ac)">Abrir no mapa</a></span>' : "") +
          '</div>' + (active ? '<span class="chip st1">Ativo</span>' : '<button class="b sm" data-pickbar="' + x.bar.id + '" data-pickrole="' + x.role + '">Gerenciar</button>') + "</div>";
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
    o.querySelector("#newBarFromSw").onclick = function () {
      o.remove();
      onboardingScreen();
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
    var o = document.createElement("div");
    o.className = "ov";
    o.innerHTML =
      '<div class="hero c' + Math.max(0, CATS.indexOf(r.category)) + '"' +
      (r.image_url ? ' style="background-image:url(\'' + esc(r.image_url) + "')\"" : "") +
      ">" + (r.image_url ? "" : (EMO[CATS.indexOf(r.category)] || "🍸")) +
      '</div><div class="w"><button class="b g sm" id="closeRec">← Voltar</button>' +
      '<h1 style="margin-top:14px">' + esc(r.name) + "</h1>" +
      '<p class="mu">' + esc(r.category || "Drink") + " · " + (canMake ? '<span style="color:var(--ok)">Pronto para fazer agora</span>' : '<span class="warn-txt">Falta ingrediente no estoque</span>') + "</p>" +
      (r.description ? '<p class="desc">' + esc(r.description) + "</p>" : "") +
      '<h2>Ingredientes</h2><div class="chips" style="flex-wrap:wrap;overflow:visible">' +
      (r.ingredients || []).map(function (i) {
        return '<span class="chip st1">' + esc(i.n) + (i.q ? " · " + esc(i.q) : "") + "</span>";
      }).join("") + "</div>" +
      (r.instructions ? '<h2>Modo de preparo</h2><p class="mu" style="line-height:1.6">' + esc(r.instructions) + "</p>" : "") +
      (r.story ? '<h2>História</h2><p class="mu story">' + esc(r.story) + "</p>" : "") +
      '<div class="panel" style="margin-top:18px"><label style="margin-top:0">Para quem é este drink? (opcional)</label>' +
      '<input id="mkFor" placeholder="Ex: Para mim / Eloíza / Mesa 2">' +
      '<button class="b ok full" id="makeNowBtn" style="margin-top:12px">🍸 Fazer este drink agora</button></div></div>';

    document.body.appendChild(o);
    o.querySelector("#closeRec").onclick = function () { o.remove(); };
    o.querySelector("#makeNowBtn").onclick = function () {
      var who = (o.querySelector("#mkFor").value || "").trim() || "Preparo direto";
      o.remove();
      toast('Drink "' + r.name + '" preparado (' + who + ")!");
    };
  }

  function stockView(v) {
    v.innerHTML =
      '<div class="row sp"><h1>Estoque</h1>' + (canEditMenu() && hasPricing() ? '<button class="b sm" id="goPrices">Precificação</button>' : "") + '</div>' +
      '<p class="mu">Toque no item para alternar disponível / em falta.</p>' +
      '<div class="panel"><label>Novo ingrediente ou item</label><div class="row">' +
      '<input class="grow" id="inName" placeholder="Ex: Gin, Limão, Hortelã">' +
      '<input id="inCost" type="number" step="0.1" min="0" placeholder="Custo (R$)" style="width:120px">' +
      '<button class="b sm" id="inAdd">Adicionar</button></div><p class="err" id="inEr"></p></div>' +
      '<div class="list" style="margin-top:14px">' + S.items.map(function (i) {
        return '<div><div><b>' + esc(i.name) + '</b><br><span class="tag">Custo base: ' + money(i.unit_cost) + "</span></div>" +
          '<button class="chip ' + (i.in_stock ? "st1" : "st0") + '" data-tog="' + i.id + '">' + (i.in_stock ? "Disponível" : "Em falta") + "</button></div>";
      }).join("") + "</div>";

    if ($("#goPrices")) $("#goPrices").onclick = function () { pricesView(v); };
    $("#inAdd").onclick = async function () {
      $("#inEr").textContent = "";
      var nm = $("#inName").value.trim();
      if (!nm) { $("#inEr").textContent = "Digite o nome do item."; return; }
      var r = await sb.from("bar_items").insert({ bar_id: S.bar.id, name: nm, in_stock: true, unit_cost: Math.max(0, Number($("#inCost").value) || 0) }).select().single();
      if (r.error) { $("#inEr").textContent = r.error.message; return; }
      S.items.push(r.data); S.items.sort(function (a, b) { return a.name.localeCompare(b.name); }); stockView(v);
    };
    v.querySelectorAll("[data-tog]").forEach(function (b) {
      b.onclick = async function () {
        var it = S.items.find(function (x) { return x.id === b.getAttribute("data-tog"); });
        if (!it) return;
        var r = await sb.from("bar_items").update({ in_stock: !it.in_stock }).eq("id", it.id).select().single();
        if (!r.error && r.data) { it.in_stock = r.data.in_stock; stockView(v); }
      };
    });
  }

  function queueView(v) {
    var open = S.bar.accepting_orders !== false;
    var active = S.orders.filter(function (o) { return o.status !== "done"; });
    v.innerHTML =
      '<div class="row sp"><h1>Fila de Pedidos</h1><button class="b sm ' + (open ? "g" : "ok") + '" id="pauseBtn">' + (open ? "Pausar pedidos" : "Retomar pedidos") + "</button></div>" +
      (open ? "" : '<p class="warn-txt">Pedidos pausados no cardápio agora.</p>') +
      '<div style="margin-top:12px">' +
      (active.length ? active.map(function (o) {
        var isReady = o.status === "ready";
        return '<div class="ord ' + (isReady ? "ready" : "") + '"><div class="row sp"><h3>' + esc(o.customer_name || "Cliente") + '</h3><span class="tag">' + (isReady ? "PRONTO" : "PREPARANDO") + "</span></div>" +
          '<div class="meta">' + new Date(o.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) + "</div>" +
          '<div class="items"><b>' + esc(o.qty) + "× " + esc(o.recipe_name || "Drink") + "</b>" + (o.note ? '<br><span class="mu">Obs: ' + esc(o.note) + "</span>" : "") + "</div>" +
          '<div class="acts">' + (!isReady ? '<button class="b sm ok" data-act="ready" data-id="' + o.id + '">Marcar pronto</button>' : "") +
          '<button class="b sm g" data-act="done" data-id="' + o.id + '">Entregue</button></div></div>';
      }).join("") : '<p class="mu">Nenhum pedido na fila agora. Você pode fazer drinks direto na aba Receitas.</p>') + "</div>";

    $("#pauseBtn").onclick = async function () {
      var r = await sb.from("bars").update({ accepting_orders: !open }).eq("id", S.bar.id).select().single();
      if (!r.error && r.data) { S.bar = r.data; queueView(v); }
    };
    v.querySelectorAll("[data-act]").forEach(function (btn) {
      btn.onclick = async function () {
        await sb.from("orders").update({ status: btn.getAttribute("data-act") }).eq("id", btn.getAttribute("data-id"));
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
      '<button class="b g sm" id="backMoreCash">← Voltar para Mais</button>' +
      '<h1 style="margin-top:12px">Caixa</h1>' +
      '<p class="mu">' + esc(S.bar.name) + (hasPricing() ? " · Comandas em aberto" : " · Modo livre (sem cobrança)") + "</p>" +
      '<div class="pay"><div class="row sp"><span>Total em aberto</span><span class="tt">' + money(grandTotal) + "</span></div></div>" +
      '<div class="list" style="margin-top:14px">' +
      (customers.length
        ? customers.map(function (c, idx) {
            return '<div style="align-items:flex-start"><div style="flex:1"><b>' + esc(c.name) + "</b>" +
              (hasPricing() ? ' · <span class="pr">' + money(c.total) + "</span>" : "") +
              '<br><span class="tag">' + esc(c.lines.join(", ")) + "</span></div>" +
              '<button class="b sm ok" data-payidx="' + idx + '">Receber / Fechar</button></div>';
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
      '<button class="b g sm" id="bkStock">← Voltar ao Estoque</button><h1 style="margin-top:12px">Precificação do Bar</h1>' +
      (unpricedAvailable.length
        ? '<div class="alert-box"><b>⚠️ ' + unpricedAvailable.length + ' drink(s) disponível(is) sem preço!</b><p class="mu" style="margin-top:4px">Sem preço, não aparece para o cliente: ' +
          esc(unpricedAvailable.slice(0, 6).map(function (d) { return d.name; }).join(", ")) + "</p></div>"
        : '<p class="ok-txt">✓ Todos os drinks disponíveis já possuem preço.</p>') +
      '<div class="panel"><div class="row"><div class="grow"><label>Multiplicador sobre custo base</label><input id="mkInput" type="number" step="0.1" min="1.1" value="' + esc(S.pMarkup) + '"></div>' +
      '<div class="grow"><label>Custo base padrão (R$)</label><input id="bcInput" type="number" step="0.5" min="0" value="' + esc(S.bar.base_cost || 0) + '"></div>' +
      '<div style="align-self:flex-end"><button class="b sm g" id="saveBase">Salvar base</button></div></div>' +
      '<div class="row" style="margin-top:12px"><button class="b sm" id="applyMissing">Sugerir para sem preço</button>' +
      '<button class="b sm g" id="togNow">' + (S.pOnlyNow ? "Mostrando: Só os que faço" : "Filtrar: Só os que faço") + "</button></div></div>" +
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
          '<button class="b sm g" data-sug="' + r.id + '" data-val="' + sug + '">Usar ' + money(sug) + "</button></div></div>";
      }).join("") + '</div><button class="b full" id="savePrices" style="margin-top:14px">Salvar preços</button><p class="ok-txt" id="prMsg"></p>';

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

  // Vagas & Currículo: dono/gerente cria vaga e analisa currículos agrupados por vaga; funcionário vê vagas disponíveis, preenche currículo (foto de rosto obrigatória + PDF opcional) e envia solicitação à loja
  function careersView(v) {
    var mgr = isManager();
    v.innerHTML =
      '<button class="b g sm" id="backMoreTab">← Voltar para Mais</button>' +
      '<h1 style="margin-top:12px">' + (mgr ? "Criar Vagas & Currículos Recebidos" : "Vagas Disponíveis, Currículo & Loja") + "</h1>" +
      '<div class="chips">' +
      (mgr
        ? '<span class="chip on" id="tabCreateJob">Criar Vagas</span><span class="chip" id="tabApps">Currículos por Vaga (' + S.receivedApps.length + ")</span>"
        : '<span class="chip on" id="tabJobs">Vagas Disponíveis</span><span class="chip" id="tabProfile">Meu Currículo</span><span class="chip" id="tabReq">Solicitar à Loja</span>') +
      '</div><div id="careerBox"></div>';

    $("#backMoreTab").onclick = function () { S.tab = "more"; paint(); };
    var box = $("#careerBox");
    var setChip = function (id) {
      box.parentElement.querySelectorAll(".chips .chip").forEach(function (el) { el.classList.toggle("on", el.id === id); });
    };

    if (mgr) {
      $("#tabCreateJob").onclick = function () { setChip("tabCreateJob"); renderCreateJobSection(box, S.bar); };
      $("#tabApps").onclick = function () { setChip("tabApps"); renderReceivedAppsByJobSection(box); };
      renderCreateJobSection(box, S.bar);
    } else {
      $("#tabJobs").onclick = function () { setChip("tabJobs"); renderJobsSection(box); };
      $("#tabProfile").onclick = function () { setChip("tabProfile"); renderProfileSection(box); };
      $("#tabReq").onclick = function () { setChip("tabReq"); renderHandleServiceSection(box); };
      renderJobsSection(box);
    }
  }

  function renderCreateJobSection(box, activeBar) {
    box.innerHTML =
      '<div class="panel"><h2>Criar nova vaga (' + esc(activeBar.name) + ')</h2>' +
      '<label>Título da vaga</label><input id="jbTitle" placeholder="Ex: Barman ou Garçom para fim de semana">' +
      '<div class="row"><div class="grow"><label>Função</label><select id="jbRole">' + JOB_ROLES.map(function (r) {
        return '<option value="' + r + '">' + esc(ROLE_LABELS[r] || r) + "</option>";
      }).join("") + '</select></div><div class="grow"><label>Tipo</label><select id="jbType"><option value="freelance">Freelance</option><option value="contrato">Contrato</option></select></div></div>' +
      '<label>Localidade (mais próximos primeiro)</label>' +
      '<input id="jbLoc" value="' + esc(activeBar.city || "") + '" placeholder="Digite cidade/bairro" autocomplete="off">' +
      '<div class="loc-suggest-box" id="jbLocSug" style="display:none"></div>' +
      '<label>Pagamento / Detalhes</label><input id="jbPay" placeholder="Ex: Diária ou fixo">' +
      '<label>Descrição</label><textarea id="jbDesc"></textarea>' +
      '<button class="b sm" id="jbPub" style="margin-top:10px">Publicar vaga</button><p class="ok-txt" id="jbMsg"></p></div>';

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
      '<button class="b full" id="pfSave" style="margin-top:14px">Salvar currículo</button><p class="err" id="pfErr"></p><p class="ok-txt" id="pfMsg"></p></div>';

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
        if (S.jobLocFilter.trim() && !(j.location || "").toLowerCase().includes(S.jobLocFilter.trim().toLowerCase())) return false;
        return true;
      })
      .sort(function (a, b) { return a._km - b._km; });

    box.innerHTML =
      '<div class="panel"><h2>Vagas disponíveis (mais próximas primeiro)</h2><div class="row">' +
      '<div class="grow"><label>Localidade</label><input id="fltLoc" value="' + esc(S.jobLocFilter) + '" placeholder="Digite para sugestões próximas" autocomplete="off">' +
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
          '</div><button class="b sm ' + (applied ? "g" : "") + '" ' + (applied ? "disabled" : 'data-apply="' + j.id + '"') + '>' + (applied ? "Candidatado" : "Candidatar-se") + "</button></div>";
      }).join("") : '<p class="mu">Nenhuma vaga disponível no momento.</p>') + "</div>";

    bindLocationSearchInput(box, "fltLoc", "fltLocSug", null, null, function (chosen) {
      S.jobLocFilter = chosen.label;
      renderJobsSection(box);
    });
    if (box.querySelector("#fltLoc")) box.querySelector("#fltLoc").oninput = function (e) { S.jobLocFilter = e.target.value; renderJobsSection(box); };
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
      '<button class="b full" id="svcSend" style="margin-top:12px">Enviar solicitação para a loja</button><p class="ok-txt" id="svcOk"></p><p class="err" id="svcErr"></p></div>';

    box.querySelector("#svcSend").onclick = async function () {
      box.querySelector("#svcErr").textContent = ""; box.querySelector("#svcOk").textContent = "";
      var r = await sb.rpc("request_service_by_handle", { p_handle: box.querySelector("#svcHandle").value, p_password: box.querySelector("#svcPass").value, p_role: box.querySelector("#svcRole").value });
      if (r.error) { box.querySelector("#svcErr").textContent = r.error.message; return; }
      box.querySelector("#svcOk").textContent = "Solicitação enviada para a loja!";
      await loadJobsAndRequests();
    };
  }

  // Estúdio livre da loja (7+ elementos editáveis estilo criador de bandeira) + escolha de modo da área de drinks
  function storeStudioView(v) {
    var b = S.bar;
    v.innerHTML =
      '<button class="b g sm" id="backMoreSt">← Voltar para Mais</button>' +
      '<h1 style="margin-top:12px">Estúdio da Loja & Cardápio</h1>' +
      '<p class="mu">Personalize a identidade livre da loja (como criação de emblema) e escolha o modo da área de drinks.</p>' +
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
      '<label>5) Desenho / Borda (estilo bandeira/brasão)</label><select id="stBorder">' + BORDER_STYLES.map(function (br) {
        return '<option value="' + br.id + '" ' + ((b.crest_border || "crest-border-gold") === br.id ? "selected" : "") + '>' + esc(br.label) + "</option>";
      }).join("") + "</select>" +
      '<div class="row"><div class="grow"><label>6) Posição da logo</label><select id="stLogoPos">' + POS_OPTIONS.map(function (p) {
        return '<option value="' + p.id + '" ' + ((b.logo_pos || "left") === p.id ? "selected" : "") + '>' + esc(p.label) + "</option>";
      }).join("") + '</select></div>' +
      '<div class="grow"><label>7) Posição do nome</label><select id="stNamePos">' + POS_OPTIONS.map(function (p) {
        return '<option value="' + p.id + '" ' + ((b.name_pos || "left") === p.id ? "selected" : "") + '>' + esc(p.label) + "</option>";
      }).join("") + "</select></div></div>" +
      '<label>8) Localização da loja (mais próximas primeiro)</label>' +
      '<input id="stCity" value="' + esc(b.city || "") + '" placeholder="Digite localização da loja" autocomplete="off">' +
      '<div class="loc-suggest-box" id="stCitySug" style="display:none"></div>' +
      '<input type="hidden" id="stLat" value="' + esc(b.lat != null ? b.lat : "") + '">' +
      '<input type="hidden" id="stLon" value="' + esc(b.lon != null ? b.lon : "") + '">' +
      '<div class="row"><div class="grow"><label>Paleta: Fundo</label><input type="color" id="stBg" value="' + esc(b.color_bg || "#0b0a0d") + '"></div>' +
      '<div class="grow"><label>Paleta: Superfície</label><input type="color" id="stS1" value="' + esc(b.color_surface || "#141218") + '"></div>' +
      '<div class="grow"><label>Paleta: Destaque</label><input type="color" id="stAc" value="' + esc(b.color_accent || "#e5a93c") + '"></div>' +
      '<div class="grow"><label>Paleta: Texto</label><input type="color" id="stTx" value="' + esc(b.color_text || "#f6f1ea") + '"></div></div>' +
      '<button class="b full" id="stSave" style="margin-top:16px">Salvar visual e modo do cardápio</button>' +
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
      var r = await sb.from("bars").update(patch).eq("id", b.id).select().single();
      if (r.error) { toast("Erro: " + r.error.message); return; }
      S.bar = r.data;
      applyBarTheme(S.bar);
      $("#stMsg").textContent = "Visual e modo salvos!";
      toast("Visual da loja salvo!");
    };
  }

  function openQrModal() {
    var o = document.createElement("div");
    o.className = "ov";
    o.innerHTML =
      '<div class="w narrow"><button class="b g sm" id="closeQr">← Voltar</button>' +
      '<h1 style="margin-top:14px">QR do cardápio</h1>' +
      '<p class="mu">Escolha Geral ou uma mesa específica para gerar o link e o QR Code.</p>' +
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
      '<div class="row" style="margin-top:14px"><button class="b grow" id="qrCopyBtn">Copiar link</button>' +
      '<a class="b g grow" id="qrOpenBtn" target="_blank" rel="noopener">Abrir cardápio</a></div></div>';

    document.body.appendChild(o);
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
      '<div class="w narrow"><button class="b g sm" id="closeSh">← Voltar</button>' +
      '<h1 style="margin-top:14px">Coqueteleiras</h1>' +
      '<p class="mu">Tamanhos e quantidade de coqueteleiras que você usa.</p>' +
      '<div class="panel"><label>Quantidade de coqueteleiras</label><input id="shCount" type="number" min="1" max="50" value="' + esc(S.bar.shakers || 2) + '">' +
      '<button class="b full" id="shSave" style="margin-top:14px">Salvar</button></div></div>';
    document.body.appendChild(o);
    o.querySelector("#closeSh").onclick = function () { o.remove(); };
    o.querySelector("#shSave").onclick = async function () {
      var cnt = Math.max(1, parseInt(o.querySelector("#shCount").value, 10) || 2);
      var r = await sb.from("bars").update({ shakers: cnt }).eq("id", S.bar.id).select().single();
      if (!r.error && r.data) { S.bar = r.data; toast("Coqueteleiras salvas!"); }
      o.remove();
    };
  }

  function openCreateDrinkModal(editExisting) {
    var o = document.createElement("div");
    o.className = "ov";
    o.innerHTML =
      '<div class="w narrow"><button class="b g sm" id="closeDr">← Voltar</button>' +
      '<h1 style="margin-top:14px">' + (editExisting ? "Editar / Criar receita" : "Criar drink") + "</h1>" +
      (editExisting
        ? '<label>Escolha uma receita para editar ou deixe em branco para nova</label><select id="pickRec"><option value="">— Nova receita —</option>' +
          S.recipes.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + "</option>"; }).join("") + "</select>"
        : "") +
      '<label>Nome do drink</label><input id="drName" placeholder="Ex: Gin Tônica de Hibisco">' +
      '<label>Categoria</label><select id="drCat">' + CATS.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("") + "</select>" +
      '<div id="drImgBox"></div>' +
      '<label>Ingredientes (um por linha)</label><textarea id="drIng" placeholder="Ex: 50ml Gin\n100ml Tônica\nGelo"></textarea>' +
      '<label>Modo de preparo</label><textarea id="drPrep" placeholder="Como montar ou bater o drink"></textarea>' +
      '<label>História do drink</label><textarea id="drStory" placeholder="Origem ou curiosidade"></textarea>' +
      '<button class="b full" id="drSave" style="margin-top:14px">Salvar receita</button><p class="err" id="drErr"></p></div>';

    document.body.appendChild(o);
    o.querySelector("#drImgBox").innerHTML = imageUploaderHtml("drIm", "Foto do drink (câmera ou galeria)", "");
    bindImageUploader(o, "drIm", "recipes");

    if (o.querySelector("#pickRec")) {
      o.querySelector("#pickRec").onchange = function (e) {
        var rec = S.recipes.find(function (x) { return x.id === e.target.value; });
        if (!rec) return;
        o.querySelector("#drName").value = rec.name || "";
        o.querySelector("#drCat").value = rec.category || CATS[0];
        o.querySelector("#drImUrl").value = rec.image_url || "";
        o.querySelector("#drImThumb").src = rec.image_url || ((window.BRAND && window.BRAND.logo) || "logo.png");
        o.querySelector("#drIng").value = (rec.ingredients || []).map(function (i) { return i.n + (i.q ? " - " + i.q : ""); }).join("\n");
        o.querySelector("#drPrep").value = rec.instructions || "";
        o.querySelector("#drStory").value = rec.story || "";
      };
    }

    o.querySelector("#closeDr").onclick = function () { o.remove(); };
    o.querySelector("#drSave").onclick = async function () {
      var name = o.querySelector("#drName").value.trim();
      if (name.length < 2) { o.querySelector("#drErr").textContent = "Digite o nome do drink."; return; }
      var ingLines = o.querySelector("#drIng").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean).map(function (line) {
        var parts = line.split(" - ");
        return { n: parts[0].trim(), q: (parts[1] || "").trim() };
      });
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
            '<div class="menu-row-text"><div class="menu-row-title">🎨 Visual da loja & Modo do cardápio</div><div class="menu-row-sub">Fonte, paleta, borda, posição e modo dos drinks</div></div>' +
            '<span class="menu-row-chev">›</span>' +
          "</button>"
        : "") +
      '<button type="button" class="menu-row-item" id="mCareers">' +
        '<div class="menu-row-text"><div class="menu-row-title">💼 Vagas & Currículo</div><div class="menu-row-sub">' + (isManager() ? "Criar vagas e currículos por vaga" : "Vagas disponíveis, currículo (foto + PDF) e loja") + '</div></div>' +
        '<span class="menu-row-chev">›</span>' +
      "</button>" +
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
    $("#mCareers").onclick = function () { S.tab = "careers"; paint(); };
    $("#mMyBars").onclick = openSwitchBarModal;
  }

  init();
})();