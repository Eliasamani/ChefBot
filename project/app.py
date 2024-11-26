# app.py
from flask import Flask, render_template, request, jsonify
import requests
import os
import openai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Retrieve API keys from environment variables
SPOONACULAR_API_KEY = os.getenv('SPOONACULAR_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

openai.api_key = OPENAI_API_KEY

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_recipes', methods=['POST'])
def get_recipes():
    data = request.get_json()
    ingredients = data.get('ingredients', [])
    if not ingredients:
        return jsonify({'reply': 'Please select some ingredients.'})

    # Call the Spoonacular API to get recipes
    recipes = get_recipes_from_api(ingredients)
    if not recipes:
        return jsonify({'reply': 'No recipes found with those ingredients.'})

    # Generate a response using GPT
    gpt_response = generate_gpt_response(recipes, ingredients)

    return jsonify({'reply': gpt_response})

def get_recipes_from_api(ingredients):
    # Use the Spoonacular API to get recipes based on ingredients
    api_url = 'https://api.spoonacular.com/recipes/findByIngredients'
    params = {
        'apiKey': SPOONACULAR_API_KEY,
        'ingredients': ','.join(ingredients),
        'number': 5,  # Number of recipes to return
        'ranking': 2,  # Minimize missing ingredients
        'ignorePantry': True
    }
    response = requests.get(api_url, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        print('Error fetching recipes:', response.status_code, response.text)
        return None

def generate_gpt_response(recipes, ingredients):
    # Use OpenAI's GPT API to generate a response
    # Prepare the prompt
    prompt = f"You are a helpful cooking assistant. The user has the following ingredients: {', '.join(ingredients)}.\n"
    prompt += "Based on these ingredients, here are some recipes you can suggest:\n"
    for recipe in recipes:
        title = recipe.get('title')
        missedIngredients = [ing['name'] for ing in recipe.get('missedIngredients', [])]
        prompt += f"- {title}\n"
        if missedIngredients:
            prompt += f"  - Missing ingredients: {', '.join(missedIngredients)}\n"
        else:
            prompt += "  - You have all the ingredients needed!\n"

    prompt += "\nPlease provide a friendly summary of these recipes to the user."

    # Call the OpenAI API
    response = openai.Completion.create(
        engine='text-davinci-003',
        prompt=prompt,
        max_tokens=250,
        n=1,
        stop=None,
        temperature=0.7,
    )
    message = response.choices[0].text.strip()
    return message

if __name__ == '__main__':
    try:
        print("Starting Flask app...")
        app.run(debug=True)
    except Exception as e:
        print(f"An error occurred: {e}")

