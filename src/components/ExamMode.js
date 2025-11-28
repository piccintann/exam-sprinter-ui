import React, { useState, useEffect } from 'react';
import Question from './Question';
import { saveReport } from '../utils/reportUtils';

const ExamMode = ({ examData, settings, onComplete, onBack }) => {
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [startTime] = useState(new Date());
    const [timeLeft, setTimeLeft] = useState(settings.timeLimit * 60);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        initializeQuestions();
    }, [examData, settings]);

    useEffect(() => {
        if (timeLeft <= 0) {
            handleTimeUp();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const initializeQuestions = () => {
        let questionsToUse = [...examData];

        // Step 1: Applica il subset se richiesto
        if (settings.useSubset) {
            const startIndex = settings.startFromQuestion - 1; // Convert to 0-based index
            const endIndex = settings.endAtQuestion; // This is inclusive, so no -1
            questionsToUse = questionsToUse.slice(startIndex, endIndex);
            console.log(`Using subset: questions ${settings.startFromQuestion}-${settings.endAtQuestion} (${questionsToUse.length} questions)`);
        }

        // Step 2: Applica ordine random se richiesto
        if (settings.randomOrder) {
            questionsToUse = shuffleArray(questionsToUse);
            console.log('Questions shuffled randomly');
        }

        // Step 3: Limita al numero richiesto
        questionsToUse = questionsToUse.slice(0, settings.questionCount);
        console.log(`Final question set: ${questionsToUse.length} questions`);

        setQuestions(questionsToUse);
    };

    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    const handleAnswerChange = (questionIndex, answers) => {
        setUserAnswers({
            ...userAnswers,
            [questionIndex]: answers
        });
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleTimeUp = () => {
        if (!isFinished) {
            setIsFinished(true);
            handleFinish();
        }
    };

    const handleFinish = () => {
        if (isFinished) return;
        setIsFinished(true);
        const endTime = new Date();
        const report = generateReport(startTime, endTime);
        saveReport(report, 'exam');
        onComplete(report);
    };

    const generateReport = (startTime, endTime) => {
        const totalTime = Math.round((endTime - startTime) / 1000);
        let correctAnswers = 0;
        let totalAnswered = 0;

        questions.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            if (userAnswer && userAnswer.length > 0) {
                totalAnswered++;
                const correctIndices = question.answer_checks
                    .map((isCorrect, i) => isCorrect ? i : -1)
                    .filter(i => i !== -1);

                if (arraysEqual(userAnswer.sort(), correctIndices.sort())) {
                    correctAnswers++;
                }
            }
        });

        return {
            mode: 'exam',
            examName: examData[0]?.exam_name || 'Unknown',
            totalQuestions: questions.length,
            totalAnswered,
            correctAnswers,
            incorrectAnswers: totalAnswered - correctAnswers,
            unanswered: questions.length - totalAnswered,
            percentage: totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0,
            timeSpent: totalTime,
            timeLimit: settings.timeLimit * 60,
            timestamp: new Date().toISOString(),
            questions: questions,
            userAnswers
        };
    };

    const arraysEqual = (a, b) => {
        return a.length === b.length && a.every(val => b.includes(val));
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimerClass = () => {
        if (timeLeft <= 60) return 'timer critical';
        if (timeLeft <= 300) return 'timer warning';
        return 'timer';
    };

    if (questions.length === 0) {
        return <div className="loading">⏰ Loading exam...</div>;
    }

    return (
        <div className="exam-mode">
            <div className="exam-header">
                <button onClick={onBack} className="back-btn">← Back to Home</button>
                <h2>⏰ Exam Mode</h2>
                <div className={getTimerClass()}>
                    ⏱️ Time Left: {formatTime(timeLeft)}
                </div>
                <button onClick={handleFinish} className="finish-btn" disabled={isFinished}>
                    ✅ Finish Exam
                </button>
            </div>

            <Question
                questionData={questions[currentQuestionIndex]}
                questionIndex={currentQuestionIndex}
                totalQuestions={questions.length}
                userAnswers={userAnswers}
                onAnswerChange={handleAnswerChange}
                examName={examData[0]?.exam_name}
            />

            <div className="exam-controls">
                <button
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    className="nav-btn"
                >
                    ← Previous
                </button>

                <div className="question-nav">
                    {questions.map((_, index) => (
                        <button
                            key={index}
                            className={`question-nav-btn ${index === currentQuestionIndex ? 'current' : ''
                                } ${userAnswers[index] && userAnswers[index].length > 0 ? 'answered' : ''
                                }`}
                            onClick={() => setCurrentQuestionIndex(index)}
                        >
                            {index + 1}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleNext}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="nav-btn"
                >
                    Next →
                </button>
            </div>

            <div className="progress-container">
                <div className="progress">
                    <div
                        className="progress-bar"
                        style={{
                            width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`
                        }}
                    />
                </div>
                <span className="progress-text">{currentQuestionIndex + 1} / {questions.length}</span>
            </div>
        </div>
    );
};

export default ExamMode;
