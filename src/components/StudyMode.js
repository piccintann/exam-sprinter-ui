import React, { useState, useEffect } from 'react';
import Question from './Question';
import { saveReport } from '../utils/reportUtils';
import { getQuestionErrorStats } from '../utils/reportUtils';
import { t } from '../utils/i18n';

const StudyMode = ({ examData, settings, onComplete, onBack }) => {
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [startTime] = useState(new Date());
    const [showAnswers, setShowAnswers] = useState(false);

    useEffect(() => {
        initializeQuestions();
    }, [examData, settings]);

    const initializeQuestions = () => {
        let questionsToUse = [...examData];

        // Step 1: Applica il subset se richiesto
        if (settings.useSubset) {
            const startIndex = settings.startFromQuestion - 1;
            const endIndex = settings.endAtQuestion;
            questionsToUse = questionsToUse.slice(startIndex, endIndex);
            console.log(`Using subset: questions ${settings.startFromQuestion}-${settings.endAtQuestion} (${questionsToUse.length} questions)`);
        }

        // Step 2: Smart Mode - seleziona domande in base agli errori passati
        if (settings.smartMode && settings.randomOrder) {
            const examName = examData[0]?.exam_name || 'Unknown';
            const errorStats = getQuestionErrorStats(examName);

            if (errorStats) {
                // Ordina per error rate decrescente
                const scored = questionsToUse.map(q => ({
                    question: q,
                    errorRate: errorStats[q.question_number]?.errorRate || 0
                }));

                const weakQuestions = scored.filter(s => s.errorRate > 0)
                    .sort((a, b) => b.errorRate - a.errorRate)
                    .map(s => s.question);

                const otherQuestions = scored.filter(s => s.errorRate === 0)
                    .map(s => s.question);

                // 60% weak, 40% random
                const targetCount = Math.min(settings.questionCount, questionsToUse.length);
                const weakCount = Math.min(Math.ceil(targetCount * 0.6), weakQuestions.length);
                const randomCount = targetCount - weakCount;

                const selectedWeak = shuffleArray(weakQuestions).slice(0, weakCount);
                const selectedRandom = shuffleArray(otherQuestions).slice(0, randomCount);

                questionsToUse = shuffleArray([...selectedWeak, ...selectedRandom]);
                questionsToUse = questionsToUse.map(q => shuffleAnswers(q));
                console.log(`Smart mode: ${weakCount} weak + ${randomCount} random = ${questionsToUse.length} questions`);
            } else {
                // Nessun report, fallback a random normale
                questionsToUse = shuffleArray(questionsToUse);
                questionsToUse = questionsToUse.slice(0, settings.questionCount);
                questionsToUse = questionsToUse.map(q => shuffleAnswers(q));
                console.log('Smart mode: no past reports, using random');
            }
        } else if (settings.randomOrder) {
            // Step 2b: Random senza smart
            questionsToUse = shuffleArray(questionsToUse);
            questionsToUse = questionsToUse.slice(0, settings.questionCount);
            questionsToUse = questionsToUse.map(q => shuffleAnswers(q));
            console.log('Questions and answers shuffled randomly');
        } else {
            // Step 3: Sequenziale - limita al numero richiesto
            questionsToUse = questionsToUse.slice(0, settings.questionCount);
        }

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

    const shuffleAnswers = (question) => {
        const indices = question.answers.map((_, i) => i);
        // Fisher-Yates shuffle sugli indici
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        // Riordina answers, answer_checks, answer_labels e correct_answers
        const shuffledAnswers = indices.map(i => question.answers[i]);
        const shuffledChecks = indices.map(i => question.answer_checks[i]);
        const shuffledLabels = question.answer_labels
            ? question.answer_labels.map((_, idx) => question.answer_labels[idx])
            : null;

        return {
            ...question,
            answers: shuffledAnswers,
            answer_checks: shuffledChecks,
            answer_labels: shuffledLabels
        };
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
            setShowAnswers(false);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
            setShowAnswers(false);
        }
    };

    const handleShowAnswer = () => {
        setShowAnswers(!showAnswers);
    };

    const handleFinish = () => {
        const endTime = new Date();
        const report = generateReport(startTime, endTime);
        saveReport(report, 'study');
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
            mode: 'study',
            examName: examData[0]?.exam_name || 'Unknown',
            totalQuestions: questions.length,
            totalAnswered,
            correctAnswers,
            incorrectAnswers: totalAnswered - correctAnswers,
            unanswered: questions.length - totalAnswered,
            percentage: totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0,
            timeSpent: totalTime,
            timestamp: new Date().toISOString(),
            questions: questions,
            userAnswers
        };
    };

    const arraysEqual = (a, b) => {
        return a.length === b.length && a.every(val => b.includes(val));
    };

    if (questions.length === 0) {
        return <div className="loading">{t('loadingQuestions')}</div>;
    }

    return (
        <div className="study-mode">
            <div className="study-header">
                <button onClick={onBack} className="back-btn">{t('backToHome')}</button>
                <h2>{t('studyModeTitle')}</h2>
                <button onClick={handleFinish} className="finish-btn">{t('finishStudy')}</button>
            </div>

            <Question
                questionData={questions[currentQuestionIndex]}
                questionIndex={currentQuestionIndex}
                totalQuestions={questions.length}
                userAnswers={userAnswers}
                onAnswerChange={handleAnswerChange}
                showCorrectAnswers={showAnswers}
                examName={examData[0]?.exam_name}
            />

            <div className="study-controls">
                <button
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    className="nav-btn"
                >
                    {t('previousArrow')}
                </button>

                <button onClick={handleShowAnswer} className="show-answer-btn">
                    {showAnswers ? t('hideAnswer') : t('showAnswer')}
                </button>

                <button
                    onClick={handleNext}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="nav-btn"
                >
                    {t('nextArrow')}
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

export default StudyMode;
