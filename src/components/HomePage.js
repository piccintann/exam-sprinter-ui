import React, { useState, useEffect } from 'react';
import ExamUploader from './ExamUploader';
import ReportsList from './ReportsList';
import GitHubAuth from './GitHubAuth';
import { loadAvailableExams, loadExamData, deleteExam, getExamInfo } from '../utils/fileUtils';
import { loadExamFromGitHub, getGitHubToken } from '../utils/githubUtils';

const HomePage = ({ onExamSelect, onModeSelect, selectedExam, examData }) => {
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

    const handleFileUpload = async (data, filename) => {
        await loadExams();
        onExamSelect(filename, data);
        setShowModeSelection(true);
        setUploaderSectionExpanded(false); // Chiudi dopo upload
    };

    const handleLocalExamSelect = async (examInfo) => {
        try {
            setLoading(true);
            const filename = typeof examInfo === 'string' ? examInfo : examInfo.filename;
            const data = await loadExamData(filename);
            if (data) {
                onExamSelect(filename, data);
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
            onExamSelect(githubExam.name, data);
            setShowModeSelection(true);
        } catch (error) {
            console.error('Error loading GitHub exam:', error);
            alert('Failed to load exam from GitHub: ' + error.message);
        } finally {
            setGithubLoading(false);
        }
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
const ModeSelection = ({ onModeSelect, examData, onBack }) => {
    const [mode, setMode] = useState('');
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
        setSettings(prev => ({
            ...prev,
            useSubset,
            startFromQuestion: useSubset ? 1 : 1,
            endAtQuestion: useSubset ? Math.min(50, examData.length) : examData.length,
            questionCount: useSubset ? Math.min(50, examData.length) : examData.length
        }));
    };

    const handleRangeChange = (start, end) => {
        const validStart = Math.max(1, Math.min(start, examData.length));
        const validEnd = Math.max(validStart, Math.min(end, examData.length));
        const availableQuestions = validEnd - validStart + 1;
        setSettings(prev => ({
            ...prev,
            startFromQuestion: validStart,
            endAtQuestion: validEnd,
            questionCount: Math.min(prev.questionCount, availableQuestions)
        }));
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
                    {settings.useSubset && (
                        <div className="range-settings">
                            <div className="range-inputs">
                                <div>
                                    <label>Start from question:</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={examData.length}
                                        value={settings.startFromQuestion}
                                        onChange={(e) => handleRangeChange(
                                            parseInt(e.target.value),
                                            settings.endAtQuestion
                                        )}
                                    />
                                </div>
                                <div>
                                    <label>End at question:</label>
                                    <input
                                        type="number"
                                        min={settings.startFromQuestion}
                                        max={examData.length}
                                        value={settings.endAtQuestion}
                                        onChange={(e) => handleRangeChange(
                                            settings.startFromQuestion,
                                            parseInt(e.target.value)
                                        )}
                                    />
                                </div>
                            </div>
                            <div className="range-info">
                                📊 Available questions: <strong>{availableQuestions}</strong>
                                <br />
                                📍 Range: Questions {settings.startFromQuestion}-{settings.endAtQuestion}
                            </div>
                        </div>
                    )}
                    {!settings.useSubset && (
                        <div className="range-info">
                            📊 Using all <strong>{examData.length}</strong> questions
                        </div>
                    )}
                </div>
                {/* Question Count */}
                <div>
                    <label>Number of questions to practice:</label>
                    <input
                        type="number"
                        min="1"
                        max={availableQuestions}
                        value={Math.min(settings.questionCount, availableQuestions)}
                        onChange={(e) => setSettings({
                            ...settings,
                            questionCount: parseInt(e.target.value)
                        })}
                    />
                    <small>Max: {availableQuestions}</small>
                </div>
                {/* Time Limit (only for exam mode) */}
                {mode === 'exam' && (
                    <div>
                        <label>Time Limit (minutes):</label>
                        <input
                            type="number"
                            min="1"
                            value={settings.timeLimit}
                            onChange={(e) => setSettings({
                                ...settings,
                                timeLimit: parseInt(e.target.value)
                            })}
                        />
                    </div>
                )}
                {/* Random Order */}
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
                        🔀 Random Order
                    </label>
                </div>
                {/* Preview */}
                <div className="settings-preview">
                    <h4>📋 Preview:</h4>
                    <ul>
                        <li>
                            <strong>Mode:</strong> {mode === 'study' ? '📖 Study' : '⏰ Exam'}
                        </li>
                        {settings.useSubset ? (
                            <>
                                <li>
                                    <strong>Question Range:</strong> {settings.startFromQuestion}-{settings.endAtQuestion}
                                    ({availableQuestions} available)
                                </li>
                                <li>
                                    <strong>Questions to Practice:</strong> {Math.min(settings.questionCount, availableQuestions)}
                                </li>
                            </>
                        ) : (
                            <li>
                                <strong>Questions:</strong> {settings.questionCount} out of {examData.length}
                            </li>
                        )}
                        <li>
                            <strong>Order:</strong> {settings.randomOrder ? '🔀 Random' : '📄 Sequential'}
                        </li>
                        {mode === 'exam' && (
                            <li>
                                <strong>Time Limit:</strong> ⏰ {settings.timeLimit} minutes
                            </li>
                        )}
                    </ul>
                </div>
            </div>
            <button onClick={handleSubmit} disabled={!mode} className="start-btn">
                Start {mode === 'study' ? '📖 Study' : '⏰ Exam'}
            </button>
        </div>
    );
};

export default HomePage;