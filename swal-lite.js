// Minimal local replacement for the SweetAlert2 dialog used by this game
// (only the options the game uses). Resolves true on confirm, false on cancel.
function swal(opts) {
  return new Promise(function (resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'swal-lite-overlay';
    var box = document.createElement('div');
    box.className = 'swal-lite-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    var icon = document.createElement('div');
    icon.className = 'swal-lite-icon swal-lite-' + (opts.type || 'success');
    icon.textContent = opts.type === 'warning' ? '!' : '✓';
    var title = document.createElement('h2');
    title.textContent = opts.title || '';
    var text = document.createElement('p');
    text.textContent = opts.text || '';
    var buttons = document.createElement('div');
    buttons.className = 'swal-lite-buttons';
    function close(result) {
      overlay.remove();
      resolve(result);
    }
    function addButton(label, color, result) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.background = color;
      b.addEventListener('click', function () { close(result); });
      buttons.appendChild(b);
      return b;
    }
    var ok = addButton(opts.confirmButtonText || 'OK', opts.confirmButtonColor || '#3085d6', true);
    if (opts.showCancelButton) addButton(opts.cancelButtonText || 'Cancel', opts.cancelButtonColor || '#aaa', false);
    box.appendChild(icon);
    box.appendChild(title);
    box.appendChild(text);
    box.appendChild(buttons);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    ok.focus();
  });
}
