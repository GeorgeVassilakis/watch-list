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
  
function parseMovies(text) {
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    return lines.reduce((movies, line) => {
      const match = line.match(/^- \[(x| )\] (.+)$/i);
      if (!match) return movies;

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

      movies.push({
        title,
        rating,
        watched
      });
      return movies;
    }, []);
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
        rating.className = movie.rating >= 9 ? 'rating high' : 'rating';
        rating.textContent = `${movie.rating}/10`;
        li.appendChild(rating);
      }
      
      ul.appendChild(li);
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
    const movies = await loadMovies();
    
    // Render all views
    // Show most recent first (bottom of the file at the top)
    const recentFirst = [...movies].reverse();
    renderMovieList(recentFirst, 'all-movies');
    
    const watched = movies.filter(m => m.watched && m.rating !== null);
    const rankedMovies = [...watched].sort((a, b) => b.rating - a.rating);
    renderMovieList(rankedMovies, 'ranked-movies');
    
    const unwatched = movies.filter(m => !m.watched);
    renderMovieList(unwatched, 'watchlist-movies');
    
    renderStats(movies);
    
    setupTabs();
  }
  
  // Run when page loads
  document.addEventListener('DOMContentLoaded', init);
