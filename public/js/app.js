/* Client-side helpers: sidebar, table search/sort, confirms, charts */
(function () {
  'use strict';

  // Sidebar toggle for small screens
  document.addEventListener('click', function (e) {
    const toggle = e.target.closest('[data-sidebar-toggle]');
    if (toggle) {
      const sidebar = document.querySelector('.sidebar');
      const backdrop = document.querySelector('.sidebar-backdrop');
      if (sidebar) sidebar.classList.toggle('show');
      if (backdrop) backdrop.classList.toggle('show');
    }
    const backdrop = e.target.closest('.sidebar-backdrop');
    if (backdrop) {
      document.querySelector('.sidebar').classList.remove('show');
      backdrop.classList.remove('show');
    }
  });

  // Confirm destructive actions
  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.confirm(form.getAttribute('data-confirm'))) {
        e.preventDefault();
      }
    });
  });

  // Client-side table filter
  document.querySelectorAll('[data-table-filter]').forEach(function (input) {
    const table = document.querySelector(input.getAttribute('data-table-filter'));
    if (!table) return;
    input.addEventListener('input', function () {
      const term = input.value.toLowerCase().trim();
      table.querySelectorAll('tbody tr').forEach(function (row) {
        row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
      });
    });
  });

  // Client-side table sorting
  document.querySelectorAll('table[data-sortable]').forEach(function (table) {
    table.querySelectorAll('th.sortable').forEach(function (th, index) {
      th.addEventListener('click', function () {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const isAsc = !th.classList.contains('asc');
        table.querySelectorAll('th.sortable').forEach(function (h) { h.classList.remove('asc', 'desc'); });
        th.classList.add(isAsc ? 'asc' : 'desc');
        const dir = isAsc ? 1 : -1;
        rows.sort(function (a, b) {
          const av = (a.children[index] ? a.children[index].textContent : '').trim();
          const bv = (b.children[index] ? b.children[index].textContent : '').trim();
          const an = parseFloat(av.replace(/[^0-9.\-]/g, ''));
          const bn = parseFloat(bv.replace(/[^0-9.\-]/g, ''));
          if (!isNaN(an) && !isNaN(bn) && av.match(/^[0-9.,%\- ]+$/) && bv.match(/^[0-9.,%\- ]+$/)) {
            return (an - bn) * dir;
          }
          return av.localeCompare(bv, undefined, { numeric: true }) * dir;
        });
        rows.forEach(function (r) { tbody.appendChild(r); });
      });
    });
  });

  // Auto-dismiss flash alerts
  document.querySelectorAll('.alert[data-autodismiss]').forEach(function (alert) {
    setTimeout(function () {
      if (window.bootstrap && bootstrap.Alert) {
        bootstrap.Alert.getOrCreateInstance(alert).close();
      }
    }, 6000);
  });

  // CSV export helper for buttons that build from a table
  document.querySelectorAll('[data-export-table]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const table = document.querySelector(btn.getAttribute('data-export-table'));
      if (!table) return;
      const rows = [];
      table.querySelectorAll('tr').forEach(function (tr) {
        const cells = [];
        tr.querySelectorAll('th,td').forEach(function (cell) {
          let text = cell.innerText.replace(/\s+/g, ' ').trim();
          text = '"' + text.replace(/"/g, '""') + '"';
          cells.push(text);
        });
        rows.push(cells.join(','));
      });
      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = (btn.getAttribute('data-filename') || 'export') + '.csv';
      link.click();
    });
  });

  window.printSection = function () {
    window.print();
  };
})();
