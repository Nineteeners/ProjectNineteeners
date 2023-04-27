const axios = require('axios');
const express = require('express');
const sharp = require('sharp');

const app = express();
app.use(express.static('./public'));


//API call description
const apiEndpoint = 'https://api.themoviedb.org/3/movie/{movieId}';
const apiKey = '7cc158372c00b8d6218089b844305d59';
const language = 'en-US';

//Replace one of the words in the title with a synonym for green
function modifyTitle(title, synonym) {
    //Picking which synonym to use
    const picked_synonym = synonym[Math.floor(Math.random() * synonym.length)];
    const words = title.split(' ');
    //If only 1 word, append synonym to beggining or the end
    if(words.length < 2){
        if(Math.random() < 0.5){
            words.unshift(picked_synonym);
        }
        else{
            words.push(picked_synonym);
        }
        return words.join(' ');
    }
    else{
        const randomIndex = Math.floor(Math.random() * words.length);
        words[randomIndex] = picked_synonym;
        return words.join(' ');
    }
}
//Pick a random tint of green shade anything from #004400 to #00ff00
function pickGreenTint() {
    const minGreen = parseInt("30", 16); // Convert hex to decimal
    const maxGreen = parseInt("FF", 16); // Convert hex to decimal
    const randomGreen = Math.floor(Math.random() * (maxGreen - minGreen + 1)) + minGreen; // Generate random number in range
    const randomGreenHex = randomGreen.toString(16); // Convert decimal to hex
    return '#00' + randomGreenHex + '00'; // Return green tint with #00 prefix;
}
  

//Download poster image and apply green tint
async function applyGreenTint(imageUrl) {
    const imageBuffer = await axios.get('https://image.tmdb.org/t/p/original/' + imageUrl, { responseType: 'arraybuffer' });
    const tintedImageBuffer = await sharp(imageBuffer.data)
        .tint(pickGreenTint())
        .toBuffer();    
    return tintedImageBuffer;
}

app.get('/movie/:id', async (req, res) => {
    const { id } = req.params;

    try{
        //Fetch movie data from API
        const response = await axios.get(apiEndpoint.replace('{movieId}', id), {
            params: {
                api_key: apiKey,
                language,
            },
        });
        const { original_title, poster_path } = response.data;

        //Modify original title
        const modifiedTitle = modifyTitle(original_title, ['Green','Sage','Emerald']);

        //Download poster image and apply green tint
        const tintedImageBuffer = await applyGreenTint(poster_path);

        //Convert image buffer to base64-encoded data URL
        const base64Image = Buffer.from(tintedImageBuffer).toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        //Send modified movie title and green-tinted poster image as response
        res.json({
            title: modifiedTitle,
            poster: dataUrl,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal server error');
    }
});


app.listen(3001, () => {
    console.log('Server listening on port 3001');
});
