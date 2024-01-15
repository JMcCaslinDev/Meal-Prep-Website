Meal Prep and Health Tracker Application
Overview
This application is a comprehensive web-based tool designed for meal preparation and health tracking. It enables users to effectively manage ingredients, recipes, meal calendars, and monitor nutritional intake, all while providing a user-friendly interface to track and maintain health goals.

Features
Current Features
User Authentication: Secure login and signup functionalities.
Meal Calendar: Plan and view meals by week or date.
Cook Meals Page: View and update meal preparation status.
Fridge Management: Virtual representation of user's fridge with detailed item information.
Shopping List: Dynamic list based on meal calendar for efficient shopping planning.
Ingredient Management: Add and track ingredients with nutritional information.
Recipe Creation: Users can create, save, and manage recipes.
Frontend Components
Developed using EJS templates.
Key pages include home.ejs, addingredients.ejs, createrecipes.ejs.
Responsive design for various devices and intuitive user interaction.
Backend Components
Built on Node.js with Express as the web server.
MySQL for database management.
Efficient handling of asynchronous database operations using async-mutex.
Technical Aspects
index.js: Central entry point, managing server startup, routes, and middleware.
Database Schema: Structured tables for accounts, meals, ingredients, shopping lists, etc.
Challenges: Ongoing improvements for accurate macro recording and recipe creation functionalities.
Installation
[Instructions on how to install and setup the application.]

Usage
[Guide on how to use the application, possibly with screenshots or GIFs demonstrating key features.]



**Project Overview:**
Your project is a meal prep and health tracker application, with a focus on managing ingredients, recipes, meal calendars, and nutritional tracking. The application is being developed using Node.js, Express for the backend, and EJS for templating the frontend. The data is stored in a MySQL database, and the server is set up to run on port 3000. The application includes user authentication, session management, and password encryption for security. 

**Frontend Components:**
1. **Home Page**: Serves as a hub or dashboard, potentially displaying today's macros and calories, meals, and offering navigation to other pages like meal calendar, shopping list, ingredients, and recipes.

2. **Meal Calendar Page**: Allows for meal planning with a calendar view, where users can select meals for each day of the week.

3. **Cook Meals Page**: Enables users to view recipes, mark meals as cooked or eaten, and track ingredient usage to update the virtual fridge accordingly.

4. **Fridge Page**: A virtual representation of a user's fridge, showing details like the date of purchase, amount, expected expiration, etc., with functionalities for editing and updating.

5. **Shopping List Page**: A dynamic list that helps users track what ingredients they need to buy on a weekly basis, with the ability to check off items and update quantities.

6. **Ingredients Page**: Where users can add new ingredients to their list, which are then reflected in the database.

7. **Create Recipes Page**: Users can create new recipes, which will then be saved to the database and can be selected for the meal calendar.

8. **My Recipes Page**: Displays all the recipes created or saved by the user.

**Backend Components:**
1. **Database Schema**: Consists of several tables such as accounts, fridge, ingredients, mealcalendar, recipes, and shoppinglist. Each table stores relevant data for different aspects of the application.

2. **API Endpoints**: The backend includes various API endpoints for operations like logging in, signing up, adding ingredients, creating recipes, updating the meal calendar, managing the fridge and shopping list, etc.

3. **Data Management**: SQL queries are executed for all interactions with the database

, including user authentication, session storage, and CRUD operations for ingredients, recipes, and meal plans.

**Current Functionalities:**
- User login and session management to maintain state across the web application.
- Ability to add ingredients with associated calories (though currently not recording macros as intended).
- Recipe creation with the option to add a picture, name, ingredients, and instructions.
- A developing meal calendar that allows for weekly meal planning.
- An initial implementation of a shopping list that correlates with the meal calendar.
- A prototype fridge page to manage stored ingredients.

**Planned Features and Next Steps:**
1. **Macros and Calories Integration**: Update the application to ensure that macros and calories are properly recorded for ingredients and recipes. This involves adjusting the backend `POST` request handling to include all necessary fields and ensure that the MySQL database is updated accordingly.

2. **Meal Calendar Enhancement**: Implement the ability to select meals for different weeks or specific dates and automate the meal calendar based on calorie and macro requirements.

3. **Cook Meals Page Functionality**: Finalize the cook meals page to include dynamic updating of databases based on the recipes being cooked and eaten.

4. **Shopping List and Fridge Improvements**: Ensure that the shopping list and fridge are fully dynamic, allowing for real-time updates and editing capabilities through modals or in-line editing.

5. **User Interface Refinement**: Continue enhancing the aesthetic and functional aspects of the user interface, focusing on improving user experience across all pages. This involves streamlining navigation, ensuring responsive design for various devices, and integrating intuitive design elements that facilitate user interaction with the application's features.