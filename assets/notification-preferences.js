/* PetsInMyCity — Notification Preferences UI controller
   Renders the Lucy Care Companion(TM) preferences from the engine catalog
   (window.PimcNotify) so the page stays in sync as types/channels are added.
   No provider logic here; this only reads/writes preferences + fires analytics
   via the engine. Mobile-first, accessible, keyboard-operable. */
(function () {
  'use strict';

  var N = window.PimcNotify;
  if (!N) { return; } /* engine not loaded; fail quietly */

  var statusEl = document.getElementById('nt-status');
  function announce(msg) {
    if (!statusEl) { return; }
    statusEl.textContent = msg;
    if (announce._t) { clearTimeout(announce._t); }
    announce._t = setTimeout(function () { statusEl.textContent = ''; }, 2600);
  }

  /* ---------- Toggle builder (real checkbox for accessibility) ---------- */
  function makeSwitch(id, checked, disabled, labelId) {
    var wrap = document.createElement('span');
    wrap.className = 'nt-switch';
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = !!checked;
    if (disabled) { input.disabled = true; }
    if (labelId) { input.setAttribute('aria-labelledby', labelId); }
    var track = document.createElement('span'); track.className = 'nt-track'; track.setAttribute('aria-hidden', 'true');
    var thumb = document.createElement('span'); thumb.className = 'nt-thumb'; thumb.setAttribute('aria-hidden', 'true');
    wrap.appendChild(input); wrap.appendChild(track); wrap.appendChild(thumb);
    return { wrap: wrap, input: input };
  }

  function rowFor(item, kind) {
    var row = document.createElement('div');
    row.className = 'nt-row';

    var info = document.createElement('div');
    info.className = 'nt-info';
    var icon = document.createElement('span');
    icon.className = 'nt-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = item.icon || '\u{1F43E}';
    var textWrap = document.createElement('div');
    var labelId = 'nt-' + kind + '-' + item.id + '-label';
    var label = document.createElement('div');
    label.className = 'nt-label'; label.id = labelId; label.textContent = item.label;

    if (kind === 'channel' && item.optIn && item.available) {
      var b = document.createElement('span'); b.className = 'nt-badge optin'; b.textContent = 'Opt-in'; label.appendChild(b);
    }
    if (kind === 'channel' && !item.available) {
      var s = document.createElement('span'); s.className = 'nt-badge soon'; s.textContent = 'Soon'; label.appendChild(s);
    }
    if (kind === 'type' && item.critical) {
      var c = document.createElement('span'); c.className = 'nt-badge'; c.textContent = 'Important'; label.appendChild(c);
    }

    var desc = document.createElement('div');
    desc.className = 'nt-desc'; desc.textContent = item.desc || '';
    textWrap.appendChild(label); textWrap.appendChild(desc);
    info.appendChild(icon); info.appendChild(textWrap);

    var state = N.getState();
    var checked = kind === 'channel' ? !!state.channels[item.id] : !!state.types[item.id];
    var sw = makeSwitch('nt-' + kind + '-' + item.id, checked, kind === 'channel' && !item.available, labelId);

    sw.input.addEventListener('change', function () {
      var on = sw.input.checked;
      if (kind === 'channel') {
        /* Browser channel needs OS permission before it can truly send. */
        if (item.id === 'browser' && on && typeof N.requestBrowserPermission === 'function') {
          N.requestBrowserPermission().then(function (p) {
            if (p !== 'granted') {
              sw.input.checked = false;
              N.setChannel('browser', false);
              announce('Browser notifications need your permission. You can enable them anytime.');
              syncMaster();
              return;
            }
            N.setChannel('browser', true);
            announce('Browser notifications are on.');
            syncMaster();
          });
          return;
        }
        N.setChannel(item.id, on);
        announce(item.label + (on ? ' turned on.' : ' turned off.'));
        syncMaster();
      } else {
        N.setType(item.id, on);
        announce(item.label + (on ? ' turned on.' : ' turned off.'));
      }
    });

    row.appendChild(info); row.appendChild(sw.wrap);
    return row;
  }

  /* ---------- Master switch ---------- */
  var masterInput = document.getElementById('nt-master');
  function syncMaster() {
    var s = N.getState();
    if (masterInput) { masterInput.checked = !!s.enabled; }
  }
  if (masterInput) {
    masterInput.checked = !!N.getState().enabled;
    masterInput.addEventListener('change', function () {
      N.setEnabled(masterInput.checked);
      announce(masterInput.checked ? 'Notifications from Lucy are on.' : 'Notifications are off. You can turn them back on anytime.');
    });
  }

  /* ---------- Render catalogs ---------- */
  var chWrap = document.getElementById('nt-channels');
  if (chWrap) { N.CHANNELS.forEach(function (c) { chWrap.appendChild(rowFor(c, 'channel')); }); }
  var tyWrap = document.getElementById('nt-types');
  if (tyWrap) { N.TYPES.forEach(function (t) { tyWrap.appendChild(rowFor(t, 'type')); }); }

  /* ---------- Clear preferences ---------- */
  var clearBtn = document.getElementById('nt-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      N.reset();
      announce('Your preferences were cleared.');
      /* Re-sync UI to defaults without a reload. */
      syncMaster();
      var s = N.getState();
      N.CHANNELS.forEach(function (c) { var el = document.getElementById('nt-channel-' + c.id); if (el) { el.checked = !!s.channels[c.id]; } });
      N.TYPES.forEach(function (t) { var el = document.getElementById('nt-type-' + t.id); if (el) { el.checked = !!s.types[t.id]; } });
    });
  }
})();
