// shoppingList.js

$(document).ready(function () {
    const weekLabel = $('#week-label');
    const prevWeekButton = $('#prev-week');
    const nextWeekButton = $('#next-week');

    let currentWeekNumber = moment().isoWeek();
    let currentStartDate = '';
    let currentEndDate = '';

    // Function to render the shopping list
    function renderShoppingList(shoppingListItems) {
      const shoppingListContainer = $('#shoppingList');
      shoppingListContainer.empty(); // Clear the existing shopping list
  
      // Render the updated shopping list items
      shoppingListItems.forEach((item, index) => {
        const listItem = $('<div>', { class: 'card my-2' }).append(
          $('<ul>', { class: 'list-group list-group-flush' }).append(
            $('<li>', {
              class: `list-group-item d-flex justify-content-between align-items-center ${item.checked ? 'strikethrough' : ''}`,
              'data-shoppinglistid': item.id
            }).append(
              $('<div>', { class: 'form-check clickable-area' }).append(
                $('<input>', {
                  class: 'form-check-input',
                  type: 'checkbox',
                  id: `checkbox_${index}`,
                  checked: item.checked,
                  change: function () {
                    const isChecked = this.checked;
                    const shoppingListId = $(this).closest('.list-group-item').data('shoppinglistid');
                    updateItemStatus(shoppingListId, isChecked);
                  }
                }),
                $('<label>', {
                  for: `checkbox_${index}`,
                  text: `${item.quantity} ${item.unit} ${item.ingredientName}`
                })
              )
            )
          )
        );
        shoppingListContainer.append(listItem);
      });
    }
  

    // Function to update the checked status of a shopping list item
    function updateItemStatus(shoppingListId, isChecked) {
      $.ajax({
        type: 'POST',
        url: '/checkOffItem',
        data: {
          shoppingListId: shoppingListId,
          checked: isChecked
        },
        success: function (response) {
          // Item status updated successfully, re-render the shopping list
          fetchShoppingList();
        },
        error: function (response) {
          alert('An error occurred while updating the ingredient status');
        }
      });
    }
  
    // Function to fetch the shopping list data from the server
  function fetchShoppingList(startDate, endDate) {
    $.ajax({
      type: 'GET',
      url: '/api/shoppingList',
      data: {
        startDate: startDate,
        endDate: endDate
      },
      success: function (response) {
        renderShoppingList(response);
      },
      error: function (response) {
        alert('An error occurred while fetching the shopping list');
      }
    });
  }

  // Function to update the week label with the start and end dates
  function updateWeekLabel(startDate, endDate) {
    currentStartDate = startDate;
    currentEndDate = endDate;
    weekLabel.text(`${startDate} - ${endDate}`);
  }

  // Function to navigate to the previous or next week
  function navigateWeeks(weekNumber) {
    console.log("\nWeekNumber: ", weekNumber, "\n");
    const year = new Date().getFullYear();
    let startDate = moment().year(year).week(weekNumber).startOf('isoWeek');
    let endDate = moment(startDate).endOf('isoWeek');

    const currentDay = moment().day();
    if (currentDay === 0) {
      startDate = moment().year(year).week(weekNumber).startOf('isoWeek');
      endDate = moment(startDate).add(6, 'days').endOf('day');
    }

    const newStartDate = startDate.format('MM-DD-YYYY');
    const newEndDate = endDate.format('MM-DD-YYYY');

    updateWeekLabel(newStartDate, newEndDate);
    fetchShoppingList(newStartDate, newEndDate);
  }

  // Add event listeners to week navigation buttons
  prevWeekButton.on('click', function () {
    currentWeekNumber--;
    navigateWeeks(currentWeekNumber);
  });

  nextWeekButton.on('click', function () {
    currentWeekNumber++;
    navigateWeeks(currentWeekNumber);
  });

  // Fetch the initial shopping list on page load
  navigateWeeks(currentWeekNumber);
});