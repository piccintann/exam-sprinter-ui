// components/GitHubAuth.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    setGitHubToken,
    getGitHubToken,
    removeGitHubToken,
    testGitHubConnection,
    loadExamsFromGitHub
} from '../utils/githubUtils';

const GitHubAuth = ({ onAuthSuccess, onExamsLoaded }) => {
    const [token, setToken] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [testing, setTesting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [repoInfo, setRepoInfo] = useState(null);

    const testConnection = useCallback(async (tokenToTest = null) => {
        setTesting(true);
        setError('');
        try {
            if (tokenToTest) {
                setGitHubToken(tokenToTest);
            }
            const result = await testGitHubConnection();
            if (result.success) {
                setIsAuthenticated(true);
                setRepoInfo(result);
                onAuthSuccess?.();
                try {
                    const exams = await loadExamsFromGitHub();
                    onExamsLoaded?.(exams);
                } catch (examError) {
                    console.error('Error loading exams:', examError);
                    setError('Connected but failed to load exams: ' + examError.message);
                }
            } else {
                setError('Connection failed: ' + result.error);
                setIsAuthenticated(false);
                removeGitHubToken();
            }
        } catch (error) {
            setError('Connection failed: ' + error.message);
            setIsAuthenticated(false);
            removeGitHubToken();
        } finally {
            setTesting(false);
        }
    }, [onAuthSuccess, onExamsLoaded]);

    useEffect(() => {
        const savedToken = getGitHubToken();
        if (savedToken) {
            setIsAuthenticated(true);
            testConnection(savedToken);
        }
    }, [testConnection]);

    const handleAuthenticate = async (e) => {
        e.preventDefault();
        if (!token.trim()) {
            setError('Please enter a GitHub token');
            return;
        }
        await testConnection(token.trim());
    };

    const handleDisconnect = () => {
        removeGitHubToken();
        setIsAuthenticated(false);
        setRepoInfo(null);
        setToken('');
        setError('');
        onExamsLoaded?.([]);
    };

    const handleRefreshExams = async () => {
        setLoading(true);
        try {
            const exams = await loadExamsFromGitHub();
            onExamsLoaded?.(exams);
        } catch (error) {
            setError('Failed to refresh exams: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Restituisce sempre la stessa struttura, indipendentemente dallo stato
    return (
        <div className="github-auth-content">
            {isAuthenticated ? (
                // Contenuto quando è connesso
                <div className="github-connected">
                    <div className="connection-status">
                        <div className="status-info">
                            <span className="status-indicator">🟢</span>
                            <span className="status-text">Connected to GitHub Repository</span>
                        </div>
                        <button onClick={handleDisconnect} className="disconnect-btn">
                            🔓 Disconnect
                        </button>
                    </div>
                    {repoInfo && (
                        <div className="repo-info">
                            <div className="repo-details">
                                <div className="repo-detail-item">
                                    <span className="detail-icon">📁</span>
                                    <span className="detail-label">Repository:</span>
                                    <span className="detail-value">{repoInfo.repo}</span>
                                </div>
                                <div className="repo-detail-item">
                                    <span className="detail-icon">🔒</span>
                                    <span className="detail-label">Private:</span>
                                    <span className="detail-value">{repoInfo.private ? 'Yes' : 'No'}</span>
                                </div>
                                <div className="repo-detail-item">
                                    <span className="detail-icon">📏</span>
                                    <span className="detail-label">Size:</span>
                                    <span className="detail-value">{repoInfo.size} KB</span>
                                </div>
                            </div>
                            <div className="repo-actions">
                                <button
                                    onClick={handleRefreshExams}
                                    disabled={loading}
                                    className="refresh-btn"
                                >
                                    {loading ? '🔄 Loading...' : '🔄 Refresh Exams'}
                                </button>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="auth-error">
                            ⚠️ {error}
                        </div>
                    )}
                </div>
            ) : (
                // Contenuto quando non è connesso
                <div className="github-form">
                    <div className="auth-description">
                        <p>Connect to your private GitHub repository to access certification exam dumps and images.</p>
                    </div>
                    <form onSubmit={handleAuthenticate} className="auth-form">
                        <div className="token-input-group">
                            <label>GitHub Personal Access Token:</label>
                            <input
                                type="password"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                className="token-input"
                            />
                            <small>
                                Create a token at: GitHub → Settings → Developer settings → Personal access tokens
                                <br />
                                Required scope: <code>repo</code> (for private repositories)
                                <br />
                                <em>The token is used to access certification exam dumps</em>
                            </small>
                        </div>
                        <div className="form-actions">
                            <button
                                type="submit"
                                disabled={testing || !token.trim()}
                                className="auth-btn"
                            >
                                {testing ? '🔄 Testing Connection...' : '🔗 Connect'}
                            </button>
                        </div>
                    </form>
                    {error && (
                        <div className="auth-error">
                            ❌ {error}
                        </div>
                    )}
                    <div className="auth-help">
                        <h4>📋 Setup Instructions:</h4>
                        <ol>
                            <li>Create a private GitHub repository</li>
                            <li>Create folders: <code>data/dumps/</code> and <code>md/images/[exam-name]/</code></li>
                            <li>Upload your JSON exam files to <code>data/dumps/</code></li>
                            <li>Upload images to <code>md/images/[exam-name]/</code></li>
                            <li>Create a Personal Access Token with <code>repo</code> scope</li>
                            <li>Paste the token above and connect</li>
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GitHubAuth;