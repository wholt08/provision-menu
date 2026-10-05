# PROVISION — Kitchen & Culinary Engine (2.0)

A high-performance personal culinary web app and kitchen notebook hosting 300+ hand-curated recipes, dialed-in ratios, and fast food hacks. Built to deploy seamlessly to GitHub Pages.

Live Demo: [https://wholt08.github.io/provision-menu/](https://wholt08.github.io/provision-menu/)

---

## What’s New in Provision 2.0

1. **307 Curated Recipes**:
   - **283 Instagram Reels Recipes**: Full ingredients, step-by-step methods, macro estimates (calories & protein), tags, and direct links to original creator reels.
   - **24 Provision Original Classics**: Retained all original restaurant-style high-protein dishes (Chicken Tortilla Pizza, Smash Burger Bowl, Turkey & Cottage Wrap, etc.).
2. **"Surprise Me / Dinner Roulette" Engine**:
   - One-click inspiration button that picks a high-protein dish with shuffle animation when you're facing decision fatigue.
3. **Instant Search & Tag Filtering**:
   - Real-time search across recipe titles, ingredients (e.g., search `cottage cheese`, `ground turkey`, `pasta`), and creators.
   - Filter chips for `High Protein (30g+)`, `Quick (<20m)`, `Cottage Cheese Hacks`, `Air Fryer`, `Healthified Comfort`, `Meal Prep`, `One Pan`, and more.
4. **Interactive Cook View (Modal)**:
   - **Tap-to-Check Ingredients**: Cross off ingredients as you pull them from the pantry or add them to the pan.
   - **Step-by-Step Checklist**: Never lose your place in multi-step recipes.
   - **Dynamic Portion Scaler**: `1x`, `2x`, `3x` buttons that automatically scale numerical ingredient amounts.
   - **"Stay Awake" Toggle**: Uses the Screen Wake Lock API so your device doesn't turn off while cooking with dirty hands.
   - **Personal Notes & Tweaks**: Editable notes box that auto-saves your modifications to `localStorage` (e.g., "Air fried at 380° for 11 mins instead").
   - **Copy List**: One-tap export to your clipboard for grocery shopping.
5. **Kitchen Notebook & Coffee Calculator**:
   - Dialed-in ratios for Pour Over Coffee (Opus grinder level 7, 1:16 ratio), Filtered Brew, Greek Yogurt Ranch, and Strained Greek Yogurt Cream Cheese.
   - Interactive pour-over calculator: enter cups or water weight and get exact bean measurements in grams and tablespoons.
6. **Fast Food Hacks**:
   - Macro breakdowns and exact ordering plays for 8 major chains (Chick-fil-A, Taco Bell, Wendy's, Taco Time, Chipotle, Domino's, Shake Shack, Brewery & Tavern).
7. **Favorites System**:
   - Save your weekly meal plan shortlist by clicking the heart icon on any recipe. Stored locally in your browser.

---

## Project Structure

```
Provisions Menu/
├── index.html            # Main application markup & modal templates
├── styles.css            # Dark luxury theme & responsive mobile layout
├── app.js                # State management, instant search, modals, wake lock, portion scaler
├── data.js               # Recipe database (307 recipes, kitchen notebook, fast food hacks)
├── favicon.svg           # Site favicon
├── Instagram Recipes.md  # Raw markdown archive of saved recipes
├── scripts/
│   └── parse_recipes.py  # Automation script to parse markdown and regenerate data.js
└── README.md
```

---

## Adding More Recipes in the Future

Whenever you add new recipes to `Instagram Recipes.md`, run:

```bash
python3 scripts/parse_recipes.py
```

This will automatically re-parse the markdown and update `data.js`.

---

## Deploying to GitHub Pages

To publish these updates to your live GitHub Pages site:

```bash
git add .
git commit -m "Upgrade to Provision 2.0: 300+ recipes, search, cook view, roulette"
git push -u origin master
```
*(Or use `git push -u origin master --force` if needed to sync branches).*
