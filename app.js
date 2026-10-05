// ==========================================================================
// PROVISION — Culinary Engine & Kitchen Companion
// Client-side Application Logic
// ==========================================================================

(function() {
  'use strict';

  // --- State ---
  const state = {
    recipes: [],
    notebook: [],
    fastfood: [],
    activeTab: 'recipes',
    searchQuery: '',
    categoryFilter: 'all',
    selectedTags: new Set(),
    sortBy: 'default',
    favorites: new Set(),
    userNotes: {},
    activeRecipe: null,
    servingMultiplier: 1,
    wakeLockSentinel: null
  };

  // --- DOM Elements ---
  const el = {
    // Navigation
    navTabs: document.querySelectorAll('.nav-tab-btn'),
    navToggle: document.getElementById('navToggle'),
    mobileNavList: document.getElementById('mobileNavList'),
    recipesTabCount: document.getElementById('recipesTabCount'),
    favsTabCount: document.getElementById('favsTabCount'),
    rouletteNavBtn: document.getElementById('rouletteNavBtn'),
    heroRouletteBtn: document.getElementById('heroRouletteBtn'),

    // Views
    views: {
      recipes: document.getElementById('recipesView'),
      notebook: document.getElementById('notebookView'),
      fastfood: document.getElementById('fastfoodView'),
      favorites: document.getElementById('favoritesView')
    },

    // Search & Filter
    searchInput: document.getElementById('searchInput'),
    searchClearBtn: document.getElementById('searchClearBtn'),
    sortSelect: document.getElementById('sortSelect'),
    categoryPills: document.querySelectorAll('.cat-pill'),
    tagPillsContainer: document.getElementById('tagPillsContainer'),
    resultsCount: document.getElementById('resultsCount'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),

    // Grids
    recipesGrid: document.getElementById('recipesGrid'),
    favoritesGrid: document.getElementById('favoritesGrid'),
    notebookGrid: document.getElementById('notebookGrid'),
    fastfoodGrid: document.getElementById('fastfoodGrid'),

    // Cook Modal
    cookModal: document.getElementById('cookModal'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalAuthorBadge: document.getElementById('modalAuthorBadge'),
    modalTitle: document.getElementById('modalTitle'),
    modalMacrosRow: document.getElementById('modalMacrosRow'),
    modalReelBtn: document.getElementById('modalReelBtn'),
    modalFavBtn: document.getElementById('modalFavBtn'),
    modalWakeBtn: document.getElementById('modalWakeBtn'),
    scalerBtns: document.querySelectorAll('.scaler-btn'),
    ingredientsChecklist: document.getElementById('ingredientsChecklist'),
    copyIngredientsBtn: document.getElementById('copyIngredientsBtn'),
    instructionsList: document.getElementById('instructionsList'),
    chefNotesBox: document.getElementById('chefNotesBox'),
    chefNotesText: document.getElementById('chefNotesText'),
    userTweaksTextarea: document.getElementById('userTweaksTextarea'),
    userTweaksStatus: document.getElementById('userTweaksStatus'),

    // Roulette Modal
    rouletteModal: document.getElementById('rouletteModal'),
    rouletteCloseBtn: document.getElementById('rouletteCloseBtn'),
    rouletteDishTitle: document.getElementById('rouletteDishTitle'),
    rouletteMacros: document.getElementById('rouletteMacros'),
    rouletteSnippet: document.getElementById('rouletteSnippet'),
    rouletteRerollBtn: document.getElementById('rouletteRerollBtn'),
    rouletteCookBtn: document.getElementById('rouletteCookBtn'),

    // Coffee Calculator
    coffeeCupsInput: document.getElementById('coffeeCupsInput'),
    coffeeWaterInput: document.getElementById('coffeeWaterInput'),
    coffeeBeansGrams: document.getElementById('coffeeBeansGrams'),
    coffeeBeansTbsp: document.getElementById('coffeeBeansTbsp')
  };

  // --- Initializer ---
  function init() {
    loadDatabase();
    loadStoredUserData();
    setupNavigation();
    setupFilters();
    setupModals();
    setupCoffeeCalculator();
    renderAllViews();
  }

  // --- Load Data ---
  function loadDatabase() {
    if (window.PROVISION_DATA) {
      state.recipes = window.PROVISION_DATA.recipes || [];
      state.notebook = window.PROVISION_DATA.notebook || [];
      state.fastfood = window.PROVISION_DATA.fastfood || [];
    }
    if (el.recipesTabCount) el.recipesTabCount.textContent = state.recipes.length;
  }

  function loadStoredUserData() {
    try {
      const favs = localStorage.getItem('provision_favorites');
      if (favs) {
        state.favorites = new Set(JSON.parse(favs));
      }
      const notes = localStorage.getItem('provision_user_notes');
      if (notes) {
        state.userNotes = JSON.parse(notes);
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    updateFavoritesBadge();
  }

  function updateFavoritesBadge() {
    if (el.favsTabCount) el.favsTabCount.textContent = state.favorites.size;
  }

  function saveFavorites() {
    try {
      localStorage.setItem('provision_favorites', JSON.stringify(Array.from(state.favorites)));
    } catch (e) {
      console.warn(e);
    }
    updateFavoritesBadge();
  }

  function saveUserNote(recipeId, text) {
    state.userNotes[recipeId] = text;
    try {
      localStorage.setItem('provision_user_notes', JSON.stringify(state.userNotes));
    } catch (e) {
      console.warn(e);
    }
  }

  // --- Navigation & Tabs ---
  function setupNavigation() {
    el.navTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
        if (el.mobileNavList) el.mobileNavList.classList.remove('mobile-open');
      });
    });

    if (el.navToggle) {
      el.navToggle.addEventListener('click', () => {
        el.mobileNavList.classList.toggle('mobile-open');
      });
    }

    if (el.rouletteNavBtn) el.rouletteNavBtn.addEventListener('click', openRouletteModal);
    if (el.heroRouletteBtn) el.heroRouletteBtn.addEventListener('click', openRouletteModal);
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    el.navTabs.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    Object.keys(el.views).forEach(key => {
      if (el.views[key]) {
        el.views[key].classList.toggle('active', key === tabName);
      }
    });

    if (tabName === 'favorites') {
      renderFavoritesView();
    } else if (tabName === 'recipes') {
      renderRecipesView();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Search & Filters ---
  function setupFilters() {
    // Search input
    let debounceTimer;
    el.searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      state.searchQuery = e.target.value.trim().toLowerCase();
      el.searchClearBtn.style.display = state.searchQuery ? 'block' : 'none';
      debounceTimer = setTimeout(() => {
        renderRecipesView();
      }, 120);
    });

    el.searchClearBtn.addEventListener('click', () => {
      el.searchInput.value = '';
      state.searchQuery = '';
      el.searchClearBtn.style.display = 'none';
      renderRecipesView();
      el.searchInput.focus();
    });

    // Category pills
    el.categoryPills.forEach(pill => {
      pill.addEventListener('click', () => {
        el.categoryPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.categoryFilter = pill.dataset.category;
        renderRecipesView();
      });
    });

    // Sort select
    el.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderRecipesView();
    });

    // Reset filters button
    el.resetFiltersBtn.addEventListener('click', resetAllFilters);

    // Build popular tag pills
    renderTagFilters();
  }

  function renderTagFilters() {
    const popularTags = [
      'High Protein',
      'Quick (<20m)',
      'Cottage Cheese',
      'Chicken',
      'Air Fryer',
      'Healthified Comfort',
      'Meal Prep',
      'One Pan / Low Cleanup',
      'Beef',
      'Low Carb',
      'Provision Original'
    ];

    el.tagPillsContainer.innerHTML = '';
    popularTags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'tag-filter-btn' + (state.selectedTags.has(tag) ? ' active' : '');
      btn.innerHTML = `${tag}`;
      btn.addEventListener('click', () => {
        if (state.selectedTags.has(tag)) {
          state.selectedTags.delete(tag);
          btn.classList.remove('active');
        } else {
          state.selectedTags.add(tag);
          btn.classList.add('active');
        }
        renderRecipesView();
      });
      el.tagPillsContainer.appendChild(btn);
    });
  }

  function resetAllFilters() {
    state.searchQuery = '';
    state.categoryFilter = 'all';
    state.selectedTags.clear();
    state.sortBy = 'default';

    el.searchInput.value = '';
    el.searchClearBtn.style.display = 'none';
    el.sortSelect.value = 'default';
    el.categoryPills.forEach(p => p.classList.toggle('active', p.dataset.category === 'all'));
    document.querySelectorAll('.tag-filter-btn').forEach(btn => btn.classList.remove('active'));

    renderRecipesView();
  }

  // --- Filtering & Sorting Core Logic ---
  function getFilteredRecipes(recipesSource) {
    return recipesSource.filter(recipe => {
      // Category filter
      if (state.categoryFilter !== 'all') {
        if (state.categoryFilter === 'dinner' && (recipe.category === 'dinner' || recipe.category === 'lunch')) {
          // match
        } else if (recipe.category !== state.categoryFilter) {
          return false;
        }
      }

      // Tags filter (must match all selected tags)
      if (state.selectedTags.size > 0) {
        const recipeTags = new Set(recipe.tags || []);
        for (let tag of state.selectedTags) {
          if (!recipeTags.has(tag)) return false;
        }
      }

      // Search query (matches title, author, ingredients, notes, tags)
      if (state.searchQuery) {
        const q = state.searchQuery;
        const inTitle = recipe.title.toLowerCase().includes(q);
        const inAuthor = (recipe.author || '').toLowerCase().includes(q);
        const inNotes = (recipe.notes || '').toLowerCase().includes(q);
        const inTags = (recipe.tags || []).some(t => t.toLowerCase().includes(q));
        const inIng = (recipe.ingredients || []).some(i => i.toLowerCase().includes(q));
        if (!inTitle && !inAuthor && !inNotes && !inTags && !inIng) return false;
      }

      return true;
    });
  }

  function sortRecipesList(list) {
    const sorted = [...list];
    switch (state.sortBy) {
      case 'protein':
        return sorted.sort((a, b) => (b.macros?.protein || 0) - (a.macros?.protein || 0));
      case 'calories':
        return sorted.sort((a, b) => {
          const calA = a.macros?.calories || 9999;
          const calB = b.macros?.calories || 9999;
          return calA - calB;
        });
      case 'alpha':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'random':
        return sorted.sort(() => Math.random() - 0.5);
      default:
        // Default: Provision Originals first, then high protein, then standard
        return sorted.sort((a, b) => {
          if (a.isProvisionOriginal && !b.isProvisionOriginal) return -1;
          if (!a.isProvisionOriginal && b.isProvisionOriginal) return 1;
          return (b.macros?.protein || 0) - (a.macros?.protein || 0);
        });
    }
  }

  // --- Rendering Recipes View ---
  function renderRecipesView() {
    const filtered = getFilteredRecipes(state.recipes);
    const sorted = sortRecipesList(filtered);

    // Update results meta
    const totalCount = state.recipes.length;
    const isFiltered = state.searchQuery || state.categoryFilter !== 'all' || state.selectedTags.size > 0 || state.sortBy !== 'default';
    el.resultsCount.innerHTML = `Showing <strong>${sorted.length}</strong> of ${totalCount} recipes`;
    el.resetFiltersBtn.style.display = isFiltered ? 'inline-block' : 'none';

    if (sorted.length === 0) {
      el.recipesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h3 class="empty-state-title">No Recipes Match Your Filters</h3>
          <p class="empty-state-desc">Try clearing your search term or unchecking some tag filters to expand results.</p>
          <button class="btn-gold" id="emptyResetBtn">Reset All Filters</button>
        </div>
      `;
      document.getElementById('emptyResetBtn')?.addEventListener('click', resetAllFilters);
      return;
    }

    el.recipesGrid.innerHTML = '';
    sorted.forEach(recipe => {
      el.recipesGrid.appendChild(createRecipeCard(recipe));
    });
  }

  // --- Rendering Favorites View ---
  function renderFavoritesView() {
    const favRecipes = state.recipes.filter(r => state.favorites.has(r.id));
    if (favRecipes.length === 0) {
      el.favoritesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </div>
          <h3 class="empty-state-title">No Saved Favorites Yet</h3>
          <p class="empty-state-desc">Click the heart icon on any recipe card to save it here for fast meal-planning and easy access this week.</p>
          <button class="btn-gold" id="goToRecipesBtn">Explore Recipes</button>
        </div>
      `;
      document.getElementById('goToRecipesBtn')?.addEventListener('click', () => switchTab('recipes'));
      return;
    }

    el.favoritesGrid.innerHTML = '';
    favRecipes.forEach(recipe => {
      el.favoritesGrid.appendChild(createRecipeCard(recipe));
    });
  }

  // --- Recipe Card Component ---
  function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.dataset.id = recipe.id;

    const isFav = state.favorites.has(recipe.id);
    const authorText = recipe.author ? (recipe.author.startsWith('@') ? recipe.author : recipe.author) : 'Instagram';
    const ingSnippet = (recipe.ingredients || []).slice(0, 3).join(' · ');

    let macrosHtml = '';
    if (recipe.macros?.protein) {
      macrosHtml += `<span class="macro-pill macro-protein">${recipe.macros.protein}g Protein</span>`;
    }
    if (recipe.macros?.calories) {
      macrosHtml += `<span class="macro-pill macro-cal">${recipe.macros.calories} Cal</span>`;
    }

    const tagsHtml = (recipe.tags || []).slice(0, 3).map(t => `<span class="card-tag-pill">${t}</span>`).join('');

    card.innerHTML = `
      <div>
        <div class="card-top-row">
          <span class="card-source-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
            ${escapeHtml(authorText)}
          </span>
          <button class="card-fav-btn ${isFav ? 'favorited' : ''}" title="${isFav ? 'Remove from favorites' : 'Save to favorites'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>
        <h3 class="card-title">${escapeHtml(recipe.title)}</h3>
        ${macrosHtml ? `<div class="card-macros">${macrosHtml}</div>` : ''}
        ${ingSnippet ? `<p class="card-ingredients-snippet">${escapeHtml(ingSnippet)}...</p>` : ''}
      </div>
      <div>
        ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
        <div class="card-footer">
          <span class="card-view-btn">
            View Recipe
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </span>
        </div>
      </div>
    `;

    // Click handler for modal
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-fav-btn')) return;
      openCookModal(recipe);
    });

    // Favorite button
    const favBtn = card.querySelector('.card-fav-btn');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(recipe.id, favBtn);
    });

    return card;
  }

  function toggleFavorite(recipeId, btnEl) {
    if (state.favorites.has(recipeId)) {
      state.favorites.delete(recipeId);
      if (btnEl) {
        btnEl.classList.remove('favorited');
        btnEl.querySelector('svg').setAttribute('fill', 'none');
      }
    } else {
      state.favorites.add(recipeId);
      if (btnEl) {
        btnEl.classList.add('favorited');
        btnEl.querySelector('svg').setAttribute('fill', 'currentColor');
      }
    }
    saveFavorites();
    if (state.activeTab === 'favorites') {
      renderFavoritesView();
    }
  }

  // --- Cook Modal (Interactive Mode) ---
  function setupModals() {
    el.modalCloseBtn.addEventListener('click', closeCookModal);
    el.cookModal.addEventListener('click', (e) => {
      if (e.target === el.cookModal) closeCookModal();
    });

    // ESC key listener
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCookModal();
        closeRouletteModal();
      }
    });

    // Copy ingredients button
    el.copyIngredientsBtn.addEventListener('click', copyIngredientsToClipboard);

    // Portion scaler buttons
    el.scalerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.scalerBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.servingMultiplier = parseFloat(btn.dataset.scale) || 1;
        renderIngredientsList(state.activeRecipe);
      });
    });

    // Wake lock toggle
    el.modalWakeBtn.addEventListener('click', toggleScreenWakeLock);

    // Modal favorite button
    el.modalFavBtn.addEventListener('click', () => {
      if (!state.activeRecipe) return;
      toggleFavorite(state.activeRecipe.id);
      updateModalFavBtn();
    });

    // User tweaks auto-save
    let tweakTimer;
    el.userTweaksTextarea.addEventListener('input', (e) => {
      clearTimeout(tweakTimer);
      el.userTweaksStatus.textContent = 'Saving...';
      el.userTweaksStatus.style.opacity = '1';
      tweakTimer = setTimeout(() => {
        if (state.activeRecipe) {
          saveUserNote(state.activeRecipe.id, e.target.value);
          el.userTweaksStatus.textContent = 'Saved ✓';
          setTimeout(() => {
            el.userTweaksStatus.style.opacity = '0';
          }, 1500);
        }
      }, 500);
    });

    // Roulette modal
    el.rouletteCloseBtn.addEventListener('click', closeRouletteModal);
    el.rouletteModal.addEventListener('click', (e) => {
      if (e.target === el.rouletteModal) closeRouletteModal();
    });
    el.rouletteRerollBtn.addEventListener('click', spinRoulette);
    el.rouletteCookBtn.addEventListener('click', () => {
      closeRouletteModal();
      if (state.activeRecipe) openCookModal(state.activeRecipe);
    });
  }

  function openCookModal(recipe) {
    state.activeRecipe = recipe;
    state.servingMultiplier = 1;

    // Reset scaler to 1x
    el.scalerBtns.forEach(b => b.classList.toggle('active', b.dataset.scale === '1'));

    // Populate header
    el.modalAuthorBadge.textContent = recipe.author ? `Curated by ${recipe.author}` : 'Provision Kitchen';
    el.modalTitle.textContent = recipe.title;

    // Populate macros
    el.modalMacrosRow.innerHTML = '';
    if (recipe.macros) {
      if (recipe.macros.protein) {
        el.modalMacrosRow.innerHTML += `<span class="modal-macro-stat">💪 ${recipe.macros.protein}g Protein</span>`;
      }
      if (recipe.macros.calories) {
        el.modalMacrosRow.innerHTML += `<span class="modal-macro-stat">🔥 ${recipe.macros.calories} Calories</span>`;
      }
      if (recipe.macros.carbs) {
        el.modalMacrosRow.innerHTML += `<span class="modal-macro-stat">🌾 ${recipe.macros.carbs}g Carbs</span>`;
      }
      if (recipe.macros.fat) {
        el.modalMacrosRow.innerHTML += `<span class="modal-macro-stat">🥑 ${recipe.macros.fat}g Fat</span>`;
      }
    }

    // Instagram reel button
    if (recipe.reelUrl) {
      el.modalReelBtn.href = recipe.reelUrl;
      el.modalReelBtn.style.display = 'inline-flex';
    } else {
      el.modalReelBtn.style.display = 'none';
    }

    // Modal Fav Button
    updateModalFavBtn();

    // Render Ingredients & Instructions
    renderIngredientsList(recipe);
    renderInstructionsList(recipe);

    // Chef Notes
    if (recipe.notes) {
      el.chefNotesBox.style.display = 'block';
      el.chefNotesText.textContent = recipe.notes;
    } else {
      el.chefNotesBox.style.display = 'none';
    }

    // User tweaks
    const savedTweak = state.userNotes[recipe.id] || '';
    el.userTweaksTextarea.value = savedTweak;
    el.userTweaksStatus.style.opacity = '0';

    // Show modal
    el.cookModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCookModal() {
    el.cookModal.classList.remove('open');
    document.body.style.overflow = '';
    releaseWakeLock();
  }

  function updateModalFavBtn() {
    if (!state.activeRecipe) return;
    const isFav = state.favorites.has(state.activeRecipe.id);
    el.modalFavBtn.classList.toggle('active', isFav);
    el.modalFavBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
      ${isFav ? 'Saved' : 'Save'}
    `;
  }

  // --- Dynamic Ingredient Scaling & Checklist ---
  function scaleIngredientString(text, mult) {
    if (mult === 1) return text;
    // Regex for numbers like '1', '1.5', '1/2', '3/4', '2-3', '200'
    return text.replace(/^(\d+(?:\.\d+)?|\d+\/\d+|\d+\s*[-–]\s*\d+)/, (match) => {
      if (match.includes('/')) {
        const parts = match.split('/');
        const val = parseFloat(parts[0]) / parseFloat(parts[1]);
        const scaled = val * mult;
        return formatFraction(scaled);
      } else if (match.includes('-') || match.includes('–')) {
        const parts = match.split(/[-–]/);
        const low = parseFloat(parts[0]) * mult;
        const high = parseFloat(parts[1]) * mult;
        return `${roundNum(low)}–${roundNum(high)}`;
      } else {
        const val = parseFloat(match) * mult;
        return roundNum(val);
      }
    });
  }

  function roundNum(n) {
    return Math.round(n * 10) / 10;
  }

  function formatFraction(val) {
    if (Math.abs(val - 0.25) < 0.05) return '¼';
    if (Math.abs(val - 0.33) < 0.05) return '⅓';
    if (Math.abs(val - 0.5) < 0.05) return '½';
    if (Math.abs(val - 0.66) < 0.05) return '⅔';
    if (Math.abs(val - 0.75) < 0.05) return '¾';
    if (val > 1) {
      const whole = Math.floor(val);
      const rem = val - whole;
      if (rem > 0.1) return `${whole} ${formatFraction(rem)}`;
      return `${whole}`;
    }
    return roundNum(val);
  }

  function renderIngredientsList(recipe) {
    el.ingredientsChecklist.innerHTML = '';
    (recipe.ingredients || []).forEach((itemText) => {
      const scaledText = scaleIngredientString(itemText, state.servingMultiplier);
      const li = document.createElement('li');
      li.className = 'ingredient-item';
      li.innerHTML = `
        <div class="custom-checkbox">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <span class="ingredient-text">${escapeHtml(scaledText)}</span>
      `;
      li.addEventListener('click', () => {
        li.classList.toggle('checked');
      });
      el.ingredientsChecklist.appendChild(li);
    });
  }

  function renderInstructionsList(recipe) {
    el.instructionsList.innerHTML = '';
    (recipe.instructions || []).forEach((stepText, idx) => {
      const li = document.createElement('li');
      li.className = 'step-item';
      li.innerHTML = `
        <span class="step-number">${idx + 1}.</span>
        <span class="step-text">${escapeHtml(stepText)}</span>
      `;
      li.addEventListener('click', () => {
        li.classList.toggle('completed');
      });
      el.instructionsList.appendChild(li);
    });
  }

  function copyIngredientsToClipboard() {
    if (!state.activeRecipe) return;
    const lines = (state.activeRecipe.ingredients || []).map(i => `• ${scaleIngredientString(i, state.servingMultiplier)}`);
    const clipText = `${state.activeRecipe.title} (Servings: ${state.servingMultiplier}x)\n\nIngredients:\n${lines.join('\n')}`;
    navigator.clipboard.writeText(clipText).then(() => {
      const origText = el.copyIngredientsBtn.textContent;
      el.copyIngredientsBtn.textContent = 'Copied! ✓';
      setTimeout(() => {
        el.copyIngredientsBtn.textContent = origText;
      }, 1800);
    });
  }

  // --- Screen Wake Lock API ---
  async function toggleScreenWakeLock() {
    if (!('wakeLock' in navigator)) {
      alert('Screen Wake Lock is not supported on this browser.');
      return;
    }
    try {
      if (state.wakeLockSentinel) {
        await releaseWakeLock();
      } else {
        state.wakeLockSentinel = await navigator.wakeLock.request('screen');
        el.modalWakeBtn.classList.add('active');
        state.wakeLockSentinel.addEventListener('release', () => {
          state.wakeLockSentinel = null;
          el.modalWakeBtn.classList.remove('active');
        });
      }
    } catch (err) {
      console.warn('Wake lock error:', err);
    }
  }

  async function releaseWakeLock() {
    if (state.wakeLockSentinel) {
      try {
        await state.wakeLockSentinel.release();
      } catch (e) {}
      state.wakeLockSentinel = null;
      el.modalWakeBtn.classList.remove('active');
    }
  }

  // --- Inspiration Roulette ---
  function openRouletteModal() {
    spinRoulette();
    el.rouletteModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeRouletteModal() {
    el.rouletteModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function spinRoulette() {
    // Pick high protein / delicious options
    const candidates = state.recipes.filter(r => (r.macros?.protein && r.macros.protein >= 25) || r.isProvisionOriginal);
    const pool = candidates.length > 0 ? candidates : state.recipes;
    const choice = pool[Math.floor(Math.random() * pool.length)];

    state.activeRecipe = choice;

    // Trigger icon spin animation
    const icon = document.querySelector('.roulette-icon');
    if (icon) {
      icon.style.animation = 'none';
      void icon.offsetWidth;
      icon.style.animation = 'diceSpin 0.6s ease';
    }

    el.rouletteDishTitle.textContent = choice.title;

    let macrosStr = '';
    if (choice.macros?.protein) macrosStr += `<span class="modal-macro-stat">💪 ${choice.macros.protein}g Protein</span>`;
    if (choice.macros?.calories) macrosStr += `<span class="modal-macro-stat">🔥 ${choice.macros.calories} Cal</span>`;
    el.rouletteMacros.innerHTML = macrosStr;

    const ingText = (choice.ingredients || []).slice(0, 4).join(', ');
    el.rouletteSnippet.textContent = ingText ? `Made with ${ingText}...` : (choice.notes || 'Delicious, dialed-in meal ready to make.');
  }

  // --- Kitchen Notebook & Coffee Calculator ---
  function renderNotebookView() {
    el.notebookGrid.innerHTML = '';
    state.notebook.forEach(item => {
      const card = document.createElement('div');
      card.className = 'notebook-card';
      const stepsHtml = (item.instructions || []).map(s => `<li>${escapeHtml(s)}</li>`).join('');
      const ingHtml = (item.ingredients || []).join(' · ');

      card.innerHTML = `
        <div class="notebook-card-header">
          <h3 class="notebook-title">${escapeHtml(item.title)}</h3>
          <span class="card-source-badge">${escapeHtml(item.badge)}</span>
        </div>
        ${item.ratio ? `
          <div class="notebook-ratio-box">
            <div class="notebook-ratio-label">Key Ratio</div>
            ${escapeHtml(item.ratio)}
          </div>
        ` : ''}
        ${ingHtml ? `<p class="notebook-ing-list">${escapeHtml(ingHtml)}</p>` : ''}
        <ol class="notebook-steps">
          ${stepsHtml}
        </ol>
      `;
      el.notebookGrid.appendChild(card);
    });
  }

  function setupCoffeeCalculator() {
    function recalculateCoffee(fromCups) {
      const ratio = 16; // 1:16
      const gramPerCupWater = 240; // ~240ml per cup

      if (fromCups) {
        const cups = parseFloat(el.coffeeCupsInput.value) || 1;
        const waterGrams = cups * gramPerCupWater;
        el.coffeeWaterInput.value = Math.round(waterGrams);
        const beansGrams = Math.round(waterGrams / ratio);
        const beansTbsp = Math.round(cups * 2.75 * 10) / 10;
        el.coffeeBeansGrams.textContent = `${beansGrams}g`;
        el.coffeeBeansTbsp.textContent = `~${beansTbsp} Tbsp`;
      } else {
        const waterGrams = parseFloat(el.coffeeWaterInput.value) || 300;
        const cups = Math.round((waterGrams / gramPerCupWater) * 10) / 10;
        el.coffeeCupsInput.value = cups;
        const beansGrams = Math.round(waterGrams / ratio);
        const beansTbsp = Math.round(cups * 2.75 * 10) / 10;
        el.coffeeBeansGrams.textContent = `${beansGrams}g`;
        el.coffeeBeansTbsp.textContent = `~${beansTbsp} Tbsp`;
      }
    }

    if (el.coffeeCupsInput && el.coffeeWaterInput) {
      el.coffeeCupsInput.addEventListener('input', () => recalculateCoffee(true));
      el.coffeeWaterInput.addEventListener('input', () => recalculateCoffee(false));
      recalculateCoffee(true);
    }
  }

  // --- Fast Food Hacks View ---
  function renderFastFoodView() {
    el.fastfoodGrid.innerHTML = '';
    state.fastfood.forEach(chain => {
      const card = document.createElement('div');
      card.className = 'ff-card';

      let itemsHtml = '';
      (chain.items || []).forEach(it => {
        const macroBadges = (it.macros || []).map(m => `<span class="macro-pill macro-protein">${escapeHtml(m)}</span>`).join('');
        itemsHtml += `
          <div class="ff-item-row">
            <div class="ff-item-info">
              <h4 class="ff-item-name">${escapeHtml(it.name)}</h4>
              <p class="ff-item-desc">${escapeHtml(it.desc)}</p>
            </div>
            <div class="ff-item-badges">
              ${macroBadges}
            </div>
          </div>
        `;
      });

      card.innerHTML = `
        <h3 class="ff-chain-title">${escapeHtml(chain.chain)}</h3>
        <div class="ff-move-box">
          <div class="ff-move-badge">The Move</div>
          ${escapeHtml(chain.move)}
        </div>
        <div class="ff-items-list">
          ${itemsHtml}
        </div>
      `;
      el.fastfoodGrid.appendChild(card);
    });
  }

  // --- Render All ---
  function renderAllViews() {
    renderRecipesView();
    renderNotebookView();
    renderFastFoodView();
  }

  // --- Utility ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Kickoff when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
