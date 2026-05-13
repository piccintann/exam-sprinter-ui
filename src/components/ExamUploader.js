import React, { useRef, useState } from 'react';
import { saveExamFile, saveExamImages } from '../utils/fileUtils';
import { t, getLanguage } from '../utils/i18n';

const ExamUploader = ({ onFileUpload }) => {
    const examFileRef = useRef(null);
    const imagesRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [examFile, setExamFile] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const lang = getLanguage();

    const texts = {
        en: {
            description: 'Import an exam file (JSON format) to store it locally in your browser for offline practice.',
            examFile: 'Exam JSON File',
            required: '(required)',
            optional: '(optional)',
            images: 'Associated Images',
            selectJson: 'Select a .json file',
            selectImages: 'Select image files',
            selected: 'Selected',
            uploadBtn: 'Import Exam',
            uploading: 'Importing...',
            tipTitle: 'Format Info',
            tips: [
                'The JSON file must contain an array of question objects',
                'Images referenced in questions should match by filename',
                'Supported formats: JPG, PNG, GIF, WebP',
                'Max recommended size: 2MB per image'
            ],
            successTitle: 'Exam imported successfully!',
            successQuestions: 'questions',
            successImages: 'images',
            errorJson: 'Please select a valid JSON file',
            errorImages: 'Some files were skipped. Only image files are allowed.',
            errorSelect: 'Please select an exam JSON file',
        },
        it: {
            description: 'Importa un file esame (formato JSON) per salvarlo localmente nel browser e praticarlo offline.',
            examFile: 'File JSON Esame',
            required: '(obbligatorio)',
            optional: '(opzionale)',
            images: 'Immagini Associate',
            selectJson: 'Seleziona un file .json',
            selectImages: 'Seleziona file immagine',
            selected: 'Selezionato',
            uploadBtn: 'Importa Esame',
            uploading: 'Importazione...',
            tipTitle: 'Info Formato',
            tips: [
                'Il file JSON deve contenere un array di oggetti domanda',
                'Le immagini referenziate nelle domande devono corrispondere per nome file',
                'Formati supportati: JPG, PNG, GIF, WebP',
                'Dimensione massima consigliata: 2MB per immagine'
            ],
            successTitle: 'Esame importato con successo!',
            successQuestions: 'domande',
            successImages: 'immagini',
            errorJson: 'Seleziona un file JSON valido',
            errorImages: 'Alcuni file sono stati ignorati. Solo file immagine sono ammessi.',
            errorSelect: 'Seleziona un file JSON esame',
        }
    };

    const tx = texts[lang] || texts.en;

    const handleExamFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/json') {
            setExamFile(file);
        } else {
            alert(tx.errorJson);
            setExamFile(null);
        }
    };

    const handleImagesChange = (event) => {
        const files = Array.from(event.target.files);
        const imgs = files.filter(file => file.type.startsWith('image/'));
        if (imgs.length !== files.length) {
            alert(tx.errorImages);
        }
        setImageFiles(imgs);
    };

    const handleUpload = async () => {
        if (!examFile) {
            alert(tx.errorSelect);
            return;
        }

        setUploading(true);
        try {
            const examData = await readJsonFile(examFile);
            const examName = examData[0]?.exam_name || examFile.name.replace('.json', '');

            const examSaved = await saveExamFile(examData, examFile.name);
            if (!examSaved) {
                throw new Error('Failed to save exam file');
            }

            if (imageFiles.length > 0) {
                await saveExamImages(examName, imageFiles);
            }

            onFileUpload(examData, examFile.name);

            // Reset form
            setExamFile(null);
            setImageFiles([]);
            examFileRef.current.value = '';
            imagesRef.current.value = '';

            alert(`✅ ${tx.successTitle}\n📝 ${examData.length} ${tx.successQuestions}\n🖼️ ${imageFiles.length} ${tx.successImages}`);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const readJsonFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    if (Array.isArray(jsonData) && jsonData.length > 0) {
                        resolve(jsonData);
                    } else {
                        reject(new Error('Invalid exam format. Expected an array of questions.'));
                    }
                } catch (error) {
                    reject(new Error('Invalid JSON file format.'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    };

    return (
        <div className="uploader-content">
            <div className="upload-description">
                <p>{tx.description}</p>
            </div>

            <div className="upload-section">
                <div className="file-input-group">
                    <label>📄 {tx.examFile} <span className="required-tag">{tx.required}</span></label>
                    <div className="file-drop-zone" onClick={() => examFileRef.current?.click()}>
                        <input
                            type="file"
                            ref={examFileRef}
                            onChange={handleExamFileChange}
                            accept=".json"
                            className="file-input-hidden"
                        />
                        {examFile ? (
                            <div className="file-selected">
                                <span className="file-selected-icon">✅</span>
                                <span className="file-selected-name">{examFile.name}</span>
                                <span className="file-selected-size">({(examFile.size / 1024).toFixed(1)} KB)</span>
                            </div>
                        ) : (
                            <div className="file-placeholder">
                                <span className="file-placeholder-icon">📁</span>
                                <span>{tx.selectJson}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="file-input-group">
                    <label>🖼️ {tx.images} <span className="optional-tag">{tx.optional}</span></label>
                    <div className="file-drop-zone" onClick={() => imagesRef.current?.click()}>
                        <input
                            type="file"
                            ref={imagesRef}
                            onChange={handleImagesChange}
                            accept="image/*"
                            multiple
                            className="file-input-hidden"
                        />
                        {imageFiles.length > 0 ? (
                            <div className="file-selected">
                                <span className="file-selected-icon">✅</span>
                                <span className="file-selected-name">{imageFiles.length} {tx.successImages}</span>
                                <span className="file-selected-size">({(imageFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)} KB)</span>
                            </div>
                        ) : (
                            <div className="file-placeholder">
                                <span className="file-placeholder-icon">🖼️</span>
                                <span>{tx.selectImages}</span>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleUpload}
                    disabled={!examFile || uploading}
                    className="upload-btn"
                >
                    {uploading ? `⏳ ${tx.uploading}` : `📤 ${tx.uploadBtn}`}
                </button>
            </div>

            <div className="upload-tips">
                <h4>💡 {tx.tipTitle}</h4>
                <ul>
                    {tx.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                </ul>
            </div>
        </div>
    );
};

export default ExamUploader;
