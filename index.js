import fetch from 'node-fetch';
import express from "express";
// import mysql from 'mysql';
import mysql from 'mysql2/promise';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { Mutex } from 'async-mutex';
import { parseIngredients } from './public/js/ingredientParser.js';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone';
import dotenv from 'dotenv';
import { exit } from 'process';
dotenv.config();

const app = express();
const pool = dbConnection();
const mutex = new Mutex();


//second api bmi calculator
const options = {
  method: 'GET',
  headers: {
    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
    'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
  }
};

app.set("view engine", "ejs");
app.use(express.static("public"));

//to parse Form data sent using POST method
app.use(express.urlencoded({ extended: true }));

// can handle request bodies with MIME Type
app.use(express.json());

app.set('trust proxy', 1) // trust first proxy

app.use(session({
  secret: process.env.SESSION_SECRET,  // needs to be the same its an anchor for all sessions
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,  //if true, requires signed not resigned cookies if using local host must be false
    maxAge: 1000 * 60 * 60 // expires after 60 minutes (second 60)
  }
}))


async function getUserIdFromSessionID(sessionID) {
  // Execute SQL query to fetch userId from accounts where sessionID matches
  let sql = `SELECT userId FROM accounts WHERE sessionId = ?`;
  let result = await executeSQL(sql, [sessionID]);

  if (result.length > 0) {
    return result[0].userId;
  } else {
    throw new Error("Session ID not found in the accounts table.");
  }
}





//routes  I need to have this check the database for the storage of the sessionID and if its there login to home else redirect to login screen 
app.get('/', async (req, res) => {
  //alert displaying session id when on login page
  console.log("Entered / route")
  

  //  Get userId securely given the sessionID
  let sessionID = req.sessionID;
  console.log("sessionID: ", sessionID)

  var params = [sessionID];
  var sql = `SELECT sessionId FROM accounts WHERE sessionId = ?`;



  var isInDatabase = await executeSQL(sql, params);

  
  console.log("isInDatabase: ", isInDatabase);
  console.log("isInDatabase[0]: ", isInDatabase[0]);



  if (isInDatabase[0]) {
    console.log(req.sessionID)

    console.log("Redirecting user to their home page");
    res.redirect('home');
  } else {
    console.log("Render login page");
    res.render('login');
  }
});




app.get("/home", isAuth, async function(req, res) {
  console.log("Entered Home Page!");

  //  Get userId securely given the sessionID
  let userId = await getUserIdFromSessionID(req.sessionID);
  console.log("User ID:", userId);

  var params = [userId];
  var sql = `SELECT username FROM accounts WHERE userId = ?`;


  //  need to grab all of the todays meals for current user 

  var sqlMeals = `SELECT recipeId, timeSlot FROM mealcalendar WHERE userId = ? AND DATE(timeSlot) = STR_TO_DATE('07/31/2023', '%m/%d/%Y')`;

  var todaysMeals = await executeSQL(sqlMeals, params);

  console.log("todaysMeals: ", todaysMeals);


  try {
      // Code to write data to the database
      var release = await mutex.acquire();  //  mutex lock
      console.log("Aquiring read mutex lock.");
      var username = await executeSQL(sql, params);
      console.log("Data attempts read from database");
    } finally {
      release();
      console.log("Releasing read mutex lock.");
    }
  console.log("username: ", username);

  //once row is found grab value and pass it on
  if (username.length > 0) {
    username = username[0].username;
    console.log("found row")
  } else {
    console.log("row not found")
  }


  console.log("username: ", username);

  res.render('home', { "username": username });
});


app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});



app.post('/login', async (req, res) => {

  const username = req.body.username;
  const password = req.body.password;
  let passwordHash = "";
  let sql = `SELECT password FROM accounts WHERE username = ?`;
  let rows = await executeSQL(sql, [username]);

  if (rows.length > 0) {
    passwordHash = rows[0].password;
  }

  const match = await bcrypt.compare(password, passwordHash);

  //  if passwords match
  if (match) {
    console.log("Passwords match")
    sql = `SELECT userId FROM accounts WHERE username = ?`;
    const userId = (await executeSQL(sql, [username]))[0].userId;  //works


    //set session userId    this is not setting the sessionId but instead sets the userId 
    req.session.userId = userId;

    sql = `UPDATE accounts SET sessionId = ?, lastLoginTimestamp = ? WHERE userId = ?`;
    const timestamp = Date.now() / 1000;  //equivalent to python time.time()
    console.log("req.sessionID:", req.sessionID);
    await executeSQL(sql, [req.sessionID, timestamp, userId]);

    //store users account sql row in userInfo session storage

    console.log("\nredirecting to / route\n");
    res.redirect('/');
  } else {

    console.log("\nerror wrong credentials redirecting to / route\n");
    res.render('login', { "error": "Wrong Credentials!" })
  }
});



//loads signup page
app.get('/signup', (req, res) => {
  res.render('signup');
});

async function returnUniqueUuid() {

  //run until returns
  while (true) {
    let uuid = uuidv4();  //store a new uuid
    let sql = `SELECT userId FROM accounts WHERE userId = ?`;
    let checkForUserIdAlreadyInDatabase = await executeSQL(sql, [uuid]);
    console.log("checkForUserIdAlreadyInDatabase: ", checkForUserIdAlreadyInDatabase)

    //return uuid if duplicate not found in the database
    if (checkForUserIdAlreadyInDatabase == false) {
      console.log("uuid: ", uuid)
      return uuid;
    }

  }
}

// What happens when you click the signup button on the signup page
app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check for duplicate username in the database
    const duplicateUsernameQuery = `SELECT username FROM accounts WHERE username = ?`;
    const duplicateUsernameResult = await executeSQL(duplicateUsernameQuery, [username]);

    if (duplicateUsernameResult.length > 0) {
      console.log("Duplicate username found in the database");
      res.render('signup', { "error": "Username already exists" });
    } else {
      console.log("No duplicate usernames found, safe to create user and login");

      // Hash the password
      const saltRounds = 10;
      const salt = bcrypt.genSaltSync(saltRounds);
      const hash = bcrypt.hashSync(password, salt);

      // Generate a unique user ID
      const potentialUserId = await returnUniqueUuid();
      console.log("potentialUserId: ", potentialUserId);
      req.session.userId = potentialUserId;

      // Insert the new user information into the database
      const insertUserQuery = `INSERT INTO accounts (username, password, sessionId, userId) VALUES (?, ?, ?, ?)`;
      const insertUserParams = [username, hash, req.sessionID, potentialUserId];
      await executeSQL(insertUserQuery, insertUserParams);

      // Update the session ID and last login timestamp
      const updateSessionQuery = `UPDATE accounts SET sessionId = ?, lastLoginTimestamp = ? WHERE userId = ?`;
      const timestamp = Date.now() / 1000;
      await executeSQL(updateSessionQuery, [req.sessionID, timestamp, potentialUserId]);
      res.render('home', { "username": username }); // Redirect to the home page


    }
  } catch (error) {
    // Handle errors appropriately
    console.log("Error occurred during signup:", error);
    res.render('signup', { "error": "An error occurred during signup" });
  }
});


//  
app.get('/getRecipe/:recipeId', async (req, res) => {
  const recipeId = req.params.recipeId;

  let sql = `SELECT * FROM recipes WHERE recipeId = ?`;
  let recipeData = await executeSQL(sql, [recipeId]);

  res.json(recipeData);
});


//  displays the users recipes page
app.get('/recipes', (req, res) => {

  res.render('recipes');

});




// create custom recipes and store them in users recipes in the database
app.post('/recipe', async (req, res) => {
  let connection;
  try {
    // Get userId securely given the sessionID
    let userId = await getUserIdFromSessionID(req.sessionID);
    console.log("User ID:", userId);

    let ingredients = req.body.ingredients.map(ing => ({
      ingredient_id: ing.ingredient_id,
      quantity: ing.quantity,
      unit: ing.unit
    }));

    console.log("\ningredients: ", ingredients, "\n");
    
    let recipeName = req.body.recipeName;
    let instructions = req.body.instructions;
    let imageLink = req.body.foodPic;

    // Start a database transaction
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Insert the new recipe into the 'recipes' table
    let recipeSql = `INSERT INTO recipes (recipeName, instructions, imageLink, userId) VALUES (?, ?, ?, ?)`;
    let recipeParams = [recipeName, instructions, imageLink, userId];
    let recipeResult = await executeSQL(recipeSql, recipeParams);
    let recipeId = recipeResult.insertId;
    console.log("Recipe ID:", recipeId);

    // Now, insert each ingredient into the 'recipes_ingredients' table
    let ingredientSql = `INSERT INTO recipes_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)`;
    for (let ingredient of ingredients) {
      let ingredientParams = [recipeId, ingredient.ingredient_id, ingredient.quantity, ingredient.unit];
      await executeSQL(ingredientSql, ingredientParams);
    }
    
    // Commit the transaction if all is well
    await connection.commit();
    console.log("\nCommitting transaction successfully\n");

    // To update a single recipe:
    calculateAndUpdateRecipeTotals(recipeId);

    res.redirect('/myRecipes');
  } catch (error) {
    // If any error occurs, roll back the transaction
    if (connection) {
      await connection.rollback();
    }
    console.error('Transaction Error:', error);
    res.status(500).send('Error creating recipe');
  } finally {
    // Release the connection back to the pool
    if (connection) {
      connection.release();
    }
  }
});




//url is fixed and is working
app.get('/recipeResults', async (req, res) => {

  let keyword = req.query.recipeSearch;

  let url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${keyword}`;

  let response = await fetch(url);
  let data = await response.json();
  console.log(data.meals);
  res.render('recipeList', { "data": data });
});


//TODO Fix me not working / add recipe to my recieps from search
//  favorite recipes from recipe search and add it to users database of recipes as a favorited recipe maybe need new table
app.post('/fav', async (req, res) => {
 

  //  Get userId securely given the sessionID
  let userId = await getUserIdFromSessionID(req.sessionID);
  console.log("User ID:", userId);

  let list = req.body.favBtn;
  console.log(list.value);
  console.log(userId);
});


//  get the weeks bound for certain dates e.g. based on a date, which week is it 0 - 52?
function getWeekBounds(date) {
  console.log("\nEntered getWeekBounds\n");

  //change to be dynamic for time zones once working 
  const now = moment(date).tz("America/Los_Angeles");
  console.log("now_getWeekBounds_la: ", now);

  let day = now.day();
  console.log("day_getWeekBounds_la: ", day);

  let diffToMonday = day === 0 ? 6 : day === 1 ? 0 : day - 1;
  let monday = now.clone().subtract(diffToMonday, 'days').startOf('day');
  console.log("monday_getWeekBounds+la: ", monday);

  let sunday = monday.clone().add(6, 'days').endOf('day');
  console.log("sunday_getWeekBounds_la: ", sunday);

  return { start: monday.utc().toDate(), end: sunday.utc().toDate() };
}



//  Displays the calendar page without querying user's current database selected meals
app.get('/calendar', isAuth, async (req, res) => {
  console.log("\nEntered calendar route \n");

  // Render the calendar template
  // No data is passed to the template regarding meals, as it will be handled by client-side JS
  res.render('calendar');
});


//  Essentially the new version of the calendar get function
app.get('/api/week-data', async (req, res) => {
  console.log("\nEntered api/week-data route\n")

  // Extract the week number from the query parameters
  const weekNumber = parseInt(req.query.week);

  console.log("\nweekNumber: ", weekNumber, "\n")

  // Check if the weekNumber is a valid number
  if (isNaN(weekNumber) || weekNumber < 0 || weekNumber > 52) {
    return res.status(400).send('Invalid week number');
  }

  try {
    // Use the session ID to get the user ID
    const userId = await getUserIdFromSessionID(req.sessionID);

    // Calculate the date range for the requested week number
    const year = new Date().getFullYear(); // Use the current year or a different logic if required
    const startDate = moment().year(year).week(weekNumber).startOf('isoWeek');
    const endDate = moment(startDate).endOf('isoWeek');

    // Convert to string for MySQL
    const startString = startDate.format('YYYY-MM-DD HH:mm:ss');
    const endString = endDate.format('YYYY-MM-DD HH:mm:ss');

    const newStartDate = startDate.format('MM-DD-YYYY');
    const newEndDate = endDate.format('MM-DD-YYYY');

    console.log("\nstartString: ", startString, "\n")
    console.log("\nendString: ", endString, "\n")

    // Fetch meal data for the user within the calculated date range
    const sql = `SELECT * FROM mealCalendar WHERE userId = ? AND timeSlot BETWEEN ? AND ?`;
    const meals = await executeSQL(sql, [userId, startString, endString]);
    console.log("\nMeals: ", meals, "\n")
          
    // Return the meal data as JSON
    res.json({ meals: meals, startString: newStartDate, endString: newEndDate});
  } catch (error) {
    console.error("Error fetching week data:", error);
    res.status(500).send('Error fetching data for the week.');
  }
});


// API route to get all recipes for the current user
app.get('/api/user-recipes', async (req, res) => {
  try {
      // Use the session ID to get the user ID
      const userId = await getUserIdFromSessionID(req.sessionID);

      // Fetch all recipes from the 'recipes' table that belong to the user
      const sql = `SELECT id, recipeName FROM recipes WHERE userId = ?`;
      const userRecipes = await executeSQL(sql, [userId]);

      // Return the recipes as JSON
      res.json(userRecipes);
  } catch (error) {
      console.error("Error fetching user recipes:", error);
      res.status(500).send('Error fetching user recipes.');
  }
});





app.post('/weekRecipes', async (req, res) => {
  console.log("Inside /weekRecipes POST route");

  // Get the user ID from the session
  let userId = await getUserIdFromSessionID(req.sessionID);
  console.log("User ID:", userId);

  // Log the form data received from the request
  console.log('Form data:', req.body);

  if (userId) {
    try {
      // Start transaction
      await executeSQL('START TRANSACTION');

      // Convert start and end dates to include time
      const startDate = moment(req.body.startDate, 'MM-DD-YYYY').startOf('day').format('YYYY-MM-DD HH:mm:ss');
      const endDate = moment(req.body.endDate, 'MM-DD-YYYY').endOf('day').format('YYYY-MM-DD HH:mm:ss');

      // Delete existing recipes in the meal calendar for the given week and user
      let deleteSql = `DELETE FROM mealcalendar WHERE userId = ? AND timeSlot BETWEEN ? AND ?`;
      await executeSQL(deleteSql, [userId, startDate, endDate]);

      // Insert new meal calendar entries
      let insertSql = `INSERT INTO mealcalendar (userId, recipeId, timeSlot) VALUES ?`;
      let values = req.body.meals.map(meal => [userId, meal.recipeId, meal.timeSlot]);
      await executeSQL(insertSql, [values]);

      // Commit transaction
      await executeSQL('COMMIT');

      res.json({ status: 'success', message: 'Meals updated successfully' });
    } catch (error) {
      // Rollback transaction in case of error
      await executeSQL('ROLLBACK');
      console.error('Error updating week meals:', error);
      res.status(500).json({ status: 'error', message: 'Failed to update meals' });
    }
  } else {
    res.status(401).json({ status: 'error', message: 'Unauthorized user' });
  }
});



//  update shopping list database
async function updateShoppingList(userId, startDate, endDate) {
  try {
    console.log("Inside updateShoppingList function");
    console.log("User ID:", userId);

    // Fetch meal calendar entries for the specified date range
    let sql = `SELECT recipeId FROM mealcalendar WHERE userId = ? AND timeSlot BETWEEN ? AND ?`;
    let calendarRows = await executeSQL(sql, [userId, startDate, endDate]);

    // Clear the shopping list for the specified date range
    console.log("Clearing shopping list for date range:", startDate, "to", endDate);
    sql = `DELETE FROM shoppinglist WHERE userId = ? AND DATE(weekDate) = DATE(?)`;
    await executeSQL(sql, [userId, startDate]);



    // If there are no recipes for this date range, return
    if (calendarRows.length === 0) {
      console.log("No calendar rows found, shopping list cleared");
      return;
    }

    // Count the occurrences of each recipe
    let recipeCounts = {};
    for (let row of calendarRows) {
      recipeCounts[row.recipeId] = (recipeCounts[row.recipeId] || 0) + 1;
    }

    let combinedIngredients = {};
    for (let recipeId in recipeCounts) {
      sql = `SELECT parsedIngredients FROM recipes WHERE userId = ? AND recipeId = ?`;
      let recipeRows = await executeSQL(sql, [userId, recipeId]);
      let ingredients = JSON.parse(recipeRows[0].parsedIngredients);

      for (let ingredient of ingredients) {
        let name = ingredient.ingredient;
        let quantity = ingredient.quantity * recipeCounts[recipeId];
        let measurement = ingredient.measurement || null; // Use null if measurement is not specified

        // Combine the same ingredients
        if (name in combinedIngredients) {
          combinedIngredients[name].quantity += quantity;
        } else {
          combinedIngredients[name] = {
            quantity: quantity,
            measurement: measurement
          };
        }
      }
    }

    // Log the combined ingredients
    console.log(`Combined ingredients for user ${userId}:`, combinedIngredients);

    // Insert the aggregated ingredients into the shopping list
    for (let name in combinedIngredients) {
      let { quantity, measurement } = combinedIngredients[name];
      sql = `INSERT INTO shoppinglist (userId, ingredientName, quantity, measurement, weekDate) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`;
      let params = [userId, name, quantity, measurement, startDate]; // Using startDate as the date for the shopping list
      await executeSQL(sql, params);
    }
  } catch (error) {
    console.log(`Error updating shopping list for user ${userId}:`, error);
  }
}


//  display shopping list page info
app.get("/shoppingList", async function(req, res) {
  let userId = await getUserIdFromSessionID(req.sessionID);
  console.log("User ID:", userId);
  if (userId) {
    // Define current week bounds
    const now = moment.tz('2023-08-07T05:15:00Z', 'America/Los_Angeles');
    const { start: monday, end: sunday } = getWeekBounds(now);
    let mondayString = moment.utc(monday).format('YYYY-MM-DD HH:mm:ss');
    let sundayString = moment.utc(sunday).format('YYYY-MM-DD HH:mm:ss');

    // Fetch shopping list from shoppinglist for the current week
    let sql = `SELECT shoppingListId, ingredientName as name, quantity, checked
               FROM shoppinglist 
               WHERE userId = ? AND DATE(weekDate) BETWEEN DATE(?) AND DATE(?)
              `;
    executeSQL(sql, [userId, mondayString, sundayString])
      .then(function(rows) {
        if (rows.length === 0) {
          res.render("shoppingList", { data: {} });
        } else {
          // Combine ingredients for rendering
          let combinedIngredients = {};
          for (let row of rows) {
            let name = row.name;
            let quantity = row.quantity;
            let shoppingListId = row.shoppingListId;
            let checked = row.checked == 1; // Convert checked status to boolean
            combinedIngredients[name] = { quantity, shoppingListId, checked }; // Include checked status in the object
          }
          res.render("shoppingList", { data: combinedIngredients });
        }
      })
      .catch(function(error) {
        console.log("Error fetching shopping list: " + error);
        res.send("An error occurred");
      });
  } else {
    res.redirect("/login");
  }
});


//  check off shopping list items functionality
app.post("/checkOffItem", async function(req, res) {
  let userId = await getUserIdFromSessionID(req.sessionID);
  console.log("User ID:", userId);
  let shoppingListId = req.body.shoppingListId;
  let checked = req.body.checked;
  let checkedValue = (checked === 'true' || checked === true) ? 1 : 0;

  console.log("User ID:", userId);
  console.log("Shopping List ID:", shoppingListId);
  console.log("Checked Value:", checkedValue);

  if (userId) {
    let sql = `
      UPDATE shoppinglist 
      SET checked = ? 
      WHERE shoppingListId = ? AND userId = ?
    `;
    console.log("Executing SQL:", sql, [checkedValue, shoppingListId, userId]);
    await executeSQL(sql, [checkedValue, shoppingListId, userId]);

    // Retrieve the ingredient details from the shopping list
    sql = `SELECT ingredientName, quantity, measurement FROM shoppinglist WHERE shoppingListId = ?`;
    console.log("Executing SQL:", sql, [shoppingListId]);
    let result = await executeSQL(sql, [shoppingListId]);

    if (result.length > 0) {
      let ingredientName = result[0].ingredientName;
      let quantity = result[0].quantity;
      let unit = result[0].measurement;

      console.log("Ingredient Name:", ingredientName);
      console.log("Quantity:", quantity);
      console.log("Unit:", unit);

      if (checkedValue === 1) {
        // Code to add the ingredient to the fridge
        sql = `INSERT INTO fridge (userId, ingredientName, quantity, unit, shoppingListId, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
        console.log("Executing SQL:", sql, [userId, ingredientName, quantity, unit, shoppingListId]);
        await executeSQL(sql, [userId, ingredientName, quantity, unit, shoppingListId]);
      } else {
        // Code to remove the ingredient from the fridge
        sql = `DELETE FROM fridge WHERE userId = ? AND ingredientName = ? AND shoppingListId = ?`;
        console.log("Executing SQL:", sql, [userId, ingredientName, shoppingListId]);
        await executeSQL(sql, [userId, ingredientName, shoppingListId]);
      }


      res.status(200).json({ success: "Item updated successfully" });
    } else {
      res.status(404).json({ error: "Ingredient not found" });
    }
  } else {
    res.status(401).redirect("/login");
  }
});


//  display fridge page on frontend
app.get("/fridge", async function(req, res) {
  let userId = await getUserIdFromSessionID(req.sessionID);
  console.log("User ID:", userId);
  if (userId) {
    let sql = `
      SELECT ingredientName, unit, SUM(quantity) as quantity 
      FROM fridge 
      WHERE userId = ? AND quantity > 0
      GROUP BY ingredientName, unit
    `;
    console.log("Executing SQL:", sql, [userId]);
    let result = await executeSQL(sql, [userId]);
    res.render("fridge", { fridgeContents: result });
  } else {
    res.status(401).redirect("/login");
  }
});


//  update fridge items based on database queries
app.post("/updateFridgeItem", async function(req, res) {
  try {
    let userId = await getUserIdFromSessionID(req.sessionID);

    if (!userId) {
      console.error("User ID not found");
      return res.status(400).json({ error: "User ID not found" });
    }

    console.log("User ID:", userId);


    const nullIfEmpty = (value) => (value === "" || value === undefined) ? null : value;

    let { ingredientName, unit, quantity } = req.body;

    ingredientName = nullIfEmpty(ingredientName);
    unit = nullIfEmpty(unit);
    quantity = nullIfEmpty(quantity);
    // Maybe handle quantity differently if you expect it to be a number



    if (!ingredientName || quantity == null) {
      console.error("ingredientName:", ingredientName, "quantity:", quantity);
      return res.status(400).json({ error: "Missing or invalid parameters" });
    }


    // Fetch the current total quantity of this ingredient for this user
    let result = await executeSQL(`
      SELECT SUM(quantity) AS totalQuantity
      FROM fridge
      WHERE userId = ? AND ingredientName = ? AND quantity > 0
    `, [userId, ingredientName]);

    const existingTotalQuantity = result[0].totalQuantity || 0;
    const difference = quantity - existingTotalQuantity;

    console.log(`Updating ${ingredientName}: existing quantity ${existingTotalQuantity}, new quantity ${quantity}, difference ${difference}`);

    if (difference < 0) {
      // Reduce quantity from the oldest entries
      let rowsToUpdate = await executeSQL(`
        SELECT id, quantity
        FROM fridge
        WHERE userId = ? AND ingredientName = ? AND quantity > 0
        ORDER BY created_at ASC
      `, [userId, ingredientName]);

      let amountToReduce = -difference;
      for (const row of rowsToUpdate) {
        if (amountToReduce <= 0) break;

        const reduceBy = Math.min(amountToReduce, row.quantity);
        await executeSQL(`
          UPDATE fridge
          SET quantity = quantity - ?
          WHERE id = ?
        `, [reduceBy, row.id]);

        amountToReduce -= reduceBy;
      }
    } else if (difference > 0) {
      // Add a new entry
      await executeSQL(`
        INSERT INTO fridge (userId, ingredientName, quantity, unit, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, ingredientName, difference, unit]);
    }

    res.status(200).json({ success: "Item updated successfully" });
  } catch (err) {
    console.error("Error in updateFridgeItem:", err);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
});



app.get('/createRecipes', isAuth, async (req, res) => {
  try {
    // Get the user ID from the session
    let userId = await getUserIdFromSessionID(req.sessionID);

    // Fetch the user's ingredients from the database
    let sql = `SELECT id, name FROM ingredients WHERE userId = ?`;
    let userIngredients = await executeSQL(sql, [userId]);
    console.log("\nuserIngredients: ", userIngredients)
    // Render the createRecipes page with the fetched ingredients
    res.render('createRecipes', { userIngredients: userIngredients });
  } catch (error) {
    console.error("Error loading createRecipes page:", error);
    res.send("An error occurred while loading the createRecipes page.");
  }
});



//  route for displaying the page info for bmi
app.get('/bmi', async (req, res) => {
  //pass in user account may not be working user to user :(
  console.log("/bmi route");

  let sql = `SELECT *
              FROM accounts
              WHERE sessionId = ?`;
  let params = [req.sessionID]
  console.log("req.sessionID: ", req.sessionID);
  let bmiInfo = await executeSQL(sql, params);
  bmiInfo = bmiInfo[0];

  console.log(bmiInfo);


  //fetch second api call
  let url = `https://fitness-calculator.p.rapidapi.com/bmi?age=${bmiInfo.age}&weight=${bmiInfo.weight * 0.4535924}&height=${bmiInfo.height * 2.54}`;
  // console.log(url);


  let response = await fetch(url, options);
  let data = await response.json();
  console.log(data.data);
  //pass api response back to page inside data



  res.render('bmi', { "data": data.data, "height": bmiInfo.height, "weight": bmiInfo.weight, "age": bmiInfo.age });
});


//  update bmi information for user
app.post('/bmi', async (req, res) => {

  let sessionID = req.sessionID; //sets sessionID variable as current session id 
  console.log("sessionID:", sessionID);
  let age = req.body.bmiAgeBox;
  let height = req.body.bmiHeightBox;
  let weight = req.body.bmiWeightBox;

  let sql = `UPDATE accounts
                SET age=${age}, height=${height}, weight=${weight} 
                WHERE sessionId = ?`;
  await executeSQL(sql, [sessionID]);

  alert("Clicked Save");
  res.redirect('bmi');
});


// Route for the Ingredients page
app.get('/ingredients', isAuth, async function(req, res) {
  try {
    // Get the user ID from the session
    let userId = await getUserIdFromSessionID(req.sessionID);
    console.log("User ID for Ingredients Page:", userId);

    // Fetch the user's ingredients from the database, including calories and macros
    let sql = `SELECT name, calories, protein, carbs, fats, fiber, sugar, serving_size_description, serving_size_amount, total_weight_in_grams, created_at, updated_at, id FROM ingredients WHERE userId = ?`;
    let userIngredients = await executeSQL(sql, [userId]);

    console.log(userIngredients)
    // Render the ingredients page with the fetched data
    res.render('ingredients',  { userId: userId , userIngredients: userIngredients } );
  } catch (error) {
    console.error("Error loading ingredients page:", error);
    res.send("An error occurred while loading the ingredients page.");
  }
});



app.get('/addingredients', isAuth, async (req, res) => {
  try {
      // Here you can also fetch any necessary data to include in your form, if needed
      res.render('addIngredients');
  } catch (error) {
      console.error("Error loading the add ingredients page:", error);
      res.send("An error occurred while loading the add ingredients page.");
  }
});


app.post('/addIngredient', isAuth, async (req, res) => {
  let userId = await getUserIdFromSessionID(req.sessionID);
  let { name, calories, protein, carbs, fats, fiber, sugar, serving_size_description, serving_size_amount, total_weight_in_grams } = req.body;

  let sql = `INSERT INTO ingredients 
             (userId, name, calories, protein, carbs, fats, fiber, sugar, serving_size_description, serving_size_amount, total_weight_in_grams) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  let params = [userId, name, calories, protein, carbs, fats, fiber, sugar, serving_size_description, serving_size_amount, total_weight_in_grams];

  try {
      await executeSQL(sql, params);
      console.log(`Ingredient added by user ${userId}:`, { name, calories, protein, carbs, fats, fiber, sugar, serving_size_description, serving_size_amount, total_weight_in_grams });
      res.redirect('/ingredients');
  } catch (error) {
      console.error("Error adding ingredient:", error);
      res.send("An error occurred while adding the ingredient.");
  }
});





// route for editing a recipe
app.post('/editRecipe', async (req, res) => {
  let recipeId = req.body.recipeId;
  let recipeName = req.body.recipeName;
  let instructions = req.body.instructions;
  let imageLink = req.body.imageLink;
  let sessionID = req.sessionID;

  // Extracting the user ID from the session
  let sql = `SELECT userId FROM accounts WHERE sessionId = ?`;
  let result = await executeSQL(sql, [sessionID]);
  let userId = result[0].userId;

  // Parse the ingredients data from the JSON string sent by the client
  let ingredientsData = JSON.parse(req.body.ingredientsData);
  console.log("Ingredients data received:", ingredientsData);

  // Begin a database transaction
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Update the recipe information
    sql = `UPDATE recipes SET recipeName = ?, instructions = ?, imageLink = ? WHERE id = ? AND userId = ?`;
    await connection.query(sql, [recipeName, instructions, imageLink, recipeId, userId]);

    // Delete existing ingredients for this recipe
    sql = `DELETE FROM recipes_ingredients WHERE recipe_id = ?`;
    await connection.query(sql, [recipeId]);

    // Insert new ingredients for this recipe
    sql = `INSERT INTO recipes_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)`;
    for (let ingredient of ingredientsData) {
      await connection.query(sql, [recipeId, ingredient.id, ingredient.quantity, ingredient.unit]);
    }

    // Commit the transaction
    await connection.commit();

    // Update recipe totals if necessary
    await calculateAndUpdateRecipeTotals(recipeId);

    // Redirect to the 'My Recipes' page
    res.redirect('/myRecipes');
  } catch (error) {
    // If there is any error, roll back the transaction
    await connection.rollback();
    console.error('Error during edit recipe transaction:', error);
    res.status(500).send('Error editing recipe');
  } finally {
    // Release the connection back to the pool
    connection.release();
  }
});



// Route for deleting a recipe
app.delete('/deleteRecipe', async (req, res) => {
  // Ensure the request body is parsed using express.json() middleware
  const recipeId = req.body.recipeId;
  const sessionID = req.sessionID;

  try {
    // Get the userId associated with this session
    const sqlUserId = `SELECT userId FROM accounts WHERE sessionId = ?`;
    const resultUserId = await executeSQL(sqlUserId, [sessionID]);
    
    // Check if the userId was successfully retrieved
    if (resultUserId.length > 0) {
      const userId = resultUserId[0].userId;

      // Delete the recipe
      const sqlDelete = `DELETE FROM recipes WHERE id = ? AND userId = ?`;
      const resultDelete = await executeSQL(sqlDelete, [recipeId, userId]);

      console.log(`Attempted to delete recipe with ID ${recipeId}, result: ${JSON.stringify(resultDelete)}`);

      // Respond with a JSON object indicating success
      if (resultDelete.affectedRows > 0) {
        res.json({ success: true, message: `Recipe with ID ${recipeId} successfully deleted.` });
      } else {
        res.json({ success: false, message: `Failed to delete recipe with ID ${recipeId}. It may not exist, or you may not have permission to delete it.` });
      }
    } else {
      res.status(401).json({ success: false, message: "Unauthorized: Cannot verify user identity." });
    }
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ success: false, message: 'Internal server error occurred while attempting to delete recipe.' });
  }
});




app.get('/myRecipes', async (req, res) => {
  let sessionID = req.sessionID;

  // First, get the userId from the accounts table using the sessionID
  let sqlUserId = `SELECT userId FROM accounts WHERE sessionId = ?`;
  let userIdResults = await executeSQL(sqlUserId, [sessionID]);
  let userId = userIdResults[0].userId;

  // Retrieve all ingredients for the given userId
  let sqlAllIngredients = `SELECT id, name FROM ingredients WHERE userId = ?;`;

  try {
    // Execute the query to get all ingredients
    let allIngredientsData = await executeSQL(sqlAllIngredients, [userId]);

    // Retrieve the recipes for the given userId
    let sqlRecipes = `SELECT id, imageLink, recipeName, instructions, totalCalories, totalProtein, totalCarbs, totalFats, totalFiber, totalSugar FROM recipes WHERE userId = ?;`;
    let recipesData = await executeSQL(sqlRecipes, [userId]);

    // For each recipe, fetch the ingredients from recipes_ingredients including the ingredient_id
    for (let recipe of recipesData) {
      let sqlIngredients = `
        SELECT ri.ingredient_id, ri.quantity, ri.unit, i.name
        FROM recipes_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = ?;
      `;

      let ingredientsData = await executeSQL(sqlIngredients, [recipe.id]);
      // Include ingredient_id in the recipe's ingredients array
      recipe.ingredients = ingredientsData.map(ing => ({
        id: ing.ingredient_id,
        quantity: ing.quantity,
        unit: ing.unit,
        name: ing.name
      }));
    }

    console.log("\nuserId: ", userId, "\n")
    console.log("\nrecipesData: ", recipesData, "\n")
    console.log("\nallIngredientsData: ", allIngredientsData, "\n")

    console.log("\n ingredients object: ", recipesData[0].ingredients, "\n")

    // Send the recipes data with ingredients and all ingredients to the template
    res.render('myRecipes', {
      userInfo: { userId: userId },
      data: recipesData, // Array of recipes, each with an ingredients array including ingredient_id
      allIngredients: allIngredientsData // Array of all ingredients for the user
    });
  } catch (error) {
    console.error('Error retrieving recipes and ingredients:', error);
    res.status(500).send('Error retrieving recipes');
  }
});




// Route to handle DELETE request for deleting an ingredient
app.delete('/deleteIngredient/:id', isAuth, async (req, res) => {
  console.log("delete function called");
  const ingredientId = req.params.id; // Corrected variable name to ingredientId
  console.log("\nid delete: ", ingredientId);
  const userId = await getUserIdFromSessionID(req.sessionID);

  try {
    let recipesToUpdate = [];
    // Get all of the recipe ids that are associated with the ingredient id before deleting the ingredient id from the join table
    const findRecipesSql = `
      SELECT DISTINCT recipe_id 
      FROM recipes_ingredients 
      WHERE ingredient_id = ?
    `;
    const recipes = await executeSQL(findRecipesSql, [ingredientId]);
    recipesToUpdate = recipes.map(recipe => recipe.recipe_id);
    
    // Delete the ingredient
    const sqlDeleteIngredient = `DELETE FROM ingredients WHERE id = ? AND userId = ?`;
    const result = await executeSQL(sqlDeleteIngredient, [ingredientId, userId]);

    if (result.affectedRows > 0) {
      // Update all recipes that contained the deleted ingredient
      for (const recipeId of recipesToUpdate) {
        await calculateAndUpdateRecipeTotals(recipeId);
      }
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error("Error deleting ingredient:", error);
    res.status(500).json({ error: "An error occurred while deleting the ingredient." });
  }
});





// Route to handle PUT request for updating an ingredient
app.put('/updateIngredient/:id', async (req, res) => {

  console.log("Hit save button put route")
  const id = req.params.id;
  console.log("\nid: ", id, "\n")
  const userId = await getUserIdFromSessionID(req.sessionID);
  const { name, calories, protein, carbs, fats, fiber, sugar, servingSizeDescription, servingSizeAmount, totalWeightInGrams} = req.body; // Add additional fields as needed
  try {
    let sql = `UPDATE ingredients SET name = ?, calories = ?, protein = ?, carbs = ?, fats = ?, fiber = ?, sugar = ?, serving_size_description = ?, serving_size_amount = ?, total_weight_in_grams = ? WHERE id = ? AND userId = ?`;
    let result = await executeSQL(sql, [name, calories, protein, carbs, fats, fiber, sugar, servingSizeDescription, servingSizeAmount, totalWeightInGrams, id, userId]);
    if (result.affectedRows > 0) {
          // To update a single recipe:
      calculateAndUpdateRecipeTotals(null, id);
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error("Error updating ingredient:", error);
    res.status(500).json({ error: "An error occurred while updating the ingredient." });
  }
});


async function calculateAndUpdateRecipeTotals(recipeId = null, ingredientId = null) {
  try {
    let recipesToUpdate = [];
    
    // If an ingredientId is provided, find all recipes that include this ingredient.
    if (ingredientId) {
      const findRecipesSql = `
        SELECT DISTINCT recipe_id 
        FROM recipes_ingredients 
        WHERE ingredient_id = ?
      `;
      const recipes = await executeSQL(findRecipesSql, [ingredientId]);
      recipesToUpdate = recipes.map(recipe => recipe.recipe_id);
    }
    
    // If a recipeId is provided, update only that recipe.
    if (recipeId) {
      recipesToUpdate = [recipeId];
    }

    console.log("\nrecipesToUpdate: ", recipesToUpdate, "\n")

    
    // Now loop through all affected recipes to update their nutritional totals.
    for (const id of recipesToUpdate) {
      const ingredientsSql = `
        SELECT i.calories, i.protein, i.carbs, i.fats, i.fiber, i.sugar, i.serving_size_amount, ri.quantity
        FROM ingredients i
        JOIN recipes_ingredients ri ON i.id = ri.ingredient_id
        WHERE ri.recipe_id = ?
      `;
      const ingredients = await executeSQL(ingredientsSql, [id]);
      let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFats = 0, totalFiber = 0, totalSugar = 0;

      console.log("\n ingredients object: ", ingredients, "\n")
      // Calculate the totals for each recipe.
      for (const ingredient of ingredients) {
        const quantityMultiplier = ingredient.quantity;
        console.log("\ningredient.quantity: ", ingredient.quantity, "\n")
        totalCalories += ingredient.calories * quantityMultiplier;
        totalProtein += ingredient.protein * quantityMultiplier;
        totalCarbs += ingredient.carbs * quantityMultiplier;
        totalFats += ingredient.fats * quantityMultiplier;
        totalFiber += ingredient.fiber * quantityMultiplier;
        totalSugar += ingredient.sugar * quantityMultiplier;
      }

      // Log the totals to the console for debugging.
      console.log(`Recipe ID ${id} - Calculated Totals: Calories: ${totalCalories}, Protein: ${totalProtein}, Carbs: ${totalCarbs}, Fats: ${totalFats}, Fiber: ${totalFiber}, Sugar: ${totalSugar}`);
      
      // Update the recipe with the calculated totals.
      const updateSql = `
        UPDATE recipes
        SET totalCalories = ?, totalProtein = ?, totalCarbs = ?, totalFats = ?, totalFiber = ?, totalSugar = ?
        WHERE id = ?
      `;
      await executeSQL(updateSql, [totalCalories, totalProtein, totalCarbs, totalFats, totalFiber, totalSugar, id]);
      
      console.log(`Nutrition totals updated for Recipe ID ${id}`);
    }
  } catch (error) {
    console.error("Error in calculateAndUpdateRecipeTotals:", error);
    throw error;
  }
}






//  validate user authorization with database query
async function isAuth(req, res, next) {
  console.log("Entered isAuth function");

  //  grab rows where sessionId and userId match database 
  const sql = `SELECT * FROM accounts WHERE sessionId = ?`;
  const isAuthenticated = await executeSQL(sql, [req.sessionID]);

  if (isAuthenticated) {
    //  row returned valid sessionId and userId route to next()
    console.log("Auth Success")
    next();
  } else {
    //  no rows returned user session is broken or expired, routing to logout
    console.log("Auth failed returning to login screen...")
    res.redirect('/logout');
  }

}


//  test database connection with current date query
app.get("/dbTest", async function(req, res) {
  let sql = "SELECT CURDATE()";
  let rows = await executeSQL(sql);
  res.send(rows);
});




// Connect to the database using mysql2 with promise support
function dbConnection() {
  const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectTimeout: 30000 // 30 seconds
  });

  return pool;
}


//  Executes all SQL queries with promise support using mysql2
async function executeSQL(sql, params) {
  try {
    const [rows, fields] = await pool.query(sql, params);
    return rows;
  } catch (err) {
    console.error("Error in executeSQL:", err);
    console.error("SQL Query:", sql);
    console.error("Parameters:", params);
    throw err; // Rethrow the error for the caller to handle
  }
}


//  start server
app.listen(3000, () => {
  console.log("Expresss server running...")
})