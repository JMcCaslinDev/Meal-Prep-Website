$(document).ready(function () {
    const fridgeItemsContainer = $('#fridge-items-container');
    const modal = $('#item-modal');
    const closeBtn = $('.close');
    const editItemForm = $('#edit-item-form');
    const deleteItemBtn = $('#delete-item-btn');

    function updateField(fieldName, value, fridgeId) {
        const data = {
            [fieldName]: value,
            shoppingListId: $('#shopping-list-id').val()
        };
    
        $.ajax({
            type: 'PATCH',
            url: `/api/fridge-item/${fridgeId}`,
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: function (response) {
                console.log(`${fieldName} updated successfully.`);
            },
            error: function (xhr, status, error) {
                console.error(`Error updating ${fieldName}:`, error);
            }
        });
    }

    // Function to render fridge items
    function renderFridgeItems(fridgeItems) {
        fridgeItemsContainer.empty();

        fridgeItems.forEach(item => {
            const itemBox = $('<div>', { class: 'fridge-item', 'data-id': item.fridgeId }).append(
                $('<h3>', { text: item.ingredientName }),
                $('<p>', { text: `Quantity: ${item.quantity}` }),
                $('<p>', { text: `Unit: ${item.unit}` }),
                $('<p>', { text: `Expiry Date: ${item.expiryDate || 'N/A'}` }),
                $('<p>', { text: `Shopping List ID: ${item.shoppingListId || 'N/A'}` }),
                $('<p>', { text: `Is Leftover: ${item.isleftover ? 'Yes' : 'No'}` })
            );

            fridgeItemsContainer.append(itemBox);
        });

        // Attach event listener to fridge item boxes
        $('.fridge-item').on('click', function () {
            const fridgeId = $(this).data('id');
            openEditModal(fridgeId);
        });
    }

    // Function to open the edit modal and populate form fields
    // Function to open the edit modal and populate form fields
function openEditModal(fridgeId) {
    $.ajax({
        type: 'GET',
        url: `/api/fridge-item/${fridgeId}`,
        success: function (response) {
            $('#fridge-id').val(response.fridgeId);
            $('#item-name').val(response.ingredientName);
            $('#item-quantity').val(response.quantity);
            $('#item-unit').val(response.unit);
            $('#item-expiry').val(response.expiryDate);
            $('#shopping-list-id').val(response.shoppingListId);
            $('#is-opened').val(response.isOpened);
            $('#is-leftover').prop('checked', response.isLeftover);

            modal.css('display', 'block');
            
            // Attach blur event listeners for inputs
            $('#item-name, #item-quantity, #item-unit, #item-expiry').blur(function() {
                const fieldToUpdate = $(this).attr('id').replace('item-', '');
                const value = $(this).val();
                updateField(fieldToUpdate, value, fridgeId);
            });

            $('#is-opened').change(function() {
                const fieldToUpdate = $(this).attr('id').replace('is-', '');
                const value = $(this).val();
                updateField(fieldToUpdate, value, fridgeId);
            });

            $('#is-leftover').change(function() {
                const fieldToUpdate = $(this).attr('id').replace('is-', '');
                const value = $(this).is(':checked');
                updateField(fieldToUpdate, value, fridgeId);
            });
        },
        error: function (xhr, status, error) {
            console.error('Error fetching fridge item:', error);
        }
    });
}

    // Function to close the edit modal
    function closeEditModal() {
        modal.css('display', 'none');
    }

    // Event listener for the close button
    closeBtn.on('click', closeEditModal);

    // Remove the submit event listener as we now use blur events to save data

    // Event listener for the delete item button with confirmation
    deleteItemBtn.on('click', function () {
        const fridgeId = $('#fridge-id').val();

        if (confirm('Are you sure you want to delete this item?')) {
            // Send delete request to the server
            $.ajax({
                type: 'DELETE',
                url: `/api/fridge-item/${fridgeId}`,
                success: function (response) {
                    closeEditModal();
                    fetchFridgeItems();
                },
                error: function (xhr, status, error) {
                    console.error('Error deleting fridge item:', error);
                }
            });
        }
    });

    // Function to fetch fridge items from the server
    function fetchFridgeItems() {
        $.ajax({
            type: 'GET',
            url: '/api/fridge-items',
            success: function (response) {
                renderFridgeItems(response);
            },
            error: function (xhr, status, error) {
                console.error('Error fetching fridge items:', error);
            }
        });
    }

    // Fetch fridge items on page load
    fetchFridgeItems();
});