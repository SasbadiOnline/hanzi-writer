# skipShapeFit Option

## Overview

The `skipShapeFit` option is a quiz setting that allows you to skip the shape fit check during stroke matching. When enabled, stroke matching becomes more lenient by only checking distance, direction, and length, while bypassing the shape similarity check.

## Usage

Enable `skipShapeFit` when starting a quiz:

```js
writer.quiz({
  // other options as needed
  skipShapeFit: true,
});
```

## How It Works

By default, stroke matching in Hanzi Writer uses multiple criteria to determine if a user's stroke matches the expected stroke:

1. **Distance check** - Average distance between user stroke and expected stroke
2. **Start/End match** - Starting and ending points proximity
3. **Direction match** - Direction similarity using cosine similarity
4. **Shape fit** - Shape similarity using Fréchet distance (this is skipped when `skipShapeFit: true`)
5. **Length match** - Length similarity

When `skipShapeFit` is set to `true`, the shape fit check (step 4) is bypassed, and the stroke is considered to pass the shape match requirement automatically. This makes the quiz more lenient, especially for users who may draw strokes with slightly different shapes but correct overall structure.

## When to Use

- **More lenient grading**: If you want to make stroke matching less strict about exact shape similarity
- **Performance**: Slightly faster matching since the Fréchet distance calculation is skipped
- **Accessibility**: Useful for users who may have difficulty drawing strokes with exact shape precision
- **Circular/curved characters**: Particularly useful for characters with circular or curved strokes, such as:
  - Alphabet letters: "O", "o", "Q"
  - Numbers: "8", "0"
  
  These characters often have strokes that are difficult to match exactly due to their circular nature, and `skipShapeFit` can make the matching more forgiving.

## Default Value

- **Default**: `false`
- The shape fit check is performed by default to ensure accurate stroke matching

## Technical Details

The shape fit check uses the Fréchet distance algorithm to compare the normalized curves of the user's stroke and the expected stroke. It tests multiple rotations to find the best match. When `skipShapeFit` is enabled, this entire check is bypassed, and the shape match is automatically considered successful.

## Related Options

- `leniency`: Controls overall strictness of stroke matching (affects all checks)
- `averageDistanceThreshold`: Controls the distance threshold for matching
- `acceptBackwardsStrokes`: Whether to accept strokes drawn in reverse direction
- `ignoreStrokeOrder`: Whether to accept strokes in any order

