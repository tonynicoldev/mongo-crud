const express = require('express');
const app = express();
const { MongoClient, ObjectId } = require('mongodb'); // We only need these two classes from the library
const regexEscape = require('regex-escape').default;  // Escapes regular expressions entered by users (findByAuthor uses it)
require('dotenv').config();

const NODE_PORT = process.env.APP_PORT;
const CON_STR = process.env.CON_STR;

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const client = new MongoClient(CON_STR); // MongoDB handles pooling automatically

let db; 
let booksCollection;

async function start() {
  try {
    await client.connect(); // Create tcp connection and pool 
    db = client.db() // Uses DB name from connection string
    booksCollection = db.collection('books'); // Get access to the books collection

    console.log(`MongoDB connected to: ${db.databaseName}`);
    app.listen(NODE_PORT, () => console.log(`Listening on port ${NODE_PORT}`)); // Start http server now database is up
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start(); // Bootstrap the app


// ***** Routes *******

app.get('/', (req, res) => {
  res.send(`Mongo app is alive`);
})


// ⭐ Get all books with an optional minimum rating in the query. i.e. >= to rating
app.get('/books', async (req, res) => {
  const rating = Number(req.query.rating);
  let books;
  try {
    if (rating >=0)
      books = await booksCollection.find({ rating: { $gte: rating }}).toArray();
    else
      books = await booksCollection.find().toArray();

    if (books.length === 0) res.sendStatus(404);
    else res.json(books);
  } catch (err) {
    res.sendStatus(500);
  }
})



// ⭐ Find author but emulate SQL "like"
app.get('/books/:author', async (req, res) => {
  const like = regexEscape(req.params.author);

  try {
    const books = await booksCollection.find({
      author: { $regex: like, $options: 'i' }
    }).toArray();

    if (books.length === 0) res.sendStatus(404);
    else res.json(books);
  } catch (err) {
    res.sendStatus(500);
  }
})


// ⭐ Add a new book
app.post('/book', async (req, res) => {
  const book = req.body; 

  try {
    await booksCollection.insertOne(book);
    res.sendStatus(201);
  } catch (err) {
    res.status(422).send(err.message);
  }
})


// ⭐Partially update a document
app.patch('/book', async (req, res) => {
  const id = req.body.id;
  const doc = req.body;
  delete doc.id; // I don't want to add this as mongo manages the IDs

  try {
    const result = await booksCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: doc },
      { returnDocument: 'after' }
    );

    if (!result) res.sendStatus(404);
    else res.json(result);
  } catch (err) {
    res.status(422).send(err.message);
  }
})


// ⭐ Replace the whole document but the ID shouldn't change or that's a new book
app.put('/book', async (req, res) => {
  const id = req.body.id;
  const doc = req.body;
  delete doc.id;

  try {
    const result = await booksCollection.findOneAndReplace(
      { _id: new ObjectId(id) },
      doc,
      { returnDocument: 'after' }
    );

    if (!result) res.sendStatus(404);
    else res.json(result);
  } catch (err) {
    res.status(422).send(err.message);
  }
})


// ⭐ Delete a book based on id
app.delete('/book', async (req, res) => {
  const id = req.body.id;

  try {
    const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) res.sendStatus(404);
    else res.sendStatus(204);
  } catch (err) {
    res.status(500).send(err.message);
  }
})


// ⭐ 404 FALLBACK
app.use((req, res) => {
  res.status(404).send(`${req.url} not found`);
})


