// static/js/scripts.js

// List of common ingredients
const ingredients = [
    'Eggs', 'Milk', 'Flour', 'Sugar', 'Salt',
    'Butter', 'Chicken', 'Beef', 'Pork', 'Fish',
    'Rice', 'Pasta', 'Tomatoes', 'Onions', 'Garlic',
    'Carrots', 'Potatoes', 'Peppers', 'Cheese', 'Lettuce',
    'Mushrooms', 'Broccoli', 'Spinach', 'Zucchini', 'Cucumber',
    'Yogurt', 'Bread', 'Honey', 'Oats', 'Beans',
    'Lentils', 'Corn', 'Peas', 'Coconut Milk', 'Soy Sauce',
    'Vinegar', 'Olive Oil', 'Basil', 'Oregano', 'Thyme',
    'Parsley', 'Cilantro', 'Ginger', 'Lemon', 'Lime',
    'Chili Powder', 'Cinnamon', 'Nutmeg', 'Vanilla Extract', 'Cocoa Powder'
];

const selectedIngredients = [];

window.onload = function() {
    const grid = document.getElementById('ingredient-grid');
    ingredients.forEach(ingredient => {
        const div = document.createElement('div');
        div.className = 'ingredient';
        div.innerText = ingredient;
        div.onclick = () => {
            div.classList.toggle('selected');
            if (selectedIngredients.includes(ingredient)) {
                const index = selectedIngredients.indexOf(ingredient);
                selectedIngredients.splice(index, 1);
            } else {
                selectedIngredients.push(ingredient);
            }
        };
        grid.appendChild(div);
    });

    document.getElementById('find-recipes').onclick = () => {
        // Get additional ingredients from input
        const additionalInput = document.getElementById('additional-ingredients').value.trim();
        let additionalIngredients = [];

        if (additionalInput) {
            // Split the input by commas and clean up whitespace
            additionalIngredients = additionalInput.split(',').map(ing => ing.trim()).filter(ing => ing.length > 0);
        }

        // Combine selected ingredients and additional ingredients
        const allIngredients = selectedIngredients.concat(additionalIngredients);

        if (allIngredients.length === 0) {
            alert('Please select or enter at least one ingredient.');
            return;
        }

        fetch('/get_recipes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredients: allIngredients })
        })
        .then(response => response.json())
        .then(data => {
            const chatbotDiv = document.getElementById('chatbot');
            chatbotDiv.innerHTML = ''; // Clear previous content

            if (data.error) {
                const errorPara = document.createElement('p');
                errorPara.innerText = data.error;
                chatbotDiv.appendChild(errorPara);
                return;
            }

            const recipes = data.recipes;

            recipes.forEach(recipe => {
                const recipeDiv = document.createElement('div');
                recipeDiv.className = 'recipe';

                const title = document.createElement('h3');
                title.innerText = recipe.title;
                recipeDiv.appendChild(title);

                if (recipe.image) {
                    const image = document.createElement('img');
                    image.src = recipe.image;
                    image.alt = recipe.title;
                    image.className = 'recipe-image';
                    recipeDiv.appendChild(image);
                }

                const usedIngredients = recipe.usedIngredients.map(ing => ing.name).join(', ');
                const missedIngredients = recipe.missedIngredients.map(ing => ing.name).join(', ');

                const ingredientsPara = document.createElement('p');
                ingredientsPara.innerHTML = `<strong>Used Ingredients:</strong> ${usedIngredients}<br><strong>Missing Ingredients:</strong> ${missedIngredients}`;
                recipeDiv.appendChild(ingredientsPara);

                chatbotDiv.appendChild(recipeDiv);
            });
        })
        .catch(error => {
            console.error('Error:', error);
        });
    };
};
