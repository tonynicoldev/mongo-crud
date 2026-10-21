# MongoDb demo
This is a basic demo of API-based CRUD operations on a MongoDb database

MongoDb, unlike relational databases, doesn't need a schema to operate. The demo uses no schema and accesses the database directly using the device driver. However, if a schema is preferred, there is an app.js in the /mongoose dir that illustrates the object data mapping (ODM) approach to applying a scheme or partial schema to a collection using the npm mongoose package

Enterprises have moved away from the ODM for large systems and focus on direct access which improves performance so that's the approach I'm now focussing on

The application is not modularised and endpoint values are not validated to avoid cluttering the code and masking the key objectives. However, the database code should be in its own module, the routes should be in a router and the endpoint parameters validated with something like the Joi npm package

## Prerequisites

1. MongoDb must be running either as an installed service or as a container
2. Use MongoDb Compass to create the **booksdb** database and **books** collection then use the import option to import the data /data/books.json
3. Start app.js

## Data
I've put some example json data files in /data for you to import into a database using Compass

## API endpoints
These are available for use in the .rest file for use with the booksdb database, books collection assuming the application is running on local host on port 3000

Check the application status: **GET** http://localhost:3000

Get all the books: **GET** http://localhost:3000/books

Specify author based on nearest match: **GET** http://localhost:3000/books/bill


Add a new book: **POST** http://localhost:3000/book

Partially update a document: **PATCH** http://localhost:3000/book

Update the whole document other than the id: **PUT** http://localhost:3000/book

delete the document based on id: **DELETE** http://localhost:3000/book