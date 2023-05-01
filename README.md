# Chromatic Cinemat ![](https://i.imgur.com/6s0gSsl.jpg)


## Table of Contents
1. [Overview](#Overview)
1. [Product Spec](#Product-Spec)
1. [Wireframes](#Wireframes)
2. [UI Design](#UI Design)
3. [Live Demo](#LiveDemo)

## Overview
### Description
The purpose of this application is to allow users to search for and save their favorite movies online. It also allows users to select a color that will not only change the background but implement a color when selecting the movie, you search for. 


### App Evaluation
[Evaluation of your app across the following attributes]
- **Category:** Movies
- **Web Application:** The application will be displayed.
- **Story:** Allows users to find movies and save the movies to their favorites. This application also has the added benefit of changing the color which is reflected in the movie page where the title nouns will match the color of the theme selected. 
- **Market:** Anyone that likes to watch movies. 
- **Habit:** Users can create a list of there favorite movies and save them to our database.  
- **Scope:** This app will aim to focus on allowing users to search for movies and add them to the database. 


## Product Spec

### 1. User Stories (Required and Optional)
**Required Must-have Stories**
* login/sign up can access the application unless logged in. 
* allows the users to select a color theme 
* User can search for movies on the search page
* can click on the image of the movie to be taken to the movie page and where more detail about the movie will be revealed.
* allows users to save movies to their favorites.
* stay signed in between sessions
* logout
* ...

### 2. Page Archetypes

* login/signup 
    * Allows users to login or out
* Home
    * show the top rated movies
* Search
    * Allows user to search for movies
* Profile Page
    * User can see infomation such email
    * User can see movies that they favorited
* Movies Page
    * Allows user to see more information on the movies such as title, poster, overview, genera​.
    * The also users to favorite and unfavorite there movies on this page.

### 3. UI Design
#### HomePage
![](https://i.imgur.com/0euezXC.jpg)

#### Signpage
![](https://i.imgur.com/c2qBtFj.jpg)


#### Login In
![](https://i.imgur.com/WOpef1d.jpg)

#### Searchpage
![](https://i.imgur.com/rcAb4Ut.jpg)


#### MoviePage
![](https://i.imgur.com/TE6tkea.jpg)


#### Profile-page:
![](https://i.imgur.com/LjaHvMs.jpg)



### 4. Navigation

**Tab Navigation**

* Homepage
* Search
* logout
* theme
* Profile

**Flow Navigation** 

* User

| Property | Type | Description |
| -------- | -------- | -------- |
| Email | String | User name set to firebase and mongdb database |
| Password | String | Password to account |

* Movie

| Property | Type | Description |
| -------- | -------- | -------- |
| Name | String | Name of song |
| Poster | url | url of poster |
| title | string | title of the movie  |
| overview | string | description of movie |
|  Average Rating| string | rating of the movie |
| Budget | string | an cost of budget |
| Genra | string | genra of movies |


* Authentication:

| Property | Type | Description |
| -------- | -------- | -------- |
| Request_token | String | used to request acesses api |
| Access_token | String | given from posting the request token |

### themoviedb
    * Base Url  https://api.themoviedb.org/



| HTTP Verb  1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| Get | /movie/:id | get movie id |
| Get | /search/:query/:page | Get page query string |
| Get | /top_rated | Get top rated movies |
| Get | search/movie | Get tracks information |
