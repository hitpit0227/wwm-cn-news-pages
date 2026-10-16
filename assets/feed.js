// Keep an idle site's recent list current without a server job or network request.
(() => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date()).map(p => [p.type, p.value]));
  const cutoff = new Date(Date.UTC(+parts.year, +parts.month - 3, 1));
  const lastDay = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate();
  cutoff.setUTCDate(Math.min(+parts.day, lastDay));
  const stamp = cutoff.toISOString().slice(0, 10);
  let count = 0;
  document.querySelectorAll('#feed-cards [data-published]').forEach(card => {
    card.hidden = !!card.dataset.published && card.dataset.published < stamp;
    if (!card.hidden) count++;
  });
  document.getElementById('feed-count').textContent = `${count}건`;
  document.getElementById('feed-empty').hidden = count > 0;
})();
