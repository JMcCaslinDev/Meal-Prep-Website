let favorites = document.querySelectorAll("favBtn")
document.querySelector("#favBtn").addEventListener("click", addToMyRecipes);

document.querySelector("#bmiCalc").addEventListener("submit", function(event) {
  validateForm2(event);
})

document.querySelector("#addRecipe").addEventListener("submit",function(event){
  validateForm(event);
})
async function validateForm2(e){
  let isValid = true;
  let height = document.querySelector("#bmiHeighBox").value;
  let weight = document.querySelector("#bmiWeightBox").value;
  let age = document.querySelector("#bmiAgeBox").value;

  if(height == 0) {    document.querySelector("#bmiError").innerHTML = "Heigh Required! Must Be Greater Than Zero!";
    isValid = false;
    
  }
  if (weight == 0 ) {
        document.querySelector("#bmiError").innerHTML = "Weight Required! Must Be Greater Than Zero!";
    isValid = false;
    
  }
  if (age == 0) {
      document.querySelector("#bmiError").innerHTML = "Age Required! Must Be Greater Than Zero!";
    isValid = false;
    
  }
  if(height == 0 && weight == 0 && age == 0) {
          document.querySelector("#bmiError").innerHTML = "Please Enter Valid Information! ";
    isValid = false;
    
  }
}

async function validateFrom(e) {
  let isValid = true;
  let recipeName = document.querySelector("#recipeName").value;
  let ingredients = document.querySelector("#ingredients").value;
  let instructions = document.querySelector("#instructions").value;

  if(recipeName == 0) {
    document.querySelector("#addRecipeError").innerHTML = "Recipe Name Required!";
    isValid = false;
  }

  if(ingredients == 0) {
    document.querySelector("#addRecipeError").innerHTML = "Ingredients need to be listed!";
    isValid = false;
  }
  if(instructions == 0) {
    document.querySelector("addRecipeError").innerHTML ="Instructions Required!";
    isValid = false;
  }

  if(!isValid) {
    e.preventDefault();
  }
}


