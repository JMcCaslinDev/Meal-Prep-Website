
# Meal Prep and Health Tracker Application

## Overview
This application is a comprehensive web-based tool designed for meal preparation and health tracking. It enables users to effectively manage ingredients, recipes, meal calendars, and monitor nutritional intake, all while providing a user-friendly interface to track and maintain health goals.

## Features

### Current Features
- **User Authentication**: Secure login and signup functionalities.
- **Meal Calendar**: Plan and view meals by current week only.
- **Cook Meals Page**: View and update fridge inventory and daily macros and calories. (Not created yet)
- **Fridge Management**: Virtual representation of user's fridge with detailed item information.
- **Shopping List**: Dynamic list based on meal calendar for efficient shopping planning.
- **Ingredient Management**: Add and track ingredients with nutritional information.
- **Recipe Creation**: Users can create, save, and manage recipes.

### Frontend Components
- Developed using EJS templates.
- Key pages include home.ejs, addingredients.ejs, createrecipes.ejs.
- Responsive design for various devices and intuitive user interaction.

### Backend Components
- Built on Node.js with Express as the web server.
- MySQL for database management (Moved local from aws due to rising costs).
- Efficient handling of asynchronous database operations using async-mutex.

## Technical Aspects
- **index.js**: Central entry point, managing server startup, routes, and middleware.
- **Database Schema**: Structured tables for accounts, meals, ingredients, shopping lists, etc.
- **Challenges**: Ongoing improvements for accurate macro recording and recipe creation functionalities.

## Installation
[Instructions on how to install and setup the application.]

## Usage
[Guide on how to use the application, possibly with screenshots or GIFs demonstrating key features.]

## Planned Features and Next Steps
1. **Meal Calendar Enhancement**: Implement the ability to select meals for different weeks or specific dates.
    -   Add new api route for getting current recipes for user

2. **Cook Meals Page Functionality**: Finalize the cook meals page to include dynamic updating of databases based on the recipes being cooked and eaten.

3. **Shopping List and Fridge Improvements**: Ensure that the shopping list and fridge are fully dynamic, allowing for real-time updates and editing capabilities through modals or in-line editing.

4. **User Interface Refinement**: Continue enhancing the aesthetic and functional aspects of the user interface, focusing on improving user experience across all pages. This involves streamlining navigation, ensuring responsive design for various devices, and integrating intuitive design elements that facilitate user interaction with the application's features.

5. **SQL Database cloud based moved to local Need Testing** due to rising AWS hosting costs after 12 month trial plan we decided to take the sql database local to reduce development costs. AWS was originally implemented to gain experience in cloud hosting through Amazon Web Services. Need further testing to make sure transition happened smoothly and transfered over the correct information and tables.

## Contributing
[Guidelines for contributing to the project, including code style, commit message format, etc.] Adding later

## License
No License yet private development only for now.

## Contact
https://github.com/JMcCaslinDev
