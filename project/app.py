# app.py
from flask import Flask, render_template, request, jsonify
import requests
import os
import openai
from dotenv import load_dotenv
import re
import random

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Retrieve API keys from environment variables
SPOONACULAR_API_KEY = os.getenv('SPOONACULAR_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Set up OpenAI API credentials
openai.api_key = OPENAI_API_KEY

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_recipes', methods=['POST'])
def get_recipes():
    data = request.get_json()
    ingredients = data.get('ingredients', [])
    if not ingredients:
        return jsonify({'error': 'Please select or enter some ingredients.'}), 400

    # Call the Spoonacular API to get recipes using complexSearch
    recipes = get_recipes_from_api(ingredients)
    if not recipes:
        return jsonify({'error': 'No recipes found with those ingredients.'}), 404

    # Generate a conversational response including option 6
    conversation = generate_conversational_response(recipes, ingredients)

    # Return the conversation and recipes to the frontend
    return jsonify({'conversation': conversation, 'recipes': recipes})

def get_recipes_from_api(ingredients):
    # Use the Spoonacular API to get recipes based on ingredients
    base_url = 'https://api.spoonacular.com/recipes/complexSearch'
    params = {
        'apiKey': SPOONACULAR_API_KEY,
        'includeIngredients': ','.join(ingredients),
        'number': 5,
        'offset': random.randint(0, 100),
        'instructionsRequired': True,
        'fillIngredients': True,
        'ranking': 1,
    }

    response = requests.get(base_url, params=params)
    if response.status_code == 200:
        data = response.json()
        recipes = data.get('results', [])
        if not recipes:
            # If no recipes found, try without includeIngredients
            params.pop('includeIngredients')
            response = requests.get(base_url, params=params)
            if response.status_code == 200:
                data = response.json()
                recipes = data.get('results', [])
        # Return up to 5 recipes
        return recipes[:5]
    else:
        print('Error fetching recipes:', response.status_code, response.text)
        return None

def generate_conversational_response(recipes, ingredients):
    # Prepare the recipe list including option 6
    recipe_list = ''
    for i, recipe in enumerate(recipes, start=1):
        missed_ingredients_list = recipe.get('missedIngredients', [])
        missed_count = len(missed_ingredients_list)
        if missed_count > 0:
            missed_ingredients_str = ', '.join([ing['name'] for ing in missed_ingredients_list])
            recipe_list += f"{i}. {recipe['title']} (Missing {missed_count} ingredients: {missed_ingredients_str})\n"
        else:
            recipe_list += f"{i}. {recipe['title']} (You have all the ingredients!)\n"

    recipe_list += "6. Get new recipes\n"

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
                f"letting the user know they can select a recipe by number (1-5) or enter 6 to get new recipes."
            )
        }
    ]

    # Call OpenAI's ChatCompletion API using the correct method
    try:
        response = openai.chat.completions.create(
            model='gpt-3.5-turbo',
            messages=messages,
            max_tokens=500,
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
    ingredients = data.get('ingredients', [])

    if not user_message:
        return jsonify({'error': 'No message provided.'}), 400

    # Check if the user requested new recipes
    if 'new recipes' in user_message.lower() or user_message.strip() == '6':
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

    # Check if the user selected a recipe
    if user_message.isdigit():
        recipe_number = int(user_message)
        if 1 <= recipe_number <= 5:
            recipe_id = data.get('recipe_id')
            if not recipe_id:
                assistant_reply = "Sorry, I couldn't find that recipe. Please try again."
                return jsonify({'reply': assistant_reply, 'context': context})
            
            # Fetch detailed recipe information (placeholder function)
            recipe_details = get_recipe_details(recipe_id)
            if not recipe_details:
                assistant_reply = "Sorry, I couldn't retrieve the recipe details."
            else:
                # Generate a conversational response with the recipe details
                assistant_reply = generate_recipe_conversational_response(recipe_details)
                # Update the context with the assistant's reply
                context += f"\nAssistant: {assistant_reply}"

            return jsonify({'reply': assistant_reply, 'context': context})
        else:
            assistant_reply = "Please enter a valid recipe number between 1 and 5, or enter 6 to get new recipes."
            return jsonify({'reply': assistant_reply, 'context': context})

    # For any other messages, continue the conversation
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
            max_tokens=500,
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

def get_recipe_details(recipe_id):
    # Placeholder function to get detailed recipe information
    # Your colleague will implement this function
    # For now, we simulate fetching recipe details
    # In the real implementation, this will call the Spoonacular API
    print(f"Fetching details for recipe_id: {recipe_id}")
    # Simulated recipe details
    recipe_details = {
        'title': 'Sample Recipe',
        'extendedIngredients': [
            {'originalString': '1 cup of sample ingredient'},
            {'originalString': '2 tablespoons of another ingredient'}
        ],
        'instructions': '1. Do this.\n2. Do that.'
    }
    return recipe_details

def generate_recipe_conversational_response(recipe_details):
    # Prepare the message with recipe details
    title = recipe_details.get('title', 'Recipe')
    ingredients = [ing['originalString'] for ing in recipe_details.get('extendedIngredients', [])]
    instructions = recipe_details.get('instructions', 'No instructions available.')

    message_content = (
        f"Here are the details for **{title}**:\n\n"
        f"**Ingredients:**\n" + '\n'.join(ingredients) + "\n\n"
        f"**Instructions:**\n{instructions}\n\n"
        f"Feel free to ask any questions about this recipe or select another option."
    )

    # Prepare the messages for ChatCompletion
    messages = [
        {
            "role": "system",
            "content": "You are a helpful cooking assistant."
        },
        {
            "role": "user",
            "content": message_content
        }
    ]

    # Generate a response using OpenAI
    try:
        response = openai.chat.completions.create(
            model='gpt-3.5-turbo',
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )
        assistant_reply = response.choices[0].message.content.strip()
        return assistant_reply
    except Exception as e:
        print('Error in generate_recipe_conversational_response:', str(e))
        return f'An error occurred while generating the recipe response: {str(e)}'

if __name__ == '__main__':
    app.run(debug=True)
