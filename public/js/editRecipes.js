function deleteRecipe(userId, recipeId) {
  const request = new Request('/deleteRecipe', {
    method: 'DELETE',
    body: JSON.stringify({ recipeId: recipeId }),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  fetch(request)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Close the modal
        let modalId = `editModal-${userId}-${recipeId}`;
        let modalElement = document.getElementById(modalId);
        let bootstrapModal = bootstrap.Modal.getInstance(modalElement);

        // Remove the deleted recipe from the DOM once the modal is fully hidden
        bootstrapModal._element.addEventListener('hidden.bs.modal', () => {
          const recipeContent = document.getElementById(`recipe-${userId}-${recipeId}`);
          if (recipeContent) {
            const recipeBox = recipeContent.closest('.recipe-box');
            if (recipeBox) {
              recipeBox.remove();
            }
          }
        });

        bootstrapModal.hide();
      } else {
        console.error('Failed to delete recipe');
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
}







// Listen to click events on all Edit buttons
document.querySelectorAll('.btn-primary').forEach(button => {
  button.addEventListener('click', event => {
    // Get the recipeId from the button's dataset
    const recipeId = event.target.dataset.recipeId;

    // Fetch the current recipe data from the server
    fetch(`/getRecipe/${recipeId}`)
      .then(response => response.json())
      .then(data => {
        // Populate the modal form fields with the current recipe data
        document.querySelector(`#editModal-${recipeId} input[name="recipeName"]`).value = data.recipeName;
        document.querySelector(`#editModal-${recipeId} textarea[name="ingredientList"]`).value = data.ingredientList;
        document.querySelector(`#editModal-${recipeId} textarea[name="instructions"]`).value = data.instructions;
      });
  });
});
