(function () {
  "use strict";

  var recipes = window.RECIPES || [];
  var app = document.getElementById("app");
  var state = {
    category: "全部",
    cuisine: "全部",
    spicy: "全部",
    method: "全部",
    q: ""
  };

  var CATEGORIES = ["全部", "肉類", "海鮮", "豆腐蛋", "蔬菜", "湯", "主食"];
  var SPICY = [
    { value: "全部", label: "全部" },
    { value: "不辣", label: "不辣" },
    { value: "辣", label: "辣" }
  ];
  var CUISINES = ["全部", "中式", "西式"];
  var METHODS = ["全部", "蒸", "炒", "湯", "炆／煲", "炆飯", "灼／浸", "煮", "焗飯", "焗", "煎／烤"];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseRoute() {
    var hash = (location.hash || "").replace(/^#/, "");
    if (!hash || hash === "/") return { view: "home" };
    var match = hash.match(/^\/recipe\/([^/?#]+)/);
    if (match) {
      return { view: "recipe", id: decodeURIComponent(match[1]) };
    }
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
    var q = state.q.trim();
    if (q) {
      var hay = [
        recipe.name,
        recipe.intro,
        recipe.category,
        recipe.cuisine || "",
        recipe.method,
        recipe.spicy ? "辣" : "",
        (recipe.ingredients || []).join(" "),
        (recipe.seasonings || []).join(" ")
      ].join(" ");
      if (hay.indexOf(q) === -1) return false;
    }
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
    var html =
      '<div class="tags">' +
      '<span class="tag cat">' +
      escapeHtml(recipe.category) +
      "</span>" +
      (recipe.cuisine
        ? '<span class="tag cuisine' +
          (recipe.cuisine === "西式" ? " west" : "") +
          '">' +
          escapeHtml(recipe.cuisine) +
          "</span>"
        : "") +
      '<span class="tag">' +
      escapeHtml(recipe.method) +
      "</span>";
    if (recipe.spicy) html += '<span class="tag spicy">辣</span>';
    if (withTime) html += '<span class="tag time">' + escapeHtml(recipe.time) + "</span>";
    html += "</div>";
    return html;
  }

  function renderHome() {
    var shown = recipes.filter(matches);
    var chipsCat = CATEGORIES.map(function (c) {
      return chip(c, state.category === c, "", 'data-filter="category" data-value="' + escapeHtml(c) + '"');
    }).join("");
    var chipsCuisine = CUISINES.map(function (c) {
      return chip(c === "全部" ? "全部菜系" : c, state.cuisine === c, "", 'data-filter="cuisine" data-value="' + escapeHtml(c) + '"');
    }).join("");
    var chipsSpicy = SPICY.map(function (s) {
      return chip(
        s.label,
        state.spicy === s.value,
        s.value === "辣" ? "spicy" : "",
        'data-filter="spicy" data-value="' + escapeHtml(s.value) + '"'
      );
    }).join("");
    var chipsMethod = METHODS.map(function (m) {
      return chip(m === "全部" ? "全部做法" : m, state.method === m, "", 'data-filter="method" data-value="' + escapeHtml(m) + '"');
    }).join("");

    var cards = shown
      .map(function (r) {
        return (
          '<a class="card" href="#/recipe/' +
          encodeURIComponent(r.id) +
          '">' +
          '<div class="card-photo"><img src="' +
          escapeHtml(r.image) +
          '" alt="' +
          escapeHtml(r.name) +
          '（完成圖）"></div>' +
          '<div class="card-body">' +
          tagsHtml(r, true) +
          "<h2>" +
          escapeHtml(r.name) +
          "</h2>" +
          '<p class="card-intro">' +
          escapeHtml(r.intro) +
          "</p>" +
          "</div></a>"
        );
      })
      .join("");

    app.innerHTML =
      '<section class="hero">' +
      "  <h1>家常煮意</h1>" +
      "  <p>七十道較健康的家常菜，包括中式與港式西餐。以蒸、灼、炆、炒、焗飯、炆飯為主，用油適量。間中有辣，多數清淡。每款皆為四人份，材料以超市常見食材為準。</p>" +

      "</section>" +
      '<form class="filters" id="filter-form" action="#">' +
      '  <div class="filter-row"><span class="filter-label">分類</span>' +
      chipsCat +
      "</div>" +
      '  <div class="filter-row"><span class="filter-label">菜系</span>' +
      chipsCuisine +
      "</div>" +
      '  <div class="filter-row"><span class="filter-label">辣度</span>' +
      chipsSpicy +
      "</div>" +
      '  <div class="filter-row"><span class="filter-label">做法</span>' +
      chipsMethod +
      "</div>" +
      '  <div class="search-wrap"><label class="filter-label" for="q">搜尋</label><input id="q" type="search" placeholder="輸入菜名、食材或做法" value="' +
      escapeHtml(state.q) +
      '" autocomplete="off"></div>' +
      "</form>" +
      '<p class="result-meta">顯示 ' +
      shown.length +
      "／" +
      recipes.length +
      " 道菜</p>" +
      (shown.length
        ? '<div class="grid">' + cards + "</div>"
        : '<div class="empty">沒有符合條件的菜譜，請調整篩選或搜尋字詞。</div>');

    app.querySelectorAll("[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-filter");
        state[key] = btn.getAttribute("data-value");
        renderHome();
        var input = document.getElementById("q");
        if (input && state.q) input.focus();
      });
    });
    var input = document.getElementById("q");
    if (input) {
      input.addEventListener("input", function () {
        state.q = input.value;
        renderHome();
        var again = document.getElementById("q");
        if (again) {
          again.focus();
          var len = again.value.length;
          again.setSelectionRange(len, len);
        }
      });
    }
    document.title = "家常煮意｜七十道家常菜譜";
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
        '<div class="not-found"><p>找不到這道菜譜。</p><p><a class="back" href="#/">返回全部菜譜</a></p></div>';
      document.title = "找不到菜譜｜家常煮意";
      return;
    }

    var steps = recipe.steps
      .map(function (step) {
        return "<li><span>" + escapeHtml(step) + "</span></li>";
      })
      .join("");

    app.innerHTML =
      '<article class="recipe">' +
      '<p><a class="back" href="#/">← 返回全部菜譜</a></p>' +
      '<div class="recipe-hero">' +
      '<div class="recipe-photo"><img src="' +
      escapeHtml(recipe.image) +
      '" alt="' +
      escapeHtml(recipe.name) +
      '（完成圖）"></div>' +
      '<div class="recipe-summary">' +
      tagsHtml(recipe, false) +
      "<h1>" +
      escapeHtml(recipe.name) +
      "</h1>" +
      '<div class="recipe-meta">' +
      '<span class="pill servings">' +
      escapeHtml(recipe.servings) +
      "</span>" +
      '<span class="pill">' +
      escapeHtml(recipe.time) +
      "</span>" +
      (recipe.spicy ? '<span class="pill" style="background:#f8e6e1;color:#b5442a;border-color:#e8c4ba;">辣</span>' : "") +
      "</div>" +
      '<p class="intro">' +
      escapeHtml(recipe.intro) +
      "</p>" +
      "</div></div>" +
      '<div class="panels">' +
      '<section class="panel"><h2>食材</h2>' +
      listItems(recipe.ingredients) +
      "</section>" +
      '<section class="panel"><h2>調味</h2>' +
      listItems(recipe.seasonings) +
      "</section>" +
      "</div>" +
      '<section class="method-block"><h2>煮法</h2><ol>' +
      steps +
      "</ol></section>" +
      "</article>";

    document.title = recipe.name + "｜家常煮意";
  }

  function render() {
    var route = parseRoute();
    if (route.view === "recipe") renderRecipe(route.id);
    else renderHome();
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", render);

  if (!recipes.length) {
    app.innerHTML = '<div class="empty">未能載入菜譜資料。</div>';
    return;
  }
  render();
})();
