/* petsinmycity.com - global script v3 (amber/coral/sage) - nav: Home/About/Find Local/Paw Tools/Resources/Lucy AI/Contact */

(function(){
function buildHeader(){
return "<style>\nheader {\n background: white;\n border-bottom: 1px solid #fde68a;\n position: sticky;\n top: 0;\n z-index: 1000;\n box-shadow: 0 1px 8px rgba(0,0,0,0.06);\n}\n.pimc-nav {\n max-width: 1200px;\n margin: 0 auto;\n padding: 0 24px;\n height: 220px;\n display: flex;\n align-items: center;\n justify-content: space-between;\n gap: 24px;\n}\n.pimc-nav-logo {\n display: flex;\n align-items: center;\n gap: 10px;\n text-decoration: none;\n flex-shrink: 0;\n}\n.pimc-nav-logo img {\n height: 200px;\n width: auto;\n}\n.pimc-nav-logo-text {\n font-family: Inter, sans-serif;\n font-weight: 800;\n font-size: 1.1rem;\n color: #1a1a1a;\n}\n.pimc-nav-logo-text span {\n color: #F59E0B;\n}\n.pimc-nav-links {\n display: flex;\n align-items: center;\n gap: 4px;\n flex: 1;\n justify-content: center;\n}\n.pimc-nav-links a {\n font-family: Inter, sans-serif;\n font-size: 0.9rem;\n font-weight: 500;\n color: #374151;\n text-decoration: none;\n padding: 8px 12px;\n border-radius: 8px;\n transition: background 0.15s, color 0.15s;\n white-space: nowrap;\n}\n.pimc-nav-links a:hover {\n background: #fff8e7;\n color: #92400e;\n}\n.pimc-nav-links a[aria-current=\"page\"] {\n color: #92400e;\n background: #fff8e7;\n font-weight: 700;\n box-shadow: inset 0 -2px 0 #F59E0B;\n}\n.pimc-nav-right {\n display: flex;\n align-items: center;\n flex-shrink: 0;\n}\n.nav-dropdown {\n position: relative;\n}\n.nav-dropdown > a {\n display: inline-flex;\n align-items: center;\n gap: 4px;\n font-family: Inter, sans-serif;\n font-size: 0.9rem;\n font-weight: 500;\n color: #374151;\n text-decoration: none;\n padding: 8px 12px;\n border-radius: 8px;\n cursor: pointer;\n transition: background 0.15s;\n white-space: nowrap;\n}\n.nav-dropdown > a:hover {\n background: #fff8e7;\n color: #92400e;\n}\n.nav-dropdown-menu {\n display: none;\n position: absolute;\n top: calc(100% + 8px);\n left: 0;\n background: white;\n border: 1px solid #fde68a;\n border-radius: 14px;\n padding: 8px;\n min-width: 220px;\n box-shadow: 0 8px 32px rgba(0,0,0,0.12);\n z-index: 99999;\n flex-direction: column;\n gap: 2px;\n}\n.nav-dropdown:hover .nav-dropdown-menu,\n.nav-dropdown:focus-within .nav-dropdown-menu {\n display: flex;\n}\n.nav-dropdown-menu.open {\n display: flex !important;\n}\n.nav-dropdown-menu a {\n display: flex;\n align-items: center;\n gap: 10px;\n padding: 10px 12px;\n font-family: Inter, sans-serif;\n font-size: 0.875rem;\n color: #374151;\n text-decoration: none;\n border-radius: 8px;\n transition: background 0.15s;\n white-space: nowrap;\n}\n.nav-dropdown-menu a:hover {\n background: #fff8e7;\n color: #92400e;\n}\n.nav-dropdown-divider {\n height: 1px;\n background: #fde68a;\n margin: 4px 0;\n}\n.nav-dropdown-see-all {\n font-weight: 700 !important;\n color: #F59E0B !important;\n}\n.pimc-hamburger {\n display: none;\n background: none;\n border: none;\n cursor: pointer;\n padding: 8px;\n color: #374151;\n font-size: 1.5rem;\n}\n.pimc-mobile-nav {\n display: none;\n flex-direction: column;\n background: white;\n border-top: 1px solid #fde68a;\n padding: 16px 24px;\n gap: 4px;\n}\n.pimc-mobile-nav.open {\n display: flex;\n}\n.pimc-mobile-nav a {\n font-family: Inter, sans-serif;\n font-size: 0.95rem;\n font-weight: 500;\n color: #374151;\n text-decoration: none;\n padding: 10px 12px;\n border-radius: 8px;\n transition: background 0.15s;\n}\n.pimc-mobile-nav a:hover {\n background: #fff8e7;\n}\n.pimc-mobile-section {\n font-family: Inter, sans-serif;\n font-size: 0.75rem;\n font-weight: 700;\n color: #9ca3af;\n text-transform: uppercase;\n letter-spacing: 1px;\n padding: 12px 12px 4px;\n margin-top: 8px;\n}\n.pimc-mobile-ask-lucy {\n background: #F59E0B;\n color: white !important;\n font-weight: 700 !important;\n border-radius: 999px !important;\n text-align: center;\n margin-top: 12px;\n}\n@media (max-width: 768px) {\n .pimc-nav-links { display: none; }\n .pimc-nav-right { display: none; }\n .pimc-hamburger { display: block; }\n}\n\n.mobile-section-header {\n display:flex;\n justify-content:space-between;\n align-items:center;\n padding:14px 16px;\n font-family:Inter,sans-serif;\n font-size:0.95rem;\n font-weight:700;\n color:#1a1a1a;\n cursor:pointer;\n border-bottom:1px solid #fde68a;\n user-select:none;\n}\n.mobile-section-header:hover {\n background:#fff8e7;\n}\n.mobile-chevron {\n font-size:0.7rem;\n transition:transform 0.2s;\n color:#9ca3af;\n}\n.mobile-chevron.open {\n transform:rotate(180deg);\n}\n.mobile-section-links {\n display:none;\n flex-direction:column;\n background:#fafafa;\n border-bottom:1px solid #fde68a;\n}\n.mobile-section-links.open {\n display:flex;\n}\n.mobile-section-links a {\n font-family:Inter,sans-serif;\n font-size:0.9rem;\n font-weight:500;\n color:#374151;\n text-decoration:none;\n padding:12px 24px;\n border-bottom:1px solid #f3f4f6;\n transition:background 0.15s;\n}\n.mobile-section-links a:hover {\n background:#fff8e7;\n color:#92400e;\n}\n.mobile-simple-link {\n display:block;\n font-family:Inter,sans-serif;\n font-size:0.95rem;\n font-weight:600;\n color:#374151;\n text-decoration:none;\n padding:14px 16px;\n border-bottom:1px solid #fde68a;\n transition:background 0.15s;\n}\n.mobile-simple-link[aria-current=\"page\"] {\n color:#92400e;\n background:#fff8e7;\n font-weight:700;\n}\n.mobile-simple-link:hover {\n background:#fff8e7;\n}\n.pimc-mobile-ask-lucy {\n display:block;\n background:#F59E0B;\n color:white !important;\n font-family:Inter,sans-serif;\n font-weight:700;\n font-size:0.95rem;\n text-decoration:none;\n text-align:center;\n padding:14px 16px;\n margin:12px 16px 16px;\n border-radius:999px;\n}\n\n.nav-dropdown-soon {\n display: flex;\n align-items: center;\n justify-content: space-between;\n gap: 10px;\n padding: 10px 12px;\n font-family: Inter, sans-serif;\n font-size: 0.875rem;\n color: #9ca3af;\n border-radius: 8px;\n cursor: default;\n white-space: nowrap;\n}\n.soon-badge {\n font-family: Inter, sans-serif;\n font-size: 0.62rem;\n font-weight: 700;\n text-transform: uppercase;\n letter-spacing: 0.5px;\n color: #92400e;\n background: #fff8e7;\n border: 1px solid #fde68a;\n border-radius: 999px;\n padding: 2px 8px;\n flex-shrink: 0;\n}\n.mobile-soon {\n display: flex;\n align-items: center;\n justify-content: space-between;\n gap: 10px;\n font-family: Inter, sans-serif;\n font-size: 0.9rem;\n font-weight: 500;\n color: #9ca3af;\n padding: 12px 24px;\n border-bottom: 1px solid #f3f4f6;\n}\n</style>" + "<header>\n <nav class=\"pimc-nav\" aria-label=\"Primary\">\n <a href=\"/\" class=\"pimc-nav-logo\">\n <img src=\"/assets/logo.png\" height=\"200\" alt=\"PetsInMyCity logo\"/>\n </a>\n <div class=\"pimc-nav-links\">\n <a href=\"/today/\" data-nav=\"today\">Today</a>\n <a href=\"/\" data-nav=\"explore\">Explore</a>\n <a href=\"/about/\" data-nav=\"about\">About</a>\n <div class=\"nav-dropdown\">\n <a href=\"/find-a-vet/\" data-nav=\"find-local\" style=\"font-weight:600\">Find Local <span style=\"font-size:0.7rem\" aria-hidden=\"true\">&#9660;</span></a>\n <div class=\"nav-dropdown-menu\">\n <a href=\"/find-a-vet/\">&#128138; Find a Vet</a>\n <a href=\"/grooming/\">&#9986; Grooming</a>\n <a href=\"/boarding/\">&#127968; Boarding</a>\n <a href=\"/training/\">&#127891; Training</a>\n <div class=\"nav-dropdown-divider\"></div>\n <a href=\"/tools/emergency-finder/\">&#128680; Emergency Finder</a>\n <a href=\"/#cities\">&#128205; Browse Cities</a>\n </div>\n </div>\n <div class=\"nav-dropdown\">\n <a href=\"/tools/\" data-nav=\"tools\" data-pimc-action=\"toggle-pawtools\" style=\"font-weight:600\">&#128062; Paw Tools <span style=\"font-size:0.7rem\" aria-hidden=\"true\">&#9660;</span></a>\n <div class=\"nav-dropdown-menu\">\n <a href=\"/pet-emergency-planner\">&#128680; Emergency Planner</a>\n <a href=\"/my-pets/\">&#128062; My Pets</a>\n <a href=\"/online-vet/\">&#128105; Online Vet</a>\n <a href=\"/my-pets/\">&#127881; Pet Care Journey</a>\n <a href=\"/notifications/\">&#128276; Notifications</a>\n <div class=\"nav-dropdown-divider\"></div>\n <span class=\"nav-dropdown-soon\">Pet Medication Tracker <span class=\"soon-badge\">Coming Soon</span></span>\n <span class=\"nav-dropdown-soon\">Pet Cost Calculator <span class=\"soon-badge\">Coming Soon</span></span>\n <span class=\"nav-dropdown-soon\">Travel Checklist <span class=\"soon-badge\">Coming Soon</span></span>\n <span class=\"nav-dropdown-soon\">Lost Pet Toolkit <span class=\"soon-badge\">Coming Soon</span></span>\n <span class=\"nav-dropdown-soon\">Senior Pet Planner <span class=\"soon-badge\">Coming Soon</span></span>\n <span class=\"nav-dropdown-soon\">Puppy Planner <span class=\"soon-badge\">Coming Soon</span></span>\n <div class=\"nav-dropdown-divider\"></div>\n <a href=\"/tools/\" class=\"nav-dropdown-see-all\">See all Paw Tools &#8594;</a>\n </div>\n </div>\n <div class=\"nav-dropdown\">\n <a href=\"/dog-care/\" data-nav=\"resources\" style=\"font-weight:600\">Resources <span style=\"font-size:0.7rem\" aria-hidden=\"true\">&#9660;</span></a>\n <div class=\"nav-dropdown-menu\">\n <a href=\"/dog-care/\">&#128021; Dog Care</a>\n <a href=\"/online-vet/\">&#128105; Online Vet Guide</a>\n <a href=\"/adoption/\">&#128062; Adoption &amp; Rescue</a>\n <a href=\"/pet-insurance/\">&#127973; Pet Insurance</a>\n <a href=\"/supplies/\">&#128722; Supplies</a>\n <div class=\"nav-dropdown-divider\"></div>\n <a href=\"/pet-emergency-planner\">&#128203; Pet Emergency Planner</a>\n <a href=\"/partners/\">&#129309; Partners</a>\n </div>\n </div>\n <a href=\"/lucy/\" data-nav=\"lucy\">Lucy AI</a>\n <a href=\"mailto:help@elitemediagroup.io\" data-nav=\"contact\">Contact</a>\n </div>\n <div class=\"pimc-nav-right\"></div>\n <button class=\"pimc-hamburger\" data-pimc-action=\"toggle-mobile-nav\" aria-label=\"Open menu\" aria-expanded=\"false\" aria-controls=\"pimc-mobile-nav\">&#9776;</button>\n </nav>\n <div class=\"pimc-mobile-nav\" id=\"pimc-mobile-nav\">\n <a href=\"/today/\" class=\"mobile-simple-link\" data-nav=\"today\">Today</a>\n <a href=\"/\" class=\"mobile-simple-link\" data-nav=\"explore\">Explore</a>\n <a href=\"/about/\" class=\"mobile-simple-link\" data-nav=\"about\">About</a>\n <div class=\"mobile-section-header\" data-pimc-action=\"toggle-section\" data-pimc-target=\"mobile-findlocal\"><span>Find Local</span><span class=\"mobile-chevron\" id=\"chevron-findlocal\" aria-hidden=\"true\">&#9660;</span></div>\n <div class=\"mobile-section-links\" id=\"mobile-findlocal\">\n <a href=\"/find-a-vet/\">&#128138; Find a Vet</a>\n <a href=\"/grooming/\">&#9986; Grooming</a>\n <a href=\"/boarding/\">&#127968; Boarding</a>\n <a href=\"/training/\">&#127891; Training</a>\n <a href=\"/tools/emergency-finder/\">&#128680; Emergency Finder</a>\n <a href=\"/#cities\">&#128205; Browse Cities</a>\n </div>\n <div class=\"mobile-section-header\" data-pimc-action=\"toggle-section\" data-pimc-target=\"mobile-pawtools\"><span>&#128062; Paw Tools</span><span class=\"mobile-chevron\" id=\"chevron-pawtools\" aria-hidden=\"true\">&#9660;</span></div>\n <div class=\"mobile-section-links\" id=\"mobile-pawtools\">\n <a href=\"/pet-emergency-planner\">&#128680; Emergency Planner</a>\n <a href=\"/my-pets/\">&#128062; My Pets</a>\n <a href=\"/online-vet/\">&#128105; Online Vet</a>\n <a href=\"/my-pets/\">&#127881; Pet Care Journey</a>\n <a href=\"/notifications/\">&#128276; Notifications</a>\n <span class=\"mobile-soon\">Pet Medication Tracker <span class=\"soon-badge\">Coming Soon</span></span>\n <span class=\"mobile-soon\">Pet Cost Calculator <span class=\"soon-badge\">Coming Soon</span></span>\n <span class=\"mobile-soon\">Travel Checklist <span class=\"soon-badge\">Coming Soon</span></span>\n <span class=\"mobile-soon\">Lost Pet Toolkit <span class=\"soon-badge\">Coming Soon</span></span>\n <span class=\"mobile-soon\">Senior Pet Planner <span class=\"soon-badge\">Coming Soon</span></span>\n <span class=\"mobile-soon\">Puppy Planner <span class=\"soon-badge\">Coming Soon</span></span>\n <a href=\"/tools/\" style=\"font-weight:700;color:#f59e0b !important\">See all Paw Tools &#8594;</a>\n </div>\n <div class=\"mobile-section-header\" data-pimc-action=\"toggle-section\" data-pimc-target=\"mobile-resources\"><span>Resources</span><span class=\"mobile-chevron\" id=\"chevron-resources\" aria-hidden=\"true\">&#9660;</span></div>\n <div class=\"mobile-section-links\" id=\"mobile-resources\">\n <a href=\"/dog-care/\">&#128021; Dog Care</a>\n <a href=\"/online-vet/\">&#128105; Online Vet Guide</a>\n <a href=\"/adoption/\">&#128062; Adoption &amp; Rescue</a>\n <a href=\"/pet-insurance/\">&#127973; Pet Insurance</a>\n <a href=\"/supplies/\">&#128722; Supplies</a>\n <a href=\"/pet-emergency-planner\">&#128203; Pet Emergency Planner</a>\n <a href=\"/partners/\">&#129309; Partners</a>\n </div>\n <a href=\"/lucy/\" class=\"mobile-simple-link\" data-nav=\"lucy\">&#10024; Lucy AI</a>\n <a href=\"mailto:help@elitemediagroup.io\" class=\"mobile-simple-link\" data-nav=\"contact\">Contact</a>\n</div>\n</header>";
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
'<a href="/lucy/" class="footer-link">Lucy AI Assistant</a>' +
'<a href="/pet-emergency-planner" class="footer-link">Pet Emergency Planner</a>' +
'<a href="/tools/" class="footer-link">Paw Tools</a>'+
'<a href="/adoption/" class="footer-link">Adoption</a>'+
'<a href="/find-a-vet/" class="footer-link">Find a Vet</a>'+
'<a href="/#cities" class="footer-link">Browse Cities</a>'+
'</div>'+
'</div>'+
'<div>'+
'<p style="font-family:Nunito;font-weight:700;color:white;margin-bottom:12px">Company</p>'+
'<div style="display:flex;flex-direction:column;gap:8px">'+
'<a href="/about/" class="footer-link">About</a><a href="/trust/" class="footer-link">Trust Center</a><a href="/editorial-standards/" class="footer-link">Editorial Standards</a>'+
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

/* ---------------------------------------------------------------------------
 * Vet lead form
 *
 * Previously this fired a HubSpot request, swallowed every failure with an
 * empty .catch(), and immediately replaced the form with "A local vet will be
 * in touch shortly." That told visitors a submission had succeeded when it may
 * have failed, and promised an outcome the site does not control.
 *
 * Now:
 *   - the HubSpot response is awaited, and success is shown only on a confirmed
 *     2xx;
 *   - a failure shows a retryable error and keeps the visitor's answers;
 *   - nothing is sent until an unchecked consent box is ticked;
 *   - the success copy states only what actually happens - we pass the request
 *     to local veterinary practices - with no promise that one will call;
 *   - analytics fire form_submission_success / form_submission_failure with no
 *     personal data at all.
 *
 * NOTE FOR REVIEW: the consent sentence and the success copy describe contact
 * by phone call or email only. No SMS and no autodialer language is used
 * anywhere, because neither is documented in this repository as an actual
 * contact method. Confirm both the wording and the real fulfilment process
 * before this ships - see docs/LEAD_FORM_REVIEW.md.
 * ------------------------------------------------------------------------- */
var VET_FORM_ENDPOINT = 'https://api.hsforms.com/submissions/v3/integration/submit/243957727/243d8ca3-2c2d-484f-bf44-264f02ad446c';
var VET_FORM_TIMEOUT_MS = 15000;

function vetFormStyles(){
if(document.getElementById('pimc-vet-form-styles')){return;}
var st = document.createElement('style');
st.id = 'pimc-vet-form-styles';
st.textContent = [
'.vet-form label{display:block;font-family:Inter,sans-serif;font-size:0.85rem;font-weight:600;color:#374151;margin:12px 0 4px}',
'.vet-form .vet-required{color:#b91c1c}',
'.vet-form .vet-field-error{display:none;font-family:Inter,sans-serif;font-size:0.8rem;color:#b91c1c;margin-top:4px}',
'.vet-form .vet-field-error.show{display:block}',
'.vet-form [aria-invalid="true"]{border-color:#b91c1c !important}',
'.vet-form .vet-consent{display:flex;gap:10px;align-items:flex-start;margin:16px 0 4px}',
'.vet-form .vet-consent input{margin-top:3px;width:auto;flex:none}',
'.vet-form .vet-consent label{margin:0;font-weight:400;font-size:0.82rem;line-height:1.5;color:#4b5563}',
'.vet-form .vet-status{margin-top:14px;font-family:Inter,sans-serif;font-size:0.9rem;line-height:1.5;padding:12px 14px;border-radius:10px}',
'.vet-form .vet-status.error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}',
'.vet-form .vet-status.success{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534}',
'.vet-form button[disabled]{opacity:0.6;cursor:not-allowed}'
].join('\n');
document.head.appendChild(st);
}

function vetTrack(name, params){
try{
if(typeof window.pimcTrack === 'function'){ window.pimcTrack(name, params || {}); }
else if(typeof window.gtag === 'function'){ window.gtag('event', name, params || {}); }
}catch(err){}
}

function vetField(form, id){ return form.querySelector('#' + id) || document.getElementById(id); }

function vetShowFieldError(input, message){
if(!input){return;}
input.setAttribute('aria-invalid', 'true');
var holder = document.getElementById(input.id + '-error');
if(holder){ holder.textContent = message; holder.classList.add('show'); }
}

function vetClearFieldError(input){
if(!input){return;}
input.removeAttribute('aria-invalid');
var holder = document.getElementById(input.id + '-error');
if(holder){ holder.textContent = ''; holder.classList.remove('show'); }
}

function vetStatusEl(form){
var el = form.querySelector('.vet-status');
if(!el){
el = document.createElement('div');
el.className = 'vet-status';
el.setAttribute('role', 'status');
el.setAttribute('aria-live', 'polite');
form.appendChild(el);
}
return el;
}

function vetSetStatus(form, kind, text){
var el = vetStatusEl(form);
el.className = 'vet-status ' + (kind || '');
// An error must interrupt a screen reader; a routine success need not.
el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
el.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
el.textContent = text || '';
}

/* Deliberately permissive: 10-15 digits, so international and formatted
 * numbers are accepted and only obvious nonsense is rejected. */
function vetValidPhone(value){
var digits = String(value || '').replace(/\D/g, '');
return digits.length >= 10 && digits.length <= 15;
}

function vetValidate(form){
var fields = {
name: vetField(form, 'vet-name'),
phone: vetField(form, 'vet-phone'),
zip: vetField(form, 'vet-zip'),
pet: vetField(form, 'vet-pet'),
consent: vetField(form, 'vet-consent')
};
var firstBad = null;
[fields.name, fields.phone, fields.zip, fields.pet, fields.consent].forEach(vetClearFieldError);

var name = (fields.name && fields.name.value || '').trim();
if(name.length < 2 || name.length > 80){
vetShowFieldError(fields.name, 'Please enter your name.');
firstBad = firstBad || fields.name;
}
var phone = (fields.phone && fields.phone.value || '').trim();
if(!vetValidPhone(phone)){
vetShowFieldError(fields.phone, 'Please enter a phone number we can reach you on.');
firstBad = firstBad || fields.phone;
}
var zip = (fields.zip && fields.zip.value || '').trim();
if(!/^\d{5}(-\d{4})?$/.test(zip)){
vetShowFieldError(fields.zip, 'Please enter a 5-digit US ZIP code.');
firstBad = firstBad || fields.zip;
}
var pet = (fields.pet && fields.pet.value || '').trim();
if(['dog','cat','other'].indexOf(pet) === -1){
vetShowFieldError(fields.pet, 'Please choose a pet type.');
firstBad = firstBad || fields.pet;
}
if(fields.consent && !fields.consent.checked){
vetShowFieldError(fields.consent, 'Please tick the box so we know we may contact you.');
firstBad = firstBad || fields.consent;
}
if(firstBad){ return { ok: false, firstBad: firstBad }; }
return { ok: true, values: { name: name, phone: phone, zip: zip.slice(0, 5), pet: pet } };
}

function vetSetBusy(form, busy){
var button = form.querySelector('button[type="submit"], button:not([type])');
if(!button){ return; }
if(busy){
button.dataset.pimcLabel = button.dataset.pimcLabel || button.textContent;
button.textContent = 'Sending...';
button.disabled = true;
button.setAttribute('aria-busy', 'true');
}else{
if(button.dataset.pimcLabel){ button.textContent = button.dataset.pimcLabel; }
button.disabled = false;
button.removeAttribute('aria-busy');
}
}

function vetPostLead(values){
var payload = {
fields: [
{ name: 'firstname', value: values.name },
{ name: 'phone', value: values.phone },
{ name: 'zip', value: values.zip },
{ name: 'pet_type', value: values.pet }
],
context: { pageUri: window.location.href, pageName: document.title },
legalConsentOptions: {
consent: {
consentToProcess: true,
text: 'I agree that Elite Media Group LLC may contact me by phone or email about finding local veterinary care.',
communications: [{
value: true,
subscriptionTypeId: null,
text: 'I agree to be contacted by phone or email about finding local veterinary care.'
}]
}
}
};
var options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
if(typeof AbortController === 'function'){
var controller = new AbortController();
options.signal = controller.signal;
setTimeout(function(){ controller.abort(); }, VET_FORM_TIMEOUT_MS);
}
return fetch(VET_FORM_ENDPOINT, options);
}

function vetFormLocation(){
try{ return window.location.pathname; }catch(err){ return 'unknown'; }
}

function handleVetSubmit(e, formArg){
if(e && e.preventDefault){ e.preventDefault(); }
var form = formArg || (e && (e.currentTarget || e.target)) || document.querySelector('form.vet-form');
if(!form){ return false; }
vetFormStyles();
form.classList.add('vet-form');

var checked = vetValidate(form);
if(!checked.ok){
vetSetStatus(form, 'error', 'Please fix the highlighted fields and try again.');
if(checked.firstBad && checked.firstBad.focus){ checked.firstBad.focus(); }
// No personal data: only where the form lives and that it failed validation.
vetTrack('form_submission_failure', { form_name: 'vet_lead', form_location: vetFormLocation(), failure_reason: 'validation' });
return false;
}

vetSetBusy(form, true);
vetSetStatus(form, '', 'Sending your request...');

vetPostLead(checked.values).then(function(res){
if(res && res.ok){
vetSetBusy(form, false);
vetSetStatus(form, 'success', 'Thanks - we have your request. We share it with veterinary practices near ZIP ' + checked.values.zip + '. We cannot guarantee that a practice will call, so if this is urgent please contact a vet directly.');
vetTrack('form_submission_success', { form_name: 'vet_lead', form_location: vetFormLocation() });
vetTrack('generate_lead', { method: 'vet_lead_form' });
// Lock the form so the same lead is not sent twice, but keep it visible
// so the visitor can still see what they submitted.
Array.prototype.forEach.call(form.querySelectorAll('input, select, button, textarea'), function(el){ el.disabled = true; });
return;
}
throw new Error('http_' + (res ? res.status : 'unknown'));
}).catch(function(err){
vetSetBusy(form, false);
var aborted = err && (err.name === 'AbortError');
vetSetStatus(form, 'error', aborted
? 'That took too long. Please check your connection and press the button again - your details are still here.'
: 'We could not send your request just now. Please press the button again - your details are still here.');
// Coarse, non-identifying reason only.
vetTrack('form_submission_failure', {
form_name: 'vet_lead',
form_location: vetFormLocation(),
failure_reason: aborted ? 'timeout' : 'network_or_http'
});
});
return false;
}

/* Bound with addEventListener, not an inline onsubmit attribute. */
function initVetForms(){
var forms = document.querySelectorAll('form.vet-form, form[data-vet-lead]');
Array.prototype.forEach.call(forms, function(form){
if(form.dataset.pimcVetBound === '1'){ return; }
form.dataset.pimcVetBound = '1';
form.classList.add('vet-form');
form.setAttribute('novalidate', 'novalidate');
vetFormStyles();
form.addEventListener('submit', function(e){ handleVetSubmit(e, form); });
});
}
window.pimcInitVetForms = initVetForms;

/* Kept for any page still using an inline onsubmit attribute. Returning false
 * stops the native submit exactly as before. */
window.submitVetForm = function(e){ return handleVetSubmit(e, null); };


/* Header interactions are bound with addEventListener rather than inline
 * onclick attributes, so the injected header does not need 'unsafe-inline'
 * in a future enforced Content Security Policy. The window.* functions below
 * are kept as-is for any page that still calls them directly. */
function bindHeaderActions(){
var root = document.getElementById('site-header') || document.querySelector('.site-header') || document;
var nodes = root.querySelectorAll('[data-pimc-action]');
Array.prototype.forEach.call(nodes, function(node){
if(node.dataset.pimcBound === '1'){ return; }
node.dataset.pimcBound = '1';
node.addEventListener('click', function(ev){
var action = node.getAttribute('data-pimc-action');
if(action === 'toggle-mobile-nav'){ window.toggleMobileNav(); }
else if(action === 'toggle-section'){ window.toggleMobileSection(node.getAttribute('data-pimc-target')); }
else if(action === 'toggle-pawtools'){ window.togglePawToolsDesktop(ev); }
});
});
}

function setActiveNav(){
try{
var path = (window.location.pathname || '/').replace(/index\.html$/, '');
if(path.length > 1){ path = path.replace(/\/$/, '') + '/'; }
var current = 'explore';
if(path === '/today/' || /^\/today\//.test(path)){ current = 'today'; }
else if(/^\/about\//.test(path)){ current = 'about'; }
else if(/^\/(find-a-vet|grooming|boarding|training)\//.test(path)){ current = 'find-local'; }
else if(/^\/tools\//.test(path) || /^\/pet-emergency-planner/.test(path)){ current = 'tools'; }
else if(/^\/(dog-care|adoption|pet-insurance|supplies|partners)\//.test(path)){ current = 'resources'; }
else if(/^\/lucy\//.test(path)){ current = 'lucy'; }
else if(path === '/' || path === ''){ current = 'explore'; }
document.querySelectorAll('[data-nav]').forEach(function(a){
if(a.getAttribute('data-nav') === current){ a.setAttribute('aria-current','page'); }
else { a.removeAttribute('aria-current'); }
});
}catch(e){}
}

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
setActiveNav();
bindHeaderActions();
initVetForms();
// Partner Configuration: single source of truth for affiliate partner links.
if(!document.getElementById('partner-config-tag')){
var pc = document.createElement('script');
pc.id = 'partner-config-tag';
pc.src = '/assets/partner-config.js';
pc.defer = true;
document.head.appendChild(pc);
}
// Lucy Decision Engine: parent orchestration layer (loads before Lucy).
if(!document.getElementById('lucy-decision-engine-tag')){
var lde = document.createElement('script');
lde.id = 'lucy-decision-engine-tag';
lde.src = '/assets/lucy-decision-engine.js';
lde.defer = true;
document.head.appendChild(lde);
}
// Lucy AI widget: appended to body via lucy.js loaded from index pages.
if(!document.getElementById('lucy-script-tag')){
var ls = document.createElement('script');
ls.id = 'lucy-script-tag';
ls.src = '/assets/lucy.js';
ls.defer = true;
document.head.appendChild(ls);
}
// Veterinary Care Engine: provider-agnostic care decision engine used by Lucy.
if(!document.getElementById('vet-care-engine-tag')){
var ve = document.createElement('script');
ve.id = 'vet-care-engine-tag';
ve.src = '/assets/vet-care-engine.js';
ve.defer = true;
document.head.appendChild(ve);
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
'<a href="#pimc-email-capture" data-pimc-banner-scroll style="color:white;text-decoration:underline;font-weight:700">Get yours free &#8594;</a>' +
'<button type="button" data-pimc-banner-dismiss style="position:absolute;right:16px;top:50%;transform:translateY(-50%);background:none;border:none;color:white;font-size:1.1rem;cursor:pointer;line-height:1;opacity:0.8;padding:4px 8px" aria-label="Dismiss">&#10005;</button>' +
'</div>';
document.body.insertBefore(banner, document.body.firstChild);
// Bound as listeners, not inline onclick attributes.
var scrollLink = banner.querySelector('[data-pimc-banner-scroll]');
if(scrollLink){
scrollLink.addEventListener('click', function(ev){
ev.preventDefault();
var target = document.getElementById('pimc-email-capture');
if(target){ target.scrollIntoView({ behavior: 'smooth' }); }
});
}
var dismiss = banner.querySelector('[data-pimc-banner-dismiss]');
if(dismiss){
dismiss.addEventListener('click', function(){
banner.style.display = 'none';
try{ sessionStorage.setItem('pimc-banner-dismissed', '1'); }catch(err){}
});
}
}
if(document.readyState === 'loading'){
document.addEventListener('DOMContentLoaded', function(){ mount(); injectTopBanner(); injectEmailCapture(); });
} else { mount(); injectTopBanner(); injectEmailCapture(); }
})();

window.toggleMobileNav = function toggleMobileNav() {
var nav = document.getElementById('pimc-mobile-nav');
if (nav) {
nav.classList.toggle('open');
var btn = document.querySelector('.pimc-hamburger');
if (btn) { btn.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false'); }
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

/* Load standardized analytics framework */
(function(){ try{ var s = document.createElement('script'); s.src = '/assets/analytics.js'; s.defer = true; (document.head || document.documentElement).appendChild(s); }catch(e){} })();

/* Lucy 2.0 first-visit welcome (self-gates via localStorage: pimc-lucy-welcome-seen) */
(function(){ try{ if(window.localStorage && window.localStorage.getItem('pimc-lucy-welcome-seen')==='1') return; }catch(e){} try{ if(document.getElementById('pimc-lucy-welcome-tag')) return; var w=document.createElement('script'); w.id='pimc-lucy-welcome-tag'; w.src='/assets/lucy-welcome.js'; w.defer=true; (document.head||document.documentElement).appendChild(w); }catch(e){} })();
