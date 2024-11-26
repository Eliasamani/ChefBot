# app.py
from flask import Flask, render_template, request, jsonify
import requests
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Retrieve API key from environment variables
SPOONACULAR_API_KEY = os.getenv('SPOONACULAR_API_KEY')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_recipes', methods=['POST'])
def get_recipes():
    data = request.get_json()
    ingredients = data.get('ingredients', [])
    if not ingredients:
        return jsonify({'error': 'Please select or enter some ingredients.'}), 400

    # Call the Spoonacular API to get recipes
    recipes = get_recipes_from_api(ingredients)
    if not recipes:
        return jsonify({'error': 'No recipes found with those ingredients.'}), 404

    # Return the recipes to the frontend
    return jsonify({'recipes': recipes})

def get_recipes_from_api(ingredients):
    # Use the Spoonacular API to get recipes based on ingredients
    base_url = 'https://api.spoonacular.com/recipes/findByIngredients'
    params = {
        'ingredients': ','.join(ingredients),
        'number': 5,  # Number of recipes to return
        'ranking': 2,  # Minimize missing ingredients
        'ignorePantry': True
    }
    headers = {
        'x-api-key': SPOONACULAR_API_KEY
    }
    response = requests.get(base_url, params=params, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print('Error fetching recipes:', response.status_code, response.text)
        return None


if __name__ == '__main__':
    app.run(debug=True)
