import React, { useState } from 'react';
import '../styles/answerSheet.css';

interface Answer {
    questionNumber: number;
    correctAnswer: string;
}

interface AnswerSheetProps {
    answerKey: Answer[];
    numQuestions: number;
}

const AnswerSheet: React.FC<AnswerSheetProps> = ({ answerKey, numQuestions }) => {
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [showResults, setShowResults] = useState(false);

    const answerOptions = ['a', 'b', 'c', 'd'];

    const handleAnswerSelect = (questionNum: number, answer: string) => {
        if (showResults) return; // Don't allow changes after checking
        setUserAnswers((prev) => ({
            ...prev,
            [questionNum]: answer,
        }));
    };

    const handleCheckAnswers = () => {
        setShowResults(true);
    };

    const handleReset = () => {
        setUserAnswers({});
        setShowResults(false);
    };

    const getScore = () => {
        let correct = 0;
        answerKey.forEach((answer) => {
            if (userAnswers[answer.questionNumber] === answer.correctAnswer) {
                correct++;
            }
        });
        return { correct, total: answerKey.length };
    };

    const isCorrect = (questionNum: number): boolean | null => {
        if (!showResults) return null;
        const correctAnswer = answerKey.find((a) => a.questionNumber === questionNum);
        if (!correctAnswer) return null;
        return userAnswers[questionNum] === correctAnswer.correctAnswer;
    };

    const getCorrectAnswer = (questionNum: number): string | null => {
        const answer = answerKey.find((a) => a.questionNumber === questionNum);
        return answer ? answer.correctAnswer : null;
    };

    const score = showResults ? getScore() : null;

    return (
        <div className="answer-sheet">
            <div className="answer-sheet-header">
                <h3>Answer Sheet</h3>
                {answerKey.length === 0 && (
                    <p className="no-answers-message">
                        No answer key available for this test. The generator may not have included multiple-choice questions.
                    </p>
                )}
                {answerKey.length > 0 && !showResults && (
                    <p className="instructions">Select your answers below and click "Check Answers" when done.</p>
                )}
                {showResults && score && (
                    <div className="score-display">
                        <span className="score-label">Score:</span>
                        <span className="score-value">
                            {score.correct} / {score.total}
                        </span>
                        <span className="score-percentage">
                            ({Math.round((score.correct / score.total) * 100)}%)
                        </span>
                    </div>
                )}
            </div>

            {answerKey.length > 0 && (
                <>
                    <div className="answer-grid">
                        {answerKey.map((answer) => {
                            const questionNum = answer.questionNumber;
                            const userAnswer = userAnswers[questionNum];
                            const correctAnswer = getCorrectAnswer(questionNum);
                            const isAnswerCorrect = isCorrect(questionNum);

                            return (
                                <div
                                    key={questionNum}
                                    className={`answer-row ${showResults ? 'results-mode' : ''} ${isAnswerCorrect === true ? 'correct' : isAnswerCorrect === false ? 'incorrect' : ''
                                        }`}
                                >
                                    <div className="question-number">Q{questionNum}</div>
                                    <div className="answer-options">
                                        {answerOptions.map((option) => {
                                            const isSelected = userAnswer === option;
                                            const isCorrectOption = showResults && option === correctAnswer;
                                            const showAsCorrect = showResults && isCorrectOption;
                                            const showAsIncorrect = showResults && isSelected && !isCorrectOption;

                                            return (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    className={`answer-option ${isSelected ? 'selected' : ''} ${showAsCorrect ? 'correct-answer' : ''
                                                        } ${showAsIncorrect ? 'incorrect-answer' : ''}`}
                                                    onClick={() => handleAnswerSelect(questionNum, option)}
                                                    disabled={showResults}
                                                >
                                                    {option.toUpperCase()}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {showResults && (
                                        <div className="result-indicator">
                                            {isAnswerCorrect === true ? (
                                                <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            ) : (
                                                <svg className="x-icon" viewBox="0 0 20 20" fill="currentColor">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="answer-sheet-actions">
                        {!showResults ? (
                            <button
                                type="button"
                                className="check-button"
                                onClick={handleCheckAnswers}
                                disabled={Object.keys(userAnswers).length === 0}
                            >
                                Check Answers
                            </button>
                        ) : (
                            <button type="button" className="reset-button" onClick={handleReset}>
                                Try Again
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default AnswerSheet;
