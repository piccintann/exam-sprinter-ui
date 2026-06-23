import React, { useState, useEffect } from 'react';
import ExamUploader from './ExamUploader';
import ReportsList from './ReportsList';
import GitHubAuth from './GitHubAuth';
import { loadAvailableExams, loadExamData, deleteExam, getExamInfo } from '../utils/fileUtils';
import { loadExamFromGitHub, getGitHubToken } from '../utils/githubUtils';
import { t, getLanguage, setLanguage } from '../utils/i18n';

const GitHubIcon = ({ size = 14 }) => (
    <svg height={size} width={size} viewBox="0 0 16 16" style={{ verticalAlign: 'middle', fill: 'currentColor' }}>
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
);

// Categorizzazione degli esami basata sul nome e sulla cartella
const EXAM_CATEGORIES = {
    aws: {
        label: 'AWS',
        folders: ['amazon', 'aws'],
        keywords: ['aws', 'amazon', 'saa', 'sap', 'dva', 'soa', 'clf', 'ans', 'dbs', 'mls', 'scs', 'dop', 'aip'],
        color: '#FF9900',
        logo: process.env.PUBLIC_URL + '/icons/aws.svg'
    },
    google: {
        label: 'Google Cloud',
        folders: ['google', 'gcp'],
        keywords: ['google', 'gcp', 'gke', 'bigquery', 'cloud digital leader'],
        color: '#4285F4',
        logo: process.env.PUBLIC_URL + '/icons/google-cloud.svg'
    },
    azure: {
        label: 'Microsoft Azure',
        folders: ['microsoft', 'azure'],
        keywords: ['azure', 'microsoft', 'az-', 'ms-'],
        color: '#0078D4',
        logo: process.env.PUBLIC_URL + '/icons/azure.svg'
    },
    spring: {
        label: 'Spring',
        folders: ['spring'],
        keywords: ['spring', 'spring boot', 'spring cloud'],
        color: '#6DB33F',
        logo: process.env.PUBLIC_URL + '/icons/spring.svg'
    },
    oracle: {
        label: 'Oracle',
        folders: ['oracle'],
        keywords: ['oracle', 'oci', 'java se', '1z0'],
        color: '#F80000',
        logo: process.env.PUBLIC_URL + '/icons/oracle.svg'
    },
    cisco: {
        label: 'Cisco',
        folders: ['cisco'],
        keywords: ['cisco', 'ccna', 'ccnp', 'ccie'],
        color: '#1BA0D7',
        logo: process.env.PUBLIC_URL + '/icons/cisco.svg'
    },
    comptia: {
        label: 'CompTIA',
        folders: ['comptia'],
        keywords: ['comptia', 'security+', 'network+', 'a+', 'pentest'],
        color: '#C8202F',
        logo: process.env.PUBLIC_URL + '/icons/comptia.svg'
    },
    kubernetes: {
        label: 'Kubernetes',
        folders: ['kubernetes', 'k8s'],
        keywords: ['kubernetes', 'cka', 'ckad', 'cks', 'k8s'],
        color: '#326CE5',
        logo: process.env.PUBLIC_URL + '/icons/kubernetes.svg'
    },
    other: {
        label: 'Other',
        folders: ['other'],
        keywords: [],
        color: '#666',
        logo: null
    }
};

const getExamCategory = (examName, folder) => {
    // Prima prova a categorizzare dalla cartella (più affidabile)
    if (folder) {
        const folderLower = folder.toLowerCase();
        for (const [key, category] of Object.entries(EXAM_CATEGORIES)) {
            if (key === 'other') continue;
            if (category.folders.some(f => folderLower === f || folderLower.includes(f))) {
                return key;
            }
        }
    }

    // Fallback: categorizza dal nome
    const name = (examName || '').toLowerCase();
    for (const [key, category] of Object.entries(EXAM_CATEGORIES)) {
        if (key === 'other') continue;
        if (category.keywords.some(kw => new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(name))) {
            return key;
        }
    }
    return 'other';
};

const HomePage = ({ onExamSelect, onModeSelect, selectedExam, examData, savedConfigs, onLaunchConfig, onDeleteConfig, onDeleteAllConfigs }) => {
    const [availableExams, setAvailableExams] = useState([]);
    const [githubExams, setGithubExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [githubLoading, setGithubLoading] = useState(false);
    const [loadingExamId, setLoadingExamId] = useState(null);
    const [showModeSelection, setShowModeSelection] = useState(false);
    const [githubAuthenticated, setGithubAuthenticated] = useState(false);

    // Stato per la navigazione a tab
    const [activeTab, setActiveTab] = useState('exams');

    // Stato per tema e lingua
    const [theme, setTheme] = useState(() => localStorage.getItem('examSprinterTheme') || 'light');
    const [lang, setLang] = useState(getLanguage());

    // Applica il tema al document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('examSprinterTheme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dracula' : 'light');
    };

    const handleLanguageChange = (newLang) => {
        setLanguage(newLang);
        setLang(newLang);
    };

    // Stati per ricerca e paginazione
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [examsPerPage, setExamsPerPage] = useState(6);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');

    // Stati per sezioni richiudibili
    const [githubSectionExpanded, setGithubSectionExpanded] = useState(false);
    const [uploaderSectionExpanded, setUploaderSectionExpanded] = useState(false);

    useEffect(() => {
        loadExams();
        const token = getGitHubToken();
        setGithubAuthenticated(!!token);
        if (token) {
            loadGithubExams();
        }
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

    const loadGithubExams = async () => {
        try {
            const { loadExamsFromGitHub } = await import('../utils/githubUtils');
            const exams = await loadExamsFromGitHub();
            setGithubExams(exams.map(exam => ({
                ...exam,
                source: 'github',
                displayName: exam.name.replace('.json', '').replace(/_/g, ' ').replace(/-/g, ' ')
            })));
        } catch (error) {
            console.error('Error loading GitHub exams:', error);
        }
    };

    const handleLocalExamSelect = async (examInfo) => {
        try {
            const filename = typeof examInfo === 'string' ? examInfo : examInfo.filename;
            setLoadingExamId(filename);
            const data = await loadExamData(filename);
            if (data) {
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
            setLoadingExamId(null);
        }
    };

    const handleGithubExamSelect = async (githubExam) => {
        try {
            setLoadingExamId(githubExam.name);
            const data = await loadExamFromGitHub(githubExam);
            const examName = githubExam.name.replace('.json', '');
            onExamSelect(githubExam.name, data, examName, 'github', { name: githubExam.name, apiUrl: githubExam.apiUrl, sha: githubExam.sha });
            setShowModeSelection(true);
        } catch (error) {
            console.error('Error loading GitHub exam:', error);
            alert('Failed to load exam from GitHub: ' + error.message);
        } finally {
            setLoadingExamId(null);
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
        return [...localExams, ...githubExamsFormatted].map(exam => ({
            ...exam,
            category: getExamCategory(exam.displayName || exam.filename || exam.name, exam.folder)
        }));
    };

    const getFilteredExams = () => {
        let allExams = getAllExams();

        // Filtro per sorgente
        if (sourceFilter !== 'all') {
            allExams = allExams.filter(exam => exam.source === sourceFilter);
        }

        // Filtro per categoria
        if (categoryFilter !== 'all') {
            allExams = allExams.filter(exam => exam.category === categoryFilter);
        }

        // Filtro per testo
        if (searchTerm) {
            allExams = allExams.filter(exam =>
                exam.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                exam.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                exam.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return allExams;
    };

    const getAvailableCategories = () => {
        const allExams = getAllExams();
        const categories = new Set(allExams.map(e => e.category));
        // Metti 'other' sempre alla fine
        const sorted = Array.from(categories).filter(c => c !== 'other');
        if (categories.has('other')) {
            sorted.push('other');
        }
        return sorted;
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
    }, [searchTerm, examsPerPage, categoryFilter, sourceFilter]);

    if (showModeSelection && selectedExam && examData) {
        return <ModeSelection onModeSelect={handleModeSelect} examData={examData} onBack={() => setShowModeSelection(false)} />;
    }

    const filteredExams = getFilteredExams();
    const paginatedExams = getPaginatedExams();
    const totalPages = getTotalPages();

    return (
        <div className="home-page">
            {/* Top Bar - Theme & Language */}
            <div className="top-bar">
                <select
                    className="lang-select"
                    value={lang}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                >
                    <option value="en">🇬🇧 English</option>
                    <option value="it">🇮🇹 Italiano</option>
                </select>
                <button className="top-bar-btn" onClick={toggleTheme} title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
                    {theme === 'light' ? '🌙' : '☀️'}
                </button>
            </div>

            <h1>
                <img src={process.env.PUBLIC_URL + '/icons/cramjam-logo.svg'} alt="CramJam" className="app-logo" />
                CramJam
            </h1>

            {/* Tab Navigation */}
            <div className="nav-tabs">
                <button
                    className={`nav-tab ${activeTab === 'exams' ? 'active' : ''}`}
                    onClick={() => setActiveTab('exams')}
                >
                    {t('tabExams')}
                </button>
                <button
                    className={`nav-tab ${activeTab === 'configs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('configs')}
                >
                    {t('tabConfigs')}
                    {savedConfigs && savedConfigs.length > 0 && (
                        <span className="tab-badge">{savedConfigs.length}</span>
                    )}
                </button>
                <button
                    className={`nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reports')}
                >
                    {t('tabReports')}
                </button>
                <button
                    className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    {t('tabSettings')}
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {/* TAB: Exams */}
                {activeTab === 'exams' && (
                    <div className="available-exams">
                        {/* Sub-tabs per sorgente */}
                        <div className="sub-tabs">
                            <button
                                className={`sub-tab ${sourceFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setSourceFilter('all')}
                            >
                                {t('subAll')}
                            </button>
                            <button
                                className={`sub-tab ${sourceFilter === 'github' ? 'active' : ''}`}
                                onClick={() => setSourceFilter('github')}
                            >
                                <GitHubIcon /> {t('subGitHub')}
                            </button>
                            <button
                                className={`sub-tab ${sourceFilter === 'local' ? 'active' : ''}`}
                                onClick={() => setSourceFilter('local')}
                            >
                                {t('subLocal')}
                            </button>
                        </div>

                        {/* Barra di ricerca */}
                        <div className="exams-search">
                            <input
                                type="text"
                                placeholder={t('searchExams')}
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

                        {/* Filtro per categoria */}
                        <div className="category-filter">
                            <button
                                className={`category-btn ${categoryFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setCategoryFilter('all')}
                            >
                                {t('subAll')}
                            </button>
                            {getAvailableCategories().map(cat => (
                                <button
                                    key={cat}
                                    className={`category-btn ${categoryFilter === cat ? 'active' : ''}`}
                                    onClick={() => setCategoryFilter(cat)}
                                    style={categoryFilter === cat ? { borderColor: EXAM_CATEGORIES[cat].color } : {}}
                                >
                                    {EXAM_CATEGORIES[cat].logo ? (
                                        <img src={EXAM_CATEGORIES[cat].logo} alt={EXAM_CATEGORIES[cat].label} className="category-btn-logo" />
                                    ) : null}
                                    {EXAM_CATEGORIES[cat].label}
                                </button>
                            ))}
                        </div>

                        {/* Controlli */}
                        {filteredExams.length > 0 && (
                            <div className="exams-controls">
                                <div className="exams-per-page">
                                    <label>
                                        {t('showLabel')}
                                        <select
                                            value={examsPerPage}
                                            onChange={(e) => setExamsPerPage(parseInt(e.target.value))}
                                        >
                                            <option value={6}>6 {t('perPage')}</option>
                                            <option value={12}>12 {t('perPage')}</option>
                                            <option value={24}>24 {t('perPage')}</option>
                                            <option value={filteredExams.length}>{t('subAll')}</option>
                                        </select>
                                    </label>
                                </div>
                                <div className="exams-pagination-info">
                                    {t('showingExams', Math.min((currentPage - 1) * examsPerPage + 1, filteredExams.length), Math.min(currentPage * examsPerPage, filteredExams.length), filteredExams.length)}
                                </div>
                            </div>
                        )}

                        {/* Griglia esami */}
                        {loading ? (
                            <p>{t('loadingExams')}</p>
                        ) : paginatedExams.length > 0 ? (
                            <>
                                <div className="exams-grid">
                                    {paginatedExams.map((exam, index) => (
                                        <ExamCard
                                            key={`${exam.source}-${exam.filename || exam.name}-${index}`}
                                            exam={exam}
                                            onSelect={exam.source === 'local' ? handleLocalExamSelect : handleGithubExamSelect}
                                            onDelete={exam.source === 'local' ? handleDeleteExam : null}
                                            loading={loadingExamId === (exam.filename || exam.name)}
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
                                            ⬅️ {t('previous')}
                                        </button>

                                        <span className="page-info">
                                            {t('pageOf', currentPage, totalPages)}
                                        </span>

                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="pagination-btn"
                                        >
                                            {t('next')} ➡️
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="no-exams">
                                {searchTerm ? (
                                    <>
                                        <p>{t('noExamsFound', searchTerm)}</p>
                                        <p>{t('tryDifferentSearch')}</p>
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="start-btn"
                                            style={{ marginTop: '16px' }}
                                        >
                                            {t('clearSearch')}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p>{t('noExamsAvailable')}</p>
                                        <p>{t('uploadOrConnect')}</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: Configurations */}
                {activeTab === 'configs' && (
                    <SavedConfigs
                        configs={savedConfigs}
                        onLaunch={onLaunchConfig}
                        onDelete={onDeleteConfig}
                        onDeleteAll={onDeleteAllConfigs}
                    />
                )}

                {/* TAB: Reports */}
                {activeTab === 'reports' && (
                    <ReportsList />
                )}

                {/* TAB: Settings */}
                {activeTab === 'settings' && (
                    <div className="settings-tab">
                        {/* GitHub Authentication */}
                        <div className="settings-section">
                            <h3>
                                <svg height="20" width="20" viewBox="0 0 16 16" style={{ verticalAlign: 'middle', marginRight: '8px', fill: 'currentColor' }}>
                                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                                </svg>
                                GitHub Repository
                                <span className={`status-dot ${githubAuthenticated ? 'online' : 'offline'}`} title={githubAuthenticated ? 'Connected to GitHub Repository' : 'Not connected'}></span>
                            </h3>
                            <GitHubAuth
                                onAuthSuccess={handleGithubAuth}
                                onExamsLoaded={handleGithubExamsLoaded}
                            />
                        </div>

                        {/* Upload Section */}
                        <div className="settings-section">
                            <h3>📤 {t('uploadLocalExam')}</h3>
                            <ExamUploader onFileUpload={handleFileUpload} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Componente separato per la card dell'esame
const ExamCard = ({ exam, onSelect, onDelete, loading }) => {
    const info = exam.source === 'local' ? getExamInfo(exam.filename) : null;
    const category = exam.category || 'other';
    const categoryInfo = EXAM_CATEGORIES[category] || EXAM_CATEGORIES.other;

    return (
        <div className={`exam-card ${exam.source}`}>
            <div className="exam-card-header">
                <span className="exam-icon" title={categoryInfo.label}>
                    {categoryInfo.logo ? (
                        <img src={categoryInfo.logo} alt={categoryInfo.label} className="provider-logo" />
                    ) : (
                        <span className="provider-fallback" style={{ color: categoryInfo.color }}>
                            {categoryInfo.label.charAt(0)}
                        </span>
                    )}
                </span>
                <h3>{exam.displayName}</h3>
            </div>
            <div className="exam-card-body">
                <p className="exam-category-badge" style={{ color: categoryInfo.color }}>
                    {categoryInfo.label}
                </p>
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
                    </>
                )}
            </div>
            <div className="exam-card-actions">
                <button
                    onClick={() => onSelect(exam)}
                    className="start-btn"
                    disabled={loading}
                >
                    {loading ? t('loading') : t('start')}
                </button>
                {onDelete && (
                    <button
                        onClick={() => onDelete(exam)}
                        className="delete-btn"
                    >
                        🗑️
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
        smartMode: false,
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
                <button onClick={onBack} className="back-btn">{t('back')}</button>
                <h2>{t('selectMode')}</h2>
            </div>

            <div className="mode-options">
                <label className={mode === 'study' ? 'selected' : ''}>
                    <input
                        type="radio"
                        value="study"
                        checked={mode === 'study'}
                        onChange={(e) => setMode(e.target.value)}
                    />
                    <span>{t('studyMode')}</span>
                    <small>{t('studyModeDesc')}</small>
                </label>

                <label className={mode === 'exam' ? 'selected' : ''}>
                    <input
                        type="radio"
                        value="exam"
                        checked={mode === 'exam'}
                        onChange={(e) => setMode(e.target.value)}
                    />
                    <span>{t('examMode')}</span>
                    <small>{t('examModeDesc')}</small>
                </label>
            </div>

            <div className="settings">
                {/* Question Range Selection */}
                <div className="setting-group">
                    <h4>{t('questionRange')}</h4>

                    <div className="checkbox-container">
                        <label>
                            <input
                                type="checkbox"
                                checked={settings.useSubset}
                                onChange={(e) => handleUseSubsetChange(e.target.checked)}
                            />
                            {t('useCustomRange')}
                        </label>
                    </div>

                    {settings.useSubset ? (
                        <div className="range-settings">
                            <div className="range-inputs">
                                <div className="range-input-group">
                                    <label htmlFor="startQuestion">{t('startFromQuestion')}</label>
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
                                    <small>{t('validRange', 1, examData.length)}</small>
                                </div>

                                <div className="range-input-group">
                                    <label htmlFor="endQuestion">{t('endAtQuestion')}</label>
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
                                    <small>{t('validRange', settings.startFromQuestion, examData.length)}</small>
                                </div>
                            </div>

                            <div className="range-summary">
                                <div className="summary-box">
                                    <div className="summary-item">
                                        <span className="summary-label">{t('selectedRange')}</span>
                                        <span className="summary-value">
                                            {settings.startFromQuestion} - {settings.endAtQuestion}
                                        </span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">{t('availableQuestions')}</span>
                                        <span className="summary-value">{availableQuestions} {t('questions')}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">{t('rangeSize')}</span>
                                        <span className="summary-value">
                                            {((availableQuestions / examData.length) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="range-summary">
                            <div className="summary-box">
                                <div className="summary-item">
                                    <span className="summary-label">📊</span>
                                    <span className="summary-value">{t('usingAll', examData.length)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Question Count */}
                <div className="setting-group">
                    <h4>{t('questionsToPractice')}</h4>
                    <div className="question-count-container">
                        <div className="input-with-info">
                            <label htmlFor="questionCount">{t('numberOfQuestions')}</label>
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
                            <small>{t('maxAvailable', availableQuestions)}</small>
                        </div>

                        <div className="quick-select">
                            <span>{t('quickSelect')}</span>
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
                                    {t('allCount', availableQuestions)}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Time Limit (only for exam mode) */}
                {mode === 'exam' && (
                    <div className="setting-group">
                        <h4>{t('timeLimit')}</h4>
                        <div className="time-limit-container">
                            <div className="input-with-info">
                                <label htmlFor="timeLimit">{t('minutes')}</label>
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
                                    {t('recommended', Math.ceil(settings.questionCount * 1.5), (settings.timeLimit / settings.questionCount).toFixed(1))}
                                </small>
                            </div>
                        </div>
                    </div>
                )}

                {/* Random Order */}
                <div className="setting-group">
                    <h4>{t('questionOrder')}</h4>
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
                            {t('randomizeOrder')}
                        </label>
                        <small>{t('randomizeDesc')}</small>
                    </div>
                </div>

                {/* Smart Mode */}
                <div className="setting-group">
                    <h4>🧠 Smart Mode</h4>
                    <div className="checkbox-container">
                        <label>
                            <input
                                type="checkbox"
                                checked={settings.smartMode}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    smartMode: e.target.checked,
                                    randomOrder: e.target.checked ? true : settings.randomOrder
                                })}
                            />
                            🧠 {t('smartMode')}
                        </label>
                        <small>{t('smartModeDesc')}</small>
                    </div>
                </div>

                {/* Preview */}
                <div className="settings-preview">
                    <h4>{t('configPreview')}</h4>
                    <ul>
                        <li>
                            <strong>{t('modeLabel')}</strong> {mode === 'study' ? t('studyMode') : t('examMode')}
                        </li>
                        <li>
                            <strong>{t('questionRangeLabel')}</strong>
                            {settings.useSubset
                                ? ` ${settings.startFromQuestion} - ${settings.endAtQuestion}`
                                : ` 1 - ${examData.length}`
                            }
                        </li>
                        <li>
                            <strong>{t('questionsToPracticeLabel')}</strong> {settings.questionCount} {t('ofAvailable')} {availableQuestions} {t('available')}
                        </li>
                        <li>
                            <strong>{t('orderLabel')}</strong> {settings.randomOrder ? t('random') : t('sequential')}
                        </li>
                        {mode === 'exam' && (
                            <li>
                                <strong>{t('timeLimitLabel')}</strong> ⏰ {settings.timeLimit} min
                                <span style={{
                                    color: settings.timeLimit < settings.questionCount * 1.5 ? '#f44336' : '#4caf50',
                                    marginLeft: '8px'
                                }}>
                                    ({(settings.timeLimit / settings.questionCount).toFixed(1)} {t('minPerQuestion')})
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
                {mode === 'study' ? t('startStudy') : t('startExam')}
            </button>
        </div>
    );
};

// Componente per le configurazioni salvate
const SavedConfigs = ({ configs, onLaunch, onDelete, onDeleteAll }) => {
    const [launching, setLaunching] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredConfigs = (configs || []).filter(config => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (config.examName || '').toLowerCase().includes(term) ||
            (config.examFilename || '').toLowerCase().includes(term) ||
            (config.mode || '').toLowerCase().includes(term)
        );
    });

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

    const handleDeleteAll = () => {
        if (window.confirm(t('deleteAllConfigsConfirm', configs.length))) {
            onDeleteAll();
        }
    };

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleString();
    };

    return (
        <div className="saved-configs-tab">
            {configs.length > 0 ? (
                <>
                    <div className="tab-toolbar">
                        <input
                            type="text"
                            placeholder={t('searchConfigs')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <button onClick={handleDeleteAll} className="delete-all-btn">
                            {t('deleteAll')}
                        </button>
                    </div>
                    <div className="saved-configs-list">
                        {filteredConfigs.map((config) => (
                            <div key={config.id} className="saved-config-card">
                                <div className="saved-config-info">
                                    <div className="saved-config-title">
                                        {config.mode === 'study' ? '📖' : '⏰'} {config.examName}
                                    </div>
                                    <div className="saved-config-details">
                                        <span>{config.source === 'github' ? '⚙️ GitHub' : '💾 Local'}</span>
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
                                        {launching === config.id ? '⏳...' : t('launch')}
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
                </>
            ) : (
                <div className="no-exams">
                    <p>{t('noConfigs')}</p>
                    <p>{t('noConfigsHint')}</p>
                </div>
            )}
        </div>
    );
};

export default HomePage;