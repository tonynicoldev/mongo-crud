const express = require('express')
const app = express()
const mongoose = require('mongoose')        // Mongo object data mapping driver. Mongo uses pooling by default
mongoose.pluralize(null)                    // Mongoose pluralises collections by default. This stops it doing that
// const regexEscape = require('regex-escape') // Mongo doesn't escape regex strings so use this to do it if you need to. e.g. search for C++ with regex
                                            // you would need to write { $regex: "c\\+\\+"} as + means something in regex so use the function to clean it
                                            // Reserved chars are .  *  +  ?  ^  $  (  )  [  ]  {  }  |
const regexEscape = require('regex-escape').default // Now (v4) returns an object so need .default to get the function

require('dotenv').config()

const NODE_PORT = process.env.APP_PORT

mongoose.set('strictQuery', true) // Only fields in the schema will be saved even of others are sent. Set to false to allow others if there is a good reason
mongoose.connect(process.env.CON_STR) // Connect to the database

const db = mongoose.connection // Get access to the connection. Mongo does support connection pool too, but this is a single connection

// Register mongoose events using on(). This registers connection error event and executes the callback if triggered. Could register 'connected' too
db.on('error', (error) => { throw error })

// .once registers a listener like on, but once triggered, it unregisters it. The 'open' event is triggered when the connection to mongo is opened sucessfully
db.once('open', (res) =>
  console.log(`MongoDB server started and connected to: ${mongoose.connection.name} database`))


// create schema. i.e. how the object maps to the data
const bookSchema = new mongoose.Schema({
  author: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  pages: {
    type: Number,
    required: false
  },
  keywords: {
    type: [],
    required: false
  },
  rating: {
    type: Number,
    required: false
  },
  reviews: {
    type: [
      {
        name: { type: String, required: true },
        comments: { type: String, required: true }
      }
    ],
    default: [] // Can be empty
  }
})

// Instantiate the model so we can use the bookModel object to access the collection based on the schema
// .model(collection, schema). Mongoose looks for a collection which is lower case called books and maps it to bookModel
// This way we can work with a javascript object then deploy it to the collection in one go, and Mongoose validates it using the schema
// If the collection doesn't exist, it will be created
const bookModel = mongoose.model('books', bookSchema)

app.use(express.urlencoded({ extended: true })) // Detect url encoded data in http and add to req body
app.use(express.json()) // Detect json data and put it into the req.body


app.get('/', (req, res) => {
  res.send(`Mongo app is alive`)
})


// Get all books
// Note: Mongoose returns an object with the data and loads of methods. If you want just the data, use .lean() on the find
// This is illustrated by the two console.log statements in the code - one using lean and one not doing. .lean() is more efficient
// for large datasets
app.get('/books', async (req, res) => {
  try {
    const booksLean = await bookModel.find().lean() // Get all of them but just the data
    const books = await bookModel.find() // Get all of them
    console.log("Books", books)
    console.log("Books Lean", booksLean)
    if (books.length == 0) res.sendStatus(404)
    else
      res.json(books) // json will pull the docs data out and stringify it so doesn't care: books or booksLean
  } catch (err) {
    res.sendStatus(500)
  }
})


// How to find data similar to SQL LIKE. e.g. find authors with bill in their name
app.get('/books/:author', async (req, res) => {
  const like = regexEscape(req.params.author) // Just in case there are any special chars in there. Avoid regex injection

  try {
    books = await bookModel.find({ author: { $regex: like, $options: 'i' } }) // the 'i' option makes the search case insensitive
    if (books.length == 0) res.sendStatus(404)
    else
      res.json(books)
  } catch (err) {
    res.sendStatus(500)
  }
})


// Create a NEW document in the collection
app.post('/book', async (req, res) => {
  const book = req.body

  try {
    await bookModel.create(book) // Create new document in the database
    res.sendStatus(201)
  } catch (err) {
    res.status(422).send(err.message)
  }
})

// UPDATE whatever is in the body except the id. This must remain the same
// Just send what you need changing
app.patch('/book', async (req, res) => {
  const id = req.body.id
  const doc = req.body
  delete doc.id // Delete id as we don't want to update that

  try {
    const result = await bookModel.findByIdAndUpdate(id, doc, { new: true }) // New true returns the modified doc not the original
    if (!result) res.sendStatus(404)
    else
      res.json(result) // Success but no content to return
  } catch (err) {
    res.status(422).send(err.reason.message) // 422 unprocessable for some reason
  }
})

// REPLACE the whole document but keep the ID the same. PUT is not used much in REST these days
// If there are mandatory fields then these need to be provided or schema check will fail it
app.put('/book', async (req, res) => {
  const id = req.body.id
  const doc = req.body
  delete doc.id

  try {
    const result = await bookModel.findOneAndReplace({ _id: id }, doc, { new: true })
    if (!result) res.status(404).send()
    else {
      res.json(result)
    }
  } catch (err) {
    res.status(422).send(err.message)
  }
})


// Delete book by ID
app.delete('/book', async (req, res) => {
  const id = req.body.id

  try {
    const result = await bookModel.deleteOne({ _id: id })
    if (result.deletedCount == 0) res.status(404).send() // Couldn't find it
    else
      res.sendStatus(204)
  } catch (err) {
    res.status(500).send(err.message) // Server error
  }
})

// If it gets here without finding a route then 404 it
app.use(function (req, res) {
  res.status(404).send(`${req.url} not found`)
});

app.listen(NODE_PORT, () => console.log(`Listening on port ${NODE_PORT}`));