import strokeMatches, { StrokeMatchResultMeta } from './strokeMatches';
import UserStroke from './models/UserStroke';
import Positioner from './Positioner';
import { counter, colorStringToVals, fixIndex } from './utils';
import * as quizActions from './quizActions';
import * as geometry from './geometry';
import * as characterActions from './characterActions';
import Character from './models/Character';
import { ParsedHanziWriterOptions, Point, StrokeData } from './typings/types';
import RenderState from './RenderState';
import { GenericMutation } from './Mutation';

const getDrawnPath = (userStroke: UserStroke) => ({
  pathString: geometry.getPathString(userStroke.externalPoints),
  points: userStroke.points.map((point) => geometry.round(point)),
});

export default class Quiz {
  _character: Character;
  _renderState: RenderState;
  _isActive: boolean;
  _positioner: Positioner;

  /** Set on startQuiz */
  _options: ParsedHanziWriterOptions | undefined;
  _currentStrokeIndex = 0;
  _mistakesOnStroke = 0;
  _totalMistakes = 0;
  _userStroke: UserStroke | undefined;
  _userStrokesIds: Array<number> | undefined;

  constructor(character: Character, renderState: RenderState, positioner: Positioner) {
    this._character = character;
    this._renderState = renderState;
    this._isActive = false;
    this._positioner = positioner;
  }

  startQuiz(options: ParsedHanziWriterOptions) {
    if (this._userStrokesIds) {
      this._renderState.run(
        quizActions.removeAllUserStrokes( this._userStrokesIds ),
      );
    }
    this._userStrokesIds = []

    this._isActive = true;
    this._options = options;
    const startIndex = fixIndex(
      options.quizStartStrokeNum,
      this._character.strokes.length,
    );
    this._currentStrokeIndex = Math.min(startIndex, this._character.strokes.length - 1);
    this._mistakesOnStroke = 0;
    this._totalMistakes = 0;

    return this._renderState.run(
      quizActions.startQuiz(
        this._character,
        options.strokeFadeDuration,
        this._currentStrokeIndex,
      ),
    );
  }

  startUserStroke(externalPoint: Point) {
    if (!this._isActive) {
      return null;
    }
    if (this._userStroke) {
      return this.endUserStroke();
    }
    const point = this._positioner.convertExternalPoint(externalPoint);
    const strokeId = counter();
    this._userStroke = new UserStroke(strokeId, point, externalPoint);
    this._userStrokesIds?.push(strokeId)
    return this._renderState.run(quizActions.startUserStroke(strokeId, point));
  }

  continueUserStroke(externalPoint: Point) {
    if (!this._userStroke) {
      return Promise.resolve();
    }
    const point = this._positioner.convertExternalPoint(externalPoint);
    this._userStroke.appendPoint(point, externalPoint);
    const nextPoints = this._userStroke.points.slice(0);
    return this._renderState.run(
      quizActions.updateUserStroke(this._userStroke.id, nextPoints),
    );
  }

  setPositioner(positioner: Positioner) {
    this._positioner = positioner;
  }

  endUserStroke() {
    if (!this._userStroke) return;

    this._renderState.run(
      quizActions.hideUserStroke(
        this._userStroke.id,
        this._options!.drawingFadeDuration ?? 300,
      ),
    );

    // skip single-point strokes
    if (this._userStroke.points.length === 1) {
      this._userStroke = undefined;
      return;
    }

    const { acceptBackwardsStrokes, markStrokeCorrectAfterMisses, ignoreStrokeOrder } = this._options!;

    const computeMatch = (strokeIndex: number) =>
      strokeMatches(this._userStroke!, this._character, strokeIndex, {
        isOutlineVisible: this._renderState.state.character.outline.opacity > 0,
        leniency: this._options!.leniency,
        averageDistanceThreshold: this._options!.averageDistanceThreshold,
      });

    const remainingIndices = ignoreStrokeOrder
      ? this._getRemainingStrokeIndices()
      : [this._currentStrokeIndex];

    // Try to find a matching stroke among remaining
    let selectedIndex = remainingIndices[0];
    let matchResult = computeMatch(selectedIndex);
    for (let i = 0; ignoreStrokeOrder && i < remainingIndices.length; i++) {
      const idx = remainingIndices[i];
      const res = computeMatch(idx);
      if (res.isMatch) {
        selectedIndex = idx;
        matchResult = res;
        break;
      }
      // keep meta updated to the last checked index for failure/hint context
      selectedIndex = idx;
      matchResult = res;
    }

    // if markStrokeCorrectAfterMisses is passed, just force the stroke to count as correct after n tries
    const isForceAccepted =
      markStrokeCorrectAfterMisses &&
      this._mistakesOnStroke + 1 >= markStrokeCorrectAfterMisses;

    // When unordered and none matched, pick the closest remaining stroke as hint/forced target
    if (ignoreStrokeOrder && !matchResult.isMatch) {
      let bestIdx = remainingIndices[0];
      let bestDist = this._character.strokes[bestIdx].getAverageDistance(this._userStroke!.points);
      for (let i = 1; i < remainingIndices.length; i++) {
        const idx = remainingIndices[i];
        const dist = this._character.strokes[idx].getAverageDistance(this._userStroke!.points);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      }
      selectedIndex = bestIdx;
      matchResult = computeMatch(selectedIndex);
    }

    const { isMatch, meta } = matchResult;

    const isAccepted =
      isMatch || isForceAccepted || (meta.isStrokeBackwards && acceptBackwardsStrokes);

    if (isAccepted) {
      this._handleSuccess(meta, selectedIndex);
    } else {
      this._handleFailure(meta, selectedIndex);

      const {
        showHintAfterMisses,
        highlightColor,
        strokeHighlightSpeed,
      } = this._options!;

      if (
        showHintAfterMisses !== false &&
        this._mistakesOnStroke >= showHintAfterMisses
      ) {
        this._renderState.run(
          characterActions.highlightStroke(
            this._character.strokes[selectedIndex],
            colorStringToVals(highlightColor),
            strokeHighlightSpeed,
          ),
        );
      }
    }

    this._userStroke = undefined;
  }

  cancel() {
    this._isActive = false;
    if (this._userStrokesIds) {
      this._renderState.run(
        quizActions.removeAllUserStrokes( this._userStrokesIds ),
      );
    }
  }

  _getStrokeData({
    isCorrect,
    meta,
    strokeIndex,
  }: {
    isCorrect: boolean;
    meta: StrokeMatchResultMeta;
    strokeIndex?: number;
  }): StrokeData {
    const idx = strokeIndex ?? this._currentStrokeIndex;
    const useOrder = !this._options?.ignoreStrokeOrder;
    const strokesRemaining = useOrder
      ? this._character.strokes.length - this._currentStrokeIndex - (isCorrect ? 1 : 0)
      : this._countRemainingStrokes() - (isCorrect ? 1 : 0);

    return {
      character: this._character.symbol,
      strokeNum: idx,
      mistakesOnStroke: this._mistakesOnStroke,
      totalMistakes: this._totalMistakes,
      strokesRemaining,
      drawnPath: getDrawnPath(this._userStroke!),
      isBackwards: meta.isStrokeBackwards,
    };
  }

  nextStroke() {
    if (!this._options) return;

    const { strokes, symbol } = this._character;

    const {
      onComplete,
      highlightOnComplete,
      strokeFadeDuration,
      highlightCompleteColor,
      highlightColor,
      strokeHighlightDuration,
    } = this._options;

    let animation: GenericMutation[] = characterActions.showStroke(
      'main',
      this._currentStrokeIndex,
      strokeFadeDuration,
    );

    this._mistakesOnStroke = 0;
    this._currentStrokeIndex += 1;

    const isComplete = this._currentStrokeIndex === strokes.length;

    if (isComplete) {
      this._isActive = false;
      onComplete?.({
        character: symbol,
        totalMistakes: this._totalMistakes,
      });
      if (highlightOnComplete) {
        animation = animation.concat(
          quizActions.highlightCompleteChar(
            this._character,
            colorStringToVals(highlightCompleteColor || highlightColor),
            (strokeHighlightDuration || 0) * 2,
          ),
        );
      }
    }

    this._renderState.run(animation);
  }

  _handleSuccess(meta: StrokeMatchResultMeta, strokeIndex?: number) {
    if (!this._options) return;

    const {
      onCorrectStroke,
      highlightOnComplete,
      highlightCompleteColor,
      highlightColor,
      strokeHighlightDuration,
      strokeFadeDuration,
      onComplete,
    } = this._options;

    const idx = strokeIndex ?? this._currentStrokeIndex;
    onCorrectStroke?.({
      ...this._getStrokeData({ isCorrect: true, meta, strokeIndex: idx }),
    });

    // Reset mistakes after a successful stroke
    this._mistakesOnStroke = 0;

    if (this._options.ignoreStrokeOrder && strokeIndex !== undefined) {
      // Draw the selected stroke and check for completion
      let animation: GenericMutation[] = characterActions.showStroke(
        'main',
        idx,
        strokeFadeDuration,
      );

      const isNowComplete = this._countRemainingStrokes() === 1; // this stroke will be drawn now
      if (isNowComplete) {
        this._isActive = false;
        onComplete?.({ character: this._character.symbol, totalMistakes: this._totalMistakes });
        if (highlightOnComplete) {
          animation = animation.concat(
            quizActions.highlightCompleteChar(
              this._character,
              colorStringToVals(highlightCompleteColor || highlightColor),
              (strokeHighlightDuration || 0) * 2,
            ),
          );
        }
      }
      this._renderState.run(animation);
    } else {
      this.nextStroke();
    }
  }

  _handleFailure(meta: StrokeMatchResultMeta, strokeIndex?: number) {
    this._mistakesOnStroke += 1;
    this._totalMistakes += 1;
    this._options!.onMistake?.(
      this._getStrokeData({ isCorrect: false, meta, strokeIndex }),
    );
  }

  _getCurrentStroke() {
    return this._character.strokes[this._currentStrokeIndex];
  }

  _getRemainingStrokeIndices(): number[] {
    const mainStrokes = this._renderState.state.character.main.strokes;
    const indices: number[] = [];
    for (let i = 0; i < this._character.strokes.length; i++) {
      if (mainStrokes[i]?.opacity === 0) indices.push(i);
    }
    return indices;
  }

  _countRemainingStrokes(): number {
    return this._getRemainingStrokeIndices().length;
  }
}
