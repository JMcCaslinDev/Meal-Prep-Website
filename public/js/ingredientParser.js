function tokenize(s) {
  let tokens;
  if (s.includes(',')) {
    tokens = s.split(/,\s*/);
  } else if (/\d/.test(s)) {
    // Split by space when numbers are present
    tokens = s.split(/ (?=\d)/);
  } else {
    // Split by space when no numbers or commas are present
    tokens = s.split(/\s+/);
  }
  tokens = tokens.map(t => t.trim().replace(/[.!?]$/, ''));
  return tokens;
}

function parseIngredients(ingredients) {
  let tokens = tokenize(ingredients);

  let parsedIngredients = [];
  tokens.forEach(token => {
    const parts = token.split(" ");
    let parsedIngredient = {
      quantity: null,
      measurement: null,
      ingredient: null,
    };

    if (!isNaN(parts[0])) {
      parsedIngredient.quantity = parseFloat(parts.shift());
    } else {
      parsedIngredient.quantity = 1; // default quantity
    }

    if (isMeasurement(parts[0])) {
      parsedIngredient.measurement = parts.shift();
    }

    if (isConnector(parts[0])) {
      parts.shift(); // remove connector word
    }

    parsedIngredient.ingredient = parts.join(" ").replace(/[.!?,;:]$/, ''); // consider the rest of the parts as the ingredient's name
    parsedIngredients.push(parsedIngredient);
  });

  return parsedIngredients;
}

function isMeasurement(word) {
  const measurements = [
    "tbsp", "tablespoon", "tablespoons",
    "tsp", "teaspoon", "teaspoons",
    "cup", "cups",
    "pint", "pints", "pt",
    "quart", "quarts", "qt",
    "gallon", "gallons", "gal",
    "fl oz", "fluid ounce", "fluid ounces",
    "oz", "ounce", "ounces",
    "lb", "pound", "pounds",
    "ml", "milliliter", "milliliters",
    "l", "liter", "liters",
    "g", "gram", "grams",
    "kg", "kilogram", "kilograms",
    "slice", "slices",
    "pinch", "pinches",
    "dash", "dashes",
    "pack", "package", "packet",
    "can", "cans",
    "bottle", "bottles",
    "jar", "jars",
    "head",
    "bunch", "bunches",
    "stalk", "stalks",
    "stick", "sticks",
    "whole",
    "half",
    "quarter",
    "piece", "pieces",
    "handful", "handfuls",
    "scoop", "scoops",
    "sprig", "sprigs",
    "leaf", "leaves",
    "clove", "cloves",
    "cube", "cubes",
    "strip", "strips",
    "fillet", "filet", "fillets", "filets",
    "breast", "breasts",
    "thigh", "thighs",
    "drumstick", "drumsticks",
    "wing", "wings",
    "loaf", "loaves",
    "roll", "rolls",
    "bag", "bags",
    "box", "boxes",
    "container", "containers",
    "square", "squares",
    "bar", "bars",
    "bulb", "bulbs",
    "kernel", "kernels"
  ];
  return measurements.includes(word);
}

function isConnector(word) {
  const connectors = ["of", "and", "or", "into", "onto", "from"];
  return connectors.includes(word);
}

function aggregateIngredients(ingredients) {
  let totals = {};

  for (let s of ingredients) {
    let tokens = tokenize(s);
    for (let t of tokens) {
      let parsedIngredients = parseIngredients(t);
      for (let parsedIngredient of parsedIngredients) {
        let { ingredient, quantity, measurement } = parsedIngredient;
        if (!totals[ingredient]) {
          totals[ingredient] = {};
        }
        if (quantity !== null && measurement !== null) {
          if (!totals[ingredient][measurement]) {
            totals[ingredient][measurement] = 0;
          }
          totals[ingredient][measurement] += quantity;
        } else if (quantity !== null) {
          if (!totals[ingredient]['']) {
            totals[ingredient][''] = 0;
          }
          totals[ingredient][''] += quantity;
        } else {
          if (!totals[ingredient]['']) {
            totals[ingredient][''] = 0;
          }
          totals[ingredient][''] += 1;
        }
      }
    }
  }

  return totals;
}

export { tokenize, parseIngredients, aggregateIngredients };
