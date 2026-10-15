// Page review overlay (OpenSpec change owner-attention-page-review). Inlined into evidence/review.html by
// `evidence review-page`, never into index.html. The build replaces __DATA__ with
// {schema, page, capture, ask, refs: {desktop: [{ref, selector}], mobile: [...]}}; a section review carries
// only that section's references. The owner clicks numbered
// elements, writes comments, and submits one review as a block to copy or download; the agent records it
// with `decide --page-review <file>`. Nothing is sent anywhere.
(function () {
  "use strict";
  var DATA = __DATA__;
  var KEY = "dp-page-review:" + DATA.page;
  var phone = window.innerWidth <= 600;
  var refs = (phone ? DATA.refs.mobile : DATA.refs.desktop) || [];
  if (!refs.length) refs = DATA.refs.desktop || [];

  // The numbered elements on this copy, by the selectors the capture recorded.
  var numbered = new Map();
  refs.forEach(function (item) {
    try {
      var element = document.querySelector(item.selector);
      if (element) numbered.set(element, item.ref);
    } catch (error) { /* a selector this browser cannot parse names nothing */ }
  });
  var refOf = function (target) {
    for (var node = target; node && node !== document.documentElement; node = node.parentElement) {
      if (numbered.has(node)) return { ref: numbered.get(node), element: node };
    }
    return null;
  };

  var load = function () {
    try { return JSON.parse(window.localStorage.getItem(KEY) || "[]"); } catch (error) { return []; }
  };
  var comments = load();
  var save = function () {
    try { window.localStorage.setItem(KEY, JSON.stringify(comments)); } catch (error) { /* kept in memory only */ }
  };
  // The same count decide applies to the owner's words (at least two; each CJK character counts as one).
  var CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uf900-\ufaff]/g;
  var wordCount = function (text) {
    return (text.replace(CJK, " ").match(/[A-Za-z0-9\u00c0-\u024f\u0400-\u04ff]+(?:['\u2019][A-Za-z0-9\u00c0-\u024f\u0400-\u04ff]+)*/g) || []).length + (text.match(CJK) || []).length;
  };

  // The overlay lives in a shadow root on an element appended last, so no recorded selector shifts.
  var host = document.createElement("dp-page-review");
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML = [
    "<style>",
    ":host{all:initial}",
    ".bar{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:320px;max-height:70vh;overflow:auto;background:#fff;color:#111;border:1px solid #ccc;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.18);font:14px/1.4 system-ui,sans-serif;padding:12px}",
    "button{font:inherit;padding:6px 10px;margin:4px 4px 0 0;border:1px solid #888;border-radius:6px;background:#f4f4f4;cursor:pointer}",
    "button.on{background:#d6246e;color:#fff;border-color:#d6246e}",
    "textarea{width:100%;box-sizing:border-box;font:inherit;margin-top:6px;min-height:56px}",
    "ul{padding-left:18px;margin:8px 0}",
    ".ref{font-family:ui-monospace,Menlo,monospace;font-weight:700}",
    ".hint{color:#555;font-size:12px}",
    ".outline{position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #d6246e;border-radius:3px;display:none}",
    "</style>",
    "<div class='outline'></div>",
    "<div class='bar'>",
    "<div><b>Page review 页面评审</b></div>",
    "<div class='hint'>" + (DATA.ask.stage === "review" ? "Final review 终审" : "Section 区块 " + DATA.ask.choice + " · numbers only in this section 只有本区块有编号") + (phone ? " · phone 手机" : "") + "</div>",
    "<button data-act='mode'>Comment 评论</button>",
    "<ul data-list></ul>",
    "<div data-compose hidden><div class='hint' data-target></div><textarea data-text placeholder='What should change? 要怎么改？'></textarea><button data-act='add'>Add 添加</button><button data-act='cancel'>Cancel 取消</button></div>",
    "<textarea data-words placeholder='Your words (overall) 总体意见'></textarea>",
    "<button data-act='reject'>Request changes 要修改</button><button data-act='accept'>Accept 通过</button><div class='hint' data-problem></div>",
    "<div data-out hidden><div class='hint'>Send this to the agent 把这段发给助手:</div><textarea data-block readonly></textarea><button data-act='copy'>Copy 复制</button><button data-act='download'>Download 下载</button></div>",
    "</div>",
  ].join("");
  var $ = function (selector) { return root.querySelector(selector); };
  var outline = $(".outline");
  var mode = false;
  var target = null;

  var render = function () {
    var list = $("[data-list]");
    list.innerHTML = "";
    comments.forEach(function (comment, index) {
      var item = document.createElement("li");
      var label = document.createElement("span");
      label.className = "ref";
      label.textContent = comment.ref || "—";
      item.appendChild(label);
      item.appendChild(document.createTextNode(" " + comment.text + " "));
      var remove = document.createElement("button");
      remove.textContent = "×";
      remove.addEventListener("click", function () { comments.splice(index, 1); save(); render(); });
      item.appendChild(remove);
      list.appendChild(item);
    });
  };

  var place = function (element) {
    if (!element) { outline.style.display = "none"; return; }
    var box = element.getBoundingClientRect();
    outline.style.display = "block";
    outline.style.left = box.left - 2 + "px";
    outline.style.top = box.top - 2 + "px";
    outline.style.width = box.width + "px";
    outline.style.height = box.height + "px";
  };

  var inOverlay = function (event) { return event.composedPath().indexOf(host) >= 0; };
  document.addEventListener("mousemove", function (event) {
    if (!mode || inOverlay(event)) return;
    var hit = refOf(event.target);
    place(hit ? hit.element : null);
  }, true);
  // Comment mode takes clicks before the page's own handlers.
  document.addEventListener("click", function (event) {
    if (inOverlay(event)) return;
    if (!mode) {
      // The base points relative links at the project; a same-page link scrolls here instead.
      var link = event.target.closest && event.target.closest("a[href^='#']");
      if (link) {
        var id = decodeURIComponent(link.getAttribute("href").slice(1));
        var to = id && document.getElementById(id);
        if (to) { event.preventDefault(); to.scrollIntoView(); }
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    var hit = refOf(event.target);
    target = hit ? hit.ref : null;
    $("[data-target]").textContent = target ? "On 针对 " + target : "Not on a numbered element 不在编号元素上";
    $("[data-compose]").hidden = false;
    $("[data-text]").focus();
  }, true);

  var submit = function (verdict) {
    var words = $("[data-words]").value.trim();
    var all = [words].concat(comments.map(function (comment) { return (comment.ref ? comment.ref + ": " : "") + comment.text; })).join("; ");
    var problem = verdict === "reject" && wordCount(all) < 2 ? "Say what should change, in at least two words. 请写下要改什么（至少两个词）。"
      : verdict === "accept" && comments.length ? "Remove the comments, or request changes. 请先删除评论，或选择要修改。"
      : verdict === "accept" && DATA.ask.stage === "review" && wordCount(words) < 2 ? "Say in your words that you accept. 请用自己的话写下通过意见。"
      : "";
    $("[data-problem]").textContent = problem;
    if (problem) return;
    var block = {
      schema: DATA.schema, page: DATA.page, capture: DATA.capture, ask: DATA.ask, verdict: verdict, words: words,
      comments: comments.slice(), submittedAt: new Date().toISOString(),
    };
    $("[data-block]").value = JSON.stringify(block, null, 2);
    $("[data-out]").hidden = false;
  };

  // The overlay's own clicks stay in the overlay, so the page's handlers never see them.
  root.addEventListener("click", function (event) {
    event.stopPropagation();
    var act = event.target.getAttribute && event.target.getAttribute("data-act");
    if (act === "mode") {
      mode = !mode;
      event.target.classList.toggle("on", mode);
      if (!mode) place(null);
    } else if (act === "add") {
      var text = $("[data-text]").value.trim();
      if (!text) return;
      comments.push({ ref: target, text: text });
      save();
      render();
      $("[data-text]").value = "";
      $("[data-compose]").hidden = true;
    } else if (act === "cancel") {
      $("[data-compose]").hidden = true;
    } else if (act === "reject" || act === "accept") {
      submit(act);
    } else if (act === "copy") {
      var area = $("[data-block]");
      area.select();
      var fallback = function () { try { document.execCommand("copy"); } catch (ignored) { /* the text stays selected */ } };
      try { navigator.clipboard.writeText(area.value).catch(fallback); } catch (error) { fallback(); }
    } else if (act === "download") {
      var blob = new Blob([$("[data-block]").value], { type: "application/json" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "page-review-" + DATA.page.replace(/^sha256:/, "").slice(0, 8) + ".json";
      root.appendChild(link);
      link.click();
      link.remove();
    }
  });
  render();
})();
