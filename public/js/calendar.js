document.addEventListener('DOMContentLoaded', function() {
  const weekLabel = document.getElementById('week-label');
  const prevWeekButton = document.getElementById('prev-week');
  const nextWeekButton = document.getElementById('next-week');
  const saveButton = document.getElementById('save-button');
  let currentWeekNumber = 0; // You might want to set this to the current week number
  let currentStartDate = ''; // To store the current start date of the week
  let currentEndDate = ''; // To store the current end date of the week
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
    defaultOption.value = '';
    defaultOption.textContent = 'Pick a meal';
    defaultOption.selected = true;
    recipeSelect.appendChild(defaultOption);

    // Add recipe options to the dropdown
    userRecipes.forEach(recipe => {
      const option = document.createElement('option');
      option.value = recipe.id;
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
    const data = await response.json();
    updateWeekLabel(data.startString, data.endString); // Update the week label
    return data;
  }

  // Function to update the week label with the start and end dates
  function updateWeekLabel(startDate, endDate) {
    currentStartDate = startDate; // Update the current start date
    currentEndDate = endDate; // Update the current end date
    weekLabel.textContent = `${startDate}  -  ${endDate}`;
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





// Function to send meal data to the server
async function saveCalendar() {
  const meals = [];
  document.querySelectorAll('.day-column').forEach((column, index) => {
    const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(currentStartDate).getDay() + index % 7];
    const date = new Date(currentStartDate);
    date.setDate(date.getDate() + index); // Adjust date based on the day of the week
    const dateString = date.toISOString().split('T')[0]; // Format date as string

    column.querySelectorAll('.meal-tag').forEach(tag => {
      const recipeSelect = tag.querySelector('.meal-recipe-select');
      const timeInput = tag.querySelector('.meal-time-input');
      if (recipeSelect.value) { // Only add meals with a selected recipe
        meals.push({
          recipeId: recipeSelect.value,
          timeSlot: `${dateString} ${timeInput.value}:00` // Combine date and time
        });
      }
    });
  });

  // Send the meal data to the server
  try {
    const response = await fetch('/weekRecipes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        weekNumber: currentWeekNumber,
        startDate: currentStartDate,
        endDate: currentEndDate,
        meals: meals
      })
    });

    if (response.ok) {
      console.log('Meals saved successfully');
      // Additional success handling if needed
    } else {
      throw new Error('Failed to save meals');
    }
  } catch (error) {
    console.error('Error saving meals:', error);
    // Additional error handling if needed
  }
}

// Add the save button event listener
saveButton.addEventListener('click', saveCalendar);



  // Navigate to previous or next week
  function navigateWeeks(weekNumber) {
    fetchDataForWeek(weekNumber)
      .then(mealData => populateCalendar(mealData.meals))
      .catch(error => console.error('Failed to fetch week data', error));
  }

  // Add event listeners to week navigation buttons
  prevWeekButton.addEventListener('click', () => {
    currentWeekNumber -= 1;
    navigateWeeks(currentWeekNumber);
  });

  nextWeekButton.addEventListener('click', () => {
    currentWeekNumber += 1;
    navigateWeeks(currentWeekNumber);
  });

  // Initial calendar setup for the current week
  navigateWeeks(currentWeekNumber); // This will fetch and display the current week

  // Event listener for the Add Meal buttons
  document.querySelectorAll('.add-meal-button').forEach(button => {
    button.addEventListener('click', function() {
      const dayIndex = this.getAttribute('data-day');
      createMealTag(dayIndex);
    });
  });

  // Call this function on page load to populate the recipe dropdowns
  fetchAndPopulateRecipes();
});
