/* =====================================================
   BIG BLUE MOP — APP.JS
   Handles: Nav scroll, Checklist (checklist.html), Contact form
   ===================================================== */

// ===== NAV SCROLL =====
(function () {
  var nav = document.getElementById('mainNav');
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  var floatCta = document.getElementById('floatCta');

  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 60);
      if (floatCta) floatCta.classList.toggle('show', window.scrollY > 500);
    });
  }

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
      toggle.classList.toggle('active');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.classList.remove('active');
      });
    });
  }
})();

// ===== CHECKLIST (runs on checklist.html only) =====
(function () {
  if (!document.getElementById('cl-items')) return;

  var answers = {};
  var weights  = {};
  var totalQ   = 10;

  var items = [
    { n:1,  w:3, label:'Top of the fridge, microwaves, and high surfaces',
      desc:'Run your finger along the top. Dust and grease here means surfaces at eye level are getting a wipe, but the real work is being skipped.',
      p:'Clean', u:'Not Sure', f:'Dirty' },
    { n:2,  w:2, label:'Bin lids, inside and underneath',
      desc:'Lift the lid. Look at the rim and underside. If there is buildup, residue or staining, your bins are being emptied but never actually cleaned.',
      p:'Clean', u:'Not Sure', f:'Dirty' },
    { n:3,  w:4, label:'Behind the toilet and around the cistern',
      desc:'Get low. Look behind the base and around the pipes. This is the number one spot cleaners skip because nobody checks. Until someone does.',
      p:'Clean', u:'Not Sure', f:'Dirty' },
    { n:4,  w:4, label:'Underside of the toilet bowl rim',
      desc:'Use your phone torch. Look under the rim. If there is brown or orange buildup, the bowl is getting a swirl but never a proper scrub.',
      p:'Clean', u:'Not Sure', f:'Dirty' },
    { n:5,  w:2, label:'Mirror edges and glass streak marks',
      desc:'Check the corners and edges of mirrors and glass. Spray residue collecting in the corners tells you the wipe is rushed, not thorough.',
      p:'Clean', u:'Not Sure', f:'Dirty' },
    { n:6,  w:2, label:'Skirting boards and door frames',
      desc:'Crouch down. Run your finger along skirting boards in hallways and main rooms. Dust buildup here means the floor gets mopped but everything at ankle height gets ignored.',
      p:'Clean', u:'Not Sure', f:'Dirty' },
    { n:7,  w:3, label:'Light switches, door handles, high-touch surfaces',
      desc:'Feel the light switches and door handles in your bathroom and kitchen. Sticky or grimy? These are touched by every single person, every single day.',
      p:'Clean', u:'Not Sure', f:'Dirty' },
    { n:8,  w:3, label:'Shower screens, tile grout, and wet area floors',
      desc:'Look at the grout lines in your wet areas. Discolouration, mould spots, or pink biofilm means moisture is being left behind and never properly treated.',
      p:'Clean', u:'Not Sure', f:'Dirty' },
    { n:9,  w:2, label:'Air vents, exhaust fans, and ceiling corners',
      desc:'Look up. Dust hanging off vents, cobwebs in corners, and grime on exhaust fan covers means you are recirculating dust into your space every day.',
      p:'Clean', u:'Not Sure', f:'Dirty' },
    { n:10, w:3, label:'The smell test. Close your eyes. Breathe in.',
      desc:'Walk into your bathroom or wet area. Close your eyes. Take a deep breath. If the first thing you notice is anything other than clean or nothing... your customers notice it too. Every single time.',
      p:'Fresh', u:'Stale', f:'Bad' }
  ];

  function build() {
    var el = document.getElementById('cl-items');
    var html = '';
    items.forEach(function (it) {
      weights[it.n] = it.w;
      var num = it.n < 10 ? '0' + it.n : '' + it.n;
      html +=
        '<div class="cl-item" id="cl-item-' + it.n + '">' +
          '<div class="cl-head">' +
            '<div class="cl-num">' + num + '</div>' +
            '<div class="cl-title">' + it.label + '</div>' +
          '</div>' +
          '<div class="cl-desc">' + it.desc + '</div>' +
          '<div class="cl-options">' +
            '<button class="cl-btn cl-btn-pass"   onclick="clAns(' + it.n + ',\'pass\',this)">'   + it.p + '</button>' +
            '<button class="cl-btn cl-btn-unsure" onclick="clAns(' + it.n + ',\'unsure\',this)">' + it.u + '</button>' +
            '<button class="cl-btn cl-btn-fail"   onclick="clAns(' + it.n + ',\'fail\',this)">'   + it.f + '</button>' +
          '</div>' +
        '</div>';
    });
    el.innerHTML = html;
  }

  window.clAns = function (q, val, el) {
    answers[q] = val;
    var item = document.getElementById('cl-item-' + q);
    item.querySelectorAll('.cl-btn').forEach(function (b) { b.classList.remove('on'); });
    el.classList.add('on');
    item.classList.remove('pass','fail','unsure');
    item.classList.add(val);
    var count = Object.keys(answers).length;
    document.getElementById('cl-submitBtn').disabled = (count < totalQ);
    if (count >= 5) updateScore();
  };

  function calcScore() {
    var max = 0, actual = 0, fails = 0, unsures = 0;
    for (var q = 1; q <= totalQ; q++) {
      var w = weights[q] || 1;
      max += w;
      if      (answers[q] === 'pass')   actual += w;
      else if (answers[q] === 'unsure') { actual += w * 0.5; unsures++; }
      else if (answers[q] === 'fail')   fails++;
    }
    var pct  = Math.round((actual / max) * 100);
    var tier = (pct >= 80 && fails <= 1) ? 'COLD' : (pct >= 50 || fails <= 3) ? 'WARM' : 'HOT';
    return { pct:pct, fails:fails, unsures:unsures, tier:tier };
  }

  function updateScore() {
    var s = calcScore();
    document.getElementById('cl-scoreBar').classList.add('vis');
    var fill  = document.getElementById('cl-barFill');
    var title = document.getElementById('cl-scoreTitle');
    var color = s.pct >= 80 ? '#27ae60' : s.pct >= 50 ? '#F39C12' : '#E74C3C';
    fill.style.width      = s.pct + '%';
    fill.style.background = color;
    title.style.color     = color;
    title.textContent     = 'Cleaning Score: ' + s.pct + '%';
    var v = document.getElementById('cl-verdict');
    if (s.pct >= 80)
      v.innerHTML = 'Looking solid. Your cleaning team is covering the basics. Submit your results and we will send you a full breakdown.';
    else if (s.pct >= 50)
      v.innerHTML = '<strong>' + s.fails + ' areas flagged.</strong> These are the spots your customers and staff are noticing. Submit to see your full report.';
    else
      v.innerHTML = '<strong>Your cleaning partner has a problem.</strong> ' + s.fails + ' areas failed. This is the kind of result that shows up in Google reviews. Submit and we will be in touch today.';
  }

  window.clSubmit = function () {
    var biz   = (document.getElementById('cl-bizName').value   || '').trim();
    var name  = (document.getElementById('cl-contactName').value || '').trim();
    var email = (document.getElementById('cl-contactEmail').value || '').trim();
    var phone = (document.getElementById('cl-contactPhone').value || '').trim();
    if (!email) { alert('Please enter your email so we can send your results.'); return; }

    var s   = calcScore();
    var btn = document.getElementById('cl-submitBtn');
    btn.disabled    = true;
    btn.textContent = 'Submitting...';

    var payload = { bizName:biz, contactName:name, email:email, phone:phone,
                    score:s.pct, fails:s.fails, unsures:s.unsures, tier:s.tier, answers:answers };

    // =====================================================
    // REPLACE THIS URL WITH YOUR DEPLOYED APPS SCRIPT URL
    // =====================================================
    var BACKEND = 'YOUR_APPS_SCRIPT_URL';

    if (BACKEND === 'YOUR_APPS_SCRIPT_URL') {
      showResults(s.pct, s.fails, s.tier, biz, email);
      return;
    }

    fetch(BACKEND, { method:'POST', mode:'no-cors',
                     headers:{'Content-Type':'application/json'},
                     body:JSON.stringify(payload) })
      .then(function () { showResults(s.pct, s.fails, s.tier, biz, email); })
      .catch(function () { showResults(s.pct, s.fails, s.tier, biz, email); });
  };

  function showResults(pct, fails, tier, biz) {
    document.getElementById('cl-submitBtn').textContent = 'Submitted ✓';
    var ov = document.getElementById('resultOverlay');
    ov.classList.add('vis');
    var em, lb, msg, ac, sub;
    if (tier === 'HOT') {
      em='🔴'; lb='Critical Issues Found';
      document.getElementById('resultLabel').style.color = '#E74C3C';
      msg = 'Your space scored <strong>' + pct + '%</strong> with <strong>' + fails + ' areas failing.</strong> This is the kind of result that drives reviews. We have your results and Alex will be in touch today.';
      ac  = 'Call Alex Now'; document.getElementById('resultAction').href = 'tel:0410260800';
      sub = 'Your results have been submitted. Expect a call within 24 hours.';
    } else if (tier === 'WARM') {
      em='🟡'; lb='Gaps Detected';
      document.getElementById('resultLabel').style.color = '#F39C12';
      msg = 'Your space scored <strong>' + pct + '%</strong>. Not a disaster, but <strong>' + fails + ' areas need attention.</strong> These gaps build up quietly and eventually show up in reviews.';
      ac  = 'Book a Free Walkthrough';
      document.getElementById('resultAction').href = 'mailto:bigbluemop@gmail.com?subject=' + encodeURIComponent('Free Walkthrough Request - ' + biz);
      sub = 'Your results have been submitted. We will follow up within 48 hours.';
    } else {
      em='🟢'; lb='Looking Good';
      document.getElementById('resultLabel').style.color = '#27ae60';
      msg = 'Your space scored <strong>' + pct + '%</strong>. Your cleaning team is covering the bases. Run this again in 30 days to keep them honest.';
      ac  = 'Done';
      document.getElementById('resultAction').href = '#';
      document.getElementById('resultAction').onclick = function (e) {
        e.preventDefault(); ov.classList.remove('vis');
      };
      sub = 'Standards slip when nobody is watching. Keep this checklist handy.';
    }
    document.getElementById('resultEmoji').textContent  = em;
    document.getElementById('resultLabel').textContent  = lb;
    document.getElementById('resultMsg').innerHTML      = msg;
    document.getElementById('resultAction').textContent = ac;
    document.getElementById('resultSub').textContent    = sub;
  }

  build();
})();

// ===== CONTACT FORM (index.html) =====
window.submitContact = function (e) {
  e.preventDefault();
  var btn  = document.getElementById('contactSubmitBtn');
  var note = document.getElementById('contactFormNote');
  btn.disabled    = true;
  btn.textContent = 'Sending...';
  setTimeout(function () {
    note.textContent    = '✓ Message sent! Alex will be in touch within one business day.';
    btn.textContent     = 'Message Sent ✓';
    document.getElementById('contactForm').reset();
  }, 900);
};

// ===== SCROLL ANIMATIONS =====
(function () {
  if (!('IntersectionObserver' in window)) return;
  var els = document.querySelectorAll(
    '.trust-block, .review-card, .contact-card'
  );
  els.forEach(function (el) {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity   = '1';
        entry.target.style.transform = 'translateY(0)';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach(function (el, i) {
    el.style.transitionDelay = (i % 3) * 0.1 + 's';
    io.observe(el);
  });
})();
