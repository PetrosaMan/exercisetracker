require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

// added the following to this project
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const port = process.env.PORT || 3000;

// end of additions 
app.use(cors());
app.use(express.static('public'));

// Use bodyParser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Connect mongoose to mongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch(() => {
    console.log("Couldn't connect to MongoDB");
  });

// Create Mongodb schemas
const exerciseSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [exerciseSchema]

});

// mongoose models
const Exercise = mongoose.model("Exercise", exerciseSchema);
const User = mongoose.model("User", userSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/users
app.post('/api/users', async (req, res) => {
  const newUser = new User({ username: req.body.username });
  await newUser.save().
    then((savedUser) => {
      console.log("saved newUser");
      res.json({ username: savedUser.username, _id: savedUser.id })
    })
    .catch((err) => {
      console.error("Error saving newUser:", err);
      res.status(500).json({ err: "Error saving user" });
    });
});

// request for a list of users from database
app.get('/api/users', async (req, res) => {
  await User.find({}).
    then((users) => {
      res.json(users);
    })
    .catch((err) => {
      console.error("Error getting users:", err);
      res.status(500).json({ err: "Error getting users" });
    });
});

// POST /api/users/:_id/exercises
app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  const date = req.body.date;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.json({ err: "User not found" });
    } else {
      const newExercise = new Exercise({
        user_id: user._id,
        description: description,
        duration: duration,
        date: date ? new Date(date).toDateString() : new Date().toDateString()
      });
      await newExercise.save()
        .then((savedExercise) => {
          console.log("saved newExercise");
          res.json({
            _id: user.id,
            username: user.username,
            description: savedExercise.description,
            duration: savedExercise.duration,
            date: savedExercise.date.toDateString()
          });
        })
    }
  } catch (err) {
    console.log(err);
    res.send("Error in saving the exercise.");
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit} = req.query;
  const id = req.params._id;
  try {
  const user = await User.findById(id);
    
  if (!user) {
    res.send("User not found");
    return;
  } 
    
  let dateObj = {};
    
  if (from) {
      dateObj["$gte"] = new Date(from);
  };
    
  if (to) {
    dateObj["$lte"] = new Date(to);  
  };
    
  let filter = {
    user_id: id
  };
    
  if (from || to) {
    filter.date = dateObj;
  }
    
  const exercises = await Exercise.find(filter).limit(+limit ?? 500);
  
  const log = exercises.map((e) => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()    
  }));
  
  res.json({
    username: user.username,
    count: exercises.length,
    _id: user.id,
    log
  });
  } catch (err) {
    console.log(err);
    res.send("Error in getting log");
  }  
});


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
