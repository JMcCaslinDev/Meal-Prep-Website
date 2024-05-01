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

  function clearMealSlots() {
    document.querySelectorAll('.meal-slot-container').forEach(slot => {
      slot.innerHTML = '';
    });
  }

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

    if (Array.isArray(userRecipes)) {
      userRecipes.forEach(recipe => {
        const option = document.createElement('option');
        option.value = recipe.id;
        option.textContent = recipe.recipeName;
        recipeSelect.appendChild(option);
      });
    }

    if (meal && meal.recipeId) {
      recipeSelect.value = meal.recipeId;
    }

    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.className = 'meal-time-input';

    // Parsing the time in local timezone
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
      console.error('MealSlotContainer not found for dayIndex:', dayIndex);
    }
  }

  async function fetchAndPopulateRecipes() {
    try {
      const response = await fetch('/api/user-recipes');
      userRecipes = await response.json();
    } catch (error) {
      console.error('Failed to fetch recipes', error);
    }
  }

  async function fetchDataForWeek(weekNumber) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const response = await fetch(`/api/week-data?week=${weekNumber}&timezone=${timezone}`);
    const data = await response.json();
    if (data) {
      currentStartDate = data.startString;
      currentEndDate = data.endString;
      console.log("\ncurrentStartDate: ", currentStartDate, "\n");
      console.log("\ncurrentEndDate: ", currentEndDate, "\n");
      updateWeekLabel(currentStartDate, currentEndDate);
    }
    return data;
  }

  function updateWeekLabel(startDate, endDate) {
    weekLabel.textContent = `${startDate} - ${endDate}`;
  }

  function populateCalendar(mealData) {
    clearMealSlots();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    mealData.forEach(meal => {
      const date = new Date(meal.timeSlot);
      const dayIndex = date.getDay();
      const adjustedDayIndex = (dayIndex + 6) % 7; // Adjust day index to match Monday as the first day

      const mealSlot = document.getElementById(`meal-slot-${adjustedDayIndex}`);
      createMealTag(adjustedDayIndex, meal);
    });
  }

  async function saveCalendar() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
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
          meals: meals,
          timezone: timezone
        })
      });

      if (response.ok) {
        console.log('Meals saved successfully');
        updateShoppingList(currentStartDate, currentEndDate);
      } else {
        throw new Error('Failed to save meals');
      }
    } catch (error) {
      console.error('Error saving meals:', error);
    }
  }

  saveButton.addEventListener('click', saveCalendar);

  function navigateWeeks(weekNumber) {
    fetchDataForWeek(weekNumber)
      .then(data => {
        assignDatesToDays(data.startString);
        populateCalendar(data.meals);
      })
      .catch(error => console.error('Failed to fetch week data', error));
  }

  prevWeekButton.addEventListener('click', () => {
    currentWeekNumber -= 1;
    navigateWeeks(currentWeekNumber);
  });

  nextWeekButton.addEventListener('click', () => {
    currentWeekNumber += 1;
    navigateWeeks(currentWeekNumber);
  });

  navigateWeeks(currentWeekNumber);

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

  function assignDatesToDays(startDate) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const startOfTheWeek = new Date(startDate);
  
    days.forEach((day, index) => {
      let currentDay = new Date(startOfTheWeek);
      currentDay.setDate(currentDay.getDate() + index);
      let currentDayString = currentDay.getFullYear() + '-' +
        ('0' + (currentDay.getMonth() + 1)).slice(-2) + '-' + 
        ('0' + currentDay.getDate()).slice(-2);
  
      const dayColumnId = 'day-' + day.toLowerCase();
      const dayColumn = document.getElementById(dayColumnId);
      if (dayColumn) {
        dayColumn.setAttribute('data-date', currentDayString);
      }
    });
  }

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
