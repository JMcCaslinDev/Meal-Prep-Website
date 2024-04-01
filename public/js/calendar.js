document.addEventListener('DOMContentLoaded', function() {

  var navbarHeight = document.querySelector('nav').offsetHeight;
  var mainContent = document.getElementsByClassName('body');
  document.body.style.paddingTop = navbarHeight + 'px';

  const weekLabel = document.getElementById('week-label');
  const prevWeekButton = document.getElementById('prev-week');
  const nextWeekButton = document.getElementById('next-week');
  const saveButton = document.getElementById('save-button');

  // let specificDate = moment("2024-03-24");
  // let currentWeekNumber = specificDate.isoWeek();

  let currentWeekNumber = moment().isoWeek();
  console.log("\nCurrentWeekNumber ", currentWeekNumber, "\n")
  let currentStartDate = ''; // To store the current start date of the week
  let currentEndDate = ''; // To store the current end date of the week
  let userRecipes = []; // This will hold the fetched recipes

  if (fetchAndPopulateRecipes()){
    console.log("\nTrying to set recipes for page load dropdown lists.\n")
    userRecipes = fetchAndPopulateRecipes()
  }
    
  

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
  
    // Create a dropdown for selecting recipes
    const recipeSelect = document.createElement('select');
    recipeSelect.className = 'meal-recipe-select';
  
    // Add a default "not selected" option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Pick a meal';
    defaultOption.selected = true;
    recipeSelect.appendChild(defaultOption);
  
    console.log("Creating meal tag for day index:", dayIndex);
    console.log("Meal object:", meal);

    console.log("\nuserRecipes: ", userRecipes, "\n");
    // Add recipe options to the dropdown
    userRecipes.forEach(recipe => {
      const option = document.createElement('option');
      option.value = recipe.id;
      option.textContent = recipe.recipeName;
      recipeSelect.appendChild(option);
      console.log("Added recipe option:", recipe.recipeName);
    });
  
    // Set the selected recipe in the dropdown based on the meal's recipeId (if available)
    if (meal && meal.recipeId) {
      recipeSelect.value = meal.recipeId;
      console.log("Selected recipe ID:", meal.recipeId);
    }

  
    // Create a time input
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.className = 'meal-time-input';
  
    // Set the time input value based on the meal's timeSlot
    const timeSlot = new Date(meal.timeSlot);
    const hours = timeSlot.getHours().toString().padStart(2, '0');
    const minutes = timeSlot.getMinutes().toString().padStart(2, '0');
    timeInput.value = `${hours}:${minutes}`;
  
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
      console.log("Fetched user recipes:", userRecipes); 
      // Call a function to populate the recipe selects if needed
    } catch (error) {
      console.error('Failed to fetch recipes', error);
    }
  }


  // Fetch data from the backend to initialize the calendar
  async function fetchDataForWeek(weekNumber) {
    console.log("\ninside fetch data for week function\n");
    const response = await fetch(`/api/week-data?week=${weekNumber}`);
    const data = await response.json();
    console.log("Data fetched: ", data); // To see the actual fetched data
    if (data) {
      currentStartDate = data.startString; // Update the current start date
      currentEndDate = data.endString; // Update the current end date
      console.log("\ndata.startString: ", data.startString, "\n");
      console.log("\ndata.endString: ", data.endString, "\n");
      updateWeekLabel(currentStartDate, currentEndDate); // Update the week label
    }
    return data; // Make sure to return the data
  }




  // Function to update the week label with the start and end dates
  function updateWeekLabel(startDate, endDate) {
    currentStartDate = startDate; // Update the current start date
    currentEndDate = endDate; // Update the current end date
    weekLabel.textContent = `${startDate}  -  ${endDate}`;
  }


  // Populate the calendar with the meal tags from the database of users choosen meals
  function populateCalendar(mealData) {
    console.log("\nEntered populateCalendar function\n");
  
    clearMealSlots();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
    const mealsByDay = {};
    mealData.forEach(meal => {
      const date = new Date(meal.timeSlot);
      const dayIndex = date.getDay();
      const adjustedDayIndex = (dayIndex + 6) % 7; // Adjust the day index to match your calendar order
      const dayName = days[adjustedDayIndex].toLowerCase();
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
      // Call the function to update the shopping list
      updateShoppingList(currentStartDate, currentEndDate);
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
    console.log("\nnavigateWeeks_weekNumber: ", weekNumber, "\n" )
    fetchDataForWeek(weekNumber)
      .then(data => {
        console.log("navigateweeks_data: ", data, "\n")
        console.log("\nnavigateweeks_data.startString: ", data.startString, "\n")
        assignDatesToDays(data.startString); // Assign the new dates to the day columns
        populateCalendar(data.meals); // Populate the calendar with meals for these dates
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
  navigateWeeks(currentWeekNumber); // This will fetch and display the current week

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


  // This function will update the day columns with the correct date for each day of the week
  function assignDatesToDays(startDate) {
    console.log("Inside assignDatesToDays function:");
    
    // Adjust startDate to be a Monday
    const tempDate = new Date(startDate);
    // If startDate is not a Monday, adjust it to the following Monday
    const dayOfWeek = tempDate.getDay();
    const distanceToMonday = (dayOfWeek === 0) ? 1 : (8 - dayOfWeek);
    tempDate.setDate(tempDate.getDate() + distanceToMonday);
    const startOfTheWeek = tempDate;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
        console.log(currentDayString); // This will log the value of currentDayString
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


  // function renderShoppingList(shoppingListItems) {
  //   const shoppingListContainer = document.getElementById('shoppingList');
  //   // Clear the existing shopping list
  //   shoppingListContainer.innerHTML = '';
  
  //   // Render the updated shopping list items
  //   shoppingListItems.forEach(item => {
  //     const listItem = document.createElement('li');
  //     listItem.textContent = `${item.ingredientName} - ${item.quantity} ${item.unit}`;
  //     shoppingListContainer.appendChild(listItem);
  //   });
  // }
  


  


  // Call this function on page load to populate the recipe dropdowns
  fetchAndPopulateRecipes();
});
