(() => {
  const input = document.getElementById('searchInput');
  const note = document.getElementById('resultNote');
  const cards = [...document.querySelectorAll('.searchable')];
  if (!input || !note || !cards.length) return;

  const normalize = (s) => (s || '').toLowerCase().replace(/ё/g, 'е').trim();

  function clearHighlights() {
    document.querySelectorAll('mark.search-hit').forEach(mark => {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });
    document.body.normalize();
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlightTerms(root, terms) {
    const cleanTerms = [...new Set(terms.map(t => t.trim()).filter(Boolean))]
      .sort((a, b) => b.length - a.length);
    if (!cleanTerms.length) return [];

    const regex = new RegExp(`(${cleanTerms.map(escapeRegExp).join('|')})`, 'gi');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'MARK'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const hits = [];

    nodes.forEach(node => {
      const text = node.nodeValue;
      regex.lastIndex = 0;
      if (!regex.test(text)) return;
      regex.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let last = 0;
      text.replace(regex, (match, _group, offset) => {
        frag.appendChild(document.createTextNode(text.slice(last, offset)));
        const mark = document.createElement('mark');
        mark.className = 'search-hit';
        mark.textContent = match;
        frag.appendChild(mark);
        hits.push(mark);
        last = offset + match.length;
        return match;
      });
      frag.appendChild(document.createTextNode(text.slice(last)));
      node.replaceWith(frag);
    });

    return hits;
  }

  function paragraphByNumber(number) {
    return cards.find(card => {
      const heading = card.querySelector('h3');
      if (!heading) return false;
      return new RegExp(`^\\s*§\\s*${escapeRegExp(number)}(?:\\.|\\s|$)`, 'i').test(heading.textContent);
    }) || null;
  }

  function scrollToTarget(target) {
    if (!target) return;
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 20);
  }

  function smartSearch() {
    clearHighlights();
    const raw = input.value.trim();
    const q = normalize(raw);

    if (!q) {
      cards.forEach(card => card.classList.remove('hidden'));
      note.textContent = '';
      return;
    }

    if (/^\d+$/.test(q)) {
      const card = paragraphByNumber(q);
      cards.forEach(item => item.classList.toggle('hidden', item !== card));

      if (!card) {
        note.textContent = `Параграф § ${q} не найден`;
        return;
      }

      const heading = card.querySelector('h3') || card;
      const hits = highlightTerms(heading, [q]);
      note.textContent = `Параграф § ${q}`;
      scrollToTarget(hits[0] || heading);
      return;
    }

    const words = q.split(/\s+/).filter(Boolean);
    const visibleCards = [];

    cards.forEach(card => {
      const text = normalize(card.innerText + ' ' + (card.dataset.search || ''));
      const match = words.every(word => text.includes(word));
      card.classList.toggle('hidden', !match);
      if (match) visibleCards.push(card);
    });

    const hits = [];
    visibleCards.forEach(card => hits.push(...highlightTerms(card, words)));

    if (hits.length) {
      note.textContent = `Совпадений: ${hits.length}`;
      scrollToTarget(hits[0]);
    } else if (visibleCards.length) {
      note.textContent = `Найдено разделов: ${visibleCards.length}`;
      scrollToTarget(visibleCards[0]);
    } else {
      note.textContent = 'Ничего не найдено';
    }
  }

  input.addEventListener('input', smartSearch);

  const style = document.createElement('style');
  style.textContent = `
    mark.search-hit {
      background: #fff1a8;
      color: inherit;
      border-radius: 4px;
      padding: 0 2px;
      box-shadow: 0 0 0 1px rgba(111,74,168,.12);
    }
  `;
  document.head.appendChild(style);
})();
