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
let conversationContext = ''; // To maintain conversation context

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

            // Display the conversational response
            const conversationPara = document.createElement('p');
            conversationPara.innerText = data.conversation;
            chatbotDiv.appendChild(conversationPara);

            // Save the context for further conversation
            conversationContext = data.conversation;

            // Add an input field and button for user to respond
            const userInput = document.createElement('input');
            userInput.type = 'text';
            userInput.id = 'user-input';
            userInput.placeholder = 'Enter your choice or ask a question...';

            const sendButton = document.createElement('button');
            sendButton.id = 'send-button';
            sendButton.innerText = 'Send';

            chatbotDiv.appendChild(userInput);
            chatbotDiv.appendChild(sendButton);

            sendButton.onclick = () => {
                const userMessage = userInput.value.trim();
                if (userMessage) {
                    sendMessageToChatbot(userMessage);
                    userInput.value = '';
                }
            };
        })
        .catch(error => {
            console.error('Error:', error);
        });
    };
};

function sendMessageToChatbot(message) {
    fetch('/chatbot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: message, context: conversationContext })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Chatbot Error:', data.error);
            return;
        }

        // Update the conversation context
        conversationContext = data.context;

        const chatbotDiv = document.getElementById('chatbot');

        // Display user's message
        const userPara = document.createElement('p');
        userPara.innerHTML = `<strong>You:</strong> ${message}`;
        chatbotDiv.appendChild(userPara);

        // Display assistant's reply
        const assistantPara = document.createElement('p');
        assistantPara.innerHTML = `<strong>Assistant:</strong> ${data.reply}`;
        chatbotDiv.appendChild(assistantPara);

        // Scroll to the bottom of the chatbot div
        chatbotDiv.scrollTop = chatbotDiv.scrollHeight;
    })
    .catch(error => {
        console.error('Error:', error);
    });
}
