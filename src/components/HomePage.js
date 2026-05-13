import React, { useState, useEffect } from 'react';
import ExamUploader from './ExamUploader';
import ReportsList from './ReportsList';
import GitHubAuth from './GitHubAuth';
import { loadAvailableExams, loadExamData, deleteExam, getExamInfo } from '../utils/fileUtils';
import { loadExamFromGitHub, getGitHubToken } from '../utils/githubUtils';

const HomePage = ({ onExamSelect, onModeSelect, selectedExam, examData, savedConfigs, onLaunchConfig, onDeleteConfig }) => {
    const [availableExams, setAvailableExams] = useState([]);
    const [githubExams, setGithubExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [githubLoading, setGithubLoading] = useState(false);
    const [showModeSelection, setShowModeSelection] = useState(false);
    const [githubAuthenticated, setGithubAuthenticated] = useState(false);

    // Stati per ricerca e paginazione
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [examsPerPage, setExamsPerPage] = useState(6);

    // Stati per sezioni richiudibili
    const [githubSectionExpanded, setGithubSectionExpanded] = useState(false);
    const [uploaderSectionExpanded, setUploaderSectionExpanded] = useState(false);

    useEffect(() => {
        loadExams();
        setGithubAuthenticated(!!getGitHubToken());
    }, []);

    const loadExams = async () => {
        setLoading(true);
        try {
            const exams = await loadAvailableExams();
            setAvailableExams(exams);
        } catch (error) {
            console.error('Error loading exams:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLocalExamSelect = async (examInfo) => {
        try {
            setLoading(true);
            const filename = typeof examInfo === 'string' ? examInfo : examInfo.filename;
            const data = await loadExamData(filename);
            if (data) {
                // Passa anche il nome dell'esame per costruire il path delle immagini
                const examName = filename.replace('.json', '');
                onExamSelect(filename, data, examName, 'local', null);
                setShowModeSelection(true);
            } else {
                alert('Error loading exam file');
            }
        } catch (error) {
            console.error('Error loading local exam:', error);
            alert('Error loading exam file. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGithubExamSelect = async (githubExam) => {
        try {
            setGithubLoading(true);
            const data = await loadExamFromGitHub(githubExam);
            const examName = githubExam.name.replace('.json', '');
            onExamSelect(githubExam.name, data, examName, 'github', { name: githubExam.name, apiUrl: githubExam.apiUrl, sha: githubExam.sha });
            setShowModeSelection(true);
        } catch (error) {
            console.error('Error loading GitHub exam:', error);
            alert('Failed to load exam from GitHub: ' + error.message);
        } finally {
            setGithubLoading(false);
        }
    };

    const handleFileUpload = async (data, filename) => {
        await loadExams();
        const examName = filename.replace('.json', '');
        onExamSelect(filename, data, examName, 'local', null);
        setShowModeSelection(true);
        setUploaderSectionExpanded(false);
    };

    const handleDeleteExam = async (examInfo) => {
        const filename = typeof examInfo === 'string' ? examInfo : examInfo.filename;
        if (window.confirm(`Are you sure you want to delete "${filename}"?`)) {
            const deleted = await deleteExam(filename);
            if (deleted) {
                await loadExams();
            }
        }
    };

    const handleGithubAuth = () => {
        setGithubAuthenticated(true);
        setGithubSectionExpanded(true); // Espandi dopo connessione
    };

    const handleGithubExamsLoaded = (exams) => {
        setGithubExams(exams.map(exam => ({
            ...exam,
            source: 'github',
            displayName: exam.name.replace('.json', '').replace(/_/g, ' ').replace(/-/g, ' ')
        })));
    };

    const handleModeSelect = (mode, settings) => {
        onModeSelect(mode, settings);
    };

    // Funzioni per ricerca e filtro
    const getAllExams = () => {
        const localExams = availableExams.map(exam => ({ ...exam, source: 'local' }));
        const githubExamsFormatted = githubExams.map(exam => ({ ...exam, source: 'github' }));
        return [...localExams, ...githubExamsFormatted];
    };

    const getFilteredExams = () => {
        const allExams = getAllExams();
        if (!searchTerm) return allExams;

        return allExams.filter(exam =>
            exam.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exam.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exam.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const getPaginatedExams = () => {
        const filtered = getFilteredExams();
        const startIndex = (currentPage - 1) * examsPerPage;
        return filtered.slice(startIndex, startIndex + examsPerPage);
    };

    const getTotalPages = () => {
        return Math.ceil(getFilteredExams().length / examsPerPage);
    };

    // Reset alla pagina 1 quando cambia il filtro
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, examsPerPage]);

    if (showModeSelection && selectedExam && examData) {
        return <ModeSelection onModeSelect={handleModeSelect} examData={examData} onBack={() => setShowModeSelection(false)} />;
    }

    const filteredExams = getFilteredExams();
    const paginatedExams = getPaginatedExams();
    const totalPages = getTotalPages();

    return (
        <div className="home-page">
            <h1>📚 Exam Sprinter UI</h1>

            {/* GitHub Authentication - Richiudibile */}
            {/* GitHub Authentication - Richiudibile */}
            <div className="collapsible-section">
                <div
                    className="collapsible-header"
                    onClick={() => setGithubSectionExpanded(!githubSectionExpanded)}
                >
                    <h3>
                        🐙 GitHub Repository Connection
                        {githubAuthenticated && <span style={{ marginLeft: '8px', fontSize: '14px' }}>✅ Connected</span>}
                    </h3>
                    <span className={`collapse-icon ${githubSectionExpanded ? 'expanded' : ''}`}>
                        ▼
                    </span>
                </div>
                <div className={`collapsible-content ${githubSectionExpanded ? '' : 'collapsed'}`}>
                    <GitHubAuth
                        onAuthSuccess={handleGithubAuth}
                        onExamsLoaded={handleGithubExamsLoaded}
                    />
                </div>
            </div>

            {/* Upload Section - Richiudibile */}
            <div className="collapsible-section">
                <div
                    className="collapsible-header"
                    onClick={() => setUploaderSectionExpanded(!uploaderSectionExpanded)}
                >
                    <h3>📤 Upload New Exam</h3>
                    <span className={`collapse-icon ${uploaderSectionExpanded ? 'expanded' : ''}`}>
                        ▼
                    </span>
                </div>
                <div className={`collapsible-content ${uploaderSectionExpanded ? '' : 'collapsed'}`}>
                    <ExamUploader onFileUpload={handleFileUpload} />
                </div>
            </div>

            {/* Sezione Esami con Ricerca e Paginazione */}
            <div className="available-exams">
                <h2>📋 Available Exams</h2>

                {/* Barra di ricerca */}
                <div className="exams-search">
                    <input
                        type="text"
                        placeholder="🔍 Search exams..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    {searchTerm && (
                        <div className="search-results-info">
                            Found {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''} matching "{searchTerm}"
                        </div>
                    )}
                </div>

                {/* Controlli */}
                {filteredExams.length > 0 && (
                    <div className="exams-controls">
                        <div className="exams-per-page">
                            <label>
                                Show:
                                <select
                                    value={examsPerPage}
                                    onChange={(e) => setExamsPerPage(parseInt(e.target.value))}
                                >
                                    <option value={6}>6 per page</option>
                                    <option value={12}>12 per page</option>
                                    <option value={24}>24 per page</option>
                                    <option value={filteredExams.length}>All</option>
                                </select>
                            </label>
                        </div>
                        <div className="exams-pagination-info">
                            Showing {Math.min((currentPage - 1) * examsPerPage + 1, filteredExams.length)}-{Math.min(currentPage * examsPerPage, filteredExams.length)} of {filteredExams.length} exams
                        </div>
                    </div>
                )}

                {/* Griglia esami */}
                {loading ? (
                    <p>🔍 Loading exams...</p>
                ) : paginatedExams.length > 0 ? (
                    <>
                        <div className="exams-grid">
                            {paginatedExams.map((exam, index) => (
                                <ExamCard
                                    key={`${exam.source}-${exam.filename || exam.name}-${index}`}
                                    exam={exam}
                                    onSelect={exam.source === 'local' ? handleLocalExamSelect : handleGithubExamSelect}
                                    onDelete={exam.source === 'local' ? handleDeleteExam : null}
                                    loading={exam.source === 'github' ? githubLoading : loading}
                                />
                            ))}
                        </div>

                        {/* Paginazione */}
                        {totalPages > 1 && (
                            <div className="exams-pagination">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="pagination-btn"
                                >
                                    ⬅️ Previous
                                </button>

                                <span className="page-info">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="pagination-btn"
                                >
                                    Next ➡️
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="no-exams">
                        {searchTerm ? (
                            <>
                                <p>🔍 No exams found matching "{searchTerm}"</p>
                                <p>Try a different search term or clear the search to see all exams.</p>
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="start-btn"
                                    style={{ marginTop: '16px' }}
                                >
                                    Clear Search
                                </button>
                            </>
                        ) : (
                            <>
                                <p>📭 No exams available.</p>
                                <p>Upload a JSON file or connect to GitHub to get started.</p>
                            </>
                        )}
                    </div>
                )}
            </div>

            <SavedConfigs
                configs={savedConfigs}
                onLaunch={onLaunchConfig}
                onDelete={onDeleteConfig}
            />

            <ReportsList />
        </div>
    );
};

// Componente separato per la card dell'esame
const ExamCard = ({ exam, onSelect, onDelete, loading }) => {
    const info = exam.source === 'local' ? getExamInfo(exam.filename) : null;

    return (
        <div className={`exam-card ${exam.source}`}>
            <div className="exam-card-header">
                <span className="exam-icon">
                    {exam.source === 'local' ? '💾' : '🐙'}
                </span>
                <h3>{exam.displayName}</h3>
            </div>
            <div className="exam-card-body">
                {exam.source === 'local' && info ? (
                    <>
                        <p>📝 {info.questionCount} questions</p>
                        <p>📅 {new Date(info.uploadDate).toLocaleDateString()}</p>
                        <p>💽 Stored locally</p>
                    </>
                ) : (
                    <>
                        <p>📦 Size: {(exam.size / 1024).toFixed(1)} KB</p>
                        <p>🔗 From GitHub Repository</p>
                        <p>📄 SHA: {exam.sha ? exam.sha.substring(0, 7) : 'N/A'}</p>
                    </>
                )}
            </div>
            <div className="exam-card-actions">
                <button
                    onClick={() => onSelect(exam)}
                    className="start-btn"
                    disabled={loading}
                >
                    {loading ? '⏳ Loading...' : '▶️ Start'}
                </button>
                {onDelete && (
                    <button
                        onClick={() => onDelete(exam)}
                        className="delete-btn"
                    >
                        🗑️ Delete
                    </button>
                )}
            </div>
        </div>
    );
};

// Componente ModeSelection (rimane uguale)
// Nel componente ModeSelection di HomePage.js

// Nel componente ModeSelection di HomePage.js

const ModeSelection = ({ onModeSelect, examData, onBack }) => {
    const [mode, setMode] = useState('study');
    const [settings, setSettings] = useState({
        questionCount: examData?.length || 0,
        timeLimit: 60,
        randomOrder: false,
        startFromQuestion: 1,
        endAtQuestion: examData?.length || 0,
        useSubset: false
    });

    const handleSubmit = () => {
        if (mode) {
            onModeSelect(mode, settings);
        }
    };

    const handleUseSubsetChange = (useSubset) => {
        if (useSubset) {
            // Quando attiva il subset, mantieni i valori attuali
            setSettings(prev => {
                const availableQuestions = prev.endAtQuestion - prev.startFromQuestion + 1;
                return {
                    ...prev,
                    useSubset: true,
                    questionCount: Math.min(prev.questionCount, availableQuestions)
                };
            });
        } else {
            // Quando disattiva il subset, usa tutto l'esame
            setSettings(prev => ({
                ...prev,
                useSubset: false,
                startFromQuestion: 1,
                endAtQuestion: examData.length,
                questionCount: examData.length
            }));
        }
    };

    // Permetti inserimento libero, valida solo su blur
    const handleStartQuestionChange = (value) => {
        const parsed = parseInt(value);
        // Permetti inserimento libero (anche vuoto o parziale)
        setSettings(prev => ({
            ...prev,
            startFromQuestion: isNaN(parsed) ? '' : parsed
        }));
    };

    const handleStartQuestionBlur = () => {
        setSettings(prev => {
            const newStart = Math.max(1, Math.min(parseInt(prev.startFromQuestion) || 1, examData.length));
            const validEnd = Math.max(newStart, parseInt(prev.endAtQuestion) || examData.length);
            const availableQuestions = validEnd - newStart + 1;
            return {
                ...prev,
                startFromQuestion: newStart,
                endAtQuestion: validEnd,
                questionCount: Math.min(parseInt(prev.questionCount) || 1, availableQuestions)
            };
        });
    };

    const handleEndQuestionChange = (value) => {
        const parsed = parseInt(value);
        setSettings(prev => ({
            ...prev,
            endAtQuestion: isNaN(parsed) ? '' : parsed
        }));
    };

    const handleEndQuestionBlur = () => {
        setSettings(prev => {
            const startVal = parseInt(prev.startFromQuestion) || 1;
            const newEnd = Math.max(startVal, Math.min(parseInt(prev.endAtQuestion) || examData.length, examData.length));
            const availableQuestions = newEnd - startVal + 1;
            return {
                ...prev,
                endAtQuestion: newEnd,
                questionCount: Math.min(parseInt(prev.questionCount) || 1, availableQuestions)
            };
        });
    };

    const handleQuestionCountChange = (value) => {
        const parsed = parseInt(value);
        setSettings(prev => ({
            ...prev,
            questionCount: isNaN(parsed) ? '' : parsed
        }));
    };

    const handleQuestionCountBlur = () => {
        const availableQuestions = getAvailableQuestions();
        setSettings(prev => {
            const validCount = Math.max(1, Math.min(parseInt(prev.questionCount) || 1, availableQuestions));
            return {
                ...prev,
                questionCount: validCount
            };
        });
    };

    const getAvailableQuestions = () => {
        if (settings.useSubset) {
            return settings.endAtQuestion - settings.startFromQuestion + 1;
        }
        return examData.length;
    };

    const availableQuestions = getAvailableQuestions();

    return (
        <div className="mode-selection">
            <div className="mode-selection-header">
                <button onClick={onBack} className="back-btn">← Back</button>
                <h2>Select Mode</h2>
            </div>

            <div className="mode-options">
                <label className={mode === 'study' ? 'selected' : ''}>
                    <input
                        type="radio"
                        value="study"
                        checked={mode === 'study'}
                        onChange={(e) => setMode(e.target.value)}
                    />
                    <span>📖 Study Mode</span>
                    <small>Navigate freely, show answers, no time limit</small>
                </label>

                <label className={mode === 'exam' ? 'selected' : ''}>
                    <input
                        type="radio"
                        value="exam"
                        checked={mode === 'exam'}
                        onChange={(e) => setMode(e.target.value)}
                    />
                    <span>⏰ Exam Mode</span>
                    <small>Timed simulation, no answers shown until end</small>
                </label>
            </div>

            <div className="settings">
                {/* Question Range Selection */}
                <div className="setting-group">
                    <h4>📝 Question Range</h4>

                    <div className="checkbox-container">
                        <label>
                            <input
                                type="checkbox"
                                checked={settings.useSubset}
                                onChange={(e) => handleUseSubsetChange(e.target.checked)}
                            />
                            🎯 Use custom question range
                        </label>
                    </div>

                    {settings.useSubset ? (
                        <div className="range-settings">
                            <div className="range-inputs">
                                <div className="range-input-group">
                                    <label htmlFor="startQuestion">Start from question:</label>
                                    <input
                                        id="startQuestion"
                                        type="number"
                                        min="1"
                                        max={examData.length}
                                        value={settings.startFromQuestion}
                                        onChange={(e) => handleStartQuestionChange(e.target.value)}
                                        onBlur={handleStartQuestionBlur}
                                        className="range-input"
                                        placeholder="1"
                                    />
                                    <small>Valid range: 1 to {examData.length}</small>
                                </div>

                                <div className="range-input-group">
                                    <label htmlFor="endQuestion">End at question:</label>
                                    <input
                                        id="endQuestion"
                                        type="number"
                                        min={settings.startFromQuestion}
                                        max={examData.length}
                                        value={settings.endAtQuestion}
                                        onChange={(e) => handleEndQuestionChange(e.target.value)}
                                        onBlur={handleEndQuestionBlur}
                                        className="range-input"
                                        placeholder={examData.length.toString()}
                                    />
                                    <small>Valid range: {settings.startFromQuestion} to {examData.length}</small>
                                </div>
                            </div>

                            <div className="range-summary">
                                <div className="summary-box">
                                    <div className="summary-item">
                                        <span className="summary-label">📊 Selected Range:</span>
                                        <span className="summary-value">
                                            Questions {settings.startFromQuestion} - {settings.endAtQuestion}
                                        </span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">📈 Available Questions:</span>
                                        <span className="summary-value">{availableQuestions} questions</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">📏 Range Size:</span>
                                        <span className="summary-value">
                                            {((availableQuestions / examData.length) * 100).toFixed(1)}% of total
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="range-summary">
                            <div className="summary-box">
                                <div className="summary-item">
                                    <span className="summary-label">📊 Using:</span>
                                    <span className="summary-value">All questions (1 - {examData.length})</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Question Count */}
                <div className="setting-group">
                    <h4>🔢 Questions to Practice</h4>
                    <div className="question-count-container">
                        <div className="input-with-info">
                            <label htmlFor="questionCount">Number of questions:</label>
                            <input
                                id="questionCount"
                                type="number"
                                min="1"
                                max={availableQuestions}
                                value={settings.questionCount}
                                onChange={(e) => handleQuestionCountChange(e.target.value)}
                                onBlur={handleQuestionCountBlur}
                                className="question-count-input"
                                placeholder="1"
                            />
                            <small>Maximum available: {availableQuestions}</small>
                        </div>

                        <div className="quick-select">
                            <span>Quick select:</span>
                            <div className="quick-buttons">
                                <button
                                    type="button"
                                    onClick={() => handleQuestionCountChange(Math.min(10, availableQuestions))}
                                    className="quick-btn"
                                    disabled={availableQuestions < 10}
                                >
                                    10
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuestionCountChange(Math.min(25, availableQuestions))}
                                    className="quick-btn"
                                    disabled={availableQuestions < 25}
                                >
                                    25
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuestionCountChange(Math.min(50, availableQuestions))}
                                    className="quick-btn"
                                    disabled={availableQuestions < 50}
                                >
                                    50
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuestionCountChange(availableQuestions)}
                                    className="quick-btn"
                                >
                                    All ({availableQuestions})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Time Limit (only for exam mode) */}
                {mode === 'exam' && (
                    <div className="setting-group">
                        <h4>⏰ Time Limit</h4>
                        <div className="time-limit-container">
                            <div className="input-with-info">
                                <label htmlFor="timeLimit">Minutes:</label>
                                <input
                                    id="timeLimit"
                                    type="number"
                                    min="1"
                                    max="480"
                                    value={settings.timeLimit}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        timeLimit: Math.max(1, parseInt(e.target.value) || 60)
                                    })}
                                    className="time-input"
                                />
                                <small>
                                    Recommended: {Math.ceil(settings.questionCount * 1.5)} minutes
                                    ({(settings.timeLimit / settings.questionCount).toFixed(1)} min/question)
                                </small>
                            </div>
                        </div>
                    </div>
                )}

                {/* Random Order */}
                <div className="setting-group">
                    <h4>🔀 Question Order</h4>
                    <div className="checkbox-container">
                        <label>
                            <input
                                type="checkbox"
                                checked={settings.randomOrder}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    randomOrder: e.target.checked
                                })}
                            />
                            🔀 Randomize question and answer order
                        </label>
                        <small>Questions will be presented in random order and answers within each question will also be shuffled</small>
                    </div>
                </div>

                {/* Preview */}
                <div className="settings-preview">
                    <h4>📋 Configuration Preview:</h4>
                    <ul>
                        <li>
                            <strong>Mode:</strong> {mode === 'study' ? '📖 Study Mode' : '⏰ Exam Mode'}
                        </li>
                        <li>
                            <strong>Question Range:</strong>
                            {settings.useSubset
                                ? ` ${settings.startFromQuestion} - ${settings.endAtQuestion}`
                                : ` 1 - ${examData.length} (all)`
                            }
                        </li>
                        <li>
                            <strong>Questions to Practice:</strong> {settings.questionCount} of {availableQuestions} available
                        </li>
                        <li>
                            <strong>Order:</strong> {settings.randomOrder ? '🔀 Random' : '📄 Sequential'}
                        </li>
                        {mode === 'exam' && (
                            <li>
                                <strong>Time Limit:</strong> ⏰ {settings.timeLimit} minutes
                                <span style={{
                                    color: settings.timeLimit < settings.questionCount * 1.5 ? '#f44336' : '#4caf50',
                                    marginLeft: '8px'
                                }}>
                                    ({(settings.timeLimit / settings.questionCount).toFixed(1)} min per question)
                                </span>
                            </li>
                        )}
                    </ul>
                </div>
            </div>

            <button
                onClick={handleSubmit}
                disabled={!mode}
                className="start-btn"
            >
                Start {mode === 'study' ? '📖 Study Session' : '⏰ Exam'}
            </button>
        </div>
    );
};

// Componente per le configurazioni salvate
const SavedConfigs = ({ configs, onLaunch, onDelete }) => {
    const [expanded, setExpanded] = useState(false);
    const [launching, setLaunching] = useState(null);

    if (!configs || configs.length === 0) return null;

    const handleLaunch = async (config) => {
        setLaunching(config.id);
        try {
            let data;

            if (config.source === 'github' || config.githubInfo) {
                // Ricarica da GitHub
                const githubInfo = config.githubInfo || { name: config.examFilename };
                data = await loadExamFromGitHub(githubInfo);
            } else {
                // Prova da localStorage
                data = await loadExamData(config.examFilename);

                // Fallback: se non trovato in locale, prova da GitHub
                if (!data) {
                    try {
                        data = await loadExamFromGitHub({ name: config.examFilename });
                    } catch (e) {
                        // Ignora errore GitHub, mostrerà il messaggio "not found"
                    }
                }
            }

            if (data) {
                onLaunch(config, data);
            } else {
                alert(`Exam "${config.examFilename}" not found. It may have been deleted.`);
            }
        } catch (error) {
            alert('Error loading exam: ' + error.message);
        } finally {
            setLaunching(null);
        }
    };

    const handleDelete = (configId) => {
        if (window.confirm('Delete this saved configuration?')) {
            onDelete(configId);
        }
    };

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleString();
    };

    return (
        <div className="collapsible-section">
            <div
                className="collapsible-header"
                onClick={() => setExpanded(!expanded)}
            >
                <h3>🔄 Saved Configurations ({configs.length})</h3>
                <span className={`collapse-icon ${expanded ? 'expanded' : ''}`}>
                    ▼
                </span>
            </div>
            <div className={`collapsible-content ${expanded ? '' : 'collapsed'}`}>
                <div className="saved-configs-list">
                    {configs.map((config) => (
                        <div key={config.id} className="saved-config-card">
                            <div className="saved-config-info">
                                <div className="saved-config-title">
                                    {config.mode === 'study' ? '📖' : '⏰'} {config.examName}
                                </div>
                                <div className="saved-config-details">
                                    <span>{config.source === 'github' ? '🐙 GitHub' : '💾 Local'}</span>
                                    <span>🎯 {config.mode === 'study' ? 'Study' : 'Exam'}</span>
                                    <span>📝 {config.settings.questionCount} questions</span>
                                    {config.settings.useSubset && (
                                        <span>📊 Range: {config.settings.startFromQuestion}-{config.settings.endAtQuestion}</span>
                                    )}
                                    {config.settings.randomOrder && <span>🔀 Random</span>}
                                    {config.mode === 'exam' && <span>⏱️ {config.settings.timeLimit}min</span>}
                                </div>
                                <div className="saved-config-date">
                                    📅 {formatDate(config.createdAt)}
                                </div>
                            </div>
                            <div className="saved-config-actions">
                                <button
                                    onClick={() => handleLaunch(config)}
                                    className="start-btn"
                                    disabled={launching === config.id}
                                >
                                    {launching === config.id ? '⏳...' : '▶️ Launch'}
                                </button>
                                <button
                                    onClick={() => handleDelete(config.id)}
                                    className="delete-btn"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HomePage;