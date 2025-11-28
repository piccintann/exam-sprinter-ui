import React, { useState, useEffect } from 'react';
import { loadImageFromGitHub } from '../utils/githubUtils'; // Aggiungi import

const Question = ({
    questionData,
    questionIndex,
    totalQuestions,
    userAnswers,
    onAnswerChange,
    showCorrectAnswers = false,
    examName
}) => {
    const [selectedAnswers, setSelectedAnswers] = useState(userAnswers[questionIndex] || []);
    const [imageCache, setImageCache] = useState({}); // Stato per cache immagini

    // Aggiorna selected answers quando cambia la domanda
    useEffect(() => {
        setSelectedAnswers(userAnswers[questionIndex] || []);
    }, [questionIndex, userAnswers]);

    const handleAnswerToggle = (answerIndex) => {
        const isMultiple = questionData.answer_checks.filter(Boolean).length > 1;
        let newAnswers;
        if (isMultiple) {
            newAnswers = selectedAnswers.includes(answerIndex)
                ? selectedAnswers.filter(i => i !== answerIndex)
                : [...selectedAnswers, answerIndex];
        } else {
            newAnswers = [answerIndex];
        }
        setSelectedAnswers(newAnswers);
        onAnswerChange(questionIndex, newAnswers);
    };

    const getAnswerClass = (answerIndex) => {
        let classes = ['answer-option'];
        if (selectedAnswers.includes(answerIndex)) {
            classes.push('selected');
        }
        if (showCorrectAnswers) {
            if (questionData.answer_checks[answerIndex]) {
                classes.push('correct');
            } else if (selectedAnswers.includes(answerIndex)) {
                classes.push('incorrect');
            }
        }
        return classes.join(' ');
    };

    // Funzione per caricare immagini da GitHub
    const loadGitHubImage = async (imagePath) => {
        try {
            const dataUrl = await loadImageFromGitHub(examName, imagePath);
            if (dataUrl) {
                setImageCache(prev => ({
                    ...prev,
                    [imagePath]: dataUrl
                }));
            }
        } catch (error) {
            console.error('Failed to load image from GitHub:', error);
        }
    };

    const renderImage = (imagePath) => {
        // Controlla cache locale GitHub
        const cachedImage = localStorage.getItem(`github_image_${examName}_${imagePath}`);
        if (cachedImage) {
            return <img src={cachedImage} alt="Question" className="question-image" />;
        }

        // Controlla cache componente
        if (imageCache[imagePath]) {
            return <img src={imageCache[imagePath]} alt="Question" className="question-image" />;
        }

        // Prova a caricare da GitHub se abbiamo examName
        if (examName && imagePath) {
            loadGitHubImage(imagePath);
        }

        // Fallback per immagini locali
        const imageSrc = `/images/${examName}/${imagePath}`;
        return <img
            src={imageSrc}
            alt="Question"
            className="question-image"
            onError={(e) => {
                e.target.style.display = 'none';
                console.warn(`Image not found: ${imageSrc}`);
            }}
        />;
    };

    const isMultipleChoice = questionData.answer_checks.filter(Boolean).length > 1;

    return (
        <div className="question-container">
            <div className="question-header">
                <h3>Question {questionIndex + 1} of {totalQuestions}</h3>
                <div className="question-meta">
                    <span>📝 Topic {questionData.topic_number}</span>
                    <span>🔢 Question {questionData.question_number}</span>
                    {isMultipleChoice && <span>✅ Multiple Answers</span>}
                </div>
            </div>
            <div className="question-content">
                <p className="question-text">{questionData.question}</p>
                {questionData.images && questionData.images.length > 0 && (
                    <div className="question-images">
                        {questionData.images.map((image, index) => (
                            <div key={index} className="image-container">
                                {renderImage(image)}
                            </div>
                        ))}
                    </div>
                )}
                <div className="answers-section">
                    <h4>Select your answer{isMultipleChoice ? 's' : ''}:</h4>
                    {questionData.answers.map((answer, index) => (
                        <div
                            key={index}
                            className={getAnswerClass(index)}
                            onClick={() => !showCorrectAnswers && handleAnswerToggle(index)}
                        >
                            <span className="answer-label">
                                {questionData.answer_labels[index]}
                            </span>
                            <span className="answer-text">{answer}</span>
                        </div>
                    ))}
                </div>
                {showCorrectAnswers && (
                    <div className="correct-answers-section">
                        <h4>✅ Correct Answer(s):</h4>
                        <ul>
                            {questionData.correct_answers.map((answer, index) => (
                                <li key={index}>{answer}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {questionData.community_answers && questionData.community_answers.length > 0 && showCorrectAnswers && (
                    <div className="community-answers">
                        <h4>👥 Community Answers:</h4>
                        {questionData.community_answers.map((answer, index) => (
                            <p key={index}>{answer.text} - {answer.votes} votes</p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Question;