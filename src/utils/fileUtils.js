export const loadAvailableExams = async () => {
    try {
        console.log('Loading available exams...');

        // Carica solo gli esami salvati in localStorage
        const savedExamsList = JSON.parse(localStorage.getItem('savedExamsList') || '[]');
        console.log('Saved exams found:', savedExamsList);

        return savedExamsList.map(filename => ({
            filename,
            source: 'local',
            displayName: filename.replace('.json', '').replace(/_/g, ' ').replace(/-/g, ' ')
        }));

    } catch (error) {
        console.error('Error loading available exams:', error);
        return [];
    }
};

export const saveExamFile = async (data, filename) => {
    try {
        console.log('Saving exam file:', filename);

        // Assicura che il filename abbia l'estensione .json
        if (!filename.endsWith('.json')) {
            filename = filename + '.json';
        }

        // Salva i dati dell'esame
        const savedExams = JSON.parse(localStorage.getItem('savedExams') || '{}');
        savedExams[filename] = {
            data: data,
            uploadDate: new Date().toISOString(),
            examName: data[0]?.exam_name || filename.replace('.json', ''),
            questionCount: data.length
        };
        localStorage.setItem('savedExams', JSON.stringify(savedExams));

        // Aggiorna la lista degli esami
        updateSavedExamsList(filename);

        console.log(`✅ Exam saved: ${filename} (${data.length} questions)`);
        return true;
    } catch (error) {
        console.error('Error saving exam file:', error);
        return false;
    }
};

const updateSavedExamsList = (filename) => {
    const savedExamsList = JSON.parse(localStorage.getItem('savedExamsList') || '[]');
    if (!savedExamsList.includes(filename)) {
        savedExamsList.push(filename);
        localStorage.setItem('savedExamsList', JSON.stringify(savedExamsList));
        console.log('Updated exams list:', savedExamsList);
    }
};

export const loadExamData = async (filename) => {
    try {
        console.log('Loading exam data for:', filename);

        // Carica da localStorage
        const savedExams = JSON.parse(localStorage.getItem('savedExams') || '{}');
        if (savedExams[filename]) {
            console.log('✅ Loaded from localStorage:', filename);
            return savedExams[filename].data;
        }

        throw new Error(`Exam not found: ${filename}`);
    } catch (error) {
        console.error('Error loading exam data:', error);
        return null;
    }
};

export const deleteExam = async (filename) => {
    try {
        // Rimuovi dai dati salvati
        const savedExams = JSON.parse(localStorage.getItem('savedExams') || '{}');
        delete savedExams[filename];
        localStorage.setItem('savedExams', JSON.stringify(savedExams));

        // Rimuovi dalla lista
        const savedExamsList = JSON.parse(localStorage.getItem('savedExamsList') || '[]');
        const updatedList = savedExamsList.filter(name => name !== filename);
        localStorage.setItem('savedExamsList', JSON.stringify(updatedList));

        // Rimuovi le immagini associate
        const savedImages = JSON.parse(localStorage.getItem('examImages') || '{}');
        delete savedImages[filename];
        localStorage.setItem('examImages', JSON.stringify(savedImages));

        console.log('✅ Exam deleted:', filename);
        return true;
    } catch (error) {
        console.error('Error deleting exam:', error);
        return false;
    }
};

export const getExamInfo = (filename) => {
    try {
        const savedExams = JSON.parse(localStorage.getItem('savedExams') || '{}');
        return savedExams[filename] || null;
    } catch (error) {
        return null;
    }
};

// Funzioni per gestire le immagini
export const saveExamImages = async (examName, imageFiles) => {
    try {
        console.log('Saving images for exam:', examName);

        const savedImages = JSON.parse(localStorage.getItem('examImages') || '{}');
        if (!savedImages[examName]) {
            savedImages[examName] = {};
        }

        // Converti ogni immagine in base64 per salvarla in localStorage
        for (const file of imageFiles) {
            try {
                const base64 = await fileToBase64(file);
                savedImages[examName][file.name] = {
                    data: base64,
                    type: file.type,
                    size: file.size,
                    uploadDate: new Date().toISOString()
                };
                console.log(`✅ Image saved: ${file.name}`);
            } catch (error) {
                console.error(`❌ Failed to save image: ${file.name}`, error);
            }
        }

        localStorage.setItem('examImages', JSON.stringify(savedImages));
        console.log(`✅ Saved ${imageFiles.length} images for ${examName}`);
        return true;
    } catch (error) {
        console.error('Error saving exam images:', error);
        return false;
    }
};

export const getExamImage = (examName, imageName) => {
    try {
        const savedImages = JSON.parse(localStorage.getItem('examImages') || '{}');
        const examImages = savedImages[examName];

        if (examImages && examImages[imageName]) {
            return examImages[imageName].data; // Restituisce il data URL base64
        }

        return null;
    } catch (error) {
        console.error('Error getting exam image:', error);
        return null;
    }
};

const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

export const getAllAvailableExams = loadAvailableExams; // Alias per compatibilità