
Hanzi Writer
=====================

[![CircleCI](https://img.shields.io/circleci/project/github/chanind/hanzi-writer/master.svg)](https://circleci.com/gh/chanind/hanzi-writer/tree/master)
[![Codecov](https://img.shields.io/codecov/c/github/chanind/hanzi-writer/master.svg)](https://codecov.io/gh/chanind/hanzi-writer)
[![npm](https://img.shields.io/npm/v/hanzi-writer.svg)](https://www.npmjs.com/package/hanzi-writer)

https://chanind.github.io/hanzi-writer

Hanzi Writer is a free and open-source javascript library for Chinese character stroke order animations and stroke order practice quizzes. Works with both simplified and traditional characters.

[Live demo](https://chanind.github.io/hanzi-writer/demo.html)

## Getting Started and Documentation

For more info and instructions on getting started check out https://chanind.github.io/hanzi-writer

## Unordered Quiz Mode

If you want quizzes to accept strokes in any order, enable `ignoreStrokeOrder` when starting a quiz:

```js
writer.quiz({
  // other options as needed
  ignoreStrokeOrder: true,
});
```

Notes:
- When enabled, a user stroke is matched against any remaining stroke.
- `onMistake`/`onCorrectStroke` callbacks receive the matched `strokeNum` for the accepted/considered stroke.
- `strokesRemaining` reflects undrawn strokes count rather than sequential order.

## Skip Shape Fit Option

If you want to make stroke matching more lenient by skipping the shape similarity check, enable `skipShapeFit` when starting a quiz:

```js
writer.quiz({
  // other options as needed
  skipShapeFit: true,
});
```

When enabled, stroke matching will only check distance, direction, and length, while bypassing the shape fit check. This makes the quiz more lenient for users who may draw strokes with slightly different shapes but correct overall structure.

This is particularly useful for characters with circular or curved strokes, such as:
- Alphabet letters: "O", "o", "Q"
- Numbers: "8", "0"

For more details, see the [skipShapeFit documentation](docs/skipShapeFit.md).

## Data source

The chinese character svg and stroke order data used by Hanzi Writer is derived from the [Make me a Hanzi](https://github.com/skishore/makemeahanzi) project with some slight tweaks. The data can be found in the [Hanzi Writer Data](https://github.com/chanind/hanzi-writer-data) repo. There's a visualizer for this data [here](https://chanind.github.io/hanzi-writer-data).

## Contributing

Pull requests are welcome! If you would like to contribute code, you'll need to be able to build the project locally. After cloning the Hanzi Writer repo, you can get it set up by running:

```
yarn install
```

You can run tests with `yarn test` and you can build the project with `yarn build`.

### Building on Windows PowerShell

If you're using Windows PowerShell, the build script uses Unix commands that may not work directly. Here are the steps to build the project:

1. **Install dependencies** (if not already done):
   ```powershell
   yarn install
   # or
   npm install
   ```

2. **Build the project**:
   
   Option A - Using npm/yarn (recommended):
   ```powershell
   npm run build
   # or
   yarn build
   ```
   
   Option B - Manual PowerShell commands:
   ```powershell
   # Remove the dist directory if it exists
   if (Test-Path dist) { Remove-Item -Recurse -Force dist }
   
   # Run the build
   npx rollup -c
   # or
   yarn rollup -c
   ```

3. **Run tests**:
   ```powershell
   npm test
   # or
   yarn test
   ```

**Note**: If you encounter issues with the build script, you may need to manually delete the `dist` folder before running the build command, as the `rm -rf` command in the build script may not work in PowerShell.

## License

Hanzi Writer is released under an [MIT](https://raw.githubusercontent.com/chanind/hanzi-writer/master/LICENSE) license.

The Hanzi Writer data comes from the [Make Me A Hanzi](https://github.com/skishore/makemeahanzi) project, which extracted the data from fonts by [Arphic Technology](http://www.arphic.com/), a Taiwanese font forge that released their work under a permissive license in 1999. You can redistribute and/or modify this data under the terms of the Arphic Public License as published by Arphic Technology Co., Ltd. A copy of this license can be found in [ARPHICPL.TXT](https://raw.githubusercontent.com/chanind/hanzi-writer-data/master/ARPHICPL.TXT).
