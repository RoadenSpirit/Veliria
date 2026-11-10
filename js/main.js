/* ============================================================
   Crónicas del Reino — lógica del hub
   ============================================================ */

const toast = document.getElementById('toast');
let toastTimer = null;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', (e) => {
    // Mientras la página no exista, mostramos aviso
    if (card.hasAttribute('data-pending')) {
      e.preventDefault();
      const section = card.dataset.section || 'Sección';
      showToast(`${section} — próximamente`);
      return;
    }
    // Si la página ya existe (sin data-pending), el navegador
    // sigue el href normalmente.
  });
});