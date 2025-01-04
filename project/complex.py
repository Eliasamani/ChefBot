import requests
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Retrieve API key from environment variables
SPOONACULAR_API_KEY = os.getenv('SPOONACULAR_API_KEY')

# Ingredients you want to search for
ingredients = ['milk', 'egg', 'pasta']

# Make the request to the Spoonacular API
base_url = 'https://api.spoonacular.com/recipes/complexSearch'
params = {
    'includeIngredients': ','.join(ingredients),  # Use 'includeIngredients' for complex search
    'number': 5,  # Number of recipes to return
    'ranking': 1,  # Rank by best match
    'apiKey': SPOONACULAR_API_KEY  # Your API key
}

# Send the GET request for search
response = requests.get(base_url, params=params)

# Check if the response is successful
if response.status_code == 200:
    # Get the list of recipe IDs from the search response
    recipes = response.json()['results']
    print(f"Found {len(recipes)} recipes. Fetching ingredients...\n")

    # Now fetch ingredients for each recipe by using the recipe ID
    for recipe in recipes:
        recipe_id = recipe['id']
        recipe_url = f'https://api.spoonacular.com/recipes/{recipe_id}/information'
        recipe_params = {
            'apiKey': SPOONACULAR_API_KEY,
            'includeNutrition': True, # Include nutrition information
            'addRecipeInstructions': True  
        }
        
        
        # Fetch detailed recipe information
        recipe_details = requests.get(recipe_url, params=recipe_params).json()

        # Print the recipe title, its ingredients, and nutrition information
        print(f"Recipe: {recipe_details['title']}")
        print("Ingredients:")
        for ingredient in recipe_details['extendedIngredients']:
            print(f" - {ingredient['original']}")
        print("Nutrition Information:")
        print(f" - Calories: {recipe_details['nutrition']['nutrients'][0]['amount']}")
        print(f" - Protein: {recipe_details['nutrition']['nutrients'][1]['amount']}")
        print(f" - Fat: {recipe_details['nutrition']['nutrients'][2]['amount']}")
        print(f" - Carbohydrates: {recipe_details['nutrition']['nutrients'][3]['amount']}")
        print("\n")
else:
    print(f"Error: {response.status_code} - {response.text}")