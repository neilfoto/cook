(function () {
  "use strict";

  var JU_FAN = "\u7117\u98ef";
  var WEN_FAN = "\u7086\u98ef";

  var LANGS = ["zh", "en", "id"];
  var LANG_HTML = { zh: "zh-Hant", en: "en", id: "id" };
  var STORAGE_KEY = "chc-lang";

  var recipes = window.RECIPES || [];
  var UI = window.I18N_UI || {};
  var REX = window.I18N_RECIPES || {};

  var app = document.getElementById("app");
  var state = {
    category: "全部",
    cuisine: "全部",
    spicy: "全部",
    method: "全部",
    lang: "zh",
    randomIds: null
  };

  var CATEGORIES = ["全部", "肉類", "海鮮", "豆腐蛋", "蔬菜", "湯", "主食"];
  var SPICY = [
    { value: "全部", labelKey: "all" },
    { value: "不辣", labelKey: "notSpicy" },
    { value: "辣", labelKey: "spicy" }
  ];
  var CUISINES = ["全部", "中式", "西式"];
  var METHODS = ["全部", "蒸", "炒", "湯", "炆／煲", WEN_FAN, "灼／浸", "煮", JU_FAN, "焗", "煎／烤"];

  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGS.indexOf(saved) !== -1) state.lang = saved;
  } catch (err) {}

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function format(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, function (_, key) {
      return vars[key] != null ? String(vars[key]) : "";
    });
  }

  function t(key) {
    var pack = UI[state.lang] || {};
    if (pack[key] != null) return pack[key];
    if (UI.zh && UI.zh[key] != null) return UI.zh[key];
    return key;
  }

  function mapLabel(kind, value) {
    var pack = UI[state.lang] || UI.zh || {};
    var maps = pack.maps || (UI.zh && UI.zh.maps) || {};
    var table = maps[kind] || {};
    return table[value] || value;
  }

  function translateTime(s) {
    var match = String(s).match(/約\s*(\d+)\s*分鐘/);
    if (!match) return s;
    if (state.lang === "en") return "About " + match[1] + " minutes";
    if (state.lang === "id") return "Sekitar " + match[1] + " menit";
    return s;
  }

  function trRecipe(recipe) {
    var localized = {
      name: recipe.name,
      intro: recipe.intro,
      ingredients: recipe.ingredients,
      seasonings: recipe.seasonings,
      steps: recipe.steps
    };
    if (state.lang !== "zh") {
      var pack = (REX[state.lang] || {})[recipe.id];
      if (pack) {
        if (pack.name) localized.name = pack.name;
        if (pack.intro) localized.intro = pack.intro;
        if (pack.ingredients && pack.ingredients.length) localized.ingredients = pack.ingredients;
        if (pack.seasonings && pack.seasonings.length) localized.seasonings = pack.seasonings;
        if (pack.steps && pack.steps.length) localized.steps = pack.steps;
      }
    }
    localized.servings = t("servings4");
    localized.time = translateTime(recipe.time);
    localized.category = mapLabel("category", recipe.category);
    localized.method = mapLabel("method", recipe.method);
    localized.cuisine = mapLabel("cuisine", recipe.cuisine || "");
    localized.zhName = recipe.name;
    return localized;
  }

  function setLang(lang) {
    if (LANGS.indexOf(lang) === -1) return;
    state.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {}
    document.documentElement.lang = LANG_HTML[lang];
    updateChrome();
    var y = window.scrollY || 0;
    render({ keepScroll: true, scrollY: y });
  }

  function updateChrome() {
    var skip = document.getElementById("skip-link");
    var tag = document.getElementById("brand-tag");
    var note = document.getElementById("header-note");
    var f1 = document.getElementById("footer-1");
    var f2 = document.getElementById("footer-2");
    var desc = document.getElementById("meta-desc");
    var group = document.getElementById("lang-switch");
    if (skip) skip.textContent = t("skip");
    if (tag) tag.textContent = t("brandTag");
    if (note) note.textContent = t("headerNote");
    if (f1) f1.textContent = t("footer1");
    if (f2) f2.textContent = t("footer2");
    if (desc) desc.setAttribute("content", t("metaDesc"));
    if (group) group.setAttribute("aria-label", t("langGroup"));
    var buttons = document.querySelectorAll(".lang-btn");
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute("data-lang") === state.lang;
      buttons[i].classList.toggle("is-on", on);
      buttons[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  function parseRoute() {
    var hash = (location.hash || "").replace(/^#/, "");
    if (!hash || hash === "/") return { view: "home" };
    var match = hash.match(/^\/recipe\/([^/?#]+)/);
    if (match) return { view: "recipe", id: decodeURIComponent(match[1]) };
    return { view: "home" };
  }

  function findRecipe(id) {
    for (var i = 0; i < recipes.length; i++) {
      if (recipes[i].id === id) return recipes[i];
    }
    return null;
  }

  function matches(recipe) {
    if (state.category !== "全部" && recipe.category !== state.category) return false;
    if (state.cuisine !== "全部" && recipe.cuisine !== state.cuisine) return false;
    if (state.spicy === "辣" && !recipe.spicy) return false;
    if (state.spicy === "不辣" && recipe.spicy) return false;
    if (state.method !== "全部" && recipe.method !== state.method) return false;
    return true;
  }

  function chip(label, isOn, extraClass, attrs) {
    return (
      '<button type="button" class="chip' +
      (extraClass ? " " + extraClass : "") +
      (isOn ? " is-on" : "") +
      '" ' +
      attrs +
      ">" +
      escapeHtml(label) +
      "</button>"
    );
  }

  function tagsHtml(recipe, withTime) {
    var loc = trRecipe(recipe);
    var html =
      '<div class="tags">' +
      '<span class="tag cat">' +
      escapeHtml(loc.category) +
      "</span>" +
      (recipe.cuisine
        ? '<span class="tag cuisine' +
          (recipe.cuisine === "西式" ? " west" : "") +
          '">' +
          escapeHtml(loc.cuisine) +
          "</span>"
        : "") +
      '<span class="tag">' +
      escapeHtml(loc.method) +
      "</span>";
    if (recipe.spicy) html += '<span class="tag spicy">' + escapeHtml(t("spicy")) + "</span>";
    if (withTime) html += '<span class="tag time">' + escapeHtml(loc.time) + "</span>";
    html += "</div>";
    return html;
  }

  function nameBlock(recipe, tagName) {
    var loc = trRecipe(recipe);
    var html = "<" + tagName + ">" + escapeHtml(loc.name) + "</" + tagName + ">";
    if (state.lang !== "zh" && loc.zhName && loc.zhName !== loc.name) {
      html += '<p class="name-zh">' + escapeHtml(loc.zhName) + "</p>";
    }
    return html;
  }

  function cardHtml(recipe) {
    var loc = trRecipe(recipe);
    var alt = format(t("finishedAlt"), { name: loc.name });
    return (
      '<a class="card" href="#/recipe/' +
      encodeURIComponent(recipe.id) +
      '">' +
      '<div class="card-photo"><img src="' +
      escapeHtml(recipe.image) +
      '" alt="' +
      escapeHtml(alt) +
      '"></div>' +
      '<div class="card-body">' +
      tagsHtml(recipe, true) +
      nameBlock(recipe, "h2") +
      '<p class="card-intro">' +
      escapeHtml(loc.intro) +
      "</p>" +
      "</div></a>"
    );
  }

  function dishMenuHtml(filtered) {
    var groups = [
      { key: "中式", label: t("groupChinese"), items: [] },
      { key: "西式", label: t("groupWestern"), items: [] }
    ];
    for (var i = 0; i < recipes.length; i++) {
      var r = recipes[i];
      var g = r.cuisine === "西式" ? groups[1] : groups[0];
      var loc = trRecipe(r);
      var label = loc.name;
      if (state.lang !== "zh") label = loc.name + " · " + r.name;
      g.items.push({ id: r.id, label: label });
    }
    var html =
      '<div class="dish-pick-wrap">' +
      '<label class="filter-label" for="dish-pick">' +
      escapeHtml(t("findDish")) +
      "</label>" +
      '<select id="dish-pick">' +
      '<option value="">' +
      escapeHtml(t("pickPlaceholder")) +
      "</option>";
    for (var gIndex = 0; gIndex < groups.length; gIndex++) {
      var group = groups[gIndex];
      html += '<optgroup label="' + escapeHtml(group.label) + '">';
      for (var j = 0; j < group.items.length; j++) {
        html +=
          '<option value="' +
          escapeHtml(group.items[j].id) +
          '">' +
          escapeHtml(group.items[j].label) +
          "</option>";
      }
      html += "</optgroup>";
    }
    html += "</select></div>";
    return html;
  }

  function shufflePick(list, n) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr.slice(0, Math.min(n, arr.length));
  }

  function runRandom(filtered) {
    var picks = shufflePick(filtered, 10);
    state.randomIds = picks.map(function (r) {
      return r.id;
    });
    render();
    var panel = document.getElementById("random-panel");
    if (panel && panel.scrollIntoView) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function recipesByIds(ids) {
    var out = [];
    for (var i = 0; i < ids.length; i++) {
      var r = findRecipe(ids[i]);
      if (r) out.push(r);
    }
    return out;
  }

  function renderHome() {
    var filtered = recipes.filter(matches);
    var randomMode = !!(state.randomIds && state.randomIds.length);
    var shown = randomMode ? recipesByIds(state.randomIds) : filtered;

    var chipsCat = CATEGORIES.map(function (c) {
      var label = c === "全部" ? t("all") : mapLabel("category", c);
      return chip(label, state.category === c, "", 'data-filter="category" data-value="' + escapeHtml(c) + '"');
    }).join("");
    var chipsCuisine = CUISINES.map(function (c) {
      var label = c === "全部" ? t("allCuisines") : mapLabel("cuisine", c);
      return chip(label, state.cuisine === c, "", 'data-filter="cuisine" data-value="' + escapeHtml(c) + '"');
    }).join("");
    var chipsSpicy = SPICY.map(function (s) {
      return chip(
        t(s.labelKey),
        state.spicy === s.value,
        s.value === "辣" ? "spicy" : "",
        'data-filter="spicy" data-value="' + escapeHtml(s.value) + '"'
      );
    }).join("");
    var chipsMethod = METHODS.map(function (m) {
      var label = m === "全部" ? t("allMethods") : mapLabel("method", m);
      return chip(label, state.method === m, "", 'data-filter="method" data-value="' + escapeHtml(m) + '"');
    }).join("");

    var randomSection = "";
    if (randomMode) {
      var pool = filtered.length;
      var got = shown.length;
      var lead =
        pool <= 10
          ? format(t("randomShort"), { n: pool })
          : format(t("randomLead"), { n: pool, k: got });
      randomSection =
        '<section class="random-panel" id="random-panel">' +
        "<h2>" +
        escapeHtml(t("randomTitle")) +
        "</h2>" +
        '<p class="random-lead">' +
        escapeHtml(lead) +
        "</p>" +
        '<div class="random-actions">' +
        '<button type="button" class="btn-again" id="random-again">' +
        escapeHtml(t("randomAgain")) +
        "</button>" +
        '<button type="button" class="btn-back-list" id="random-back">' +
        escapeHtml(t("randomBack")) +
        "</button>" +
        "</div></section>";
    }

    var cards = shown.map(cardHtml).join("");

    app.innerHTML =
      '<section class="hero">' +
      "  <h1>家常煮意</h1>" +
      "  <p>" +
      escapeHtml(t("heroP")) +
      "</p>" +
      "</section>" +
      '<form class="filters" id="filter-form" action="#">' +
      '  <div class="filter-row"><span class="filter-label">' +
      escapeHtml(t("filterCategory")) +
      "</span>" +
      chipsCat +
      "</div>" +
      '  <div class="filter-row"><span class="filter-label">' +
      escapeHtml(t("filterCuisine")) +
      "</span>" +
      chipsCuisine +
      "</div>" +
      '  <div class="filter-row"><span class="filter-label">' +
      escapeHtml(t("filterSpicy")) +
      "</span>" +
      chipsSpicy +
      "</div>" +
      '  <div class="filter-row"><span class="filter-label">' +
      escapeHtml(t("filterMethod")) +
      "</span>" +
      chipsMethod +
      "</div>" +
      '<div class="finder-row">' +
      dishMenuHtml(filtered) +
      '<button type="button" class="random-btn" id="random-btn">' +
      escapeHtml(t("randomBtn")) +
      "</button>" +
      "</div>" +
      "</form>" +
      randomSection +
      (randomMode
        ? ""
        : '<p class="result-meta">' +
          escapeHtml(format(t("resultMeta"), { shown: shown.length, total: recipes.length })) +
          "</p>") +
      (shown.length
        ? '<div class="grid">' + cards + "</div>"
        : '<div class="empty">' + escapeHtml(t("empty")) + "</div>");

    app.querySelectorAll("[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-filter");
        state[key] = btn.getAttribute("data-value");
        state.randomIds = null;
        render();
      });
    });

    var pick = document.getElementById("dish-pick");
    if (pick) {
      pick.addEventListener("change", function () {
        var id = pick.value;
        if (id) location.hash = "#/recipe/" + encodeURIComponent(id);
      });
    }

    var randomBtn = document.getElementById("random-btn");
    if (randomBtn) {
      randomBtn.addEventListener("click", function () {
        runRandom(recipes.filter(matches));
      });
    }
    var again = document.getElementById("random-again");
    if (again) {
      again.addEventListener("click", function () {
        runRandom(recipes.filter(matches));
      });
    }
    var back = document.getElementById("random-back");
    if (back) {
      back.addEventListener("click", function () {
        state.randomIds = null;
        render();
      });
    }

    document.title = t("titleHome");
  }

  function listItems(items) {
    return (
      "<ul>" +
      items
        .map(function (item) {
          return "<li>" + escapeHtml(item) + "</li>";
        })
        .join("") +
      "</ul>"
    );
  }

  function renderRecipe(id) {
    var recipe = findRecipe(id);
    if (!recipe) {
      app.innerHTML =
        '<div class="not-found"><p>' +
        escapeHtml(t("notFound")) +
        '</p><p><a class="back" href="#/">' +
        escapeHtml(t("back")) +
        "</a></p></div>";
      document.title = t("notFoundTitle");
      return;
    }

    var loc = trRecipe(recipe);
    var steps = loc.steps
      .map(function (step) {
        return "<li><span>" + escapeHtml(step) + "</span></li>";
      })
      .join("");
    var alt = format(t("finishedAlt"), { name: loc.name });

    app.innerHTML =
      '<article class="recipe">' +
      '<p><a class="back" href="#/">' +
      escapeHtml(t("back")) +
      "</a></p>" +
      '<div class="recipe-hero">' +
      '<div class="recipe-photo"><img src="' +
      escapeHtml(recipe.image) +
      '" alt="' +
      escapeHtml(alt) +
      '"></div>' +
      '<div class="recipe-summary">' +
      tagsHtml(recipe, false) +
      nameBlock(recipe, "h1") +
      '<div class="recipe-meta">' +
      '<span class="pill servings">' +
      escapeHtml(loc.servings) +
      "</span>" +
      '<span class="pill">' +
      escapeHtml(loc.time) +
      "</span>" +
      (recipe.spicy
        ? '<span class="pill" style="background:#f8e6e1;color:#b5442a;border-color:#e8c4ba;">' +
          escapeHtml(t("spicy")) +
          "</span>"
        : "") +
      "</div>" +
      '<p class="intro">' +
      escapeHtml(loc.intro) +
      "</p>" +
      "</div></div>" +
      '<div class="panels">' +
      '<section class="panel"><h2>' +
      escapeHtml(t("ingredients")) +
      "</h2>" +
      listItems(loc.ingredients) +
      "</section>" +
      '<section class="panel"><h2>' +
      escapeHtml(t("seasonings")) +
      "</h2>" +
      listItems(loc.seasonings) +
      "</section>" +
      "</div>" +
      '<section class="method-block"><h2>' +
      escapeHtml(t("steps")) +
      "</h2><ol>" +
      steps +
      "</ol></section>" +
      "</article>";

    document.title = loc.name + "｜家常煮意";
  }

  function render(opts) {
    opts = opts || {};
    var route = parseRoute();
    if (route.view === "recipe") renderRecipe(route.id);
    else renderHome();
    if (opts.keepScroll) {
      window.scrollTo(0, opts.scrollY || 0);
    } else {
      window.scrollTo(0, 0);
    }
  }

  document.getElementById("lang-switch").addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-lang]");
    if (!btn) return;
    ev.preventDefault();
    setLang(btn.getAttribute("data-lang"));
  });

  window.addEventListener("hashchange", function () {
    state.randomIds = null;
    render();
  });

  if (!recipes.length) {
    updateChrome();
    app.innerHTML = '<div class="empty">' + escapeHtml(t("loadFail")) + "</div>";
    return;
  }

  document.documentElement.lang = LANG_HTML[state.lang];
  updateChrome();
  render();
})();
