// static/js/scripts.js

const ingredientCategories = {
    Vegetables: [
      "Tomato", "Onion", "Garlic", "Carrot", "Bell Pepper", "Mushroom",
      "Broccoli", "Spinach", "Cucumber", "Zucchini", "Corn", "Peas",
      "Beans", "Lettuce", "Cabbage", "Potato", "Sweet Potato", "Celery",
      "Eggplant", "Green Onion"
    ],
    Fruits: [
      "Apple", "Banana", "Orange", "Lemon", "Lime", "Avocado",
      "Strawberry", "Blueberry", "Pineapple", "Mango", "Grapes"
    ],
    Proteins: [
      "Chicken", "Beef", "Pork", "Fish", "Shrimp", "Tofu",
      "Bacon", "Sausage", "Turkey", "Salmon", "Lentils", "Chickpeas"
    ],
    Dairy: [
      "Cheese", "Milk", "Eggs", "Butter", "Yogurt", "Cream",
      "Ricotta", "Cottage Cheese"
    ],
    Grains: [
      "Rice", "Pasta", "Bread", "Flour", "Quinoa", "Oats"
    ],
    Condiments: [
      "Salt", "Pepper", "Basil", "Oregano", "Parsley", "Soy Sauce",
      "Vinegar", "Honey", "Chili", "Ketchup", "Mustard", "Mayonnaise"
    ],
    Sweeteners: ["Sugar", "Brown Sugar", "Maple Syrup", "Stevia"]
  };
  
  let selectedIngredients = [];
  let conversationContext = '';
  let allIngredients = [];
  let currentRecipes = [];
  
  document.addEventListener('DOMContentLoaded', function() {
    const savedSelections = localStorage.getItem('chefbotSelections');
    let savedPreferences = {};
    if (savedSelections) {
      const parsed = JSON.parse(savedSelections);
      selectedIngredients = parsed.selectedIngredients || [];
      savedPreferences = parsed.preferences || {};
    }
  
    document.getElementById('vegan').checked = !!savedPreferences.vegan;
    document.getElementById('gluten-free').checked = !!savedPreferences.glutenFree;
    document.getElementById('dairy-free').checked = !!savedPreferences.dairyFree;
    document.getElementById('nut-free').checked = !!savedPreferences.nutFree;
  
    // Populate ingredient badges
    const ingredientCategoriesDiv = document.getElementById('ingredient-categories');
    Object.keys(ingredientCategories).forEach(category => {
      const colDiv = document.createElement('div');
      colDiv.className = 'col-md-4 mb-3';
  
      const cardDiv = document.createElement('div');
      cardDiv.className = 'card h-100';
  
      const cardBody = document.createElement('div');
      cardBody.className = 'card-body';
  
      const categoryTitle = document.createElement('h5');
      categoryTitle.innerText = category;
      categoryTitle.className = 'card-title text-center';
      cardBody.appendChild(categoryTitle);
  
      ingredientCategories[category].forEach(ingredient => {
        const badge = document.createElement('span');
        if (selectedIngredients.includes(ingredient)) {
          badge.className = 'badge bg-success m-1';
        } else {
          badge.className = 'badge bg-secondary m-1';
        }
        badge.style.cursor = 'pointer';
        badge.innerText = ingredient;
  
        badge.onclick = () => {
          if (selectedIngredients.includes(ingredient)) {
            selectedIngredients = selectedIngredients.filter(i => i !== ingredient);
            badge.className = 'badge bg-secondary m-1';
          } else {
            selectedIngredients.push(ingredient);
            badge.className = 'badge bg-success m-1';
          }
          persistSelectionsToLocalStorage();
        };
  
        cardBody.appendChild(badge);
      });
  
      cardDiv.appendChild(cardBody);
      colDiv.appendChild(cardDiv);
      ingredientCategoriesDiv.appendChild(colDiv);
    });
  
    // Attach events to preference checkboxes
    document.getElementById('vegan').onchange = persistSelectionsToLocalStorage;
    document.getElementById('gluten-free').onchange = persistSelectionsToLocalStorage;
    document.getElementById('dairy-free').onchange = persistSelectionsToLocalStorage;
    document.getElementById('nut-free').onchange = persistSelectionsToLocalStorage;
  
    // "Find Recipes" button
    const findRecipesButton = document.getElementById('find-recipes');
    findRecipesButton.onclick = () => {
      const vegan = document.getElementById('vegan');
      const glutenFree = document.getElementById('gluten-free');
      const dairyFree = document.getElementById('dairy-free');
      const nutFree = document.getElementById('nut-free');
  
      const additionalInput = document.getElementById('additional-ingredients').value.trim();
      let additionalIngredients = [];
      if (additionalInput) {
        additionalIngredients = additionalInput
          .split(',')
          .map(x => x.trim())
          .filter(x => x.length > 0);
      }
  
      allIngredients = selectedIngredients.concat(additionalIngredients);
      if (allIngredients.length === 0) {
        alert('Please select or enter at least one ingredient.');
        return;
      }
  
      const dietaryPreferences = {
        vegan: vegan.checked,
        glutenFree: glutenFree.checked,
        dairyFree: dairyFree.checked,
        nutFree: nutFree.checked
      };
  
      showLoadingBubble();
  
      fetch('/get_recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: allIngredients,
          preferences: dietaryPreferences
        })
      })
      .then(res => res.json())
      .then(data => {
        removeLoadingBubble();
  
        const chatbotDiv = document.getElementById('chatbot');
        chatbotDiv.style.display = 'block';
  
        const chatMessagesDiv = document.getElementById('chat-messages');
        chatMessagesDiv.innerHTML = ''; // Clear old content
  
        if (data.error) {
          addAssistantMessage(data.error);
          return;
        }
  
        currentRecipes = data.recipes;
        displayRecipesInChat(currentRecipes);
  
        addChatInputField();
        initChatSuggestions();
      })
      .catch(err => {
        removeLoadingBubble();
        console.error(err);
      });
    };
  });
  
  function persistSelectionsToLocalStorage() {
    const preferences = {
      vegan: document.getElementById('vegan').checked,
      glutenFree: document.getElementById('gluten-free').checked,
      dairyFree: document.getElementById('dairy-free').checked,
      nutFree: document.getElementById('nut-free').checked
    };
    const dataToSave = {
      selectedIngredients: selectedIngredients,
      preferences: preferences
    };
    localStorage.setItem('chefbotSelections', JSON.stringify(dataToSave));
  }
  
  /** Show a temporary "Assistant: Loading..." bubble */
  function showLoadingBubble() {
    const chatbotDiv = document.getElementById('chatbot');
    chatbotDiv.style.display = 'block';
  
    const chatMessagesDiv = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble assistant-bubble';
    bubble.id = 'loading-bubble';
    bubble.innerText = 'Assistant: Loading...';
    chatMessagesDiv.appendChild(bubble);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
  }
  
  /** Remove the "Loading..." bubble if it exists */
  function removeLoadingBubble() {
    const bubble = document.getElementById('loading-bubble');
    if (bubble) bubble.remove();
  }
  
  /** Add an assistant bubble */
  function addAssistantMessage(text) {
    const chatMessagesDiv = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble assistant-bubble';
    bubble.innerHTML = text.replace(/\n/g, '<br>');
    chatMessagesDiv.appendChild(bubble);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
  }
  
  /** Add a user bubble */
  function addUserMessage(text) {
    const chatMessagesDiv = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user-bubble';
    bubble.innerHTML = text.replace(/\n/g, '<br>');
    chatMessagesDiv.appendChild(bubble);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
  }
  
  /** Display recipes with "Choose" and "See more" */
  function displayRecipesInChat(recipes) {
    const chatMessagesDiv = document.getElementById('chat-messages');
    chatMessagesDiv.innerHTML = '';
  
    if (!recipes || recipes.length === 0) {
      addAssistantMessage("No recipes found.");
      return;
    }
  
    recipes.forEach((recipe) => {
      const recipeId = recipe.id;
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble assistant-bubble';
  
      const missed = recipe.missedIngredients || [];
      let missedText = '';
      if (missed.length > 0) {
        const names = missed.map(m => m.name).join(', ');
        missedText = ` (Missing: ${names})`;
      }
  
      const uniqueId = `servings-${recipeId}`;
      bubble.innerHTML = `
        <strong>${recipe.title}</strong> ${missedText}
        <br>
        <label for="${uniqueId}" class="form-label mt-2" style="font-size: 0.9em;">Servings:</label>
        <input type="number" id="${uniqueId}" min="1" value="2" style="width: 60px; margin-right: 5px;">
        <button class="btn btn-sm btn-secondary" onclick="chooseRecipe('${recipeId}', '${uniqueId}')">
          Choose
        </button>
        <button class="btn btn-sm btn-primary ms-2" onclick="seeMoreRecipe('${recipeId}')">
          See more
        </button>
      `;
      chatMessagesDiv.appendChild(bubble);
    });
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
  }
  
  /** Called when user clicks "Choose" */
  function chooseRecipe(recipeId, servingsInputId) {
    const servingsInput = document.getElementById(servingsInputId);
    let servings = 2;
    if (servingsInput) {
      servings = parseInt(servingsInput.value, 10) || 2;
    }
    addUserMessage(`Choosing recipe #${recipeId} for ${servings} servings...`);
  
    showLoadingBubble();
    fetch('/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `CHOOSE_RECIPE_${recipeId}__SERVINGS_${servings}`,
        context: conversationContext,
        ingredients: allIngredients
      })
    })
    .then(res => res.json())
    .then(data => {
      removeLoadingBubble();
      if (data.error) {
        addAssistantMessage(data.error);
        return;
      }
      if (data.reply) {
        addAssistantMessage(data.reply);
      }
      if (data.context) {
        conversationContext = data.context;
      }
    })
    .catch(err => {
      removeLoadingBubble();
      console.error(err);
    });
  }
  
  /** "See more" => fetch minimal info from /see_more, show in a Bootstrap modal */
  function seeMoreRecipe(recipeId) {
    showLoadingBubble();
    fetch('/see_more', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe_id: recipeId, servings: 2 })
    })
    .then(res => res.json())
    .then(data => {
      removeLoadingBubble();
      if (data.error) {
        alert(data.error);
        return;
      }
      const info = data.info;
      const modalTitle = document.getElementById('seeMoreModalTitle');
      const modalBody = document.getElementById('seeMoreModalBody');
  
      modalTitle.textContent = info.title;
      const ingHtml = info.ingredients.map(ing => `<li>${ing}</li>`).join('');
      const macrosHtml = info.macros.replace(/\n/g, '<br>');
  
      modalBody.innerHTML = `
        <p><strong>Servings:</strong> ${info.servings}</p>
        <p><strong>Ingredients:</strong></p>
        <ul>${ingHtml}</ul>
        <p><strong>Macros:</strong><br>${macrosHtml}</p>
      `;
  
      const myModal = new bootstrap.Modal(document.getElementById('seeMoreModal'), {});
      myModal.show();
    })
    .catch(err => {
      removeLoadingBubble();
      console.error(err);
    });
  }
  
  /** Provide user input field + "send" button */
  function addChatInputField() {
    const inputContainer = document.getElementById('input-container');
    inputContainer.innerHTML = '';
  
    const rowDiv = document.createElement('div');
    rowDiv.className = 'd-flex';
  
    const userInput = document.createElement('input');
    userInput.type = 'text';
    userInput.className = 'form-control';
    userInput.id = 'user-input';
    userInput.placeholder = 'Type your message...';
  
    const sendBtn = document.createElement('button');
    sendBtn.className = 'btn btn-success ms-2';
    sendBtn.innerText = 'Send';
  
    rowDiv.appendChild(userInput);
    rowDiv.appendChild(sendBtn);
    inputContainer.appendChild(rowDiv);
  
    sendBtn.onclick = () => {
      const message = userInput.value.trim();
      if (message) {
        addUserMessage(message);
        sendMessageToChatbot(message);
        userInput.value = '';
      }
    };
  }
  
  /** Provide two suggestions */
  function initChatSuggestions() {
    const chatSuggestions = document.getElementById('chat-suggestions');
    chatSuggestions.innerHTML = '';
  
    // 1) "I want new recipes" => calls fresh_call=True => random sort
    const btn1 = document.createElement('button');
    btn1.className = 'btn btn-outline-primary btn-sm me-2';
    btn1.innerText = 'I want new recipes';
    btn1.onclick = () => {
      addUserMessage('I want new recipes');
      showLoadingBubble();
      fetch('/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'I want new recipes',
          context: conversationContext,
          ingredients: allIngredients
        })
      })
      .then(res => res.json())
      .then(data => {
        removeLoadingBubble();
        if (data.error) {
          addAssistantMessage(data.error);
          return;
        }
        if (data.reply) addAssistantMessage(data.reply);
        if (data.recipes) displayRecipesInChat(data.recipes);
        if (data.context) conversationContext = data.context;
      })
      .catch(err => {
        removeLoadingBubble();
        console.error(err);
      });
    };
  
    // 2) "I only want recipes with ingredients I have" => uses fresh_call=False => strict check
    const btn2 = document.createElement('button');
    btn2.className = 'btn btn-outline-primary btn-sm';
    btn2.innerText = 'I only want recipes with ingredients I have';
    btn2.onclick = () => {
      addUserMessage('I only want recipes with ingredients I have');
      showLoadingBubble();
      fetch('/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'I only want recipes with ingredients i have',
          context: conversationContext,
          ingredients: allIngredients
        })
      })
      .then(res => res.json())
      .then(data => {
        removeLoadingBubble();
        if (data.error) {
          addAssistantMessage(data.error);
          return;
        }
        if (data.reply) addAssistantMessage(data.reply);
        if (data.recipes) displayRecipesInChat(data.recipes);
        if (data.context) conversationContext = data.context;
      })
      .catch(err => {
        removeLoadingBubble();
        console.error(err);
      });
    };
  
    chatSuggestions.appendChild(btn1);
    chatSuggestions.appendChild(btn2);
  }
  
  /** If user types a random message => normal GPT conversation */
  function sendMessageToChatbot(message) {
    showLoadingBubble();
    fetch('/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        context: conversationContext,
        ingredients: allIngredients
      })
    })
    .then(res => res.json())
    .then(data => {
      removeLoadingBubble();
      if (data.error) {
        addAssistantMessage(data.error);
        return;
      }
      if (data.reply) {
        addAssistantMessage(data.reply);
      }
      if (data.context) {
        conversationContext = data.context;
      }
    })
    .catch(err => {
      removeLoadingBubble();
      console.error(err);
    });
  }
  