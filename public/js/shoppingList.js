$(document).ready(function () {
    const weekLabel = $('#week-label');
    const prevWeekButton = $('#prev-week');
    const nextWeekButton = $('#next-week');
  
    let currentWeekNumber = moment().isoWeek();
    let currentStartDate = '';
    let currentEndDate = '';
  
    // Inside the $(document).ready function
    $('#done-shopping').on('click', function() {
        const startDate = currentStartDate;
        const endDate = currentEndDate;
    
        $.ajax({
        type: 'POST',
        url: '/updateFridgeFromShoppingList',
        data: JSON.stringify({ startDate, endDate }),
        contentType: 'application/json',
        success: function(response) {
            console.log('Fridge items updated:', response);
            // Optional: Refresh the shopping list or perform any other necessary actions
        },
        error: function(xhr, status, error) {
            console.error('Error updating fridge items:', error);
        }
        });
    });

    // Function to render the shopping list
    function renderShoppingList(shoppingListItems) {
      const shoppingListContainer = $('#shoppingList');
      shoppingListContainer.empty(); // Clear the existing shopping list
  
      shoppingListItems.forEach((item, index) => {
        const listItem = $('<div>', { class: 'shopping-list-item', 'data-shoppinglistid': item.id }).append(
          $('<div>', { class: 'form-check' }).append(
            $('<input>', {
              class: 'form-check-input',
              type: 'checkbox',
              id: `checkbox_${index}`,
              checked: item.checked === 1
            }),
            $('<label>', { for: `checkbox_${index}`, text: item.ingredientName })
          ),
          $('<div>', { class: 'quantity-container' }).append(
            $('<input>', {
              type: 'number',
              class: 'form-control quantity-input',
              value: item.quantity,
              placeholder: 'Quantity'
            }),
            $('<input>', {
              type: 'text',
              class: 'form-control unit-input',
              value: item.unit,
              placeholder: 'Unit'
            }),
            $('<span>', {
              class: 'needed-quantity',
              text: `Needed: ${item.neededQuantity}`
            })
          )
        );
        shoppingListContainer.append(listItem);
      });
  
      // Attach event listeners to checkboxes and quantity inputs
      $('.form-check-input').change(function () {
        const isChecked = this.checked;
        const shoppingListId = $(this).closest('.shopping-list-item').data('shoppinglistid');
        updateItemStatus(shoppingListId, isChecked);
      });
  
      // Inside the renderShoppingList function
        $('.quantity-input').on('change', function () {
            const shoppingListId = $(this).closest('.shopping-list-item').data('shoppinglistid');
            const quantity = $(this).val();
            
            updateItemQuantity(shoppingListId, quantity);
        });

        $('.unit-input').on('change', function () {
            const shoppingListId = $(this).closest('.shopping-list-item').data('shoppinglistid');
            const unit = $(this).val();
            
            updateItemUnit(shoppingListId, unit);
        });
    };    


    // Function to update the quantity of a shopping list item
    function updateItemQuantity(shoppingListId, newQuantity) {
        $.ajax({
        type: 'POST',
        url: '/updateItemQuantity',
        data: JSON.stringify({
            shoppingListId: shoppingListId,
            quantity: newQuantity
        }),
        contentType: 'application/json',
        success: function (response) {
            console.log('Item quantity updated:', response);
        },
        error: function (xhr, status, error) {
            console.error('Error updating item quantity:', error);
        }
        });
    }
  

    // Function to update the unit of a shopping list item
    function updateItemUnit(shoppingListId, newUnit) {
        $.ajax({
        type: 'POST',
        url: '/updateItemUnit',
        data: JSON.stringify({
            shoppingListId: shoppingListId,
            unit: newUnit
        }),
        contentType: 'application/json',
        success: function (response) {
            console.log('Item unit updated:', response);
        },
        error: function (xhr, status, error) {
            console.error('Error updating item unit:', error);
        }
        });
    }


    // Function to update the checked status of a shopping list item
    function updateItemStatus(shoppingListId, isChecked) {
      $.ajax({
        type: 'POST',
        url: '/checkOffItem',
        data: JSON.stringify({
          shoppingListId: shoppingListId,
          checked: isChecked
        }),
        contentType: 'application/json',
        success: function (response) {
          console.log('Item status updated:', response);
        },
        error: function (xhr, status, error) {
          console.error('Error updating item status:', error);
        }
      });
    }
  
    // Function to update the quantity of a shopping list item
    function updateItemQuantity(shoppingListId, newQuantity) {
      $.ajax({
        type: 'POST',
        url: '/updateItemQuantity',
        data: JSON.stringify({
          shoppingListId: shoppingListId,
          quantity: newQuantity
        }),
        contentType: 'application/json',
        success: function (response) {
          console.log('Item quantity updated:', response);
        },
        error: function (xhr, status, error) {
          console.error('Error updating item quantity:', error);
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