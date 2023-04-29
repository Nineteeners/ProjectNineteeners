const axios = require("axios");
const express = require("express");
const sharp = require("sharp");

const app = express();
app.use(express.static("./public"));
const bodyParser = require("body-parser");

app.use(bodyParser.json());

let themeColor = "green";
const apiEndpoint = "https://api.themoviedb.org/3/movie/{movieId}";
const apiKey = "7cc158372c00b8d6218089b844305d59";
const language = "en-US";

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
app.get("/movie/:id", async (req, res) => {
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
app.get("/search/:query/:page", async (req, res) => {
  const { query, page } = req.params;

  // Set the number of results per page
  const perPage = 9;

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

//API endpoint to fet popular movies

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

app.listen(3001, () => {
  console.log("Server listening on port http://localhost:3001");
});
