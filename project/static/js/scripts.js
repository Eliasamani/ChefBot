/*****************************************
 * Ingredient Categories
 *****************************************/
const ingredientCategories = {
    Vegetables: [
      "Tomato","Onion","Garlic","Carrot","Bell Pepper","Mushroom",
      "Broccoli","Spinach","Cucumber","Zucchini","Corn","Peas",
      "Beans","Lettuce","Cabbage","Potato","Sweet Potato","Celery",
      "Eggplant","Green Onion"
    ],
    Fruits: [
      "Apple","Banana","Orange","Lemon","Lime","Avocado",
      "Strawberry","Blueberry","Pineapple","Mango","Grapes"
    ],
    Proteins: [
      "Chicken","Beef","Pork","Fish","Shrimp","Tofu",
      "Bacon","Sausage","Turkey","Salmon","Lentils","Chickpeas"
    ],
    Dairy: [
      "Cheese","Milk","Eggs","Butter","Yogurt","Cream",
      "Ricotta","Cottage Cheese"
    ],
    Grains: [
      "Rice","Pasta","Bread","Flour","Quinoa","Oats"
    ],
    Condiments: [
      "Salt","Pepper","Basil","Oregano","Parsley","Soy Sauce",
      "Vinegar","Honey","Chili","Ketchup","Mustard","Mayonnaise"
    ],
    Sweeteners: [
      "Sugar","Brown Sugar","Maple Syrup","Stevia"
    ]
  };
  
  /*****************************************
   * Global Variables
   *****************************************/
  // The user’s selected ingredients from badges
  let selectedIngredients = [];
  // GPT conversation context for the /chatbot route
  let conversationContext = '';
  // Combined list of all ingredients: badges + any typed in
  let allIngredients = [];
  // Current list of recipe stubs from /get_recipes
  let currentRecipes = [];
  
  // For the modal: original unscaled recipe, and scaling state
  let modalOriginalRecipe = null;
  let modalCurrentServings = 2;
  let modalBaseServings = 2;
  
  /*****************************************
   * On DOM Loaded
   *****************************************/
  document.addEventListener('DOMContentLoaded', function() {
    // Load previous ingredient/prefs from localStorage
    const savedSelections = localStorage.getItem('chefbotSelections');
    let savedPreferences = {};
    if (savedSelections) {
      const parsed = JSON.parse(savedSelections);
      selectedIngredients = parsed.selectedIngredients || [];
      savedPreferences = parsed.preferences || {};
    }
  
    // Mark preference checkboxes
    document.getElementById('vegan').checked = !!savedPreferences.vegan;
    document.getElementById('gluten-free').checked = !!savedPreferences.glutenFree;
    document.getElementById('dairy-free').checked = !!savedPreferences.dairyFree;
    document.getElementById('nut-free').checked = !!savedPreferences.nutFree;
  
    // Dynamically populate ingredient badges
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
        badge.className = selectedIngredients.includes(ingredient)
          ? 'badge bg-success m-1'
          : 'badge bg-secondary m-1';
  
        badge.style.cursor = 'pointer';
        badge.innerText = ingredient;
  
        // On click, toggle in selectedIngredients
        badge.onclick = () => {
          if (selectedIngredients.includes(ingredient)) {
            // remove from array
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
  
    // Event handlers for preference checkboxes
    document.getElementById('vegan').onchange = persistSelectionsToLocalStorage;
    document.getElementById('gluten-free').onchange = persistSelectionsToLocalStorage;
    document.getElementById('dairy-free').onchange = persistSelectionsToLocalStorage;
    document.getElementById('nut-free').onchange = persistSelectionsToLocalStorage;
  
    // "Find Recipes" button => calls /get_recipes
    document.getElementById('find-recipes').onclick = () => {
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
        vegan: document.getElementById('vegan').checked,
        glutenFree: document.getElementById('gluten-free').checked,
        dairyFree: document.getElementById('dairy-free').checked,
        nutFree: document.getElementById('nut-free').checked
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
  
    // Clear All Button
    const clearButton = document.getElementById('clear-ingredients');
    if (clearButton) {
      clearButton.onclick = clearAllIngredients;
    }
  });
  
  /*****************************************
   * LocalStorage Persist
   *****************************************/
  function persistSelectionsToLocalStorage() {
    const preferences = {
      vegan: document.getElementById('vegan').checked,
      glutenFree: document.getElementById('gluten-free').checked,
      dairyFree: document.getElementById('dairy-free').checked,
      nutFree: document.getElementById('nut-free').checked
    };
    localStorage.setItem('chefbotSelections', JSON.stringify({
      selectedIngredients,
      preferences
    }));
  }
  
  function clearAllIngredients() {
    selectedIngredients = [];
    localStorage.removeItem('chefbotSelections');
    document.querySelectorAll('.badge.bg-success').forEach(badge => {
      badge.classList.remove('bg-success');
      badge.classList.add('bg-secondary');
    });
    document.getElementById('additional-ingredients').value = '';
    alert('All ingredients have been cleared.');
  }
  
  /*****************************************
   * Chat Display Helpers
   *****************************************/
  /** Show "Assistant: Loading..." bubble */
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
  
  /** Remove "Loading..." bubble */
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
  
  /*****************************************
   * Display Recipes in Chat
   *****************************************/
  function displayRecipesInChat(recipes) {
    const chatMessagesDiv = document.getElementById('chat-messages');
    chatMessagesDiv.innerHTML = '';
  
    if (!recipes || recipes.length === 0) {
      addAssistantMessage("No recipes found.");
      return;
    }
  
    recipes.forEach((recipe) => {
      const recipeId = recipe.id;
  
      // Unique input ID so each recipe has its own servings input
      const servingsInputId = `servings-${recipeId}`;
  
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble assistant-bubble';
      bubble.innerHTML = `
        <strong>${recipe.title}</strong><br>
        <label for="${servingsInputId}" class="form-label mt-2" style="font-size: 0.9em;">
          Servings:
        </label>
        <input type="number" id="${servingsInputId}" min="1" value="2"
               style="width: 60px; margin-right: 5px;">
        <button class="btn btn-sm btn-secondary" onclick="chooseRecipe('${recipeId}', '${servingsInputId}')">
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
  
  /*****************************************
   * Choose Recipe Button
   *****************************************/
  function chooseRecipe(recipeId, servingsInputId) {
    const servingsInput = document.getElementById(servingsInputId);
    let servings = parseInt(servingsInput.value, 10) || 2;
  
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
  
  /*****************************************
   * "See More" => Show in Modal with +/-
   *****************************************/
  function seeMoreRecipe(recipeId) {
    showLoadingBubble();
    fetch('/see_more', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe_id: recipeId })
    })
    .then(res => res.json())
    .then(data => {
      removeLoadingBubble();
      if (data.error) {
        alert(data.error);
        return;
      }
  
      // Store original unscaled recipe
      modalOriginalRecipe = structuredClone(data.info);
      modalCurrentServings = modalOriginalRecipe.servings || 2;
      modalBaseServings = modalOriginalRecipe.servings || 2;
  
      // Populate the modal
      updateModal();
      const myModal = new bootstrap.Modal(document.getElementById('seeMoreModal'), {});
      myModal.show();
    })
    .catch(err => {
      removeLoadingBubble();
      console.error(err);
    });
  }
  
  /** Re-render modal with scaled data */
  function updateModal() {
    if (!modalOriginalRecipe) return;
  
    const scaleFactor = modalCurrentServings / modalBaseServings;
  
    // Scale ingredients
    const scaledIngredients = modalOriginalRecipe.ingredients.map(ing =>
      scaleIngredientLine(ing, scaleFactor)
    );
  
    // Scale macros
    const scaledMacros = scaleMacros(modalOriginalRecipe.macros, scaleFactor);
  
    // DOM updates
    const modalTitle = document.getElementById('seeMoreModalTitle');
    modalTitle.textContent = modalOriginalRecipe.title || 'Untitled';
  
    const modalBody = document.getElementById('seeMoreModalBody');
    const ingHtml = scaledIngredients.map(ing => `<li>${ing}</li>`).join('');
    const macrosHtml = scaledMacros.replace(/\n/g, '<br>');
  
    modalBody.innerHTML = `
      <div class="d-flex justify-content-start align-items-center mb-2">
        <strong class="me-2">Servings:</strong>
        <button class="btn btn-sm btn-outline-secondary me-2" onclick="decrementServings()">-</button>
        <span id="servings-display">${modalCurrentServings}</span>
        <button class="btn btn-sm btn-outline-secondary ms-2" onclick="incrementServings()">+</button>
      </div>
      <p><strong>Ingredients:</strong></p>
      <ul>${ingHtml}</ul>
      <p><strong>Macros:</strong><br>${macrosHtml}</p>
      <p><strong>Instructions:</strong><br>${modalOriginalRecipe.instructions}</p>
    `;
  }
  
  /*****************************************
   * +/- Buttons in Modal
   *****************************************/
  function decrementServings() {
    if (modalCurrentServings > 1) {
      modalCurrentServings--;
      updateModal();
    }
  }
  
  function incrementServings() {
    modalCurrentServings++;
    updateModal();
  }
  
  /*****************************************
   * Scale a Single Ingredient Line
   *  e.g. "200g tofu" => "300g tofu" if scaleFactor=1.5
   *****************************************/
  function scaleIngredientLine(ingredientLine, scaleFactor) {
    // Matches a leading number (like 200 or 2.5) and captures the rest even if no space
    // e.g. "200g tofu" => [ "200g tofu", "200", "g tofu" ]
    // e.g. "1.5cups water" => [ "1.5cups water", "1.5", "cups water" ]
    const pattern = /^(\d+(?:\.\d+)?)(.*)$/;
    const match = ingredientLine.trim().match(pattern);
    if (!match) {
      // If not a match, return as-is
      return ingredientLine;
    }
  
    const originalAmount = parseFloat(match[1]);
    let rest = match[2]; // e.g. "g tofu" or " cups flour"
    const scaledAmount = (originalAmount * scaleFactor).toFixed(2);
  
    // Convert "3.00" => "3", "2.50" => "2.5"
    const cleanedAmount = parseFloat(scaledAmount).toString();
  
    // Optionally insert a space if there's none
    rest = rest.trim();
    if (rest && !rest.startsWith(' ')) {
      rest = ' ' + rest;
    }
  
    return `${cleanedAmount}${rest}`;
  }
  
  /*****************************************
   * Scale Macros
   *  e.g. "Calories: 100" => "Calories: 150" (1.5x)
   *****************************************/
  function scaleMacros(macrosLine, scaleFactor) {
    if (!macrosLine) return 'No macros data';
  
    const parts = macrosLine.split(',');
    const scaledParts = parts.map(p => {
      const trimmed = p.trim();
      const match = trimmed.match(/(.*?):\s*(\d+(?:\.\d+)?)(.*)/);
      if (!match) {
        return trimmed;
      }
      const label = match[1]; // e.g. "Calories"
      const value = parseFloat(match[2]) || 0; // e.g. 100
      const unit = match[3]; // e.g. "", or "g", or " mg"
      const newValue = (value * scaleFactor).toFixed(2);
      const cleaned = parseFloat(newValue).toString();
      return `${label}: ${cleaned}${unit}`;
    });
  
    return scaledParts.join(', ');
  }
  
  /*****************************************
   * Chat Input & Suggestions
   *****************************************/
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
  
  function initChatSuggestions() {
    const chatSuggestions = document.getElementById('chat-suggestions');
    chatSuggestions.innerHTML = '';
  
    // Suggestion #1: "I want new recipes"
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
        if (data.reply) {
          addAssistantMessage(data.reply);
        }
        if (data.recipes) {
          displayRecipesInChat(data.recipes);
        }
        if (data.context) {
          conversationContext = data.context;
        }
      })
      .catch(err => {
        removeLoadingBubble();
        console.error(err);
      });
    };
  
  
    chatSuggestions.appendChild(btn1);
  }
  
  /** Normal GPT conversation: user types => /chatbot => GPT reply */
  function sendMessageToChatbot(message) {
    showLoadingBubble();
    fetch('/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
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
  