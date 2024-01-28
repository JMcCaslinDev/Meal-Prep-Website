document.addEventListener('DOMContentLoaded', function() {
  const weekSelector = document.getElementById('week-select');
  const prevWeekButton = document.getElementById('prev-week');
  const nextWeekButton = document.getElementById('next-week');
  const saveButton = document.getElementById('save-button');
  let userRecipes = []; // This will hold the fetched recipes

  // Function to clear previous meal slots
  function clearMealSlots() {
    document.querySelectorAll('.meal-slot-container').forEach(slot => {
      slot.innerHTML = '';
    });
  }

// Function to create a meal tag
function createMealTag(dayIndex) {
  const mealTag = document.createElement('div');
  mealTag.className = 'meal-tag';
  mealTag.setAttribute('data-day-index', dayIndex);

  // Create a dropdown for selecting recipes
  const recipeSelect = document.createElement('select');
  recipeSelect.className = 'meal-recipe-select';
  
  // Add a default "not selected" option
  const defaultOption = document.createElement('option');
  defaultOption.value = ''; // Set to an empty string which could represent null
  defaultOption.textContent = 'Pick a meal'; // Text for the default option
  defaultOption.selected = true; // Make this option selected by default
  recipeSelect.appendChild(defaultOption);

  // Add recipe options to the dropdown
  userRecipes.forEach(recipe => {
    const option = document.createElement('option');
    option.value = recipe.recipeId;
    option.textContent = recipe.recipeName;
    recipeSelect.appendChild(option);
  });

    // Create a time input
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.className = 'meal-time-input';

    // Create a remove button for the meal tag
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'x';
    removeBtn.className = 'meal-remove-btn';
    removeBtn.onclick = function() {
      mealTag.remove();
    };

    // Adjust the DOM structure for the meal tag to meet the new layout requirements
    const timeAndRemoveContainer = document.createElement('div');
    timeAndRemoveContainer.className = 'time-remove-container';
    timeAndRemoveContainer.appendChild(timeInput);
    timeAndRemoveContainer.appendChild(removeBtn);

    mealTag.appendChild(recipeSelect);
    mealTag.appendChild(timeAndRemoveContainer); // Append the new container

    const mealSlotContainer = document.getElementById(`meal-slot-${dayIndex}`);
    
    if (mealSlotContainer) {
      mealSlotContainer.appendChild(mealTag);
    } else {
      console.error('mealSlotContainer not found for dayIndex:', dayIndex);
    }
  }

  // Fetch recipes from the backend and populate the dropdowns
  async function fetchAndPopulateRecipes() {
    try {
      const response = await fetch('/api/user-recipes');
      userRecipes = await response.json();
      // Call a function to populate the recipe selects if needed
    } catch (error) {
      console.error('Failed to fetch recipes', error);
    }
  }

  // Fetch data from the backend to initialize the calendar
  async function fetchDataForWeek(weekNumber) {
    const response = await fetch(`/api/week-data?week=${weekNumber}`);
    return await response.json();
  }

  // Populate the calendar with the meal tags
  function populateCalendar(mealData) {
    clearMealSlots(); // Clear only the meal slots
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach((day, index) => {
      const mealSlot = document.getElementById(`meal-slot-${index}`);
      const meals = mealData[day.toLowerCase()] || [];
      meals.forEach(meal => {
        createMealTag(index); // Updated to create a tag for each meal
      });
    });
  }

  // Collect all meal data and send to the backend
  async function saveCalendar() {
    const meals = {};
    document.querySelectorAll('.meal-slot-container').forEach((slot, index) => {
      const day = days[index].toLowerCase();
      meals[day] = [];
      slot.querySelectorAll('.meal-tag').forEach(tag => {
        const recipeId = tag.querySelector('.meal-recipe-select').value;
        const time = tag.querySelector('.meal-time-input').value;
        meals[day].push({ recipeId, time });
      });
    });

    const response = await fetch('/weekRecipes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ meals })
    });

    if(response.ok) {
      console.log('Meals saved successfully');
    } else {
      console.error('Failed to save meals');
    }
  }

  // Navigate to previous or next week
  function navigateWeeks(weekNumber) {
    fetchDataForWeek(weekNumber)
      .then(mealData => populateCalendar(mealData))
      .catch(error => console.error('Failed to fetch week data', error));
  }

  // Initial calendar setup
  fetchDataForWeek(weekSelector.value)
    .then(mealData => populateCalendar(mealData))
    .catch(error => console.error('Failed to initialize calendar', error));

  // Add event listeners to week navigation buttons
  prevWeekButton.addEventListener('click', () => {
    weekSelector.value = parseInt(weekSelector.value) - 1;
    navigateWeeks(weekSelector.value);
  });

  nextWeekButton.addEventListener('click', () => {
    weekSelector.value = parseInt(weekSelector.value) + 1;
    navigateWeeks(weekSelector.value);
  });

  weekSelector.addEventListener('change', () => {
    navigateWeeks(weekSelector.value);
  });

  // Event listener for the Add Meal buttons
  document.querySelectorAll('.add-meal-button').forEach(button => {
    button.addEventListener('click', function() {
      const dayIndex = this.getAttribute('data-day');
      createMealTag(dayIndex);
    });
  });

  saveButton.addEventListener('click', saveCalendar);

  // Call this function on page load to populate the recipe dropdowns
  fetchAndPopulateRecipes();
});