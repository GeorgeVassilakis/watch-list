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
  async function loadText() {
    try {
      const response = await fetch('data/movies.txt');
      return await response.text();
    } catch (error) {
      console.error('Error loading movies:', error);
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
  
  function renderDistribution(movies) {
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
    
    const container = document.getElementById('distribution-chart');
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
  function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
      });
    });
  }
  
  // Initialize app
  async function init() {
    // Theme first so initial paint uses correct palette
    setupThemeToggle();

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
    
    setupTabs();
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
