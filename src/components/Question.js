// components/Question.js
import React, { useState, useEffect } from 'react';

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
    const [imageCache, setImageCache] = useState({});
    const [imageErrors, setImageErrors] = useState({});

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

    // Costruisce l'URL dell'immagine gestendo sia stringhe che oggetti
    const buildImageUrl = (imageData) => {
        if (!imageData) {
            return null;
        }

        // Se è una stringa semplice (backward compatibility)
        if (typeof imageData === 'string') {
            if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
                return imageData;
            }

            if (questionData.origin_url) {
                let baseUrl = questionData.origin_url;
                if (baseUrl.includes('github.com') && baseUrl.includes('/blob/')) {
                    baseUrl = baseUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
                }
                if (!baseUrl.endsWith('/')) {
                    baseUrl += '/';
                }
                return baseUrl + imageData;
            }

            return null;
        }

        // Se è un oggetto con la nuova struttura
        if (typeof imageData === 'object' && imageData.origin_url) {
            return imageData.origin_url;
        }

        console.warn('Cannot build image URL for:', imageData);
        return null;
    };

    const renderImage = (imageData, index = 0) => {
        const imageUrl = buildImageUrl(imageData);

        if (!imageUrl) {
            console.warn('Cannot build image URL for:', imageData);
            return (
                <div className="image-error" style={{
                    padding: '20px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    color: '#666',
                    textAlign: 'center',
                    border: '2px dashed #ddd'
                }}>
                    🖼️ Image not available<br />
                    <small>{typeof imageData === 'object' ? imageData.image_name : imageData}</small>
                </div>
            );
        }

        const errorKey = typeof imageData === 'object' ? imageData.image_name : imageData;

        if (imageErrors[errorKey]) {
            return (
                <div className="image-error" style={{
                    padding: '20px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    color: '#666',
                    textAlign: 'center',
                    border: '2px dashed #ddd'
                }}>
                    🖼️ Image not available<br />
                    <small>{errorKey}</small>
                </div>
            );
        }

        return (
            <img
                src={imageUrl}
                alt={`Question image ${index + 1}`}
                className="question-image"
                onError={(e) => {
                    console.warn(`Failed to load image: ${imageUrl}`);
                    setImageErrors(prev => ({
                        ...prev,
                        [errorKey]: true
                    }));
                    e.target.style.display = 'none';
                }}
                onLoad={() => {
                    console.log(`Image loaded successfully: ${imageUrl}`);
                }}
                style={{
                    maxWidth: '100%',
                    height: 'auto',
                    display: 'block'
                }}
            />
        );
    };

    // Funzione per renderizzare il contenuto di una risposta (testo o immagine)
    const renderAnswerContent = (answer, answerIndex) => {
        // Se la risposta è una stringa, renderizza come testo
        if (typeof answer === 'string') {
            return <span className="answer-text">{answer}</span>;
        }

        // Se la risposta è un oggetto immagine, renderizza l'immagine
        if (typeof answer === 'object' && answer.origin_url) {
            return (
                <div className="answer-image">
                    {renderImage(answer, answerIndex)}
                </div>
            );
        }

        // Se è un array (risposte multiple), renderizza tutti gli elementi
        if (Array.isArray(answer)) {
            return (
                <div className="answer-multiple">
                    {answer.map((item, itemIndex) => (
                        <div key={itemIndex} className="answer-item">
                            {typeof item === 'string' ? (
                                <span className="answer-text">{item}</span>
                            ) : (
                                <div className="answer-image">
                                    {renderImage(item, itemIndex)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        // Fallback per tipi non riconosciuti
        return <span className="answer-text">Invalid answer format</span>;
    };

    // Funzione per renderizzare le risposte corrette
    const renderCorrectAnswers = () => {
        if (!questionData.correct_answers || !Array.isArray(questionData.correct_answers)) {
            return null;
        }

        return (
            <div className="correct-answers-section">
                <h4>✅ Correct Answer(s):</h4>
                <div className="correct-answers-list">
                    {questionData.correct_answers.map((correctAnswer, index) => (
                        <div key={index} className="correct-answer-item">
                            {typeof correctAnswer === 'string' ? (
                                <span>{correctAnswer}</span>
                            ) : typeof correctAnswer === 'object' && correctAnswer.origin_url ? (
                                <div className="correct-answer-image">
                                    {renderImage(correctAnswer, index)}
                                </div>
                            ) : (
                                <span>Answer {index + 1}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
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

                {/* Renderizza le immagini della domanda se presenti */}
                {questionData.images && questionData.images.length > 0 && (
                    <div className="question-images">
                        {questionData.images.map((imageData, index) => (
                            <div key={index} className="image-container">
                                {renderImage(imageData, index)}
                            </div>
                        ))}
                    </div>
                )}

                <div className="answers-section">
                    <h4>Select your answer{isMultipleChoice ? 's' : ''}:</h4>
                    {questionData.answers && questionData.answers.map((answer, index) => (
                        <div
                            key={index}
                            className={getAnswerClass(index)}
                            onClick={() => !showCorrectAnswers && handleAnswerToggle(index)}
                        >
                            <span className="answer-label">
                                {questionData.answer_labels && questionData.answer_labels[index]
                                    ? questionData.answer_labels[index]
                                    : String.fromCharCode(65 + index)} {/* A, B, C, D... */}
                            </span>
                            <div className="answer-content">
                                {renderAnswerContent(answer, index)}
                            </div>
                        </div>
                    ))}
                </div>

                {showCorrectAnswers && renderCorrectAnswers()}

                {/* Community Answers */}
                {questionData.highly_votated_answers && questionData.highly_votated_answers.length > 0 && showCorrectAnswers && (
                    <div className="community-answers">
                        <h4>👥 Highly Voted Community Answers:</h4>
                        {questionData.highly_votated_answers.map((answer, index) => (
                            <div key={index} className="community-answer">
                                <div className="community-answer-header">
                                    <strong>@{answer.username}</strong>
                                    {answer.is_highly_voted && <span className="badge highly-voted">🔥 Highly Voted</span>}
                                    {answer.is_most_recent && <span className="badge most-recent">🆕 Most Recent</span>}
                                </div>
                                <p className="community-answer-content">{answer.comment_content}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Most Recent Answers */}
                {questionData.most_recent_answers && questionData.most_recent_answers.length > 0 && showCorrectAnswers && (
                    <div className="community-answers">
                        <h4>🆕 Most Recent Community Answers:</h4>
                        {questionData.most_recent_answers.map((answer, index) => (
                            <div key={index} className="community-answer">
                                <div className="community-answer-header">
                                    <strong>@{answer.username}</strong>
                                    {answer.is_most_recent && <span className="badge most-recent">🆕 Most Recent</span>}
                                </div>
                                <p className="community-answer-content">{answer.comment_content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Question;