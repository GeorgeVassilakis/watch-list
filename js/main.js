// Parse the movies from the text file
async function loadMovies() {
    try {
      const response = await fetch('data/movies.txt');
      const text = await response.text();
      return parseMovies(text);
    } catch (error) {
      console.error('Error loading movies:', error);
      return [];
    }
  }
  
  // Load raw text for advanced parsing (sections)
  async function loadText(path = 'data/movies.txt') {
    try {
      const response = await fetch(path);
      return await response.text();
    } catch (error) {
      console.error('Error loading data:', error);
      return '';
    }
  }
  
function parseMovieFromLine(line) {
    const match = line.match(/^- \[(x| )\] (.+)$/i);
    if (!match) return null;

    const watched = match[1].toLowerCase() === 'x';
    let title = match[2].trim();
    let rating = null;

    const ratingMatch = title.match(/(?:\s*[-\u2013\u2014:])?\s*(\d+(?:\.\d+)?)\/10$/);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]);
      title = title
        .replace(/(?:\s*[-\u2013\u2014:])?\s*(\d+(?:\.\d+)?)\/10$/, '')
        .trim();
    } else {
      title = title.replace(/\s*[-\u2013\u2014:]\s*$/, '').trim();
    }

    return { title, rating, watched };
  }

function parseBookFromLine(line) {
    const match = line.match(/^- \[(x| )\] (.+)$/i);
    if (!match) return null;

    const read = match[1].toLowerCase() === 'x';
    const parts = match[2]
      .split('|')
      .map(part => part.trim())
      .filter(Boolean);

    let rating = null;
    const lastPart = parts[parts.length - 1];
    const ratingMatch = lastPart && lastPart.match(/^(\d+(?:\.\d+)?)\/10$/);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]);
      parts.pop();
    }

    const title = parts[0] || '';
    const author = parts[1] || '';
    const year = parts[2] || '';
    const filePart = parts.find(part => /^file:/i.test(part));
    const cover = filePart ? filePart.replace(/^file:\s*/i, '').trim() : '';

    return {
      title,
      author,
      year,
      cover,
      rating,
      read
    };
  }
  
function parseMovies(text) {
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    return lines.reduce((movies, line) => {
      const movie = parseMovieFromLine(line);
      if (movie) movies.push(movie);
      return movies;
    }, []);
  }

function parseBooks(text) {
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    return lines.reduce((books, line) => {
      const book = parseBookFromLine(line);
      if (book) books.push(book);
      return books;
    }, []);
  }
  
  // Sections separated by year markers like: "## 2025"
  function parseSections(text) {
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    const sections = [];
    let current = { year: null, items: [] };

    const pushCurrent = () => {
      if (current.items.length > 0 || current.year !== null) sections.push(current);
    };

    for (const line of lines) {
      const yearMatch = line.match(/^##\s*(\d{4})\s*$/);
      if (yearMatch) {
        pushCurrent();
        current = { year: yearMatch[1], items: [] };
        continue;
      }
      const movie = parseMovieFromLine(line);
      if (movie) current.items.push(movie);
    }

    pushCurrent();
    return sections;
  }

  function parseBookSections(text) {
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    const sections = [];
    let current = { year: null, items: [] };

    const pushCurrent = () => {
      if (current.items.length > 0 || current.year !== null) sections.push(current);
    };

    for (const line of lines) {
      const yearMatch = line.match(/^##\s*(\d{4})\s*$/);
      if (yearMatch) {
        pushCurrent();
        current = { year: yearMatch[1], items: [] };
        continue;
      }
      const book = parseBookFromLine(line);
      if (book) current.items.push(book);
    }

    pushCurrent();
    return sections;
  }
  
  // Render movie list
  function renderMovieList(movies, containerId) {
    const container = document.getElementById(containerId);
    const ul = document.createElement('ul');
    ul.className = 'movie-list';
    
    movies.forEach(movie => {
      const li = document.createElement('li');
      li.className = 'movie-item';
      
      const checkbox = document.createElement('div');
      checkbox.className = movie.watched ? 'checkbox watched' : 'checkbox';
      
      const title = document.createElement('span');
      title.className = 'movie-title';
      title.textContent = movie.title;
      
      li.appendChild(checkbox);
      li.appendChild(title);
      
      if (movie.watched && movie.rating !== null) {
        const rating = document.createElement('span');
        rating.className = `rating ${ratingClass(movie.rating)}`;
        rating.textContent = `${formatRating(movie.rating)}/10`;
        li.appendChild(rating);
      }
      
      ul.appendChild(li);
    });
    
    container.innerHTML = '';
    container.appendChild(ul);
  }

  function renderBookList(books, containerId) {
    const container = document.getElementById(containerId);
    const ul = document.createElement('ul');
    ul.className = 'book-list';

    books.forEach(book => {
      const li = document.createElement('li');
      li.className = 'book-item';

      const cover = document.createElement('img');
      cover.className = 'book-cover';
      if (book.cover) {
        cover.src = `data/covers/${book.cover}`;
      }
      cover.alt = book.title ? `${book.title} cover` : 'Book cover';
      cover.loading = 'lazy';
      cover.decoding = 'async';

      const info = document.createElement('div');
      info.className = 'book-info';

      const title = document.createElement('div');
      title.className = 'book-title';
      title.textContent = book.title;
      info.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'book-meta';
      const metaParts = [book.author, book.year].filter(Boolean);
      meta.textContent = metaParts.join(' / ');
      if (metaParts.length > 0) info.appendChild(meta);

      li.appendChild(cover);
      li.appendChild(info);

      if (book.rating !== null) {
        const rating = document.createElement('span');
        rating.className = `rating ${ratingClass(book.rating)}`;
        rating.textContent = `${formatRating(book.rating)}/10`;
        li.appendChild(rating);
      }

      ul.appendChild(li);
    });

    container.innerHTML = '';
    container.appendChild(ul);
  }
  
  // Render sections with dividers; newest sections/items first.
  // Inserts a top "CURRENT" marker, then after each year's items
  // inserts a divider with that year to mark the boundary.
  function renderAllSections(sections, containerId, includeCurrent = true) {
    const container = document.getElementById(containerId);
    const ul = document.createElement('ul');
    ul.className = 'movie-list';

    const groups = [...sections].reverse();

    const appendMovie = (movie) => {
      const li = document.createElement('li');
      li.className = 'movie-item';
      const checkbox = document.createElement('div');
      checkbox.className = movie.watched ? 'checkbox watched' : 'checkbox';
      const title = document.createElement('span');
      title.className = 'movie-title';
      title.textContent = movie.title;
      li.appendChild(checkbox);
      li.appendChild(title);
      if (movie.watched && movie.rating !== null) {
        const rating = document.createElement('span');
        rating.className = `rating ${ratingClass(movie.rating)}`;
        rating.textContent = `${formatRating(movie.rating)}/10`;
        li.appendChild(rating);
      }
      ul.appendChild(li);
    };

    // Add top "CURRENT" marker to indicate up-to-date boundary
    if (includeCurrent) {
      const currentMarker = document.createElement('li');
      currentMarker.className = 'year-divider current';
      currentMarker.innerHTML = `
        <span class="line"></span>
        <span class="label">CURRENT</span>
        <span class="line"></span>
      `;
      ul.appendChild(currentMarker);
    }

    groups.forEach((section, idx) => {
      // reverse items so bottom-of-file entries are first
      [...section.items].reverse().forEach(appendMovie);

      // Insert boundary label for this section after its items
      if (section.year) {
        const divider = document.createElement('li');
        divider.className = 'year-divider';
        divider.innerHTML = `
          <span class="line"></span>
          <span class="label">${section.year}</span>
          <span class="line"></span>
        `;
        ul.appendChild(divider);
      }
    });

    container.innerHTML = '';
    container.appendChild(ul);
  }

  function renderBookSections(sections, containerId, includeCurrent = true) {
    const container = document.getElementById(containerId);
    const ul = document.createElement('ul');
    ul.className = 'book-list';

    const groups = [...sections].reverse();

    const appendBook = (book) => {
      const li = document.createElement('li');
      li.className = 'book-item';

      const cover = document.createElement('img');
      cover.className = 'book-cover';
      if (book.cover) {
        cover.src = `data/covers/${book.cover}`;
      }
      cover.alt = book.title ? `${book.title} cover` : 'Book cover';
      cover.loading = 'lazy';
      cover.decoding = 'async';

      const info = document.createElement('div');
      info.className = 'book-info';

      const title = document.createElement('div');
      title.className = 'book-title';
      title.textContent = book.title;
      info.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'book-meta';
      const metaParts = [book.author, book.year].filter(Boolean);
      meta.textContent = metaParts.join(' / ');
      if (metaParts.length > 0) info.appendChild(meta);

      li.appendChild(cover);
      li.appendChild(info);

      if (book.rating !== null) {
        const rating = document.createElement('span');
        rating.className = `rating ${ratingClass(book.rating)}`;
        rating.textContent = `${formatRating(book.rating)}/10`;
        li.appendChild(rating);
      }

      ul.appendChild(li);
    };

    if (includeCurrent) {
      const currentMarker = document.createElement('li');
      currentMarker.className = 'year-divider current';
      currentMarker.innerHTML = `
        <span class="line"></span>
        <span class="label">CURRENT</span>
        <span class="line"></span>
      `;
      ul.appendChild(currentMarker);
    }

    groups.forEach((section) => {
      [...section.items].reverse().forEach(appendBook);

      if (section.year) {
        const divider = document.createElement('li');
        divider.className = 'year-divider';
        divider.innerHTML = `
          <span class="line"></span>
          <span class="label">${section.year}</span>
          <span class="line"></span>
        `;
        ul.appendChild(divider);
      }
    });

    container.innerHTML = '';
    container.appendChild(ul);
  }
  
  // Calculate and render statistics
  function renderStats(movies) {
    const watched = movies.filter(m => m.watched);
    const unwatched = movies.filter(m => !m.watched);
    const rated = watched.filter(m => m.rating !== null);
    
    const avgRating = rated.length > 0
      ? (rated.reduce((sum, m) => sum + m.rating, 0) / rated.length).toFixed(1)
      : 0;
    
    // Update stat cards
    document.getElementById('total-watched').textContent = watched.length;
    document.getElementById('total-unwatched').textContent = unwatched.length;
    document.getElementById('avg-rating').textContent = avgRating;
    
    // Top 10 movies
    const topMovies = [...rated]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);
    
    renderMovieList(topMovies, 'top-10-list');
    
    // Rating distribution
    renderDistribution(rated);
  }

  function renderBookStats(books) {
    const rated = books.filter(b => b.rating !== null);
    const unrated = books.filter(b => b.rating === null);

    const avgRating = rated.length > 0
      ? (rated.reduce((sum, b) => sum + b.rating, 0) / rated.length).toFixed(1)
      : 0;

    document.getElementById('books-total-read').textContent = rated.length;
    document.getElementById('books-total-unread').textContent = unrated.length;
    document.getElementById('books-avg-rating').textContent = avgRating;

    const topBooks = [...rated]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    renderBookList(topBooks, 'books-top-10-list');

    renderDistribution(rated, 'books-distribution-chart');
  }

  function renderDistribution(movies, containerId = 'distribution-chart') {
    const distribution = {
      '9.0+': 0,
      '8.0-8.9': 0,
      '7.0-7.9': 0,
      '6.0-6.9': 0,
      '<6.0': 0
    };
    
    movies.forEach(movie => {
      if (movie.rating >= 9) distribution['9.0+']++;
      else if (movie.rating >= 8) distribution['8.0-8.9']++;
      else if (movie.rating >= 7) distribution['7.0-7.9']++;
      else if (movie.rating >= 6) distribution['6.0-6.9']++;
      else distribution['<6.0']++;
    });
    
    const container = document.getElementById(containerId);
    if (!container) return;
    const maxCount = Math.max(...Object.values(distribution));
    
    let html = '';
    for (const [range, count] of Object.entries(distribution)) {
      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
      html += `
        <div class="chart-bar">
          <div class="bar-label">${range}</div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${percentage}%">
              <span class="bar-count">${count}</span>
            </div>
          </div>
        </div>
      `;
    }
    
    container.innerHTML = html;
  }
  
  // Map numeric rating to a color band class
  function ratingClass(value) {
    if (value == null) return '';
    if (value >= 9.7) return 'rating-10';
    if (value >= 9.0) return 'rating-9';
    if (value >= 8.0) return 'rating-8';
    if (value >= 7.0) return 'rating-7';
    if (value >= 6.0) return 'rating-6';
    return 'rating-lt6';
  }

  function formatRating(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return '';
    return n.toFixed(1);
  }
  
  // Tab switching
  function setupTabs(scope) {
    if (!scope) return;
    const tabButtons = scope.querySelectorAll('.tab-button');
    const tabContents = scope.querySelectorAll('.tab-content');
    if (tabButtons.length === 0) return;
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        const target = scope.querySelector(`#${targetTab}`);
        if (target) target.classList.add('active');
      });
    });
  }

  function setupModeToggle() {
    const moviesView = document.getElementById('movies-view');
    const booksView = document.getElementById('books-view');
    const buttons = document.querySelectorAll('.mode-button');
    if (!moviesView || !booksView || buttons.length === 0) return;

    const setMode = (mode) => {
      const isBooks = mode === 'books';
      document.body.classList.toggle('books-mode', isBooks);
      moviesView.hidden = isBooks;
      booksView.hidden = !isBooks;
      buttons.forEach(button => {
        const isActive = button.dataset.mode === mode;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    };

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        setMode(button.dataset.mode);
      });
    });

    setMode('movies');
  }
  
  // Initialize app
  async function init() {
    // Theme first so initial paint uses correct palette
    setupThemeToggle();
    setupModeToggle();

    const text = await loadText();
    const movies = parseMovies(text);
    const sections = parseSections(text);
    
    // Render All with year dividers, newest first
    renderAllSections(sections, 'all-movies', true);
    
    const watched = movies.filter(m => m.watched && m.rating !== null);
    const rankedMovies = [...watched].sort((a, b) => b.rating - a.rating);
    renderMovieList(rankedMovies, 'ranked-movies');
    
    const watchlistSections = sections
      .map(s => ({ year: s.year, items: s.items.filter(m => !m.watched) }))
      .filter(s => s.items.length > 0);
    renderAllSections(watchlistSections, 'watchlist-movies', true);
    
    renderStats(movies);

    const booksText = await loadText('data/books.txt');
    const books = parseBooks(booksText);
    const bookSections = parseBookSections(booksText);

    renderBookSections(bookSections, 'all-books', true);

    const rankedBooks = [...books]
      .filter(book => book.rating !== null)
      .sort((a, b) => b.rating - a.rating);
    renderBookList(rankedBooks, 'ranked-books');

    const toReadSections = bookSections
      .map(section => ({
        year: section.year,
        items: section.items.filter(book => book.rating === null)
      }))
      .filter(section => section.items.length > 0);
    renderBookSections(toReadSections, 'watchlist-books', true);

    renderBookStats(books);
    
    setupTabs(document.getElementById('movies-view'));
    setupTabs(document.getElementById('books-view'));
  }
  
  // Run when page loads
  document.addEventListener('DOMContentLoaded', init);

  // --- Theme toggle ---
  function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    const stored = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored ? stored : (systemPrefersDark ? 'dark' : 'light');
    applyTheme(initial);
    updateToggleIcon(btn, initial);

    btn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      const theme = isDark ? 'dark' : 'light';
      localStorage.setItem('theme', theme);
      updateToggleIcon(btn, theme);
    });

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const storedNow = localStorage.getItem('theme');
        if (storedNow) return; // respect explicit choice
        const theme = e.matches ? 'dark' : 'light';
        applyTheme(theme);
        updateToggleIcon(btn, theme);
      });
    }
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function updateToggleIcon(button, theme) {
    // ☀ for light, ☾ for dark target
    button.textContent = theme === 'dark' ? '☀' : '☾';
  }
