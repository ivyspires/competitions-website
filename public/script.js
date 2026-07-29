document.getElementById('navToggle').addEventListener('click', function(){
    document.getElementById('navLinks').classList.toggle('open');
  });
  var moreBtn = document.getElementById('navMoreToggle');
  if (moreBtn) {
    moreBtn.addEventListener('click', function(){
      document.getElementById('navMore').classList.toggle('open');
    });
  }
  document.querySelectorAll('.faq-item .faq-q').forEach(function(btn){
    btn.addEventListener('click', function(){
      var item = btn.closest('.faq-item');
      var wasOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.faq-item').forEach(function(i){ i.classList.remove('open'); });
      if(!wasOpen){ item.classList.add('open'); }
    });
  });
  var deadlineEl = document.getElementById('cd-days');
  if (deadlineEl) {
    var deadline = new Date('2026-09-06T23:58:57Z').getTime();
    function tick(){
      var now = new Date().getTime();
      var diff = Math.max(0, deadline - now);
      var d = Math.floor(diff / (1000*60*60*24));
      var h = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
      var m = Math.floor((diff % (1000*60*60)) / (1000*60));
      var s = Math.floor((diff % (1000*60)) / 1000);
      var pad = function(n){ return String(n).padStart(2,'0'); };
      document.getElementById('cd-days').textContent = pad(d);
      document.getElementById('cd-hours').textContent = pad(h);
      document.getElementById('cd-mins').textContent = pad(m);
      document.getElementById('cd-secs').textContent = pad(s);
    }
    tick();
    setInterval(tick, 1000);
  }

  // Scroll-spy for homepage sub-nav
  var spyLinks = document.querySelectorAll('#subnavLinks a[data-spy]');
  if (spyLinks.length) {
    var spyTargets = [];
    spyLinks.forEach(function(link){
      var id = link.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if (el) spyTargets.push({ link: link, el: el });
    });
    var setActive = function(){
      var pos = window.scrollY + 140;
      var current = spyTargets[0];
      spyTargets.forEach(function(t){
        if (t.el.offsetTop <= pos) current = t;
      });
      spyTargets.forEach(function(t){ t.link.classList.remove('active'); });
      if (current) current.link.classList.add('active');
    };
    window.addEventListener('scroll', setActive, { passive: true });
    setActive();
  }

  // FAQ search + category filter (support.html)
  var faqSearch = document.getElementById('faqSearch');
  var faqChips = document.querySelectorAll('.faq-filter-chip');
  var faqCount = document.getElementById('faqCount');
  var allFaqItems = document.querySelectorAll('.faq-list .faq-item');
  var allFaqCats = document.querySelectorAll('.faq-list .faq-category');
  var activeCat = 'all';

  function applyFaqFilters(){
    var term = (faqSearch ? faqSearch.value : '').trim().toLowerCase();
    var visible = 0;
    allFaqItems.forEach(function(item){
      var text = item.textContent.toLowerCase();
      var cat = item.getAttribute('data-cat') || '';
      var matchesCat = activeCat === 'all' || cat === activeCat;
      var matchesTerm = term === '' || text.indexOf(term) !== -1;
      var show = matchesCat && matchesTerm;
      item.classList.toggle('faq-hidden', !show);
      if (show) visible++;
    });
    allFaqCats.forEach(function(catEl){
      var cat = catEl.getAttribute('data-cat');
      var groupHasVisible = document.querySelector('.faq-item[data-cat="' + cat + '"]:not(.faq-hidden)');
      catEl.style.display = (activeCat !== 'all' && activeCat !== cat) ? 'none' : (groupHasVisible ? '' : 'none');
    });
    if (faqCount) faqCount.textContent = visible + (visible === 1 ? ' question' : ' questions');
  }

  if (faqSearch) faqSearch.addEventListener('input', applyFaqFilters);
  faqChips.forEach(function(chip){
    chip.addEventListener('click', function(){
      faqChips.forEach(function(c){ c.classList.remove('active'); });
      chip.classList.add('active');
      activeCat = chip.getAttribute('data-cat');
      applyFaqFilters();
    });
  });
  if (faqCount) applyFaqFilters();

// Generic form-to-API wiring: any <form data-api="/api/..."> POSTs as JSON
// and shows success/error text in a [data-form-status] element inside the form.
document.querySelectorAll('form[data-api]').forEach(function (form) {
  var statusEl = form.querySelector('[data-form-status]');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var submitBtn = form.querySelector('button[type="submit"], button:not([type])');
    var originalText = submitBtn ? submitBtn.textContent : null;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
    if (statusEl) { statusEl.textContent = ''; statusEl.className = 'form-status'; }

    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });

    fetch(form.getAttribute('data-api'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.json().then(function (body) { return { status: res.status, body: body }; });
      })
      .then(function (result) {
        var body = result.body || {};
        if (body.ok) {
          if (statusEl) { statusEl.textContent = body.message || 'Done.'; statusEl.className = 'form-status form-status-ok'; }
          if (body.redirect) { window.location = body.redirect; return; }
          form.reset();
          if (submitBtn) { submitBtn.textContent = 'Done'; setTimeout(function () { submitBtn.disabled = false; submitBtn.textContent = originalText; }, 2500); }
        } else {
          if (statusEl) { statusEl.textContent = body.error || 'Something went wrong. Please try again.'; statusEl.className = 'form-status form-status-error'; }
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
        }
      })
      .catch(function () {
        if (statusEl) { statusEl.textContent = 'Network error. Please try again.'; statusEl.className = 'form-status form-status-error'; }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
      });
  });
});

// Preselect a role dropdown from ?role= in the URL (used by login.html / signup.html)
(function () {
  var params = new URLSearchParams(window.location.search);
  var role = params.get('role');
  if (!role) return;
  var select = document.querySelector('select[name="role"]');
  if (select) select.value = role;
})();
