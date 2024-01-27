document.addEventListener('DOMContentLoaded', function() {
  const weekSelector = document.getElementById('week-select');
  const prevWeekButton = document.getElementById('prev-week');
  const nextWeekButton = document.getElementById('next-week');
  const saveButton = document.getElementById('save-button');
  
  // Function to clear previous meal slots
  function clearMealSlots() {
      document.querySelectorAll('.meal-slot-container').forEach(slot => {
          slot.innerHTML = '';
      });
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
              const mealTag = document.createElement('div');
              mealTag.className = 'meal-tag';
              mealTag.textContent = meal.recipeName;
              mealSlot.appendChild(mealTag);
          });
      });
  }

  // Add a new meal to a day
  function addMeal(day, meal) {
      // This function should create a meal tag and append it to the corresponding day's meal slot container
  }
  

  // Collect all meal data and send to the backend
  async function saveCalendar() {
      const meals = {};
      document.querySelectorAll('.day-column').forEach((column, index) => {
          const day = days[index].toLowerCase();
          const mealTags = column.querySelectorAll('.meal-tag');
          meals[day] = Array.from(mealTags).map(tag => tag.textContent);
      });

      const response = await fetch('/weekRecipes', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(meals)
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

  saveButton.addEventListener('click', saveCalendar);
});
