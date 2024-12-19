// static/js/scripts.js

// List of common ingredients
const ingredients = [
    "Tomato", "Onion", "Garlic", "Chicken", "Beef", "Pork", "Fish",
    "Rice", "Pasta", "Potato", "Carrot", "Bell Pepper", "Mushroom",
    "Cheese", "Milk", "Eggs", "Butter", "Flour", "Sugar", "Salt",
    "Pepper", "Basil", "Oregano", "Parsley", "Lemon", "Lime", "Apple",
    "Banana", "Orange", "Broccoli", "Spinach", "Cucumber", "Zucchini",
    "Corn", "Peas", "Beans", "Lettuce", "Cabbage", "Avocado", "Bacon",
    "Sausage", "Yogurt", "Cream", "Bread", "Shrimp", "Tofu", "Soy Sauce",
    "Vinegar", "Honey", "Chili"
];

const selectedIngredients = [];
let conversationContext = ''; // To maintain conversation context
let allIngredients = []; // To store all ingredients

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
        allIngredients = selectedIngredients.concat(additionalIngredients);

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

            // Store current recipes
            currentRecipes = data.recipes;

            // Display the conversational response
            const conversationPara = document.createElement('p');
            conversationPara.innerText = data.conversation;
            chatbotDiv.appendChild(conversationPara);

            // Save the context for further conversation
            conversationContext = data.conversation;

            // Add an input field and button for user to respond
            addChatInputField(chatbotDiv, allIngredients);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    };
};

function addChatInputField(container, ingredients) {
    const userInput = document.createElement('input');
    userInput.type = 'text';
    userInput.id = 'user-input';
    userInput.placeholder = 'Enter your choice or ask a question...';

    const sendButton = document.createElement('button');
    sendButton.id = 'send-button';
    sendButton.innerText = 'Send';

    const inputContainer = document.createElement('div');
    inputContainer.id = 'input-container';
    inputContainer.appendChild(userInput);
    inputContainer.appendChild(sendButton);

    container.appendChild(inputContainer);

    sendButton.onclick = () => {
        const userMessage = userInput.value.trim();
        if (userMessage) {
            handleUserMessage(userMessage, ingredients);
            userInput.value = '';
        }
    };
}

function handleUserMessage(message, ingredients) {
    const chatbotDiv = document.getElementById('chatbot');

    // Display user's message
    const userPara = document.createElement('p');
    userPara.innerHTML = `<strong>You:</strong> ${message}`;
    chatbotDiv.appendChild(userPara);

    // Prepare data to send to the backend
    let dataToSend = {
        message: message,
        context: conversationContext,
        ingredients: ingredients
    };

    // Check if the message is a recipe selection
    const recipeNumber = parseInt(message);
    if (!isNaN(recipeNumber) && recipeNumber >= 1 && recipeNumber <= 5) {
        const selectedRecipe = currentRecipes[recipeNumber - 1];
        const recipeId = selectedRecipe.id;

        // Include the recipe ID in the data
        dataToSend.recipe_id = recipeId;
    }

    // Send the message to the backend
    fetch('/chatbot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            const errorPara = document.createElement('p');
            errorPara.innerText = data.error;
            chatbotDiv.appendChild(errorPara);
            return;
        }

        // Display assistant's reply with proper formatting
        const assistantPara = document.createElement('p');
        assistantPara.innerHTML = `<strong>Assistant:</strong> ${data.reply.replace(/\n/g, '<br>')}`;
        chatbotDiv.appendChild(assistantPara);

        // Update conversation context
        conversationContext = data.context;

        // Scroll to the bottom of the chatbot div
        chatbotDiv.scrollTop = chatbotDiv.scrollHeight;
    })
    .catch(error => {
        console.error('Error:', error);
    });
}