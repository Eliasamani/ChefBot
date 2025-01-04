# app.py
from flask import Flask, render_template, request, jsonify
import requests
import os
import openai
from dotenv import load_dotenv
import re
import random

load_dotenv()

app = Flask(__name__)

SPOONACULAR_API_KEY = os.getenv('SPOONACULAR_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
openai.api_key = OPENAI_API_KEY

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_recipes', methods=['POST'])
def get_recipes():
    """
    1) Fetches recipes from Spoonacular based on user ingredients & preferences
    2) Returns them to the front-end without extra text
    """
    data = request.get_json()
    ingredients = data.get('ingredients', [])
    preferences = data.get('preferences', {})

    if not ingredients:
        return jsonify({'error': 'Please select or enter some ingredients.'}), 400

    recipes = get_recipes_from_api(ingredients, preferences)
    if not recipes:
        return jsonify({'error': 'No recipes found with those ingredients.'}), 404

    # Refine missing
    recipes = refine_missing_ingredients(recipes, ingredients)

    return jsonify({'recipes': recipes})

@app.route('/see_more', methods=['POST'])
def see_more():
    """
    'See more' endpoint: fetch minimal info (title, scaled ingredients, macros)
    for a recipe from Spoonacular WITHOUT updating the conversation context.
    Shown in a modal that can be hidden.
    """
    data = request.get_json()
    recipe_id = data.get('recipe_id')
    if not recipe_id:
        return jsonify({'error': 'No recipe ID provided.'}), 400

    servings = data.get('servings', 2)
    info = get_recipe_information(recipe_id, servings)
    if not info:
        return jsonify({'error': "Couldn't fetch details."}), 404

    summary = build_short_info(info)
    return jsonify({'info': summary})

@app.route('/chatbot', methods=['POST'])
def chatbot():
    """
    Handles special commands:
    - "CHOOSE_RECIPE_{id}__SERVINGS_{servings}" => fetch recipe info with given servings,
      append the details to the conversation context (CHOSEN_RECIPE_DETAILS).
    - "I want new recipes"
    - "I only want recipes with ingredients I have"
    - Otherwise: normal conversation with GPT
    """
    data = request.get_json()
    user_message = data.get('message', '').strip()
    context = data.get('context', '')
    ingredients = data.get('ingredients', [])

    if not user_message:
        return jsonify({'error': 'No message provided.'}), 400

    user_message_lower = user_message.lower()

    # "I want new recipes"
    if user_message_lower == 'i want new recipes':
        new_recipes = get_recipes_from_api(ingredients, preferences=None, fresh_call=True)
        if not new_recipes:
            return jsonify({'reply': "I'm sorry, I couldn't find any new recipes.", 'context': context})

        new_recipes = refine_missing_ingredients(new_recipes, ingredients)
        return jsonify({
            'reply': "Here are some brand new recipes!",
            'recipes': new_recipes,
            'context': context
        })

    # "I only want recipes with ingredients i have"
    if user_message_lower == 'i only want recipes with ingredients i have':
        possible_recipes = get_recipes_from_api(ingredients, preferences=None, fresh_call=True)
        if not possible_recipes:
            return jsonify({'reply': "No recipes found.", 'context': context})
        possible_recipes = refine_missing_ingredients(possible_recipes, ingredients)
        strict = [r for r in possible_recipes if not r.get('missedIngredients')]
        if not strict:
            return jsonify({'reply': "No strictly matched recipes found.", 'context': context})
        return jsonify({
            'reply': "Here are strictly matched recipes:",
            'recipes': strict,
            'context': context
        })

    # "CHOOSE_RECIPE_{id}__SERVINGS_{servings}"
    if user_message_lower.startswith('choose_recipe_'):
        try:
            parts = user_message.split('__SERVINGS_')
            left = parts[0]  # "CHOOSE_RECIPE_12345"
            servings_str = parts[1]
            servings = int(servings_str)

            recipe_id = left.split('_')[-1]
            recipe_info = get_recipe_information(recipe_id, servings)
            if not recipe_info:
                return jsonify({'reply': "Sorry, I couldn't retrieve details for that recipe.", 'context': context})

            reply_msg = generate_recipe_details_msg(recipe_info)
            # Add these details to the context so GPT can see them if the user asks further questions
            updated_context = context + f"\nCHOSEN_RECIPE_DETAILS:\n{reply_msg}\n"
            return jsonify({'reply': reply_msg, 'context': updated_context})
        except Exception as e:
            print("Error parsing CHOOSE_RECIPE command:", e)
            return jsonify({'reply': "Error: invalid recipe choose command.", 'context': context})

    # Otherwise, normal conversation with GPT
    try:
        response = openai.ChatCompletion.create(
            model='gpt-3.5-turbo',
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful cooking assistant. "
                        "You can provide normal conversation or handle specific user commands. "
                        "When the user chooses a recipe, provide details. "
                        "If the user asks for new recipes, generate new suggestions. "
                        "If the user wants portion scaling, reflect that in the ingredients and macros. "
                        "If CHOSEN_RECIPE_DETAILS is in the context, you may reference it."
                    )
                },
                {
                    "role": "assistant",
                    "content": context
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            max_tokens=300,
            temperature=0.7,
        )
        assistant_reply = response.choices[0].message.content.strip()
        return jsonify({'reply': assistant_reply, 'context': context})
    except Exception as e:
        return jsonify({'reply': f"An error occurred: {str(e)}", 'context': context})

# ----------------------------------------------------------------
# HELPER FUNCTIONS
# ----------------------------------------------------------------

def get_recipes_from_api(ingredients, preferences=None, fresh_call=False):
    base_url = 'https://api.spoonacular.com/recipes/complexSearch'
    params = {
        'apiKey': SPOONACULAR_API_KEY,
        'includeIngredients': ','.join(ingredients),
        'number': 5,
        'ranking': 1,
        'sort': 'meta-score',
        'instructionsRequired': True,
        'fillIngredients': True,
        'ignorePantry': True
    }

    # If we're making a fresh call for new recipes, let's sort by random:
    if fresh_call:
        params['sort'] = 'random'
        # Alternatively, you could use a random offset:
        # params['offset'] = random.randint(0, 50)

    intolerances = []
    if preferences:
        if preferences.get('vegan'):
            params['diet'] = 'vegan'
        if preferences.get('glutenFree'):
            intolerances.append('gluten')
        if preferences.get('dairyFree'):
            intolerances.append('dairy')
        if preferences.get('nutFree'):
            intolerances.append('peanut')
            intolerances.append('tree nut')
    if intolerances:
        params['intolerances'] = ','.join(set(intolerances))

    resp = requests.get(base_url, params=params)
    if resp.status_code == 200:
        data = resp.json()
        recs = data.get('results', [])
        if recs:
            return recs
        # fallback if no match with includeIngredients
        params.pop('includeIngredients', None)
        r2 = requests.get(base_url, params=params)
        if r2.status_code == 200:
            return r2.json().get('results', [])
    return None

def refine_missing_ingredients(recipes, user_ingredients):
    simplified_user_ings = set(singularize(ing) for ing in user_ingredients)
    for recipe in recipes:
        missed = recipe.get('missedIngredients', [])
        refined = []
        for ing in missed:
            if singularize(ing['name']) not in simplified_user_ings:
                refined.append(ing)
        recipe['missedIngredients'] = refined
    return recipes

def singularize(word):
    w = word.lower()
    w = re.sub(r'[\W_]+', '', w)
    if w.endswith('ies') and len(w) > 3:
        w = w[:-3] + 'y'
    elif w.endswith('es') and len(w) > 2:
        w = w[:-2]
    elif w.endswith('s') and len(w) > 1:
        w = w[:-1]
    return w

def get_recipe_information(recipe_id, servings=2):
    """
    Calls Spoonacular's GET Recipe Information endpoint
    with includeNutrition=true and the user-specified servings.
    """
    url = f"https://api.spoonacular.com/recipes/{recipe_id}/information"
    params = {
        'apiKey': SPOONACULAR_API_KEY,
        'includeNutrition': 'true',
        'servings': servings
    }
    resp = requests.get(url, params=params)
    if resp.status_code == 200:
        return resp.json()
    return None

def generate_recipe_details_msg(recipe_info):
    """
    Build a user-friendly message with:
      - Title
      - Servings
      - Ingredient list (scaled)
      - Instructions
      - Macros
    """
    title = recipe_info.get('title', 'Recipe')
    servings = recipe_info.get('servings', 2)

    ext_ings = recipe_info.get('extendedIngredients', [])
    ing_lines = [ing.get('original', '') for ing in ext_ings]

    instructions = ''
    if recipe_info.get('analyzedInstructions'):
        steps = recipe_info['analyzedInstructions'][0].get('steps', [])
        instructions = "\n".join([f"{s['number']}. {s['step']}" for s in steps])
    else:
        instructions = recipe_info.get('instructions', 'No instructions found.')

    macros = build_macros_info(recipe_info)

    msg = (
        f"**{title}** (for {servings} servings)\n\n"
        f"**Ingredients:**\n" + "\n".join(ing_lines) + "\n\n"
        f"**Instructions:**\n{instructions}\n\n"
        f"**Macros:**\n{macros}\n"
        f"\nFeel free to ask more questions or choose another recipe."
    )
    return msg

def build_macros_info(recipe_info):
    nutrition = recipe_info.get('nutrition', {})
    nutrients = nutrition.get('nutrients', [])
    macros_map = {}
    for n in nutrients:
        name_lower = n['name'].lower()
        if name_lower in ['calories', 'fat', 'protein', 'carbohydrates']:
            macros_map[n['name']] = f"{n['amount']} {n['unit']}"

    if macros_map:
        return (
            f"Calories: {macros_map.get('Calories', 'N/A')}\n"
            f"Carbs: {macros_map.get('Carbohydrates', 'N/A')}\n"
            f"Fat: {macros_map.get('Fat', 'N/A')}\n"
            f"Protein: {macros_map.get('Protein', 'N/A')}"
        )
    else:
        return "No macro data found."

def build_short_info(recipe_info):
    """
    Return minimal info for the 'See more' modal
    """
    title = recipe_info.get('title', 'Recipe')
    servings = recipe_info.get('servings', 2)
    ext_ings = recipe_info.get('extendedIngredients', [])
    ing_list = [ing.get('original', '') for ing in ext_ings]

    macros = build_macros_info(recipe_info)
    return {
        'title': title,
        'servings': servings,
        'ingredients': ing_list,
        'macros': macros
    }

if __name__ == '__main__':
    app.run(debug=True)
