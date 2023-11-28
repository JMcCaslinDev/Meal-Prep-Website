import fetch from 'node-fetch';
import express from "express";
import mysql from 'mysql';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { Mutex } from 'async-mutex';
import { parseIngredients } from './public/js/ingredientParser.js';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone';
require('dotenv').config();

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
  secret: process.env.SESSION_SECRET,  // just needs to be the same its an anchor for all sessions
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,  //requires signed not resigned cookies*
    maxAge: 1000 * 60 * 30 // expires after 30 minutes
  }
}))


async function getUserIdFromSessionID(sessionID) {
  // Execute SQL query to fetch userId from mp_accounts where sessionID matches
  let sql = `SELECT userId FROM mp_accounts WHERE sessionId = ?`;
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
  var sql = `SELECT sessionId FROM mp_accounts WHERE sessionId = ?`;



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
  var sql = `SELECT username FROM mp_accounts WHERE userId = ?`;


  //  need to grab all of the todays meals for current user 

  var sqlMeals = `SELECT recipeId, timeSlot FROM mp_mealcalendar WHERE userId = ? AND DATE(timeSlot) = STR_TO_DATE('07/31/2023', '%m/%d/%Y')`;

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
  let sql = `SELECT password FROM mp_accounts WHERE username = ?`;
  let rows = await executeSQL(sql, [username]);

  if (rows.length > 0) {
    passwordHash = rows[0].password;
  }

  const match = await bcrypt.compare(password, passwordHash);

  //  if passwords match
  if (match) {
    console.log("Passwords match")
    sql = `SELECT userId FROM mp_accounts WHERE username = ?`;
    const userId = (await executeSQL(sql, [username]))[0].userId;  //works


    //set session userId    this is not setting the sessionId but instead sets the userId 
    req.session.userId = userId;

    sql = `UPDATE mp_accounts SET sessionId = ?, lastLoginTimestamp = ? WHERE userId = ?`;
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
    let sql = `SELECT userId FROM mp_accounts WHERE userId = ?`;
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
    const duplicateUsernameQuery = `SELECT username FROM mp_accounts WHERE username = ?`;
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
      const insertUserQuery = `INSERT INTO mp_accounts (username, password, sessionId, userId) VALUES (?, ?, ?, ?)`;
      const insertUserParams = [username, hash, req.sessionID, potentialUserId];
      await executeSQL(insertUserQuery, insertUserParams);

      // Update the session ID and last login timestamp
      const updateSessionQuery = `UPDATE mp_accounts SET sessionId = ?, lastLoginTimestamp = ? WHERE userId = ?`;
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








app.get('/getRecipe/:recipeId', async (req, res) => {
  const recipeId = req.params.recipeId;

  let sql = `SELECT * FROM mp_userrecipes WHERE recipeId = ?`;
  let recipeData = await executeSQL(sql, [recipeId]);

  res.json(recipeData);
});



app.get('/recipes', (req, res) => {

  res.render('recipes');

});



app.post('/recipe', async (req, res) => {
  //  Get userId securely given the sessionID
  let userId = await getUserIdFromSessionID(req.sessionID);
  console.log("User ID:", userId);

  let recipeName = req.body.recipeName;
  let ingredients = req.body.ingredients;
  let instructions = req.body.instructions;
  let fpic = req.body.foodPic;

  // Parse the ingredients
  let parsedIngredients = parseIngredients(ingredients);

  // Convert parsedIngredients to a JSON string
  let parsedIngredientsJSON = JSON.stringify(parsedIngredients);

  console.log(parsedIngredientsJSON);


  sql = `INSERT INTO mp_userrecipes
             (recipeName,ingredientList, instructions, imageLink, userId, parsedIngredients)
                 VALUES
                 (?, ?, ?, ?, ?, ?)`;
  let params = [recipeName, ingredients, instructions, fpic, userId, parsedIngredientsJSON];
  await executeSQL(sql, params);
  res.redirect('/myRecipes');
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




app.post('/fav', async (req, res) => {
  //TODO Fix me not working / add recipe to my recieps from search

  //  Get userId securely given the sessionID
  let userId = await getUserIdFromSessionID(req.sessionID);
  console.log("User ID:", userId);

  let list = req.body.favBtn;
  console.log(list.value);
  console.log(userId);
});






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





app.get('/calendar', async (req, res) => {
  console.log("\nEntered calendar route \n");

  //  Pull all user recipes from mp_userrecipes table
  let sql = `SELECT * FROM mp_userrecipes`;
  let data = await executeSQL(sql);

  //  Get userId securely given the sessionID
  let userId = await getUserIdFromSessionID(req.sessionID);
  console.log("User ID:", userId);

  //  Hardcode in the now date for Sunday testing purposes
  const now = new Date('2023-08-07T05:15:00Z');

  //  Get Monday and Sunday of each respective week given a date 
  const { start: monday, end: sunday } = getWeekBounds(now);
  console.log("monday_returned_utc: ", monday);
  console.log("sunday_returned_utc: ", sunday);

  //  Convert to string for MySQL date object
  let mondayString = moment(monday).format('YYYY-MM-DD HH:mm:ss');
  let sundayString = moment(sunday).format('YYYY-MM-DD HH:mm:ss');
  console.log("mondayString_utc_formatted: ", mondayString);
  console.log("sundayString_utc_formatted: ", sundayString);

  // Fetch all entries for the current week
  sql = `SELECT * 
         FROM mp_mealCalendar 
         WHERE userId = ? AND timeSlot BETWEEN ? AND ?`;
  let userCalendarRecipes = await executeSQL(sql, [userId, mondayString, sundayString]);
  console.log("Data for the current week:", userCalendarRecipes);

  // Constants for meal times
  const mealTimes = {
    b: '07:00:00',
    l: '12:00:00',
    d: '19:00:00'
  };

  // Map userCalendarRecipes to local time
  const mealMap = {};
  for (const row of userCalendarRecipes) {
    const time = moment(row.timeSlot).tz('America/Los_Angeles');
    const day = time.format('ddd').toLowerCase();
    const timeString = time.format('HH:mm:ss');
    for (const [meal, mealTime] of Object.entries(mealTimes)) {
      if (timeString === mealTime) {
        mealMap[meal + day] = row.recipeId;
        break;
      }
    }
  }

  console.log("mealMap: ", mealMap);

  // Render the calendar template with mealMap
  res.render('calendar', { "data": data, "mealMap": mealMap });
});






app.post('/weekRecipes', async (req, res) => {
  console.log("Inside /weekRecipes POST route");

  let userId = await getUserIdFromSessionID(req.sessionID);
  console.log("User ID:", userId);

  console.log('Form data:', req.body);

  if (userId) {
    // Get the start and end of the current week in California time
    const now = moment.tz('2023-08-07T05:15:00Z', 'America/Los_Angeles');
    const { start: monday, end: sunday } = getWeekBounds(now);

    console.log("Now_local: ", now.format());
    console.log("Monday_local: ", moment(monday).format());
    console.log("Sunday_local: ", moment(sunday).format());

    // Convert to string for MySQL date object
    let mondayString = moment.utc(monday).format('YYYY-MM-DD HH:mm:ss');
    let sundayString = moment.utc(sunday).format('YYYY-MM-DD HH:mm:ss');

    console.log("weeks_mondayString_utc_formatted: ", mondayString);
    console.log("weeks_sundayString_utc_formatted: ", sundayString);

    // Delete existing recipes in the meal calendar for the current week
    let sql = `DELETE FROM mp_mealcalendar WHERE userId = ? AND timeSlot BETWEEN ? AND ?`;
    await executeSQL(sql, [userId, mondayString, sundayString]);

    // Define the days and meals
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const meals = ['b', 'l', 'd'];

    // Define meal times
    const mealHours = { 'b': 7, 'l': 12, 'd': 19 }; // Local times for meals

    // Insert new recipes for each day and meal time
    for (let i = 0; i < meals.length; i++) {  // For each meal of the day
      for (let j = 0; j < days.length; j++) {  // For each day of the week
        let mealTime = moment.tz(monday, 'America/Los_Angeles').add(j, 'days').hour(mealHours[meals[i]]).minute(0).second(0); // Using local California time
        let mealTimeUTC = mealTime.clone().utc(); // Convert to UTC
        let recipeId = req.body[`${meals[i]}${days[j]}`];

        console.log(`Meal time for meal ${i}, day ${j}: ${mealTime.format()}`);
        console.log(`Meal time UTC for meal ${i}, day ${j}: ${mealTimeUTC.format()}`);
        console.log(`RecipeId for meal ${i}, day ${j}: ${recipeId}`);

        if (recipeId && recipeId !== '-1') {  // If a recipe is selected for this meal
          sql = `INSERT INTO mp_mealcalendar (userId, recipeId, timeSlot) VALUES (?, ?, ?)`;
          try {
            let result = await executeSQL(sql, [userId, recipeId, mealTimeUTC.format('YYYY-MM-DD HH:mm:ss')]);
            console.log(`Insertion result for meal ${i}, day ${j}:`, result);
          } catch (error) {
            console.log("Error executing SQL: ", error);
          }
        }
      }
    }

    // Update the shopping list
    console.log("Updating shopping list");
    updateShoppingList(userId, mondayString, sundayString);
  }

  res.redirect('/calendar');
});





async function updateShoppingList(userId, startDate, endDate) {
  try {
    console.log("Inside updateShoppingList function");
    console.log("User ID:", userId);

    // Fetch meal calendar entries for the specified date range
    let sql = `SELECT recipeId FROM mp_mealcalendar WHERE userId = ? AND timeSlot BETWEEN ? AND ?`;
    let calendarRows = await executeSQL(sql, [userId, startDate, endDate]);

    // Clear the shopping list for the specified date range
    console.log("Clearing shopping list for date range:", startDate, "to", endDate);
    sql = `DELETE FROM mp_shoppinglist WHERE userId = ? AND DATE(weekDate) = DATE(?)`;
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
      sql = `SELECT parsedIngredients FROM mp_userrecipes WHERE userId = ? AND recipeId = ?`;
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
      sql = `INSERT INTO mp_shoppinglist (userId, ingredientName, quantity, measurement, weekDate) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`;
      let params = [userId, name, quantity, measurement, startDate]; // Using startDate as the date for the shopping list
      await executeSQL(sql, params);
    }
  } catch (error) {
    console.log(`Error updating shopping list for user ${userId}:`, error);
  }
}





app.get("/shoppingList", async function(req, res) {
  let userId = await getUserIdFromSessionID(req.sessionID);
  console.log("User ID:", userId);
  if (userId) {
    // Define current week bounds
    const now = moment.tz('2023-08-07T05:15:00Z', 'America/Los_Angeles');
    const { start: monday, end: sunday } = getWeekBounds(now);
    let mondayString = moment.utc(monday).format('YYYY-MM-DD HH:mm:ss');
    let sundayString = moment.utc(sunday).format('YYYY-MM-DD HH:mm:ss');

    // Fetch shopping list from mp_shoppinglist for the current week
    let sql = `SELECT shoppingListId, ingredientName as name, quantity, checked
               FROM mp_shoppinglist 
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
      UPDATE mp_shoppinglist 
      SET checked = ? 
      WHERE shoppingListId = ? AND userId = ?
    `;
    console.log("Executing SQL:", sql, [checkedValue, shoppingListId, userId]);
    await executeSQL(sql, [checkedValue, shoppingListId, userId]);

    // Retrieve the ingredient details from the shopping list
    sql = `SELECT ingredientName, quantity, measurement FROM mp_shoppinglist WHERE shoppingListId = ?`;
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
        sql = `INSERT INTO mp_fridge (userId, ingredientName, quantity, unit, shoppingListId, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
        console.log("Executing SQL:", sql, [userId, ingredientName, quantity, unit, shoppingListId]);
        await executeSQL(sql, [userId, ingredientName, quantity, unit, shoppingListId]);
      } else {
        // Code to remove the ingredient from the fridge
        sql = `DELETE FROM mp_fridge WHERE userId = ? AND ingredientName = ? AND shoppingListId = ?`;
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





app.get("/fridge", async function(req, res) {
  let userId = await getUserIdFromSessionID(req.sessionID);
  console.log("User ID:", userId);
  if (userId) {
    let sql = `
      SELECT ingredientName, unit, SUM(quantity) as quantity 
      FROM mp_fridge 
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
      FROM mp_fridge
      WHERE userId = ? AND ingredientName = ? AND quantity > 0
    `, [userId, ingredientName]);

    const existingTotalQuantity = result[0].totalQuantity || 0;
    const difference = quantity - existingTotalQuantity;

    console.log(`Updating ${ingredientName}: existing quantity ${existingTotalQuantity}, new quantity ${quantity}, difference ${difference}`);

    if (difference < 0) {
      // Reduce quantity from the oldest entries
      let rowsToUpdate = await executeSQL(`
        SELECT id, quantity
        FROM mp_fridge
        WHERE userId = ? AND ingredientName = ? AND quantity > 0
        ORDER BY created_at ASC
      `, [userId, ingredientName]);

      let amountToReduce = -difference;
      for (const row of rowsToUpdate) {
        if (amountToReduce <= 0) break;

        const reduceBy = Math.min(amountToReduce, row.quantity);
        await executeSQL(`
          UPDATE mp_fridge
          SET quantity = quantity - ?
          WHERE id = ?
        `, [reduceBy, row.id]);

        amountToReduce -= reduceBy;
      }
    } else if (difference > 0) {
      // Add a new entry
      await executeSQL(`
        INSERT INTO mp_fridge (userId, ingredientName, quantity, unit, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, ingredientName, difference, unit]);
    }

    res.status(200).json({ success: "Item updated successfully" });
  } catch (err) {
    console.error("Error in updateFridgeItem:", err);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
});





app.get('/createRecipes', (req, res) => {

  res.render('createRecipes');
});



app.get('/bmi', async (req, res) => {
  //pass in user account may not be working user to user :(
  console.log("/bmi route");

  let sql = `SELECT *
              FROM mp_accounts
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




app.post('/bmi', async (req, res) => {

  let sessionID = req.sessionID; //sets sessionID variable as current session id 
  console.log("sessionID:", sessionID);
  let age = req.body.bmiAgeBox;
  let height = req.body.bmiHeightBox;
  let weight = req.body.bmiWeightBox;

  let sql = `UPDATE mp_accounts
                SET age=${age}, height=${height}, weight=${weight} 
                WHERE sessionId = ?`;
  await executeSQL(sql, [sessionID]);

  alert("Clicked Save");
  res.redirect('bmi');
});



// Route for editing a recipe
app.post('/editRecipe', async (req, res) => {
  let recipeId = req.body.recipeId;

  let recipeName = req.body.recipeName;
  let ingredientList = req.body.ingredientList;
  let instructions = req.body.instructions;
  let imageLink = req.body.imageLink;

  // Parse the ingredients and convert to JSON
  let parsedIngredients = parseIngredients(ingredientList);
  let jsonIngredients = JSON.stringify(parsedIngredients);

  let sessionID = req.sessionID;
  console.log("sessionId: ", sessionID)
  let sql = `SELECT userId FROM mp_accounts WHERE sessionId = ?`;
  let result = await executeSQL(sql, [sessionID]);
  let userId = result[0].userId;

  sql = `UPDATE mp_userrecipes SET recipeName = ?, ingredientList = ?, instructions = ?, imageLink = ?, parsedIngredients = ? WHERE recipeId = ? AND userId = ?`;
  let params = [recipeName, ingredientList, instructions, imageLink, jsonIngredients, recipeId, userId];

  await executeSQL(sql, params);
  console.log('Parsed ingredients: ', jsonIngredients);
  res.redirect('/myRecipes');
});




// Route for deleting a recipe
app.delete('/deleteRecipe', async (req, res) => {
  let recipeId = req.body.recipeId;
  let sessionID = req.sessionID;

  // Get the userId associated with this session
  let sql = `SELECT userId FROM mp_accounts WHERE sessionId = ?`;
  let result = await executeSQL(sql, [sessionID]);
  let userId = result[0].userId;

  // Delete the recipe
  sql = `DELETE FROM mp_userrecipes WHERE recipeId = ? AND userId = ?`;
  result = await executeSQL(sql, [recipeId, userId]);

  console.log(`Deleted recipe with ID ${recipeId}, result: ${JSON.stringify(result)}`);

  // Respond with a JSON object indicating success
  if (result.affectedRows > 0) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});







app.get('/myRecipes', async (req, res) => {
  let sessionID = req.sessionID;
  console.log("sessionId: ", sessionID)
  let sql = `SELECT userId FROM mp_accounts WHERE sessionId = ?`;
  let userId = await executeSQL(sql, [sessionID]);

  console.log("preuserId: ", userId)
  userId = userId[0].userId;
  console.log("userId: ", userId)

  sql = `SELECT *
              FROM mp_userrecipes
              WHERE userId = ?
              `;

  let data = await executeSQL(sql, [userId]);
  //console.log("data_test: ", data);
  res.render('myRecipes', { "userInfo": userId, "data": data });
});





app.get("/dbTest", async function(req, res) {
  let sql = "SELECT CURDATE()";
  let rows = await executeSQL(sql);
  res.send(rows);
});//dbTest


async function executeSQL(sql, params) {
  return new Promise(function(resolve, reject) {
    pool.query(sql, params, function(err, rows, fields) {
      if (err) {
        console.error("Error in executeSQL:", err);
        console.error("SQL Query:", sql);
        console.error("Parameters:", params);
        // Optionally, log more context or variables here
        return reject(err);
      }
      resolve(rows);
    });
  });
}



async function isAuth(req, res, next) {
  console.log("Entered isAuth function");

  //  grab rows where sessionId and userId match database 
  const sql = `SELECT * FROM mp_accounts WHERE sessionId = ?`;
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


//values in red must be updated
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

} //dbConnection

//start server
app.listen(3000, () => {
  console.log("Expresss server running...")
})




// pull recipe row from database mp_recipes based on recipeId
// sql = `SELECT *
//          FROM mp_recipes
//          WHERE recipeId = ?`;
// let data = await executeSQL(sql, [current]); data = data;



// api to use to search recipes:https://webknox-recipes.p.rapidapi.com/recipes/search