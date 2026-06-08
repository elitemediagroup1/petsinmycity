/* petsinmycity.com - global script v2 (amber/coral/sage) */

(function(){
  function buildHeader(){
    return "<style>\nheader {\n  background: white;\n  border-bottom: 1px solid #fde68a;\n  position: sticky;\n  top: 0;\n  z-index: 1000;\n  box-shadow: 0 1px 8px rgba(0,0,0,0.06);\n}\n.pimc-nav {\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 0 24px;\n  height: 220px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 24px;\n}\n.pimc-nav-logo {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  text-decoration: none;\n  flex-shrink: 0;\n}\n.pimc-nav-logo img {\n  height: 200px;\n  width: auto;\n}\n.pimc-nav-logo-text {\n  font-family: Inter, sans-serif;\n  font-weight: 800;\n  font-size: 1.1rem;\n  color: #1a1a1a;\n}\n.pimc-nav-logo-text span {\n  color: #F59E0B;\n}\n.pimc-nav-links {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  flex: 1;\n  justify-content: center;\n}\n.pimc-nav-links a {\n  font-family: Inter, sans-serif;\n  font-size: 0.9rem;\n  font-weight: 500;\n  color: #374151;\n  text-decoration: none;\n  padding: 8px 12px;\n  border-radius: 8px;\n  transition: background 0.15s, color 0.15s;\n  white-space: nowrap;\n}\n.pimc-nav-links a:hover {\n  background: #fff8e7;\n  color: #92400e;\n}\n.pimc-nav-right {\n  display: flex;\n  align-items: center;\n  flex-shrink: 0;\n}\n.nav-dropdown {\n  position: relative;\n}\n.nav-dropdown > a {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  font-family: Inter, sans-serif;\n  font-size: 0.9rem;\n  font-weight: 500;\n  color: #374151;\n  text-decoration: none;\n  padding: 8px 12px;\n  border-radius: 8px;\n  cursor: pointer;\n  transition: background 0.15s;\n  white-space: nowrap;\n}\n.nav-dropdown > a:hover {\n  background: #fff8e7;\n  color: #92400e;\n}\n.nav-dropdown-menu {\n  display: none;\n  position: absolute;\n  top: calc(100% + 8px);\n  left: 0;\n  background: white;\n  border: 1px solid #fde68a;\n  border-radius: 14px;\n  padding: 8px;\n  min-width: 220px;\n  box-shadow: 0 8px 32px rgba(0,0,0,0.12);\n  z-index: 99999;\n  flex-direction: column;\n  gap: 2px;\n}\n.nav-dropdown:hover .nav-dropdown-menu {\n  display: flex;\n}\n.nav-dropdown-menu.open {\n  display: flex !important;\n}\n.nav-dropdown-menu a {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  padding: 10px 12px;\n  font-family: Inter, sans-serif;\n  font-size: 0.875rem;\n  color: #374151;\n  text-decoration: none;\n  border-radius: 8px;\n  transition: background 0.15s;\n  white-space: nowrap;\n}\n.nav-dropdown-menu a:hover {\n  background: #fff8e7;\n  color: #92400e;\n}\n.nav-dropdown-divider {\n  height: 1px;\n  background: #fde68a;\n  margin: 4px 0;\n}\n.nav-dropdown-see-all {\n  font-weight: 700 !important;\n  color: #F59E0B !important;\n}\n.pimc-hamburger {\n  display: none;\n  background: none;\n  border: none;\n  cursor: pointer;\n  padding: 8px;\n  color: #374151;\n  font-size: 1.5rem;\n}\n.pimc-mobile-nav {\n  display: none;\n  flex-direction: column;\n  background: white;\n  border-top: 1px solid #fde68a;\n  padding: 16px 24px;\n  gap: 4px;\n}\n.pimc-mobile-nav.open {\n  display: flex;\n}\n.pimc-mobile-nav a {\n  font-family: Inter, sans-serif;\n  font-size: 0.95rem;\n  font-weight: 500;\n  color: #374151;\n  text-decoration: none;\n  padding: 10px 12px;\n  border-radius: 8px;\n  transition: background 0.15s;\n}\n.pimc-mobile-nav a:hover {\n  background: #fff8e7;\n}\n.pimc-mobile-section {\n  font-family: Inter, sans-serif;\n  font-size: 0.75rem;\n  font-weight: 700;\n  color: #9ca3af;\n  text-transform: uppercase;\n  letter-spacing: 1px;\n  padding: 12px 12px 4px;\n  margin-top: 8px;\n}\n.pimc-mobile-ask-lucy {\n  background: #F59E0B;\n  color: white !important;\n  font-weight: 700 !important;\n  border-radius: 999px !important;\n  text-align: center;\n  margin-top: 12px;\n}\n@media (max-width: 768px) {\n  .pimc-nav-links { display: none; }\n  .pimc-nav-right { display: none; }\n  .pimc-hamburger { display: block; }\n}\n\n.mobile-section-header {\n  display:flex;\n  justify-content:space-between;\n  align-items:center;\n  padding:14px 16px;\n  font-family:Inter,sans-serif;\n  font-size:0.95rem;\n  font-weight:700;\n  color:#1a1a1a;\n  cursor:pointer;\n  border-bottom:1px solid #fde68a;\n  user-select:none;\n}\n.mobile-section-header:hover {\n  background:#fff8e7;\n}\n.mobile-chevron {\n  font-size:0.7rem;\n  transition:transform 0.2s;\n  color:#9ca3af;\n}\n.mobile-chevron.open {\n  transform:rotate(180deg);\n}\n.mobile-section-links {\n  display:none;\n  flex-direction:column;\n  background:#fafafa;\n  border-bottom:1px solid #fde68a;\n}\n.mobile-section-links.open {\n  display:flex;\n}\n.mobile-section-links a {\n  font-family:Inter,sans-serif;\n  font-size:0.9rem;\n  font-weight:500;\n  color:#374151;\n  text-decoration:none;\n  padding:12px 24px;\n  border-bottom:1px solid #f3f4f6;\n  transition:background 0.15s;\n}\n.mobile-section-links a:hover {\n  background:#fff8e7;\n  color:#92400e;\n}\n.mobile-simple-link {\n  display:block;\n  font-family:Inter,sans-serif;\n  font-size:0.95rem;\n  font-weight:600;\n  color:#374151;\n  text-decoration:none;\n  padding:14px 16px;\n  border-bottom:1px solid #fde68a;\n  transition:background 0.15s;\n}\n.mobile-simple-link:hover {\n  background:#fff8e7;\n}\n.pimc-mobile-ask-lucy {\n  display:block;\n  background:#F59E0B;\n  color:white !important;\n  font-family:Inter,sans-serif;\n  font-weight:700;\n  font-size:0.95rem;\n  text-decoration:none;\n  text-align:center;\n  padding:14px 16px;\n  margin:12px 16px 16px;\n  border-radius:999px;\n}\n</style>\n<header>\n  <nav class=\"pimc-nav\">\n    <a href=\"/\" class=\"pimc-nav-logo\">\n      <img src=\"/assets/logo.png\" height=\"200\" alt=\"PetsInMyCity logo\"/>\n    </a>\n    <div class=\"pimc-nav-links\">\n      <div class=\"nav-dropdown\">\n        <a href=\"#\" onclick=\"return false\" style=\"font-weight:600\">Services <span style=\"font-size:0.7rem\">&#9660;</span></a>\n        <div class=\"nav-dropdown-menu\">\n          <a href=\"/pet-insurance/\">&#127973; Pet Insurance</a>\n          <a href=\"/adoption/\">&#128062; Adoption</a>\n          <a href=\"/dog-care/\">&#128021; Dog Care</a>\n          <a href=\"/find-a-vet/\">&#128138; Find a Vet</a>\n          <div class=\"nav-dropdown-divider\"></div>\n          <a href=\"/grooming/\">&#9986; Grooming</a>\n          <a href=\"/boarding/\">&#127968; Boarding</a>\n          <a href=\"/training/\">&#127891; Training</a>\n          <a href=\"/supplies/\">&#128722; Supplies</a>\n          <div class=\"nav-dropdown-divider\"></div>\n          <a href=\"/dna-testing/\">&#129516; DNA Testing</a>\n          <a href=\"/pet-boxes/\">&#128230; Pet Boxes</a>\n        </div>\n      </div>\n      <div class=\"nav-dropdown\">\n        <a href=\"/tools/\" onclick=\"togglePawToolsDesktop(event)\" style=\"font-weight:600\">&#128062; Paw Tools <span style=\"font-size:0.7rem\">&#9660;</span></a>\n        <div class=\"nav-dropdown-menu\">\n          <a href=\"/tools/food-checker/\">&#127837; Can My Pet Eat This?</a>\n          <a href=\"/tools/calorie-calculator/\">&#128290; Calorie Calculator</a>\n          <a href=\"/tools/symptom-checker/\">&#128137; Symptom Checker</a>\n          <a href=\"/tools/breed-matcher/\">&#128054; Breed Matcher</a>\n          <a href=\"/tools/name-generator/\">&#10024; Name Generator</a>\n          <a href=\"/tools/vet-cost-estimator/\">&#128176; Vet Cost Estimator</a>\n          <a href=\"/tools/emergency-finder/\">&#128680; Emergency Finder</a>\n          <a href=\"/pet-emergency-planner\">&#128203; Pet Emergency Planner</a>\n          <a href=\"/tools/dog-park-finder/\">&#127795; Dog Park Finder</a>\n          <a href=\"/tools/grooming-calculator/\">&#9986; Grooming Calculator</a>\n          <a href=\"/tools/lost-pet/\">&#128062; Lost Pet Assistant</a>\n          <div class=\"nav-dropdown-divider\"></div>\n          <a href=\"/tools/\" class=\"nav-dropdown-see-all\">See all Paw Tools &#8594;</a>\n        </div>\n      </div>\n      <a href=\"/#cities\">Cities</a>\n      <a href=\"/partners/\">Partners</a>\n    </div>\n    <div class=\"pimc-nav-right\">\n      <a href=\"/lucy/\" style=\"background:#F59E0B;color:white;font-family:Inter,sans-serif;font-weight:700;font-size:0.875rem;padding:10px 20px;border-radius:999px;text-decoration:none;display:inline-flex;align-items:center;gap:6px;white-space:nowrap\">&#10024; Ask Lucy</a>\n    </div>\n    <button class=\"pimc-hamburger\" onclick=\"toggleMobileNav()\" aria-label=\"Menu\">&#9776;</button>\n  </nav>\n  <div class=\"pimc-mobile-nav\" id=\"pimc-mobile-nav\">\n  <div class=\"mobile-section-header\" onclick=\"toggleMobileSection('mobile-services')\"><span>Services</span><span class=\"mobile-chevron\" id=\"chevron-services\">&#9660;</span></div>\n  <div class=\"mobile-section-links\" id=\"mobile-services\">\n    <a href=\"/pet-insurance/\">&#127973; Pet Insurance</a>\n    <a href=\"/adoption/\">&#128062; Adoption</a>\n    <a href=\"/dog-care/\">&#128021; Dog Care</a>\n    <a href=\"/find-a-vet/\">&#128138; Find a Vet</a>\n    <a href=\"/grooming/\">&#9986; Grooming</a>\n    <a href=\"/boarding/\">&#127968; Boarding</a>\n    <a href=\"/training/\">&#127891; Training</a>\n    <a href=\"/supplies/\">&#128722; Supplies</a>\n    <a href=\"/dna-testing/\">&#129516; DNA Testing</a>\n    <a href=\"/pet-boxes/\">&#128230; Pet Boxes</a>\n  </div>\n  <div class=\"mobile-section-header\" onclick=\"toggleMobileSection('mobile-pawtools')\"><span>&#128062; Paw Tools</span><span class=\"mobile-chevron\" id=\"chevron-pawtools\">&#9660;</span></div>\n  <div class=\"mobile-section-links\" id=\"mobile-pawtools\">\n    <a href=\"/tools/food-checker/\">&#127837; Can My Pet Eat This?</a>\n    <a href=\"/tools/calorie-calculator/\">&#128290; Calorie Calculator</a>\n    <a href=\"/tools/symptom-checker/\">&#128137; Symptom Checker</a>\n    <a href=\"/tools/breed-matcher/\">&#128054; Breed Matcher</a>\n    <a href=\"/tools/name-generator/\">&#10024; Name Generator</a>\n    <a href=\"/tools/vet-cost-estimator/\">&#128176; Vet Cost Estimator</a>\n    <a href=\"/tools/emergency-finder/\">&#128680; Emergency Finder</a>\n          <a href=\"/pet-emergency-planner\">&#128203; Pet Emergency Planner</a>\n    <a href=\"/tools/dog-park-finder/\">&#127795; Dog Park Finder</a>\n    <a href=\"/tools/grooming-calculator/\">&#9986; Grooming Calculator</a>\n    <a href=\"/tools/lost-pet/\">&#128062; Lost Pet Assistant</a>\n    <a href=\"/tools/\" style=\"font-weight:700;color:#f59e0b !important\">See all Paw Tools &#8594;</a>\n  </div>\n  <a href=\"/#cities\" class=\"mobile-simple-link\">Cities</a>\n  <a href=\"/partners/\" class=\"mobile-simple-link\">Partners</a>\n  <a href=\"/lucy/\" class=\"pimc-mobile-ask-lucy\">&#10024; Ask Lucy</a>\n</div>\n</header>";
  }

  function buildFooter(){
    return '<footer class="pimc-footer"><div class="container">'+
      '<div class="footer-inner">'+
        '<div>'+
          '<a href="/" style="display:flex;align-items:center;text-decoration:none">'+
          '<img src="/assets/logo.png" alt="PetsInMyCity - Your Local Pet Resource" style="height:96px;width:auto;display:block">'+
          '</a>'+
          '<p style="font-size:0.85rem;color:rgba(255,255,255,0.5);max-width:280px;line-height:1.6">'+
            'Free pet resources for pet owners across America. Insurance, vets, adoption, and more &mdash; all local, all free.'+
          '</p>'+
        '</div>'+
        '<div>'+
          '<p style="font-family:Nunito;font-weight:700;color:white;margin-bottom:12px">Resources</p>'+
          '<div style="display:flex;flex-direction:column;gap:8px">'+
            '<a href="/pet-emergency-planner" class="footer-link">Pet Emergency Planner</a>' +
          '<a href="/#insurance" class="footer-link">Pet Insurance</a>'+
            '<a href="/adoption/" class="footer-link">Adoption</a>'+
            '<a href="/find-a-vet/" class="footer-link">Find a Vet</a>'+
            '<a href="/#cities" class="footer-link">Browse Cities</a>'+
          '</div>'+
        '</div>'+
        '<div>'+
          '<p style="font-family:Nunito;font-weight:700;color:white;margin-bottom:12px">Company</p>'+
          '<div style="display:flex;flex-direction:column;gap:8px">'+
            '<a href="/about/" class="footer-link">About</a>'+
            '<a href="/privacy/" class="footer-link">Privacy</a>'+
            '<a href="mailto:help@elitemediagroup.io" class="footer-link">Contact</a>'+
            '<a href="https://consumersupporthelp.com" class="footer-link" target="_blank" rel="noopener">ConsumerSupportHelp</a>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="footer-bottom">'+
        '<p>&copy; 2026 Elite Media Group LLC &mdash; All rights reserved. petsinmycity.com is a free resource for pet owners. We may earn referral fees from affiliate partners.</p>'+
      '</div>'+
    '</div></footer>';
  }

  var CITY_MAP = {
    'chicago':'/cities/chicago/','houston':'/cities/houston/','phoenix':'/cities/phoenix/',
    'dallas':'/cities/dallas/','nashville':'/cities/nashville/','charlotte':'/cities/charlotte/',
    'jacksonville':'/cities/jacksonville/','atlanta':'/cities/atlanta/','denver':'/cities/denver/',
    'seattle':'/cities/seattle/','portland':'/cities/portland/','indianapolis':'/cities/indianapolis/',
    'los angeles':'/cities/los-angeles/','la':'/cities/los-angeles/',
    'new york':'/cities/new-york/','nyc':'/cities/new-york/'
  };
  var ZIP_PREFIX_MAP = {
    '606':'/cities/chicago/','770':'/cities/houston/','850':'/cities/phoenix/','852':'/cities/phoenix/','853':'/cities/phoenix/',
    '752':'/cities/dallas/','372':'/cities/nashville/','282':'/cities/charlotte/','322':'/cities/jacksonville/',
    '303':'/cities/atlanta/','802':'/cities/denver/','981':'/cities/seattle/','972':'/cities/portland/',
    '462':'/cities/indianapolis/','900':'/cities/los-angeles/','100':'/cities/new-york/'
  };

  window.searchCity = function(){
    var inp = document.getElementById('city-search');
    if(!inp){return;}
    var q = (inp.value||'').trim().toLowerCase();
    if(!q){return;}
    if(/^\d{3,5}$/.test(q)){
      var pre = q.substring(0,3);
      if(ZIP_PREFIX_MAP[pre]){window.location.href = ZIP_PREFIX_MAP[pre];return;}
    }
    var clean = q.replace(/,.*$/, '').trim();
    if(CITY_MAP[clean]){window.location.href = CITY_MAP[clean];return;}
    window.location.href = '/#cities';
  };

  window.submitVetForm = function(e){
    if(e && e.preventDefault){e.preventDefault();}
    var form = e ? e.target : document.querySelector('form');
    var name = (document.getElementById('vet-name')||{}).value || '';
    var phone = (document.getElementById('vet-phone')||{}).value || '';
    var zip = (document.getElementById('vet-zip')||{}).value || '';
    var pet = (document.getElementById('vet-pet')||{}).value || '';
    if(!name||!phone||!zip||!pet){alert('Please fill in all fields.');return false;}
    try{
      fetch('https://api.hsforms.com/submissions/v3/integration/submit/243957727/243d8ca3-2c2d-484f-bf44-264f02ad446c', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({fields:[
          {name:'firstname',value:name},
          {name:'phone',value:phone},
          {name:'zip',value:zip},
          {name:'pet_type',value:pet}
        ], context:{pageUri:window.location.href, pageName:document.title}})
      }).catch(function(){});
    }catch(_){}
    if(form){
      form.innerHTML = '<div style="text-align:center;padding:24px">'+
        '<p style="font-family:Nunito;font-weight:800;font-size:1.2rem;color:var(--amber-dark);margin-bottom:8px">&#x1F43E; Got it!</p>'+
        '<p style="color:var(--gray)">A local vet will be in touch shortly.</p>'+
      '</div>';
    }
    return false;
  };

  function mount(){
    // Inject favicon if missing
    try {
      if (!document.querySelector('link[rel~="icon"]')) {
        var fav = document.createElement('link');
        fav.rel = 'icon';
        fav.type = 'image/png';
        fav.href = '/assets/logo.png';
        document.head.appendChild(fav);
      }
    } catch(e){}
    var h = document.getElementById('site-header') || document.querySelector('.site-header');
    if(h){h.innerHTML = buildHeader();}
    var f = document.getElementById('site-footer') || document.querySelector('.site-footer');
    if(f){f.innerHTML = buildFooter();}
    // Lucy AI widget: appended to body via lucy.js loaded from index pages.
    if(!document.getElementById('lucy-script-tag')){
      var ls = document.createElement('script');
      ls.id = 'lucy-script-tag';
      ls.src = '/assets/lucy.js';
      ls.defer = true;
      document.head.appendChild(ls);
    }
    document.querySelectorAll('a[href^="#"], a[href*="/#"]').forEach(function(a){
      a.addEventListener('click', function(ev){
        var href = a.getAttribute('href')||'';
        var hash = href.indexOf('#') >= 0 ? href.substring(href.indexOf('#')) : '';
        if(hash && hash.length > 1){
          var target = document.querySelector(hash);
          if(target){ev.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}
        }
      });
    });
    var si = document.getElementById('city-search');
    if(si){si.addEventListener('keydown', function(e){if(e.key==='Enter'){e.preventDefault();window.searchCity();}});}
  }

    function injectEmailCapture(){
    if (document.getElementById('pimc-email-capture')) return;
    if (!document.getElementById('site-footer')) return;
    var section = document.createElement('div');
    section.id = 'pimc-email-capture';
    section.innerHTML =
    '<div style="background:linear-gradient(135deg,#92400e 0%,#f59e0b 100%);padding:48px 24px;text-align:center">' +
    '<div style="max-width:560px;margin:0 auto">' +
    '<p style="font-family:Inter,sans-serif;font-size:0.8rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:8px">' +
    '&#128062; Join Our Community' +
    '</p>' +
    '<h2 style="font-family:Inter,sans-serif;font-weight:800;font-size:1.6rem;color:white;margin-bottom:8px">' +
    'Get Free Access to the PetsInMyCity Pet Emergency Planner' +
    '</h2>' +
    '<p style="font-family:Inter,sans-serif;font-size:0.95rem;color:rgba(255,255,255,0.9);margin-bottom:24px;line-height:1.6">' +
    'Create, save, and print a personalized emergency plan for your pet in minutes.' +
    '</p>' +
    '<ul style="list-style:none;padding:0;margin:0 auto 20px;max-width:420px;text-align:left;">' +
    '<li style="font-family:Inter,sans-serif;font-size:0.95rem;color:rgba(255,255,255,0.95);margin-bottom:8px;">\u2705 Personalized For Your Pet</li>' +
    '<li style="font-family:Inter,sans-serif;font-size:0.95rem;color:rgba(255,255,255,0.95);margin-bottom:8px;">\u2705 Save & Print Anytime</li>' +
    '<li style="font-family:Inter,sans-serif;font-size:0.95rem;color:rgba(255,255,255,0.95);margin-bottom:8px;">\u2705 Emergency Contact Storage</li>' +
    '<li style="font-family:Inter,sans-serif;font-size:0.95rem;color:rgba(255,255,255,0.95);margin-bottom:8px;">\u2705 Medication Tracking</li>' +
    '<li style="font-family:Inter,sans-serif;font-size:0.95rem;color:rgba(255,255,255,0.95);margin-bottom:8px;">\u2705 Disaster Preparedness Checklist</li>' +
    '<li style="font-family:Inter,sans-serif;font-size:0.95rem;color:rgba(255,255,255,0.95);margin-bottom:8px;">\u2705 Completely Free</li>' +
    '</ul>' +
    '<div class="hs-form-frame" data-region="na2" data-form-id="35e150eb-f091-4eeb-a747-ca51d4c9e76d" data-portal-id="243957727" style="margin:0 auto 8px;max-width:100%;"></div>' +
    'By providing your email address and/or phone number and checking the boxes above, you agree to receive email communications and/or text messages from PetsInMyCity.com, owned and operated by Elite Media Group LLC. Communications may include newsletters, pet care tips, local pet resources, exclusive deals, product recommendations, pet alerts, and other updates relevant to pet owners. Message frequency varies. Message and data rates may apply for text messages. You are not required to provide your phone number or agree to receive text messages as a condition of any purchase or service. You may unsubscribe from emails at any time by clicking the unsubscribe link in any email. You may opt out of text messages at any time by replying STOP. For help, reply HELP or contact us at hello@elitemediagroup.io. View our Privacy Policy at <a href="/privacy/" style="color:#92400e">petsinmycity.com/privacy</a>.' +
    '</p>' +
    '</div>' +
    '</div>';
    var footer = document.getElementById('site-footer');
    footer.parentNode.insertBefore(section, footer);

    // Load the official HubSpot embed script once
    if (!document.querySelector('script[src="https://js-na2.hsforms.net/forms/embed/243957727.js"]')) {
      var hsScript = document.createElement('script');
      hsScript.src = 'https://js-na2.hsforms.net/forms/embed/243957727.js';
      hsScript.defer = true;
      document.head.appendChild(hsScript);
    }
    if (!window.__pimcHsPlannerModal) {
      window.__pimcHsPlannerModal = true;
      var pimcModalShown = false;
      function pimcShowPlannerModal() {
        try {
          if (document.getElementById('pimc-planner-modal')) return;
          var overlay = document.createElement('div');
          overlay.id = 'pimc-planner-modal';
          overlay.setAttribute('role', 'dialog');
          overlay.setAttribute('aria-modal', 'true');
          overlay.setAttribute('aria-labelledby', 'pimc-planner-modal-title');
          overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(26,26,26,0.55);font-family:Inter,sans-serif';
          var card = document.createElement('div');
          card.style.cssText = 'background:#fff;max-width:420px;width:100%;border-radius:16px;padding:32px 28px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.25);position:relative;border-top:6px solid #f59e0b';
          card.innerHTML =
            '<button type="button" id="pimc-planner-modal-close" aria-label="Close" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:1.4rem;line-height:1;color:#9ca3af;cursor:pointer;padding:4px 8px">&#10005;</button>' +
            '<h2 id="pimc-planner-modal-title" style="font-family:Inter,sans-serif;font-weight:800;font-size:1.35rem;color:#1a1a1a;margin:4px 0 12px">Your Pet Emergency Planner Is Ready &#128062;</h2>' +
            '<p style="font-family:Inter,sans-serif;font-size:0.98rem;color:#4b5563;line-height:1.6;margin:0 0 22px">Thanks for joining PetsInMyCity. Click below to open your free Pet Emergency Planner.</p>' +
            '<a href="/pet-emergency-planner" id="pimc-planner-modal-btn" style="display:inline-block;background:#f59e0b;color:#fff;font-family:Inter,sans-serif;font-weight:700;font-size:1rem;padding:14px 32px;border-radius:10px;text-decoration:none;box-shadow:0 6px 16px rgba(245,158,11,0.35)">Open My Free Planner</a>' +
            '<div style="margin-top:16px"><a href="/pet-emergency-planner" target="_blank" rel="noopener" style="font-family:Inter,sans-serif;font-size:0.82rem;color:#92400e;text-decoration:underline">Open planner in a new tab</a></div>';
          overlay.appendChild(card);
          function pimcCloseModal() {
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            document.removeEventListener('keydown', onKey);
          }
          function onKey(e) { if (e.key === 'Escape') pimcCloseModal(); }
          overlay.addEventListener('click', function(e) { if (e.target === overlay) pimcCloseModal(); });
          document.addEventListener('keydown', onKey);
          document.body.appendChild(overlay);
          var closeBtn = document.getElementById('pimc-planner-modal-close');
          if (closeBtn) { closeBtn.addEventListener('click', pimcCloseModal); }
          var primaryBtn = document.getElementById('pimc-planner-modal-btn');
          if (primaryBtn) { primaryBtn.focus(); }
        } catch (err) {}
      }
      function pimcTriggerPlannerModal(source) {
        if (pimcModalShown) return;
        pimcModalShown = true;
        try { console.log('[PIMC] HubSpot form submitted detected via', source, '- showing planner modal'); } catch (e) {}
        pimcShowPlannerModal();
      }
      // 1) HubSpot postMessage detection (covers hsFormCallback + common submitted event names)
      window.addEventListener('message', function(ev){
        try {
          var data = ev && ev.data;
          if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { return; }
          }
          if (!data || typeof data !== 'object') return;
          var name = data.eventName || data.type || data.event || '';
          var isHs = data.type === 'hsFormCallback' || data.type === 'hs-form-callback' || ('hsFormGuid' in data) || ('formGuid' in data) || ('conversionId' in data);
          var isSubmitted = name === 'onFormSubmitted' || name === 'onFormSubmit' || name === 'onFormSubmittedAsync' || (typeof name === 'string' && name.toLowerCase().indexOf('submitt') !== -1);
          // Debug: log any HubSpot-related message payload while we confirm the exact event
          if (isHs || isSubmitted) { try { console.log('[PIMC] HubSpot message payload:', data); } catch (e) {} }
          if ((isHs && isSubmitted) || (data.type === 'hsFormCallback' && isSubmitted)) {
            pimcTriggerPlannerModal('postMessage:' + name);
          }
        } catch (e) {}
      });
      // 2) Fallback: watch #pimc-email-capture for HubSpot's submitted / thank-you state
      function pimcWatchThankYou() {
        try {
          var container = document.getElementById('pimc-email-capture');
          if (!container || typeof MutationObserver === 'undefined') return;
          function pimcCheckSubmitted() {
            try {
              if (pimcModalShown) return true;
              if (container.querySelector('.submitted-message, .hs-submitted-message, .hs_submitted, [data-hs-forms-submitted], .hbspt-form .submitted-message')) {
                pimcTriggerPlannerModal('mutationObserver:submitted-message');
                return true;
              }
              var form = container.querySelector('form');
              if (form && form.style && form.style.display === 'none' && container.textContent && container.textContent.length > 0) {
                // form hidden after submit and replacement content present
                pimcTriggerPlannerModal('mutationObserver:form-hidden');
                return true;
              }
            } catch (e) {}
            return false;
          }
          var observer = new MutationObserver(function(){
            if (pimcCheckSubmitted() && observer) { observer.disconnect(); }
          });
          observer.observe(container, { childList: true, subtree: true, attributes: true });
        } catch (e) {}
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', pimcWatchThankYou);
      } else {
        pimcWatchThankYou();
      }
    }
  }

      function injectTopBanner() {
    if (document.getElementById('pimc-top-banner')) return;
    if (sessionStorage.getItem('pimc-banner-dismissed')) return;
    var banner = document.createElement('div');
    banner.id = 'pimc-top-banner';
    banner.innerHTML =
      '<div style="background:#f59e0b;color:white;font-family:Inter,sans-serif;font-size:0.85rem;font-weight:600;padding:10px 48px 10px 24px;text-align:center;position:relative;z-index:9998">' +
      '&#128062; Free Pet Emergency Planner &#8212; Create, Save &amp; Print Your Pet&#8217;s Emergency Plan ' +
      '<a href="#pimc-email-capture" onclick="event.preventDefault();var t=document.getElementById(\'pimc-email-capture\');if(t){t.scrollIntoView({behavior:\'smooth\'});}" style="color:white;text-decoration:underline;font-weight:700">Get yours free &#8594;</a>' +
      '<button onclick="document.getElementById(\'pimc-top-banner\').style.display=\'none\';sessionStorage.setItem(\'pimc-banner-dismissed\',\'1\')" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);background:none;border:none;color:white;font-size:1.1rem;cursor:pointer;line-height:1;opacity:0.8;padding:4px 8px" aria-label="Dismiss">&#10005;</button>' +
      '</div>';
    document.body.insertBefore(banner, document.body.firstChild);
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ mount(); injectTopBanner(); injectEmailCapture(); });
  } else { mount(); injectTopBanner(); injectEmailCapture(); }
})();

window.toggleMobileNav = function toggleMobileNav() {
  var nav = document.getElementById('pimc-mobile-nav');
  if (nav) {
    nav.classList.toggle('open');
  }
};



window.toggleMobileSection = function toggleMobileSection(id) {
  var links = document.getElementById(id);
  var chevron = document.getElementById('chevron-' + id.replace('mobile-', ''));
  if (!links) return;
  var isOpen = links.classList.contains('open');
  document.querySelectorAll('.mobile-section-links').forEach(function(el) { el.classList.remove('open'); });
  document.querySelectorAll('.mobile-chevron').forEach(function(el) { el.classList.remove('open'); });
  if (!isOpen) {
    links.classList.add('open');
    if (chevron) chevron.classList.add('open');
  }
};window.togglePawToolsDesktop = function togglePawToolsDesktop(e) {
  e.preventDefault();
  e.stopPropagation();
  var menus = document.querySelectorAll('.nav-dropdown-menu');
  menus.forEach(function(m) { m.classList.remove('open'); });
  var menu = e.currentTarget.closest('.nav-dropdown').querySelector('.nav-dropdown-menu');
  if (menu) { menu.classList.toggle('open'); }
  document.addEventListener('click', function closeAll(ev) {
    if (!ev.target.closest('.nav-dropdown')) {
      document.querySelectorAll('.nav-dropdown-menu').forEach(function(m) { m.classList.remove('open'); });
      document.removeEventListener('click', closeAll);
    }
  });
};

