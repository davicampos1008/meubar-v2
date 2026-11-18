(function () {
  "use strict";
  var app = document.getElementById("app");
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function showErr(title, msg) {
    app.innerHTML =
      '<div class="gate"><h1 style="margin-top:24px">' +
      esc(title) +
      '</h1><p class="mu">' +
      esc(msg) +
      '</p><p class="mu" style="margin-top:16px;word-break:break-all">' +
      esc(location.href) +
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
  var BAR = new URLSearchParams(location.search).get("bar");
  var $ = function (s) { return document.querySelector(s); };
  var money = function (v) { return "R$ " + Number(v).toFixed(2).replace(".", ","); };
  var CATS = ["Refrescantes", "Fortes", "Cítricos", "Tropicais", "Doces & Frutados", "Aperitivos"];
  var EMO = ["🍋", "🥃", "🍊", "🍹", "🍓", "🥂"];
  var ALL_TAGS = ["Refrescante", "Forte", "Doce", "Ácido", "Charmoso", "Fácil", "Clássico", "Tropical", "Aperitivo", "Longo", "Curto", "Com hortelã", "Com soda", "Frutado", "Amargo"];
  var today = function () { return new Date().toLocaleDateString("sv-SE"); };
  var M = { bar: null, items: [], cat: "Todas", name: "", mine: [], tags: new Set(), showTags: false };

  function save() {
    try { localStorage.setItem("mine" + BAR, JSON.stringify(M.mine)); } catch (e) {}
  }
  function priced() { return M.bar && M.bar.kind !== "home"; }
  function cnt() { return M.mine.reduce(function (s, o) { return s + o.qty; }, 0); }
  function total() { return M.mine.reduce(function (s, o) { return s + o.qty * (o.price || 0); }, 0); }
  function tile(r) {
    var img = r.image_url
      ? ' style="background-image:url(\'' + esc(r.image_url) + '\')"'
      : "";
    var emoji = r.image_url ? "" : EMO[CATS.indexOf(r.category)] || "🍸";
    return '<div class="im c' + Math.max(0, CATS.indexOf(r.category)) + '"' + img + ">" + emoji + "</div>";
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
  function matchTags(r) {
    if (!M.tags.size) return true;
    var t = new Set(recipeTags(r));
    var ok = true;
    M.tags.forEach(function (x) { if (!t.has(x)) ok = false; });
    return ok;
  }
  function beep() {
    try {
      var c = new (window.AudioContext || window.webkitAudioContext)();
      var o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
      o.start(); o.stop(c.currentTime + 0.6);
    } catch (e) {}
  }
  function toast(t) {
    var d = document.createElement("div");
    d.className = "toast";
    d.textContent = t;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2400);
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error("Tempo esgotado ao falar com o servidor (" + ms / 1000 + "s)."));
      }, ms);
      promise.then(
        function (v) { if (done) return; done = true; clearTimeout(timer); resolve(v); },
        function (e) { if (done) return; done = true; clearTimeout(timer); reject(e); }
      );
    });
  }

  async function load() {
    try {
      if (!BAR) {
        showErr("Link inválido", "Falta o código do bar na URL. Abra pelo QR ou pelo link completo (…/menu.html?bar=…).");
        return;
      }
      app.innerHTML = '<div class="gate"><p class="mu">Carregando cardápio…</p></div>';

      var result = await withTimeout(sb.rpc("get_menu", { p_bar: BAR }), 12000);
      var data = result.data;
      var error = result.error;

      if (error) {
        showErr("Erro no cardápio", error.message || String(error));
        return;
      }
      if (!data || !data.bar) {
        showErr("Bar não encontrado", "Peça um novo QR para quem está no bar. Confira se o id na URL está certo.");
        return;
      }

      M.bar = data.bar;
      M.items = data.items || [];
      document.title = M.bar.name;
      var nm = localStorage.getItem("nm");
      M.name = nm && localStorage.getItem("nmd") === today() ? nm : "";
      try {
        M.mine = JSON.parse(localStorage.getItem("mine" + BAR) || "[]").filter(function (o) {
          return o.d === today();
        });
      } catch (e) {
        M.mine = [];
      }
      if (M.name) draw();
      else gate();
      poll();
    } catch (e) {
      showErr("Falha ao carregar", (e && e.message) ? e.message : String(e));
    }
  }

  function gate() {
    app.innerHTML =
      '<div class="gate">' +
      brandMark("big") +
      '<p class="mu" style="margin-top:26px">Bem-vindo ao</p><h1>' +
      esc(M.bar.name) +
      '</h1><p class="mu" style="margin:10px 0 22px">Para fazer seu pedido, diga como devemos te chamar.</p>' +
      '<input id="nm" placeholder="Seu nome" maxlength="40" autocomplete="given-name">' +
      '<button class="b" id="go">Ver cardápio</button><p class="err" id="er"></p></div>';
    var go = function () {
      var n = $("#nm").value.trim();
      if (n.length < 2) {
        $("#er").textContent = "Digite pelo menos 2 letras.";
        return;
      }
      M.name = n;
      localStorage.setItem("nm", n);
      localStorage.setItem("nmd", today());
      draw();
    };
    $("#go").onclick = go;
    $("#nm").onkeydown = function (e) { if (e.key === "Enter") go(); };
    setTimeout(function () { if ($("#nm")) $("#nm").focus(); }, 100);
  }

  function draw() {
    var cats = ["Todas"].concat(
      Array.from(new Set(M.items.map(function (i) { return i.category; })))
    );
    var l = M.items.filter(function (i) {
      return (M.cat === "Todas" || i.category === M.cat) && matchTags(i);
    });
    var chipsCat =
      cats.length > 2
        ? '<div class="chips">' +
          cats
            .map(function (c) {
              return (
                '<span class="chip ' +
                (M.cat === c ? "on" : "") +
                '" data-c="' +
                esc(c) +
                '">' +
                esc(c) +
                "</span>"
              );
            })
            .join("") +
          "</div>"
        : "";
    var tagsHtml = "";
    if (M.showTags) {
      tagsHtml =
        '<div class="chips" style="flex-wrap:wrap;overflow:visible">' +
        ALL_TAGS.map(function (t) {
          return (
            '<span class="chip ' +
            (M.tags.has(t) ? "on" : "") +
            '" data-tag="' +
            esc(t) +
            '">' +
            esc(t) +
            "</span>"
          );
        }).join("") +
        (M.tags.size
          ? '<span class="chip" id="ctags" style="border-style:dashed">Limpar filtros</span>'
          : "") +
        "</div>" +
        (M.tags.size
          ? '<p class="mu">' + M.tags.size + " filtro(s) · " + l.length + " opção(ões)</p>"
          : "");
    }
    var grid =
      l
        .map(function (r) {
          var tg = recipeTags(r).slice(0, 2);
          return (
            '<button class="card" data-r="' +
            r.id +
            '">' +
            tile(r) +
            '<div class="t">' +
            esc(r.name) +
            (r.price != null ? '<br><span class="tag pr">' + money(r.price) + "</span>" : "") +
            (tg.length ? '<br><span class="tag">' + esc(tg.join(" · ")) + "</span>" : "") +
            "</div></button>"
          );
        })
        .join("") || '<p class="mu">Nenhum drink disponível agora.</p>';

    app.innerHTML =
      '<div class="top">' +
      brandMark() +
      '<button class="lnk" id="tr">' +
      esc(M.name) +
      " · trocar</button></div><div class=\"w\"><p class=\"mu\">Cardápio</p><h1>" +
      esc(M.bar.name) +
      "</h1>" +
      (M.bar.open
        ? ""
        : '<p class="err" style="font-size:1rem">Pedidos pausados no momento. Tente de novo em instantes.</p>') +
      '<div class="row" style="margin-top:10px"><button class="b g" id="tg">✨ O que tomar?</button></div>' +
      chipsCat +
      tagsHtml +
      '<div class="grid" style="margin-top:10px">' +
      grid +
      "</div></div>" +
      (M.mine.length
        ? '<button class="cart" id="ct"><span>🍸 ' +
          cnt() +
          " " +
          (cnt() === 1 ? "item pedido" : "itens pedidos") +
          "</span>" +
          (priced() ? "<b>" + money(total()) + "</b>" : "") +
          "</button>"
        : "");

    $("#tr").onclick = function () {
      localStorage.removeItem("nm");
      M.name = "";
      gate();
    };
    $("#tg").onclick = function () {
      M.showTags = !M.showTags;
      draw();
    };
    document.querySelectorAll("[data-c]").forEach(function (c) {
      c.onclick = function () {
        M.cat = c.getAttribute("data-c");
        draw();
      };
    });
    document.querySelectorAll("[data-tag]").forEach(function (c) {
      c.onclick = function () {
        var t = c.getAttribute("data-tag");
        if (M.tags.has(t)) M.tags.delete(t);
        else M.tags.add(t);
        draw();
      };
    });
    var cl = $("#ctags");
    if (cl)
      cl.onclick = function () {
        M.tags.clear();
        draw();
      };
    document.querySelectorAll("[data-r]").forEach(function (c) {
      c.onclick = function () {
        var id = c.getAttribute("data-r");
        var r = M.items.find(function (i) { return i.id === id; });
        if (r) detail(r);
      };
    });
    if ($("#ct")) $("#ct").onclick = myOrders;
  }

  function detail(r) {
    var o = document.createElement("div");
    o.className = "ov";
    o.innerHTML =
      '<div class="hero c' +
      Math.max(0, CATS.indexOf(r.category)) +
      '"' +
      (r.image_url ? ' style="background-image:url(\'' + esc(r.image_url) + "')\"" : "") +
      ">" +
      (r.image_url ? "" : EMO[CATS.indexOf(r.category)] || "🍸") +
      '</div><div class="w"><button class="b g" id="x">← Voltar</button><h1 style="margin-top:16px">' +
      esc(r.name) +
      "</h1>" +
      (r.price != null
        ? '<p style="font-size:1.4rem;color:var(--ok);font-weight:700">' + money(r.price) + "</p>"
        : "") +
      (r.description ? '<p class="desc">' + esc(r.description) + "</p>" : "") +
      '<h2 style="margin:22px 0 4px">O que leva</h2><div class="chips" style="flex-wrap:wrap;overflow:visible">' +
      (r.ingredients || [])
        .map(function (i) {
          return '<span class="chip st1">' + esc(i.n) + "</span>";
        })
        .join("") +
      "</div>" +
      (r.story
        ? '<h2 style="margin:18px 0 6px">A história</h2><p class="mu story">' + esc(r.story) + "</p>"
        : "") +
      '<label>Observação (opcional)</label><input id="nt" maxlength="140" placeholder="Ex: sem açúcar, pouco gelo">' +
      '<label>Quantidade</label><select id="qt"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select>' +
      '<button class="b" id="go" ' +
      (M.bar.open ? "" : "disabled") +
      ">Pedir" +
      (r.price != null ? " · " + money(r.price) : "") +
      '</button><p class="err" id="er"></p></div>';
    document.body.appendChild(o);
    var q = function (s) { return o.querySelector(s); };
    q("#x").onclick = function () { o.remove(); };
    q("#go").onclick = async function () {
      q("#go").disabled = true;
      var qty = +q("#qt").value;
      var res = await sb.rpc("place_order", {
        p_bar: BAR,
        p_name: M.name,
        p_recipe: r.id,
        p_qty: qty,
        p_note: q("#nt").value,
      });
      if (res.error) {
        q("#go").disabled = false;
        q("#er").textContent = res.error.message;
        return;
      }
      M.mine.push({
        id: res.data,
        name: r.name,
        qty: qty,
        price: r.price,
        status: "pending",
        d: today(),
      });
      save();
      o.remove();
      draw();
      toast("Pedido enviado, " + M.name + "!");
    };
  }

  function myOrders() {
    var L = { pending: "Preparando", ready: "Pronto, pode buscar", done: "Entregue" };
    var o = document.createElement("div");
    o.className = "ov";
    o.innerHTML =
      '<div class="w"><button class="b g" id="x">← Voltar</button><h1 style="margin:14px 0 4px">Meus pedidos</h1><p class="mu">' +
      esc(M.name) +
      ' · hoje</p><div class="list" style="margin-top:10px">' +
      M.mine
        .map(function (x) {
          return (
            "<div><span><b>" +
            x.qty +
            "× " +
            esc(x.name) +
            '</b><br><span class="mu">' +
            (L[x.status] || "") +
            "</span></span>" +
            (priced() && x.price != null ? "<b>" + money(x.qty * x.price) + "</b>" : "") +
            "</div>"
          );
        })
        .join("") +
      '</div><div class="pay" style="margin-top:18px"><div class="row sp"><span>Total de itens</span><b>' +
      cnt() +
      "</b></div>" +
      (priced()
        ? '<div class="row sp" style="margin-top:6px"><span>Total a pagar</span><span class="tt">' +
          money(total()) +
          '</span></div><p class="mu" style="margin-top:8px">O pagamento é feito direto no caixa.</p>'
        : "") +
      "</div></div>";
    document.body.appendChild(o);
    o.querySelector("#x").onclick = function () { o.remove(); };
  }

  function alertReady(list) {
    beep();
    if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 300]);
    document.title = "🍸 Seu drink está pronto!";
    var o = document.createElement("div");
    o.className = "ov";
    o.style.zIndex = 30;
    o.innerHTML =
      '<div class="call">Seu drink está pronto!<br><span style="color:var(--ok)">' +
      esc(M.name) +
      '</span></div><div class="w"><p class="mu" style="text-align:center;margin-bottom:8px">' +
      esc(
        list
          .map(function (x) {
            return x.qty + "× " + x.name;
          })
          .join(", ")
      ) +
      '</p><button class="b ok" id="k">Vou buscar no bar</button></div>';
    document.body.appendChild(o);
    o.querySelector("#k").onclick = function () {
      o.remove();
      document.title = M.bar.name;
    };
  }

  function poll() {
    setInterval(async function () {
      var ids = M.mine.filter(function (o) { return o.status !== "done"; }).map(function (o) { return o.id; });
      if (!ids.length) return;
      var res = await sb.rpc("order_status", { p_ids: ids });
      if (!res.data) return;
      res.data.forEach(function (d) {
        var o = M.mine.find(function (x) { return x.id === d.id; });
        if (o) o.status = d.status;
      });
      var fresh = M.mine.filter(function (o) { return o.status === "ready" && !o.ack; });
      fresh.forEach(function (o) { o.ack = true; });
      save();
      if (fresh.length) alertReady(fresh);
      if (!document.querySelector(".ov") && M.name) draw();
    }, 5000);
  }

  load();
})();
