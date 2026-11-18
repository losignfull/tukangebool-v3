(function () {
  'use strict';

  var RULES = [
    [/\bhit\s*[-\s]?\s*confirmed\b\s*!*/gi, 'EBOOL Terkonfirmasi !!!'],
    [/\bcongratulations!?\s*you\s*successfully\s*hitted\b\s*!*/gi, 'Selamat !! Anda Berhasil MengEbooL'],
    [/\byou\s*successfully\s*hitted\b\s*!*/gi, 'Anda Berhasil MengEbooL']
  ];

  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, CODE: 1, PRE: 1 };

  function rewrite(value) {
    var out = value;
    for (var i = 0; i < RULES.length; i++) out = out.replace(RULES[i][0], RULES[i][1]);
    return out;
  }

  function patchTextNode(node) {
    var v = node.nodeValue;
    if (!v || v.length < 4) return;
    if (!/confirm|congrat|hitted/i.test(v)) return;
    var next = rewrite(v);
    if (next !== v) node.nodeValue = next;
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return patchTextNode(root);
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1 && SKIP[root.tagName]) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var n, batch = [];
    while ((n = tw.nextNode())) batch.push(n);
    for (var i = 0; i < batch.length; i++) patchTextNode(batch[i]);
    if (root.nodeType === 1) {
      var attrs = root.querySelectorAll('[title],[aria-label],[placeholder]');
      for (var a = 0; a < attrs.length; a++) {
        for (var ai = 0, at = attrs[a].attributes; ai < at.length; ai++) {
          if (at[ai].name === 'title' || at[ai].name === 'aria-label' || at[ai].name === 'placeholder') {
            var nv = rewrite(at[ai].value);
            if (nv !== at[ai].value) attrs[a].setAttribute(at[ai].name, nv);
          }
        }
      }
    }
  }

  var pending = false;
  var queued = [];

  function flush() {
    pending = false;
    var list = queued;
    queued = [];
    for (var i = 0; i < list.length; i++) walk(list[i]);
    if (document.body) walk(document.body);
  }

  function schedule(node) {
    if (node && node.nodeType === 3) {
      queued.push(node.parentNode || document.body);
    } else if (node) {
      queued.push(node);
    }
    if (pending) return;
    pending = true;
    (window.requestAnimationFrame || window.setTimeout)(flush, 40);
  }

  function start() {
    walk(document.body || document.documentElement);

    var obs = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === 'characterData') schedule(r.target);
        else if (r.type === 'childList') {
          for (var j = 0; j < r.addedNodes.length; j++) schedule(r.addedNodes[j]);
        }
      }
    });

    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    setInterval(function () { if (document.body) walk(document.body); }, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
