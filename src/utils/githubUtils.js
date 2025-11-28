// utils/githubUtils.js
const GITHUB_CONFIG = {
    owner: 'piccintann',
    repo: 'exam-sprinter',
    branch: 'master',
    baseURL: 'https://api.github.com/repos',
    examsFolder: 'data/dumps',
    imagesFolder: 'md/images'
};

// Memorizza il token in localStorage per persistenza
export const setGitHubToken = (token) => {
    localStorage.setItem('github_token', token);
};

export const getGitHubToken = () => {
    return localStorage.getItem('github_token');
};

export const removeGitHubToken = () => {
    localStorage.removeItem('github_token');
};

// Headers con autenticazione
const getAuthHeaders = () => {
    const token = getGitHubToken();
    if (!token) {
        throw new Error('GitHub token not found. Please authenticate first.');
    }
    return {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ExamSprinter-App'
    };
};

// Test connessione
export const testGitHubConnection = async () => {
    try {
        const url = `${GITHUB_CONFIG.baseURL}/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const repoData = await response.json();
            return {
                success: true,
                repo: repoData.full_name,
                private: repoData.private,
                size: repoData.size
            };
        } else {
            const errorText = await response.text();
            console.error('GitHub API error:', response.status, errorText);
            return {
                success: false,
                error: `${response.status} ${response.statusText}`
            };
        }
    } catch (error) {
        console.error('GitHub connection error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

export const loadExamsFromGitHub = async (folder = GITHUB_CONFIG.examsFolder) => {
    try {
        const url = `${GITHUB_CONFIG.baseURL}/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${folder}`;

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Folder '${folder}' not found in repository`);
                return [];
            }
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const contents = await response.json();
        if (!Array.isArray(contents)) {
            console.warn('Expected array but got:', typeof contents);
            return [];
        }

        // Filtra solo i file JSON
        const jsonFiles = contents
            .filter(file => file.type === 'file' && file.name.endsWith('.json'))
            .map(file => ({
                name: file.name,
                size: file.size,
                sha: file.sha,
                path: file.path,
                apiUrl: file.url
            }));

        return jsonFiles;
    } catch (error) {
        console.error('Error loading exams from GitHub:', error);
        throw error;
    }
};

// Carica un singolo esame
export const loadExamFromGitHub = async (examFile) => {
    try {
        const url = examFile.apiUrl || `${GITHUB_CONFIG.baseURL}/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.examsFolder}/${examFile.name}`;

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error(`Failed to get exam content: ${response.status} ${response.statusText}`);
        }

        const fileData = await response.json();
        if (!fileData.content) {
            throw new Error('No content found in file');
        }

        // Decodifica il contenuto base64
        const content = atob(fileData.content.replace(/\s/g, ''));
        const examData = JSON.parse(content);

        if (!Array.isArray(examData)) {
            throw new Error('Invalid exam format: expected array of questions');
        }

        return examData;
    } catch (error) {
        console.error('Error loading exam from GitHub:', error);
        throw new Error(`Failed to load exam "${examFile.name}": ${error.message}`);
    }
};

// Carica immagini per un esame
export const loadExamImagesFromGitHub = async (examName) => {
    try {
        const imagesFolder = `${GITHUB_CONFIG.imagesFolder}/${examName}`;
        const url = `${GITHUB_CONFIG.baseURL}/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${imagesFolder}`;

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 404) {
                // Non logga nulla per cartelle immagini mancanti (è normale)
                return [];
            }
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const contents = await response.json();
        if (!Array.isArray(contents)) {
            return [];
        }

        // Filtra solo le immagini
        const imageFiles = contents
            .filter(file =>
                file.type === 'file' &&
                /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
            )
            .map(file => ({
                name: file.name,
                size: file.size,
                path: file.path,
                apiUrl: file.url
            }));

        return imageFiles;
    } catch (error) {
        console.error('Error loading images from GitHub:', error);
        return [];
    }
};

// Carica un'immagine
export const loadImageFromGitHub = async (examName, imageName) => {
    try {
        // Controlla prima la cache locale
        const cacheKey = `github_image_${examName}_${imageName}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            return cached;
        }

        const imagePath = `${GITHUB_CONFIG.imagesFolder}/${examName}/${imageName}`;
        const url = `${GITHUB_CONFIG.baseURL}/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${imagePath}`;

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error(`Failed to load image: ${response.status}`);
        }

        const fileData = await response.json();
        if (!fileData.content) {
            throw new Error('No image content found');
        }

        // L'immagine è in base64, la convertiamo in data URL
        const mimeType = getImageMimeType(imageName);
        const dataUrl = `data:image/${mimeType};base64,${fileData.content.replace(/\s/g, '')}`;

        // Cache l'immagine
        try {
            localStorage.setItem(cacheKey, dataUrl);
        } catch (storageError) {
            // Storage pieno, continua senza cache
            console.warn('Could not cache image (localStorage full):', imageName);
        }

        return dataUrl;
    } catch (error) {
        console.error('Error loading image from GitHub:', error);
        return null;
    }
};

// Helper per determinare il tipo MIME dell'immagine
const getImageMimeType = (filename) => {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes = {
        'jpg': 'jpeg',
        'jpeg': 'jpeg',
        'png': 'png',
        'gif': 'gif',
        'webp': 'webp',
        'svg': 'svg+xml'
    };
    return mimeTypes[ext] || 'jpeg';
};

// Debug function per verificare la struttura del repo (solo per sviluppo)
export const debugRepoStructure = async () => {
    try {
        const url = `${GITHUB_CONFIG.baseURL}/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/`;
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const contents = await response.json();
            console.log('Repository structure:', contents);
            return contents;
        } else {
            console.error('Failed to load repo structure:', response.status);
            return null;
        }
    } catch (error) {
        console.error('Error loading repo structure:', error);
        return null;
    }
};

// Funzione per verificare il branch corretto (solo per sviluppo)
export const detectBranch = async () => {
    try {
        const url = `${GITHUB_CONFIG.baseURL}/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`;
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const repoData = await response.json();
            console.log('Default branch:', repoData.default_branch);
            return repoData.default_branch;
        }
    } catch (error) {
        console.error('Error detecting branch:', error);
    }
    return 'main'; // fallback
};