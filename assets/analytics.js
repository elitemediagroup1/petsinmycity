/* ===== PetsInMyCity Standardized Analytics Framework v1 ===== */
/* Centralized GA4 event taxonomy (Measurement ID G-YVNBXJBZZ3). Loaded on every page. */
(function(){
    function pimcTrack(name, params){
          try{
                  params = params || {};
                  if(!params.page_path){ params.page_path = location.pathname; }
                  if(!params.page_title){ params.page_title = document.title; }
                  if(typeof window.gtag === 'function'){ window.gtag('event', name, params); }
                  else if(window.dataLayer){ window.dataLayer.push(Object.assign({event:name}, params)); }
          }catch(e){}
    }
    window.pimcTrack = pimcTrack;
    function affNet(href){
          if(!href){ return null; }
          var h = href.toLowerCase();
          if(h.indexOf('chewy.com') > -1 || h.indexOf('chewy.sjv.io') > -1){ return 'chewy'; }
          if(h.indexOf('amazon.') > -1 || h.indexOf('amzn.to') > -1 || h.indexOf('amzn.com') > -1){ return 'amazon'; }
          if(h.indexOf('impact.com') > -1 || h.indexOf('.sjv.io') > -1 || h.indexOf('.pxf.io') > -1){ return 'impact'; }
          return null;
    }
    function isExt(href){ try{ return new URL(href, location.href).hostname !== location.hostname; }catch(e){ return false; } }
    function inBanner(el){ return !!(el.closest && el.closest('[data-pimc-banner], .pimc-top-banner, #pimc-banner')); }
    function textOf(el){ return (el.textContent || '').trim().replace(/[\s]+/g, ' ').slice(0, 100); }
    function dataCat(el){ var n = el; while(n && n.getAttribute){ if(n.getAttribute('data-category')){ return n.getAttribute('data-category'); } n = n.parentElement; } return 'unspecified'; }
    document.addEventListener('click', function(ev){
          var a = ev.target.closest && ev.target.closest('a, button');
          if(!a){ return; }
          var href = a.getAttribute && a.getAttribute('href');
          var net = href ? affNet(href) : null;
          if(net){ pimcTrack('affiliate_click', { affiliate_network: net, destination_url: href, link_text: textOf(a), category: dataCat(a) }); return; }
          if(inBanner(a)){ pimcTrack('cta_click', { cta_location: 'top_banner', link_text: textOf(a), destination_url: href || '' }); return; }
          var inHead = !!(a.closest && a.closest('header'));
          var inFoot = !!(a.closest && a.closest('footer'));
          if(href && (inHead || inFoot)){ pimcTrack('navigation_click', { nav_location: inHead ? 'header' : 'footer', link_text: textOf(a), destination_url: href }); return; }
          if((a.hasAttribute && a.hasAttribute('data-cta')) || a.tagName === 'BUTTON' || /(btn|cta|button)/.test(a.className || '')){ pimcTrack('cta_click', { cta_label: (a.getAttribute && a.getAttribute('data-cta')) || textOf(a), link_text: textOf(a), destination_url: href || '' }); return; }
          if(href && isExt(href)){ pimcTrack('outbound_click', { destination_url: href, link_text: textOf(a) }); }
    }, true);
    var hsV = false, hsS = false;
    window.addEventListener('message', function(e){
          var d = e && e.data; if(!d || typeof d !== 'object'){ return; }
          var ty = d.type, nm = d.eventName;
          if(ty === 'hsFormCallback' || ty === 'hs-form-callback'){
                  if((nm === 'onFormReady' || nm === 'onFormDefinitionFetchSuccess') && !hsV){ hsV = true; pimcTrack('form_view', { form_type: 'hubspot', form_location: location.pathname }); }
                  if((nm === 'onFormSubmit' || nm === 'onFormSubmitted') && !hsS){ hsS = true; pimcTrack('newsletter_signup', { method: 'hubspot', form_location: location.pathname }); pimcTrack('generate_lead', { method: 'hubspot' }); }
          }
    });
    window.pimcTrackTool = function(toolName, action, extra){ pimcTrack('tool_usage', Object.assign({ tool_name: toolName || location.pathname, tool_action: action || 'use' }, extra || {})); };
})();
