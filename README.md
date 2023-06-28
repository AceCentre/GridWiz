# GridWiz

![GridWiz Logo](https://github.com/AceCentre/GridWiz/blob/master/build/icons/256x256.png?raw=true "GridWiz Logo")

GridWiz is a simple app to make a custom Grid 3 Gridset with images from Google images. After installing it, Double click on the app, Enter your search term and select 7 images. When done hit export and import the file into the Grid 3. The Gridset can then be modified as you wish – adding sounds etc if you need to.

[Download and install it here](http://github.com/acecentre/GridWiz/releases/tag/0.0.1)

## Demo

[![GridWiz Demo](https://img.youtube.com/vi/5Rl4R7MWNW8/0.jpg)](https://www.youtube.com/watch?v=5Rl4R7MWNW8)

#### Build Setup

```bash
# install dependencies
yarn install

# serve with hot reload at localhost:9080
yarn dev

# build electron application for production
yarn build

# run unit & end-to-end tests
yarn test
```

> ⚠️ You have to manually make a change to the `g-i-s` dependency before you build. You must override the user-agent is uses. Replace it with `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36`. [Here is the issue for reference](https://github.com/jimkang/g-i-s/issues/21)

---

This project was generated with [electron-vue](https://github.com/SimulatedGREG/electron-vue)@[8fae476](https://github.com/SimulatedGREG/electron-vue/tree/8fae4763e9d225d3691b627e83b9e09b56f6c935) using [vue-cli](https://github.com/vuejs/vue-cli). Documentation about the original structure can be found [here](https://simulatedgreg.gitbooks.io/electron-vue/content/index.html).
