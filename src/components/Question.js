// components/Question.js
import React, { useState, useEffect } from 'react';
import { t } from '../utils/i18n';

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
    const [copied, setCopied] = useState(false);

    // Aggiorna selected answers quando cambia la domanda
    useEffect(() => {
        setSelectedAnswers(userAnswers[questionIndex] || []);
        setCopied(false);
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
                <h4>{t('correctAnswers')}</h4>
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

    const handleCopyMarkdown = () => {
        let markdown = '';

        // Topic and Question Number
        if (questionData.topic_number || questionData.question_number) {
            markdown += `### Topic ${questionData.topic_number || ''} - Question ${questionData.question_number || ''}\n\n`;
        }

        // Question text
        markdown += `${questionData.question}\n\n`;

        // If there are images, list them/URLs
        if (questionData.images && questionData.images.length > 0) {
            questionData.images.forEach((img, idx) => {
                const url = buildImageUrl(img);
                if (url) {
                    markdown += `![Question Image ${idx + 1}](${url})\n\n`;
                } else {
                    const imgName = typeof img === 'object' ? img.image_name : img;
                    markdown += `*[Image: ${imgName}]*\n\n`;
                }
            });
        }

        // Answers
        if (questionData.answers && questionData.answers.length > 0) {
            markdown += `**Options:**\n`;
            questionData.answers.forEach((answer, index) => {
                const label = questionData.answer_labels && questionData.answer_labels[index]
                    ? questionData.answer_labels[index]
                    : String.fromCharCode(65 + index);

                let answerText = '';
                if (typeof answer === 'string') {
                    answerText = answer;
                } else if (typeof answer === 'object' && answer.origin_url) {
                    answerText = `![Answer Image ${label}](${answer.origin_url})`;
                } else if (Array.isArray(answer)) {
                    answerText = answer.map((item, itemIndex) => {
                        if (typeof item === 'string') {
                            return item;
                        } else if (typeof item === 'object' && item.origin_url) {
                            return `![Answer Image ${label}_${itemIndex + 1}](${item.origin_url})`;
                        }
                        return '';
                    }).join(' ');
                }

                markdown += `- **${label}**: ${answerText}\n`;
            });
            markdown += `\n`;
        }

        // Correct Answer(s) if available
        const correctLabels = [];
        if (questionData.answer_checks && Array.isArray(questionData.answer_checks)) {
            questionData.answer_checks.forEach((isCorrect, idx) => {
                if (isCorrect) {
                    const label = questionData.answer_labels && questionData.answer_labels[idx]
                        ? questionData.answer_labels[idx]
                        : String.fromCharCode(65 + idx);
                    correctLabels.push(label);
                }
            });
        }
        if (correctLabels.length > 0) {
            markdown += `**Correct Answer:** ${correctLabels.join(', ')}\n`;
        }

        navigator.clipboard.writeText(markdown.trim())
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
    };

    const isMultipleChoice = questionData.answer_checks.filter(Boolean).length > 1;

    return (
        <div className="question-container">
            <div className="question-header">
                <h3>{t('questionOf', questionIndex + 1, totalQuestions)}</h3>
                <div className="question-meta">
                    <span>📝 {t('topic')} {questionData.topic_number}</span>
                    <span>🔢 {t('questionNum')} {questionData.question_number}</span>
                    {isMultipleChoice && <span>{t('multipleAnswers')}</span>}
                    <button
                        className={`copy-markdown-btn ${copied ? 'copied' : ''}`}
                        onClick={handleCopyMarkdown}
                    >
                        {copied ? '✅ ' + t('copied') : '📋 ' + t('copyMarkdown')}
                    </button>
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
                    <h4>{isMultipleChoice ? t('selectYourAnswers') : t('selectYourAnswer')}:</h4>
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