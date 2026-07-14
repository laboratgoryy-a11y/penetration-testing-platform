/**
 * Table Manager - نظام إدارة الجداول التفاعلية
 * يوفر sorting, filtering, و pagination للجداول
 */
class TableManager {
  constructor(tableId, options = {}) {
    this.tableId = tableId;
    this.table = document.getElementById(tableId);
    
    if (!this.table) {
      console.error(`Table with id "${tableId}" not found`);
      return;
    }

    // الخيارات الافتراضية
    this.options = {
      sortable: true,
      filterable: true,
      paginated: true,
      pageSize: 25,
      pageSizes: [25, 50, 100, 200],
      searchable: true,
      ...options
    };

    // البيانات
    this.data = [];
    this.filteredData = [];
    this.currentPage = 1;
    this.pageSize = this.options.pageSize;
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.filters = {};
    this.searchQuery = '';

    // العناصر
    this.thead = null;
    this.tbody = null;
    this.paginationContainer = null;
    this.searchContainer = null;

    this.init();
  }

  /**
   * تهيئة الجدول
   */
  init() {
    this.thead = this.table.querySelector('thead');
    this.tbody = this.table.querySelector('tbody');

    if (!this.thead || !this.tbody) {
      console.error('Table must have thead and tbody elements');
      return;
    }

    // إضافة sorting للأعمدة
    if (this.options.sortable) {
      this.initSorting();
    }

    // إضافة filtering
    if (this.options.filterable) {
      this.initFiltering();
    }

    // إضافة pagination
    if (this.options.paginated) {
      this.initPagination();
    }

    // إضافة search
    if (this.options.searchable) {
      this.initSearch();
    }
  }

  /**
   * تهيئة sorting
   */
  initSorting() {
    const headers = this.thead.querySelectorAll('th[data-sortable="true"]');
    
    headers.forEach(header => {
      header.style.cursor = 'pointer';
      header.classList.add('sortable');
      
      // إضافة أيقونة sorting
      const sortIcon = document.createElement('i');
      sortIcon.className = 'fas fa-sort sort-icon';
      header.appendChild(sortIcon);

      // إضافة حدث النقر
      header.addEventListener('click', () => {
        const column = header.getAttribute('data-column');
        this.sort(column);
      });
    });
  }

  /**
   * تهيئة filtering
   */
  initFiltering() {
    const headers = this.thead.querySelectorAll('th[data-filterable="true"]');
    
    headers.forEach(header => {
      const column = header.getAttribute('data-column');
      const filterType = header.getAttribute('data-filter-type') || 'text';

      // إنشاء حقل filter
      const filterContainer = document.createElement('div');
      filterContainer.className = 'table-filter';

      if (filterType === 'text') {
        filterContainer.innerHTML = `
          <input type="text" 
                 class="filter-input" 
                 placeholder="بحث..." 
                 data-column="${column}">
        `;
      } else if (filterType === 'select') {
        const options = header.getAttribute('data-filter-options');
        filterContainer.innerHTML = `
          <select class="filter-select" data-column="${column}">
            <option value="">الكل</option>
            ${options}
          </select>
        `;
      }

      header.appendChild(filterContainer);

      // إضافة حدث التغيير
      const filterInput = filterContainer.querySelector('.filter-input, .filter-select');
      if (filterInput) {
        filterInput.addEventListener('input', (e) => {
          e.stopPropagation(); // منع تفعيل sorting
          this.filter(column, e.target.value);
        });
      }
    });
  }

  /**
   * تهيئة pagination
   */
  initPagination() {
    // إنشاء حاوية pagination
    this.paginationContainer = document.createElement('div');
    this.paginationContainer.className = 'table-pagination';
    this.table.parentElement.appendChild(this.paginationContainer);

    // إنشاء page size selector
    const pageSizeSelector = document.createElement('div');
    pageSizeSelector.className = 'page-size-selector';
    pageSizeSelector.innerHTML = `
      <label>عدد الصفوف:</label>
      <select class="page-size-select">
        ${this.options.pageSizes.map(size => 
          `<option value="${size}" ${size === this.pageSize ? 'selected' : ''}>${size}</option>`
        ).join('')}
      </select>
    `;

    const select = pageSizeSelector.querySelector('.page-size-select');
    select.addEventListener('change', (e) => {
      this.setPageSize(parseInt(e.target.value));
    });

    this.paginationContainer.appendChild(pageSizeSelector);
  }

  /**
   * تهيئة search
   */
  initSearch() {
    // إنشاء حاوية search
    this.searchContainer = document.createElement('div');
    this.searchContainer.className = 'table-search';
    this.searchContainer.innerHTML = `
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input type="text" 
               class="search-input" 
               placeholder="بحث في الجدول...">
      </div>
    `;

    // إضافة قبل الجدول
    this.table.parentElement.insertBefore(this.searchContainer, this.table);

    // إضافة حدث البحث
    const searchInput = this.searchContainer.querySelector('.search-input');
    searchInput.addEventListener('input', (e) => {
      this.search(e.target.value);
    });
  }

  /**
   * تعيين البيانات
   * @param {Array} data - مصفوفة البيانات
   */
  setData(data) {
    this.data = data;
    this.filteredData = [...data];
    this.currentPage = 1;
    this.render();
  }

  /**
   * ترتيب البيانات
   * @param {string} column - اسم العمود
   */
  sort(column) {
    // تحديد اتجاه الترتيب
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    // ترتيب البيانات
    this.filteredData.sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      // معالجة القيم الفارغة
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // تحويل للنص للمقارنة
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();

      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // تحديث أيقونات الترتيب
    this.updateSortIcons();

    // إعادة العرض
    this.render();
  }

  /**
   * تحديث أيقونات الترتيب
   */
  updateSortIcons() {
    const headers = this.thead.querySelectorAll('th[data-sortable="true"]');
    
    headers.forEach(header => {
      const icon = header.querySelector('.sort-icon');
      const column = header.getAttribute('data-column');

      if (column === this.sortColumn) {
        icon.className = `fas fa-sort-${this.sortDirection === 'asc' ? 'up' : 'down'} sort-icon active`;
      } else {
        icon.className = 'fas fa-sort sort-icon';
      }
    });
  }

  /**
   * تصفية البيانات
   * @param {string} column - اسم العمود
   * @param {string} value - قيمة التصفية
   */
  filter(column, value) {
    // تحديث filters
    if (value) {
      this.filters[column] = value.toLowerCase();
    } else {
      delete this.filters[column];
    }

    // تطبيق التصفية
    this.applyFilters();
  }

  /**
   * البحث في البيانات
   * @param {string} query - نص البحث
   */
  search(query) {
    this.searchQuery = query.toLowerCase();
    this.applyFilters();
  }

  /**
   * تطبيق جميع التصفيات
   */
  applyFilters() {
    this.filteredData = this.data.filter(row => {
      // تطبيق column filters
      for (const [column, filterValue] of Object.entries(this.filters)) {
        const cellValue = String(row[column] || '').toLowerCase();
        if (!cellValue.includes(filterValue)) {
          return false;
        }
      }

      // تطبيق search query
      if (this.searchQuery) {
        const rowText = Object.values(row).join(' ').toLowerCase();
        if (!rowText.includes(this.searchQuery)) {
          return false;
        }
      }

      return true;
    });

    // العودة للصفحة الأولى
    this.currentPage = 1;

    // إعادة العرض
    this.render();
  }

  /**
   * تغيير الصفحة
   * @param {number} page - رقم الصفحة
   */
  goToPage(page) {
    const totalPages = this.getTotalPages();
    
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    this.currentPage = page;
    this.render();
  }

  /**
   * تعيين حجم الصفحة
   * @param {number} size - حجم الصفحة
   */
  setPageSize(size) {
    this.pageSize = size;
    this.currentPage = 1;
    this.render();
  }

  /**
   * الحصول على عدد الصفحات
   * @returns {number}
   */
  getTotalPages() {
    return Math.ceil(this.filteredData.length / this.pageSize);
  }

  /**
   * الحصول على بيانات الصفحة الحالية
   * @returns {Array}
   */
  getCurrentPageData() {
    if (!this.options.paginated) {
      return this.filteredData;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredData.slice(start, end);
  }

  /**
   * عرض الجدول
   */
  render() {
    // مسح tbody
    this.tbody.innerHTML = '';

    // الحصول على البيانات
    const pageData = this.getCurrentPageData();

    // عرض البيانات
    if (pageData.length === 0) {
      this.tbody.innerHTML = `
        <tr>
          <td colspan="100" class="text-center">
            <div class="empty-state">
              <i class="fas fa-inbox fa-3x"></i>
              <p>لا توجد بيانات</p>
            </div>
          </td>
        </tr>
      `;
    } else {
      pageData.forEach(row => {
        const tr = this.createRow(row);
        this.tbody.appendChild(tr);
      });
    }

    // تحديث pagination
    if (this.options.paginated) {
      this.renderPagination();
    }
  }

  /**
   * إنشاء صف
   * @param {Object} row - بيانات الصف
   * @returns {HTMLElement}
   */
  createRow(row) {
    const tr = document.createElement('tr');
    
    // الحصول على الأعمدة من thead
    const headers = this.thead.querySelectorAll('th');
    
    headers.forEach(header => {
      const column = header.getAttribute('data-column');
      if (!column) return;

      const td = document.createElement('td');
      
      // الحصول على القيمة
      let value = row[column];
      
      // تطبيق formatter إذا وجد
      const formatter = header.getAttribute('data-formatter');
      if (formatter && window[formatter]) {
        value = window[formatter](value, row);
      }

      td.innerHTML = value !== null && value !== undefined ? value : '-';
      tr.appendChild(td);
    });

    return tr;
  }

  /**
   * عرض pagination
   */
  renderPagination() {
    const totalPages = this.getTotalPages();
    const totalItems = this.filteredData.length;
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, totalItems);

    // إنشاء pagination controls
    let paginationHTML = `
      <div class="pagination-info">
        عرض ${start} - ${end} من ${totalItems}
      </div>
      <div class="pagination-controls">
        <button class="btn-pagination" ${this.currentPage === 1 ? 'disabled' : ''} 
                onclick="window.tableManagers['${this.tableId}'].goToPage(1)">
          <i class="fas fa-angle-double-right"></i>
        </button>
        <button class="btn-pagination" ${this.currentPage === 1 ? 'disabled' : ''} 
                onclick="window.tableManagers['${this.tableId}'].goToPage(${this.currentPage - 1})">
          <i class="fas fa-angle-right"></i>
        </button>
        <span class="pagination-current">صفحة ${this.currentPage} من ${totalPages}</span>
        <button class="btn-pagination" ${this.currentPage === totalPages ? 'disabled' : ''} 
                onclick="window.tableManagers['${this.tableId}'].goToPage(${this.currentPage + 1})">
          <i class="fas fa-angle-left"></i>
        </button>
        <button class="btn-pagination" ${this.currentPage === totalPages ? 'disabled' : ''} 
                onclick="window.tableManagers['${this.tableId}'].goToPage(${totalPages})">
          <i class="fas fa-angle-double-left"></i>
        </button>
      </div>
    `;

    // تحديث pagination container
    const existingControls = this.paginationContainer.querySelector('.pagination-controls');
    if (existingControls) {
      existingControls.parentElement.remove();
    }

    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination-wrapper';
    paginationDiv.innerHTML = paginationHTML;
    this.paginationContainer.appendChild(paginationDiv);
  }

  /**
   * تحديث البيانات
   * @param {Array} data - البيانات الجديدة
   */
  updateData(data) {
    this.setData(data);
  }

  /**
   * إعادة تعيين التصفيات
   */
  resetFilters() {
    this.filters = {};
    this.searchQuery = '';
    
    // مسح حقول التصفية
    const filterInputs = this.thead.querySelectorAll('.filter-input, .filter-select');
    filterInputs.forEach(input => {
      input.value = '';
    });

    // مسح حقل البحث
    if (this.searchContainer) {
      const searchInput = this.searchContainer.querySelector('.search-input');
      if (searchInput) searchInput.value = '';
    }

    this.applyFilters();
  }

  /**
   * تصدير البيانات
   * @param {string} format - صيغة التصدير (csv, json)
   * @returns {string}
   */
  export(format = 'csv') {
    if (format === 'csv') {
      return this.exportCSV();
    } else if (format === 'json') {
      return this.exportJSON();
    }
  }

  /**
   * تصدير CSV
   * @returns {string}
   */
  exportCSV() {
    const headers = Array.from(this.thead.querySelectorAll('th[data-column]'))
      .map(th => th.textContent.trim());
    
    const rows = this.filteredData.map(row => {
      return Array.from(this.thead.querySelectorAll('th[data-column]'))
        .map(th => {
          const column = th.getAttribute('data-column');
          return row[column] || '';
        });
    });

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }

  /**
   * تصدير JSON
   * @returns {string}
   */
  exportJSON() {
    return JSON.stringify(this.filteredData, null, 2);
  }
}

// تخزين instances للوصول العام
window.tableManagers = window.tableManagers || {};

/**
 * إنشاء جدول تفاعلي
 * @param {string} tableId - معرف الجدول
 * @param {Object} options - الخيارات
 * @returns {TableManager}
 */
window.createInteractiveTable = function(tableId, options = {}) {
  const manager = new TableManager(tableId, options);
  window.tableManagers[tableId] = manager;
  return manager;
};
