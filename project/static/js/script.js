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
        if (selectedIngredients.length === 0) {
            alert('Please select at least one ingredient.');
            return;
        }
        fetch('/get_recipes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredients: selectedIngredients })
        })
        .then(response => response.json())
        .then(data => {
            const chatbotDiv = document.getElementById('chatbot');
            const responsePara = document.createElement('p');
            responsePara.innerText = data.reply;
            chatbotDiv.appendChild(responsePara);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    };
};
