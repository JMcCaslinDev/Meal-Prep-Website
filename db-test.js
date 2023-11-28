import mysql from 'mysql';

const connection = mysql.createConnection({
    host: "t07cxyau6qg7o5nz.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "zug8kuw2w01vf8ih",
    password: "kgegtpgz9r99pmgl",
    database: "ebhhu7g0z56xpgoy",
});

connection.connect(err => {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
  console.log('connected as id ' + connection.threadId);

  // Query to select all from mp_accounts
  connection.query('SELECT * FROM mp_accounts', (queryErr, results, fields) => {
    if (queryErr) {
      console.error('error executing query: ' + queryErr.stack);
    } else {
      console.log('Results: ', results);
      // Optionally log fields if needed
      // console.log('Fields: ', fields);
    }

    // End the connection inside the query callback
    connection.end();
  });
});

// Note: The connection.end() is moved inside the callback of the query
