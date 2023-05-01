const axios = require("axios");
const express = require("express");
const sharp = require("sharp");
const admin = require("firebase-admin");
const { MongoClient, ServerApiVersion } = require("mongodb");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.static("./public"));
app.use("/firebaseConfig", express.static("firebaseConfig.json"));
const bodyParser = require("body-parser");

app.use(bodyParser.json());

let themeColor = "green";
const apiEndpoint = "https://api.themoviedb.org/3/movie/{movieId}";
const apiKey = process.env.API_KEY;
const dbUser = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;
const language = "en-US";

//Connect to db
const uri = `mongodb+srv://${dbUser}:${dbPassword}@clusterchromaticcinema.cdhfty9.mongodb.net/ClusterChromaticCinema?retryWrites=true&w=majority`;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => console.log("Connected to MongoDB"));

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  favorite_movies: { type: [Number], default: [] },
});

const User = mongoose.model("User", userSchema);

//Initilize Firebase Admin
const serviceAccount = require("./chromatic-cinema-firebase-adminsdk-i6t8s-49bf2f33ad.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

//Authurization middleware
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("Unauthorized");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.log(error);
    res.status(401).send("Unauthorized");
  }
};

//MongoDB save user
async function saveUserToDatabase(uid, email) {
  const newUser = new User({
    uid: uid,
    email: email,
    favorite_movies: [],
  });

  try {
    await newUser.save();
    console.log(`User with uid ${uid} saved to the database`);
  } catch (error) {
    console.error(`Error while saving user with uid ${uid}: ${error.message}`);
  }
}

const colorSynonyms = {
  red: ["Crimson", "Scarlet", "Burgundy", "Cherry", "Ruby", "Rose", "Maroon"],
  blue: ["Navy", "Azure", "Cobalt", "Indigo", "Sapphire", "Sky", "Cerulean"],
  green: ["Emerald", "Olive", "Lime", "Forest", "Sage", "Chartreuse", "Kelly"],
  yellow: ["Gold", "Lemon", "Canary", "Amber", "Mustard", "Butter", "Blonde"],
  purple: ["Lavender", "Violet", "Mauve", "Plum", "Grape", "Lilac", "Amethyst"],
};

function modifyTitle(title, color) {
  const synonyms = colorSynonyms[color];
  const pickedSynonym = synonyms[Math.floor(Math.random() * synonyms.length)];
  const words = title.split(" ");

  if (words.length < 2) {
    if (Math.random() < 0.5) {
      words.unshift(pickedSynonym);
    } else {
      words.push(pickedSynonym);
    }
    return words.join(" ");
  } else {
    const randomIndex = Math.floor(Math.random() * words.length);
    words[randomIndex] = pickedSynonym;
    return words.join(" ");
  }
}

function pickColorTint(color) {
  const min = parseInt("30", 16);
  const max = parseInt("FF", 16);
  const randomValue = Math.floor(Math.random() * (max - min + 1)) + min;
  const randomHex = randomValue.toString(16);

  switch (color) {
    case "red":
      return "#" + randomHex + "0000";
    case "blue":
      return "#0000" + randomHex;
    case "green":
      return "#00" + randomHex + "00";
    case "yellow":
      return "#" + randomHex + randomHex + "00";
    case "purple":
      return "#" + randomHex + "00" + randomHex;
    default:
      return "#000000";
  }
}

async function applyColorTint(imageUrl, color) {
  const imageBuffer = await axios.get(
    "https://image.tmdb.org/t/p/w500/" + imageUrl,
    {
      responseType: "arraybuffer",
    }
  );
  const tintedImageBuffer = await sharp(imageBuffer.data)
    .tint(pickColorTint(color))
    .toBuffer();
  return tintedImageBuffer;
}

async function modifyMovies(element, color) {
  const { original_title, poster_path } = element;

  const modifiedTitle = modifyTitle(original_title, color);
  const tintedImageBuffer = await applyColorTint(poster_path, color);

  const base64Image = Buffer.from(tintedImageBuffer).toString("base64");
  const dataUrl = `data:image/jpeg;base64,${base64Image}`;

  const modifiedResponse = {
    ...element,
    title: modifiedTitle,
    poster: dataUrl,
  };

  return modifiedResponse;
}

app.post("/theme", (req, res) => {
  themeColor = req.body.color;
  res.send({ color: themeColor });
});

app.get("/theme", (req, res) => {
  res.send({ color: themeColor });
});

//Homepage
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

//API endpoint to fetch movie dat
app.get("/movie/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch movie data from API
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${id}`,
      {
        params: {
          api_key: apiKey,
          language,
        },
      }
    );
    const movie = response.data;

    // Modify the movie using modifyMovies function
    const modifiedMovie = await modifyMovies(movie, themeColor);

    // Send modified response as JSON
    res.json(modifiedMovie);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

// API endpoint to search for movies with pagination
app.get("/search/:query/:page", authMiddleware, async (req, res) => {
  const { query, page } = req.params;

  // Set the number of results per page
  const perPage = 6;

  try {
    // Fetch movie data from API with pagination
    const response = await axios.get(
      "https://api.themoviedb.org/3/search/movie",
      {
        params: {
          api_key: apiKey,
          language,
          query,
          page,
        },
      }
    );

    // Extract the movies from the API response and filter out movies with NULL posters
    const allMovies = response.data.results.filter(
      (movie) => movie.poster_path !== null
    );

    // Calculate the total number of pages
    const totalPages = Math.ceil(allMovies.length / perPage);

    // Calculate the start and end index for slicing the results
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;

    // Limit the number of results by slicing the array
    const movies = allMovies.slice(startIndex, endIndex);

    // Modify each movie in the array using the modifyMovies function
    const modifiedMovies = await Promise.all(
      movies.map((movie) => modifyMovies(movie, themeColor))
    );

    // Send the modified response objects and total pages back to the client
    res.send({
      results: modifiedMovies,
      total_pages: totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error.");
  }
});

//API endpoint to fetch popular movies

// Modify the popular movies endpoint
app.get("/popular", async (req, res) => {
  try {
    // Fetch movie data from API
    const response = await axios.get(
      "https://api.themoviedb.org/3/movie/popular",
      {
        params: {
          api_key: apiKey,
          language,
        },
      }
    );
    const movies = response.data.results;

    // Modify each movie in the array (title and poster)
    const modifiedMovies = await Promise.all(
      movies.map((movie) => modifyMovies(movie, themeColor))
    );

    // Send modified movies as response
    res.json(modifiedMovies);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

// Modify the top rated movies endpoint
app.get("/top_rated", async (req, res) => {
  try {
    // Fetch top rated movie data from API
    const response = await axios.get(
      "https://api.themoviedb.org/3/movie/top_rated",
      {
        params: {
          api_key: apiKey,
          language,
        },
      }
    );
    const movies = response.data.results;

    // Modify each movie in the array (title and poster)
    const modifiedMovies = await Promise.all(
      movies.map((movie) => modifyMovies(movie, themeColor))
    );

    // Send modified movies as response
    res.json(modifiedMovies);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

app.get("/profile", authMiddleware, (req, res) => {
  const uid = req.user.uid;

  User.findOne({ uid })
    .then((user) => {
      if (!user) {
        console.error(`User with uid ${uid} not found`);
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    })
    .catch((error) => {
      console.error(
        `Error while finding user with uid ${uid}: ${error.message}`
      );
      res.status(500).json({ error: "Internal server error" });
    });
});

// Signup endpoint
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRecord = await auth.createUser({ email, password });
    await saveUserToDatabase(userRecord.uid, email);
    res.status(201).json({ uid: userRecord.uid });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

//List favorites
app.get("/favorites", authMiddleware, async (req, res) => {
  const uid = req.user.uid;

  try {
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const favoriteMoviesPromises = user.favorite_movies.map(async (movieId) => {
      const response = await axios.get(
        `https://api.themoviedb.org/3/movie/${movieId}`,
        {
          params: {
            api_key: process.env.API_KEY,
          },
        }
      );

      const modifiedResponse = await modifyMovies(response.data, themeColor);
      return modifiedResponse;
    });

    const favoriteMovies = await Promise.all(favoriteMoviesPromises);
    const modifiedFavoriteMovies = favoriteMovies.reduce((acc, movie) => {
      acc[movie.id] = movie;
      return acc;
    }, {});

    res.json(modifiedFavoriteMovies);
  } catch (error) {
    console.error("Error fetching favorite movies:", error);
    res.status(500).json({ error: "Failed to fetch favorite movies" });
  }
});

//Check if movie in favorites
app.get("/favorites/check/:movieId", authMiddleware, async (req, res) => {
  const uid = req.user.uid;
  const movieId = parseInt(req.params.movieId);

  try {
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isFavorite = user.favorite_movies.includes(movieId);
    res.json({ isFavorite });
  } catch (error) {
    console.error(`Error while checking favorite movie: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

//Add to favorites list
app.post("/favorites/:movieId", authMiddleware, async (req, res) => {
  const uid = req.user.uid;
  const movieId = parseInt(req.params.movieId);

  try {
    const user = await User.findOneAndUpdate(
      { uid },
      { $addToSet: { favorite_movies: movieId } }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Movie added to favorites" });
  } catch (error) {
    console.error(`Error while adding favorite movie: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

//Delete from favorites list
app.delete("/favorites/:movieId", authMiddleware, async (req, res) => {
  const uid = req.user.uid;
  const movieId = parseInt(req.params.movieId);

  try {
    const user = await User.findOneAndUpdate(
      { uid },
      { $pull: { favorite_movies: movieId } }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Movie removed from favorites" });
  } catch (error) {
    console.error(`Error while removing favorite movie: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check email endpoint
app.get("/check-email/:email", async (req, res) => {
  const email = req.params.email;

  try {
    const user = await User.findOne({ email });
    if (user) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error(`Error while checking email: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on port http://localhost:${port}`);
});
