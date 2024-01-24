document.addEventListener('DOMContentLoaded', function() {
    const weekSelector = document.getElementById('week-select');
    const prevWeekButton = document.getElementById('prev-week');
    const nextWeekButton = document.getElementById('next-week');
    const saveButton = document.getElementById('save-button');
    const calendarContainer = document.querySelector('.calendar-container');
    
    // Fetch data from the backend to initialize the calendar
    async function fetchDataForWeek(weekNumber) {
      // Placeholder for fetching data logic, you'll need to implement the endpoint
      // This should return the data structure similar to what your backend sends to EJS
      const response = await fetch(`/api/week-data?week=${weekNumber}`);
      return await response.json();
    }
  
    // Populate the calendar with the meal tags
    function populateCalendar(mealData) {
      calendarContainer.innerHTML = ''; // Clear the current calendar
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      days.forEach(day => {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        dayColumn.appendChild(dayHeader);
        
        const meals = mealData[day.toLowerCase()] || [];
        meals.forEach(meal => {
          const mealTag = document.createElement('div');
          mealTag.className = 'meal-tag';
          mealTag.textContent = meal.recipeName;
          // Add any other data attributes you need here
          dayColumn.appendChild(mealTag);
        });
  
        calendarContainer.appendChild(dayColumn);
      });
    }
  
    // Add a new meal to a day
    function addMeal(day, meal) {
      // Implement logic to create and add a meal tag to the specified day
    }
    
    // Collect all meal data and send to the backend
    async function saveCalendar() {
      // Collect data from the meal tags or inputs
      const meals = {};
      document.querySelectorAll('.day-column').forEach(column => {
        const day = column.querySelector('.day-header').textContent.toLowerCase();
        const mealTags = column.querySelectorAll('.meal-tag');
        meals[day] = Array.from(mealTags).map(tag => tag.textContent); // Or any other attribute like data-id
      });
  
      // POST the data to the backend
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
  
    // Add event listeners
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
  