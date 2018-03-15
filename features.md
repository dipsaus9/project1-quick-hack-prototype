# Progressive Enhancement
This project is made in a week. This causes the app doesn't work on each device or for each user. In this file I'll descirbe the problems off the app and how I will solve these problems.

* JS Disabled gives a broken page
This webpage is based on a JS. Alle script, map, routeplanner is based on a JS script. For this moment you can't use the website without JS. I will solve this by creating a form. When you submit the form the server will calculate your route and will return a html element.

* Images
The website doesn't use any images. This is no problem yet in the app.

* Custom fonts
The app uses some custom fonts. On fast internet it won't be a problem. I didn't write a fallback font yet. This will be one off the next features

* Color
The app can be used when you are colorblind or change the contrast of your device. The app doesn't lose it's function. There may be a better solution for the colors but the page can still be used without it.

* Internet connection
I tested the page on a slow internet connection (2G). It surprises me how fast the page is loading. It still can be faster cause I'm using a mapbox plugin. In the next feature I'll disable the mapbox if your internet is slow.

* Cookies
I'm not using Cookies

* Local storage
I'm not using local storage yet. I will use this for the next feature. Here I'll save all the routes already planned. I'll also store all subway stations, this will result in a faster loading page.

* Trackpad Disabled
The website can be used without trackpad. All functions are suported.


## Testing with a screenreader
I tested the browser with a screenreader. Some url's are not working properly cause they don't have any aria label. With a aria label I can descirbe the function of these elements. The screenreader can actually understand my code really good.

## Testing on a mobile device
The webapp isn't made for mobile yet. This will be one off the biggest features of the next commit.
