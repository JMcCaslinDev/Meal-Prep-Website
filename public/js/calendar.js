document.addEventListener('DOMContentLoaded', function() {
  var navbarHeight = document.querySelector('nav').offsetHeight;
  var mainContent = document.getElementsByClassName('body');
  document.body.style.paddingTop = navbarHeight + 'px';

  const weekLabel = document.getElementById('week-label');
  const prevWeekButton = document.getElementById('prev-week');
  const nextWeekButton = document.getElementById('next-week');
  const saveButton = document.getElementById('save-button');

  let currentWeekNumber = moment().isoWeek();
  console.log("\nCurrentWeekNumber ", currentWeekNumber, "\n");
  let currentStartDate = '';
  let currentEndDate = '';
  let userRecipes = [];

  fetchAndPopulateRecipes();

  // Function to clear previous meal slots
  function clearMealSlots() {
    document.querySelectorAll('.meal-slot-container').forEach(slot => {
      slot.innerHTML = '';
    });
  }

  // Function to create a meal tag
  function createMealTag(dayIndex, meal) {
    const mealTag = document.createElement('div');
    mealTag.className = 'meal-tag';
    mealTag.setAttribute('data-day-index', dayIndex);

    const recipeSelect = document.createElement('select');
    recipeSelect.className = 'meal-recipe-select';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Pick a meal';
    defaultOption.selected = true;
    recipeSelect.appendChild(defaultOption);

    console.log("Creating meal tag for day index:", dayIndex);
    console.log("Meal object:", meal);

    console.log("\nuserRecipes: ", userRecipes, "\n");

    if (Array.isArray(userRecipes)) {
      userRecipes.forEach(recipe => {
        const option = document.createElement('option');
        option.value = recipe.id;
        option.textContent = recipe.recipeName;
        recipeSelect.appendChild(option);
        console.log("Added recipe option:", recipe.recipeName);
      });
    }

    if (meal && meal.recipeId) {
      recipeSelect.value = meal.recipeId;
      console.log("Selected recipe ID:", meal.recipeId);
    }

    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.className = 'meal-time-input';

    const timeSlot = new Date(meal.timeSlot);
    const hours = timeSlot.getHours().toString().padStart(2, '0');
    const minutes = timeSlot.getMinutes().toString().padStart(2, '0');
    timeInput.value = `${hours}:${minutes}`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'x';
    removeBtn.className = 'meal-remove-btn';
    removeBtn.onclick = function() {
      mealTag.remove();
    };

    const timeAndRemoveContainer = document.createElement('div');
    timeAndRemoveContainer.className = 'time-remove-container';
    timeAndRemoveContainer.appendChild(timeInput);
    timeAndRemoveContainer.appendChild(removeBtn);

    mealTag.appendChild(recipeSelect);
    mealTag.appendChild(timeAndRemoveContainer);

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
      console.log("Fetched user recipes:", userRecipes);
    } catch (error) {
      console.error('Failed to fetch recipes', error);
    }
  }

  // Fetch data from the backend to initialize the calendar
  async function fetchDataForWeek(weekNumber) {
    console.log("\ninside fetch data for week function\n");
    const response = await fetch(`/api/week-data?week=${weekNumber}`);
    const data = await response.json();
    console.log("Data fetched: ", data);
    if (data) {
      currentStartDate = data.startString;
      currentEndDate = data.endString;
      console.log("\ndata.startString: ", data.startString, "\n");
      console.log("\ndata.endString: ", data.endString, "\n");
      updateWeekLabel(currentStartDate, currentEndDate);
    }
    return data;
  }

  // Function to update the week label with the start and end dates
  function updateWeekLabel(startDate, endDate) {
    currentStartDate = startDate;
    currentEndDate = endDate;
    weekLabel.textContent = `${startDate}  -  ${endDate}`;
  }

  // Populate the calendar with the meal tags from the database of users chosen meals
  function populateCalendar(mealData) {
    console.log("\nEntered populateCalendar function\n");

    clearMealSlots();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const mealsByDay = {};
    mealData.forEach(meal => {
      const date = new Date(meal.timeSlot);
      const dayIndex = date.getDay();
      const dayName = days[dayIndex].toLowerCase();
      if (!mealsByDay[dayName]) {
        mealsByDay[dayName] = [];
      }
      mealsByDay[dayName].push(meal);
    });

    days.forEach((day, index) => {
      const mealSlot = document.getElementById(`meal-slot-${index}`);
      console.log(mealSlot);
      const meals = mealsByDay[day.toLowerCase()] || [];
      meals.forEach(meal => {
        createMealTag(index, meal);
      });
    });
  }

  // Function to send meal data to the server
  async function saveCalendar() {
    const meals = [];
    document.querySelectorAll('.day-column').forEach((column, index) => {
      const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(currentStartDate).getDay() + index % 7];
      const date = new Date(currentStartDate);
      date.setDate(date.getDate() + index);
      const dateString = date.toISOString().split('T')[0];

      column.querySelectorAll('.meal-tag').forEach(tag => {
        const recipeSelect = tag.querySelector('.meal-recipe-select');
        const timeInput = tag.querySelector('.meal-time-input');
        if (recipeSelect.value) {
          meals.push({
            recipeId: recipeSelect.value,
            timeSlot: `${dateString} ${timeInput.value}:00`
          });
        }
      });
    });

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
        console.log("\ncurrentStartDate: ", currentStartDate, "\n");
        console.log("\ncurrentEndDate: ", currentEndDate, "\n");
        updateShoppingList(currentStartDate, currentEndDate);
      } else {
        throw new Error('Failed to save meals');
      }
    } catch (error) {
      console.error('Error saving meals:', error);
    }
  }

  // Add the save button event listener
  saveButton.addEventListener('click', saveCalendar);

  // Navigate to previous or next week
  function navigateWeeks(weekNumber) {
    console.log("\nnavigateWeeks_weekNumber: ", weekNumber, "\n");
    fetchDataForWeek(weekNumber)
      .then(data => {
        console.log("navigateweeks_data: ", data, "\n");
        console.log("\nnavigateweeks_data.startString: ", data.startString, "\n");
        assignDatesToDays(data.startString);
        populateCalendar(data.meals);
      })
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
  navigateWeeks(currentWeekNumber);

  // Event listener for the Add Meal buttons
  document.querySelectorAll('.add-meal-button').forEach(button => {
    button.addEventListener('click', function() {
      const dayIndex = this.getAttribute('data-day');
      const defaultMeal = {
        recipeId: '',
        timeSlot: ''
      };
      createMealTag(dayIndex, defaultMeal);
    });
  });

  // assignDatesToDays function
  function assignDatesToDays(startDate) {
    console.log("Inside assignDatesToDays function:");

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const startOfTheWeek = new Date(startDate);

    days.forEach((day, index) => {
      let currentDay = new Date(startOfTheWeek);
      currentDay.setDate(currentDay.getDate() + index);
      let currentDayString = currentDay.getFullYear() + '-' +
        ('0' + (currentDay.getMonth() + 1)).slice(-2) + '-' +
        ('0' + currentDay.getDate()).slice(-2);

      const dayColumnId = 'day-' + day.toLowerCase();
      console.log("Looking for dayColumn with ID:", dayColumnId);

      const dayColumn = document.getElementById(dayColumnId);
      if (dayColumn) {
        console.log("dayColumn found:", dayColumn);
        dayColumn.setAttribute('data-date', currentDayString);
        console.log(currentDayString);
      } else {
        console.log("No element found for day:", day);
      }
    });
  }

  // Function to update the shopping list
  async function updateShoppingList(startDate, endDate) {
    try {
      const response = await fetch(`/api/updateShoppingList?startDate=${startDate}&endDate=${endDate}`, {
        method: 'POST',
      });
      if (response.ok) {
        console.log('Shopping list updated successfully');
      } else {
        console.error('Error updating shopping list:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating shopping list:', error);
    }
  }
});