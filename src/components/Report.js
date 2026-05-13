import React, { useState } from 'react';

const Report = ({ reportData, onBack, onRestart }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [questionsPerPage, setQuestionsPerPage] = useState(5);
    const [filterType, setFilterType] = useState('all'); // all, correct, incorrect, unanswered

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        }
        return `${minutes}m ${secs}s`;
    };

    const getScoreColor = (percentage) => {
        if (percentage >= 80) return '#4CAF50';
        if (percentage >= 60) return '#FF9800';
        return '#F44336';
    };

    const getScoreEmoji = (percentage) => {
        if (percentage >= 90) return '🏆';
        if (percentage >= 80) return '🥇';
        if (percentage >= 70) return '🥈';
        if (percentage >= 60) return '🥉';
        return '📚';
    };

    // Filtra le domande in base al tipo selezionato
    const getFilteredQuestions = () => {
        return reportData.questions.map((question, index) => {
            const userAnswer = reportData.userAnswers[index] || [];
            const correctIndices = question.answer_checks
                .map((isCorrect, i) => isCorrect ? i : -1)
                .filter(i => i !== -1);

            const isCorrect = userAnswer.length > 0 &&
                userAnswer.sort().toString() === correctIndices.sort().toString();
            const isUnanswered = userAnswer.length === 0;

            return {
                ...question,
                originalIndex: index,
                userAnswer,
                correctIndices,
                isCorrect,
                isUnanswered,
                status: isUnanswered ? 'unanswered' : isCorrect ? 'correct' : 'incorrect'
            };
        }).filter(question => {
            switch (filterType) {
                case 'correct': return question.isCorrect;
                case 'incorrect': return !question.isCorrect && !question.isUnanswered;
                case 'unanswered': return question.isUnanswered;
                default: return true;
            }
        });
    };

    const filteredQuestions = getFilteredQuestions();
    const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
    const startIndex = (currentPage - 1) * questionsPerPage;
    const endIndex = startIndex + questionsPerPage;
    const currentQuestions = filteredQuestions.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        setCurrentPage(page);
        // Scroll to top of questions section
        document.getElementById('questions-review')?.scrollIntoView({
            behavior: 'smooth'
        });
    };

    const handleFilterChange = (newFilter) => {
        setFilterType(newFilter);
        setCurrentPage(1); // Reset to first page when filter changes
    };

    const getFilterStats = () => {
        const all = reportData.questions.length;
        const correct = reportData.correctAnswers;
        const incorrect = reportData.incorrectAnswers;
        const unanswered = reportData.unanswered;

        return { all, correct, incorrect, unanswered };
    };

    const filterStats = getFilterStats();

    return (
        <div className="report-container">
            <div className="report-header">
                <button onClick={onBack} className="back-btn">← Back to Home</button>
                <h2>📊 Exam Report</h2>
                {onRestart && (
                    <button onClick={onRestart} className="restart-btn">🔄 Restart Session</button>
                )}
            </div>

            <div className="report-summary">
                <div className="score-circle">
                    <div className="score-emoji">{getScoreEmoji(reportData.percentage)}</div>
                    <div
                        className="score-text"
                        style={{ color: getScoreColor(reportData.percentage) }}
                    >
                        {reportData.percentage}%
                    </div>
                    <div className="score-label">Final Score</div>
                </div>

                <div className="stats-grid">
                    <div className="stat-item">
                        <div className="stat-value">{reportData.totalQuestions}</div>
                        <div className="stat-label">📝 Total Questions</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value correct">{reportData.correctAnswers}</div>
                        <div className="stat-label">✅ Correct</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value incorrect">{reportData.incorrectAnswers}</div>
                        <div className="stat-label">❌ Incorrect</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value unanswered">{reportData.unanswered}</div>
                        <div className="stat-label">⏭️ Unanswered</div>
                    </div>
                </div>
            </div>

            <div className="report-details">
                <h3>📋 Exam Details</h3>
                <div className="detail-row">
                    <span>📚 Exam:</span>
                    <span>{reportData.examName}</span>
                </div>
                <div className="detail-row">
                    <span>🎯 Mode:</span>
                    <span>{reportData.mode === 'exam' ? '⏰ Exam Mode' : '📖 Study Mode'}</span>
                </div>
                <div className="detail-row">
                    <span>⏱️ Time Spent:</span>
                    <span>{formatTime(reportData.timeSpent)}</span>
                </div>
                {reportData.timeLimit && (
                    <div className="detail-row">
                        <span>⏰ Time Limit:</span>
                        <span>{formatTime(reportData.timeLimit)}</span>
                    </div>
                )}
                <div className="detail-row">
                    <span>📅 Date:</span>
                    <span>{new Date(reportData.timestamp).toLocaleString()}</span>
                </div>
            </div>

            <div id="questions-review" className="questions-review">
                <div className="questions-header">
                    <h3>🔍 Question Review</h3>

                    {/* Filters */}
                    <div className="question-filters">
                        <button
                            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('all')}
                        >
                            📊 All ({filterStats.all})
                        </button>
                        <button
                            className={`filter-btn ${filterType === 'correct' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('correct')}
                        >
                            ✅ Correct ({filterStats.correct})
                        </button>
                        <button
                            className={`filter-btn ${filterType === 'incorrect' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('incorrect')}
                        >
                            ❌ Incorrect ({filterStats.incorrect})
                        </button>
                        <button
                            className={`filter-btn ${filterType === 'unanswered' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('unanswered')}
                        >
                            ⏭️ Unanswered ({filterStats.unanswered})
                        </button>
                    </div>

                    {/* Items per page selector */}
                    <div className="pagination-controls">
                        <label>
                            Questions per page:
                            <select
                                value={questionsPerPage}
                                onChange={(e) => {
                                    setQuestionsPerPage(parseInt(e.target.value));
                                    setCurrentPage(1);
                                }}
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={filteredQuestions.length}>All</option>
                            </select>
                        </label>
                    </div>
                </div>

                {/* Results info */}
                {filterType !== 'all' && (
                    <div className="filter-info">
                        Showing {filteredQuestions.length} {filterType} questions
                    </div>
                )}

                {/* Questions list */}
                <div className="questions-list">
                    {currentQuestions.map((question, index) => (
                        <div key={question.originalIndex} className={`question-review ${question.status}`}>
                            <div className="question-review-header">
                                <span className="question-number">
                                    Q{question.originalIndex + 1}
                                    {filterType !== 'all' && (
                                        <span className="filter-indicator">
                                            ({startIndex + index + 1} of {filteredQuestions.length} {filterType})
                                        </span>
                                    )}
                                </span>
                                <span className={`status ${question.status}`}>
                                    {question.isUnanswered ? '⏭️ Unanswered' :
                                        question.isCorrect ? '✅ Correct' : '❌ Incorrect'}
                                </span>
                            </div>

                            <div className="question-text">{question.question}</div>

                            <div className="answers-comparison">
                                <div className="user-answers">
                                    <strong>Your Answer:</strong>
                                    {question.userAnswer.length > 0 ? (
                                        <div className="answer-tags">
                                            {question.userAnswer.map(i => (
                                                <span key={i} className="answer-tag user">
                                                    {question.answer_labels[i]}: {question.answers[i]}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="no-answer">No answer selected</span>
                                    )}
                                </div>
                                <div className="correct-answers">
                                    <strong>Correct Answer:</strong>
                                    <div className="answer-tags">
                                        {question.correctIndices.map(i => (
                                            <span key={i} className="answer-tag correct">
                                                {question.answer_labels[i]}: {question.answers[i]}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="pagination-btn"
                        >
                            ⬅️ Previous
                        </button>

                        <div className="pagination-info">
                            <span>
                                Page {currentPage} of {totalPages}
                            </span>
                            <span className="pagination-details">
                                Showing {startIndex + 1}-{Math.min(endIndex, filteredQuestions.length)} of {filteredQuestions.length}
                            </span>
                        </div>

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="pagination-btn"
                        >
                            Next ➡️
                        </button>
                    </div>
                )}

                {/* Quick page jumper for many pages */}
                {totalPages > 5 && (
                    <div className="page-jumper">
                        <span>Jump to page:</span>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page =>
                                page === 1 ||
                                page === totalPages ||
                                Math.abs(page - currentPage) <= 2
                            )
                            .map((page, index, array) => (
                                <React.Fragment key={page}>
                                    {index > 0 && array[index - 1] !== page - 1 && (
                                        <span className="pagination-ellipsis">...</span>
                                    )}
                                    <button
                                        onClick={() => handlePageChange(page)}
                                        className={`page-number ${page === currentPage ? 'current' : ''}`}
                                    >
                                        {page}
                                    </button>
                                </React.Fragment>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Report;