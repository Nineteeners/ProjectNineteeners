const axios = require("axios");
const express = require("express");
const sharp = require("sharp");

const app = express();
app.use(express.static("./public"));

//API call description
const apiEndpoint = "https://api.themoviedb.org/3/movie/{movieId}";
const apiKey = "7cc158372c00b8d6218089b844305d59";
const language = "en-US";

//Replace one of the words in the title with a synonym for green
function modifyTitle(title, synonym) {
  //Picking which synonym to use
  const picked_synonym = synonym[Math.floor(Math.random() * synonym.length)];
  const words = title.split(" ");
  //If only 1 word, append synonym to beggining or the end
  if (words.length < 2) {
    if (Math.random() < 0.5) {
      words.unshift(picked_synonym);
    } else {
      words.push(picked_synonym);
    }
    return words.join(" ");
  } else {
    const randomIndex = Math.floor(Math.random() * words.length);
    words[randomIndex] = picked_synonym;
    return words.join(" ");
  }
}
//Pick a random tint of green shade anything from #004400 to #00ff00
function pickGreenTint() {
  const minGreen = parseInt("30", 16); // Convert hex to decimal
  const maxGreen = parseInt("FF", 16); // Convert hex to decimal
  const randomGreen =
    Math.floor(Math.random() * (maxGreen - minGreen + 1)) + minGreen; // Generate random number in range
  const randomGreenHex = randomGreen.toString(16); // Convert decimal to hex
  return "#00" + randomGreenHex + "00"; // Return green tint with #00 prefix;
}

//Download poster image and apply green tint
async function applyGreenTint(imageUrl) {
    const imageBuffer = await axios.get(
        "https://image.tmdb.org/t/p/w500/" + imageUrl,
    { responseType: "arraybuffer" }
  );
  const tintedImageBuffer = await sharp(imageBuffer.data)
    .tint(pickGreenTint())
    .toBuffer();
  return tintedImageBuffer;
}
//Homepage
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

//API endpoint to fetch movie dat
app.get("/movie/:id", async (req, res) => {
  const { id } = req.params;

  try {
    //Fetch movie data from API
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${id}`,
      {
        params: {
          api_key: apiKey,
          language,
        },
      }
    );
    const { original_title, poster_path } = response.data;

    //Modify original title
    const modifiedTitle = modifyTitle(original_title, [
      "Green",
      "Sage",
      "Emerald",
    ]);

    //Download poster image and apply green tint
    const tintedImageBuffer = await applyGreenTint(poster_path);

    //Convert image buffer to base64-encoded data URL
    const base64Image = Buffer.from(tintedImageBuffer).toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    //Create new response object that includes all of the movie data
    const modifiedResponse = {
      ...response.data,
      title: modifiedTitle,
      poster: dataUrl,
    };

    //Send modified response as JSON
    res.json(modifiedResponse);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

//API endpoint to search for movies
// API endpoint to search for movies with pagination
app.get("/search/:query/:page", async (req, res) => {
    const { query } = req.params;
    const { page } = req.params;
  
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

    // Extract the movies from the API response
    const allMovies = response.data.results;

    // Calculate the start and end index for slicing the results
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;

    // Limit the number of results by slicing the array
    const movies = allMovies.slice(startIndex, endIndex);

    // Modify each movie in the array (title and poster)
    const modifiedMovies = await Promise.all(
      movies.map(async (element) => {
        const { original_title, poster_path } = element;

        // Modify original title
        const modifiedTitle = modifyTitle(original_title, [
          "Green",
          "Sage",
          "Emerald",
        ]);

        // Download poster image and apply green tint
        const tintedImageBuffer = await applyGreenTint(poster_path);

        // Convert image buffer to base64-encoded data URL
        const base64Image = Buffer.from(tintedImageBuffer).toString("base64");
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        // Create new response object that includes all of the movie data
        const modifiedResponse = {
          ...element,
          title: modifiedTitle,
          poster: dataUrl,
        };

        return modifiedResponse;
      })
    );

    // Calculate the total number of pages
    const totalPages = Math.ceil(response.data.total_results / perPage);

    // Send modified movies as response with pagination information
    res.json({
      page: parseInt(page, 10),
      total_pages: totalPages,
      total_results: response.data.total_results,
      results: modifiedMovies,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

//API endpoint to fet popular movies

app.get("/popular", async (req, res) => {
  try {
    //Fetch movie data from API
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

    //Send movies as response
    res.json(movies);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

app.listen(3001, () => {
  console.log("Server listening on port http://localhost:3001");
});
