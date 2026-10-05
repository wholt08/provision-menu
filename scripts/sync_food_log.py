#!/usr/bin/env python3
"""
PROVISION — Food Log Sync Script
Parses Obsidian meal journal CSV and syncs cook frequency / last cooked date into data.js.
Default CSV Path: /home/billy/Documents/Obsidian/Assets/journal_meals.csv
"""

import os
import re
import csv
import json
from collections import defaultdict
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JS_PATH = os.path.join(BASE_DIR, 'data.js')
DEFAULT_CSV_PATH = '/home/billy/Documents/Obsidian/Assets/journal_meals.csv'

ALIASES = {
    'tortilla pizza': 'Chicken Tortilla Pizza',
    'tortilla pizzas': 'Chicken Tortilla Pizza',
    'taquitos': 'Big Mac Taquitos (30g Protein)',
    'avocado toast': 'Avocado Toast — Upgraded',
    'smash tacos': 'Jalapeño Popper Smash Tacos',
    'smash burger': 'Smash Burger Bowl',
    'mac n cheese': 'High Protein Mac and Cheese',
    'mac and cheese': 'High Protein Mac and Cheese',
    'animal fries': 'One Pan Animal Fries',
    'cottage cheese flatbread': 'Cottage Cheese Flatbread',
    'bagel and eggs': 'Bagel & Eggs',
    'bagel & eggs': 'Bagel & Eggs',
    'greek yogurt bowl': 'Greek Yogurt Power Bowl',
    'protein cookie dough': 'Protein Cookie Dough',
    'chicken tikka': 'Garlic Chicken Tikka Slider Buns'
}

def normalize(text):
    if not text: return ''
    t = text.lower()
    t = re.sub(r'\(.*?\)', '', t)
    t = t.replace('—', ' ').replace('-', ' ').replace('&', 'and')
    t = re.sub(r'[^a-z0-9\s]', '', t)
    return ' '.join(t.split())

def sync_food_log(csv_path=DEFAULT_CSV_PATH):
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return

    if not os.path.exists(DATA_JS_PATH):
        print(f"Error: data.js not found at {DATA_JS_PATH}")
        return

    with open(DATA_JS_PATH, 'r', encoding='utf-8') as f:
        js_content = f.read()
        json_part = re.sub(r'^[^{]*', '', js_content).rstrip(';\n ')
        data = json.loads(json_part)

    recipes = data.get('recipes', [])

    counts = defaultdict(int)
    last_dates = {}
    first_dates = {}
    total_meal_rows = 0

    with open(csv_path, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_meal_rows += 1
            m_raw = row.get('meal_text') or ''
            d_str = row.get('date') or ''
            m_norm = normalize(m_raw)
            if not m_norm: continue
            
            best_r = None
            best_score = 0
            
            # Check explicit aliases first
            for alias, target_title in ALIASES.items():
                if alias in m_norm:
                    target_r = next((r for r in recipes if normalize(r['title']) == normalize(target_title)), None)
                    if target_r:
                        best_r = target_r
                        best_score = 150
                        break
                        
            if not best_r:
                for r in recipes:
                    r_norm = normalize(r['title'])
                    if len(r_norm) < 4: continue
                    
                    if r_norm == m_norm:
                        score = 100 + len(r_norm)
                    elif f' {r_norm} ' in f' {m_norm} ':
                        score = 80 + len(r_norm)
                    elif f' {m_norm} ' in f' {r_norm} ':
                        score = 70 + len(m_norm)
                    else:
                        score = 0
                        
                    if score > best_score:
                        best_score = score
                        best_r = r
                        
            if best_r and best_score >= 70:
                rid = best_r['id']
                counts[rid] += 1
                if rid not in first_dates or d_str < first_dates[rid]:
                    first_dates[rid] = d_str
                if rid not in last_dates or d_str > last_dates[rid]:
                    last_dates[rid] = d_str

    matched_recipes = 0
    for r in recipes:
        rid = r['id']
        times = counts.get(rid, 0)
        r['timesCooked'] = times
        r['lastCookedDate'] = last_dates.get(rid, None)
        r['firstCookedDate'] = first_dates.get(rid, None)
        
        current_tags = set(r.get('tags', []))
        if times >= 5:
            current_tags.add('High Rotation (5+)')
        else:
            current_tags.discard('High Rotation (5+)')
            
        if times == 0:
            current_tags.add('Never Made Yet')
        else:
            current_tags.discard('Never Made Yet')
            
        r['tags'] = sorted(list(current_tags))
        
        if times > 0:
            matched_recipes += 1

    # Save back to data.js
    with open(DATA_JS_PATH, 'w', encoding='utf-8') as f:
        f.write('// PROVISION Culinary Engine Database (Synced with Food Log)\n')
        f.write('window.PROVISION_DATA = ' + json.dumps(data, indent=2) + ';\n')

    print(f"Processed {total_meal_rows} meal logs from {csv_path}")
    print(f"Successfully enriched {matched_recipes} recipes with cook history!")
    print(f"Saved updated data to {DATA_JS_PATH}")

if __name__ == '__main__':
    sync_food_log()
