#!/usr/bin/env python3
"""
PROVISION Recipe Ingestion Script
Parses 'Instagram Recipes.md' and regenerates 'data.js'
"""

import os
import re
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MD_PATH = os.path.join(BASE_DIR, 'Instagram Recipes.md')
DATA_JS_PATH = os.path.join(BASE_DIR, 'data.js')

def extract_macros(notes_str):
    cal = None
    prot = None
    carbs = None
    fat = None
    
    cal_m = re.search(r'(\d+)\s*(?:cal|calories|kcal)', notes_str, re.I)
    if cal_m: cal = int(cal_m.group(1))
    
    prot_m = re.search(r'(\d+)\s*g\s*protein', notes_str, re.I)
    if prot_m: prot = int(prot_m.group(1))
    
    carbs_m = re.search(r'(\d+)\s*g\s*(?:net\s*)?carbs?', notes_str, re.I)
    if carbs_m: carbs = int(carbs_m.group(1))
    
    fat_m = re.search(r'(\d+)\s*g\s*fat', notes_str, re.I)
    if fat_m: fat = int(fat_m.group(1))
    
    return {'calories': cal, 'protein': prot, 'carbs': carbs, 'fat': fat}

def guess_category(title, ingredients, instructions):
    full_text = f'{title} ' + ' '.join(ingredients) + ' ' + ' '.join(instructions)
    full_text = full_text.lower()
    
    if any(k in full_text for k in ['cookie', 'cheesecake', 'brownie', 'donut', 'muffin', 'lava cake', 'ice cream', 'oat cake', 'baked oats', 'dessert', 'pancake', 'sweet']):
        return 'sweet'
    if any(k in full_text for k in ['egg', 'breakfast', 'toast', 'bagel', 'scramble', 'omelette', 'feta fried']):
        return 'breakfast'
    if any(k in full_text for k in ['dip', 'chips', 'snack', 'popcorn', 'bites', 'clusters', 'fries', 'pinwheels', 'empanada']):
        return 'snack'
    if any(k in full_text for k in ['cocktail', 'mocktail', 'latte', 'drink', 'shake', 'smoothie', 'coffee', 'brew']):
        return 'drink'
    return 'dinner'

def generate_tags(title, ingredients, instructions, notes, macros):
    tags = set()
    full_text = f'{title} {notes} ' + ' '.join(ingredients) + ' ' + ' '.join(instructions)
    full_text = full_text.lower()
    
    if macros.get('protein') and macros['protein'] >= 30:
        tags.add('High Protein')
    elif any(k in full_text for k in ['high protein', 'high-protein', '30g protein', '40g protein', '50g protein']):
        tags.add('High Protein')
        
    if 'air fryer' in full_text or 'airfryer' in full_text:
        tags.add('Air Fryer')
        
    if 'cottage cheese' in full_text:
        tags.add('Cottage Cheese')
        
    if 'greek yogurt' in full_text or 'greek yoghurt' in full_text:
        tags.add('Greek Yogurt')
        
    if 'meal prep' in full_text or 'burritos' in full_text:
        tags.add('Meal Prep')
        
    if any(k in full_text for k in ['15-minute', '10-minute', '5-minute', 'quick', 'easy', '10 minute', '15 minute', '5 minute']):
        tags.add('Quick (<20m)')
        
    if any(k in full_text for k in ['pizza', 'burger', 'mac and cheese', 'nachos', 'fries', 'taquitos', 'flying dutchman', 'tacos', 'enchilada', 'queso']):
        tags.add('Healthified Comfort')
        
    if any(k in full_text for k in ['sheet pan', 'one pan', 'one pot', 'tray bake', 'skillet']):
        tags.add('One Pan / Low Cleanup')
        
    if any(k in full_text for k in ['keto', 'low carb', 'zero carb', 'crustless']):
        tags.add('Low Carb')
        
    if any(k in full_text for k in ['chicken', 'tenders', 'shawarma', 'buffalo chicken']):
        tags.add('Chicken')
        
    if any(k in full_text for k in ['beef', 'steak', 'burger', 'meatballs']):
        tags.add('Beef')
        
    return sorted(list(tags))

def main():
    if not os.path.exists(MD_PATH):
        print(f"Error: {MD_PATH} not found.")
        return

    with open(MD_PATH, 'r', encoding='utf-8') as f:
        text = f.read()

    # Preserve existing Provision originals, notebook items, and fast food items from current data.js
    existing_data = {}
    if os.path.exists(DATA_JS_PATH):
        try:
            with open(DATA_JS_PATH, 'r', encoding='utf-8') as f:
                js_content = f.read()
                json_part = re.sub(r'^[^{]*', '', js_content).rstrip(';\n ')
                existing_data = json.loads(json_part)
        except Exception as e:
            print("Warning reading existing data.js:", e)

    provision_originals = [r for r in existing_data.get('recipes', []) if r.get('isProvisionOriginal')]
    notebook_items = existing_data.get('notebook', [])
    fastfood_chains = existing_data.get('fastfood', [])

    raw_recipes = re.split(r'\n(?=## (?!Complete recipes|Reconstructed from video|Contents))', text)

    all_recipes = list(provision_originals)
    used_ids = set(r['id'] for r in all_recipes)

    for chunk in raw_recipes[1:]:
        chunk = chunk.strip()
        if not chunk: continue
        
        lines = chunk.split('\n')
        title = lines[0].replace('##', '').strip()
        
        author_match = re.search(r'\*\*By:\*\*\s*(.*?)(?:\s*·|\s*\n|\Z)', chunk)
        author = author_match.group(1).strip() if author_match else ''
        reel_match = re.search(r'\[View reel\]\((https?://[^\)]+)\)', chunk)
        reel_url = reel_match.group(1).strip() if reel_match else ''
        
        ing_match = re.search(r'\*\*Ingredients\*\*\s*\n([\s\S]*?)(?=\n\*\*(?:Instructions|Method|Notes|Note)\*\*|\Z)', chunk)
        ingredients = []
        if ing_match:
            for l in ing_match.group(1).strip().split('\n'):
                l = re.sub(r'^\s*[-*•]\s*', '', l).strip()
                if l: ingredients.append(l)
                
        inst_match = re.search(r'\*\*(?:Instructions|Method)\*\*\s*\n([\s\S]*?)(?=\n\*\*(?:Notes|Note)\*\*|\Z)', chunk)
        instructions = []
        if inst_match:
            for l in inst_match.group(1).strip().split('\n'):
                l = re.sub(r'^\s*\d+\.\s*', '', l).strip()
                if l: instructions.append(l)
                
        notes_match = re.search(r'\*\*(?:Notes|Note):\*\*\s*([\s\S]*?)$', chunk)
        notes = notes_match.group(1).strip() if notes_match else ''
        
        macros = extract_macros(notes)
        if not macros['protein']:
            title_p = re.search(r'\((\d+)g\s*protein\)', title, re.I)
            if title_p: macros['protein'] = int(title_p.group(1))
            
        category = guess_category(title, ingredients, instructions)
        tags = generate_tags(title, ingredients, instructions, notes, macros)
        
        is_reconstructed = 'reconstructed' in notes.lower() or 'missing' in notes.lower() or 'approximate' in notes.lower()
        
        base_slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        slug = base_slug
        idx = 2
        while slug in used_ids:
            slug = f'{base_slug}-{idx}'
            idx += 1
        used_ids.add(slug)
        
        all_recipes.append({
            'id': slug,
            'title': title,
            'author': author,
            'reelUrl': reel_url,
            'category': category,
            'macros': macros,
            'tags': tags,
            'ingredients': ingredients,
            'instructions': instructions,
            'notes': notes,
            'isReconstructed': is_reconstructed,
            'source': 'Instagram'
        })

    data_obj = {
        'recipes': all_recipes,
        'notebook': notebook_items,
        'fastfood': fastfood_chains
    }

    with open(DATA_JS_PATH, 'w', encoding='utf-8') as out:
        out.write('// PROVISION Culinary Engine Database\n')
        out.write('window.PROVISION_DATA = ' + json.dumps(data_obj, indent=2) + ';\n')

    print(f"Successfully generated {DATA_JS_PATH} with {len(all_recipes)} recipes!")

if __name__ == '__main__':
    main()
