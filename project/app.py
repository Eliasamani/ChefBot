# app.py
from flask import Flask, render_template, request, jsonify
import requests
import os
import openai
from dotenv import load_dotenv
import re

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Retrieve API keys from environment variables
SPOONACULAR_API_KEY = os.getenv('SPOONACULAR_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
OPENAI_ORGANIZATION_ID = os.getenv('OPENAI_ORGANIZATION_ID')  # Optional

# Set up OpenAI API credentials
openai.api_key = OPENAI_API_KEY
# Uncomment the following line if you belong to multiple organizations
# openai.organization = OPENAI_ORGANIZATION_ID

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

    # Generate a conversational response using OpenAI
    conversation = generate_conversational_response(recipes, ingredients)

    # Return the conversation and recipes to the frontend
    return jsonify({'conversation': conversation, 'recipes': recipes})

def get_recipes_from_api(ingredients):
    # Use the Spoonacular API to get recipes based on ingredients
    base_url = 'https://api.spoonacular.com/recipes/findByIngredients'
    params = {
        'apiKey': SPOONACULAR_API_KEY,
        'ingredients': ','.join(ingredients),
        'number': 5,  # Number of recipes to return
        'ranking': 2,  # Minimize missing ingredients
        'ignorePantry': True
    }
    response = requests.get(base_url, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        print('Error fetching recipes:', response.status_code, response.text)
        return None

def generate_conversational_response(recipes, ingredients):
    # Prepare the recipe list
    recipe_list = ''
    for i, recipe in enumerate(recipes, start=1):
        missed_ingredients = ', '.join([ing['name'] for ing in recipe['missedIngredients']])
        if missed_ingredients:
            recipe_list += f"{i}. {recipe['title']} (Missing ingredients: {missed_ingredients})\n"
        else:
            recipe_list += f"{i}. {recipe['title']} (You have all the ingredients!)\n"

    # Prepare the messages for ChatCompletion
    messages = [
        {
            "role": "system",
            "content": "You are a helpful cooking assistant."
        },
        {
            "role": "user",
            "content": (
                f"The user has the following ingredients: {', '.join(ingredients)}.\n"
                f"Based on these ingredients, suggest the following recipes:\n"
                f"{recipe_list}\n"
                f"Please present this information in a conversational and friendly manner, "
                f"inviting the user to select a recipe by number or request new recipes."
            )
        }
    ]

    # Call OpenAI's ChatCompletion API using the new method
    try:
        response = openai.chat.completions.create(
            model='gpt-3.5-turbo',
            messages=messages,
            max_tokens=250,
            temperature=0.7,
        )
        assistant_reply = response.choices[0].message.content.strip()
        return assistant_reply
    except Exception as e:
        print('Error in generate_conversational_response:', str(e))
        return f'An error occurred while generating the response: {str(e)}'

@app.route('/chatbot', methods=['POST'])
def chatbot():
    data = request.get_json()
    user_message = data.get('message', '')
    context = data.get('context', '')

    if not user_message:
        return jsonify({'error': 'No message provided.'}), 400

    # Check if the user requested new recipes
    if 'new recipes' in user_message.lower() or user_message.strip() == '6':
        # Extract ingredients from context
        ingredients = extract_ingredients_from_context(context)
        # Fetch new recipes
        recipes = get_recipes_from_api(ingredients)
        if not recipes:
            assistant_reply = "I'm sorry, I couldn't find any new recipes."
        else:
            # Generate a new conversational response
            conversation = generate_conversational_response(recipes, ingredients)
            assistant_reply = conversation
            # Reset the context with new conversation
            context = conversation

        return jsonify({'reply': assistant_reply, 'context': context})

    # Prepare the messages for ChatCompletion
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful cooking assistant. "
                "When the user selects a recipe by number, provide detailed instructions for that recipe. "
                "If the user asks questions, provide clear and concise answers. "
                "If the user requests new recipes, generate new suggestions based on their ingredients."
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
    ]

    # Generate a response using OpenAI
    try:
        response = openai.chat.completions.create(
            model='gpt-3.5-turbo',
            messages=messages,
            max_tokens=250,
            temperature=0.7,
        )
        assistant_reply = response.choices[0].message.content.strip()
        # Append the conversation for context
        new_context = context + f"\nUser: {user_message}\nAssistant: {assistant_reply}"
    except Exception as e:
        print('Error in chatbot:', str(e))
        assistant_reply = f'An error occurred while processing your request: {str(e)}'
        new_context = context

    return jsonify({'reply': assistant_reply, 'context': new_context})

def extract_ingredients_from_context(context):
    # Extract ingredients from the initial context
    match = re.search(r"The user has the following ingredients: (.+?)\.\n", context)
    if match:
        ingredients = match.group(1).split(', ')
        return ingredients
    else:
        return []

if __name__ == '__main__':
    app.run(debug=True)
